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
    } else if (platform === "linux") { return "linux";
    } else if (platform === "win32") { return "windows";
    } else { return "unknown";
    }
}
// all commands are a subclass of Command
export default class CodeEnhancer9 extends SPS {

    triggered = false;
    taskListHeight = 0;
    openTasks: string[] = [];
    commandHistory: string[] = [];
    projectFolder: string | undefined;
    floorHeight = 0;

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
        OpenTask: function (_: any) { return '📬'; },
        CompleteTask: function (_: any) { return '📭'; },
        _iter: async (...children: any[]) => {
    
    
            const recs = children.map(function (child) { return child.toJSON(); });
            // get all the commands
            const delimiters = ['⛔', '💽', '🏁', '💠', '📤', '🖥️', '🆚', '📢', '📬', '📭'];
            function parseCommands(text: string, legalEmojis: string[]) {
                const lines = text.split('\n');
                const cmds: any = [];
                let emojiFound: string | undefined = '';
                lines.forEach(line => {
                    const eFound = legalEmojis.find(emoji => line.startsWith(emoji));
                    if (eFound) {
                        emojiFound = eFound;
                        const value = line.replace(eFound, '').trim();
                        cmds.push({ command: emojiFound, message: [ value ] });
                    } else {
                        const latestCmd = cmds[cmds.length - 1];
                        latestCmd.message.push(line);
                    }
                });
                return cmds;
            }
            const messageSource = children[0].source.sourceString;
            const messageCommands = parseCommands(messageSource, delimiters);
            const openTasks = messageCommands.filter((cmd: any) => cmd.command === '📬');
            const completeTasks = messageCommands.filter((cmd: any) => cmd.command === '📭');
            const messageDiffs = messageCommands.filter((cmd: any) => cmd.command === '💠');
            const fileUpdates = messageCommands.filter((cmd: any) => cmd.command === '💽');
    
            // if we have completed tasks then we need to remove them from the list
            if (completeTasks.length > 0) {
                if (this.taskListHeight !== 0) {
                    this.truncateInputBuffer();
                }
                for (const task of completeTasks) {
                    const taskMsg = task.message.join('\n').trim();
                    this.removeOpenTaskFromTaskList(taskMsg);
                    this.addMessageToInputBuffer({ role: 'assistant', content: `📭 ${task.message}` });
                    this.addMessageToInputBuffer({ role: 'user', content: `📭 ${task.message} COMPLETED` });
                    this.outputln(`📭 ${task.message} COMPLETED`);
                }
            }
    
            // if we have open tasks then we need to add them to the list
            if (openTasks.length > 0) {
                this.taskListHeight++;
                for (const task of openTasks) {
                    // check to see if the task is already in the list
                    const taskMessage = task.message.join(`\n`).trim();
                    if (this.openTasks.length > 0 && this.openTasks.some((t: any) => t.title === taskMessage)) { continue; }
                    this.addOpenTaskToTaskList(taskMessage);
                    this.addMessageToInputBuffer({ role: 'assistant', content: `📬 ${taskMessage}` });
                    this.addMessageToInputBuffer({ role: 'user', content: `📬 ${taskMessage} ADDED` });
                    this.outputln(`📬 ${taskMessage}`);
                }
            }
            
            // apply the diffs to the target file
            if(messageDiffs.length > 0) {
                for (const diff of messageDiffs) {
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
                    this.outputln(`💠 APPLIED ${filePath}`);
                }
            }
    
            if(fileUpdates.length > 0) {
                for (const fileUpdate of fileUpdates) {
                    // the first line after the file emoji is the file path
                    // the rest is the file to write
                    const lines = fileUpdate.message.join('\n').split('\n');
                    const filePath = path.join(this.projectFolder || '', lines[0]);
                    const fileText = lines.slice(1).join('\n');
                    await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(fileText));
                    this.addMessageToInputBuffer({ role: 'assistant', content: `💽 ${filePath}\n${fileText}` });
                    this.addMessageToInputBuffer({ role: 'user', content: `💽 ${filePath} SAVED` });
                    this.outputln(`💽 SAVED ${filePath}`);
                }
            }
    
