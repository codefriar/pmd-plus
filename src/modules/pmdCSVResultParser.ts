import * as csvParse from 'csv-parse/lib/sync';
import { Options } from 'csv-parse';
import { Configuration } from './configuration';
import * as vscode from 'vscode';
import { Utilities } from './utilities';

const FIELDS: (keyof PmdResult)[] = [
    'problem',
    'package',
    'file',
    'priority',
    'line',
    'description',
    'ruleSet',
    'rule',
];

export class PmdCSVResultParser {
    private outputChannel: vscode.OutputChannel;
    private configuration: Configuration;

    constructor(outputChannel: vscode.OutputChannel, configuration: Configuration) {
        this.outputChannel = outputChannel;
        this.configuration = configuration;
    }

    public async parse(resultsCSV: string): Promise<Map<string, Array<vscode.Diagnostic>>> {
        try {
            const results = this.parseRawData(resultsCSV);
            const problemsMap = new Map<string, Array<vscode.Diagnostic>>();
            let countOfIssues = 0;

            const forceIgnoreFiles = await Utilities.readForceIgnoreFile(
                this.configuration.workspacePath,
                '.forceignore'
            );

            for (const result of results) {
                /// guard against ignored files.
                if (forceIgnoreFiles.includes(result.file) || result.file.includes('.sfdx')) {
                    continue;
                }

                const problem = this.createDiagnostic(result);
                if (!problem) {
                    continue;
                }
                countOfIssues++;
                if (problemsMap.has(result.file)) {
                    problemsMap.get(result.file)?.push(problem);
                } else {
                    problemsMap.set(result.file, [problem]);
                }
            }
            this.outputChannel.appendLine(`PMD+ found ${countOfIssues} issues.`);
            return problemsMap;
        } catch (error) {
            this.outputChannel.appendLine(`Error parsing PMD results: ${error}`);
            throw error;
        }
    }

    private parseRawData(resultsCSV: string): PmdResult[] {
        let results: PmdResult[] = [];
        const parserOptions: Options = {
            columns: FIELDS,
            relax_column_count: true,
        };
        try {
            results = csvParse.parse(resultsCSV, parserOptions);
        } catch (error) {
            throw new Error(`Failed to parse PMD results: ${error}`);
        }
        vscode.window.showWarningMessage(
            `PMD+ failed to parse all the PMD violations found in the CSV, but found ${results.length} issues.`
        );
        return results;
    }

    private calculateLevel(result: PmdResult): vscode.DiagnosticSeverity {
        const { errorThreshold, warnThreshold } = this.configuration;
        const priority = parseInt(result.priority, 10);

        let level: vscode.DiagnosticSeverity;
        if (priority <= errorThreshold) {
            level = vscode.DiagnosticSeverity.Error;
        } else if (priority <= warnThreshold) {
            level = vscode.DiagnosticSeverity.Warning;
        } else {
            level = vscode.DiagnosticSeverity.Information;
        }
        return level;
    }

    private createDiagnostic(result: PmdResult): vscode.Diagnostic {
        const violationOnLine = parseInt(result.line, 10) - 1;
        const problemUrl = this.generateURLToProblemDetails(result);
        const diagnosticMessage = `${result.description} (rule: ${result.rule})`;
        
        const problem = new vscode.Diagnostic(
            new vscode.Range(new vscode.Position(violationOnLine, 0), new vscode.Position(violationOnLine, 100)),
            diagnosticMessage,
            this.calculateLevel(result)
        );
        problem.code = {
            value: result.rule,
            target: vscode.Uri.parse(problemUrl),
        };
        problem.source = 'PMD+';
        return problem;
    }

    private generateURLToProblemDetails(result: PmdResult): string {
        return `https://pmd.github.io/latest/pmd_rules_apex_${result.ruleSet
            .split(' ')
            .join('')
            .toLowerCase()}.html#${result.rule.toLowerCase()}`;
    }
}
