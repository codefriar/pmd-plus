import * as fs from 'node:fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

export class Utilities {
    public static getWorkspacePath(): string {
        const workspace = vscode.workspace;
        const knownRootPath = workspace && workspace.workspaceFolders && workspace.workspaceFolders.length > 0;
        return knownRootPath ? workspace?.workspaceFolders[0].uri.fsPath : '';
    }

    public static async fileExists(path: string): Promise<boolean> {
        let statObj;
        try {
            const stats = await fs.stat(path);
            return stats.isFile();
        } catch (err) {
            return false;
        }
    }

    public static async dirExists(path: string): Promise<boolean> {
        let statObj;
        try {
            const stats = await fs.stat(path);
            return stats.isDirectory();
        } catch (err) {
            return false;
        }
    }

    public static async readForceIgnoreFile(workspacePath: string, filename: string): Promise<string[]> {
        try {
            const ignoreFilePath = path.join(workspacePath, filename);
            const content = await fs.readFile(workspacePath, 'utf8');
            return content
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line !== '' && !line.startsWith('#') && !line.startsWith('!'));
        } catch (err) {
            return [];
        }
    }
}