            // now we need to filter out the open and closed tasks from the message commands
            const filteredMessageCommands = messageCommands.filter((cmd: any) => !['📬', '📭', '💽', '💠', '🏁'].includes(cmd.command));
            // if(filteredMessageCommands.length === 0) {
            //     //this.outputln(`🏁 ${messageSource}`);
            //     return;
            // }
    
            let loop = true;
            for (const _cmd of filteredMessageCommands) {
    
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
    
                // if the command starts with a 📤 then we need to output a file
                else if (cmd.startsWith('📤')) {
                    const filePath = msg.split('\n')[0];
                    // get the rest of the lines from msg
                    if(msg.length > 1) { // we treat anything after the first line as info from the ai
                        const restOfLines = msg.split('\n').slice(1).join('\n').trim();
                        if(restOfLines.length > 0) {
                            this.addMessageToInputBuffer({ role: 'assistant', content: `${cmd} ${restOfLines}` });
                            this.addMessageToInputBuffer({ role: 'user', content: `📬 ${restOfLines}` });
                            return;
                        }
                    }
                    const projectFolder = this.projectFolder;
                    const fullPath = path.join(this.projectFolder || '', filePath);
                    let fileStr = '';
                    this.addMessageToInputBuffer({ role: 'assistant', content: `${cmd} ${msg}` });
                    this.outputln(`${cmd} ${msg}`);
                    try {
                        const file = await vscode.workspace.fs.readFile(vscode.Uri.file(fullPath));
                        fileStr = Buffer.from(file).toString('utf8');
                        const fileArr = fileStr.split('\n');
                        if(fileArr.length > 50) {
                            // remove anything after the 100th line
                            fileStr = fileArr.slice(0, 50).join('\n');
                            fileStr += '\n... truncated to save buffer space. Use awk to view portions of the file, or use tasks and tempfiles to break up your work so you dont crash.';
                        }
                        fileStr = fileStr.split('\n').join('\r\n');
                        this.addMessageToInputBuffer({ role: 'user', content: `💼 ${filePath}\n${fileStr}\n` });
                        this.outputln(`💼 ${filePath}\r\n${fileStr}\r\n`);
                    } catch (e) {
                        this.addMessageToInputBuffer({ role: 'user', content: `💼 ${filePath} NOT FOUND\r\n` });
                        this.outputln(`💼 ${filePath} NOT FOUND\r\n`);
                    }
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
    
            // look for a finish command
            const finish = messageCommands.filter((cmd: any) => cmd.command === '🏁');
            if (finish.length > 0) {
                if (this.openTasks.length === 0) {
                    loop = false;
                    return;
                } else {
                    completeTasks.push({
                        command: '📭',
                        message: this.openTasks[0]
                    });
                    // remove the task from the list
                    this.removeOpenTaskFromTaskList(this.openTasks[0]);
                }
            }
            if(finish.length === 0 && this.openTasks.length === 0 && filteredMessageCommands.length === 0) {
                loop = false;
            }
            // the current task is the first task in the list
            if (this.openTasks.length > 0) {
                this.sendOpenTasksStatus();
                return;
            }
            if(!loop) {
                this.inputBuffer = [];
                this.interrupt();
            }
            return recs;
        }
    };

