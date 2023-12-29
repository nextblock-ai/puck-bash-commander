/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { Command } from "../utils/Command";
import { loadStyle } from "../utils/style";
import { loadScript } from "../utils/scripts";
import AssistantManager from "../managers/AssistantManager";
import { getConfiguration, getOpenAIKey } from "../configuration";

const { Assistant, Thread, loadNewPersona } = require("@nomyx/assistant");
const { tools, schemas } = require('../tools/index');

const getAssistant = async (
    name: string = 'vscode-assistant', 
    model: string = 'gpt-4-1106-preview',
    threadId: string | undefined = undefined
    ): Promise<any> => {
    const persona = await loadNewPersona(schemas);
    const apiKey = getOpenAIKey('puck');
    const assistants = await Assistant.list(apiKey);
    let assistant = assistants.find((a: any) => a.name === name);
    if (!assistant) {
        assistant = await Assistant.create(
            name,
            persona,
            schemas,
            model,
            threadId
        );
        return assistant;
    }
    if(threadId) assistant.thread = await Thread.get(threadId);
    return assistant;
}

// all commands are a subclass of Command
class ConversationDocumentsCommand extends Command {
    constructor(commandId: string, title: string, context: vscode.ExtensionContext) {
        super(commandId, title, context);
    }
    /**
     * open a new chat document
     */
    async execute() {
        const document = await vscode.workspace.openTextDocument({
            content: JSON.stringify({
                messages: [],
                prompt: 'You are a helpful assistant.',
                title: 'New Conversation',
                scripts: [],
            }, null, 4),
            language: 'json',
        });
        await vscode.window.showTextDocument(document, {
            preview: false,
            viewColumn: vscode.ViewColumn.Beside,
        });
    }
}

