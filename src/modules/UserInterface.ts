import * as vscode from 'vscode';

/**
 * @description This class is responsible for updating the UI of the extension.
 * @class UserInterface
 */
export class UserInterface implements vscode.Disposable {
    /// constants
    private static readonly DEFAULT_COMMAND = 'workbench.actions.view.problems';
    private static readonly APP_THINKING_ICON = '$(sync~spin)';
    private static readonly APP_IS_OK_ICON = '$(check)';
    private static readonly APP_HAS_ERROR_ICON = '$(alert)';

    private static instance: UserInterface;
    private static appName: string;
    private pmdPlusStatusBar: vscode.StatusBarItem;
    private isHidden: boolean;

    /// Static methods
    /**
     * @description This method is responsible for returning the thinking message.
     * @returns string
     */
    static get thinkingMessage() {
        return `${UserInterface.APP_THINKING_ICON} ${UserInterface.appName} is thinking...`;
    }

    /**
     * @description This method is responsible for returning the error message.
     * @returns string
     */
    static get errorMessage() {
        return `${UserInterface.APP_HAS_ERROR_ICON} ${UserInterface.appName} found error(s).`;
    }

    /**
     * @description This method is responsible for returning the OK message.
     * @returns string
     */
    static get okMessage() {
        return `${UserInterface.APP_IS_OK_ICON} ${UserInterface.appName} is OK.`;
    }

    /**
     * @description This method is responsible for setting the application name.
     * @param appName The name of the application.
     */
    static setAppName(appName: string) {
        UserInterface.appName = appName;
    }

    /**
     * @description This method is responsible for returning the instance of the UIUpdater class.
     * @returns UserInterface
     */
    static getInstance() {
        if (!UserInterface.instance) {
            UserInterface.instance = new UserInterface();
        }
        return UserInterface.instance;
    }

    /// Instance methods
    /**
     * @description This method is responsible for constructing a new instance of the UIUpdater class.
     */
    public constructor() {
        this.pmdPlusStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 5);
        this.pmdPlusStatusBar.text = UserInterface.okMessage;
        this.pmdPlusStatusBar.command = UserInterface.DEFAULT_COMMAND;
        this.pmdPlusStatusBar.show();

        if (!vscode.window.activeTextEditor) {
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
        this.pmdPlusStatusBar.text = UserInterface.okMessage;
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
     * @description This method is responsible for updating the status bar with the thinking message.
     */
    public thinking() {
        this.pmdPlusStatusBar.text = UserInterface.thinkingMessage;
    }

    /**
     * @description This method is responsible for updating the status bar with the error message.
     */
    public errors() {
        this.pmdPlusStatusBar.text = UserInterface.errorMessage;
    }

    /**
     * @description This method is responsible for updating the status bar with the OK message.
     */
    public ok() {
        this.pmdPlusStatusBar.text = UserInterface.okMessage;
    }

    /**
     * @description This method is responsible for disposing the status bar item.
     */
    dispose() {
        this.pmdPlusStatusBar.dispose();
    }
}
