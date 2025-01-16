import * as vscode from 'vscode';
import * as path from 'path';

/**
 * @description This class is responsible for handling the configuration of the extension.
 * @class Configuration
 */
export class Configuration {
    /// private property for extension context
    private context!: vscode.ExtensionContext;

    /// Handle on user controlled settings from settings.json
    #configFromVSCodeSettings = vscode.workspace.getConfiguration('pmdPlus');

    /// path variable to the root of the users' open workspace
    public workspacePath: string = this.getWorkspacePath();

    /// public properties initialized from vscode settings.
    /// Settings related to Rules, Rulesets and Jar files for additional rules
    public rulesets: string[] = this.#configFromVSCodeSettings.get('rulesets', []);
    public additionalClassPaths: string[] = this.#configFromVSCodeSettings.get('additionalClassPaths', []);

    /// Settings related to the PMD executable
    public pathToPmdExecutable: string = this.#configFromVSCodeSettings.get('pathToPmdExecutable', '');
    public enableCache: boolean = this.#configFromVSCodeSettings.get('enableCache', true);
    public cachePath: string = `${this.workspacePath}/.pmdcache`;
    public jrePath: string = this.#configFromVSCodeSettings.get('jrePath', '');

    /// Thresholds and triggers
    public errorThreshold: number = this.#configFromVSCodeSettings.get('priorityErrorThreshold', 2);
    public warnThreshold: number = this.#configFromVSCodeSettings.get('priorityWarnThreshold', 4);
    public runPmdOnFileOpen: boolean = this.#configFromVSCodeSettings.get('runOnFileOpen', true);
    public runPmdOnFileSave: boolean = this.#configFromVSCodeSettings.get('runOnFileSave', true);
    public runPmdOnFileChange: boolean = this.#configFromVSCodeSettings.get('runOnFileChange', false);
    public onFileChangeDebounceTimeout: number = this.#configFromVSCodeSettings.get('onFileChangeDebounce', 3000);

    /// Shell configuration
    public commandBufferSize: number = this.#configFromVSCodeSettings.get('commandBufferSize', 64);

    /**
     * @description Responsible for constructing a Configuration instance with proper configuration.
     * @param context The extension context.
     */
    constructor(context: vscode.ExtensionContext) {
        if (context) {
            this.context = context;
            this.resolvePMDAndJREPaths();
            this.resolveAdditionalClassPaths();
            this.resolveRulesetPaths();
        } else {
            console.error('PmdPlus configuration missing context.');
        }
    }

    /// Helper Methods
    /**
     * @description This method is responsible for resolving the PMD and JRE paths.
     */
    private resolvePMDAndJREPaths() {
        if (!this.pathToPmdExecutable) {
            this.pathToPmdExecutable = this.context.asAbsolutePath(path.join('bin', 'pmd'));
        }

        if (this.pathToPmdExecutable && !path.isAbsolute(this.pathToPmdExecutable) && this.workspacePath) {
            this.pathToPmdExecutable = path.join(this.workspacePath, this.pathToPmdExecutable);
        }

        if (this.jrePath && !path.isAbsolute(this.jrePath) && this.workspacePath) {
            this.jrePath = path.join(this.workspacePath, this.jrePath);
        }
    }

    /**
     * @description This method is responsible for resolving the additional class paths.
     */
    private resolveAdditionalClassPaths() {
        this.additionalClassPaths = this.additionalClassPaths.map((classPath) => {
            if (!path.isAbsolute(classPath) && this.workspacePath) {
                return path.join(this.workspacePath, classPath);
            }
            return classPath;
        });
    }

    /**
     * @description This method is responsible for resolving the ruleset paths.
     */
    private resolveRulesetPaths() {
        this.rulesets = this.rulesets.map((rulesetPath) => {
            if (rulesetPath.toLocaleLowerCase() === 'default') {
                return this.context.asAbsolutePath(path.join('rulesets', 'apex_ruleset.xml'));
            } else if (!path.isAbsolute(rulesetPath) && this.workspacePath) {
                return path.join(this.workspacePath, rulesetPath);
            }
            return rulesetPath;
        });

        if (this.rulesets.length === 0) {
            this.rulesets.push(path.join(this.workspacePath, 'rulesets', 'apex_ruleset.xml'));
        }
    }

    /**
     * @description This method is responsible for returning the workspace path.
     * @returns string
     */
    private getWorkspacePath() {
        const workspace = vscode.workspace;
        const knownRootPath = workspace && workspace.workspaceFolders && workspace.workspaceFolders.length > 0;
        return knownRootPath ? workspace?.workspaceFolders[0].uri.fsPath : '';
    }
}
