/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { Command } from "../utils/Command";
import { getSemanticAgent } from "../utils/core";

function createProjectFileTree(projectRoot: string) {
	const fs = require('fs');
	const path = require('path');
	const walk = (dir: string, tree: any) => {
		const files = fs.readdirSync(dir);
		files.forEach((file: string) => {
			const fpath = path.join(dir, file);
			const stats = fs.statSync(fpath);
			if (stats.isDirectory()) {
				tree[file] = {};
				walk(fpath, tree[file]);
			} else {
				tree[file] = null;
			}
		});
	};
	const tree: any = {};
	walk(projectRoot, tree);
	return tree;
}

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

class AnimatedTerminalBar {
    private static readonly BAR_LENGTH = 20;
    private static readonly BAR_CHAR = '█';
    spinner: any = { interval: 50, handle: null };

    constructor(public emitter: vscode.EventEmitter<string>) { }

    private getGradientColor(index: number): number {
        return (index % 6) + 1;
    }

    private colorText(text: string, offset = 0): string {
        let output = '';
        const total = text.length;
        for (let i = 0; i < total; i++) {
            const char = text.charAt(i);
            if (char === ' ' || char === '\r' || char === '\n') {
                output += char;
            } else {
                const colorIndex = this.getGradientColor(i + offset);
                output += `\x1b[3${colorIndex}m${text.charAt(i)}\x1b[0m`;
            }
        }
        return output;
    }

    private getBar(offset: number) {
        const bar = AnimatedTerminalBar.BAR_CHAR.repeat(AnimatedTerminalBar.BAR_LENGTH);
        return this.colorText(bar, offset);
    }

    public start() {
        let offset = 0;
        this.spinner.handle = setInterval(() => {
            const bar = this.getBar(offset);
            this.emitter.fire('\r' + bar);
            offset = (offset + 1) % (AnimatedTerminalBar.BAR_LENGTH * 6);
        }, this.spinner.interval);
        return () => clearInterval(this.spinner.handle);
    }

    public stop() {
        if (this.spinner.handle) {
            clearInterval(this.spinner.handle);
            this.spinner.handle = null;
            this.emitter.fire('\r' + ' '.repeat(AnimatedTerminalBar.BAR_LENGTH) + '\r\n');
        }
    }
}


export default class PuckREPLCommand extends Command {

	working = false;
	terminal: vscode.Terminal | undefined;
	pty: any;
	history: string[] = [];
	writeEmitter: vscode.EventEmitter<string>;
	sps: any;
	private bar: AnimatedTerminalBar;
	projectRoot: string | undefined;


	_spinner = {
		interval: 150,
		frames: [
			"🕐",
			"🕑",
			"🕒",
			"🕓",
			"🕔",
			"🕕",
			"🕖",
			"🕗",
			"🕘",
			"🕙",
			"🕚",
			"🕛",
			"🕜",
			"🕝",
			"🕞",
			"🕟",
			"🕠",
			"🕡",
			"🕢",
			"🕣",
			"🕤",
			"🕥",
			"🕦"
		],
		currentFrame: 0,
		handle: null,
	};

	constructor(commandId: string, title: string, context: vscode.ExtensionContext) {

		super(commandId, title, context);

		let line = '';
		const we = this.writeEmitter = new vscode.EventEmitter<string>();
		this.bar = new AnimatedTerminalBar(we);
		this.projectRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

		this.pty = {

			onDidWrite: we.event,
			open: () => {
				we.fire('Bash Commander v0.0.4.\r\n\r\n>>')
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
					we.fire(`\r\n${colorText(line, 1)}\r\n\n`);
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
					we.fire('\r>> ' + line);
					return;
				}

				// arrow down
				if (data === '\x1b[B') {
					if (this.history.length === 0) {
						return;
					}
					line = this.history[this.history.length - 1];
					we.fire('\x1b[2K');
					we.fire('\r>> ' + line);
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
			we.fire('>> ');
		}
	}
	async handleInput(line: string) {
		this.projectRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		this.sps = await getSemanticAgent(this.writeEmitter);
		this.bar.start();
		const fileTree = createProjectFileTree(this.projectRoot || '');
		this.sps.messages.push({ role: 'user', content: '📮 ' + line, });
		this.sps.messages.push({ role: 'user', content: '🌳 ' + Object.keys(fileTree).join('\n'), });
		this.sps.projectRoot = this.projectRoot;
		await this.sps.execute();
		for(const message of this.sps.result) {
			this.writeEmitter.fire(message + '\r\n');
		}
		this.bar.stop();
		this.writeEmitter.fire('>> ');
		this.working = false;
	}
	startSpinner() {
		const s = this._spinner;
		(s as any).handle = setInterval(() => {
			this.writeEmitter.fire(`\r${s.frames[s.currentFrame++]}`);
			s.currentFrame %= s.frames.length;
		}, s.interval);
	}
	stopSpinner() {
		const s = this._spinner;
		if (s.handle) {
			clearInterval(s.handle);
			s.handle = null;
			this.writeEmitter.fire("\r" + " ".repeat(s.frames.length) + "\r");
		}
	}
	processCtrlC() {
		if (this.working) {
			this.stopSpinner();
			this.writeEmitter.fire('\r\n');
			this.writeEmitter.fire('KeyboardInterrupt\r\n');
			this.working = false;
		} else {
			this.writeEmitter.fire('^C\r\n');
			this.writeEmitter.fire('KeyboardInterrupt\r\n');
			this.writeEmitter.fire('>> ');
		}
	}
	clear() {
		this.writeEmitter.fire('\x1b[2J\x1b[3J\x1b[;H');
	}

	async execute() {
		const terminal = vscode.window.createTerminal({ name: `Bash Commander`, pty: this.pty });
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
