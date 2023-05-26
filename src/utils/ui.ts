import * as blessed from 'blessed';
import * as vscode from 'vscode';

export class TextualUI {
    public screen: blessed.Widgets.Screen;
    public inputBuffer: blessed.Widgets.BoxElement;
    public actionStatus: blessed.Widgets.BoxElement;
    public openTasks: blessed.Widgets.BoxElement;
    public closedTasks: blessed.Widgets.BoxElement;
    public commandHistory: blessed.Widgets.BoxElement;
    public stdoutScrollPanel: blessed.Widgets.ScrollableBoxElement;
    public userInputArea: blessed.Widgets.TextareaElement;

    constructor(public emitter: vscode.EventEmitter<string>) {
        this.screen =  blessed.screen({
            smartCSR: true,
            fullUnicode: true,
            emitter,
        });
        const appTitle = blessed.box({
            top: 0,
            left: 0,
            width: '100%',
            height: 1,
            content: ' AI-Powered Task Execution System ',
            border: 'line',
            style: {
                fg: 'white',
                bg: 'blue',
                border: {
                    fg: 'blue',
                },
            },
        });

        this.inputBuffer = blessed.box({
            top: 2,
            left: 0,
            width: '25%',
            height: '25%',
            content: ' Input Buffer ',
            border: 'line',
        });

        this.actionStatus = blessed.box({
            top: 2,
            left: '25%',
            width: '25%',
            height: '25%',
            content: ' Action Status ',
            border: 'line',
        });

        this.openTasks = blessed.box({
            top: 2,
            left: '50%',
            width: '25%',
            height: '25%',
            content: ' Open Tasks ',
            border: 'line',
        });

        this.closedTasks = blessed.box({
            top: 2,
            left: '75%',
            width: '25%',
            height: '25%',
            content: ' Closed Tasks ',
            border: 'line',
        });

        this.commandHistory = blessed.box({
            top: '30%',
            left: '25%',
            width: '25%',
            height: '30%',
            content: ' Command History ',
            border: 'line',
            style: {
                fg: 'white',
                bg: 'black',
            },
        });

        this.stdoutScrollPanel = blessed.box({
            top: '30%',
            left: 0,
            width: '100%',
            height: '45%',
            content: ' stdout scrolling panel ',
            border: 'line',
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                ch: ' ',
            },
            style: {
                fg: 'white',
                bg: 'black',
            },
        });

        this.userInputArea = blessed.textarea({
            top: '75%',
            left: 0,
            width: '100%',
            height: '15%',
            content: ' User multiline input area ',
            inputOnFocus: true,
            border: 'line',
            style: {
                fg: 'white',
                bg: 'blue',
            },
        });

        if(this.screen !== undefined) {
            this.screen.append(appTitle);
            this.screen.append(this.inputBuffer);
            this.screen.append(this.actionStatus);
            this.screen.append(this.openTasks);
            this.screen.append(this.closedTasks);
            this.screen.append(this.commandHistory);
            this.screen.append(this.stdoutScrollPanel);
            this.screen.append(this.userInputArea);
        }
        this.setKeyEventHandlers();
    }

    private setKeyEventHandlers() {
        this.userInputArea && this.userInputArea.on('submit', (text: string) => {
            this.commandHistory && this.commandHistory.setContent((this.commandHistory && this.commandHistory.getContent() || '') + '\n' + text);
            this.screen && this.screen.render();
        });
        this.userInputArea && this.userInputArea.key('C-enter', () => {
            this.userInputArea && this.userInputArea.submit();
        });
    }

    public run() {
        this.userInputArea && this.userInputArea.focus();
        this.screen && this.screen.render();
    }
}
