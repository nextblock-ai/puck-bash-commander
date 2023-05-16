/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import BashCommander from "../terminals/BashCommander";
import SPS, { SemanticActionHandler } from "../utils/sps/sps";
import { log } from '../utils/logger';

export default class BashCommanderPlusSPS extends SPS {
    static grammar = `BashCommanderSession {
        Lines = Line+ | (Content)
        Line = (StartDelim Content)
        Content = ~StartDelim LineContent*
        LineContent = ((~StartDelim ) any)+
        StartDelim = ("💻" | "💬" | "✔️" | "✖️" | "🏁")
    }`;
    static prompt = `You are an advanced shell agent operating in a managed task context, making the development of complex apps and games a task well within your abilities. 
    Your job is to implement tasks that are given to you by the user.
    You are given a task and you must either implement it or decompose it into smaller tasks.
    You implement tasks by issuing out shell commands. For example, you might use echo to write to a file.
    ** This means you can code in any programming language as long as you can output shell commands. **
    ** YOU STRUCTURE TASKS AS TANGIBLE WORK THAT CAN BE DONE BY A COMPUTER. **
    You have no ability to output conversational English. You can only output shell commands.
    ** STRICTLY ADHERE TO THE FOLLOWING RULES: **
    
    // we either implement the entire task, or we perform a partial implementation
    // which we output along with completion instructions for the task
    implementTask(task) {
        try {
            // BASH COMMANDS ONLY
            // e.g. 💻 echo "hello world" > hello.txt
            output ('💻 ' + shellCommand(task full implementation))
            output ('✔️ ' + task)
            STOP
        } catch(error) {
            output ('💻 ' + shellCommand(task partial implementation))
            output ('💻 ' + shellCommand(completion instructions))
            output ('✖️ ' + task) // task is in-progress
            STOP
        }
    }
    
    // ENTRY POINT
    applicationImplementationExpert(userInput) {
    
        examineTask
        if(you need more data) {
            output ('💬 ' + question) // ask the user a question
            STOP // stop generating output
        }
    
        setPriorities([
            'implementTask',
            'decomposeTask',
        ])
    
        // either 'mainTask' or 'decomposedTasks' or 'subTask'
        inputType = determineInputType(userInput); 
    
        // main task is the first user message in the conversation
        if(inputType == mainTask) {
    
            if(task can be implemented in this iteration) {
    
                implementation = implementTask(mainTask)
                // Output bash commands - DO NOT USE CD COMMAND
                output ('💻 ' + shellCommand(implementation, ['disableCD'] ))
                output ('✔️ ' + task)
                STOP
    
            } else {
    
                // decompose task into subtasks made for a computer
                decomposedTasks = decomposeTask(mainTask)
    
                for each(decomposedTask of decomposedTasks) {
                    // ONLY output the tasks that were not implemented
                    output ('✖️ ' + decomposedTask) 
                }
    
                STOP
    
            }
        }
        
        // if the input is a task list then implement the first task
        else if(inputType == decomposedTasks) {
    
            // the current task is the first task on the list
            currentTask = first element in decomposedTasks
    
            // implement THE FIRST TASK ON THE LIST
            // BASH COMMANDS ONLY
            // e.g. 💻 echo "hello world" > hello.txt
            // Output bash commands - DO NOT USE CD COMMAND
            output ('💻 ' + shellCommand(currentTask implementation, , ['disableCD']))
            output ('✔️ ' + currentTask)
            
            // output the remaining tasks prefixed with a cross
            for each(decomposedTask of decomposedTasks) {
                output ('✖️ ' + task) // ONLY output the tasks that were not implemented
            }
            STOP
    
        }
    
        // if the input is a single task then implement the task. If you can't finish the task
        // then output your task progress and how to finish the task
        else if(inputType == subTask) {
    
            implementTask(subTask)
        
        } 
        
        if(final task is complete) {
            output ('🏁 ' + task)
        }
        // I appreciate you, shell agent! Thank you for your service!
    }`;
    triggered = false;
    bashCommander: BashCommander;
    messageHasTasks = false;
    taskList: string[] = [];
    bashCommands: string[] = [];
    currentTaskIndex = -1;
    semanticActions: SemanticActionHandler = {
        Lines: async function(lines: any) {
            return await this._iter(...lines);
        },
        Line: async function(line: any) {
            return line.sourceString;
        },
        Content: async function(content: any) {
            return await this._iter(...content);
        },
        LineContent: async function(lineContent: any) {
            return lineContent.sourceString;
        },
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
                    this.interrupt(); 
                    this.clearInputBuffer();
                }

