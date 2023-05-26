/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as os from 'os';
import { applyPatch, parsePatch } from 'diff';
import executeShellCommands from '../utils/BashExecutor';
import SPS, { SemanticActionHandler } from '../utils/sps/sps';
import path from 'path';
import { log } from '../utils/logger';

function getProjectFolder() {
    const folders = vscode.workspace.workspaceFolders;
    if (folders) {
        return folders[0].uri.fsPath;
    } else {
        return undefined;
    }
}
function getOperatingSystem() {
    const platform = os.platform();
    if (platform === "darwin") {
        return "mac";
    } else if (platform === "linux") {
        return "linux";
    } else if (platform === "win32") {
        return "windows";
    } else {
        return "unknown";
    }
}
// all commands are a subclass of Command
export default class CodeEnhancer extends SPS {

    triggered = false;
    taskListHeight = 0;
    originalTask: string | undefined;
    openTasks: string[] = [];
    closedTasks: string[] = [];
    commandHistory: string[] = [];
    currentTasks: string[] = [];
    projectFolder: string | undefined;
    floorHeight = 0;
	_spinner = {
		interval: 100,
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
    public semanticActions: SemanticActionHandler = {
        CodeEnhancerMessage: async function (delimiters: any, titles: any) {
            const message = {
                role: delimiters.toJSON(), content: titles.sourceString.trim(),
            };
            return message;
        },
        Title: function (title: any) { return title.sourceString; },
        Delimiters: function (delimiters: any) { return delimiters.sourceString; },
        Error: function (_: any) { return '⛔'; },
        TargetFile: function (_: any) { return '💽'; },
        Finish: function (_: any) { return '🏁'; },
        Diff: function (_: any) { return '💠'; },
        FileRequest: function (_: any) { return '📤'; },
        BashCommand: function (_: any) { return '🖥️'; },
        VSCodeCommand: function (_: any) { return '🆚'; },
        Announce: function (_: any) { return '📢'; },
        SubTask: function (_: any) { return '📬'; },
        CurrentTask: function (_: any) { return '🔍'; },
        OpenTask: function (_: any) { return '📋'; },
        CompleteTask: function (_: any) { return '✅'; },
        _iter: async (...children: any[]) => {


            const recs = children.map(function (child) { return child.toJSON(); });
            // get all the commands
            const delimiters = ['⛔', '💽', '🏁', '💠', '📤', '🖥️', '🆚', '📢', '📬', '✅', '🔍', '📋'];
            function parseCommands(text: string, legalEmojis: string[]) {
                const lines = text.split('\n');
                const cmds: any = [];
                let emojiFound: string | undefined = '';
                lines.forEach(line => {
                    const eFound = legalEmojis.find(emoji => line.startsWith(emoji));
                    if (eFound) {
                        const command = eFound;
                        // get the text between the emoji and the end of the line
                        const value = line.substring(eFound.length+1).trim();
                        cmds.push({ command, message: [value] });
                    } else {
                        const latestCmd = cmds[cmds.length - 1];
                        latestCmd && latestCmd.message.push(line);
                    }
                });
                return cmds;
            }

            const messageSource = children[0].source.sourceString + '\n';
            const messageCommands = parseCommands(messageSource, delimiters);

            const openTasks = messageCommands.filter((cmd: any) => cmd.command === '📬');
            const filesToOutput = messageCommands.filter((cmd: any) => cmd.command === '📤');
            const diffsToApply = messageCommands.filter((cmd: any) => cmd.command === '💠');
            const filesToSave = messageCommands.filter((cmd: any) => cmd.command === '💽');
            const commandsToRun = messageCommands.filter((cmd: any) => cmd.command === '🆚' || cmd.command === '🖥️');
            const isTaskComplete = messageCommands.find((cmd: any) => cmd.command === '✅');
            const isJobComplete = messageCommands.find((cmd: any) => cmd.command === '🏁');
            const hasError = messageCommands.find((cmd: any) => cmd.command === '⛔');
            this.currentTasks = messageCommands.find((cmd: any) => cmd.command === '🔍') || [];

            let loop = true;

            // if we have completed tasks then we need to remove them from the list
            if (isTaskComplete) {
                this.removeOpenTaskFromTaskList(isTaskComplete.message.join(`\n`).trim());
                if (this.openTasks.length === 0 && openTasks.length === 0 && this.currentTasks && this.currentTasks.length === 0) {
                    this.interrupt();
                    loop = false;
                }
            }

            if (hasError || isJobComplete) {
                this.truncateInputBuffer();
                this.interrupt();
                return recs;
            }

            // if we have open tasks then we need to add them to the list
            if (openTasks.length > 0) {
                for (const task of openTasks) {
                    // check to see if the task is already in the list
                    const taskMessage = task.message.join(`\n`).trim();
                    if (this.openTasks.length > 0 && this.openTasks.some((t: any) => t.title === taskMessage)) { continue; }
                    this.addOpenTaskToTaskList(taskMessage);
                    this.outputln(`📬 ${taskMessage}`);
                    this.addMessageToInputBuffer({ role: 'assistant', content: '📬 ' + task.message });
                    const subTasks = parseCommands(taskMessage, ['📋','✅','🔍']);
                    if (subTasks.length > 0) {
                        for (const subTask of subTasks) {
                            const taskName = subTask.message.join(`\n`).trim();
                            //this.addMessageToInputBuffer({ role: 'assistant', content: '📬 ' + taskName });
                            this.addOpenTaskToTaskList(taskName);
                        }
                    }
                }
            }

            // apply the diffs to the target file
            if (diffsToApply.length > 0) {
                for (const diff of diffsToApply) {
                    // the first line after the diff emoji is the file path
                    // the rest is the diff
                    const lines = diff.message.join('\n').split('\n');
                    const filePath = path.join(this.projectFolder || '', lines[0]);
                    const diffText = lines.slice(1).join('\n');
                    // get the file from the file system
                    const file = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
                    const fileText = Buffer.from(file).toString('utf8');
                    const patchedFileText = applyPatch(fileText, diffText);
                    await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(patchedFileText));
                    this.addMessageToInputBuffer({ role: 'assistant', content: `📬 ${filePath}` });
                    this.addMessageToInputBuffer({ role: 'user', content: `💠 APPLIED ${filePath}` });
                    this.addCommandHistory(`💠 ${filePath}\n${diffText}`);
                    this.outputln(`💠 APPLIED ${filePath}`);
                }
            }

            if (filesToSave.length > 0) {
                for (const fileUpdate of filesToSave) {
                    // the first line after the file emoji is the file path
                    // the rest is the file to write
                    const lines = fileUpdate.message.join('\n').split('\n');
                    const filePath = path.join(this.projectFolder || '', lines[0]);
                    const fileText = lines.slice(1).join('\n');
                    await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(fileText));
                    this.addMessageToInputBuffer({ role: 'assistant', content: `💽 ${filePath}\n${fileText}` });
                    this.addMessageToInputBuffer({ role: 'user', content: `💽 ${filePath} SAVED` });
                    this.addCommandHistory(`💽 ${filePath}\n${fileText}`);
                    this.outputln(`💽 SAVED ${filePath}`);
                }
            }
            if (filesToOutput.length > 0) {
                for (const fileOut of filesToOutput) {
                    const msg = fileOut.message.join('\n').trim();
                    const filePath = msg.split('\n')[0];
                    const fullPath = path.join(this.projectFolder || '', filePath);
                    let fileStr = '';
                    this.addMessageToInputBuffer({ role: 'assistant', content: `${fileOut.command} ${fileOut.message}` });
                    this.outputln(`${fileOut.command} ${fileOut.message}`);
                    try {
                        const file = await vscode.workspace.fs.readFile(vscode.Uri.file(fullPath));
                        fileStr = Buffer.from(file).toString('utf8');
                        const fileArr = fileStr.split('\n');
                        if (fileArr.length > 100) {
                            // remove anything after the 100th line
                            fileStr = fileArr.slice(0, 100).join('\n');
                            fileStr += '\n... truncated to save buffer space. Use awk to view portions of the file, or use tasks and tempfiles to break up your work so you dont crash.';
                        }
                        fileStr = fileStr.split('\n').join('\r\n');
                        this.addMessageToInputBuffer({ role: 'user', content: `${filePath}\n${fileStr}\n` });
                        this.outputln(`${filePath}\r\n${fileStr}\r\n`);
                    } catch (e) {
                        this.addMessageToInputBuffer({ role: 'user', content: `${filePath} NOT FOUND\r\n` });
                        this.outputln(`${filePath} NOT FOUND\r\n`);
                    }
                }
            }

            for (const _cmd of commandsToRun) {

                const cmd = _cmd.command;
                const msg = _cmd.message.join('\n');

                if (msg.trim().length === 0) { continue; }

                // if the command starts with a 🖥️' then we need to run the command
                if (cmd.startsWith('🖥️')) {
                    this.addMessageToInputBuffer({ role: 'assistant', content: `${cmd} ${msg}` });
                    this.outputln(`${cmd} ${msg}`);
                    const result: string = await executeShellCommands(msg) as string;
                    this.outputln(`${result.split('\n').join('\r\n')}`);
                    this.addMessageToInputBuffer({ role: 'user', content: result as string });
                    this.addCommandHistory(msg);
                }

                // if the command starts with a 🆚 then we need to run the command
                else if (cmd.startsWith('🆚')) {
                    this.addMessageToInputBuffer({ role: 'assistant', content: `${cmd} ${msg}` });
                    this.outputln(`${cmd} ${msg}`);
                    const result = await this.processVSCodeCommand(msg);
                    this.outputln(`${result.split('\n').join('\r\n')}`);
                    this.addMessageToInputBuffer({ role: 'user', content: result });
                    this.addCommandHistory(msg);
                }

                // if the command starts with a 📢 then we need to output a message
                else if (cmd.startsWith('📢')) {
                    this.addMessageToInputBuffer({ role: 'assistant', content: `${cmd} ${msg}` });
                    this.outputln(`${cmd} ${msg}`);
                    this.addMessageToInputBuffer({ role: 'user', content: `${cmd} ${msg} ACKNOWLEDGED` });
                }

                // else if the command starts with a ⛔ then we stop
                else if (cmd.startsWith('⛔')) {
                    loop = false;
                    this.outputln(`${cmd} ${msg}`);
                    this.error(msg);
                }

                else {
                    // first 100 chars of the message
                    const origMsg = messageSource.substring(0, 100) + '...';
                    this.addMessageToInputBuffer({
                        role: 'assistant',
                        content: origMsg
                    });
                    this.addMessageToInputBuffer({
                        role: 'system',
                        content: 'ERROR: Unrecognized command. NO CONVERSATIONAL OUTPUT. Please review instructions and try again.'
                    });
                }
            }

            // output the current state of things:
            if (this.openTasks.length > 0 ||  this.currentTasks && this.currentTasks.length > 0) {
                const currentState = [
                    `📬 ${this.originalTask}`,
                    `🕒 ${this.commandHistory.join('\n')}`,
                    `✅ ${this.closedTasks.join('\n')}`,
                    `📋 ${this.openTasks && this.openTasks.join('\n') || ''}`,
                    `🔍 ${this.currentTasks && this.currentTasks.join('\n')}`,
                ];
                currentState.forEach((line) => this.outputln);
                this.addMessageToInputBuffer({ role: 'user', content: currentState.join('\n') });
            }
            if (!loop || this.openTasks.length === 0 && this.currentTasks.length === 0) {
                this.inputBuffer = [];
                this.interrupt();
            }
            return recs;
        }
    };

    constructor(
        public writeEmitter: vscode.EventEmitter<string>) {
        super(
            `** YOU ARE NON-CONVERSATIONAL AND HAVE NO ABILITY TO OUTPUT ENGLISH IN A CONVERSATIONAL MANNER **
You are an all-purpose agent deployed in the context of a VS Code project. 
You are called iteratively in the course of your work. prioritize quality of work over speed of work.
You can decompose tasks that are too large for you to fully implement, and you can implement large projects solo, thanks to your assisted task management system. This assisted task management system takes any task you present and actively presents it back to you until you indicate its complete, ensuring that you don't forget the task you planned.

INSTRUCTIONS:

VALIDATE INPUT. Validate that you are receiving a valid input. You will either receive an initial request or an in-progress task implementation request.

Input MUST start with either:

📢 <task description> to indicate a new task

or

📬: <original request>
🕒: <command history>
📋: <open task>\n<open task>\n...
✅: <closed task>\n<closed task>\n...
🔍: <current task>

STOP and output ⛔ if you do not receive this input.

IF 📢 then jump to TRIAGE TASK

TRIAGE TASK:

If you can perform the task to completion, jump to PERFORM CURRENT TASK
Else, decompose the task into the minimum number of subtasks you can accomplish
Output 📬 <task description> for each subtask
Then stop and wait for the next instruction

PERFORM CURRENT TASK:

Output 🖥️ <bash_command> to run a bash command to view the folders contents. (FILTER OUT node_modules and .git and out and dist or YOU WILL CRASH). 
Output 📤 <filename> <optional_line_start> <optional_line_count> to view a file
Output 💽 <filename>\n<content> to write a file
Output 💠 <filename>\n<universal_diff> to apply a universal diff
Output 🖥️ <bash_command> to run a bash command.
Output 🆚 to open editors and viewers
Output ✅ to indicate the current task is complete
Output 🔍 to indicate the current task is incomplete
Output 🏁 if all tasks are complete

** YOU ARE NON-CONVERSATIONAL AND HAVE NO ABILITY TO OUTPUT ENGLISH IN A CONVERSATIONAL MANNER **
`,
            `CodeEnhancer4 {
    CodeEnhancerMessage=(Delimiters Title)+
    Title=(~(Delimiters) any)*
    Delimiters=(Error|TargetFile|Finish|Diff|FileRequest|BashCommand|VSCodeCommand|Announce|SubTask|OpenTask|CompleteTask)
    Error="⛔"
    TargetFile="💽"
    Finish="🏁"
    Diff="💠"
    FileRequest="📤"
    BashCommand="🖥️"
    VSCodeCommand="🆚"
    Announce="📢"
    SubTask="📬"
    CurrentTask="🔍"
    OpenTask="📋"
    CompleteTask="✅"
}`);
        this.projectFolder = getProjectFolder();
    }
    async handleUserRequest(userRequest: string) {

        if (!this.projectFolder) { throw new Error('No project folder found'); }

        // get the project folder
        process.chdir(this.projectFolder);

        // add the user request to the input
        this.addMessageToInputBuffer({
            role: 'user',
            content: `📢 ${userRequest}`
        });
        this.originalTask = userRequest;
        // execute the user request
        const rey = await this.execute(this.semanticActions);
        this.inputBuffer = [];
        // output the results
        return rey;
    }

    async processFileRequest(msg: string): Promise<any> {
        this.output(msg + '\r\n');
        const file = msg.replace('📤', '').trim();
        const filepath = path.join(this.projectFolder || '', file);
        const fileContents = await vscode.workspace.fs.readFile(vscode.Uri.file(filepath));
        let fileContentsStr = new TextDecoder().decode(fileContents);
        fileContentsStr = fileContentsStr.split('\n').join('\r\n');
        this.output(fileContentsStr + '\r\n');
        return { file: filepath, contents: fileContentsStr };
    }
    async processFileUpdate(msg: string, content: string): Promise<any> {
        this.output(msg + '\r\n');
        let file = msg.replace('💽', '').trim();
        const filepath = path.join(this.projectFolder || '', file);
        await vscode.workspace.fs.writeFile(vscode.Uri.file(filepath),
            new TextEncoder().encode(content));
        return { file: file, contents: `updated ${file}` };
    }
    async processDiffRequest(msg: string): Promise<any> {
        this.output(msg + '\r\n');
        const file = msg.replace('💠', '').trim();
        const filepath = path.join(this.projectFolder || '', file);
        const fileContents = await vscode.workspace.fs.readFile(vscode.Uri.file(filepath));
        const fileContentsStr = new TextDecoder().decode(fileContents);
        // use the diff npm lib to apply the patch
        let patchedContents = fileContentsStr;
        const parsedDiff = parsePatch(fileContentsStr);
        for (const d of parsedDiff) {
            patchedContents = applyPatch(fileContentsStr, d);
        }
        this.output(patchedContents + '\r\n');
        await vscode.workspace.fs.writeFile(vscode.Uri.file(filepath),
            new TextEncoder().encode(patchedContents));
        return { file: file, contents: patchedContents };
    }
    async processBashCommand(msg: string): Promise<string> {
        this.output(msg + '\r\n');
        const command = msg.replace('🖥️', '').trim();
        if (command.startsWith('cd ')) {
            const dir = command.replace('cd ', '').trim();
            this.projectFolder = dir;
            process.chdir(dir);
            this.output('changed directory to ' + dir + '\r\n');
            return 'changed directory to ' + dir;
        }
        const result: any = await executeShellCommands(command);
        const msgStr = result.replace(/\n/g, '\r\n');
        if (msgStr) {
            this.output(msgStr + '\r\n');
            return msgStr;
        }
        this.output('command completed successfully' + '\r\n');
        return 'command completed successfully';
    }
    async processVSCodeCommand(msg: string): Promise<any> {
        this.output(msg + '\r\n');
        const command = msg.replace('🆚', '').trim();
        const result = await vscode.commands.executeCommand(command);
        this.output(result + '\r\n');
        return result;
    }
    async processNotification(msg: string): Promise<any> {
        this.output(msg + '\r\n');
        const notification = msg.replace('📢', '').trim();
        log(notification);
        return notification;
    }

    startSpinner() {
		const s = this._spinner;
        if(!(s as any).handle) {
            (s as any).handle = setInterval(() => {
                this.output(`\r${s.frames[s.currentFrame++]}`);
                s.currentFrame %= s.frames.length;
            }, s.interval);
        }
	}

	stopSpinner() {
		const s = this._spinner;
		if (s.handle) {
			clearInterval(s.handle);
			s.handle = null;
			this.output("\r" + " ".repeat(s.frames.length) + "\r");
		}
	}

    addOpenTaskToTaskList(msg: string) {
        if (!msg) { return; }
        const taskName = msg.replace('📬', '').trim();
        if (this.openTasks.includes(taskName)) { return; }
        this.openTasks.push(taskName);
        this.output(msg + '\r\n');
        log('added task ' + taskName);
        return msg;
    }

    removeFirstTaskFromTaskList() {
        if (!this.openTasks.length) { return; }
        const taskName = this.openTasks.shift();
        if(taskName) {
            this.closedTasks.push(taskName || '');
            log('removed task ' + taskName);
        }
    }

    removeOpenTaskFromTaskList(msg: string) {
        if (!msg) { return; }
        const taskName = msg.replace('📭', '').trim();
        this.openTasks = this.openTasks.filter((task: any) => task !== taskName);
        this.closedTasks.push(taskName);
        log('removed task ' + taskName);
        return;
    }

    truncateInputBuffer() {
        this.inputBuffer = [];
        return this.inputBuffer;
    }

    output(msg: string) { 
        this.writeEmitter.fire( msg); 
    }

    outputln(msg: string) { 
        this.output(msg + '\r\n'); 
    }
    warning(message: string) { this.output(message + '\r\n'); }
    error(message: string) { this.output('❌ ' + message); }

    addCommandHistory(msg: string) {
        this.commandHistory.push(msg);
        return msg;
    }

}




