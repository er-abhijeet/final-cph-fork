import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getLanguage } from './utils';
import { compileAndRunViaApi, shouldUseCloudApi } from './apiClient';
import { getCloudCompilerApiUrlPref } from './preferences';

/**
 * Quick run command - runs the current file with input.txt and shows output in terminal
 */
export async function quickRun() {
    const editor = vscode.window.activeTextEditor;
    
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found. Please open a file first.');
        return;
    }

    const srcPath = editor.document.fileName;
    
    // Check if file is saved
    if (editor.document.isUntitled) {
        const saveResult = await vscode.window.showWarningMessage(
            'File is not saved. Please save the file first.',
            'Save and Run',
            'Cancel'
        );
        
        if (saveResult === 'Save and Run') {
            await editor.document.save();
        } else {
            return;
        }
    }

    // Get input.txt path in the same directory
    const fileDir = path.dirname(srcPath);
    const inputFilePath = path.join(fileDir, 'input.txt');

    // Check if input.txt exists
    if (!fs.existsSync(inputFilePath)) {
        vscode.window.showErrorMessage(
            `input.txt not found in ${fileDir}. Please create input.txt file in the same directory.`
        );
        return;
    }

    // Read input.txt
    let input: string;
    try {
        input = fs.readFileSync(inputFilePath, 'utf-8');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to read input.txt: ${error}`);
        return;
    }

    // Get language
    let language;
    try {
        language = getLanguage(srcPath);
    } catch (error) {
        vscode.window.showErrorMessage(`Unsupported file type: ${path.extname(srcPath)}`);
        return;
    }

    // Check if cloud API is configured
    const apiUrl = getCloudCompilerApiUrlPref();
    if (!apiUrl || apiUrl.trim() === '') {
        vscode.window.showErrorMessage(
            'Cloud compiler API is not configured. Please set cph.general.cloudCompilerApiUrl in settings.'
        );
        return;
    }

    // Check if language is supported
    if (!shouldUseCloudApi(language)) {
        const languageDisplayName = language.name.toUpperCase();
        vscode.window.showWarningMessage(
            `This language (${languageDisplayName}) is not yet supported by the cloud compiler. The developers are working on adding support for it.`
        );
        return;
    }

    // Show progress
    vscode.window.showInformationMessage('Running code...');

    try {
        // Call cloud API
        const result = await compileAndRunViaApi(srcPath, input, language);

        // Create or get terminal
        const terminalName = 'CPH Quick Run';
        let terminal = vscode.window.terminals.find(t => t.name === terminalName);
        
        if (!terminal) {
            terminal = vscode.window.createTerminal(terminalName);
        }

        terminal.show();

        // Format output for terminal display
        // Handle special characters: \n, \t, etc.
        let output = result.stdout || '';
        
        // Use a temporary file approach for better character handling
        const tempOutputFile = path.join(fileDir, '.cph_output_temp.txt');
        
        try {
            if (result.code !== 0 || result.stderr) {
                // Show error
                const errorMsg = result.stderr || result.stdout || 'Unknown error';
                fs.writeFileSync(tempOutputFile, `=== ERROR ===\n${errorMsg}`, 'utf-8');
            } else {
                // Show output
                fs.writeFileSync(tempOutputFile, `=== OUTPUT ===\n${output}`, 'utf-8');
            }
            
            // Display the file using type command (Windows) or cat (Unix)
            // This properly handles all special characters
            const isWindows = os.platform() === 'win32';
            if (isWindows) {
                terminal.sendText(`type "${tempOutputFile}"`);
            } else {
                terminal.sendText(`cat "${tempOutputFile}"`);
            }
            
            // Clean up temp file after a delay
            setTimeout(() => {
                try {
                    if (fs.existsSync(tempOutputFile)) {
                        fs.unlinkSync(tempOutputFile);
                    }
                } catch (e) {
                    // Ignore cleanup errors
                }
            }, 5000);
            
        } catch (fileError) {
            // Fallback to direct echo if file approach fails
            globalThis.logger.error('Failed to write temp file, using direct output:', fileError);
            if (result.code !== 0 || result.stderr) {
                const errorMsg = result.stderr || result.stdout || 'Unknown error';
                terminal.sendText(`echo === ERROR ===`);
                terminal.sendText(`echo ${escapeForEcho(errorMsg)}`);
            } else {
                terminal.sendText(`echo === OUTPUT ===`);
                terminal.sendText(`echo ${escapeForEcho(output)}`);
            }
        }

        // Show completion message
        if (result.code === 0) {
            vscode.window.showInformationMessage('Code executed successfully!');
        } else {
            vscode.window.showErrorMessage('Code execution failed. Check terminal for details.');
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to run code: ${error.message || error}`);
        globalThis.logger.error('Quick run error:', error);
    }
}

/**
 * Escape string for Windows CMD echo command
 */
function escapeForEcho(str: string): string {
    // Replace special characters that need escaping in CMD
    // & | < > ^ need to be escaped with ^
    // Quotes need special handling
    let escaped = str
        .replace(/\^/g, '^^')  // Escape ^
        .replace(/&/g, '^&')   // Escape &
        .replace(/\|/g, '^|')  // Escape |
        .replace(/</g, '^<')   // Escape <
        .replace(/>/g, '^>')   // Escape >
        .replace(/"/g, '\\"'); // Escape quotes
    
    // Wrap in quotes to handle spaces
    return `"${escaped}"`;
}

/**
 * Escape string for terminal display (general purpose)
 */
function escapeForTerminal(str: string): string {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\$/g, '\\$')
        .replace(/`/g, '\\`');
}
