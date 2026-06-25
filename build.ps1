param (
    [string]$Language = "all",
    [string]$Browser = "all",
    [string]$Version = "1.9"
)

$config = Get-Content -Raw -Path "config.json" -Encoding UTF8 | ConvertFrom-Json
$languages = if ($Language -eq "all") { $config.PSObject.Properties.Name } else { @($Language) }

# Navegadors suportats: chrome, edge, brave, opera, ecosia (Manifest v3) | firefox, safari (Manifest v2)
$browsers = if ($Browser -eq "all") { 
    @("chrome", "edge", "brave", "opera", "ecosia", "firefox", "safari") 
} else { 
    @($Browser) 
}

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function New-ZipNormalized {
    param(
        [string]$SourceDirectory,
        [string]$DestinationFile
    )

    $sourceDirInfo = Get-Item -LiteralPath $SourceDirectory
    $sourceDirPath = $sourceDirInfo.FullName
    
    # Ensure trailing slash for subtraction
    if (-not $sourceDirPath.EndsWith([System.IO.Path]::DirectorySeparatorChar)) { 
        $sourceDirPath += [System.IO.Path]::DirectorySeparatorChar 
    }

    $zip = [System.IO.Compression.ZipFile]::Open($DestinationFile, [System.IO.Compression.ZipArchiveMode]::Create)

    try {
        $files = Get-ChildItem -LiteralPath $SourceDirectory -Recurse -File
        
        foreach ($file in $files) {
            # Calculate relative path
            $relativePath = $file.FullName.Substring($sourceDirPath.Length)
            # FORCE forward slashes for ZIP compatibility (Critical for Firefox Validation)
            $entryName = $relativePath.Replace("\", "/")
            
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entryName)
        }
    }
    finally {
        $zip.Dispose()
    }
}

function Update-Icon {
    param (
        [string]$SourcePath,
        [string]$DestPath,
        [switch]$Grayscale
    )
    
    if (-not (Test-Path $SourcePath)) {
        Write-Error "Icon not found: $SourcePath"
        return
    }

    try {
        $originalImg = [System.Drawing.Bitmap]::FromFile($SourcePath)
        
        # Trim transparency manually (GetPixel is slow but works without unsafe code)
        $minX = $originalImg.Width
        $minY = $originalImg.Height
        $maxX = -1
        $maxY = -1
        
        for ($y = 0; $y -lt $originalImg.Height; $y++) {
            for ($x = 0; $x -lt $originalImg.Width; $x++) {
                if ($originalImg.GetPixel($x, $y).A -gt 0) {
                    if ($x -lt $minX) { $minX = $x }
                    if ($x -gt $maxX) { $maxX = $x }
                    if ($y -lt $minY) { $minY = $y }
                    if ($y -gt $maxY) { $maxY = $y }
                }
            }
        }
        
        if ($maxX -ne -1) {
            $w = $maxX - $minX + 1
            $h = $maxY - $minY + 1
            $rect = New-Object System.Drawing.Rectangle($minX, $minY, $w, $h)
            $img = $originalImg.Clone($rect, $originalImg.PixelFormat)
            $originalImg.Dispose()
        } else {
            $img = $originalImg
        }

        $canvasSize = 128
        $iconSize = 128

        # Calculate scaling.
        # Aspect-preserving fit (min ratio) keeps the rounded pill ends but
        # wastes ~50% of the canvas as transparent padding for the wide "on"
        # logo, which makes the toolbar icon look tiny. We boost the fit
        # ratio by a small factor so the pill fills more of the canvas at
        # the cost of clipping a few pixels of the rounded caps; the "on"
        # letters stay perfectly centered and intact.
        $ratioX = $iconSize / $img.Width
        $ratioY = $iconSize / $img.Height
        $fitRatio = [Math]::Min($ratioX, $ratioY)
        $fillRatio = [Math]::Max($ratioX, $ratioY)
        # 0.0 = pure fit (padded), 1.0 = pure fill (cropped). 0.35 keeps the
        # pill silhouette readable while making the icon ~35% bigger.
        $zoomBlend = 0.35
        $ratio = $fitRatio + ($fillRatio - $fitRatio) * $zoomBlend

        $newWidth = [int]($img.Width * $ratio)
        $newHeight = [int]($img.Height * $ratio)

        $bmp = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.Clear([System.Drawing.Color]::Transparent)

        $posX = [int](($canvasSize - $newWidth) / 2)
        $posY = [int](($canvasSize - $newHeight) / 2)

        $destRect = New-Object System.Drawing.Rectangle($posX, $posY, $newWidth, $newHeight)
        
        if ($Grayscale) {
            $matrix = New-Object System.Drawing.Imaging.ColorMatrix
            $matrix.Matrix00 = 0.30
            $matrix.Matrix01 = 0.30
            $matrix.Matrix02 = 0.30
            $matrix.Matrix10 = 0.59
            $matrix.Matrix11 = 0.59
            $matrix.Matrix12 = 0.59
            $matrix.Matrix20 = 0.11
            $matrix.Matrix21 = 0.11
            $matrix.Matrix22 = 0.11
            
            $attributes = New-Object System.Drawing.Imaging.ImageAttributes
            $attributes.SetColorMatrix($matrix)
            
            $g.DrawImage($img, $destRect, 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
        } else {
            $g.DrawImage($img, $destRect, 0, 0, $img.Width, $img.Height, [System.Drawing.GraphicsUnit]::Pixel)
        }
        
        $bmp.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Png)

        $img.Dispose()
        $g.Dispose()
        $bmp.Dispose()
    } catch {
        Write-Warning "Error processing icon $SourcePath : $_"
    }
}

