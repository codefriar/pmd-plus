import { Configuration } from './modules/Configuration';
import * as vscode from 'vscode';

export interface PmdResult {
    problem: string;
    package: string;
    file: string;
    priority: string;
    line: string;
    description: string;
    ruleSet: string;
    rule: string;
}

export interface PmdPlusConfiguration {
    outputChannel: vscode.OutputChannel;
    configuration: Configuration;
    rulesets: string[];
}

export interface ProgressReport {
    message?: string;
    increment?: number;
}

export type PmdResults = Map<string, vscode.Diagnostic[]>;