/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import { CustomPseudoTerminal } from './terminals/CustomTerminal';
import BashCommanderPlusSPS from './sps/BashCommanderSPS';
import { parseAndExecuteBashCommands } from './utils/BashExecutor';

type Files = { [key: string]: string };

// the bash commander terminal. uses an SPS (semantic prompt structure) to perform its tasks
export default class BashCommander extends CustomPseudoTerminal {
    currentPath: string;
    interrupt = false;
    sps: BashCommanderPlusSPS;
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
        this.sps = new BashCommanderPlusSPS(this.context, this as any);
        this.sps.preamble = 'Open workspace Files:\n\n' + openFiles.map((file: any) => `${file.name}\n${file.text}\n`).join('\n');
    }

    getOpenFiles() {
        const openFiles: any = [];
        vscode.window.visibleTextEditors.forEach((editor) => {
            openFiles.push({
                name: editor.document.fileName,
                text: editor.document.getText()
            });
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
        const oFiles = openFiles.map((file: any) => `${file.name}\n${file.text}\n`).join('\n');
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
        if(!this.sps) { return ''; }
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
        const result =  parseAndExecuteBashCommands(command);
        return result;
    }

    async output(text: string): Promise<void> {
        this._onDidWrite.fire(text + '\r\n');
    }
}