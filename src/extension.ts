// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import SetOpenAIKeyCommand from './commands/SetOpenAIKeyCommand';
import BashCommanderCommand from './commands/BashCommanderCommand';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	new BashCommanderCommand("bashCommander", "Bash Commander", context);
	new SetOpenAIKeyCommand("setOpenAIKey", "Set OpenAI Key", context);

}

// This method is called when your extension is deactivated
export function deactivate() {}
