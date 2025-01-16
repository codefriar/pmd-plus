import * as vscode from 'vscode';
import { Configuration } from './configuration';
import { Utilities } from './utilities';
import { UIUpdater } from './UIUpdater';
import { ShellExecution } from './shellExecution';
import { PmdCSVResultParser } from './pmdCSVResultParser';

/**
 * @description this is the main extension class, responsible for orchestrating the execution of PMD, and parsing the results.
 * @class PmdPlus
 */
export class PmdPlus {
    /// Private properties
    private configuration: Configuration;
    private rulesets: string[] = [];
    private outputChannel: vscode.OutputChannel;
    private csvResultParser: PmdCSVResultParser;
    private shellExecutor: ShellExecution;

    /**
     * @description Responsible for constructing a PmdPlus instance with proper configuration.
     * @param outputChannelName The channel name to use for log output
     * @param incomingConfig Incoming configuration object
     */
    public constructor(outputChannelName: vscode.OutputChannel, incomingConfig: Configuration) {
        this.configuration = incomingConfig;
        this.outputChannel = outputChannelName;
        this.csvResultParser = new PmdCSVResultParser(outputChannelName, incomingConfig);
        this.rulesets = this.getValidRulesetPaths(this.configuration.rulesets);
        this.shellExecutor = new ShellExecution(this.configuration, this.rulesets, this.outputChannel);
    }

    // /**
    //  *
    //  * @param config
    //  */
    // public updateConfiguration(config: Configuration) {
    //     this.configuration = config;
    //     this.rulesets = this.getValidRulesetPaths(this.configuration.rulesets);
    // }

    /**
     * @description This method is the main entry point for executing PMD, capturing the output and parsing it into a DiagnosticCollection for VSCode.
     * @param targetFile The file to run PMD on.
     * @param collection The collection to update, if errors are found.
     * @param progress The progress bar object to update.
     * @param token Cancellation token used to cancel the execution if the user cancels.
     * @returns Promise<void>
     */
    public async runPMD(
        targetFile: string,
        collection: vscode.DiagnosticCollection,
        progress?: vscode.Progress<{ message?: string; increment?: number }>,
        token?: vscode.CancellationToken
    ): Promise<void> {
        /// Guard against execution of this method when invalid configuration is found.
        if (!(await this.pmdPathIsValid()) || !this.hasAtLeastOneValidRuleset()) {
            return;
        }

        /// Start the console logging with an note on the file being analyzed and update the UI to show that PMD is running.
        this.outputChannel.appendLine(
            ` ================== Starting PMD+ analysis of ${targetFile} ================== `
        );
        UIUpdater.getInstance().thinking();

        /// Setup the cancellation token
        let cancelled = false;
        token &&
            token.onCancellationRequested(() => {
                cancelled = true;
            });

        /// Execute PMD and parse the results
        try {
            const pmdResults = await this.shellExecutor.executePMDCommand(targetFile, token);
            const problemsMapByFilename = await this.csvResultParser.parse(pmdResults);

            if (problemsMapByFilename.size > 0) {
                UIUpdater.getInstance().errors();
                progress && progress.report({ message: `PMD+ is processing ${problemsMapByFilename.size} issues. ` });
                const increment = (1 / problemsMapByFilename.size) * 100;
                for (const [filename, problems] of problemsMapByFilename) {
                    if (cancelled) {
                        return;
                    }

                    progress && progress.report({ increment });

                    try {
                        const fileURI = vscode.Uri.file(filename);
                        const sourceCodeFile = await vscode.workspace.openTextDocument(fileURI);
                        /// it's not clear to me why this can't be done in the original loop.
                        for (const problem of problems) {
                            const line = sourceCodeFile.lineAt(problem.range.start.line);
                            problem.range = new vscode.Range(
                                new vscode.Position(line.range.start.line, line.firstNonWhitespaceCharacterIndex),
                                line.range.end
                            );
                        }
                        collection.set(fileURI, problems);
                    } catch (err) {
                        this.outputChannel.appendLine(`PMD+ encountered an error while processing the results: ${err}`);
                    }
                }
            } else {
                const fileURI = vscode.Uri.file(targetFile);
                collection.delete(fileURI);
                UIUpdater.getInstance().ok();
            }
        } catch (error) {
            const fileURI = vscode.Uri.file(targetFile);
            collection.delete(fileURI);
            UIUpdater.getInstance().ok();
        }
    }

    /**
     * @description Responsible for returning the list of rulesets from the configuration object.
     * @returns the list of rulesets from the configuration object.
     */
    public getRulesets(): string[] {
        return this.rulesets;
    }

    /// private helper methods
    /**
     * @description Validates the ruleset paths in the configuration object.
     * @param rulesetsToCheck List of strings to check if the file or directory exists.
     * @returns List of valid ruleset paths.
     */
    private getValidRulesetPaths(rulesetsToCheck: string[]): string[] {
        const validatedRulesetPaths = rulesetsToCheck.filter(async (rulesetPath) => {
            if (await Utilities.fileExists(rulesetPath)) {
                return true;
            } else {
                vscode.window.showErrorMessage(`PMD+ could not find or access the ruleset file at ${rulesetPath}`);
            }
            return true;
        });
        return validatedRulesetPaths;
    }

    /**
     * @description Validates if the ruleset paths in the configuration object are valid.
     * @returns true if there is at least one valid ruleset path, false otherwise.
     */
    private hasAtLeastOneValidRuleset(): boolean {
        if (this.rulesets.length > 0) {
            return true;
        } else {
            this.outputChannel.appendLine(`PMD+ could not find any valid rulesets in the configuration.`);
            vscode.window.showErrorMessage(`PMD+ could not find any valid rulesets in the configuration.`);
        }
        return false;
    }

    /**
     * @description Validates if the PMD executable path in the configuration object is valid.
     * @returns true if the PMD executable path is valid, false otherwise.
     */
    private async pmdPathIsValid(): Promise<boolean> {
        if (await Utilities.dirExists(this.configuration.pathToPmdExecutable)) {
            return true;
        } else {
            vscode.window.showErrorMessage(
                `PMD+ could not find or access the PMD executable at ${this.configuration.pathToPmdExecutable}`
            );
        }
        return false;
    }
}
