/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';

import { Readable, Writable } from 'stream';

export class PseudoTerminalReadable extends Readable {
    private pty: any;
    constructor(pty: any) {
        super();
        this.pty = pty;
        this.pty.onDidWrite((data: any) => {
            this.push(data);
        });
    }
    _read() {
        // Required method for Readable, but PseudoTerminals handle data events automatically
    }
}

export class PseudoTerminalWritable extends Writable {
    private pty: any;
    constructor(pty: any) {
        super();
        this.pty = pty;
    }
    _write(chunk: any, encoding: any, callback: () => void) {
        this.pty.handleInput(chunk.toString());
        callback();
    }
}

export class CustomPseudoTerminal {
    public _onDidWrite: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
    public _onDidClose: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();

    public readonly onDidWrite: vscode.Event<string> = this._onDidWrite.event;
    public readonly onDidClose: vscode.Event<void> = this._onDidClose.event;

    private _buffer = "";
    private _motd = "Custom Terminal 0.0.1 - enter a shell command\r\n";
    private _prompt = "$ ";
    private _dimensions: vscode.TerminalDimensions | undefined;
    private _inputResolver: ((value: string) => void) | null = null;

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

    private _spinner = {
        interval: 100,
        frames: ['䷀', '䷫', '䷠', '䷋', '䷓', '䷖', '䷁', '䷗', '䷒', '䷊', '䷡', '䷪'],
        currentFrame: 0,
        handle: null,
    };

    constructor() {

        this._onDidWrite = new vscode.EventEmitter();
        this.onDidWrite = this._onDidWrite.event;
        this._onDidClose = new vscode.EventEmitter();
        this.onDidClose = this._onDidClose.event;

    }

    get motd() {
        return this._motd;
    }
    set motd(motd: string) {
        this._motd = motd;
    }

    startSpinner() {
        (this._spinner as any).handle = setInterval(() => {
            this._onDidWrite.fire(
                `\r${this._spinner.frames[this._spinner.currentFrame]}`
            );
            this._spinner.currentFrame =
                (this._spinner.currentFrame + 1) % this._spinner.frames.length;
        }, this._spinner.interval);
    }

    stopSpinner() {
        if (this._spinner.handle) {
            clearInterval(this._spinner.handle);
            this._spinner.handle = null;
            this._onDidWrite.fire("\r" + " ".repeat(this._spinner.frames.length) + "\r");
        }
    }

    open(initialDimensions: vscode.TerminalDimensions | undefined): void {
        // Initialize your LLM here, connect to it or start it
        this._onDidWrite.fire(this._motd);

        // Show the prompt when the terminal is opened
        this._onDidWrite.fire(this._prompt);

        this._dimensions = initialDimensions;
    }

    close() {
        // Close or disconnect from the LLM
    }

    async handleInput(data: string) {
        if (data === "\r" || data === "\n") {
            if (this._inputResolver) {
                this._inputResolver(this._buffer);
                this._inputResolver = null;
            } else {
                // When the user presses Enter, process the input and clear the buffer
                this._onDidWrite.fire('\r\n');
                if (this._buffer.trim() === 'clear') {
                    this.clearScreen();
                    return;
                }
                let response = await this.processResponse(this._buffer);
                if (response) {
                    response = response.replace(/\n/g, '\r\n');
                    this._onDidWrite.fire(response);
                } else {
                    this._onDidWrite.fire('\r\n');
                }
                this._onDidWrite.fire('\r\n' + this._prompt);
            }
            this._buffer = "";
        }
        else if (data === "\x7F") { // ASCII code for the delete key
            // Remove the last character from the buffer
            if (this._buffer.length > 0) {
                this._buffer = this._buffer.slice(0, -1);
                // Move cursor one step back and clear the character at that position
                this._onDidWrite.fire("\x1B[D \x1B[D");
            }
        }
        else {
            // Add the incoming data to the buffer
            this._buffer += data;
            this._onDidWrite.fire(data);
        }
    }

    async processResponse(response: string) {
        return response;
    }

    private clearScreen(): void {
        const clearScreenAnsiSequence = '\u001B[2J\u001B[0;0H';
        this._onDidWrite.fire(clearScreenAnsiSequence);
        this._onDidWrite.fire(this._prompt);
    }

    async prompt(message: string): Promise<string> {
        return new Promise((resolve) => {
            this._inputResolver = resolve;
            this._onDidWrite.fire(message);
        });
    }

    public output(data: string, color = "green"): void {
        // check its a valid color
        if (!(this._ansiColors as any)._ansiColors[color]) {
            color = "green";
        }
        const coloredResponse = (this._ansiColors as any)[color] + data.replace(/\n/g, '\r\n') + this._ansiColors.reset;
        this._onDidWrite.fire(coloredResponse);
    }

    public error(data: string): void {
        this.output(data, "red");
    }

    public info(data: string): void {
        this.output(data, "cyan");
    }

    public warn(data: string): void {
        this.output(data, "yellow");
    }

    public success(data: string): void {
        this.output(data, "green");
    }

    public log(data: string): void {
        this.output(data);
    }

    public reset(): void {
        this.stopSpinner();
        this.clearScreen();
    }

    public dispose(): void {
        this._onDidClose.fire();
        this._onDidWrite.dispose();
        this._onDidClose.dispose();
    }

}