export class ChatEditorProvider implements vscode.CustomTextEditorProvider {
    assistant: any;
    /**
     *  register the provider
     * @param context 
     * @returns 
     */
    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new ChatEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider('chatEditor', provider);
        return providerRegistration;
    }

    constructor(private readonly context: vscode.ExtensionContext) { }

    /**
     * open the document
     * @param document 
     * @param webviewPanel 
     */
    async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
        
        // Set the webview options and content here
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        // get the initial content of the document
        const docContent = document.getText(); 
        const initialContent = Object.assign({
            messages: [],
            prompt: 'You are a helpful assistant.',
            title: 'New Conversation',
            scripts: [],
        }, JSON.parse(docContent || '{}'));
        // set the webview html content
        webviewPanel.webview.html = getWebViewContent(
            webviewPanel.webview,
            this.context.extensionUri,
            initialContent
        );
        // get the webview content
        function getWebViewContent(webview: vscode.Webview, extensionUri: vscode.Uri, initialContent: any): string {
            return `<html lang="en" sandbox="allow-scripts allow-same-origin">
            <head>
                <meta charset="UTF-8">
                <title>New Conversation</title>
                <style>
                :root {
                    --background-color: #1e1e1e;
                    --header-color: #252526;
                    --footer-color: #252526;
                    --text-color: #d4d4d4;
                    --button-color: #3a3d41;
                    --card-color: #2d2d30;
                    --border-color: #1a1a1a;
                }
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    background-color: var(--background-color);
                    font-family: Arial, sans-serif;
                    color: var(--text-color);
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                }
                header {
                    background-color: var(--header-color);
                    padding: 1rem;
                    position: fixed;
                    top: 0;
                    width: 100%;
                }
                .conversation-title {
                    font-size: 1.5rem;
                    text-align: center;
                }
                .prompt {
                    margin-top: 1rem;
                    text-align: center;
                }
                .collapse-button {
                    background-color: var(--button-color);
                    border: none;
                    color: var(--text-color);
                    cursor: pointer;
                    font-size: 1rem;
                    margin-top: 0.5rem;
                    padding: 0.5rem 1rem;
                }
                .chat-container {
                    flex: 1;
                    margin-top: 8rem;
                    overflow-y: auto;
                    padding: 2rem;
                    overflow: scroll-y;
                }
                .message-card {
                    background-color: var(--card-color);
                    border-radius: 5px;
                    margin-bottom: 1rem;
                    padding: 2rem;
                    position: relative;
                    text-align: left;
                }
                .message-role {
                    margin-bottom: 0.5rem;
                }
                .message-content {
                    border: 1px solid var(--border-color);
                    padding: 0.5rem;
                }
                .toolbar {
                    display: flex;
                    justify-content: flex-end;
                    position: absolute;
                    right: 0;
                    top: 0rem;
                }
                .toolbar button {
                    background-color: var(--button-color);
                    border: none;
                    color: var(--text-color);
                    cursor: pointer;
                    font-size: 1rem;
                    margin-left: 0.5rem;
                    padding: 0.5rem;
                }
                .chat-input {
                    background-color: var(--background-color);
                    border: none;
                    color: var(--text-color);
                    font-family: Arial, sans-serif;
                    height: 100%;
                    resize: none;
                    width: 100%;
                }
                .plus-button {
                    background-color: var(--button-color);
                    border: none;
                    color: var(--text-color);
                    cursor: pointer;
                }
        
                .conversation-title {
                    font-size: 1.5rem;
                    text-align: center;
                }
                .prompt {
                    margin-top: 1rem;
                    text-align: center;
                }
                .message-author {
                    font-weight: bold;
                    margin-bottom: 0.5rem;
                }
                footer {
                    background-color: var(--footer-color);
                    padding: 1rem;
                    padding-right: 2rem;
                    position: fixed;
                    bottom: 0;
                    width: 100%;
                }
        
                .modal {
                    background-color: var(--card-color);
                    border-radius: 5px;
                    padding: 2rem;
                    position: absolute;
                    width: 80%;
                    max-width: 500px;
                    display: none;
                    z-index: 10;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }
                .modal-title {
                    font-size: 1.5rem;
                }
                .close-button {
                    background-color: transparent;
                    border: none;
                    color: var(--text-color);
                    cursor: pointer;
                    font-size: 1.5rem;
                }
                .prompt-input {
                    background-color: var(--background-color);
                    border: 1px solid var(--border-color);
                    border-radius: 5px;
                    color: var(--text-color);
                    font-family: Arial, sans-serif;
                    margin-bottom: 1rem;
                    padding: 0.5rem;
                    width: 100%;
                }
                .prompt-textarea {
                    background-color: var(--background-color);
                    border: 1px solid var(--border-color);
                    border-radius: 5px;
                    color: var(--text-color);
                    font-family: Arial, sans-serif;
                    height: 100px;
                    margin-bottom: 1rem;
                    padding: 0.5rem;
                    resize: none;
                    width: 90%;
                }
                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                }
                .modal-button {
                    background-color: var(--button-color);
                    border: none;
                    border-radius: 5px;
                    color: var(--text-color);
                    cursor: pointer;
                    font-size: 1rem;
                    margin-left: 0.5rem;
                    padding: 0.5rem 1rem;
                }
                </style>
                ${loadStyle(webview, extensionUri, 'resources/css/font-awesome.min.css')}
            </head>
            <body>
                ${loadScript(webview, extensionUri, 'resources/js/marked.min.js')}
                <script id="rendered-js">
                
                    let vscodeApi;
                    // add a new message card to the chat interface
                    function addMessageCard(role, content) {
                        const chatContainer = document.querySelector('.chat-container');
                        const messageCard = createMessageCard(role, content);
                        // look for the plus button and remove it but keep a reference to it
                        let plusButton = chatContainer.querySelector('.plus-button');
                        if(plusButton !== null) {
                            plusButton.remove();
                        } else {
                            plusButton = document.createElement('button');
                            plusButton.classList.add('plus-button');
                            plusButton.innerText = '+';
                            plusButton.addEventListener('click', () => {
                                const newMessage = { role: 'user', content: '' };
                                messages.push(newMessage);
                                addMessageCard(newMessage.role, newMessage.content);
                            });
                        }
                        // add the message to the chat interface
                        chatContainer.appendChild(messageCard);
                        // add the plus button back to the chat interface
                        chatContainer.appendChild(plusButton);
                        return messageCard;
                    }

                    function createUI() {
                        const container = document.createElement('div');
                        container.innerHTML = \`
                            <header>
                                <div class="conversation-title" contenteditable="false">${initialContent && initialContent.title || 'New Conversation'}</div>
                                <div class="prompt" contenteditable="false">${initialContent && initialContent.prompt || 'You are a helpful assistant'}</div>
                                <button class="collapse-button">\ /</button>
                            </header>
                            <div class="chat-container"></div>
                            <footer>
                                <textarea class="chat-input"></textarea>
                                ctrl+enter to submit
                            </footer>\`;
                        document.body.appendChild(container);
                    }

                    function createChatInterface(messages, onChatMessageSent) {
                        const onNewMessageAdded = (newMessage) => {
                            vscodeApi.postMessage({
                                command: 'addNewMessage',
                                newMessage,
                            });
                        };
                        // create the UI elements for the chat interface

         
                        // init the chat interface
                        function init() {
                            createUI();
                            document.querySelector('.collapse-button').addEventListener('click', () => {
                                document.querySelector('.prompt').classList.toggle('hidden');
                                const chevronIcon = document.querySelector('.collapse-button i');
                                chevronIcon.classList.toggle('fa-chevron-down');
                                chevronIcon.classList.toggle('fa-chevron-up');
                            });
                            document.querySelector('.conversation-title').addEventListener('dblclick', () => {
                                const titleElement = document.querySelector('.conversation-title');
                                titleElement.contentEditable = 'true';
                                titleElement.focus();
                            });
                            document.querySelector('.prompt').addEventListener('dblclick', () => {
                                const titleElement = document.querySelector('.prompt');
                                titleElement.contentEditable = 'true';
                                titleElement.focus();
                            });
                            document.querySelector('.conversation-title').addEventListener('keydown', (event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    const titleElement = document.querySelector('.conversation-title');
                                    titleElement.contentEditable = 'false';
                                    titleElement.blur();
                                    // Update the conversation title
                                    
                                }
                            });
                            document.querySelector('.prompt').addEventListener('keydown', (event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    const titleElement = document.querySelector('.prompt');
                                    titleElement.contentEditable = 'false';
                                    titleElement.blur();
                                    setPrompt(titleElement.textContent);
                                    // Update the conversation title
                                }
                            });
                            document.querySelector('.chat-input').addEventListener('keydown', (event) => {
                                if (event.ctrlKey && event.key === 'Enter') {
                                    const messageContent = event.target.value.trim();
                                    if (messageContent !== '') {
                                        onChatMessageSent(messageContent);
                                        onNewMessageAdded({ role: 'user', content: messageContent }); 
                                        event.target.value = '';
                                        addMessageCard('user', messageContent);
                                    }
                                }
                            });
                            renderMessages(messages);
                        }
                        // render the messages in the chat interface
                        function renderMessages(messages) {
                            const chatContainer = document.querySelector('.chat-container');
                            chatContainer.innerHTML = '';
                            messages.forEach((message) => {
                                addMessageCard(message.role, message.content);
                            });
                        }
                        init();
                    }
                    
                    const sendMessageToExtension = (data) => {
                        if(!vscodeApi) { vscodeApi = acquireVsCodeApi(); }
                        vscodeApi.postMessage({
                            command: 'chatGPT',
                            data
                        });
                    };
                
                    let isStreaming = false;
                    let currentAssistantCard;

                    function updateStreamedMessage(message) {
                        if (isStreaming === false) {
                            // If this is the start of the streamed message.
                            isStreaming = true;
                            const msg = message.response ? message.response : message;
                            const newAssistantMessage = msg;
                            messages.push(newAssistantMessage);
                            currentAssistantCard = addMessageCard(newAssistantMessage.role, newAssistantMessage.content);
                        } else {
                            // If this is the next part of the streamed message.
                            const lastMessage = messages[messages.length - 1];
                            if (lastMessage && lastMessage.role === 'assistant') {
                                lastMessage.content += message.content;
                                currentAssistantCard.querySelector('.message-content').innerHTML = window.marked.marked(lastMessage.content);
                            }
                        }
                    }

                    // create a single message card
                    function createMessageCard(role, content) {
                        const messageCard = document.createElement('div');
                        messageCard.className = 'message-card';
                        
                        const messageRole = document.createElement('div');
                        messageRole.className = 'message-role';
                        messageRole.textContent = role;
                        messageRole.addEventListener('click', () => {
                            const newRole = role === 'system' ? 'user' : role === 'user' ? 'assistant' : 'system';
                            messageRole.textContent = newRole;
                            // Update the role in the messages array
                        });
        
                        const toolbar = document.createElement('div');
                        toolbar.className = 'toolbar';
                        const moveButton = document.createElement('button');
                        moveButton.innerHTML = '^' //'<i class="fa fa-arrows-alt"></i>';
                        const archiveButton = document.createElement('button');
                        archiveButton.innerHTML = '@' //'<i class="fa fa-archive"></i>';
                        toolbar.appendChild(moveButton);
                        toolbar.appendChild(archiveButton);
        
                        const messageContent = document.createElement('div');
                        messageContent.className = 'message-content';
                        messageContent.innerHTML = window.marked.marked(content || '');
                        messageCard.appendChild(toolbar);
                        messageCard.appendChild(messageRole);
                        messageCard.appendChild(messageContent);
                        return messageCard;
                    }

                    // receive messages from extension and process them
                    window.addEventListener('message', (event) => {
                        const message = event.data;
                        const command = message.command;
                        switch (command) {

                            case 'initializeContent':
                                setDocumentTitle(message.data.title);
                                setChatMessages(message.data.messages);
                                setPrompt(message.data.prompt);
                                break;

                            case 'initializeThemeSettings':
                                document.body.style.backgroundColor = message.themeColor;
                                document.body.style.fontFamily = message.editorFontFamily;
                                break;
                                
                            case 'updateStream':
                                if(message.response) {
                                    updateStreamedMessage(message.response);
                                } else {
                                    const msg = message.data.messages[message.data.messages.length - 1];
                                    updateStreamedMessage(msg);
                                }

                            case 'finishStream':
                                isStreaming = false;
                        }
                    });

                    function setDocumentTitle(title) {
                        document.querySelector('.conversation-title').textContent = title;
                    }

                    function setChatMessages(messages) {
                        const chatContainer = document.querySelector('.chat-container');
                        chatContainer.innerHTML = '';
                        messages.forEach((message) => {
                            addMessageCard(message.role, message.content);
                        });
                    }

                    function setPrompt(prompt) {
                        document.querySelector('.prompt').textContent = prompt;
                    }

                    function createPromptSelectionModal(prompts, onSelectPrompt) {
                        const modal = document.createElement('div');
                        modal.className = 'modal';
        
                        const modalHeader = document.createElement('div');
                        modalHeader.className = 'modal-header';
        
                        const modalTitle = document.createElement('div');
                        modalTitle.className = 'modal-title';
                        modalTitle.textContent = 'Select or Create Prompt';
        
                        const closeButton = document.createElement('button');
                        closeButton.className = 'close-button';
                        closeButton.innerHTML = 'x'// '<i class="fa fa-times"></i>';
                        closeButton.addEventListener('click', () => {
                            modal.remove();
                        });
        
                        modalHeader.appendChild(modalTitle);
                        modalHeader.appendChild(closeButton);
        
                        const input = document.createElement('input');
                        input.setAttribute('list', 'promptList');
                        input.setAttribute('name', 'prompt');
                        input.className = 'dropdown';
        
                        const dataList = document.createElement('datalist');
                        dataList.setAttribute('id', 'promptList');
                        prompts.forEach(prompt => {
                            const option = document.createElement('option');
                            option.value = prompt.title;
                            dataList.appendChild(option);
                        });
        
                        const promptTextarea = document.createElement('textarea');
                        promptTextarea.className = 'prompt-textarea';
                        promptTextarea.placeholder = 'Enter or edit the prompt here...';
        
                        input.addEventListener('input', (event) => {
                            const selectedPrompt = prompts.find(prompt => prompt.title === event.target.value);
                            if (selectedPrompt) {
                                promptTextarea.value = selectedPrompt.content;
                            } else {
                                promptTextarea.value = '';
                            }
                        });
        
                        const modalFooter = document.createElement('div');
                        modalFooter.className = 'modal-footer';
        
                        const cancelButton = document.createElement('button');
                        cancelButton.className = 'modal-button';
                        cancelButton.textContent = 'Cancel';
                        cancelButton.addEventListener('click', () => {
                            modal.remove();
                        });
        
                        const selectButton = document.createElement('button');
                        selectButton.className = 'modal-button';
                        selectButton.textContent = 'Select';
                        selectButton.addEventListener('click', () => {
                            const selectedPrompt = {
                                title: input.value,
                                content: promptTextarea.value
                            };
                            onSelectPrompt(selectedPrompt);
                            modal.remove();
                        });
        
                        modalFooter.appendChild(cancelButton);
                        modalFooter.appendChild(selectButton);
        
                        modal.appendChild(modalHeader);
                        modal.appendChild(input);
                        modal.appendChild(dataList);
                        modal.appendChild(promptTextarea);
                        modal.appendChild(modalFooter);
        
                        document.body.appendChild(modal);
                    }
        
                    // prompt selection model - not implemented yet
                    const prompts = [
                        { title: 'Prompt 1', content: 'This is the content of prompt 1.' },
                        { title: 'Prompt 2', content: 'This is the content of prompt 2.' },
                        { title: 'Prompt 3', content: 'This is the content of prompt 3.' }
                    ];
        
                    createPromptSelectionModal(prompts, (selectedPrompt) => {
                        console.log('Selected prompt:', selectedPrompt);
                    });
                    
                    const messages = ${JSON.stringify(initialContent && initialContent.messages || [])};
                    createChatInterface(messages, (message) => {
                        messages.push({ role: 'user', content: message, });
                        sendMessageToExtension(messages);
                    });

                    document.addEventListener('keydown', (event) => {
                        if (event.altKey && event.key === 'Enter') {
                            // Submit the chat without the latest message
                        }
                    });
        
        
                </script>
            </body>
            </html>`;
        }

        // package the theme settings for delivery to the webview
        const themeSettings = {
            command: 'initializeThemeSettings',
            themeColor: vscode.workspace
                .getConfiguration('workbench')
                .get('colorTheme'),
            editorFontFamily: vscode.workspace  
                .getConfiguration('editor')
                .get('fontFamily'),
        };
        webviewPanel.webview.postMessage(themeSettings);

        // initialize the conversation
        webviewPanel.webview.postMessage({
            command: 'initializeContent',
            data: initialContent,
        });

        let threadId: any = undefined;
        const config = getConfiguration('puck');
        const apiKey = getOpenAIKey('puck');

        // Handle messages from the webview
        webviewPanel.webview.onDidReceiveMessage(
            async message => {
                console.log('Received message:', message); // Add console log
                switch (message.command) {
                    case 'chatGPT':
                        updateDocumentContent(document, { messages:  message.data });
                        let messages = message.data;
                        this.assistant = await getAssistant(
                            'vscode-assistant',
                            config.model,
                            threadId,
                        );
                        let latestMessage = messages[messages.length - 1].content
                        let response = await this.assistant.run(latestMessage, tools, schemas, apiKey, (event: any, message: any) => {

                        });
                        webviewPanel.webview.postMessage({
                            command: 'updateStream',
                            response: {
                                role: 'assistant',
                                content: response
                            }
                        });
                        webviewPanel.webview.postMessage({
                            command: 'finishStream',
                            response: true
                        });
                        threadId = this.assistant.thread.id;
                        break;
                    case 'updateMessages':
                        updateDocumentContent(document, { messages: message.conversation });
                        break;
                    case 'updatePrompt':
                        updateDocumentContent(document, { prompt: message.prompt });
                        break;
                    case 'updateTitle':
                        updateDocumentContent(document, { title: message.title });
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );

        // update the document with new content
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.uri.toString() === document.uri.toString()) {
                vscode.workspace.onDidChangeTextDocument((event) => {
                    if (event.document.uri.toString() === document.uri.toString()) {
                        // Handle the document change
                        const updatedData = JSON.parse(event.document.getText());
                        webviewPanel.webview.postMessage({
                            command: 'updateContent',
                            data: updatedData
                        });
                    }
                });
            }
        });
    }
}

async function updateDocumentContent(
    document: vscode.TextDocument,
    updates: {
    messages?: any[];
    prompt?: any;
    title?: string;
}) {
    // update the document content
    console.log('Updating document content:', updates); // Add console log
    // select the entire document
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
    );

    // Convert the JSON document to an object, apply the 
    // updates, and convert it back to a string
    const currentContent = JSON.parse(document.getText());
    const updatedContent = { ...currentContent, ...updates };
    const newContent = JSON.stringify(updatedContent, null, 2);

    edit.replace(document.uri, fullRange, newContent);
    await vscode.workspace.applyEdit(edit);
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(ChatEditorProvider.register(context));
    new ConversationDocumentsCommand("puck.openChatDocumentView", "Puck - Open Conversation", context);
}
 