param (
    [string]$Language = "all",
    [string]$Browser = "all",
    [string]$Version = "2.0.0"
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

# Flat single-color browser icons (24x24, currentColor) for the popup warning
# action buttons. Inlined so the popup can colour them via CSS.
$browserIconSvgs = @{
    "chrome"  = '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728z"/></svg>'
    "edge"    = '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c2.4 0 4.6-.85 6.35-2.27-1.05.55-2.2.87-3.4.87-3.6 0-6.8-2.4-7.85-5.85-.2-.7-.3-1.45-.3-2.2 0-2.5 1.5-4.7 3.65-5.55-1.85.95-3.1 2.85-3.1 5.05 0 .65.1 1.25.3 1.85h11.7c.05-.45.1-.95.1-1.4C19.45 6 16.3 2 12 2zm0 4.5c2.65 0 4.85 2.05 5.1 4.6H6.9c.25-2.55 2.45-4.6 5.1-4.6z"/></svg>'
    "brave"   = '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.2 5.6l.5-1.4-1.5-1.6c-.4-.5-1-.7-1.6-.6l-1.5.2-2-1.4c-.7-.5-1.6-.5-2.3 0L8.8 2.2 7.3 2c-.6-.1-1.2.2-1.6.6L4.3 4.2l.5 1.4-1.2 3.6c-.4 1.3-.1 2.8.9 3.8l5.5 5.7c.6.6 1.5.6 2.1 0l5.5-5.7c1-1 1.3-2.5.9-3.8L19.2 5.6zM12 17l-3.5-3.8c-.4-.4-.5-1.1-.3-1.6l1-2.5c.2-.5.7-.9 1.3-.9h3c.6 0 1.1.4 1.3.9l1 2.5c.2.5.1 1.2-.3 1.6L12 17z"/></svg>'
    "opera"   = '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 17c-2.2 0-4-3.1-4-7s1.8-7 4-7 4 3.1 4 7-1.8 7-4 7z"/></svg>'
    "ecosia"  = '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12c0 1.7.4 3.3 1.2 4.8L2 22l5.4-1.2c1.4.7 3 1.2 4.6 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm-1.5 14l-3.5-3.5 1.4-1.4 2.1 2.1 5.1-5.1 1.4 1.4-6.5 6.5z"/></svg>'
    "firefox" = '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.5 5.5c.4.7.7 1.5.9 2.3-.5-1.2-1.3-2.3-2.4-3.1-1.9-1.4-4.4-2-6.8-1.5-2 .4-3.7 1.5-4.9 3-1 1.3-1.7 2.9-1.7 4.6 0 1.2.3 2.3.8 3.3-.5-.9-.8-1.9-.9-2.9-.1-.6-.1-1.2 0-1.8.1-.6.2-1.2.4-1.7-.6.7-1 1.6-1.3 2.5-.4 1.4-.4 2.9-.1 4.3.4 1.6 1.2 3 2.4 4.2 1.5 1.5 3.5 2.4 5.6 2.6 2.6.2 5.2-.8 7.1-2.6 1.7-1.6 2.7-3.8 2.7-6.2 0-2.2-.8-4.3-2.3-5.9-.5-.5-1-.9-1.5-1.3.6.3 1.2.7 1.7 1.2.5.4.9.9 1.3 1.4-.2-.8-.5-1.5-1-2.2zM12 16c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/></svg>'
    "safari"  = '<svg class="icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm5-12l-7 3-3 7 7-3 3-7zm-5 5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>'
}

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

        # Aspect-preserving fit: the full pill (including rounded ends) must
        # be visible. The 'on' logo is wide (~2:1), so there will be some
        # transparent padding above/below in the 128x128 square canvas; this
        # is the intended trade-off to keep the logo whole.
        $ratioX = $iconSize / $img.Width
        $ratioY = $iconSize / $img.Height
        $ratio = [Math]::Min($ratioX, $ratioY)

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
        $firefoxAddonId = if ($cfg.PSObject.Properties.Name -contains 'firefoxAddonId' -and $cfg.firefoxAddonId) {
            $cfg.firefoxAddonId
        } else {
            "$($cfg.zipName)@language-redirector"
        }
        $manifest = $manifest.Replace("{{FIREFOX_ADDON_ID}}", $firefoxAddonId)
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
        $popupHtml = $popupHtml.Replace("{{BROWSER_LANG_ACTION_LABEL}}", $cfg.browserLangActionLabel)
        $popupHtml = $popupHtml.Replace("{{BROWSER_LANG_ACTION_URL}}", $cfg.browserLangActionUrl)
        $popupHtml = $popupHtml.Replace("{{GOOGLE_LANG_WARN}}", $cfg.googleLangWarn)
        $popupHtml = $popupHtml.Replace("{{GOOGLE_LANG_META}}", $cfg.googleLangMeta)
        $popupHtml = $popupHtml.Replace("{{GOOGLE_LANG_ACTION_LABEL}}", $cfg.googleLangActionLabel)
        $popupHtml = $popupHtml.Replace("{{GOOGLE_LANG_ACTION_URL}}", $cfg.googleLangActionUrl)
        $popupHtml = $popupHtml.Replace("{{LEGACY_NAME_TEXT}}", $cfg.legacyNameText)
        $popupHtml = $popupHtml.Replace("{{CREATOR_TEXT}}", $cfg.creatorText)
        $popupHtml = $popupHtml.Replace("{{CREATOR_NAME}}", $cfg.creatorName)
        $popupHtml = $popupHtml.Replace("{{CREATOR_URL}}", $cfg.creatorUrl)
        $popupHtml = $popupHtml.Replace("{{LANG_CODE}}", $lang)
        $browserIconSvg = if ($browserIconSvgs.ContainsKey($browser)) { $browserIconSvgs[$browser] } else { $browserIconSvgs["chrome"] }
        $popupHtml = $popupHtml.Replace("{{BROWSER_ICON_SVG}}", $browserIconSvg)
        Set-Content -Path "$targetDir/src/popup/popup.html" -Value $popupHtml -Encoding UTF8

        # Process Popup JS
        $popupJs = Get-Content -Raw -Path "src/popup/popup.template.js" -Encoding UTF8
        $popupJs = $popupJs.Replace("{{PREFERRED_LANGUAGE}}", $cfg.preferredLanguage)
        $popupJs = $popupJs.Replace("{{BROWSER_NAME}}", $browser)
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
