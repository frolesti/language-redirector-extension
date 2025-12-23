param (
    [int]$TargetWidth = 1280,
    [int]$TargetHeight = 800
)

Add-Type -AssemblyName System.Drawing

$languages = @("ca", "eu", "gl")
$baseInput = "assets/img/screenshots"
$baseOutput = "assets/promo"

foreach ($lang in $languages) {
    $inputFolder = Join-Path $baseInput $lang
    $outputFolder = Join-Path $baseOutput $lang

    if (-not (Test-Path $inputFolder)) {
        Write-Warning "Input folder not found: $inputFolder"
        continue
    }

    if (-not (Test-Path $outputFolder)) {
        New-Item -ItemType Directory -Path $outputFolder -Force | Out-Null
    }

    $files = Get-ChildItem -Path $inputFolder -Filter "*.png"

    $i = 1
    foreach ($file in $files) {
        Write-Host "Processing [$lang] $($file.Name)..."
        
        $img = [System.Drawing.Image]::FromFile($file.FullName)
        
        # Create a new bitmap with 24bppRGB to ensure no alpha channel
        $bmp = New-Object System.Drawing.Bitmap($TargetWidth, $TargetHeight, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        
        # Set resolution to standard 72 DPI to avoid validation issues
        $bmp.SetResolution(72, 72)

        # Fill with a neutral background (e.g., White or a soft gray)
        $g.Clear([System.Drawing.Color]::White)

        # Calculate scaling to fit (contain)
        $ratioX = $TargetWidth / $img.Width
        $ratioY = $TargetHeight / $img.Height
        # Use the smaller ratio to ensure the whole image fits
        $ratio = [Math]::Min($ratioX, $ratioY)
        
        $newWidth = [int]($img.Width * $ratio)
        $newHeight = [int]($img.Height * $ratio)
        
        $posX = [int](($TargetWidth - $newWidth) / 2)
        $posY = [int](($TargetHeight - $newHeight) / 2)
        
        $g.DrawImage($img, $posX, $posY, $newWidth, $newHeight)
        
        # Save as JPEG to ensure no Alpha channel issues and better compatibility
        $newFileName = "screenshot_$i.jpg"
        $outputPath = Join-Path $outputFolder $newFileName
        
        # JPEG Encoder setup
        $jpgEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 100)

        $bmp.Save($outputPath, $jpgEncoder, $encoderParams)
        
        $g.Dispose()
        $bmp.Dispose()
        $img.Dispose()
        
        $i++
    }
}
Write-Host "All done! Files saved to assets/promo/"
