/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { Command } from "../utils/Command";

const fs = require('fs');
const path = require('path');

const { Assistant, Thread, loadNewPersona } = require( '@nomyx/assistant');
const { tools, schemas } = require('../tools/index');

function colorText(text: string, colorIndex: number): string {
	let output = '';
	for (let i = 0; i < text.length; i++) {
		const char = text.charAt(i);
		if (char === ' ' || char === '\r' || char === '\n') {
			output += char;
		} else {
			output += `\x1b[3${colorIndex}m${text.charAt(i)}\x1b[0m`;
		}
	}
	return output;
}

let threadId: any = undefined;

import process from 'process';
import readline from 'readline';
import { getOpenAIKey } from "../configuration";

interface SpinnerConfig {
    title: string;
    interval: number;
    frames: string[];
}

export class Spinner {
    private title: string;
    private interval: number;
    private frames: string[];
    private currentIndex: number = 0;
    private timer: NodeJS.Timeout | null = null;
	private writeEmitter: any;

    constructor(writeEmitter: any, config: SpinnerConfig) {
        this.title = config.title;
        this.interval = config.interval;
        this.frames = config.frames;
		this.writeEmitter = writeEmitter;
    }

    public setTitle(newTitle: string) {
        this.title = newTitle;
    }

    public start(): void {
        this.stop();
        this.timer = setInterval(() => {
            const frame = this.frames[this.currentIndex];
            this.renderFrame(frame);
            this.currentIndex = (this.currentIndex + 1) % this.frames.length;
        }, this.interval);
    }

    public stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            readline.clearLine(process.stdout, 0); // Clear the line
            readline.cursorTo(process.stdout, 0); // Move the cursor to the beginning of the line
            this.writeEmitter.fire('\n'); // Move the cursor to the next line
        }
    }

    private renderFrame(frame: string) {
        readline.clearLine(process.stdout, 0); // Clear the entire line
        readline.cursorTo(process.stdout, 0); // Move the cursor to the beginning of the line
        this.writeEmitter.fire(`${frame} ${this.title}\r`); // Write the frame and title
    }

    public success(message?: string): void {
        this.persist('✔', message);
    }

    public error(message?: string): void {
        this.persist('✘', message);
    }

    private persist(icon: string, message?: string): void {
        this.stop();
        this.writeEmitter.fire(`${icon} ${message || ''}\n`); // Write the message to stdout with an icon and start a new line
    }
}

export default class PuckREPLCommand extends Command {

	working = false;
	terminal: vscode.Terminal | undefined;
	pty: any;
	history: string[] = [];
	writeEmitter: vscode.EventEmitter<string>;
	private spinner: Spinner;
	private assistant: any;
	projectRoot: string | undefined;

