import * as vscode from 'vscode';
import * as fs from 'fs';

export function loadStyle(webview: vscode.Webview, extensionUri: vscode.Uri, libName: string) {
    const libPath = vscode.Uri.joinPath(extensionUri, libName);
    const libContent = fs.readFileSync(libPath.fsPath, 'utf8');
    return `<style>
${libContent}
</style>`;
}