function Get-ManifestTemplate {
    param (
        [string]$BrowserName
    )
    
    switch ($BrowserName) {
        "firefox" { return "manifest.firefox.json" }
        "safari"  { return "manifest.safari.json" }
        default   { return "manifest.template.json" } # Chrome, Edge, Brave, Opera (Manifest v3)
    }
}

# Ensure build root exists
if (-not (Test-Path "build")) {
    New-Item -ItemType Directory -Path "build" -Force | Out-Null
}

foreach ($lang in $languages) {
    
    # Process config
    $cfg = $config.$lang

    # Icon generation (common for a language)
    # Generate temp icons to be copied later
    $tempIconsDir = "build/temp_icons_$lang"
    if (-not (Test-Path $tempIconsDir)) { New-Item -ItemType Directory -Path $tempIconsDir -Force | Out-Null }
    
    $iconSource = $cfg.iconSource
    $iconDisabledSource = $cfg.iconDisabledSource
    if (-not (Test-Path $iconSource)) {
        Write-Warning "Icon source $iconSource not found for $lang"
    } else {
        Update-Icon -SourcePath $iconSource -DestPath "$tempIconsDir/logo.png"
    }
    if ($iconDisabledSource -and (Test-Path $iconDisabledSource)) {
        Update-Icon -SourcePath $iconDisabledSource -DestPath "$tempIconsDir/logo_disabled.png"
    } elseif (Test-Path $iconSource) {
        # Fallback: grayscale if no explicit disabled icon
        Update-Icon -SourcePath $iconSource -DestPath "$tempIconsDir/logo_disabled.png" -Grayscale
    }

    foreach ($browser in $browsers) {
        Write-Host "Building for language: $lang, browser: $browser"
        
        $buildName = "$($cfg.zipName)_$browser"
        $targetDir = "build/$buildName"
        
        # Clean target dir
        if (Test-Path $targetDir) { Remove-Item $targetDir -Recurse -Force }
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        
        # Create structure
        New-Item -ItemType Directory -Path "$targetDir/src" -Force | Out-Null
        New-Item -ItemType Directory -Path "$targetDir/src/popup" -Force | Out-Null
        New-Item -ItemType Directory -Path "$targetDir/icons" -Force | Out-Null

        # Copy files (Static)
        Copy-Item "src/background.js" -Destination "$targetDir/src/background.js"
        Copy-Item "src/popup/popup.css" -Destination "$targetDir/src/popup/popup.css"
        
        # Copy Icons (PNG for manifest + SVG logo for popup)
        Copy-Item "$tempIconsDir/*" -Destination "$targetDir/icons/"
        Copy-Item "assets/img/icons/logo.svg" -Destination "$targetDir/icons/logo.svg"
        if (Test-Path "assets/img/icons/logo_disabled.svg") {
            Copy-Item "assets/img/icons/logo_disabled.svg" -Destination "$targetDir/icons/logo_disabled.svg"
        }
        if (Test-Path "assets/img/icons/logo_configura.png") {
            Copy-Item "assets/img/icons/logo_configura.png" -Destination "$targetDir/icons/logo_configura.png"
        }
        if (Test-Path "assets/img/icons/configura_on.png") {
            Copy-Item "assets/img/icons/configura_on.png" -Destination "$targetDir/icons/configura_on.png"
        }
        if (Test-Path "assets/img/icons/configura_off.png") {
            Copy-Item "assets/img/icons/configura_off.png" -Destination "$targetDir/icons/configura_off.png"
        }
        if (Test-Path "assets/img/icons/configura_logo.svg") {
            Copy-Item "assets/img/icons/configura_logo.svg" -Destination "$targetDir/icons/configura_logo.svg"
        }

        # Process Manifest
        $manifestTemplate = Get-ManifestTemplate -BrowserName $browser
        $manifest = Get-Content -Raw -Path $manifestTemplate -Encoding UTF8
        $manifest = $manifest.Replace("{{NAME}}", $cfg.name)
        $manifest = $manifest.Replace("{{ID_NAME}}", $cfg.zipName)
        $manifest = $manifest.Replace("{{DESCRIPTION}}", $cfg.description)
        $manifest = $manifest.Replace("{{VERSION}}", $Version)
        Set-Content -Path "$targetDir/manifest.json" -Value $manifest -Encoding UTF8

        # Process Popup HTML
        $popupHtml = Get-Content -Raw -Path "src/popup/popup.template.html" -Encoding UTF8
        $popupHtml = $popupHtml.Replace("{{POPUP_TITLE}}", $cfg.popupTitle)
        $popupHtml = $popupHtml.Replace("{{POPUP_TEXT}}", $cfg.popupText)
        $popupHtml = $popupHtml.Replace("{{DONATE_TEXT}}", $cfg.donateText)
        $popupHtml = $popupHtml.Replace("{{REPORT_TEXT}}", $cfg.reportText)
        $popupHtml = $popupHtml.Replace("{{ENABLE_TEXT}}", $cfg.enableText)
        $popupHtml = $popupHtml.Replace("{{EXCLUDE_TEXT}}", $cfg.excludeText)
        $popupHtml = $popupHtml.Replace("{{MANAGE_EXCLUSIONS_TEXT}}", $cfg.manageExclusionsText)
        $popupHtml = $popupHtml.Replace("{{BROWSER_LANG_WARN}}", $cfg.browserLangWarn)
        $popupHtml = $popupHtml.Replace("{{BROWSER_LANG_MORE_INFO}}", $cfg.browserLangMoreInfo)
        $popupHtml = $popupHtml.Replace("{{BROWSER_LANG_SOLUTION_BROWSER}}", $cfg.browserLangSolutionBrowser)
        $popupHtml = $popupHtml.Replace("{{BROWSER_LANG_SOLUTION_ACCOUNT}}", $cfg.browserLangSolutionAccount)
        $popupHtml = $popupHtml.Replace("{{LEGACY_NAME_TEXT}}", $cfg.legacyNameText)
        $popupHtml = $popupHtml.Replace("{{CREATOR_TEXT}}", $cfg.creatorText)
        $popupHtml = $popupHtml.Replace("{{CREATOR_NAME}}", $cfg.creatorName)
        $popupHtml = $popupHtml.Replace("{{CREATOR_URL}}", $cfg.creatorUrl)
        $popupHtml = $popupHtml.Replace("{{LANG_CODE}}", $lang)
        Set-Content -Path "$targetDir/src/popup/popup.html" -Value $popupHtml -Encoding UTF8

        # Process Popup JS
        $popupJs = Get-Content -Raw -Path "src/popup/popup.template.js" -Encoding UTF8
        $popupJs = $popupJs.Replace("{{PREFERRED_LANGUAGE}}", $cfg.preferredLanguage)
        $popupJs = $popupJs.Replace("{{REPORT_SUBJECT}}", $cfg.reportSubject)
        $popupJs = $popupJs.Replace("{{ENABLE_TEXT}}", $cfg.enableText)
        $popupJs = $popupJs.Replace("{{DISABLE_TEXT}}", $cfg.disableText)
        $popupJs = $popupJs.Replace("{{NO_EXCLUSIONS_TEXT}}", $cfg.noExclusionsText)
        Set-Content -Path "$targetDir/src/popup/popup.js" -Value $popupJs -Encoding UTF8

        # Process Content JS
        $contentJs = Get-Content -Raw -Path "src/content.template.js" -Encoding UTF8
        $contentJs = $contentJs.Replace("{{PREFERRED_LANGUAGE}}", $cfg.preferredLanguage)
        $contentJs = $contentJs.Replace("{{NAME}}", $cfg.name)
        Set-Content -Path "$targetDir/src/content.js" -Value $contentJs -Encoding UTF8

        # Zip folder with Normalized Paths (Firefox Fix)
        $zipName = "build/$buildName.zip"
        if (Test-Path $zipName) { Remove-Item $zipName }
        
        # Use custom function instead of Compress-Archive to enforce forward slashes
        New-ZipNormalized -SourceDirectory $targetDir -DestinationFile $zipName
        
        Write-Host "Created $zipName"
    }
    
    # Cleanup temp icons
    Remove-Item $tempIconsDir -Recurse -Force
}

# Cleanup root artifacts that user wanted gone
if (Test-Path "src/content.js") { Remove-Item "src/content.js" }
if (Test-Path "src/popup/popup.js") { Remove-Item "src/popup/popup.js" }
if (Test-Path "src/popup/popup.html") { Remove-Item "src/popup/popup.html" }
if (Test-Path "manifest.json") { Remove-Item "manifest.json" }

Write-Host "`nBuild completat! Totes les versions es troben a la carpeta 'build/'."
Write-Host "NOTA: Ara els fitxers descomprimits també estan disponibles a build/{Nom}_{Navegador}/ per a fàcil càrrega."
