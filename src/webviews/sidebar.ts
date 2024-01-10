import * as vscode from 'vscode';
import NotebookController from '../controllers/notebook';
import FooterBar from '../controllers/footer';
import fs from 'fs';
import { AiService } from '../services/aiService';

const parser = require('markdown-it')({
    highlight: function(code: any, lang: any) {
        require('highlight.js').highlight(lang, code).value;
    }
});  

// this is the notebook helper sidebar. the sidebar is a webview that can be
// used to display HTML content. we use it to display the explanation of the
// error that the user has selected in the notebook.

// the sidebar is created when the extension is activated, and disposed when
// the extension is deactivated. the sidebar is only visible when a notebook
// is open.

class SidebarWebview {
    private _disposables: vscode.Disposable[] = [];
    private _webviewPanel: vscode.WebviewPanel | undefined;
    private _footerBar: FooterBar;
    private _notebookController = new NotebookController();
    private _aiService: any;

    constructor() {
        this._footerBar =  new FooterBar();
        this._notebookController = new NotebookController();
        this._aiService = new AiService();
    }

    showSidebar() {
        if (!this._webviewPanel) {
            this._webviewPanel = vscode.window.createWebviewPanel(
                'notebookSidebar',
                'Notebook Helper',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );
            // when the sidebar is closed, dispose of the webview
            this._webviewPanel.onDidDispose(() => {
                this._webviewPanel = undefined;
            }, null, this._disposables);
            // when the user clicks a link in the sidebar, open it in the browser
            this._webviewPanel.webview.onDidReceiveMessage(e => {
                vscode.env.openExternal(e);
            }, null, this._disposables);
        }
    }

    hideSidebar() {
        if (this._webviewPanel) {
            this._webviewPanel.dispose();
            this._webviewPanel = undefined;
        }
    }

    // activate the sidebar
    activate(context: vscode.ExtensionContext) {

        // register a command to show the sidebar
        context.subscriptions.push(
            vscode.commands.registerCommand('puck.showJupyterSidebar', () => {
                this.showSidebar();
            })
        );

        // register a command to hide the sidebar
        context.subscriptions.push(
            vscode.commands.registerCommand('puck.hideJupyterSidebar', () => {
                this.hideSidebar();
            })
        );

        // register a command to toggle the sidebar
        context.subscriptions.push(
            vscode.commands.registerCommand('puck.toggleJupyterSidebar', () => {
                if (this._webviewPanel) {
                    this.hideSidebar();
                } else {
                    this.showSidebar();
                }
            })
        );

        // register a command to explain the selected error
        context.subscriptions.push(
            vscode.commands.registerCommand('puck.explainError', async () => {
                // get the selected cell
                const errors = NotebookController.getNotebookSourceWithErrors();
                if(errors.length === 0) { return }
                // use AI to explain the error
                this._footerBar.spinnerOn('Explaining error...');
                const explanation = await this._aiService.explainError(errors);
                this._footerBar.spinnerOff('Error explained successfully');

                // show the explanation in the sidebar
                this.showSidebar();

                this._webviewPanel!.webview.html = parser.render(explanation);
            })
        );

        // register a command to explain the selected error
        context.subscriptions.push(
            vscode.commands.registerCommand('puck.explainCellError', async () => {
                // get the selected cell
                const errors = this._notebookController.getNotebookCellWithErrors();
                if(!errors || errors.length === 0) { return }
                // use AI to explain the error
                this._footerBar.spinnerOn('Explaining error...');
                const explanation = await this._aiService.explainError(errors);
                this._footerBar.spinnerOff('Error explained successfully');

                // show the explanation in the sidebar
                this.showSidebar();

                this._webviewPanel!.webview.html = parser.render(explanation);
            })
        );
    }
}

export default SidebarWebview;