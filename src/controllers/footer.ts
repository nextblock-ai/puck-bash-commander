import * as vscode from 'vscode';

class FooterBar {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left
        );
        this.statusBarItem.text = '';
        this.statusBarItem.show();
    }

    spinnerOn(message: string) {
        this.statusBarItem.text = `$(sync~spin) ${message}`;
    }

    spinnerOff(message: string) {
        this.statusBarItem.text = message;
    }

    dispose() {
        this.statusBarItem.dispose();
    }
}

export default FooterBar;