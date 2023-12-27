/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as Ohm from 'ohm-js';

export class ConversationsManager {
    private conversationsFilePath: string;

    constructor(private context: vscode.ExtensionContext) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder open');
        }
        const workspaceFolderPath = workspaceFolders[0].uri.fsPath;
        this.conversationsFilePath = path.join(workspaceFolderPath, 'conversations.json');
        this.createConversationsFileIfNotExist();
    }

    private createConversationsFileIfNotExist(): void {
        if (!fs.existsSync(this.conversationsFilePath)) {
            fs.writeFileSync(this.conversationsFilePath, JSON.stringify({ conversations: {} }));
        }
    }

    private readConversationsFile(): any {
        const content = fs.readFileSync(this.conversationsFilePath, 'utf8');
        return JSON.parse(content);
    }

    private writeConversationsFile(data: any): void {
        fs.writeFileSync(this.conversationsFilePath, JSON.stringify(data, null, 2));
    }

    async listConversations(): Promise<any[]> {
        const data = this.readConversationsFile();
        return Object.keys(data.conversations).map(slug => ({ slug }));
    }

    async createConversation(slug: string): Promise<void> {
        const data = this.readConversationsFile();
        if (data.conversations[slug]) {
            throw new Error(`Conversation with slug "${slug}" already exists`);
        }
        data.conversations[slug] = [];
        this.writeConversationsFile(data);
    }

    async clearConversation(slug: string): Promise<void> {
        const data = this.readConversationsFile();
        if (!data.conversations[slug]) {
            throw new Error(`Conversation with slug "${slug}" not found`);
        }
        data.conversations[slug] = [];
        this.writeConversationsFile(data);
    }

    async addMessageToConversation(slug: string, role: string, content: string): Promise<void> {
        const data = this.readConversationsFile();
        if (!data.conversations[slug]) {
            throw new Error(`Conversation with slug "${slug}" not found`);
        }
        data.conversations[slug].push({ role, content });
        this.writeConversationsFile(data);
    }

    async getConversationMessages(slug: string): Promise<any[]> {
        const data = this.readConversationsFile();
        if (!data.conversations[slug]) {
            throw new Error(`Conversation with slug "${slug}" not found`);
        }
        return data.conversations[slug];
    }

    async getMessagesFromString(text: string): Promise<string[]> {
        const chatConversationGrammar = `ChatConversation {
            ChatMessages=(ChatMessage)*
            ChatMessage=(Delimiters Title)
            Title=(~(Delimiters) any)+
            Delimiters=(System|User|Assistant)
            System="🌐"
            User="👤"
            Assistant="🤖"
        }`;

        const chatConversationGrammarOhm = Ohm.grammar(chatConversationGrammar);
        const _chatConversationGrammarSemantics = chatConversationGrammarOhm
        .createSemantics()
        .addOperation("toJSON", {
            _iter: function(...children) {
                return children.map(function(child) {
                    return child.toJSON();
                });
            },
            ChatMessages: function(messages) { return messages.toJSON(); },
            ChatMessage: function(delimiters, titles) {
                return {
                    role: delimiters.toJSON(),
                    content: titles.sourceString.trim(),
                };
            },
            Title: function(title) { return title.sourceString; },
            Delimiters: function(delimiters) { return delimiters.sourceString; },
            System: function(_: any) { return 'system'; },
            User: function(_: any) { return 'user'; },
            Assistant: function(_: any) { return 'assistant'; },
        });

        const match = chatConversationGrammarOhm.match(text);
        if (match.failed()) {
            return [];
        }
        return _chatConversationGrammarSemantics(match).toJSON();
    }
}