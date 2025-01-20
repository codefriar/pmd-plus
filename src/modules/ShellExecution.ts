import { Configuration } from './Configuration';
import * as vscode from 'vscode';
import * as ChildProcess from 'node:child_process';
import * as path from 'path';
import * as os from 'node:os';

const CLASSPATH_DELIMITER = os.platform() === 'win32' ? ';' : ':';

/**
 * @description This class is responsible for executing PMD via the command line.
 * @class ShellExecution
 */
export class ShellExecution {
    /**
     * @description Responsible for constructing a ShellExecution instance with proper configuration.
     * @param configuration
     * @param rulesets
     * @param outputChannel The channel name to use for log output
     */
    constructor(
        private readonly configuration: Configuration,
        private readonly rulesets: string[],
        private readonly outputChannel: vscode.OutputChannel
    ) {}

    /**
     * @description This method is the main entry point for executing PMD via the command line.
     * @param targetFile The file to run PMD on.
     * @param token Cancellation token used to cancel the execution if the user cancels.
     * @returns Promise<string>
     */
    public async executePMDCommand(targetFile: string, token?: vscode.CancellationToken): Promise<string> {
        // Build the command line arguments into a single string.
        const cliCommand = this.buildCommandLine(targetFile);

        // Setup additional classes, if they are configured.
        const classPathArgument = this.buildClassPathArgument();
        // Setup the environment variables.
        const env = this.buildEnvironment(classPathArgument);

        // Output diagnostics to the output channel. @todo: Wrap this in a configuration setting
        this.outputDiagnosticsToOutputChannel(cliCommand, env);

        token?.onCancellationRequested(() => pmdResults.kill());

        // Spin up the JVM in a child process to execute PMD.
        const pmdResults = ChildProcess.exec(cliCommand, {
            env: { ...process.env, ...env },
            maxBuffer: Math.max(this.configuration.commandBufferSize, 1) * 1024 * 1024,
        });

        // Return the promise
        return new Promise<string>((resolve, reject) => {
            let stdout = '';
            let stderr = '';

            // Reject promise on error
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
     * @description This method is responsible for outputting diagnostics to the output channel.
     * @param cliCommand The command line to execute.
     * @param env The environment variables to use.
     * @private
     */
    private outputDiagnosticsToOutputChannel(cliCommand: string, env: NodeJS.ProcessEnv): void {
        this.outputChannel.appendLine(`Diagnostic Info: Node Version: ${process.version}`);
        this.outputChannel.appendLine(`Diagnostic Info: Node Env: ${JSON.stringify(env)}`);
        this.outputChannel.appendLine(`Diagnostic Info: PMD cmd: ${cliCommand}`);
    }

    /**
     * @description This method is responsible for building the command line arguments into a single string.
     * There are more performant ways of generating this string, but I prefert this method, as it's very clear what's happening.
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
     * @description This method is responsible for building the environment variables to use.
     * @param classPathArgument The classpath argument to use.
     * @private
     */
    private buildEnvironment(classPathArgument: string): NodeJS.ProcessEnv {
        const env: NodeJS.ProcessEnv = { CLASSPATH: classPathArgument };

        if (this.configuration.jrePath) {
            const jreBinPath = path.join(this.configuration.jrePath, 'bin');
            env.PATH = os.platform() === 'win32'
                ? `"${jreBinPath}${path.delimiter}${process.env.PATH}"`
                : `${jreBinPath}${path.delimiter}${process.env.PATH}`;
        }

        return env;
    }

    /**
     * @description This method is responsible for building the classpath argument for the command line.
     * @returns string
     */
    private buildClassPathArgument(): string {
        const { workspacePath, additionalClassPaths } = this.configuration;
        return [path.join(workspacePath, '*'), ...additionalClassPaths].join(CLASSPATH_DELIMITER);
    }
}
