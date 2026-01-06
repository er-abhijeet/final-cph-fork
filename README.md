# CPH Cloud Compiler - Competitive Programming Helper (Cloud Edition)


[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/er-abhijeet/final-cph-fork)

⚠️ **WARNING: If you have the original CPH extension installed and enabled, please disable or uninstall it and restart VSCode before installing and using this extension!**

## About This Fork

This extension is a fork of the original [Competitive Programming Helper (CPH)](https://github.com/agrawal-d/cph) by Divyanshu Agrawal. However, this version has been significantly modified to use a **cloud-based compilation and execution API** instead of local compilers.

### Key Differences

- **Cloud-Based Execution**: All code compilation and execution happens via a cloud API, making it platform-independent
- **No Local Setup Required**: You don't need to install compilers (gcc, g++, Python, Java, etc.) on your machine
- **Easy to Use**: Just configure the API endpoint and start coding
- **Same Great UI**: The frontend interface remains from the original CPH extension

**Note**: The frontend interface is based on the original CPH extension by Divyanshu Agrawal, but the entire backend implementation (cloud API integration, compilation logic, execution handling) is original work.

## Features

- **Cloud Compilation**: Compile and run code via cloud API - no local compiler setup needed
- **Platform Independent**: Works on any OS without installing language-specific compilers
- **Automatic Testcase Management**: Automatically download testcases or write & test your own problems
- **Intelligent Judge**: Support for signals, timeouts and runtime errors
- **Competitive Companion Integration**: Works with Competitive Companion browser extension
- **Quick Run Button**: Quick run button in editor title bar for fast testing
- **Multiple Language Support**: C, C++, Python, Java, JavaScript, Rust, Go, C# and more

## Quick Start

1. **Install the extension** from the VS Code marketplace (or build from source)
2. **Configure the API endpoint** in VS Code settings:
   - Open Settings (Ctrl+,)
   - Search for `cph.general.cloudCompilerApiUrl`
   - Set it to your cloud compiler API endpoint (default: `http://sample_url_backend:port`)
3. **Install Competitive Companion** (optional) - [Install from here](https://github.com/jmerle/competitive-companion#readme)
4. **Start coding!** 
   - Use Companion by pressing the green plus (+) circle when visiting any problem page
   - Or manually create testcases and press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>B</kbd> to run them
   - Or use the **Quick Run** button in the editor title bar

## Supported Languages

The following languages are supported via the cloud API:

- **C** (`.c`)
- **C++** (`.cpp`, `.cc`, `.cxx`)
- **Python** (`.py`)
- **Java** (`.java`)
- **JavaScript** (`.js`)
- **Rust** (`.rs`)
- **Go** (`.go`)
- **C#** (`.cs`)

**Note**: Some languages (Ruby, Haskell, Cangjie) are not yet supported by the cloud API. The developers are working on adding support for them. For these languages, you can still use local compilation if available.

## Configuration

### Cloud API Endpoint

Set your cloud compiler API endpoint in VS Code settings:

```json
{
  "cph.general.cloudCompilerApiUrl": "http://sample_url_backend:port"
}
```

### Quick Run Feature

The Quick Run button appears in the editor title bar for supported languages. It:
- Uses the currently opened file as code
- Reads `input.txt` from the same directory
- Compiles and runs via cloud API
- Shows output in a terminal

## Installation from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/er-abhijeet/final-cph-fork.git
   cd final-cph-fork
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run webpack
   ```

4. Press F5 in VS Code to launch the Extension Development Host

## Credits

- **Original CPH Extension**: Created by [Divyanshu Agrawal](https://github.com/agrawal-d/cph) - The frontend interface is based on this excellent work
- **Cloud Backend Implementation**: Original work by Abhijeet Mohapatra
- **This Fork**: Maintained by [Abhijeet Mohapatra](https://github.com/er-abhijeet)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

**Before creating a Pull Request**, please create an issue to discuss the approach. It makes reviewing and accepting the PR much easier.

## Support

If you find this extension useful, consider supporting the development:

- [☕ Buy me a coffee](https://buymeacoffee.com/abhijeetmohapatra)

## Contact

- **GitHub**: [@er-abhijeet](https://github.com/er-abhijeet)
- **LinkedIn**: [Abhijeet Mohapatra](https://www.linkedin.com/in/abhijeet-mohapatra-0292942b4/)
- **Email**: er.abhijeet83@gmail.com

## License

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
this program. If not, see <https://www.gnu.org/licenses/>.

Copyright (C) 2024 - Present Abhijeet Mohapatra