    constructor(
        public context: vscode.ExtensionContext,
        public writeEmitter: vscode.EventEmitter<string>) {
        super( 
            `** YOU ARE NON-CONVERSATIONAL AND HAVE NO ABILITY TO OUTPUT ENGLISH IN A CONVERSATIONAL MANNER **
You are an all-purpose agent deployed in the context of a VS Code project. 
You are called iteratively in the course of your work. prioritize quality of work over speed of work.
You can decompose tasks that are too large for you to fully implement, and you can implement large projects solo, thanks to your assisted task management system.

When given a request, follow these steps:
1. Start by reading the instructions prefixed with 📢. If you see 📬, or 💼 instead, jump to step 4.
2. Review the necessary code/files you need to complete the task:
    - Output 📤 <file path> for each required file you want to view. 
    - Output 🖥️ <bash command> (${getOperatingSystem()} COMMANDS ONLY) for getting the list of all files in the project (FILTER OUT node_modules and .git and out and dist or YOU WILL CRASH). 
    - Output 🆚 <command> to run a vscode api command like vscode.openFolder or vscode.openTextDocument. NEVER require the user to deal with file save dialogs or other vscode ui elements.
    - Use additional bash commands (sed, grep, cat, awk, curl) if needed. Use touch to create files.
    - prefer 📤 over 🖥️ over 🆚. Use 🆚 to open editors and viewers.
3. If the task can be performed completely, create a task by outputting 📬 <task title>
    Once you have output the task, 
    stop and wait for a user response. 
    REMEMBER, NO CONVERSATIONAL OUTPUT.

4. Read the instructions prefixed with 📬, 📢. If you see 📢, jump to step 1. If the conversation doesn't start with any of these, output ⛔ and stop.
5. If the task is too large to fully implement, decompose it into the smallest number of subtasks that you can implement.
    - Output 📬 <task> for each subtask.
    - Make sure you decompose into the smallest possible number of subtasks. 
    Then, wait for a user response. You will be presented with your open tasks, your current task, your completed tasks, and your command history.

6. For each bug/enhancement/subtask: fix the bug, perform the enhancement, or accomplish the subtask. REMEMBER, NO CONVERSATIONAL OUTPUT. Use the following commands:
    - to output a new version of a file, use 💽 <file path>, a newline, and the entire file contents. You can create files this way too.
    - to output a universal diff of a file, use 💠 <file path>, a newline, and the universal diff of the file.
    - to run a command, use 🖥️ <bash command> (${getOperatingSystem()} COMMANDS ONLY)
    - Output 🆚 <command> to run a vscode api command. Use 🆚 to open editors and viewers.
    WHEN YOU COMPLETE A TASK:
    - ALWAYS OUTPUT 📭 <task>
    - Then output 🏁 <message> and wait for a user response.

7. Once all tasks are done, output 🏁 and wait for a user response.
8. Communicate informational messages to the user by outputting 📢 followed by the message.
9. Always output a command on its own line, followed by a newline.
REMEMBER, NO CONVERSATIONAL OUTPUT.
`,  
`CodeEnhancer4 {
    CodeEnhancerMessage=(Delimiters Title)+
    Title=(~(Delimiters) any)*
    Delimiters=(Error|TargetFile|Finish|Diff|FileRequest|BashCommand|VSCodeCommand|Announce|OpenTask|CompleteTask)
    Error="⛔"
    TargetFile="💽"
    Finish="🏁"
    Diff="💠"
    FileRequest="📤"
    BashCommand="🖥️"
    VSCodeCommand="🆚"
    Announce="📢"
    OpenTask="📬"
    CompleteTask="📭"
}`);
        this.projectFolder = getProjectFolder();
    }
	async handleUserRequest(userRequest: string) {
		
        if(!this.projectFolder) { throw new Error('No project folder found'); }

        // get the project folder
		process.chdir(this.projectFolder);
        
        // add the user request to the input
        this.addMessageToInputBuffer({
            role: 'user',
            content: `📢 ${userRequest}`
        });

        // execute the user request
        return await this.execute(this.semanticActions);
    }

