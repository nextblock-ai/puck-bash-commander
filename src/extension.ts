// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as logger from './utils/logger';
import { getOpenAIKey, setConfiguration } from './configuration';
import activate from './commands';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
async function _(context: vscode.ExtensionContext) {
    logger.activate(context);
	setConfiguration('puck', {
        openai_api_key: getOpenAIKey('puck'),
        model: 'gpt-4-1106-preview',
        playHT: {
            userId: process.env.PLAYHT_USER_ID,
            apiKey: process.env.PLAYHT_API_KEY,
            maleVoice: process.env.PLAYHT_MALE_VOICE,
            femaleVoice: process.env.PLAYHT_FEMALE_VOICE
        }
    });
    // webview = new SidebarWebview();
    // webview.activate(context);
    activate(context);
}

// This method is called when your extension is deactivated
function deactivate() {}

export { 
    _ as activate,
    deactivate
}
