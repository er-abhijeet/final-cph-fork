import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Language, LangNames, Run } from './types';
import { getCloudCompilerApiUrlPref } from './preferences';
import { getJudgeViewProvider } from './extension';

/**
 * Maps extension language names to API language names
 * Returns null if language is not supported by the API
 */
export const mapLanguageToApi = (extLanguage: LangNames): string | null => {
    switch (extLanguage) {
        case 'c':
            return 'c';
        case 'cpp':
        case 'cc':
        case 'cxx':
            return 'cpp';
        case 'python':
            return 'python';
        case 'java':
            return 'java';
        case 'js':
            return 'javascript';
        case 'rust':
            return 'rust';
        case 'go':
            return 'go';
        case 'csharp':
            return 'csharp';
        case 'ruby':
        case 'hs':
        case 'cangjie':
            return null; // Not supported by API
        default:
            return null;
    }
};

/**
 * Check if cloud API is enabled and language is supported
 */
export const shouldUseCloudApi = (language: Language): boolean => {
    const apiUrl = getCloudCompilerApiUrlPref();
    if (!apiUrl || apiUrl.trim() === '') {
        return false;
    }
    const apiLanguage = mapLanguageToApi(language.name);
    return apiLanguage !== null;
};

/**
 * Compile and run code via cloud API
 * @param srcPath Path to source code file
 * @param input Input string for the program
 * @param language Language object
 * @returns Promise<Run> with execution results
 */
export const compileAndRunViaApi = async (
    srcPath: string,
    input: string,
    language: Language,
): Promise<Run> => {
    const apiUrl = getCloudCompilerApiUrlPref();
    const apiLanguage = mapLanguageToApi(language.name);

    if (!apiUrl || apiUrl.trim() === '') {
        throw new Error('Cloud API not configured');
    }

    if (!apiLanguage) {
        const languageDisplayName = language.name.toUpperCase();
        const errorMessage = `This language (${languageDisplayName}) is not yet supported by the cloud compiler. The developers are working on adding support for it. Please use local compilation for now.`;
        vscode.window.showWarningMessage(errorMessage);
        throw new Error(errorMessage);
    }

    const begin = Date.now();
    let inputFilePath: string | null = null;

    try {
        // Create temporary input file
        if (input && input.trim() !== '') {
            const tempDir = os.tmpdir();
            const inputFileName = `cph_input_${Date.now()}_${Math.random().toString(36).substring(2, 11)}.txt`;
            inputFilePath = path.join(tempDir, inputFileName);
            fs.writeFileSync(inputFilePath, input, 'utf-8');
            globalThis.logger.log('Created temporary input file:', inputFilePath);
        }

        // Read source file as buffer
        const sourceCodeBuffer = fs.readFileSync(srcPath);
        const sourceFileName = path.basename(srcPath);

        // Create FormData
        const formData = new FormData();
        formData.append('lang', apiLanguage);
        
        // Create file blob for code - use Buffer directly
        const codeBlob = new Blob([sourceCodeBuffer], { type: 'text/plain' });
        // Create a File-like object for proper multipart upload
        const codeFile = new File([codeBlob], sourceFileName, { type: 'text/plain' });
        formData.append('code', codeFile);

        // Append input file if it exists
        if (inputFilePath && fs.existsSync(inputFilePath)) {
            const inputBuffer = fs.readFileSync(inputFilePath);
            const inputBlob = new Blob([inputBuffer], { type: 'text/plain' });
            const inputFile = new File([inputBlob], path.basename(inputFilePath), { type: 'text/plain' });
            formData.append('input', inputFile);
        }

        // Send compilation start message
        getJudgeViewProvider().extensionToJudgeViewMessage({
            command: 'compiling-start',
        });

        // Send POST request
        const endpoint = `${apiUrl.replace(/\/$/, '')}/compile`;
        globalThis.logger.log('Calling cloud API:', endpoint);

        let response: Response;
        try {
            response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
            });
        } finally {
            // Send compilation stop message
            getJudgeViewProvider().extensionToJudgeViewMessage({
                command: 'compiling-stop',
            });
        }

        const end = Date.now();
        const time = end - begin;

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            globalThis.logger.error('API request failed:', response.status, errorText);
            
            return {
                stdout: '',
                stderr: `API request failed with status ${response.status}: ${errorText}`,
                code: response.status,
                signal: null,
                time,
                timeOut: false,
            };
        }

        const result = await response.json();

        if (result.success) {
            // Successful execution
            return {
                stdout: result.output || '',
                stderr: '',
                code: 0,
                signal: null,
                time,
                timeOut: false,
            };
        } else {
            // Compilation or execution error
            return {
                stdout: result.output || '',
                stderr: result.error || 'Unknown error',
                code: 1,
                signal: null,
                time,
                timeOut: false,
            };
        }
    } catch (error: any) {
        const end = Date.now();
        const time = end - begin;

        globalThis.logger.error('Error calling cloud API:', error);
        
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }

        // Check for common network errors
        if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
            errorMessage = `Cannot connect to cloud compiler API at ${apiUrl}. Please check if the server is running and the URL is correct.`;
        } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
            errorMessage = `Request to cloud compiler API timed out. Please try again.`;
        }

        vscode.window.showErrorMessage(`Cloud compiler error: ${errorMessage}`);

        return {
            stdout: '',
            stderr: errorMessage,
            code: 1,
            signal: null,
            time,
            timeOut: false,
        };
    } finally {
        // Clean up temporary input file
        if (inputFilePath && fs.existsSync(inputFilePath)) {
            try {
                fs.unlinkSync(inputFilePath);
                globalThis.logger.log('Cleaned up temporary input file:', inputFilePath);
            } catch (err) {
                globalThis.logger.error('Failed to delete temporary input file:', err);
            }
        }
    }
};
