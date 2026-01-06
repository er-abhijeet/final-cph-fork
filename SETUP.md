# Setup and Testing Guide

## Prerequisites

1. **Node.js** (v18 or higher recommended)
2. **npm** (comes with Node.js)
3. **VS Code** with the extension development environment

## Initial Setup

### 1. Install Dependencies

First, navigate to the `cph-main` directory and install all npm dependencies:

```bash
cd cph-main
npm install
```

This will install all the required packages listed in `package.json`.

### 2. Build the Extension

Before running the extension, you need to build it using webpack:

```bash
npm run webpack
```

This compiles TypeScript files and bundles the extension code into the `dist/` directory.

**Note:** The launch configuration will automatically run this before launching, but it's good to run it manually first to check for any compilation errors.

## Running and Debugging the Extension

### Option 1: Using VS Code Run and Debug (Recommended)

1. **Open the project in VS Code:**
   ```bash
   code cph-main
   ```

2. **Press `F5`** or go to:
   - **Run and Debug** panel (Ctrl+Shift+D)
   - Select **"Run Extension"** from the dropdown
   - Click the green play button

3. **A new VS Code window will open** (Extension Development Host) with your extension loaded.

4. **Test the extension:**
   - Open a code file (e.g., `test.cpp`, `test.py`)
   - Press `Ctrl+Alt+B` to run testcases
   - Or use the command palette: `Ctrl+Shift+P` → "Run Testcases"

### Option 2: Manual Build and Watch Mode

For development with auto-rebuild on file changes:

**Terminal 1 - Build backend:**
```bash
npm run webpack-dev
```

**Terminal 2 - Build frontend (webview):**
```bash
npm run webpack-frontend-dev
```

Then press `F5` in VS Code to launch. The watch mode will automatically rebuild when you make changes.

## Testing Checklist

### 1. Test Cloud API Integration

1. **Set the API URL** in VS Code settings:
   - Open Settings (Ctrl+,)
   - Search for "cph.general.cloudCompilerApiUrl"
   - Set it to: `http://20.244.41.47:3000`

2. **Test with supported languages:**
   - Create a test file: `test.cpp`
   ```cpp
   #include <iostream>
   using namespace std;
   int main() {
       int a, b;
       cin >> a >> b;
       cout << a + b << endl;
       return 0;
   }
   ```
   - Create testcases and run (Ctrl+Alt+B)
   - Should use cloud API

3. **Test with unsupported language:**
   - Create a test file: `test.rb` (Ruby)
   - Try to run testcases
   - Should show warning message and fall back to local compilation

### 2. Test Local Compilation (Fallback)

1. **Clear or change the API URL** in settings
2. **Run testcases** - should use local compilers

### 3. Verify Error Handling

- Test with API server down (should show error message)
- Test with invalid API URL
- Test with network errors

## Useful Commands

```bash
# Install dependencies
npm install

# Build once (development)
npm run webpack

# Build once (production)
npm run webpack-production

# Watch mode - auto rebuild on changes
npm run webpack-dev
npm run webpack-frontend-dev

# Type checking
npm run test-compile

# Linting
npm run lint

# Run tests
npm run test

# Build for publishing
npm run vscode:prepublish
```

## Troubleshooting

### Extension doesn't load
- Make sure `npm install` completed successfully
- Check that `dist/extension.js` exists (run `npm run webpack`)
- Check the Debug Console in VS Code for errors

### Changes not reflecting
- Stop the Extension Development Host window
- Rebuild: `npm run webpack`
- Press F5 again to relaunch

### TypeScript errors
- Run `npm run test-compile` to see all TypeScript errors
- Fix errors before building

### Webpack errors
- Check that all dependencies are installed: `npm install`
- Clear node_modules and reinstall if needed:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

## Development Workflow

1. **Make code changes** in `src/` directory
2. **Build the extension:**
   ```bash
   npm run webpack
   ```
   Or use watch mode for auto-rebuild
3. **Press F5** to launch Extension Development Host
4. **Test your changes** in the new window
5. **Check Debug Console** for any errors or logs
6. **Repeat** as needed

## Debugging Tips

- Use `globalThis.logger.log()` for logging (visible in Debug Console)
- Set breakpoints in TypeScript files
- Check the Debug Console output for extension logs
- Use VS Code's built-in debugger to step through code

## File Structure

- `src/` - Source TypeScript files
- `dist/` - Compiled/bundled output (generated)
- `src/webview/frontend/` - React frontend code
- `.vscode/launch.json` - Debug configuration
