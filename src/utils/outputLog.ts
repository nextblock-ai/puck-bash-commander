/* eslint-disable @typescript-eslint/no-unused-vars */
import * as vscode from 'vscode';

// This method is called when your extension is activated
export function activate(_context: vscode.ExtensionContext) {
    log('Conversation Documents extension is now active!');
}

export function deactivate() {
    // nothing to do
}


let outputChannel: vscode.OutputChannel;
// log a message to the output channel
export function log(message: string, showChannel = false) {
    if(!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Puck - Conversation Documents');
    }
    outputChannel.appendLine(message);
    if(showChannel) { outputChannel.show(); }
}