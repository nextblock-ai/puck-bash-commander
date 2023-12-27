/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { Command } from "../utils/Command";
import { setOpenAIKey } from "../configuration";

const org = "puck";

export default class SetOpenAIKeyCommand extends Command {
    constructor(commandId: string, title: string, context: vscode.ExtensionContext) {
        super(`${org}.${commandId}`, title, context);
    }

    async execute() {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your OpenAI API key',
            ignoreFocusOut: true,
            password: true,
        });
        if (apiKey) {
            setOpenAIKey('puck', apiKey);
            vscode.window.showInformationMessage('OpenAI API key saved successfully');
        } else {
            vscode.window.showErrorMessage('Invalid API key. Please try again');
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    new SetOpenAIKeyCommand("setOpenAIKey", "Set OpenAI Key", context);
}

