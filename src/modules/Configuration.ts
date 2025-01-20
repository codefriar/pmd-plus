import * as vscode from 'vscode';
import * as path from 'path';

export class Configuration {
    #context: vscode.ExtensionContext;
    #configFromVSCodeSettings: vscode.WorkspaceConfiguration;

    workspacePath: string;
    rulesets: string[];
    additionalClassPaths: string[];
    pathToPmdExecutable: string;
    enableCache: boolean;
    cachePath: string;
    jrePath: string;
    errorThreshold: number;
    warnThreshold: number;
    runPmdOnFileOpen: boolean;
    runPmdOnFileSave: boolean;
    runPmdOnFileChange: boolean;
    onFileChangeDebounceTimeout: number;
    commandBufferSize: number;

    /**
     * @description Responsible for constructing a Configuration instance with proper configuration.
     * @param context
     */
    constructor(context: vscode.ExtensionContext) {
        this.#context = context;
        this.#configFromVSCodeSettings = vscode.workspace.getConfiguration('pmdPlus');

        this.workspacePath = this.#getWorkspacePath();
        this.rulesets = this.#resolveRulesetPaths();
        this.additionalClassPaths = this.#resolveAdditionalClassPaths();
        this.pathToPmdExecutable = this.#resolvePathToPmdExecutable();
        this.enableCache = this.#configFromVSCodeSettings.get('enableCache', true);
        this.cachePath = path.join(this.workspacePath, '.pmdcache');
        this.jrePath = this.#resolveJrePath();
        this.errorThreshold = this.#configFromVSCodeSettings.get('priorityErrorThreshold', 2);
        this.warnThreshold = this.#configFromVSCodeSettings.get('priorityWarnThreshold', 4);
        this.runPmdOnFileOpen = this.#configFromVSCodeSettings.get('runOnFileOpen', true);
        this.runPmdOnFileSave = this.#configFromVSCodeSettings.get('runOnFileSave', true);
        this.runPmdOnFileChange = this.#configFromVSCodeSettings.get('runOnFileChange', false);
        this.onFileChangeDebounceTimeout = this.#configFromVSCodeSettings.get('onFileChangeDebounce', 3000);
        this.commandBufferSize = this.#configFromVSCodeSettings.get('commandBufferSize', 64);
    }

    /**
     * @description Resolves the path to the PMD executable.
     * @private
     */
    #resolvePathToPmdExecutable(): string {
        const defaultPath = this.#context.asAbsolutePath(path.join('bin', 'pmd'));
        const configuredPath = this.#configFromVSCodeSettings.get('pathToPmdExecutable', '');
        return configuredPath || defaultPath;
    }

    /**
     * @description Resolves the path to the JRE.
     * @private
     */
    #resolveJrePath(): string {
        const configuredPath = this.#configFromVSCodeSettings.get('jrePath', '');
        return path.isAbsolute(configuredPath) ? configuredPath : path.join(this.workspacePath, configuredPath);
    }

    /**
     * @description Resolves the additional class paths.
     * @private
     */
    #resolveAdditionalClassPaths(): string[] {
        const configuredPaths = this.#configFromVSCodeSettings.get('additionalClassPaths', []);
        return configuredPaths.map(p => path.isAbsolute(p) ? p : path.join(this.workspacePath, p));
    }

    /**
     * @description Resolves the ruleset paths.
     * @private
     */
    #resolveRulesetPaths(): string[] {
        const configuredPaths: string[] = this.#configFromVSCodeSettings.get('rulesets', []);
        const resolvedPaths = configuredPaths.map(filePath => {
            if (filePath.toLowerCase() === 'default') {
                return this.#context.asAbsolutePath(path.join('rulesets', 'apex_ruleset.xml'));
            }
            return path.isAbsolute(filePath) ? filePath : path.join(this.workspacePath, filePath);
        });
        return resolvedPaths.length > 0 ? resolvedPaths : [path.join(this.workspacePath, 'rulesets', 'apex_ruleset.xml')];
    }

    /**
     * @description Returns the workspace path.
     * @private
     */
    #getWorkspacePath(): string {
        const workspace = vscode.workspace;
        return workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
    }
}
