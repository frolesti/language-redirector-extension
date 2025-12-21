param (
    [string]$Language = "all"
)

$config = Get-Content -Raw -Path "config.json" -Encoding UTF8 | ConvertFrom-Json
$languages = if ($Language -eq "all") { $config.PSObject.Properties.Name } else { @($Language) }

Add-Type -AssemblyName System.Drawing

function Update-Icon {
    param (
        [string]$SourcePath,
        [string]$DestPath
    )
    
    if (-not (Test-Path $SourcePath)) {
        Write-Error "Icon not found: $SourcePath"
        return
    }

    $img = [System.Drawing.Image]::FromFile($SourcePath)
    $canvasSize = 128
    $iconSize = 96 # Set to 96 to leave 16px padding as per Chrome Web Store requirements

    # Calculate scaling
    $ratioX = $iconSize / $img.Width
    $ratioY = $iconSize / $img.Height
    $ratio = [Math]::Min($ratioX, $ratioY)
    
    $newWidth = [int]($img.Width * $ratio)
    $newHeight = [int]($img.Height * $ratio)

    $bmp = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize)
    # Make white transparent on the new bitmap if we were drawing directly, 
    # but we need to process the source image or draw it then make transparent.
    # Better approach: Make the source image transparent if it has white background.
    # Note: This is a simple color key. It might affect white parts inside the logo.
    # Given the request "remove white background", we'll try this.
    
    # Create a temporary bitmap to process transparency
    $tempBmp = New-Object System.Drawing.Bitmap($img)
    $tempBmp.MakeTransparent([System.Drawing.Color]::White)

    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $posX = ($canvasSize - $newWidth) / 2
    $posY = ($canvasSize - $newHeight) / 2

    $g.DrawImage($tempBmp, $posX, $posY, $newWidth, $newHeight)
    $bmp.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $tempBmp.Dispose()
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

    # Update Icon
    if (-not (Test-Path "icons")) {
        New-Item -ItemType Directory -Path "icons" -Force | Out-Null
    }

    $iconSource = $cfg.iconSource
    if (-not (Test-Path $iconSource)) {
        Write-Warning "Icon source $iconSource not found for $lang"
    } else {
        Update-Icon -SourcePath $iconSource -DestPath "icons/logo.png"
    }

    # Zip
    $zipName = $cfg.zipName
    if (Test-Path $zipName) { Remove-Item $zipName }
    Compress-Archive -Path manifest.json, src, icons -DestinationPath $zipName -Force
    Write-Host "Created $zipName"
}
