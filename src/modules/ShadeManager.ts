import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { ShadeConfig, Shade } from './ShadeConfig';
import { Configuration } from './Configuration';

export class ShadeManager {
    private readonly configuration: Configuration;
    private shadeConfig: ShadeConfig;
    private shadeCache: Map<string, Shade[]> = new Map();

    constructor(configuration: Configuration) {
        this.configuration = configuration;
        this.shadeConfig = configuration.shadeConfig as ShadeConfig;

        this.loadShadeFiles();
    }

    private loadShadeFiles() {
        const shadeDir = path.join(this.configuration.extensionInstallationPath(), 'shade');
        fs.readdirSync(shadeDir)
            .filter((file) => file.endsWith('.json'))
            .forEach((file) => {
                const content = fs.readFileSync(path.join(shadeDir, file), 'utf8');
                this.shadeCache.set(file, JSON.parse(content).insults);
            });
    }

    private async getLineAuthor(filePath: string, lineNumber: number): Promise<string> {
        return new Promise((resolve) => {
            exec(`git blame -L ${lineNumber},${lineNumber} "${filePath}" --porcelain`, (error, stdout) => {
                if (error) {
                    resolve('');
                    return;
                }
                const author = stdout.match(/author-mail <(.+)>/)?.[1] || '';
                resolve(author);
            });
        });
    }

    private async getCurrentGitUser(): Promise<string> {
        return new Promise((resolve) => {
            exec('git config user.email', (error, stdout) => {
                resolve(error ? '' : stdout.trim());
            });
        });
    }

    async getShadeMessage(filePath: string, lineNumber: number): Promise<string> {
        if (!this.shadeConfig.enabled) {
            return '';
        }

        const author = await this.getLineAuthor(filePath, lineNumber);
        const currentUser = await this.getCurrentGitUser();

        if (author === currentUser) {
            return this.getRandomInsult('general.json');
        }

        return this.getRandomInsultFromEnabled();
    }

    private getRandomInsult(fileName: string): string {
        const insults = this.shadeCache.get(fileName) || [];
        const selectedInsult: Shade = insults[Math.floor(Math.random() * insults.length)] ?? '';
        return selectedInsult.shade;
    }

    private getRandomInsultFromEnabled(): string {
        const enabledFiles = Object.entries(this.shadeConfig.shadeFiles)
            .filter(([_, enabled]) => enabled)
            .map(([file]) => file);

        if (enabledFiles.length === 0) {
            return '';
        }

        const randomFile = enabledFiles[Math.floor(Math.random() * enabledFiles.length)];
        return this.getRandomInsult(randomFile + '.json');
    }
}
