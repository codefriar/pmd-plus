import * as vscode from 'vscode';

export class UIUpdater implements vscode.Disposable {
    /// constants
    private static readonly DEFAULT_COMMAND = 'workbench.actions.view.problems';
    private static readonly APP_THINKING_ICON = '$(sync~spin)';
    private static readonly APP_IS_OK_ICON = '$(check)';
    private static readonly APP_HAS_ERROR_ICON = '$(alert)';

    private static instance: UIUpdater;
    private static appName: string;
    private pmdPlusStatusBar: vscode.StatusBarItem;
    private isHidden: boolean;

    /// Static methods
    static get thinkingMessage() {
        return `${UIUpdater.APP_THINKING_ICON} ${UIUpdater.appName} is thinking...`;
    }

    static get errorMessage() {
        return `${UIUpdater.APP_HAS_ERROR_ICON} ${UIUpdater.appName} has an error.`;
    }

    static get okMessage() {
        return `${UIUpdater.APP_IS_OK_ICON} ${UIUpdater.appName} is OK.`;
    }

    static setAppName(appName: string) {
        UIUpdater.appName = appName;
    }

    static getInstance() {
        if (!UIUpdater.instance) {
            UIUpdater.instance = new UIUpdater();
        }
        return UIUpdater.instance;
    }

    static create(): UIUpdater {
        return new UIUpdater();
    }

    /// Instance methods
    public constructor() {
        this.pmdPlusStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 5);
        this.pmdPlusStatusBar.text = UIUpdater.okMessage;
        this.pmdPlusStatusBar.command = UIUpdater.DEFAULT_COMMAND;
        this.pmdPlusStatusBar.show();

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.pmdPlusStatusBar.hide();
            this.isHidden = true;
        } else {
            this.pmdPlusStatusBar.show();
            this.isHidden = false;
        }
    }

    public show() {
        if (!this.isHidden){
            return;
        }
        this.pmdPlusStatusBar.text = UIUpdater.okMessage;
        this.pmdPlusStatusBar.show();
        this.isHidden = false;
    }

    public hide() {
        if (this.isHidden){
            return;
        }
        this.pmdPlusStatusBar.hide();
        this.isHidden = true;
    }

    public toggle() {
        if (this.isHidden) {
            this.show();
        } else {
            this.hide();
        }
    }

    public thinking() {
        this.pmdPlusStatusBar.text = UIUpdater.thinkingMessage;
    }

    public errors() {
        this.pmdPlusStatusBar.text = UIUpdater.errorMessage;
    }

    public ok() {
        this.pmdPlusStatusBar.text = UIUpdater.okMessage;
    }

    dispose(){
        this.pmdPlusStatusBar.dispose();
    }
}