require('dotenv').config();

import * as vscode from "vscode";
import * as fs from "fs";

export function getOpenAIKey(org: string): string {
    return getConfiguration(org).openai_api_key;
}

export async function setOpenAIKey(org: string, openAIKey: string): Promise<void> {
    const configuration = getConfiguration(org);
    configuration.openai_api_key = openAIKey;
    setConfiguration(org, configuration);
}

export function getConfiguration(org: string): any {
    // let config: string | undefined = vscode.workspace.getConfiguration(org).get('configuration');
    const _config = {
        openai_api_key: process.env.OPENAI_API_KEY,
        model: process.env.MODEL || 'gpt-4-1106-preview',
        playHT: {
            userId: process.env.PLAYHT_USER_ID,
            apiKey: process.env.PLAYHT_API_KEY,
            maleVoice: process.env.PLAYHT_MALE_VOICE,
            femaleVoice: process.env.PLAYHT_FEMALE_VOICE
        }
    }
    if(!fs.existsSync(`${process.env.HOME}/.puck.json`)) {
        setConfigurationToFile(`${process.env.HOME}/.puck.json`, _config);
    }
    const fileConfig = getConfigurationFromFile(`${process.env.HOME}/.puck.json`)
    return fileConfig ? fileConfig : _config;
    //return config ? config : (fileConfig ? fileConfig : _config)
}

export function setConfiguration(org: string, configuration: any) {
    try {
        setConfigurationToFile(`${process.env.HOME}/.puck.json`, configuration);
        // vscode.workspace.getConfiguration(org).update('configuration', JSON.stringify(configuration), vscode.ConfigurationTarget.Workspace)
        // .then(() => {
        //     const config = vscode.workspace.getConfiguration(org);
        //     if (config.has('configuration')) {
        //         vscode.window.showInformationMessage('Configuration saved successfully');
        //     } else {
        //         vscode.window.showErrorMessage('Failed to save configuration');
        //     }
        // });
    } catch (error: any) {
        vscode.window.showErrorMessage(`Error updating configuration: ${error.message}`);
    }
}

function getConfigurationFromFile(filePath: string) {
    const fs = require('fs');
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function setConfigurationToFile(filePath: string, configuration: any) {
    const fs = require('fs');
    fs.writeFileSync(filePath, JSON.stringify(configuration));
}