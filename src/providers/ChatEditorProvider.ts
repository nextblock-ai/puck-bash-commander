// uses the HTML view at ./webview/index.html to replicate the chat page view in the openai beta playground to display chat documents.
import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { getOpenAIKey } from '../configuration';
import { Command } from '../utils/Command';

export class ChatEditorProvider implements vscode.CustomTextEditorProvider {
    
    /**
     * register the chat editor provider
     * @param context 
     * @returns 
     */
    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new ChatEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider('chatEditor', provider);
        return providerRegistration;
    }

    constructor(
        public readonly context: vscode.ExtensionContext
    ) { }

    /**
     * get the nonce for the webview
     * @param resource 
     * @returns 
     */
    getNonce() {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    
    /**
     * resolve the custom text editor
     * @param document 
     * @param webviewPanel 
     * @param token 
     * @returns 
     */
    getHtmlForWebview(webview: vscode.Webview): string {
        // get all the uris for the webview
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'styles.css'));
        const markedUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources/js', 'marked.min.js'));
        const highlightUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources/js', 'highlight.min.js'));
        const highlightCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources/css', 'highlight.min.css'));
        const normalizeUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources/css', 'normalize.css'));
        const fontAwesomeUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources/css', 'font-awesome.min.css'));
        const html = fs.readFileSync(path.join(this.context.extensionPath, 'webview', 'index.html'), 'utf8');
        return html
            .replace(/{{nonce}}/g,  this.getNonce())
            .replace(/{{scriptUri}}/g, scriptUri.toString())
            .replace(/{{styleUri}}/g, styleUri.toString())
            .replace(/{{markedUri}}/g, markedUri.toString())
            .replace(/{{highlightUri}}/g, highlightUri.toString())
            .replace(/{{highlightCssUri}}/g, highlightCssUri.toString())
            .replace(/{{normalizeUri}}/g, normalizeUri.toString())
            .replace(/{{fontAwesomeUri}}/g, fontAwesomeUri.toString());
    }

    /**
     * resolve the custom text editor
     * @param document 
     * @param webviewPanel 
     * @param token 
     * @returns 
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {
        // set the webview options
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri)
            ]
        };
        // set the webview html
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
        let docContent = document.getText(); 
        let initialDocument = {
            messages: [],
            prompt: 'You are a helpful assistant. You output all content using markdown formatting. When outputting files, you always include the filename prior to the file contents.',
            title: 'New Conversation',
            scripts: [],
        };
        try {
            // parse the document content
            initialDocument = JSON.parse(docContent);
        } catch (e) {
            // log an error if the document content could not be parsed
            console.log(e);
            vscode.window.showErrorMessage('Could not parse chat document. Setting to default.');
            docContent = JSON.stringify(initialDocument, null, 4);
            this.edit(document, {
                start: 0,
                end: docContent.length,
                text: docContent
            });
        }
        // set the theme settings
        const themeSettings = {
            themeColor: vscode.workspace
                .getConfiguration('workbench')
                .get('colorTheme'),
            editorFontFamily: vscode.workspace  
                .getConfiguration('editor')
                .get('fontFamily'),
        };
        webviewPanel.webview.postMessage({
            command: 'initializeThemeSettings',
            data: themeSettings,
        });
        const apiKey = await getOpenAIKey
        webviewPanel.webview.postMessage({
            command: 'setApiKey',
            data: apiKey
        });
        // the update webview method
        const updateWebview = () => {
            try {
                initialDocument = JSON.parse(docContent);
                webviewPanel.webview.postMessage({
                    command: 'setDocument',
                    data: initialDocument,
                });
            }
            catch (e) {
                console.log(e);
                vscode.window.showErrorMessage('Could not parse chat document. Setting to default.');
                this.edit(document, {
                    start: 0,
                    end: docContent.length,
                    text: docContent
                });
            }
        }
        updateWebview();
        // update the webview when the document is changed
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });
        webviewPanel.onDidDispose(() => changeDocumentSubscription.dispose() );
        webviewPanel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) { 
                    case 'submitConversation':
                        // send the query to the openai api
                        //await updateDocumentContent(document, message.data);
                        return;
                }
            },
            undefined,
            this.context.subscriptions
        );        
    }

    /**
     * get the hash of the document
     * @param doc 
     * @returns 
     */
    private async getHash(doc: string): Promise<string> {
        const hash = crypto.createHash('sha256');
        hash.update(doc);
        return hash.digest('hex');
    }

    /**
     * edit the document
     * @param document 
     * @param edit 
     */
    private edit(document: vscode.TextDocument, edit: { start: number, end: number, text: string }): void {
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.replace(document.uri, new vscode.Range(
            document.positionAt(edit.start),
            document.positionAt(edit.end)
        ), edit.text);
        vscode.workspace.applyEdit(workspaceEdit);
    }

}

/**
 * open a new chat document
 */
class ConversationDocumentsCommand extends Command {
    constructor(commandId: string, title: string, context: vscode.ExtensionContext) {
        super(commandId, title, context);
    }
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

/**
 * update the document content
 * @param document 
 * @param updates 
 */
export async function updateDocumentContent(
    document: vscode.TextDocument,
    updates: {
        messages?: any[];
        prompt?: any;
        title?: string;
        temperature?: number;
        maxTokens?: number;
        topP?: number;
        scripts?: any[];
    }) {
    // update the document content
    console.log('Updating document content:', updates); 

    // select the entire document
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
    );

    // Convert the JSON document to an object, apply the pdates, and convert it back to a string
    const currentContent = JSON.parse(document.getText());
    const updatedContent = { ...currentContent, ...updates };
    const newContent = JSON.stringify(updatedContent, null, 2);

    // apply the edit and save the document
    edit.replace(document.uri, fullRange, newContent);
    await vscode.workspace.applyEdit(edit);
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(ChatEditorProvider.register(context));
    const command = new ConversationDocumentsCommand("puck.openChatDocumentView", "Puck - Open Conversation", context);
} 
 