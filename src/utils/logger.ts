/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vscode from 'vscode';

// This method is called when your extension is activated
export function activate(_context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('Attila Logs');
    outputChannel.appendLine('Attila extension activated');
}

export function deactivate() {
    // nothing to do
}

// log a message to the output channel
export function log(message: string, showChannel = false) {
    const outputChannel = vscode.window.createOutputChannel('Attila Logs');
    outputChannel.appendLine(message);
    if(showChannel) { outputChannel.show(); }
}