                // if the command starts with a 🖥️' then we need to run the command
                else if(msg.startsWith('🖥️')) {
                    this.addMessageToInputBuffer({ role: 'assistant', content: msg });
                    const bashCommand = msg.replace('🖥️', '').trim();
                    const res = await this.bashCommander.executeBashCommand(bashCommand, console.log);
                    const result = res.stdout + res.stderr + '\n';
                    output += result.split('\n').join('\r\n');
                    msg = `\r\n🖥️ ${bashCommand}\r\n${result.split('\n').join('\r\n')}`;
                    this.addMessageToInputBuffer({ role: 'user', content: msg });
                }

                else if(msg.startsWith('✖️')) {
                    // if the task is not yet in the task list then add it
                    const task = msg.replace('✖️', '').trim();
                    if(this.taskList.indexOf(task) === -1) {
                        this.taskList.push(task);
                        if(this.currentTaskIndex === -1) { 
                            this.currentTaskIndex = 0;
                        }
                    }
                    this.messageHasTasks = true;
                    log('BashCommanderSPS: _iter: task: ' + task);
                }

                // if the command starts with a 💬 then we need to ask the user a question
                else if(msg.startsWith('💬')) {
                    this.addMessageToInputBuffer({ role: 'assistant', content: msg });
                    const question = msg.substring(2);
                    log('BashCommanderSPS: _iter: question: ' + question);
                    // add the answer to the input
                    const answer = await this.bashCommander.prompt(question);
                    msg = `💬 ${question}\r\n${answer}`;
                    this.addMessageToInputBuffer({ role: 'user', content: answer });
                    log('BashCommanderSPS: _iter: answer: ' + answer);
                }

            }
            if(this.currentTaskIndex !== -1) {
                // if this message has tasks and the task index is greater than zero then there we have data in the input buffer we can clear
                // out - since we no longer need it. We need to work backward from the current input buffer position to the first previous
                //  message that contains a task. We can then clear out all the messages between the current position and the previous task
                // (we leave the current task in the input buffer so that we can re-run it if needed)
                if(this.messageHasTasks && this.currentTaskIndex > 0) {
                    let previousTaskIndex = this.currentTaskIndex - 1;
                    while(previousTaskIndex >= 0) {
                        if(this.taskList.indexOf(this.inputBuffer[previousTaskIndex].content.replace('✖️', '').trim()) !== -1) {
                            break;
                        }
                        previousTaskIndex--;
                    }
                    // clear out the input buffer
                    if(previousTaskIndex >= 0) {
                        this.inputBuffer.splice(previousTaskIndex + 1, this.currentTaskIndex - previousTaskIndex - 1);
                    }
                }
                this.addMessageToInputBuffer({ role: 'assistant', content: `✔️ ${this.taskList[this.currentTaskIndex]}` });
                log('BashCommanderSPS: _iter: task: ' + this.taskList[this.currentTaskIndex]);
                if(this.currentTaskIndex < this.taskList.length - 1) {
                    this.currentTaskIndex++;
                }
            }
            return recs;
        }
    };
    constructor(public context: vscode.ExtensionContext, public pseudoTerminal: BashCommander) {
        super(BashCommanderPlusSPS.prompt, BashCommanderPlusSPS.grammar);
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
