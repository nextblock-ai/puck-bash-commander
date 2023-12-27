/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import * as path from 'path';

const { Assistant, Thread, loadNewPersona } = require('@nomyx/assistant');
const { tools, schemas } = require('../tools/index');
import { Command } from "../utils/Command";
import { getConfiguration, getOpenAIKey } from "../configuration";

/**
 * This class is responsible for creating the chat panel and handling messages from the webview
 */
export default class OpenChatCommand extends Command {
    constructor(commandId: string, title: string, context: vscode.ExtensionContext) {
        super(commandId, title, context);
    }

    async execute() {
        ChatPanel.createOrShow(this.context);
    }
}

/**
 * This class is responsible for creating the chat panel and handling messages from the webview
 */
export class ChatPanel {

    public static currentPanel: ChatPanel | undefined;
    // Initialize the history array to store message objects

    /**
     * Create a new chat panel or reveal an existing one
     * @param context 
     */
    public static async createOrShow(context: vscode.ExtensionContext) {

        // Check if the chat panel is already open. If so, reveal it; otherwise, create a new one.
        // This method will handle the creation of the WebView for the chat interface
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        if (ChatPanel.currentPanel) { ChatPanel.currentPanel.panel.reveal(column); } 
        else {
            const localResourceRoot = vscode.Uri.file(path.join(context.extensionPath, 'media'));
            ChatPanel.currentPanel = new ChatPanel(vscode.window.createWebviewPanel('chatgpt', 'ChatGPT', column || vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [localResourceRoot]
            }), context);
        }

        // Set the HTML content for the chat panel
        ChatPanel.currentPanel.panel.webview.html = ChatPanel.currentPanel.getHtmlForWebview(ChatPanel.currentPanel.panel.webview);
        
        // get the assistant object from openai or create a new one
        const getAssistant = async (threadId: any) => {
            const config = getConfiguration('puck');
            const assistants = await Assistant.list(getOpenAIKey('puck'));
            let assistant = assistants.find((a: any) => a.name === 'vscode-assistant');
            if (!assistant) {
                assistant = await Assistant.create(
                    'vscode-assistant',
                    await loadNewPersona(tools),
                    schemas,
                    config.model,
                    threadId
                );
                return assistant;
            }
            threadId && (assistant.thread = await Thread.get(threadId));
            return assistant;
        }

        let threadId: any = undefined;

        // Handle messages from the webview
        ChatPanel.currentPanel.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'get-theme':
                        // Send the current theme back to the webview
                        ChatPanel.currentPanel && ChatPanel.currentPanel.panel.webview.postMessage({ command: 'set-theme', theme: vscode.window.activeColorTheme.kind });
                        return;

                    case 'send-message':
                        console.log('Received message from webview:', message);

                        // get the config from vscode
                        const openai_api_key = vscode.workspace.getConfiguration('sanuel').get('apiKey');

                        let currentUpdateStr = '';
                        getAssistant(threadId)
                        .then((assistant: any) => 
                            assistant.run(message.text, tools, schemas, openai_api_key, (event: any, value: any) => {
                                if(!this.currentPanel) { return }
    
                                let eventSplit = event.split(' ')
                                if(!isNaN(eventSplit[eventSplit.length - 1])) {
                                    eventSplit.pop();
                                    eventSplit = eventSplit.join(' ');
                                } else { eventSplit = event; }
    
                                if(currentUpdateStr !== eventSplit) {
                                    currentUpdateStr = eventSplit;
                                    this.currentPanel.updateChat(eventSplit, true);
                                }
                            })
                            .then((textResponse: any) => {
                                threadId = assistant.thread.id;
                                if(this.currentPanel) {
                                    this.currentPanel.updateChat(textResponse + '\n');
                                } 
                            }).catch((error: any) => {
                                // if this ends with 'is active' then we are trying to add a new 
                                // message while the old one is still running. so we need to cancel
                                if(error.message.endsWith('is active')) {
                                    assistant.thread.cancel().then(() => {
                                        this.currentPanel && this.currentPanel.updateChat(`Error: ${error.message}`);
                                    })
                                }
                            })
                        )
                        break;

