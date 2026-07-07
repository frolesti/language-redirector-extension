param (
    [string]$Language = "all",
    [string]$Browser = "all",
    [string]$Version = "2.0.2"
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

# Real brand SVGs from Simple Icons (https://simpleicons.org), 24x24, currentColor.
# Kept as inline strings so the popup can colour them via CSS. Do NOT hand-edit
# these paths; if a brand mark needs updating, copy the raw <path d="..."> from
# the official Simple Icons SVG for that brand.
function New-BrandSvg([string]$pathData) {
    return "<svg class=""icon"" viewBox=""0 0 24 24"" fill=""currentColor"" aria-hidden=""true""><path d=""$pathData""/></svg>"
}

$siChrome   = 'M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728z'
$siFirefox  = 'M20.452 3.445a11.002 11.002 0 00-2.482-1.908C16.944.997 15.098.093 12.477.032c-.734-.017-1.457.03-2.174.144-.72.114-1.398.292-2.118.56-1.017.377-1.996.975-2.574 1.554.583-.349 1.476-.733 2.55-.992a10.083 10.083 0 013.729-.167c2.341.34 4.178 1.381 5.48 2.625a8.066 8.066 0 011.298 1.587c1.468 2.382 1.33 5.376.184 7.142-.85 1.312-2.67 2.544-4.37 2.53-.583-.023-1.438-.152-2.25-.566-2.629-1.343-3.021-4.688-1.118-6.306-.632-.136-1.82.13-2.646 1.363-.742 1.107-.7 2.816-.242 4.028a6.473 6.473 0 01-.59-1.895 7.695 7.695 0 01.416-3.845A8.212 8.212 0 019.45 5.399c.896-1.069 1.908-1.72 2.75-2.005-.54-.471-1.411-.738-2.421-.767C8.31 2.583 6.327 3.061 4.7 4.41a8.148 8.148 0 00-1.976 2.414c-.455.836-.691 1.659-.697 1.678.122-1.445.704-2.994 1.248-4.055-.79.413-1.827 1.668-2.41 3.042C.095 9.37-.2 11.608.14 13.989c.966 5.668 5.9 9.982 11.843 9.982C18.62 23.971 24 18.591 24 11.956a11.93 11.93 0 00-3.548-8.511z'
$siMozilla  = 'M0 0v24h24V0zm10.13 6.706c1.481 0 2.858.706 3.352 2.224.565-1.377 1.73-2.224 3.353-2.224 1.87 0 3.565 1.13 3.565 3.564v4.765h1.412v2.26h-4.341v-5.86c0-1.8-.6-2.47-1.765-2.47-1.412 0-1.976 1.024-1.976 2.435V15h1.376v2.259h-4.341v-5.824c0-1.8-.6-2.47-1.765-2.47-1.412 0-1.976 1.024-1.976 2.435V15H9v2.259H2.647V15h1.377V9.176H2.647V6.918H6.99V8.47c.635-1.095 1.693-1.765 3.14-1.765z'
$siEdge     = 'M21.86 17.86q.14 0 .25.12.1.13.1.25t-.11.33l-.32.46-.43.53-.44.5q-.21.25-.38.42l-.22.23q-.58.53-1.34 1.04-.76.51-1.6.91-.86.4-1.74.64t-1.67.24q-.9 0-1.69-.28-.8-.28-1.48-.78-.68-.5-1.22-1.17-.53-.66-.92-1.44-.38-.77-.58-1.6-.2-.83-.2-1.67 0-1 .32-1.96.33-.97.87-1.8.14.95.55 1.77.41.82 1.02 1.5.6.68 1.38 1.21.78.54 1.64.9.86.36 1.77.56.92.2 1.8.2 1.12 0 2.18-.24 1.06-.23 2.06-.72l.2-.1.2-.05zm-15.5-1.27q0 1.1.27 2.15.27 1.06.78 2.03.51.96 1.24 1.77.74.82 1.66 1.4-1.47-.2-2.8-.74-1.33-.55-2.48-1.37-1.15-.83-2.08-1.9-.92-1.07-1.58-2.33T.36 14.94Q0 13.54 0 12.06q0-.81.32-1.49.31-.68.83-1.23.53-.55 1.2-.96.66-.4 1.35-.66.74-.27 1.5-.39.78-.12 1.55-.12.7 0 1.42.1.72.12 1.4.35.68.23 1.32.57.63.35 1.16.83-.35 0-.7.07-.33.07-.65.23v-.02q-.63.28-1.2.74-.57.46-1.05 1.04-.48.58-.87 1.26-.38.67-.65 1.39-.27.71-.42 1.44-.15.72-.15 1.38zM11.96.06q1.7 0 3.33.39 1.63.38 3.07 1.15 1.43.77 2.62 1.93 1.18 1.16 1.98 2.7.49.94.76 1.96.28 1 .28 2.08 0 .89-.23 1.7-.24.8-.69 1.48-.45.68-1.1 1.22-.64.53-1.45.88-.54.24-1.11.36-.58.13-1.16.13-.42 0-.97-.03-.54-.03-1.1-.12-.55-.1-1.05-.28-.5-.19-.84-.5-.12-.09-.23-.24-.1-.16-.1-.33 0-.15.16-.35.16-.2.35-.5.2-.28.36-.68.16-.4.16-.95 0-1.06-.4-1.96-.4-.91-1.06-1.64-.66-.74-1.52-1.28-.86-.55-1.79-.89-.84-.3-1.72-.44-.87-.14-1.76-.14-1.55 0-3.06.45T.94 7.55q.71-1.74 1.81-3.13 1.1-1.38 2.52-2.35Q6.68 1.1 8.37.58q1.7-.52 3.58-.52Z'
$siBrave    = 'M15.68 0l2.096 2.38s1.84-.512 2.709.358c.868.87 1.584 1.638 1.584 1.638l-.562 1.381.715 2.047s-2.104 7.98-2.35 8.955c-.486 1.919-.818 2.66-2.198 3.633-1.38.972-3.884 2.66-4.293 2.916-.409.256-.92.692-1.38.692-.46 0-.97-.436-1.38-.692a185.796 185.796 0 01-4.293-2.916c-1.38-.973-1.712-1.714-2.197-3.633-.247-.975-2.351-8.955-2.351-8.955l.715-2.047-.562-1.381s.716-.768 1.585-1.638c.868-.87 2.708-.358 2.708-.358L8.321 0h7.36z'
$siOpera    = 'M8.051 5.238c-1.328 1.566-2.186 3.883-2.246 6.48v.564c.061 2.598.918 4.912 2.246 6.479 1.721 2.236 4.279 3.654 7.139 3.654 1.756 0 3.4-.537 4.807-1.471C17.879 22.846 15.074 24 12 24c-.192 0-.383-.004-.57-.014C5.064 23.689 0 18.436 0 12 0 5.371 5.373 0 12 0h.045c3.055.012 5.84 1.166 7.953 3.055-1.408-.93-3.051-1.471-4.81-1.471-2.858 0-5.417 1.42-7.14 3.654h.003zM24 12c0 3.556-1.545 6.748-4.002 8.945-3.078 1.5-5.946.451-6.896-.205 3.023-.664 5.307-4.32 5.307-8.74 0-4.422-2.283-8.075-5.307-8.74.949-.654 3.818-1.703 6.896-.205C22.455 5.25 24 8.445 24 12z'
$siSafari   = 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 1.5c5.799 0 10.5 4.701 10.5 10.5S17.799 22.5 12 22.5 1.5 17.799 1.5 12 6.201 1.5 12 1.5zm4.72 4.72l-7.06 3.53-3.53 7.06 7.06-3.53 3.53-7.06zM12 10.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z'
$siEcosia   = 'M15.198 6.818H8.786v10.48h6.412v-3.342h-3.98v-1.262H13.8V11.42h-2.584v-1.261h3.981zM11.972.06A12.003 12.003 0 0 0 0 12.064a12.003 12.003 0 0 0 10.083 11.848c.068-1.277.196-2.723.434-3.652v-.014c0-.005 0-.007-.01-.012 0-.005-.01-.007-.012-.009 0-.002-.01-.002-.014-.002h-.356c-2.307 0-5.943-.333-6.916-3.45-1.458-4.642 2.025-6.314 3.484-4.97 0 .004.012.008.019.008.01 0 .014 0 .02-.005.01-.005.013-.009.015-.016v-.021c-.322-.945-2.148-6.867 2.64-8.496 4.08-1.369 8.07 1.491 7.461 5.265v.017c0 .007.01.012.012.014 0 .002.012.005.016.005 0 0 .012-.002.016-.005.298-.246 1.603-1.186 2.919-.148 1.247.982.844 3.73-1.627 5.003-.01.002-.014.007-.02.014v.023c0 .01.01.014.015.02.01.004.016.004.023.001 1.596-.239 4.316 1.193 2.11 4.375-1.447 2.1-4.71 2.365-6.168 2.365h-1.071s-.01 0-.012.002c0 .002-.01.005-.012.007 0 .002 0 .005-.01.009v.012c-.021.751.331 2.304.693 3.688A12.003 12.003 0 0 0 24 12.063 12.003 12.003 0 0 0 11.997.06a12.003 12.003 0 0 0-.03 0z'
$siGoogleG  = 'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z'

$browserIconSvgs = @{
    "chrome"  = New-BrandSvg $siChrome
    "edge"    = New-BrandSvg $siEdge
    "brave"   = New-BrandSvg $siBrave
    "opera"   = New-BrandSvg $siOpera
    "ecosia"  = New-BrandSvg $siEcosia
    "firefox" = New-BrandSvg $siFirefox
    "safari"  = New-BrandSvg $siSafari
}

$googleAccountIconSvg    = New-BrandSvg $siGoogleG
# NOTE: We deliberately use the Firefox flame (not the Mozilla wordmark) for
# the account icon because the wordmark is unreadable at 14px and users
# recognise the flame as "their Firefox account".
$mozillaAccountIconSvg   = New-BrandSvg $siFirefox
$microsoftAccountIconSvg = New-BrandSvg $siEdge

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
        $accountIconSvg = switch ($browser) {
            "chrome"  { $googleAccountIconSvg }
            "firefox" { $mozillaAccountIconSvg }
            "edge"    { $microsoftAccountIconSvg }
            "brave"   { $browserIconSvgs["brave"] }
            "opera"   { $browserIconSvgs["opera"] }
            "ecosia"  { $browserIconSvgs["ecosia"] }
            "safari"  { $browserIconSvgs["safari"] }
            default {
                $googleAccountIconSvg
            }
        }
        $popupHtml = $popupHtml.Replace("{{ACCOUNT_ICON_SVG}}", $accountIconSvg)
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
