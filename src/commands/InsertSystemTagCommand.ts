import * as vscode from "vscode";
import { Command } from "../utils/Command";

// all commands are a subclass of Commandexport default 
export default class InsertSystemTagCommand extends Command {
    systemDelimiter = "🌐 ";
    constructor(commandId: string, title: string, context: vscode.ExtensionContext) {
        super(commandId, title, context);
    }
    async execute() {
        // get the active editor
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        // get the current cursor location
        const position = editor.selection.active;
        // insert the assistant delimiter
        await editor.edit((editBuilder) => {
            editBuilder.insert(position, this.systemDelimiter);
        });
    }
}