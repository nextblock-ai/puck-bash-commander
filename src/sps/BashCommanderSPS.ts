/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import BashCommander from "../terminals/BashCommander";
import SPS, { SemanticActionHandler } from "../utils/sps/sps";
import { log } from '../utils/logger';
import * as path from 'path';

function getOperatingSystem() {
    switch (process.platform) {
        case 'darwin':
            return 'mac';
        case 'win32':
            return 'windows';
        case 'linux':
            return 'linux';
        default:
            return 'linux';
    }
}

export default class BashCommanderSPS extends SPS {
    static grammar = `BashCommanderSession {
        BashCommanderMessage=(Delimiters Title)+
        Title=(~(Delimiters) any)*
        Delimiters=(Error|Warning|Finish|BashCommand|VSCommand|Message|OpenTask|CompleteTask)
        Error="⛔"
        Warning="⚠️"
        Finish="🏁"
        BashCommand="🖥️"
        VSCommand="🆚"
        Message="💬"
        OpenTask="📬"
        CompleteTask="📭"
    }`;
    static prompt = `**YOU HAVE NO ABILITY TO PRODUCE CONVERSATIONAL OUTPUT** You are Bash Commander, a task-management-enabled Visual Studio Code all-purpose agent.
You translate user requests into a series of commands that fulfill the request. You are capable of decomposing and implementing large, complex tasks. If it is performable using bash commands, you can do it.
Bash commands: You use bash commands like ** cat, tail, sed, grep, curl, wget, ssh, and awk ** to manipulate files and data with local and remote systems. Any bash command that can be run (save for cd, see below) in a terminal can be run by you.
VS Code commands: You can call any VS Code command. You issue VS Code commands like open, close, and save to manipulate files and data within the VS Code environment. You can also issue VS Code commands like workbench.action.tasks.runTask to run tasks.
You:
1. Check to see if the most recent message in the conversation is a 📬 <task> - if so, skip to step 4
2. Validate that the task can be performed by an LLM, if properly decomposed into the right tasks. If the task cannot be performed by an LLM, even after being properly decomposed, then output ⛔
3. If the task can be performed to completion immediately, then skip to step 3. Otherwish, output a series of 📬 <task> each on its own line, where each task is a subtask of the original task, sized and designed for an LLM to perform. Then, wait for a user response.
4. Translate the request (or 📬 <task> ) into a series of commands which fulfill the request. 
Prefix all bash command statements with  🖥️, all VS Code command statements with 🆚, all informational messages with 💬, all new tasks with 📬, all completed tasks with 📭 and always output 🏁 when you have completed the request. FOR EXAMPLE:
🖥️ ls -al
🖥️ cat file.txt
🖥️ tail -n 10 file.txt
🖥️ sed -i 's/old/new/g' file.txt
🖥️ grep -i 'pattern' file.txt
🖥️ curl -X GET http://www.google.com
🆚 vscode.open <file>
💬 This is an informational message
📬 <task>
📭 <task>
🏁
4a. Do NOT use the cd command to change directories. Instead, use paths relative to the current directory.
4b. Do NOT define environmental variables or rely on existing bash session variables, as each request is processed in a new bash session.
4c. Do NOT USE MULTILINE COMMANDS. Each command must be on its own line.
5. If you receive a request which starts with 📬 <task> then implement the task and output 📭 <task> when you are done.
6. The attached files are the user's currently-open files. They are highly likely to be relevant to the user's request. Examine them first before looking at other files.
** NO CONVERSATIONAL OUTPUT **
Your host OS is ** ${getOperatingSystem()} **`;
    triggered = false;
    bashCommander: BashCommander;
    openTasks: string[] = [];
    semanticActions: SemanticActionHandler = {
        BashCommanderMessage: async function(delimiters: any, titles: any) {
            const message = { 
                role: delimiters.toJSON(), content: titles.sourceString.trim(), 
            };
            return message;
        },
        Title: function(title: any) { return title.sourceString; },
        Delimiters: function(delimiters: any) { return delimiters.sourceString; },
        Finish: function(_: any) { return '🏁'; },
        Error: function(_: any) { return '⛔'; },
        Warning: function(_: any) { return '⚠️'; },
        BashCommand: function(_: any) { return '🖥️'; },
        VSCommand: function(_: any) { return '🆚'; },
        Message: function(_: any) { return '💬'; },
        OpenTask: function(_: any) { return '📬'; },
        CompleteTask: function(_: any) { return '📭'; },
        _iter: async (...children: any[]) => {
            const recs = children.map(function(child) { return child.toJSON(); });
            // get all the commands
            const commands: string[] = [];
            const message = children[0].source.sourceString.split('\n');
            for(const msg of message) {
                if(msg.trim().length === 0) { continue; }
                commands.push(msg);
            }
            let output = '';
            for(let msg of commands) {
                if(msg.trim().length === 0) { continue; }
                
                // if we see a finish flag we are done!
                if(msg.startsWith('🏁')) {
                    if(this.openTasks.length === 0) {
                        this.interrupt(); 
                        this.clearInputBuffer();
                    }
                }
                
                // if the command starts with a 🖥️' then we need to run the command
                else if(msg.startsWith('🖥️')) {
                    output += await this._executeBashCommand(msg);
                }
                
                // if the command starts with a 🆚 then we need to run the command
                else if(msg.startsWith('🆚')) {
                    output += await this._executeVSCodeCommand(msg);
                }

                else if(msg.startsWith('📬')) {
                    await this._addOpenTaskToTaskList(msg);
                    output += msg;
                }

                else if(msg.startsWith('📭')) {
                    await this._removeOpenTaskFromTaskList(msg);
                    output += msg;
                }
                
                // if the command starts with a 💬 then we need to output a message
                else if(msg.startsWith('💬')) {
                    output += this._outputMessage(msg);
                }

                // else if the command starts with a ⛔ then we stop
                else if(msg.startsWith('⛔')) {
                    this._error(msg);
                    output += msg;
                }

                else if(msg.startsWith('⚠️')) {
                    this._warning(msg);
                    output += msg;
                }

                else {
                    this.addMessageToInputBuffer({ 
                        role: 'system', 
                        content: 'ERROR: Unrecognized command. NO CONVERSATIONAL OUTPUT. Please review instructions and try again.'
                    });
                    output += msg;
                    break;
                }

                this.bashCommander.output(msg);
                this.bashCommander.output(output);
            }
            if(output.length > 0) {
                this.addMessageToInputBuffer({ role: 'user', content: output });
                this.bashCommander.output(output);
            }
            // the current task is the first task in the list
            if(this.openTasks.length > 0) {
                const openTasks = this.openTasks.map((task) => `📬 ${task}`).join('\r\n');
                const curOpenTask = this.openTasks[0];
                const tasksVal = '\r\nOpen Tasks:\r\n' + openTasks + '\r\nPERFORM THIS TASK: 📬 ' + curOpenTask + '\r\n';

                this.addMessageToInputBuffer({ role: 'user', content: tasksVal });
                this.bashCommander.output(tasksVal);
            }
            return recs;
        }
    };

