import * as vscode from "vscode";
import OpenAI from "openai";


function getOpenAIKey(): string | undefined {
    const config = vscode.workspace.getConfiguration('puck');
    return config.get('openai_api_key');
}

const openai = new OpenAI({
    apiKey: getOpenAIKey() || ''
});

// call the openai api chat endpoint
export async function sendQuery(query: string) {
    const chatCompletion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: query }],
        model: 'gpt-4-1106-preview',
    });
    return chatCompletion.choices[0].message.content;
}