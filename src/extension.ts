// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

/// Custom imports
import { Configuration } from './modules/configuration';
import { PmdPlus } from './modules/pmdplus';
import { UIUpdater } from './modules/UIUpdater';
import { Utilities } from './modules/utilities';
import debounce from 'debounce';

/// Extension wide constants
const extensionName = 'PMD+';
const settingsNamespace = 'pmdPlus';
const supportedLanguages = ['apex', 'visualforce', 'html'];
const isLangSupported = (languageCode: string) => 0 <= supportedLanguages.indexOf(languageCode);
const outputChannel = vscode.window.createOutputChannel(extensionName);
const diagnosticCollection = vscode.languages.createDiagnosticCollection(extensionName);

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    /// Get a handle on the Configuration settings.
    let configuration = new Configuration(context);

    /// instance variables
    const pmdPlus = new PmdPlus(outputChannel, configuration);
    UIUpdater.setAppName(extensionName);
    UIUpdater.getInstance().ok();

    /// Register the clear problems command
    context.subscriptions.push(
        vscode.commands.registerCommand('pmd-plus.clearKnownSCAIssues', async () => {
            diagnosticCollection.clear();
        })
    );

    /// Register the Run on Workspace command
    context.subscriptions.push(
        vscode.commands.registerCommand('pmd-plus.SCAWorkspace', async () => {
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'PMD+ is running static analysis on your workspace.',
                    cancellable: true,
                },
                async (progress, token) => {
                    await pmdPlus.runPMD(Utilities.getWorkspacePath(), diagnosticCollection, progress, token);
                }
            );
        })
    );

    /// Register the Run on File via Menu command
    context.subscriptions.push(
        vscode.commands.registerCommand('pmd-plus.SCAFileViaMenu', async (fileURI: vscode.Uri) => {
            await pmdPlus.runPMD(fileURI.fsPath, diagnosticCollection);
        })
    );

    /// Register the Run on File command
    context.subscriptions.push(
        vscode.commands.registerCommand('pmd-plus.SCAFile', async (fileName: string) => {
            const resolvedFileName = fileName ?? vscode.window.activeTextEditor?.document.fileName;
            await pmdPlus.runPMD(resolvedFileName, diagnosticCollection);
        })
    );

    /// Listeners for file events
    /// File Save Event
    if (configuration.runPmdOnFileSave) {
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            if (isLangSupported(document.languageId)) {
                await pmdPlus.runPMD(document.fileName, diagnosticCollection);
            }
        });
    }

	/// File changed event
	if(configuration.runPmdOnFileChange){
		vscode.workspace.onDidChangeTextDocument(async () => {
			debounce(async (event: vscode.TextDocumentChangeEvent) => {
				if(isLangSupported(event.document.languageId)){
					await pmdPlus.runPMD(event.document.fileName, diagnosticCollection);
				}
			});
		});
	}

	/// File Open Event
	if(configuration.runPmdOnFileOpen){
		vscode.window.onDidChangeActiveTextEditor(async (editor) => {
			if(editor && isLangSupported(editor.document.languageId)){
				await pmdPlus.runPMD(editor.document.fileName, diagnosticCollection);
			}
		});
	}

	/// Configuration change event
	vscode.workspace.onDidChangeConfiguration(async (event: vscode.ConfigurationChangeEvent) => {
		if(event.affectsConfiguration(settingsNamespace)){
			configuration = new Configuration(context);
		}
	});

	/// Visible editor tab change event
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			if (editor) {
				const isSupportedLanguage = (languageId: string) => supportedLanguages.includes(languageId);
				if (isSupportedLanguage(editor.document.languageId)) {
					UIUpdater.getInstance().show();
				} else {
					UIUpdater.getInstance().hide();
				}
			}
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
