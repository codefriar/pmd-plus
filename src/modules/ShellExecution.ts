import { Configuration } from './Configuration';
import * as vscode from 'vscode';
import * as ChildProcess from 'node:child_process';
import * as path from 'path';
import * as os from 'node:os';

const CLASSPATH_DELIMINATOR = process.platform === 'win32' ? ';' : ':';

/**
 * @description This class is responsible for executing PMD via the command line.
 * @class ShellExecution
 */
export class ShellExecution {
    private readonly configuration: Configuration;
    private rulesets: string[] = [];
    private outputChannel: vscode.OutputChannel;

    /**
     * @description Responsible for constructing a ShellExecution instance with proper configuration.
     * @param config Incoming configuration object
     * @param validRulesets List of valid ruleset paths
     * @param outputChannel The channel name to use for log output
     */
    constructor(config: Configuration, validRulesets: string[], outputChannel: vscode.OutputChannel) {
        this.configuration = config;
        this.rulesets = validRulesets;
        this.outputChannel = outputChannel;
    }

    /**
     * @description This method is the main entry point for executing PMD via the command line.
     * @param targetFile The file to run PMD on.
     * @param token Cancellation token used to cancel the execution if the user cancels.
     * @returns Promise<string>
     */
    public async executePMDCommand(targetFile: string, token?: vscode.CancellationToken): Promise<string> {
        /// Build the command line arguments into a single string.
        const cliCommand = this.buildCommandLine(targetFile);

        /// Setup additional classes, if they are configured.
        const classPathArgument = this.buildClassPathArgument(
            this.configuration.workspacePath,
            this.configuration.additionalClassPaths
        );
        let env: NodeJS.ProcessEnv = {};
        env['CLASSPATH'] = classPathArgument;

        /// Set up the JRE, if a custom one is configured.
        if (this.configuration.jrePath) {
            if (os.platform() === 'win32') {
                /// Windows is FSCKED and doesn't handle spaces in paths without quotes.
                /// I'm not sure how they make money.
                env['path'] = `"${path.join(this.configuration.jrePath, 'bin')}${path.delimiter}${process.env.PATH}"`;
            } else {
                /// real operating systems don't need quotes. Suck it Microsoft.
                env['PATH'] = `${path.join(this.configuration.jrePath, 'bin')}${path.delimiter}${process.env.PATH}`;
            }
        }

        this.outputChannel.appendLine(`Diagnostic Info: Node Version: ${process.version}`);
        this.outputChannel.appendLine(`Diagnostic Info: Node Env: ${JSON.stringify(env)}`);
        this.outputChannel.appendLine(`Diagnostic Info: PMD cmd: ${cliCommand}`);

        /// Actually execute PMD.
        const pmdResults = ChildProcess.exec(cliCommand, {
            env: { ...process.env, ...env },
            maxBuffer: Math.max(this.configuration.commandBufferSize, 1) * 1024 * 1024,
        });

        token &&
            token.onCancellationRequested(() => {
                pmdResults.kill();
            });

        let stdout = '';
        let stderr = '';
        /// Return the promise
        return new Promise<string>((resolve, reject) => {
            /// Reject promise on error
            pmdResults.addListener('error', (err) => {
                this.outputChannel.appendLine(`PMD+ encountered an error: ${err}`);
                reject(err);
            });

            /// Handle exit codes
            pmdResults.addListener('exit', (code) => {
                if (code !== 0 && code !== 4) {
                    this.outputChannel.appendLine(`PMD+ got a failed error code: ${code}`);
                    if (stderr.includes('Cannot load ruleset')) {
                        reject(
                            'PMD+ failed to execute PMD due to a problem with a Ruleset. Please read the plugin logs for details.'
                        );
                    }
                    if (!stdout) {
                        reject('PMD+ failed to execute PMD. Please read the plugin logs for details.');
                    }
                }
                resolve(stdout);
            });

            /// Handle stdout output
            pmdResults?.stdout?.on('data', (data: string) => {
                this.outputChannel.appendLine('stdout: ' + data);
                stdout += data;
            });

            /// Handle standard error output
            pmdResults?.stderr?.on('data', (data: string) => {
                this.outputChannel.appendLine('stderr: ' + data);
                stderr += data;
            });
        });
    }

    /// Private Helper Methods
    /**
     * @description This method is responsible for building the command line arguments into a single string.
     * @param targetFile The file to run PMD on.
     * @returns string
     */
    private buildCommandLine(targetFile: string): string {
        const { enableCache, cachePath, pathToPmdExecutable } = this.configuration;

        const rulesetArgument = this.rulesets.map((ruleset) => this.escapePath(ruleset)).join(',');
        const cacheArgument = enableCache ? `--cache ${this.escapePath(cachePath)}` : '--no-cache';
        const noProgressArgument = '--no-progress';
        const formatArgument = '--format csv';
        const targetFileArgument = `-d ${this.escapePath(targetFile)}`;
        const rulesetsArgument = `-R ${rulesetArgument}`;

        return `"${path.join(pathToPmdExecutable, 'bin', 'pmd')}" check ${noProgressArgument} ${cacheArgument} ${formatArgument} ${targetFileArgument} ${rulesetsArgument}`;
    }

    /**
     * @description This method is responsible for escaping a path for use in a command line.
     * @param path The path to escape.
     * @returns string
     */
    private escapePath(path: string): string {
        return `"${path}"`;
    }

    /**
     * @description This method is responsible for building the classpath argument for the command line.
     * @param workspacePath The workspace path.
     * @param additionalClassPaths The additional class paths.
     * @returns string
     */
    private buildClassPathArgument(workspacePath: string, additionalClassPaths: string[]): string {
        return [path.join(workspacePath, '*'), ...additionalClassPaths].join(CLASSPATH_DELIMINATOR);
    }
}
