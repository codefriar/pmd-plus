import * as fs from 'node:fs/promises';
import * as path from 'path';

export class Utilities {

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
                .map(line => line.trim())
                .filter(line => 
                    line !== '' && 
                    !line.startsWith('#') && 
                    !line.startsWith('!')
                );
        } catch (err) {
            return [];
        }
    }

}