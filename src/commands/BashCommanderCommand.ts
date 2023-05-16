/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { Command } from "../utils/Command";
import BashCommander from "../terminals/BashCommander";

const org = "puck";

// all commands are a subclass of Command
export default class BashCommanderCommand extends Command {
    constructor(commandId: string, title: string, context: vscode.ExtensionContext) {
        super(`${org}.${commandId}`, title, context);
    }
    
    // create a status bar item
    onDidRegister(): void {
        const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 200);
        statusBar.text = 'Open Bash Commander';
        statusBar.command = `${org}.bashCommander`;
        statusBar.show();
        this.context.subscriptions.push(statusBar);
    }

    // create a bash commander terminal and show it
    async execute() {
        const terminal = vscode.window.createTerminal({
            name: "Bash Commander",
            pty: new BashCommander(this.context),
        });
        terminal.show();
    }
}

export function activate(context: vscode.ExtensionContext) {
    const command = new BashCommanderCommand("bashCommander", "Bash Commander", context);
}
