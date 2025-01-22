// src/test/suite/Configuration.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { Configuration } from '../../modules/Configuration';
import { PmdConfigurationError } from '../../modules/PmdConfigurationError';
import { Utilities } from '../../modules/Utilities';
import { cleanupTestExtension, setupTestExtension, TestExtensionSetup } from '../helpers/testSetup';

suite('Configuration', () => {
    let mockContext: vscode.ExtensionContext;
    let testSetup: TestExtensionSetup;

    setup(async () => {
        testSetup = await setupTestExtension({
            extensionPath: path.join(__dirname, '../../../'),
        });
    });

    teardown(() => {
        cleanupTestExtension(testSetup);
    });

    suite('create', () => {
        test('should create instance with default values', async () => {
            const config = await Configuration.create(testSetup.extensionContext);

            assert.strictEqual(config.enableCache, true);
            assert.strictEqual(config.errorThreshold, 2);
            assert.strictEqual(config.warnThreshold, 4);
            assert.strictEqual(config.runPmdOnFileOpen, true);
            assert.strictEqual(config.runPmdOnFileSave, true);
            assert.strictEqual(config.runPmdOnFileChange, false);
            assert.strictEqual(config.onFileChangeDebounceTimeout, 3000);
            assert.strictEqual(config.commandBufferSize, '64');
        });

        test('should use custom configuration values', async () => {
            const customConfig = {
                get: (key: string) => {
                    const values: { [key: string]: any } = {
                        enableCache: false,
                        priorityErrorThreshold: 1,
                        priorityWarnThreshold: 3,
                        runOnFileOpen: false,
                        runOnFileSave: false,
                        runOnFileChange: true,
                        onFileChangeDebounce: 5000,
                        commandBufferSize: 128,
                        jrePath: '/mock/jre',
                    };
                    return values[key];
                },
            } as vscode.WorkspaceConfiguration;

            (vscode.workspace.getConfiguration as any) = () => customConfig;

            const config = await Configuration.create(testSetup.extensionContext);

            assert.strictEqual(config.enableCache, false);
            assert.strictEqual(config.errorThreshold, 1);
            assert.strictEqual(config.warnThreshold, 3);
            assert.strictEqual(config.runPmdOnFileOpen, false);
            assert.strictEqual(config.runPmdOnFileSave, false);
            assert.strictEqual(config.runPmdOnFileChange, true);
            assert.strictEqual(config.onFileChangeDebounceTimeout, 5000);
            assert.strictEqual(config.commandBufferSize, 128);
            assert.strictEqual(config.jrePath, '/mock/jre');
        });
    });

    suite('path resolution', () => {
        test('should resolve PMD executable path to default path', async () => {
            const config = await Configuration.create(testSetup.extensionContext);
            assert.strictEqual(
                config.pathToPmdExecutable,
                testSetup.extensionContext.asAbsolutePath(path.join('bin', 'pmd'))
            );
        });

        // Note, in order to make this test pass regardless of who's running it
        // the custom path is actually the default path...
        test('should use custom PMD executable path when provided', async () => {
            const customConfig = {
                get: (key: string) => {
                    const values: { [key: string]: any } = {
                        pathToPmdExecutable: 'bin/pmd',
                        jrePath: '/mock/jre',
                    };
                    return values[key];
                },
            } as vscode.WorkspaceConfiguration;
            (vscode.workspace.getConfiguration as any) = () => customConfig;
            const config = await Configuration.create(testSetup.extensionContext);

            assert.strictEqual(config.pathToPmdExecutable, 'bin/pmd', 'Custom PMD executable path not being used');
        });
    });

    suite('rulesets', () => {
        test('should use default ruleset when none configured', async () => {
            const config = await Configuration.create(testSetup.extensionContext);
            assert.deepStrictEqual(config.rulesets, [
                testSetup.extensionContext.asAbsolutePath(path.join('resources', 'ruleset.xml')),
            ]);
        });

        test('should throw when no valid rulesets found', async () => {
            (Utilities.fileExists as any) = async () => false;

            await assert.rejects(
                () => Configuration.create(testSetup.extensionContext),
                (error: Error) => {
                    assert.ok(error instanceof PmdConfigurationError);
                    assert.strictEqual(error.message, 'No valid rulesets found');
                    return true;
                }
            );
        });
    });

    suite('validation', () => {
        test('should throw when PMD executable not found', async () => {
            // Mock both file and directory checks
            const originalDirExists = Utilities.dirExists;
            const originalFileExists = Utilities.fileExists;

            // Make fileExists always return true so ruleset validation passes
            (Utilities.fileExists as any) = async () => true;

            // Mock dirExists to fail only for PMD executable
            (Utilities.dirExists as any) = async (pathToCheck: string) => {
                if (pathToCheck.includes(path.join('bin', 'pmd'))) {
                    return false;
                }
                return originalDirExists(pathToCheck);
            };

            await assert.rejects(
                () => Configuration.create(testSetup.extensionContext),
                (error: Error) => {
                    assert.ok(error instanceof PmdConfigurationError);
                    assert.strictEqual(error.message, `PMD executable not found: ${path.join('bin', 'pmd')}`);
                    return true;
                }
            );

            // Restore originals
            (Utilities.dirExists as any) = originalDirExists;
            (Utilities.fileExists as any) = originalFileExists;
        });
    });
});
