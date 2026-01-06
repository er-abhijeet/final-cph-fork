import { Language, Run } from './types';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { platform } from 'os';
import config from './config';
import { getTimeOutPref } from './preferences';
import * as vscode from 'vscode';
import path from 'path';
import { onlineJudgeEnv } from './compiler';
import telmetry from './telmetry';
import { shouldUseCloudApi, compileAndRunViaApi, mapLanguageToApi } from './apiClient';
import { getCloudCompilerApiUrlPref } from './preferences';

const runningBinaries: ChildProcessWithoutNullStreams[] = [];

/**
 * Run a single testcase, and return the raw results, without judging.
 *
 * @param binPath path to the executable binary
 * @param input string to be piped into the stdin of the spawned process
 */
export const runTestCase = async (
    language: Language,
    binPath: string,
    input: string,
): Promise<Run> => {
    globalThis.logger.log('Running testcase', language, binPath, input);
    
    // Check if cloud API is configured
    const apiUrl = getCloudCompilerApiUrlPref();
    const apiLanguage = mapLanguageToApi(language.name);
    
    // If API is configured but language is not supported, show message and fall back to local
    if (apiUrl && apiUrl.trim() !== '' && !apiLanguage) {
        const languageDisplayName = language.name.toUpperCase();
        const warningMessage = `This language (${languageDisplayName}) is not yet supported by the cloud compiler. The developers are working on adding support for it. Falling back to local compilation.`;
        vscode.window.showWarningMessage(warningMessage);
        globalThis.logger.log(warningMessage);
    }
    
    // If cloud API is enabled and language is supported, use API instead of local execution
    if (shouldUseCloudApi(language)) {
        globalThis.logger.log('Using cloud API for compilation and execution');
        // Extract source path from binPath - for interpreted languages, binPath is the source path itself
        // For compiled languages, binPath is the binary location, so we need to find the source
        let srcPath: string;
        const fs = require('fs');
        
        if (language.skipCompile) {
            // For interpreted languages (python, js, ruby), binPath IS the source path
            srcPath = binPath;
        } else {
            // For compiled languages, reverse-engineer source path from binPath
            const binExt = path.extname(binPath);
            if (binExt === '.bin' || binExt === '_bin') {
                // Remove .bin extension and try common source extensions
                const basePath = binPath.replace(/\.(bin|_bin)$/, '');
                const possibleExtensions: { [key: string]: string[] } = {
                    cpp: ['.cpp', '.cc', '.cxx'],
                    c: ['.c'],
                    rust: ['.rs'],
                    go: ['.go'],
                    java: ['.java'],
                    csharp: ['.cs'],
                    hs: ['.hs'],
                    cangjie: ['.cj'],
                };
                const extensions = possibleExtensions[language.name] || [];
                
                srcPath = basePath;
                for (const ext of extensions) {
                    const candidate = basePath + ext;
                    if (fs.existsSync(candidate)) {
                        srcPath = candidate;
                        break;
                    }
                }
            } else if (binExt === '.class') {
                // For Java .class files, find corresponding .java file
                const dir = path.dirname(binPath);
                const className = path.basename(binPath, '.class');
                srcPath = path.join(dir, className + '.java');
            } else {
                srcPath = binPath; // Fallback
            }
        }
        
        // Final fallback: use active editor's file if srcPath doesn't exist
        if (!fs.existsSync(srcPath)) {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document && !editor.document.isUntitled) {
                srcPath = editor.document.fileName;
                globalThis.logger.log('Using active editor file as source path:', srcPath);
            } else {
                globalThis.logger.error('Could not determine source path for cloud API');
                return {
                    stdout: '',
                    stderr: 'Could not determine source file path for cloud compilation',
                    code: 1,
                    signal: null,
                    time: 0,
                    timeOut: false,
                };
            }
        }
        
        globalThis.logger.log('Calling cloud API with source path:', srcPath);
        return await compileAndRunViaApi(srcPath, input, language);
    }
    
    const result: Run = {
        stdout: '',
        stderr: '',
        code: null,
        signal: null,
        time: 0,
        timeOut: false,
    };
    const spawnOpts = {
        timeout: config.timeout,
        env: {
            ...global.process.env,
            DEBUG: 'true',
            CPH: 'true',
        },
    };

    let process: ChildProcessWithoutNullStreams;

    const killer = setTimeout(() => {
        result.timeOut = true;
        process.kill();
    }, getTimeOutPref());

    // HACK - On Windows, `python3` will be changed to `python`!
    if (platform() === 'win32' && language.compiler === 'python3') {
        language.compiler = 'python';
    }

    // Start the binary or the interpreter.
    switch (language.name) {
        case 'python': {
            process = spawn(
                language.compiler, // 'python3' or 'python' TBD
                [binPath, ...language.args],
                spawnOpts,
            );
            break;
        }
        case 'ruby': {
            process = spawn(
                language.compiler,
                [binPath, ...language.args],
                spawnOpts,
            );
            break;
        }
        case 'js': {
            process = spawn(
                language.compiler,
                [binPath, ...language.args],
                spawnOpts,
            );
            break;
        }
        case 'java': {
            const args: string[] = [];
            if (onlineJudgeEnv) {
                args.push('-DONLINE_JUDGE');
            }

            const binDir = path.dirname(binPath);
            args.push('-cp');
            args.push(binDir);

            const binFileName = path.parse(binPath).name.slice(0, -1);
            args.push(binFileName);

            process = spawn('java', args);
            break;
        }
        case 'csharp': {
            let binFileName: string;

            if (language.compiler.includes('dotnet')) {
                const projName = '.cphcsrun';
                const isLinux = platform() == 'linux';
                if (isLinux) {
                    binFileName = projName;
                } else {
                    binFileName = projName + '.exe';
                }

                const binFilePath = path.join(binPath, binFileName);
                process = spawn(binFilePath, ['/stack:67108864'], spawnOpts);
            } else {
                // Run with mono
                process = spawn('mono', [binPath], spawnOpts);
            }

            break;
        }
        default: {
            process = spawn(binPath, spawnOpts);
        }
    }

    process.on('error', (err) => {
        globalThis.logger.error(err);
        vscode.window.showErrorMessage(
            `Could not launch testcase process. Is '${language.compiler}' in your PATH?`,
        );
    });

    const begin = Date.now();
    const ret: Promise<Run> = new Promise((resolve) => {
        runningBinaries.push(process);
        process.on('exit', (code, signal) => {
            const end = Date.now();
            clearTimeout(killer);
            result.code = code;
            result.signal = signal;
            result.time = end - begin;
            runningBinaries.pop();
            globalThis.logger.log('Run Result:', result);
            resolve(result);
        });

        process.stdout.on('data', (data) => {
            result.stdout += data;
        });
        process.stderr.on('data', (data) => (result.stderr += data));

        globalThis.logger.log('Wrote to STDIN');
        try {
            process.stdin.write(input);
        } catch (err) {
            globalThis.logger.error('WRITEERROR', err);
        }

        process.stdin.end();
        process.on('error', (err) => {
            const end = Date.now();
            clearTimeout(killer);
            result.code = 1;
            result.signal = err.name;
            result.time = end - begin;
            runningBinaries.pop();
            globalThis.logger.log('Run Error Result:', result);
            resolve(result);
        });
    });

    return ret;
};

