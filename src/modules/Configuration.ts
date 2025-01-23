import * as vscode from 'vscode';
import * as path from 'path';
import { Utilities } from './Utilities';
import { PmdConfigurationError } from './PmdConfigurationError';
import { ShadeConfig } from './ShadeConfig';

export class Configuration {
    private context: vscode.ExtensionContext;
    private configFromVSCodeSettings: vscode.WorkspaceConfiguration;

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
    readonly shadeConfig: ShadeConfig;
    public extensionInstallationPath = () => this.context.asAbsolutePath('.');

    private constructor(
        context: vscode.ExtensionContext,
        config: vscode.WorkspaceConfiguration,
        validatedRulesets: string[]
    ) {
        this.context = context;
        this.configFromVSCodeSettings = config;

        this.workspacePath = this.getWorkspacePath();
        this.rulesets = Object.freeze(validatedRulesets);
        this.additionalClassPaths = Object.freeze(this.resolveAdditionalClassPaths());
        this.pathToPmdExecutable = this.resolvePathToPmdExecutable();
        this.enableCache = config.get('enableCache', true);
        this.cachePath = path.join(this.workspacePath, '.pmdcache');
        this.jrePath = this.resolveJrePath();
        this.errorThreshold = config.get('priorityErrorThreshold', 2);
        this.warnThreshold = config.get('priorityWarnThreshold', 4);
        this.runPmdOnFileOpen = config.get('runOnFileOpen', true);
        this.runPmdOnFileSave = config.get('runOnFileSave', true);
        this.runPmdOnFileChange = config.get('runOnFileChange', false);
        this.onFileChangeDebounceTimeout = config.get('onFileChangeDebounce', 3000);
        this.commandBufferSize = config.get('commandBufferSize', 64);
        this.shadeConfig = config.get('shade') ?? { enabled: false, shadeFiles: {} };
    }

    public static async create(context: vscode.ExtensionContext): Promise<Configuration> {
        const config = vscode.workspace.getConfiguration('pmdPlus');
        const instance = new Configuration(context, config, await this.validateRulesets(context, config));

        await instance.validatePmdExecutablePath();
        return instance;
    }

    private static async validateRulesets(
        context: vscode.ExtensionContext,
        config: vscode.WorkspaceConfiguration
    ): Promise<string[]> {
        const defaultRuleset = context.asAbsolutePath(path.join('resources', 'ruleset.xml'));
        const workspacePath = Configuration.getWorkspacePath();

        // Get configured paths, if any. Otherwise, initialize to an empty array
        const configuredPaths = config.get<string[]>('rulesets') ?? [];

        // Translate all paths into absolute paths.
        const resolvedPaths = configuredPaths.map((filePath) => {
            if (filePath.toLowerCase() === 'default') {
                return context.asAbsolutePath(path.join('rulesets', 'apex_ruleset.xml'));
            }
            return path.isAbsolute(filePath) ? filePath : path.join(workspacePath, filePath);
        });

        // Always include default ruleset if no other paths are configured
        const pathsToCheck = resolvedPaths.length > 0 ? resolvedPaths : [defaultRuleset];

        // Validate paths by checking that the file exists. If the file doesn't exist, drop it from the rulesets
        const validPaths = await Promise.all(
            pathsToCheck.map(async (path) => {
                const exists = await Utilities.fileExists(path);
                if (!exists) {
                    vscode.window.showErrorMessage(`PMD+ Could not find ruleset at: ${path}`);
                    return null;
                }
                return path;
            })
        );

        const filteredPaths = validPaths.filter((path): path is string => path !== null);

        if (filteredPaths.length === 0) {
            throw new PmdConfigurationError('No valid rulesets found');
        }

        return filteredPaths;
    }

    private static getWorkspacePath(): string {
        const workspace = vscode.workspace;
        return workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
    }

    private async validatePmdExecutablePath(): Promise<void> {
        if (!(await Utilities.dirExists(this.pathToPmdExecutable))) {
            throw new PmdConfigurationError(`PMD executable not found: ${this.pathToPmdExecutable}`);
        }
    }

    /**
     * @description Resolves the path to the PMD executable.
     * @private
     */
    private resolvePathToPmdExecutable(): string {
        const defaultPath = this.context.asAbsolutePath(path.join('bin', 'pmd'));
        const configuredPath = this.configFromVSCodeSettings.get('pathToPmdExecutable', '');
        return configuredPath || defaultPath;
    }

    /**
     * @description Resolves the path to the JRE.
     * @private
     */
    private resolveJrePath(): string {
        const configuredPath: string = this.configFromVSCodeSettings.get('jrePath', '');
        return path.isAbsolute(configuredPath) ? configuredPath : path.join(this.workspacePath, configuredPath);
    }

    /**
     * @description Resolves the additional class paths.
     * @private
     */
    private resolveAdditionalClassPaths(): string[] {
        const configuredPaths = this.configFromVSCodeSettings.get('additionalClassPaths', []);
        return configuredPaths?.map((p) => (path.isAbsolute(p) ? p : path.join(this.workspacePath, p)));
    }

    /**
     * @description Returns the workspace path.
     * @private
     */
    private getWorkspacePath(): string {
        const workspace = vscode.workspace;
        return workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
    }
}
