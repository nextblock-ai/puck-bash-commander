/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import { CustomPseudoTerminal } from './terminals/CustomTerminal';
import BashCommanderPlusSPS from './sps/BashCommanderSPS';
import BashExecutor from './utils/BashExecutor';

type Files = { [key: string]: string };

// the bash commander terminal. uses an SPS (semantic prompt structure) to perform its tasks
export default class BashCommander extends CustomPseudoTerminal {
    currentPath: string;
    interrupt = false;
    sps: BashCommanderPlusSPS;
    bashExecutor: BashExecutor;
    context: vscode.ExtensionContext;

    // constructor
    constructor(context: vscode.ExtensionContext) {
        super();
        this.motd = "OpenAI GPT-4 Bash Commander Pro 0.0.1 - enter a request below.\r\n";

        this.currentPath = this.getFirstWorkspaceFolderPath() || '';
        process.chdir(this.currentPath);
        this.context = context;
        // create the sps amd add the open proejct files
        const openFiles = this.getOpenFiles();
        this.bashExecutor = new BashExecutor();
        this.sps = new BashCommanderPlusSPS(this.context, this as any);
    }

    getOpenFiles() {
        const openFiles: any = {};
        vscode.window.visibleTextEditors.forEach((editor) => {
            openFiles[editor.document.fileName] = editor.document.getText();
        });
        return openFiles;
    }

    close(): void {
        super.close();
        this._onDidClose.fire();
    }

    // handle hitting Ctrl+C
    private _handleCtrlC() {
        // Handle the Ctrl+C behavior here, e.g., interrupting the task
        this.interrupt = true;
        this._onDidWrite.fire('Ctrl+C detected. Interrupting the task...\r\n');
        setTimeout(() => {
            this.createSPS();
        });
    }

    public createSPS() {
        const openFiles = this.getOpenFiles();
        this.sps = new BashCommanderPlusSPS(this.context, this as any);
        this._onDidWrite.fire('\x1b[2J\x1b[3J\x1b[H');
        this._onDidWrite.fire('$ ');
    }

    async handleInput(data: string): Promise<void> {
        super.handleInput(data);
        if (data === '\x03') { // ASCII code for Ctrl+C
            this.stopSpinner();
            this._handleCtrlC();
        }
    }

    async processResponse(response: string): Promise<string> {
        if(!this.sps) {
            return '';
        }
        await this.sps.handleUserRequest(response);
        return '';
    }

    getFirstWorkspaceFolderPath(): string | null {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            return vscode.workspace.workspaceFolders[0].uri.fsPath;
        }
        return null;
    }

    async executeBashCommand(command: string, log: any): Promise<{ stdout: string, stderr: string }> {
        return await this.bashExecutor.executeBashCommand(command, log);
    }

    async output(text: string): Promise<void> {
        this._onDidWrite.fire(text + '\r\n');
    }
}