    async processFileRequest (msg: string): Promise<any> {
        this.writeEmitter.fire(msg+'\r\n');
        const file = msg.replace('📤', '').trim();
        const filepath = path.join(this.projectFolder || '', file);
        const fileContents = await vscode.workspace.fs.readFile(vscode.Uri.file(filepath));
        let fileContentsStr = new TextDecoder().decode(fileContents);
        fileContentsStr = fileContentsStr.split('\n').join('\r\n');
        this.writeEmitter.fire(fileContentsStr+'\r\n');
        return { file: filepath, contents: fileContentsStr };
    }
    async processFileUpdate(msg: string, content: string): Promise<any>  {
        this.writeEmitter.fire(msg+'\r\n');
        let file = msg.replace('💽', '').trim();
        file = file.replace('🧩', '').trim();
        const filepath = path.join(this.projectFolder || '', file);
        await vscode.workspace.fs.writeFile(vscode.Uri.file(filepath), 
            new TextEncoder().encode(content));
        return { file: file, contents: `updated ${file}` };
    }
    async processDiffRequest(msg: string): Promise<any> {
        this.writeEmitter.fire(msg+'\r\n');
        const file = msg.replace('💠', '').trim();
        const filepath = path.join(this.projectFolder || '', file);
        const fileContents = await vscode.workspace.fs.readFile(vscode.Uri.file(filepath));
        const fileContentsStr = new TextDecoder().decode(fileContents);
        // use the diff npm lib to apply the patch
        let patchedContents = fileContentsStr;
        const parsedDiff = parsePatch(fileContentsStr);
        for(const d of parsedDiff) {
            patchedContents = applyPatch(fileContentsStr, d);
        }
        this.writeEmitter.fire(patchedContents+'\r\n');
        await vscode.workspace.fs.writeFile(vscode.Uri.file(filepath),
            new TextEncoder().encode(patchedContents));
        return { file: file, contents: patchedContents };
    }
    async processBashCommand(msg: string): Promise<string> {
        this.writeEmitter.fire(msg+'\r\n');
        const command = msg.replace('🖥️', '').trim();
        if(command.startsWith('cd ')) {
            const dir = command.replace('cd ', '').trim();
            this.projectFolder = dir;
            process.chdir(dir);
            this.writeEmitter.fire('changed directory to '+dir+'\r\n');
            return 'changed directory to '+dir;
        }
        const result: any = await executeShellCommands(command);
        const msgStr = result.replace(/\n/g, '\r\n');
        if(msgStr) {
            this.writeEmitter.fire(msgStr+'\r\n');
            return msgStr;
        }
        this.writeEmitter.fire('command completed successfully'+'\r\n');
        return 'command completed successfully';
    }
    async processVSCodeCommand(msg: string): Promise<any>{
        this.writeEmitter.fire(msg+'\r\n');
        const command = msg.replace('🆚', '').trim();
        const result = await vscode.commands.executeCommand(command);
        this.writeEmitter.fire(result+'\r\n');
        return result;
    }
    async processNotification(msg: string): Promise<any> {
        this.writeEmitter.fire(msg+'\r\n');
        const notification = msg.replace('📢', '').trim();
        log(notification);
        return notification;
    }
    async processFinish(msg: string): Promise<any>  {
        this.writeEmitter.fire(msg+'\r\n');
        this.triggered = false;
        return msg;
    }
    addOpenTaskToTaskList(msg: string){
        if(!msg) { return; }
        const taskName = msg.replace('📬', '').trim();
        if(this.openTasks.includes(taskName)) {
            return msg + ' - already open';
        }
        this.openTasks.push(taskName);
        this.writeEmitter.fire(msg+'\r\n');
        log('added task '+taskName);
        return msg;
    }
    removeOpenTaskFromTaskList(msg: string){
        if(!msg) { return; }
        const taskName = msg.replace('📭', '').trim();
        // check to see if the task is already open
        if(!this.openTasks.includes(taskName)) {
            return msg + ' - complete';
        }
        const firstOpenTask = this.inputBuffer.findIndex((msg: any) => msg.content.includes(taskName));
        // if there is one then delete everything in the input after and including the open task
        if(firstOpenTask !== -1) {
            this.inputBuffer.splice(firstOpenTask, this.inputBuffer.length - firstOpenTask);
        }
        this.openTasks = this.openTasks.filter((task: any) => task !== taskName);
        this.writeEmitter.fire(msg+'\r\n');
        return msg;
    }
    truncateInputBuffer ()  {
        this.inputBuffer.splice(
            this.floorHeight, 
            this.inputBuffer.length - this.floorHeight
        );
        return this.inputBuffer;
    }
    output(msg: string) { this.writeEmitter.fire(msg); }
    outputln(msg: string) { this.writeEmitter.fire(msg+'\r\n'); }
    warning(message: string) { this.writeEmitter.fire(message+'\r\n'); }
    error(message: string) { this.writeEmitter.fire('❌ ' + message); }

    sendOpenTasksStatus () {
        const ot = this.openTasks.map((task: any) => `📬 ${task}`).join('\r\n');
        const curOpenTask = this.openTasks[0];
        const tasksVal = '\r\nOPEN TASKS:\r\n' + ot 
        + '\r\nCOMMAND HISTORY:\r\n' + this.commandHistory.join('\r\n')
        + '\r\nCURRENT TASK: 📬 ' + curOpenTask + '\r\n';
        this.addMessageToInputBuffer({ role: 'user', content: tasksVal });
        this.writeEmitter.fire(tasksVal+'\r\n');
    }
    addCommandHistory (msg: string){
        this.commandHistory.push(msg);
        return msg;
    }

}