                    case 'clear-history':
                        break;
                }
            },
            undefined,
            context.subscriptions
        );

        // Handle closing the chat panel
        ChatPanel.currentPanel.panel.onDidDispose(
            () => {
                ChatPanel.currentPanel = undefined;
            },
            null,
            context.subscriptions
        );
    }

    public static revive(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
        ChatPanel.currentPanel = new ChatPanel(panel, context);
    }

    public dispose() {
        ChatPanel.currentPanel = undefined;
        this.panel.dispose();
    }

    public update() {
        this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);
    }

    public updateChat(response: string, partial: boolean = false) {
        // Send the response from ChatGPT to the webview
        this.panel.webview.postMessage({ command: 'send-message', text: response, partial });
    }

    private constructor(private panel: vscode.WebviewPanel, private context: vscode.ExtensionContext) {
        // Set the webview's initial html content
        this.update();
    }

    private getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html lang="en">
        
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ChatGPT Panel</title>
            <style>
                body,
                html {
                    height: 100%;
                    margin: 0;
                    font-family: Arial, sans-serif;
                    background-color: #1e1e1e;
                    display: flex;
                    flex-direction: column;
                }
        
                #chat-container {
                    display: flex;
                    flex-direction: column;
                    flex-grow: 1;
                    background-color: #2d2d2d;
                }
        
                #messages {
                    flex-grow: 1;
                    overflow-y: auto;
                    padding: 20px;
                    background-color: #f0f0f0;
                }
        
                #input-area {
                    display: flex;
                    padding: 10px;
                    background-color: #fff;
                    border-top: 1px solid #ddd;
                    position: sticky;
                    bottom: 0;
                }
        
                #message-input {
                    flex-grow: 1;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
        
                #send-button {
                    padding: 10px 20px;
                    margin-left: 8px;
                    background-color: #0078d7;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
        
                #send-button:hover {
                    background-color: #0053a0;
                }
        
                .chatgpt-message,
                .user-message {
                    padding: 10px;
                    border-radius: 10px;
                    margin-bottom: 4px;
                    max-width: 100%;
                    word-wrap: break-word;
                }
        
                .user-message {
                    align-self: flex-end;
                    background-color: #0078d7;
                    color: white;
                }
        
                .chatgpt-message { width: 100%; word-wrap: break-word;
                    align-self: flex-start;
                    background-color: #e0e0e0;
                    color: black;
                }
        
                pre {
                    width: 100%;
                    margin: 0;
                    box-sizing: border-box;
                    overflow-wrap: break-word;
                    margin: 0;
                }
            </style>
        </head>
        
        <body>
        <div id="toolbar" style="position: sticky; top: 0; z-index: 100; background: white; padding: 10px; border-bottom: 1px solid #ccc;">
            <button id="clearButton">Clear Chat History</button>
        </div>
            <div id="chat-container">
                <div id="messages"></div>
                <div id="input-area">
                    <input type="text" id="message-input" placeholder="Type a message...">
                    <button id="send-button">Send</button>
                </div>
            </div>
            <script type="text/javascript">
                const vscode = acquireVsCodeApi();
                const sendButton = document.getElementById('send-button')
                let messageDiv = document.querySelector('.chatgpt-message:last-child');
        
                function displayMessage(message, sender, isPartial = false) {
                    messageDiv = document.querySelector('.chatgpt-message:last-child');
                    if (isPartial) {
                        if (!messageDiv) {
                            messageDiv = messageDiv || document.createElement('pre');
                            document.getElementById('messages').appendChild(messageDiv);
                        }
                        // remove [DONE] from the message
                        message = message.replace('[DONE]', '');
                        messageDiv.textContent += message + '\n';
                        messageDiv.className = 'chatgpt-message';
                    } else {
                        if (messageDiv && messageDiv.className === 'chatgpt-message' && messageDiv.textContent.startsWith(message)) {
                            messageDiv.textContent = message;
                            return;
                        }
                        messageDiv = document.createElement('pre');
                        messageDiv.textContent = message;
                        messageDiv.className = sender === 'user' ? 'user-message' : 'chatgpt-message';
                        document.getElementById('messages').appendChild(messageDiv);
                        sendButton.disabled = false;
                    }
                    messageDiv.scrollIntoView();
                    document.getElementById('message-input').value = '';
                }
        
                function clearPartialResponses() {
                    console.log('Clearing partial responses');
                    const chatGPTMessages = document.querySelectorAll('.chatgpt-message');
                    chatGPTMessages.forEach((msg) => msg.remove());
                }
        
                const onClick = () => {
                    sendButton.disabled = true;
                    const inputBox = document.getElementById('message-input');
                    const userMessage = inputBox.value;
                    inputBox.value = '';
                    if (userMessage) {
                        console.log('Sending message to VS Code context:', userMessage);
                        displayMessage(userMessage, 'user');
                        // Send the user message to the VS Code context                                                                                                                                 
                        vscode.postMessage({
                            command: 'send-message',
                            text: userMessage
                        });
                    }
                }
        
                // install on click handler for the send button
                sendButton.addEventListener('click', onClick);
        
                // install on keyup handler for the input box
                document.getElementById('message-input').addEventListener('keyup', (event) => {
                    if (event.key === 'Enter') {
                        console.log('Enter key pressed');
                        onClick();
                    }
                });

                // message response from VS Code context
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'send-message':
                            console.log('Received message from VS Code context:', message);
                            displayMessage(message.text, 'chatgpt', message.partial);
                            break;
                    }
                });
   
                document.getElementById('clearButton').addEventListener('click', () => {
                    messageDiv = document.querySelector('.chatgpt-message:last-child');
                    vscode.postMessage({
                        command: 'clear-history',
                    });
                    clearPartialResponses();
                    // clear the chat history
                    while (messageDiv) {
                        messageDiv.parentNode.removeChild(messageDiv);
                        messageDiv = document.querySelector('.chatgpt-message:last-child');
                    }
                });                                                                                                                                                   
            </script>
    </body>
</html>`
    }
}
