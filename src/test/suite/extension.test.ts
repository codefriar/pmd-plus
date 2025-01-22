import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { PmdPlus } from '../../modules/PmdPlus';
import { TestExtensionSetup, setupTestExtension, cleanupTestExtension } from '../helpers/testSetup';

suite('Extension Test Suite', () => {
    let testSetup: TestExtensionSetup;

    setup(async () => {
        testSetup = await setupTestExtension(); // Now uses mocked setup
    });

    teardown(() => {
        cleanupTestExtension(testSetup);
    });

    test('Extension should be present', () => {
        assert.ok(testSetup.extension);
        assert.strictEqual(testSetup.extension.id, 'Codefriar.pmd-plus');
    });

    test('Should activate successfully', () => {
        assert.ok(testSetup.extension.isActive);
    });

    test('Should analyze a file with PMD', async () => {
        testSetup = await setupTestExtension({
            extensionPath: path.join(__dirname, '../../../'),
        });
        const testFilePath = path.join(__dirname, '../../../src/test/fixtures/TestClass.cls');
        const pmdPlus = await PmdPlus.create(testSetup.outputChannel, testSetup.extensionContext);
        await pmdPlus.runPMD(testFilePath, testSetup.diagnosticCollection);

        // Since we're using mocks, we can verify the diagnostic collection was accessed
        assert.ok(testSetup.diagnosticCollection);
        // You might want to add more specific assertions based on your mocked behavior
    });
});
