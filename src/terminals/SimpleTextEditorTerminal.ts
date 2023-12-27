/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-case-declarations */
import * as vscode from "vscode";
import { ConversationsManager } from "../managers/ConversationsManager";
import { EventEmitter } from "stream";
import { DocumentManager } from "../managers/DocumentManager";
import { handleChatMessage } from "../commands/SubmitChatCommand";

const persomDelimiter = "👤";
const assistantDelimiter = "🤖";
const systemDelimiter = "🌐";
function roleToDelim(role: string) {
    if(role === 'system') { return systemDelimiter; }
    if(role === 'assistant') { return assistantDelimiter; }
    if(role === 'user') { return persomDelimiter; }
}

export class SimpleTextEditorTerminal implements vscode.Pseudoterminal {

    // TODO: CHange the simple terminal to just query openai directly rather than posting a message to the host. There's no need to do that since we can just query the API directly.
    // TODO: Change the terminal tracks up to ten ongoing conversations using the conversation manager. the numbers 0-9 are used to switch between conversations
    // the users uses the key combination ctrl+0-9 to switch between conversations.when the user hits ctrl+0-9, the terminal sends a message to the host with the conversation number

    // write and close events for the terminal
    private readonly _onDidWrite = new vscode.EventEmitter<string>();
    private readonly _onDidClose = new vscode.EventEmitter<void>();
    onDidWrite: vscode.Event<string> = this._onDidWrite.event;
    onDidClose: vscode.Event<void> = this._onDidClose.event;

    private _eventEmitter = new EventEmitter();
    private _currentPrompt = "You are a helpful assistant.";
    private _editPromptMode = false;
    private _savedBuffer: string[] = [];
    private _buffer: string[] = [""];
    private _x = 0;
    private _y = 0;
    private _dimensions: vscode.TerminalDimensions | undefined;

    private _spinner = {
        interval: 100,
        frames: ['䷀','䷫','䷠','䷋','䷓','䷖','䷁','䷗','䷒','䷊','䷡','䷪'],
        currentFrame: 0,
        handle: null,
        color_index: 0,
    };

    public readonly _ansiColors = {
        reset: "\u001b[0m",
        red: "\u001b[31m",
        green: "\u001b[32m",
        yellow: "\u001b[33m",
        blue: "\u001b[34m",
        magenta: "\u001b[35m",
        cyan: "\u001b[36m",
        white: "\u001b[37m",
    };

    public conversationSettings = {
        model: 'gpt-4',
        temperature: 0.9,
        max_tokens: 2048,
        top_p: 1,
        messages: []
    };

    constructor(
        public conversationManager: ConversationsManager, 
        public documentManager: DocumentManager) {  }

    // show a conversation in the active editor
    async showConversation(conversationSlug: string) {

        // get the messages for the conversation
        const msgs = await this.conversationManager.getConversationMessages(
            conversationSlug
        );

        // if there's no currently active document, we create one. If the currently
        // active document is dirty, we create a new one
        const editor = this.createEditorIfNeeded(conversationSlug);

        // we insert the messages into the document
        editor.edit((editBuilder: any) => {
            // TODO: ensure that the messages are inserted with the right emoji prefixes
            editBuilder.insert(new vscode.Position(0, 0), msgs.join("\n"));
        });

    }

    open(initialDimensions: vscode.TerminalDimensions): void {
        this._dimensions = initialDimensions;
        const adhocPrompt = vscode.workspace.getConfiguration().get("puck.adhocChat.adhocPrompt") as string;
        this._currentPrompt = adhocPrompt || this._currentPrompt
 
            
        this.renderText();
    }

    close(): void {
        this._onDidClose.fire();
    }

    createEditorIfNeeded(conversationSlug: string) {
        // if there's no currently active document, we create one. If the currently
        // active document is dirty, we create a new one
        let editor: any = vscode.window.activeTextEditor;
        if (!editor || editor.document.isDirty) {
            editor = vscode.window.showTextDocument(
                vscode.Uri.parse(`untitled:Chat Conversation ${conversationSlug}.chat`),
                { preview: false }
            );
        }
        return editor;
    }

    handleResize(dimensions: vscode.TerminalDimensions): void {
        this._dimensions = dimensions;
        // Handle any required changes due to the new dimensions,
        // such as reformatting text or adjusting cursor positions.
        this.updateTerminal();
    }

    async handleInput(data: string): Promise<void> {
        const keyCode = data.charCodeAt(0);
        switch (keyCode) {
            case 15: // Ctrl+O
                if (this._editPromptMode) {
                    this.exitEditPromptMode(true);
                }
                break;
            case 16: // Escape sequence
                this.enterEditPromptMode();
                break;
            case 27: // Escape sequence
                if (this._editPromptMode) {
                    this.exitEditPromptMode(false);
                    return;
                }
                this.handleEscapeSequence(data);
                break;
            case 0x0d: // Enter
                await this.handleEnter();
                break;
            case 0x7f: // Backspace
                this.handleBackspace();
                break;
            default:
                this.handleCharacterInput(data);
        }
    }

