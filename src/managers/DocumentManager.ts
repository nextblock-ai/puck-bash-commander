/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';

// utilities for managing the currently-open document
export class DocumentManager {
    // the extension context
    private context: vscode.ExtensionContext;
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public async isADocumentOpen(): Promise<boolean> {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return true;
        }
        return false;
    }

    public async getDocument(context: any): Promise<vscode.TextDocument> {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return editor.document;
        } else {
            const document = await vscode.workspace.openTextDocument(context);
            return document;
        }
    }

    // get the document's text
    public async getDocumentText(): Promise<string> {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return editor.document.getText();
        }
        return "";
    }

    // get the document's uri
    public async getDocumentUri(): Promise<vscode.Uri> {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return editor.document.uri;
        }
        return vscode.Uri.file("");
    }

    // get the document's path
    public async getDocumentPath(): Promise<string> {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return editor.document.uri.fsPath;
        }
        return "";
    }

    // get the document's language ID
    public async getDocumentLanguageId(): Promise<string> {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return editor.document.languageId;
        }
        return "";
    }

    // get the document's file name
    public async getDocumentFileName(): Promise<string> {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return editor.document.fileName;
        }
        return "";
    }

    // get the document's line count
    public async getDocumentLineCount(): Promise<number> {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return editor.document.lineCount;
        }
        return 0;
    }

    // get the document's line at a given position
    public async getDocumentLineTextAt(line: number): Promise<string> {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return editor.document.lineAt(line).text;
        }
        return "";
    }

    // get the document's line at a given position
    public async getDocumentWordRangeAt(position: vscode.Position): Promise<vscode.Range | undefined> {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return editor.document.getWordRangeAtPosition(position);
        }
        return new vscode.Range(0, 0, 0, 0);
    }

    // get the document's line at a given position
    public async getDocumentWordAt(position: vscode.Position): Promise<string> {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return editor.document.getText(editor.document.getWordRangeAtPosition(position));
        }
        return "";
    }

    // get the document's JSON
    public async getDocumentJSON(): Promise<any> {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            return JSON.parse(editor.document.getText());
        }
        return {};
    }

    // get the document's JSON
    public async insertIntoDocument(content: string) {
        return new Promise((resolve) => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                throw new Error("No active editor");
            }
            editor.edit((editBuilder) => {
                const selection = editor.selection;
                editBuilder.insert(selection.end, content);
                resolve(true);
            });
        });
    }
}