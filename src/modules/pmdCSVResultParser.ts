import * as csvParser from 'csv-parse/sync';
import { Options } from 'csv-parse';
import { Configuration } from './configuration';
import * as vscode from 'vscode';
import { Utilities } from './utilities';
import { PmdResult } from '../types';

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

/**
 * @description This class is responsible for parsing the PMD results into a DiagnosticCollection for VSCode.
 * @class PmdCSVResultParser
 */
export class PmdCSVResultParser {
    private outputChannel: vscode.OutputChannel;
    private configuration: Configuration;

    /**
     * @description Responsible for constructing a PmdCSVResultParser instance with proper configuration.
     * @param outputChannel The channel name to use for log output
     * @param configuration Incoming configuration object
     */
    constructor(outputChannel: vscode.OutputChannel, configuration: Configuration) {
        this.outputChannel = outputChannel;
        this.configuration = configuration;
    }

    /**
     * @description This method is the main entry point for parsing the PMD results into a DiagnosticCollection for VSCode.
     * @param resultsCSV The PMD results as a CSV string.
     * @returns Promise<Map<string, Array<vscode.Diagnostic>>>
     */
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

    /// Private Helper Methods
    /**
     * @description This method is responsible for parsing the PMD results into a DiagnosticCollection for VSCode.
     * @param resultsCSV The PMD results as a CSV string.
     * @returns PmdResult[]
     */
    private parseRawData(resultsCSV: string): PmdResult[] {
        let results: PmdResult[] = [];
        const parserOptions: Options = {
            columns: FIELDS,
            relax_column_count: true,
            from_line: 2,
            cast: true,
        };
        try {
            results = csvParser.parse(resultsCSV, parserOptions) as PmdResult[];
        } catch (error) {
            throw new Error(`Failed to parse PMD results: ${error}`);
        }
        vscode.window.showWarningMessage(
            `PMD+ failed to parse all the PMD violations found in the CSV, but found ${results.length} issues.`
        );
        return results;
    }

    /**
     * @description This method is responsible for calculating the level of the diagnostic based on the priority of the result.
     * @param result The result to calculate the level for.
     * @returns vscode.DiagnosticSeverity
     */
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

    /**
     * @description This method is responsible for creating a new vscode.Diagnostic object.
     * @param result The PMD result to create a diagnostic for.
     * @returns vscode.Diagnostic
     */
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

    /**
     * @description This method is responsible for generating a URL to the problem details for the given PMD result.
     * @param result The PMD result to generate a URL for.
     * @returns string
     */
    private generateURLToProblemDetails(result: PmdResult): string {
        return `https://pmd.github.io/latest/pmd_rules_apex_${result.ruleSet
            .split(' ')
            .join('')
            .toLowerCase()}.html#${result.rule.toLowerCase()}`;
    }
}
