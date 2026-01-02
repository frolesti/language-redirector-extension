param (
    [string]$Language = "all"
)

$config = Get-Content -Raw -Path "config.json" -Encoding UTF8 | ConvertFrom-Json
$languages = if ($Language -eq "all") { $config.PSObject.Properties.Name } else { @($Language) }

Add-Type -AssemblyName System.Drawing

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

    $img = [System.Drawing.Image]::FromFile($SourcePath)
    $canvasSize = 128
    $iconSize = 128 # Use exact size to avoid cropping or blurring, as we now use 128px source icons

    # Calculate scaling
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
}

foreach ($lang in $languages) {
    Write-Host "Building for language: $lang"
    $cfg = $config.$lang

    # Process Manifest
    $manifest = Get-Content -Raw -Path "manifest.template.json" -Encoding UTF8
    $manifest = $manifest.Replace("{{NAME}}", $cfg.name)
    $manifest = $manifest.Replace("{{DESCRIPTION}}", $cfg.description)
    Set-Content -Path "manifest.json" -Value $manifest -Encoding UTF8

    # Process Popup HTML
    $popupHtml = Get-Content -Raw -Path "src/popup/popup.template.html" -Encoding UTF8
    $popupHtml = $popupHtml.Replace("{{POPUP_TITLE}}", $cfg.popupTitle)
    $popupHtml = $popupHtml.Replace("{{POPUP_TEXT}}", $cfg.popupText)
    $popupHtml = $popupHtml.Replace("{{DONATE_TEXT}}", $cfg.donateText)
    $popupHtml = $popupHtml.Replace("{{REPORT_TEXT}}", $cfg.reportText)
    $popupHtml = $popupHtml.Replace("{{ENABLE_TEXT}}", $cfg.enableText)
    Set-Content -Path "src/popup/popup.html" -Value $popupHtml -Encoding UTF8

    # Process Popup JS
    $popupJs = Get-Content -Raw -Path "src/popup/popup.template.js" -Encoding UTF8
    $popupJs = $popupJs.Replace("{{PREFERRED_LANGUAGE}}", $cfg.preferredLanguage)
    $popupJs = $popupJs.Replace("{{REPORT_SUBJECT}}", [System.Uri]::EscapeDataString($cfg.reportSubject))
    $popupJs = $popupJs.Replace("{{ENABLE_TEXT}}", $cfg.enableText)
    $popupJs = $popupJs.Replace("{{DISABLE_TEXT}}", $cfg.disableText)
    Set-Content -Path "src/popup/popup.js" -Value $popupJs -Encoding UTF8

    # Process Content JS
    $contentJs = Get-Content -Raw -Path "src/content.template.js" -Encoding UTF8
    $contentJs = $contentJs.Replace("{{PREFERRED_LANGUAGE}}", $cfg.preferredLanguage)
    Set-Content -Path "src/content.js" -Value $contentJs -Encoding UTF8

    # Update Icon
    if (-not (Test-Path "icons")) {
        New-Item -ItemType Directory -Path "icons" -Force | Out-Null
    }

    $iconSource = $cfg.iconSource
    if (-not (Test-Path $iconSource)) {
        Write-Warning "Icon source $iconSource not found for $lang"
    } else {
        Update-Icon -SourcePath $iconSource -DestPath "icons/logo.png"
        Update-Icon -SourcePath $iconSource -DestPath "icons/logo_disabled.png" -Grayscale
    }

    # Zip
    $zipName = $cfg.zipName
    if (Test-Path $zipName) { Remove-Item $zipName }
    Compress-Archive -Path manifest.json, src, icons -DestinationPath $zipName -Force
    Write-Host "Created $zipName"
}
