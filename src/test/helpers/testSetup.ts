import * as vscode from 'vscode';
import * as path from 'path';

export interface TestExtensionSetup {
    extension: vscode.Extension<any>;
    outputChannel: vscode.OutputChannel;
    diagnosticCollection: vscode.DiagnosticCollection;
    extensionContext: vscode.ExtensionContext;
}

interface TestExtensionConfig {
    extensionPath?: string;
}

export async function setupTestExtension(config?: TestExtensionConfig): Promise<TestExtensionSetup> {
    const extensionPath = config?.extensionPath || '/mock/extension';

    const extensionContext = {
        extensionPath: extensionPath,
        asAbsolutePath: (p: string) => path.join(extensionPath, p),
        subscriptions: [],
        workspaceState: {
            get: () => undefined,
            update: () => Promise.resolve(),
            keys: () => [],
        },
        globalState: {
            get: () => undefined,
            update: () => Promise.resolve(),
            setKeysForSync: () => {},
            keys: () => [],
        },
        extensionUri: vscode.Uri.file('/mock/extension'),
        environmentVariableCollection: new Map(),
        storageUri: vscode.Uri.file('/mock/storage'),
        globalStorageUri: vscode.Uri.file('/mock/global-storage'),
        logUri: vscode.Uri.file('/mock/log'),
        extensionMode: vscode.ExtensionMode.Test,
        storagePath: '/mock/storage',
        globalStoragePath: '/mock/global-storage',
        logPath: '/mock/log',
        secrets: {
            get: (_key: string) => Promise.resolve(''),
            store: (_key: string, _value: string) => Promise.resolve(),
            delete: (_key: string) => Promise.resolve(),
        },
        // Add missing properties
        extension: vscode.extensions.getExtension('Codefriar.pmd-plus'),
        languageModelAccessInformation: {
            authenticated: false,
            required: false,
        },
    } as unknown as vscode.ExtensionContext; // Use double type assertion to avoid type mismatch

    // Mock extension
    const extension = {
        id: 'Codefriar.pmd-plus',
        extensionPath: extensionPath,
        isActive: true,
        packageJSON: {},
        extensionUri: vscode.Uri.file('/mock/extension'),
        extensionKind: vscode.ExtensionKind.Workspace,
        exports: undefined,
        activate: () => Promise.resolve(),
    } as vscode.Extension<any>;

    // Mock output channel
    const outputChannel = {
        name: 'PMD+',
        append: () => {},
        appendLine: () => {},
        clear: () => {},
        show: () => {},
        hide: () => {},
        dispose: () => {},
        replace: () => {}, // Add missing method
    } as unknown as vscode.OutputChannel;

    // Mock diagnostic collection
    const diagnosticCollection = {
        name: 'pmd+',
        set: () => {},
        delete: () => {},
        clear: () => {},
        forEach: () => {},
        get: () => [],
        has: () => false,
        dispose: () => {},
        [Symbol.iterator]: function* () {
            yield* [];
        }, // Add iterator implementation
    } as unknown as vscode.DiagnosticCollection;
    return {
        extension,
        extensionContext,
        outputChannel,
        diagnosticCollection,
    };
}

export function cleanupTestExtension(setup: TestExtensionSetup): void {
    setup.outputChannel.dispose();
    setup.diagnosticCollection.dispose();
}
