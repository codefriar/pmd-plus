import { Configuration } from "./configuration";
import * as vscode from 'vscode';
import * as ChildProcess from 'node:child_process';
import * as path from 'path';
import * as os from 'node:os';
import { PmdCSVResultParser } from "./pmdCSVResultParser";

const CLASSPATH_DELIMINATOR = process.platform === 'win32' ? ';' : ':';

export class ShellExecution {

    private configuration: Configuration;
    private rulesets: string[] = [];
    private outputChannel: vscode.OutputChannel;
    private pmdCSVResultParser: PmdCSVResultParser;

    constructor(config: Configuration, validRulesets: string[], outputChannel: vscode.OutputChannel) {
        this.configuration = config;
        this.rulesets = validRulesets;
        this.outputChannel = outputChannel;
        this.pmdCSVResultParser = new PmdCSVResultParser(outputChannel, config);
    }

    public async executePMDCommand(targetFile: string, token?: vscode.CancellationToken): Promise<string> {
        /// Build the command line arguments into a single string.
        const cliCommand = this.buildCommandLine(targetFile);

        /// Setup additional classes, if any are configured.
        const classPathArgument = this.buildClassPathArgument(this.configuration.workspacePath, this.configuration.additionalClassPaths);
        let env: NodeJS.ProcessEnv = {};
        env['CLASSPATH'] = classPathArgument;

        /// Setup the JRE, if a custom one is configured.
        if(this.configuration.jrePath){
            if(os.platform() === 'win32'){
                /// Windows is FSCKED and doesn't handle spaces in paths without quotes. 
                /// I'm not sure how they make money.
                env['path'] = `"${path.join(this.configuration.jrePath, 'bin')}${path.delimiter}${process.env.PATH}"`;
            } else {
                /// real operating systems don't need quotes. Suck it Microsoft.
                env["PATH"] = `${path.join(this.configuration.jrePath, 'bin')}${path.delimiter}${process.env.PATH}`;
            }
        }

        this.outputChannel.appendLine(`Diagnostic Info: Node Version: ${process.version}`);
        this.outputChannel.appendLine(`Diagnostic Info: Node Env: ${JSON.stringify(env)}`);
        this.outputChannel.appendLine(`Diagnostic Info: PMD cmd: ${cliCommand}`);

        /// Actually execute PMD.
        const pmdResults = ChildProcess.exec(cliCommand, {
            env: {...process.env, ...env}, maxBuffer: Math.max(this.configuration.commandBufferSize, 1) * 1024 * 1024
        });

        token && token.onCancellationRequested(() => {
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
                if(code !== 0 && code !== 4){
                    this.outputChannel.appendLine(`PMD+ got a failed error code: ${code}`);
                    if(stderr.includes('Cannot load ruleset')){
                        reject('PMD+ failed to execute PMD due to a problem with a Ruleset. Please read the plugin logs for details.');
                    }
                    if(!stdout){
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

    private async parsePMDResults(pmdResultsAsCSV: string): Promise<Map<string, Array<vscode.Diagnostic>>> {
        const parsedResults = await this.pmdCSVResultParser.parse(pmdResultsAsCSV);
        return parsedResults;
    }

    /// Private Helper methods
    private buildCommandLine(targetFile: string): string {
        const {
            enableCache,
            cachePath,
            pathToPmdExecutable
        } = this.configuration;

        const rulesetArgument = this.rulesets.join(',');
        const cacheArgument = enableCache ? `--cache ${cachePath}` : '--no-cache';
        const noProgressArgument = '--no-progress';
        const formatArgument = '--format csv';
        const targetFileArgument = `-d ${targetFile}`;
        const rulesetsArgument = `-R ${rulesetArgument}`;

        return `"${path.join(pathToPmdExecutable, 'bin', 'pmd')}" check${noProgressArgument} ${cacheArgument} ${formatArgument} ${targetFileArgument} ${rulesetsArgument}`;
    }

    private buildClassPathArgument(workspacePath: string, additionalClassPaths: string[]): string {
        return [
            path.join(workspacePath, '*'),
            ...additionalClassPaths,
        ].join(CLASSPATH_DELIMINATOR);
    }

}