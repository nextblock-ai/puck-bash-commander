/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/naming-convention */
import axios from 'axios';
import * as vscode from 'vscode';
import { log } from './logger';
import { getOpenAIKey } from '../commands/SetOpenAIKeyCommand';

export interface GPTChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface GPTChatConversation {
    model: string;
    messages: GPTChatMessage[];
    max_tokens?: number;
    top_p?: number;
    temperature?: number;
    stream?: boolean;
    apikey?: string;
}

const persomDelimiter = "👤";
const assistantDelimiter = "🤖";
const systemDelimiter = "🌐";

export async function sendQuery(query: GPTChatConversation): Promise<string> {

    // get the api key from settings
    const config = vscode.workspace.getConfiguration('attila');
    const apikey = getOpenAIKey();
    delete query.apikey;
    try {
        log(`Sending query to GPT API: ${JSON.stringify(query)}`);
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            JSON.stringify(query), {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apikey}`,
            },
        });
        if (response.data && response.data.choices && response.data.choices.length > 0) {
            log(`Chat completion: ${response.data.choices[0].message.content}`);
            return response.data.choices[0].message.content;
        } else {
            // we show an error notification if the response is empt
            throw new Error('No completion found');
        }
    } catch (error: any) {
        vscode.window.showErrorMessage('Error: ' + error.message);
        throw error;
    }

}

export async function sendChatQuery(messages: any[], prompt: string, inputText: string): Promise<GPTChatMessage[]> {

    const conversation = {
        messages: [] as any[],
        model: "gpt-4",
        temperature: 0.7,
        max_tokens: 2048,
    };

    const addToMessages = (role: string, content: string) =>
        conversation.messages.push({ role, content });
    const updates = [];


    // add the existing messages to the conversation object
    if (messages.length > 0) {
        if (messages && messages.length > 0) {
            conversation.messages = messages;
            addToMessages("user", inputText);
        }

    } else {
        addToMessages("system", prompt);
    }
    
    // add the user message to the conversation object
    if(inputText) {
        addToMessages("user", inputText);
    }

    conversation.messages = conversation.messages.map(c => ({
        content: c.content,
        role: c.role === systemDelimiter 
            ? "system" : c.role === persomDelimiter 
                ? "user" : c.role === assistantDelimiter 
                    ? "assistant" : c.role
    }));

    // send the query to the GPT API
    const result = await sendQuery(conversation);

    // add the response to the conversation object
    addToMessages("assistant", result);

    // return the conversation object
    return conversation.messages;

}

export async function streamQuery(query: GPTChatConversation, onUpdate: (data: any) => void, onComplete: (data: any) => void): Promise<string> {

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            query, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${query.apikey}`,
                },
                responseType: 'stream',
            }
        );
        let output = '';
        response.data.on('data', (chunk: any) => {
            const parsedData = JSON.parse(chunk.toString());
            onUpdate(parsedData);
            if (parsedData.choices && parsedData.choices.length > 0) {
                output += parsedData.choices[0].message.content;
            }
        });
        response.data.on('end', () => {
            onComplete(null);
        });
        response.data.on('error', (error: any) => {
            onComplete(error);
        });
        return output;
    } catch (error: any) {
        vscode.window.showErrorMessage('Error: ' + error.message);
        throw error;
    }

}

// send a query and retry if the response is not properly formed
export async function sendQueryWithRequeries(conversation: GPTChatConversation): Promise<string> {

    const _response: any[] = [];
    const _getResponse = () => _response.join('');
    const _isResponseJson = () => _getResponse().startsWith('{') || _getResponse().startsWith('[');
    const _isProperlyFormedJson = () => _isResponseJson() && (_getResponse().endsWith('}') || _getResponse().endsWith(']'));
    let isJson = false;

    const _query = async (conversation: any, iter: number) => {
        const completion = await sendQuery(conversation);
        _response.push(completion);
        return new Promise((resolve): any => {
            const responseMessage = _getResponse();
            isJson = iter === 0 && _isResponseJson();
            if (isJson) {
                if (_isProperlyFormedJson()) {
                    return resolve(responseMessage);
                } else {
                    conversation.messages.push({ role: 'assistant', content: completion });
                    return resolve(_query(conversation, iter + 1));
                }
            } else { return resolve(responseMessage); }
        });
    };
    const completion = await _query(conversation, 0);
    return completion as string;   

}