/** Remove the generated binary from the file system, if present */
export const deleteBinary = (language: Language, binPath: string) => {
    if (language.skipCompile) {
        globalThis.logger.log(
            "Skipping deletion of binary as it's not a compiled language.",
        );
        return;
    }
    globalThis.logger.log('Deleting binary', binPath);
    try {
        const isLinux = platform() == 'linux';
        const isFile = path.extname(binPath);

        if (isLinux) {
            if (isFile) {
                spawn('rm', [binPath]);
            } else {
                spawn('rm', ['-r', binPath]);
            }
        } else {
            const nrmBinPath = '"' + binPath + '"';
            if (isFile) {
                spawn('cmd.exe', ['/c', 'del', nrmBinPath], {
                    windowsVerbatimArguments: true,
                });
            } else {
                spawn('cmd.exe', ['/c', 'rd', '/s', '/q', nrmBinPath], {
                    windowsVerbatimArguments: true,
                });
            }
        }
    } catch (err) {
        globalThis.logger.error('Error while deleting binary', err);
    }
};

/** Kill all running binaries. Usually, only one should be running at a time. */
export const killRunning = () => {
    globalThis.reporter.sendTelemetryEvent(telmetry.KILL_RUNNING);
    globalThis.logger.log('Killling binaries');
    runningBinaries.forEach((process) => process.kill());
};
