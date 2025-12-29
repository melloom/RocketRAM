# Third-Party Licenses and Attributions

This document contains license information for third-party software, libraries, and resources used in RocketRAM.

## Software Dependencies

### Electron
**License:** MIT  
**Version:** ^28.0.0  
**Copyright:** Copyright (c) 2013-2024 GitHub Inc.  
**Website:** https://www.electronjs.org/  
**License:** https://github.com/electron/electron/blob/main/LICENSE

### systeminformation
**License:** MIT  
**Version:** ^5.21.0  
**Copyright:** Copyright (c) 2014-2024 Sebastian Hildebrandt  
**Website:** https://github.com/sebhildebrandt/systeminformation  
**License:** https://github.com/sebhildebrandt/systeminformation/blob/master/LICENSE

### electron-builder
**License:** MIT  
**Version:** ^24.9.1  
**Copyright:** Copyright (c) 2015 Loopback Services  
**Website:** https://github.com/electron-userland/electron-builder  
**License:** https://github.com/electron-userland/electron-builder/blob/master/LICENSE

## Electron and Chromium Components

RocketRAM includes Electron, which bundles Chromium and other open-source components. The full license information for these components is available at:

- **Electron License:** Included in `node_modules/electron/LICENSE`
- **Chromium Licenses:** Included in `node_modules/electron/dist/LICENSES.chromium.html`

### Key Chromium Components:
- **Chromium** - BSD-style license
- **Node.js** - MIT License
- **V8 JavaScript Engine** - BSD-style license
- **Various other open-source libraries** - Various licenses (mostly BSD, MIT, Apache)

## Fonts

### Orbitron (if used)
**License:** SIL Open Font License 1.1  
**Website:** https://fonts.google.com/specimen/Orbitron  
**Attribution:** Copyright (c) 2009-2018, The League of Moveable Type

### JetBrains Mono (if used)
**License:** SIL Open Font License 1.1  
**Website:** https://www.jetbrains.com/lp/mono/  
**Attribution:** Copyright (c) 2020, JetBrains s.r.o.

## Icons and Graphics

All icons and graphics used in RocketRAM are either:
- Created specifically for RocketRAM
- Licensed for use in RocketRAM
- Public domain resources

## Build Tools and Development Dependencies

The following tools may be used during development and building:

### Node.js Dependencies
All Node.js dependencies are listed in `package.json` and `package-lock.json`. Each dependency includes its own license file in `node_modules/[package-name]/LICENSE*`.

**Key development dependencies:**
- Various npm packages with MIT, Apache, BSD, ISC, and other open-source licenses
- All licenses are preserved in `node_modules/`

## License Compliance

RocketRAM complies with all applicable open-source licenses:

1. **MIT License** - Used for most dependencies
   - Permits commercial use, modification, distribution, private use
   - Requires license and copyright notice

2. **BSD Licenses** - Used for some Electron/Chromium components
   - Permits commercial use, modification, distribution
   - Requires license and copyright notice

3. **Apache License 2.0** - Used for some components
   - Permits commercial use, modification, distribution
   - Requires license and copyright notice
   - Requires state changes

4. **SIL Open Font License** - Used for fonts (if applicable)
   - Permits embedding, modification, distribution
   - Requires license file to be included

## How to View Full License Information

### For Electron and Chromium:
```bash
# View Electron license
cat node_modules/electron/LICENSE

# View Chromium licenses (HTML file)
# Open in browser: node_modules/electron/dist/LICENSES.chromium.html
```

### For npm Dependencies:
Each package in `node_modules/` contains its license file. To view a specific package's license:

```bash
cat node_modules/[package-name]/LICENSE
# or
cat node_modules/[package-name]/LICENSE.txt
# or
cat node_modules/[package-name]/LICENSE.md
```

### For systeminformation:
```bash
cat node_modules/systeminformation/LICENSE
```

## Attribution

We gratefully acknowledge the following projects and communities:

- **Electron Team** - For the excellent desktop application framework
- **systeminformation** - For comprehensive system monitoring capabilities
- **Node.js Community** - For the JavaScript runtime
- **Chromium Project** - For the browser engine
- **All open-source contributors** - For making this project possible

## Questions About Licenses

If you have questions about any license or need additional license information, please contact:

- Email: [your-email@example.com]
- Website: [your-website.com]

## License Verification

To verify that RocketRAM includes all required license notices:

1. Check that `THIRD_PARTY_LICENSES.md` is included in distributions
2. Verify that Electron license files are included in the built application
3. Confirm that all npm dependencies include their license files in `node_modules/`

---

**Note:** This file is provided for compliance and transparency. RocketRAM uses only open-source, permissively licensed software that is compatible with RocketRAM's MIT license.


