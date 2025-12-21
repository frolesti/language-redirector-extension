param (
    [string]$InputFolder = "assets/img",
    [string]$OutputFolder = "promo/ca",
    [int]$TargetWidth = 1280,
    [int]$TargetHeight = 800
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
}

$files = Get-ChildItem -Path $InputFolder -Filter "*.png"

$i = 1
foreach ($file in $files) {
    Write-Host "Processing $($file.Name)..."
    
    $img = [System.Drawing.Image]::FromFile($file.FullName)
    $bmp = New-Object System.Drawing.Bitmap($TargetWidth, $TargetHeight)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White) # Background color

    # Calculate scaling to fit (contain)
    $ratioX = $TargetWidth / $img.Width
    $ratioY = $TargetHeight / $img.Height
    # Use the smaller ratio to ensure the whole image fits
    $ratio = [Math]::Min($ratioX, $ratioY)
    
    # Or use 'Cover' strategy (max ratio) to fill the screen?
    # Usually for store screenshots, 'Contain' with a nice background or 'Fill' is better.
    # Let's stick to 'Contain' to avoid cutting off UI elements.
    
    $newWidth = [int]($img.Width * $ratio)
    $newHeight = [int]($img.Height * $ratio)
    
    $posX = ($TargetWidth - $newWidth) / 2
    $posY = ($TargetHeight - $newHeight) / 2
    
    $g.DrawImage($img, $posX, $posY, $newWidth, $newHeight)
    
    $newFileName = "screenshot_$i.png"
    $outputPath = Join-Path $OutputFolder $newFileName
    
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $img.Dispose()
    $bmp.Dispose()
    $g.Dispose()
    
    Write-Host "Saved to $outputPath"
    $i++
}
