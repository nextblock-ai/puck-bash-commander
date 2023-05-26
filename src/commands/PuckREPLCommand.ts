/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import * as blessed from "blessed";
import { Command } from "../utils/Command";
import CodeEnhancer from "../agents/coder";
import { TextualUI } from "../utils/ui";

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
	spinner: any = {
		interval: 150,
		handle: null,
	};
	constructor(public emitter: vscode.EventEmitter<string>) { }
	private getColor(colorIndex: number, colorRange: number, startColor: number[]) {
		const color = startColor.map((c, i) => {
			const range = colorRange / startColor.length;
			const colorValue = c + colorIndex + i * 2;
			return colorValue > 255 ? 255 : colorValue;
		});
		return `rgb(${color.join(',')})`;
	}
	private colorText(text: string, colorIndex: number): string {
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
	private getBar(colorIndex: number, colorRange: number, startColor: number[]) {
		const color = this.getColor(colorIndex, colorRange, startColor);
		const bar = AnimatedTerminalBar.BAR_CHAR.repeat(AnimatedTerminalBar.BAR_LENGTH);
		return this.colorText(bar, colorIndex);
	}
	public start() {
		let colorIndex = 0;
		const colorRange = 256;
		const startColor = [0, 0, 0];
		this.spinner.handle = setInterval(() => {
			const bar = this.getBar(colorIndex, colorRange, startColor);
			this.emitter.fire('\r' + bar);
			colorIndex = (colorIndex + 1) % colorRange;
		}, 100);
		return () => clearInterval(this.spinner.interval);
	}
	public stop() {
		if (this.spinner.handle) {
			clearInterval(this.spinner.handle);
			this.spinner.handle = null;
			this.emitter.fire('\r' + ' '.repeat(AnimatedTerminalBar.BAR_LENGTH) + '\r\n');
		}
	}
}


class BlessedTerminal implements vscode.Pseudoterminal {

	private writeEmitter = new vscode.EventEmitter<string>();
	onDidWrite: vscode.Event<string> = this.writeEmitter.event;
	handleInput = this.writeEmitter.fire;
	private semanticPrompt: CodeEnhancer;
	private ui: TextualUI;
	private bar: AnimatedTerminalBar;

	constructor() {
		this.ui = new TextualUI(this.writeEmitter);
		this.semanticPrompt = new CodeEnhancer(this.writeEmitter);
		this.bar = new AnimatedTerminalBar(this.writeEmitter);
	}

	open(initialDimensions: vscode.TerminalDimensions | undefined): void {
		this.ui.screen.key(['C-c'], () => {
			this.ui.screen.destroy();
			this.writeEmitter.dispose();
		});

		this.ui.run();
		// this.ui.screen.append(blessed.box({
		// 	top: 'center',
		// 	left: 'center',
		// 	width: '50%',
		// 	height: '50%',
		// 	content: 'Hello {bold}world{/bold}!',
		// 	tags: true,
		// 	border: {
		// 		type: 'line'
		// 	},
		// 	style: {
		// 		fg: 'white',
		// 		bg: 'magenta',
		// 		border: {
		// 			fg: '#f0f0f0'
		// 		},
		// 		hover: {
		// 			bg: 'green'
		// 		}
		// 	}
		// }));
	}

	close(): void {
		this.ui.screen.destroy();
	}
	// Other methods to implement
}


export default class PuckREPLCommand extends Command {

	working = false;
	terminal: vscode.Terminal | undefined;
	pty: any;
	history: string[] = [];
	writeEmitter: vscode.EventEmitter<string>;
	sps: any;
	ui: TextualUI;
	private bar: AnimatedTerminalBar;
		

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

		this.ui = new TextualUI(we);
		this.bar = new AnimatedTerminalBar(we);

		this.pty = {

			onDidWrite: we.event,
			open: () => {
				// we.fire('Bash Commander v0.0.3.\r\n\r\n>>')
				this.ui.run();
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
					we.fire('\r>>> ' + line);
					return;
				}

				// arrow down
				if (data === '\x1b[B') {
					if (this.history.length === 0) {
						return;
					}
					line = this.history[this.history.length - 1];
					we.fire('\x1b[2K');
					we.fire('\r>>> ' + line);
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
			we.fire('>>> ');
		}
	}
	async handleInput(line: string) {
		this.sps = new CodeEnhancer(this.writeEmitter);
		this.bar.start();
		const result = await this.sps.handleUserRequest(line);
		this.bar.stop();
		this.writeEmitter.fire(result);
		this.writeEmitter.fire('>>> ');
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
			this.writeEmitter.fire('>>> ');
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
