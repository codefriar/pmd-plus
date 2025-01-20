import * as vscode from 'vscode';
import { Configuration } from './Configuration';
import { Utilities } from './Utilities';
import { UserInterface } from './UserInterface';
import { ShellExecution } from './ShellExecution';
import { PmdCSVResultParser } from './PmdCSVResultParser';
import { PmdResults, ProgressReport } from '../types';
import { PmdConfigurationError } from './PmdConfigurationError';

/**
 * @description this is the main extension class, responsible for orchestrating the execution of PMD, and parsing the results.
 * @class PmdPlus
 */
export class PmdPlus {
    // Private properties
    private readonly rulesets: ReadonlyArray<string>;
    private readonly ui = UserInterface.getInstance();
    private readonly csvResultParser: PmdCSVResultParser;
    private readonly shellExecutor: ShellExecution;

    /**
     * @description Responsible for constructing a PmdPlus instance with proper configuration.
     * @param outputChannel
     * @param configuration
     * @param initialRulesets
     * @private
     */
    private constructor(
        private readonly outputChannel: vscode.OutputChannel,
        private readonly configuration: Configuration,
        initialRulesets: string[]
    ) {
        this.rulesets = initialRulesets;
        this.csvResultParser = new PmdCSVResultParser(this.outputChannel, this.configuration);
        this.shellExecutor = new ShellExecution(this.configuration, this.rulesets, this.outputChannel);
    }

    /**
     * @description Responsible for creating a PmdPlus instance with proper configuration.
     * @param outputChannel
     * @param configuration
     */
    public static async create(outputChannel: vscode.OutputChannel, configuration: Configuration): Promise<PmdPlus> {
        const initialRulesets = await PmdPlus.getValidRulesetPaths(configuration.rulesets);
        return new PmdPlus(outputChannel, configuration, initialRulesets);
    }

    /**
     * @description This method is the main entry point for executing PMD, capturing the output and parsing it into a DiagnosticCollection for VSCode.
     * @param targetFile The file to run PMD on.
     * @param collection The collection to update if errors are found.
     * @param progress The progress bar object to update.
     * @param token Cancellation token used to cancel the execution if the user cancels.
     * @returns Promise<void>
     */
    public async runPMD(
        targetFile: string,
        collection: vscode.DiagnosticCollection,
        progress?: vscode.Progress<ProgressReport>,
        token?: vscode.CancellationToken
    ): Promise<void> {
        await this.validateConfiguration();

        // Start the console logging with a note on the file being analyzed
        // and update the UI to show that PMD is running.
        this.logDebugHeader(targetFile);
        this.ui.thinking();

        // Set up the cancellation token
        let cancelled = false;
        token?.onCancellationRequested(() => {
            cancelled = true;
        });

        // Execute PMD and parse the results
        try {
            const pmdResults = await this.shellExecutor.executePMDCommand(targetFile, token);
            const problemsMapByFilename: PmdResults = await this.csvResultParser.parse(pmdResults);

            if (problemsMapByFilename.size > 0) {
                await this.updateUserInterface(problemsMapByFilename, collection, progress, cancelled);
            } else {
                this.clearDiagnosticsForFile(targetFile, collection);
            }
        } catch (error) {
            this.clearDiagnosticsForFile(targetFile, collection);
        }
    }

    // private helper methods

    private logDebugHeader(targetFile: string): void {
        this.outputChannel.appendLine(
            ` ================== Starting PMD+ analysis of ================== \n ================== ${targetFile} ================== `
        );
    }

    private async validateConfiguration(): Promise<void> {
        const [pmdPathIsValid, rulesetsAreValid] = await Promise.all([
            this.pmdPathIsValid(),
            this.hasAtLeastOneValidRuleset(),
        ]);

        if (!pmdPathIsValid || !rulesetsAreValid) {
            throw new PmdConfigurationError('Invalid configuration');
        }
    }

    private clearDiagnosticsForFile(targetFile: string, collection: vscode.DiagnosticCollection): void {
        const fileURI = vscode.Uri.file(targetFile);
        collection.delete(fileURI);
        UserInterface.getInstance().ok();
    }

    private async updateUserInterface(
        problemsMapByFilename: Map<string, vscode.Diagnostic[]>,
        collection: vscode.DiagnosticCollection,
        progress?: vscode.Progress<{
            message?: string;
            increment?: number;
        }>,
        cancelled?: boolean
    ): Promise<void> {
        UserInterface.getInstance().errors();
        progress?.report({ message: `PMD+ is processing ${problemsMapByFilename.size} issues. ` });
        const increment = (1 / problemsMapByFilename.size) * 100;
        for (const [filename, problems] of problemsMapByFilename) {
            if (cancelled) {
                return;
            }

            progress?.report({ increment });

            try {
                const fileURI = vscode.Uri.file(filename);
                collection.set(fileURI, problems);
            } catch (err) {
                this.outputChannel.appendLine(`PMD+ encountered an error while processing the results: ${err}`);
            }
        }
    }

    /**
     * @description Validates the ruleset paths in the configuration object.
     * @param rulesetsToCheck List of strings to check if the file or directory exists.
     * @returns List of valid ruleset paths.
     */
    private static async getValidRulesetPaths(rulesetsToCheck: string[]): Promise<string[]> {
        const validatedRulesetPaths: string[] = [];

        for (const rulesetPath of rulesetsToCheck) {
            if (await Utilities.fileExists(rulesetPath)) {
                validatedRulesetPaths.push(rulesetPath);
            } else {
                vscode.window.showErrorMessage(`PMD+ could not find or access the ruleset file at ${rulesetPath}`);
            }
        }
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
            this.ui.errors();
            vscode.window.showErrorMessage(
                `PMD+ could not find or access the PMD executable at ${this.configuration.pathToPmdExecutable}`
            );
        }
        return false;
    }
}
