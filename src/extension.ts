// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


/// Custom imports
import { Configuration } from './modules/configuration';
import { PmdPlus } from './modules/pmdplus';

/// Extension wide constants
const extensionName = 'PMD+';
const settingsNamespace = 'pmdPlus';
const diagnosticCollectionName = 'pmdPlus';
const outputChannelName = 'PMD+ Output';
const supportedLanguages = ['apex', 'visualforce', 'html'];
const isLangSupported = (languageCode: string) => 0 <= supportedLanguages.indexOf(languageCode);
const outputChannel = vscode.window.createOutputChannel(extensionName);


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	/// Get a handle on the Configuration settings.
	const config = new Configuration(context);

	/// instance variables
	const pmdPlus = new PmdPlus(outputChannel, config);

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "pmdplus" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('pmdplus.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from PMD Plus!');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