    async processMessages(
        conversationSlug: string,
        command: string,
        message: string,
        prompt: string
    ) {
        switch (command) {
            case "chatMessage":
                 // create an editor if needed.
                await this.createEditorIfNeeded(conversationSlug);
                // Handle chatMessage command
                await this.handleChatMessage(prompt, message);
                break;
            case "listPrompts":
                // Handle listPrompts command
                break;
            case "newPrompt":
                // Handle newPrompt command
                break;
            case "updatePrompt":
                // Handle updatePrompt command
                break;
            case "deletePrompt":
                // Handle deletePrompt command
                break;
            default:
                break;
        }
    }

    private async handleChatMessage(prompt: string, message: string): Promise<void> {
        await handleChatMessage(
            this.documentManager,
            this.conversationManager,
            prompt, 
            message);
    }

    private handleEscapeSequence(data: string): void {
        // Handle arrow key navigation
        if (data.startsWith("\x1b[")) {
            const command = data.slice(2);
            switch (command) {
                case "A":
                    this.moveCursor(0, -1);
                    break; // Up
                case "B":
                    this.moveCursor(0, 1);
                    break; // Down
                case "C":
                    this.moveCursor(1, 0);
                    break; // Right
                case "D":
                    this.moveCursor(-1, 0);
                    break; // Left
            }
        }
    }

    private handleCharacterInput(data: string): void {
        const newX = this._x + data.length;
        this._buffer[this._y] =
            this._buffer[this._y].substring(0, this._x) +
            data +
            this._buffer[this._y].substring(newX);
        this.moveCursor(data.length, 0);
        this.renderText();
    }

    private handleBackspace(): void {
        this.renderText();
        if (this._x === 0 && this._y === 0) {
            return;
        }
        if (this._x === 0) {
            const currentLine = this._buffer.splice(this._y, 1)[0];
            this._y--;
            this._x = this._buffer[this._y].length;
            this._buffer[this._y] += currentLine;
        } else {
            this._buffer[this._y] =
                this._buffer[this._y].substring(0, this._x - 1) +
                this._buffer[this._y].substring(this._x);
            this.moveCursor(-1, 0);
        }
    }

    private moveCursor(dx: number, dy: number): void {
        this._x += dx;
        this._y += dy;
        this._x = Math.max(0, Math.min(this._x, this._buffer[this._y].length));
        this._y = Math.max(0, Math.min(this._y, this._buffer.length - 1));
        this.updateTerminal();
    }

    private updateTerminal(): void {
        this._onDidWrite.fire(`\x1b[${this._y + 1};${this._x + 1}H`);
        this.renderText();
    }

    public handleClick(x: number, y: number): void {
        this._x = x;
        this._y = y;
        this.updateTerminal();
    }

    private async handleEnter(): Promise<void> {
        const message = this._buffer.join("\n");
        this.clearBuffer();
        this.renderText();
        await this.processMessages("1", "chatMessage", message, this._currentPrompt);
    }

    private clearBuffer(): void {
        this._buffer = [""];
        this._x = 0;
        this._y = 0;
    }

    private renderText(): void {
        const text = this._buffer.join("\n");
        this._onDidWrite.fire(`\x1b[2J\x1b[0;0H${text}`);
    }

    startSpinner() {
        (this._spinner as any).handle = setInterval(() => {
            this._onDidWrite.fire(
                `\r${this._spinner.frames[this._spinner.currentFrame]}`,
            );
            this._spinner.currentFrame =
                (this._spinner.currentFrame + 1) % this._spinner.frames.length;
        }, this._spinner.interval);
    }

    stopSpinner() {
        if (this._spinner.handle) {
            clearInterval(this._spinner.handle);
            this._spinner.handle = null;
            this._onDidWrite.fire(
                "\r" + " ".repeat(this._spinner.frames.length) + "\r"
            );
        }
    }

    public colorize(data: string, color = "green"): string {
        // check its a valid color
        if (!(this._ansiColors as any)._ansiColors[color]) {
            color = "green";
        }
        return (this._ansiColors as any)[color] +
            data.replace(/\n/g, "\r\n") +
            this._ansiColors.reset;
    }

    // Add a method to subscribe to the event emitter
    onMessageToHost(callback: (message: any) => void) {
        this._eventEmitter.on("messageToHost", callback);
    }

    public handleMessageFromHost(_message: any): void {
        // if (message.command === 'chatMessageReceived') {
        //
        // }
    }

    private enterEditPromptMode(): void {
        if (this._editPromptMode) {
            return;
        }
        this._editPromptMode = true;
        this._savedBuffer = this._buffer.slice();
        this._buffer = [this._currentPrompt];
        this._x = this._buffer[0].length;
        this._y = 0;
        this.renderText();
    }

    private exitEditPromptMode(save: boolean): void {
        if (!this._editPromptMode) {
            return;
        }
        if (save) {
            this._currentPrompt = this._buffer[0];
            vscode.workspace
                .getConfiguration()
                .update("currentadhocChatPrompt", this._currentPrompt, true);
        }
        this._editPromptMode = false;
        this._buffer = this._savedBuffer.slice();
        this._x = 0;
        this._y = 0;
        this.renderText();
    }
}
