import * as vscode from 'vscode';

/**
 * @description This class is responsible for updating the UI of the extension.
 * @class UIUpdater
 */
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
    /**
     * @description This method is responsible for returning the thinking message.
     * @returns string
     */
    static get thinkingMessage() {
        return `${UIUpdater.APP_THINKING_ICON} ${UIUpdater.appName} is thinking...`;
    }

    /**
     * @description This method is responsible for returning the error message.
     * @returns string
     */
    static get errorMessage() {
        return `${UIUpdater.APP_HAS_ERROR_ICON} ${UIUpdater.appName} has an error.`;
    }

    /**
     * @description This method is responsible for returning the OK message.
     * @returns string
     */
    static get okMessage() {
        return `${UIUpdater.APP_IS_OK_ICON} ${UIUpdater.appName} is OK.`;
    }

    /**
     * @description This method is responsible for setting the application name.
     * @param appName The name of the application.
     */
    static setAppName(appName: string) {
        UIUpdater.appName = appName;
    }

    /**
     * @description This method is responsible for returning the instance of the UIUpdater class.
     * @returns UIUpdater
     */
    static getInstance() {
        if (!UIUpdater.instance) {
            UIUpdater.instance = new UIUpdater();
        }
        return UIUpdater.instance;
    }
    /**
     * @description This method is responsible for creating a new instance of the UIUpdater class.
     * @returns UIUpdater
     */
    static create(): UIUpdater {
        return new UIUpdater();
    }

    /// Instance methods
    /**
     * @description This method is responsible for constructing a new instance of the UIUpdater class.
     */
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

    /**
     * @description shows the status bar item
     */
    public show() {
        if (!this.isHidden) {
            return;
        }
        this.pmdPlusStatusBar.text = UIUpdater.okMessage;
        this.pmdPlusStatusBar.show();
        this.isHidden = false;
    }

    /**
     * @description hides the status bar item
     */
    public hide() {
        if (this.isHidden) {
            return;
        }
        this.pmdPlusStatusBar.hide();
        this.isHidden = true;
    }

    /**
     * @description toggles the status bar item
     */
    public toggle() {
        if (this.isHidden) {
            this.show();
        } else {
            this.hide();
        }
    }

    /**
     * @description This method is responsible for updating the status bar with the thinking message.
     */
    public thinking() {
        this.pmdPlusStatusBar.text = UIUpdater.thinkingMessage;
    }

    /**
     * @description This method is responsible for updating the status bar with the error message.
     */
    public errors() {
        this.pmdPlusStatusBar.text = UIUpdater.errorMessage;
    }

    /**
     * @description This method is responsible for updating the status bar with the OK message.
     */
    public ok() {
        this.pmdPlusStatusBar.text = UIUpdater.okMessage;
    }

    /**
     * @description This method is responsible for disposing the status bar item.
     */
    dispose() {
        this.pmdPlusStatusBar.dispose();
    }
}
