import * as vscode from 'vscode';
import { Configuration } from './Configuration';
import { UserInterface } from './UserInterface';
import { ShellExecution } from './ShellExecution';
import { PmdCSVResultParser } from './PmdCSVResultParser';
import { PmdResults, ProgressReport } from '../types';

/**
 * @description this is the main extension class, responsible for orchestrating the execution of PMD, and parsing the results.
 * @class PmdPlus
 */
export class PmdPlus {
    // Private properties
    private readonly ui = UserInterface.getInstance();
    private readonly csvResultParser: PmdCSVResultParser;
    private readonly shellExecutor: ShellExecution;

    /**
     * @description Responsible for constructing a PmdPlus instance with proper configuration.
     * @param outputChannel
     * @param configuration
     * @private
     */
    private constructor(
        private readonly outputChannel: vscode.OutputChannel,
        private readonly configuration: Configuration
    ) {
        this.csvResultParser = new PmdCSVResultParser(this.outputChannel, this.configuration);
        this.shellExecutor = new ShellExecution(this.configuration, this.configuration.rulesets, this.outputChannel);
    }

    public static async create(
        outputChannel: vscode.OutputChannel,
        context: vscode.ExtensionContext,
        configuration?: Configuration
    ): Promise<PmdPlus> {
        const config = configuration ?? (await Configuration.create(context));
        return new PmdPlus(outputChannel, config);
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
}
