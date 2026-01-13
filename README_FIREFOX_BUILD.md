# Firefox Extension - Build Instructions

## Build Environment Requirements

- **Operating System**: Windows 10/11 (or any OS with PowerShell Core 7+)
- **PowerShell**: Version 5.1 or higher (included in Windows) or PowerShell Core 7+
- **No additional dependencies**: The build script uses only built-in .NET assemblies

## Prerequisites

No external tools or package managers are required. The build script uses:
- `System.Drawing` (built-in .NET assembly for icon processing)
- `System.IO.Compression` (built-in .NET assembly for ZIP creation)

These are available by default in Windows PowerShell and PowerShell Core.

## Build Instructions

### Step 1: Prepare the Source Code

1. Unzip the provided source code archive to a folder on your machine.
2. Open a PowerShell terminal in that folder.

### Step 2: Build the Firefox Extension

To build **only the Firefox version**:

```powershell
.\build.ps1 -Language ca -Browser firefox
```

### Step 3: Locate the Built Extension

The generated ZIP file will be located at:

```
build/EnCatalaSisplau_firefox.zip    (for Catalan)
```

The unpacked extension files will also be available in:

```
build/EnCatalaSisplau_firefox/
```

## What the Build Script Does

The `build.ps1` script performs the following operations:

1. **Reads configuration** from `config.json` (language-specific strings and settings)
2. **Processes icon files**:
   - Resizes and centers the language-specific logo from `assets/img/icons/`
   - Creates a grayscale "disabled" version
3. **Generates manifest.json** from `manifest.firefox.json` template:
   - Replaces `{{NAME}}`, `{{VERSION}}`, `{{DESCRIPTION}}`, etc.
4. **Generates popup HTML** from `src/popup/popup.template.html`:
   - Replaces language-specific strings like `{{POPUP_TITLE}}`, `{{DONATE_TEXT}}`, etc.
5. **Generates popup JavaScript** from `src/popup/popup.template.js`:
   - Replaces `{{PREFERRED_LANGUAGE}}`, `{{ENABLE_TEXT}}`, etc.
6. **Generates content script** from `src/content.template.js`:
   - Replaces `{{PREFERRED_LANGUAGE}}` and `{{NAME}}`
7. **Copies static files**:
   - `src/background.js` (unchanged)
   - `src/popup/popup.css` (unchanged)
8. **Creates ZIP archive** with proper forward-slash paths for Firefox compatibility

## Source Files vs. Generated Files

### Source Files (Included in Repository)

- `manifest.firefox.json` - Firefox manifest template
- `src/content.template.js` - Content script template
- `src/popup/popup.template.html` - Popup HTML template
- `src/popup/popup.template.js` - Popup JavaScript template
- `src/background.js` - Background script (static)
- `src/popup/popup.css` - Popup stylesheet (static)
- `config.json` - Language-specific configuration
- `build.ps1` - Build script

### Generated Files (NOT in Repository, Created by Build)

- `build/EnCatalaSisplau_firefox/manifest.json` - Processed manifest
- `build/EnCatalaSisplau_firefox/src/content.js` - Processed content script
- `build/EnCatalaSisplau_firefox/src/popup/popup.html` - Processed popup HTML
- `build/EnCatalaSisplau_firefox/src/popup/popup.js` - Processed popup JS
- `build/EnCatalaSisplau_firefox/icons/*.png` - Processed icons
- `build/EnCatalaSisplau_firefox.zip` - Final extension package

## Verification

To verify the build produces the exact same output:

1. Extract the submitted ZIP file to a temporary directory
2. Run the build command: `.\build.ps1 -Language ca -Browser firefox`
3. Compare the contents of `build/EnCatalaSisplau_firefox/` with the extracted files

All files should match exactly, except for metadata in PNG files (timestamps in icon generation may vary slightly).

## Version Control

Current version: **1.7**

Version number is set in `build.ps1` (line 4):

```powershell
[string]$Version = "1.7"
```

## Notes

- The build process does NOT use any transpilation, minification, or bundlers
- All transformations are simple string replacements
- No third-party libraries or dependencies are used
- The source code is human-readable and directly corresponds to the generated output

## Support

For questions about the build process, please open an issue on GitHub:
https://github.com/YOUR_USERNAME/language-redirector-extension/issues
