import * as vscode from 'vscode';
import * as fs from 'fs';

export function loadScript(webview: vscode.Webview, extensionUri: vscode.Uri, libName: string) {
    const libPath = vscode.Uri.joinPath(extensionUri, libName);
    const libContent = fs.readFileSync(libPath.fsPath, 'utf8');
    return `<script type="text/javascript">
${libContent}
</script>`;
}
