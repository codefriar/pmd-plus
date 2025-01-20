import * as vscode from 'vscode';
import * as path from 'path';
import { Utilities } from './Utilities';
import { PmdConfigurationError } from './PmdConfigurationError';

export class Configuration {
    #context: vscode.ExtensionContext;
    #configFromVSCodeSettings: vscode.WorkspaceConfiguration;

    readonly workspacePath: string;
    readonly rulesets: ReadonlyArray<string>;
    readonly additionalClassPaths: ReadonlyArray<string>;
    readonly pathToPmdExecutable: string;
    readonly enableCache: boolean;
    readonly cachePath: string;
    readonly jrePath: string;
    readonly errorThreshold: number;
    readonly warnThreshold: number;
    readonly runPmdOnFileOpen: boolean;
    readonly runPmdOnFileSave: boolean;
    readonly runPmdOnFileChange: boolean;
    readonly onFileChangeDebounceTimeout: number;
    readonly commandBufferSize: number;

    private constructor(
        context: vscode.ExtensionContext,
        config: vscode.WorkspaceConfiguration,
        validatedRulesets: string[]
    ) {
        this.#context = context;
        this.#configFromVSCodeSettings = config;

        this.workspacePath = this.#getWorkspacePath();
        this.rulesets = Object.freeze(validatedRulesets);
        this.additionalClassPaths = Object.freeze(this.#resolveAdditionalClassPaths());
        this.pathToPmdExecutable = this.#resolvePathToPmdExecutable();
        this.enableCache = config.get('enableCache', true);
        this.cachePath = path.join(this.workspacePath, '.pmdcache');
        this.jrePath = this.#resolveJrePath();
        this.errorThreshold = config.get('priorityErrorThreshold', 2);
        this.warnThreshold = config.get('priorityWarnThreshold', 4);
        this.runPmdOnFileOpen = config.get('runOnFileOpen', true);
        this.runPmdOnFileSave = config.get('runOnFileSave', true);
        this.runPmdOnFileChange = config.get('runOnFileChange', false);
        this.onFileChangeDebounceTimeout = config.get('onFileChangeDebounce', 3000);
        this.commandBufferSize = config.get('commandBufferSize', 64);
    }

    public static async create(context: vscode.ExtensionContext): Promise<Configuration> {
        const config = vscode.workspace.getConfiguration('pmdPlus');
        const instance = new Configuration(context, config, await this.validateRulesets(context, config));

        await instance.validate();
        return instance;
    }

    private static async validateRulesets(
        context: vscode.ExtensionContext,
        config: vscode.WorkspaceConfiguration
    ): Promise<string[]> {
        const configuredPaths: string[] = config.get('rulesets', []);
        const workspacePath = Configuration.getWorkspacePath();

        const resolvedPaths = configuredPaths.map((filePath) => {
            if (filePath.toLowerCase() === 'default') {
                return context.asAbsolutePath(path.join('rulesets', 'apex_ruleset.xml'));
            }
            return path.isAbsolute(filePath) ? filePath : path.join(workspacePath, filePath);
        });

        const defaultPath = [path.join(workspacePath, 'rulesets', 'apex_ruleset.xml')];
        const pathsToCheck = resolvedPaths.length > 0 ? resolvedPaths : defaultPath;

        const validPaths = [];
        for (const path of pathsToCheck) {
            if (await Utilities.fileExists(path)) {
                validPaths.push(path);
            } else {
                vscode.window.showErrorMessage(`PMD+ could not find ruleset: ${path}`);
            }
        }

        if (validPaths.length === 0) {
            throw new PmdConfigurationError('No valid rulesets found');
        }

        return validPaths;
    }

    private static getWorkspacePath(): string {
        const workspace = vscode.workspace;
        return workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
    }

    private async validate(): Promise<void> {
        if (!(await Utilities.dirExists(this.pathToPmdExecutable))) {
            throw new PmdConfigurationError(`PMD executable not found: ${this.pathToPmdExecutable}`);
        }
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
        return configuredPaths.map((p) => (path.isAbsolute(p) ? p : path.join(this.workspacePath, p)));
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