	constructor(commandId: string, title: string, context: any) {

		super(commandId, title, context);

		// add a button to the status bar
		const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
		button.text = 'Bash Commander';
		button.command = commandId;
		button.show();
		
		let line = '';
		const we = this.writeEmitter = new vscode.EventEmitter<string>();
		this.spinner = new Spinner(this.writeEmitter, {
			title: "loading",
			interval: 120,
			frames: [
				"䷀",
				"䷁",
				"䷂",
				"䷃",
				"䷄",
				"䷅",
				"䷆",
				"䷇",
				"䷈",
				"䷉",
				"䷊",
				"䷋",
				"䷌",
				"䷍",
				"䷎",
				"䷏",
				"䷐",
				"䷑",
				"䷒",
				"䷓",
				"䷔",
				"䷕",
				"䷖",
				"䷗",
				"䷘",
				"䷙",
				"䷚",
				"䷛",
				"䷜",
				"䷝",
				"䷞",
				"䷟",
				"䷠",
				"䷡",
				"䷢",
				"䷣",
				"䷤",
				"䷥",
				"䷦",
				"䷧",
				"䷨",
				"䷩",
				"䷪",
				"䷫",
				"䷬",
				"䷭",
				"䷮",
				"䷯",
				"䷰",
				"䷱",
				"䷲",
				"䷳",
				"䷴",
				"䷵",
				"䷶",
				"䷷",
				"䷸",
				"䷹",
				"䷺",
				"䷻",
				"䷼",
				"䷽",
				"䷾",
				"䷿"
			]
		  });
		this.projectRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

		this.pty = {

			onDidWrite: we.event,
			open: () => {
				we.fire('Bash Commander v0.0.4.\r\n\r\n> ')
			},
			close: () => { /* noop*/ },
			handleInput: async (data: string) => {

				// ctrl + c interrupts everything
				if (data === '\x03') {
					this.interrupt();
					line = '';
					return;
				}

				// if we are working then we can't do anything
				if (this.working) {
					return;
				}

				// if this is a carriage return then we need to execute the command
				if (data === '\r') { // Enter
					this.history.push(line);
					if (line === 'clear') {
						we.fire('\x1b[2J\x1b[3J\x1b[;H');
						line = '';
						return;
					}
					we.fire(`\r\n`);
					this.working = true;
					await this.handleInput(line);
					line = '';
					return;
				}

				if (data === '\x7f') { // Backspace
					if (line.length === 0) {
						return;
					}
					line = line.substr(0, line.length - 1);
					// Move cursor backward
					we.fire('\x1b[D');
					// Delete character
					we.fire('\x1b[P');
					return;
				}

				// arrow up
				if (data === '\x1b[A') {
					if (this.history.length === 0) {
						return;
					}
					if (this.history.length === 1) {
						line = this.history[0];
					} else {
						line = this.history[this.history.length - 2];
					}
					we.fire('\x1b[2K');
					we.fire('\r> ' + line);
					return;
				}

				// arrow down
				if (data === '\x1b[B') {
					if (this.history.length === 0) {
						return;
					}
					line = this.history[this.history.length - 1];
					we.fire('\x1b[2K');
					we.fire('\r> ' + line);
					return;
				}

				line += data;
				we.fire(data);
			},
		};
	}
	interrupt() {
		const we = this.writeEmitter;
		if (this.working) {
			we.fire('\r\n');
			we.fire('KeyboardInterrupt\r\n');
			this.working = false;
		} else {
			we.fire('^C\r\n');
			we.fire('KeyboardInterrupt\r\n');
			we.fire('> ');
		}
	}
	async handleInput(line: string) {
		this.projectRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		this.spinner.start();

		const { getOpenAIKey, getConfiguration } = require('../configuration');

		const apiKey = getOpenAIKey('puck');
		const config = getConfiguration('puck');

		const getAssistant = async (
			name: string = 'vscode-assistant', 
			model: string = 'gpt-4-1106-preview',
			persona: string = 'puck',
			threadId: string | undefined = undefined
			): Promise<any> => {
			if(persona === 'puck') persona = await loadNewPersona(tools);
			const _getAssistant = async (threadId: any) => {
				const assistants = await Assistant.list(apiKey);
				let assistant = assistants.find((a: any) => a.name === name);
				if (!assistant) {
					assistant = await Assistant.create(
						name,
						await loadNewPersona(tools),
						schemas,
						model,
						threadId
					);
					return assistant;
				}
				threadId && (assistant.thread = await Thread.get(threadId));
				return assistant;
			}
			return await _getAssistant(threadId);
		}

		const assistant = await getAssistant(
			'vscode-assistant',
			config.model,
			await loadNewPersona(schemas),
			threadId,
		);
		let response = await assistant.run(line, tools, schemas, apiKey, (event: any, message: any) => {
			this.writeEmitter.fire(event + '\r\n');
		});
		// replace \n with \r\n
		response = response && response.replace(/\n/g, '\r\n');
		this.writeEmitter.fire(response + '\r\n');
		threadId = assistant.thread.id;

		this.spinner.stop();
		this.writeEmitter.fire('> ');
		this.working = false;
	}
	processCtrlC() {
		if (this.working) {
			this.spinner.stop();
			this.writeEmitter.fire('\r\n');
			this.writeEmitter.fire('KeyboardInterrupt\r\n');
			this.working = false;
		} else {
			this.writeEmitter.fire('^C\r\n');
			this.writeEmitter.fire('KeyboardInterrupt\r\n');
			this.writeEmitter.fire('> ');
		}
	}
	clear() {
		this.writeEmitter.fire('\x1b[2J\x1b[3J\x1b[;H');
	}

	async execute() {
		const terminal = (vscode.window as any).createTerminal({ name: `Bash Commander`, pty: this.pty });
		if (terminal) {
			terminal.show();
			return;
		}
	}

	async processCommand(command: string) {
		// call the executeCommand call
		const result = await vscode.commands.executeCommand(command);
		if (result) {
			this.terminal?.sendText(result.toString());
		}
	}
}