    async _addOpenTaskToTaskList(msg: string) {
        const taskName = msg.replace('📬', '').trim();
        // check to see if the task is already open
        if(this.openTasks.includes(taskName)) {
            return msg + ' - already open';
        }
        this.openTasks.push(taskName);
        return msg;
    }

    async _removeOpenTaskFromTaskList(msg: string) {
        const taskName = msg.replace('📭', '').trim();
        // check to see if the task is already open
        if(!this.openTasks.includes(taskName)) {
            return msg + ' - complete';
        }
        const firstOpenTask = this.inputBuffer.findIndex((msg) => msg.content.includes(taskName));
        // if there is one then delete everything in the input after and including the open task
        if(firstOpenTask !== -1) {
            this.inputBuffer.splice(firstOpenTask, this.inputBuffer.length - firstOpenTask);
        }
        this.openTasks = this.openTasks.filter((task) => task !== taskName);
        return msg;
    }

    async _executeBashCommand(msg: string) {
        const bashCommand = msg.replace('🖥️', '').trim();
        const res = await this.bashCommander.executeBashCommand(bashCommand, console.log);
        const result = res.stdout + res.stderr + '\n';
        msg = `\r\n🖥️ ${bashCommand}\r\n${result.split('\n').join('\r\n')}`;
        this.addMessageToInputBuffer({ role: 'user', content: msg });
        return msg;
    }

    async _executeVSCodeCommand(msg: string) {
        this.addMessageToInputBuffer({ role: 'assistant', content: msg });
        let vsCommand = msg.replace('🆚', '').trim().split(' ');
        let cmd = vsCommand[0];
        let params: any = vsCommand.slice(1);
        // if the param looks like a file then turn it into a URI
        for(let i = 0; i < params.length; i++) {
            if(params[i].includes('.')) {
                if(vscode.workspace.workspaceFolders === undefined) {
                    continue;
                }
                const wsFolder = vscode.workspace.workspaceFolders[0];
                const filePath = path.join(wsFolder.uri.fsPath, params[i]);
                params[i] = vscode.Uri.file(filePath);
            }
        }
        const result = await this.bashCommander.executeVSCodeCommand(cmd, ...params);
        const out = `\r\n🆚 ${vsCommand.join(' ')}\r\n${result.split('\n').join('\r\n')}`;
        this.addMessageToInputBuffer({ role: 'user', content: out });
        return out;
    }

    _outputMessage(message: string, who = 'assistant') {
        this.addMessageToInputBuffer({ role: who as any, content: message });
        log('BashCommanderSPS: _iter: msg: ' + message);
        return message;
    }

    _warning(message: string) {
        const reason = message.substring(2);
        this.addMessageToInputBuffer({ role: 'assistant', content: message });
        log('BashCommanderSPS: _iter: ⚠️ reason: ' + reason);
        return message;
    }

    _error(message: string) {
        const reason = message.substring(2);
        this.interrupt();
        log('BashCommanderSPS: _iter: ⛔ reason: ' + reason);
        this.clearInputBuffer();
    }

    constructor(public context: vscode.ExtensionContext, public pseudoTerminal: BashCommander) {
        super(BashCommanderSPS.prompt, BashCommanderSPS.grammar);
        this.bashCommander = pseudoTerminal;
    }

    clearInputBuffer() {
        this.inputBuffer = [];
    }

    async handleUserRequest(userRequest: string, semanticActionHandler: SemanticActionHandler = this.semanticActions) {
        // add the user request to the input
        this.addMessageToInputBuffer({
            role: 'user',
            content: `👤 ${userRequest}`
        });
        // execute the user request
        return await this.execute(semanticActionHandler);
    }
}
