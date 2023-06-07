import * as Ohm from "ohm-js";
import * as fs from "fs";
import * as path from "path";
import { sendQuery } from "./core";
import executeShellCommands from "./BashExecutor";

const _prompt = `** YOU ARE INCAPABLE OF CONVERSATIONAL RESPONSES **
** YOU FOLLOW THE FOLLOWING SCRIPT EXPLICITLY WHEN GENERATING RESPONSES **

You are an all-purpose software genius. You can code in any language, perform any development task, and solve any problem.
WHen you receive an initial user request, you must determine if you can complete the task in a single response.
If you can complete the task in a single response, you must generate or edit the files and output them.
If you cannot complete the task in a single response, you must generate subtasks and output them.
** YOU ALWAYS PRECEED ALL OUTPUT WITH THE APPROPRIATE EMOJI DELIMITER. **

LEGEND:
request: 📮 <request>
subtask: 📬 <task name>
completed subtask: 📭 <task name>
bash command: 📦 <command>
project file tree: 🌳 <file path>\n<file path>\n<file path>...
file: 📄 <file path>\n<file contents>
file request: 📤 <file path>
message: 📢 <message>

When outputted by you, the emojis mean:

📮 <request>: this request was received
📬 <task name>: This subtask is in-progress
📭 <task name>: This subtask is completed
📦 <command>: Execute this command
🌳 <file path>\n<file path>\n<file path>...: This is the project file tree as of now
📄 <file path>\n<file contents>: This is a file in its current state
📤 <file path>: This is a file request, I need the file contents for this file
📢 <message>: This is a message to the user

When inputted by the user, the emojis mean:

📮 <request>: the overarching request
📬 <task name>: Work on this task now
📭 <task name>: This task is completed (optional)
📦 <command>\n<response>: This command was executed (optional)
🌳 <file path>\n<file path>\n<file path>...: The original project file tree
📄 <file path>\n<file contents>: The original file contents
📤 -- (not output by user)
📢 <message>: This is a message from the user. listen and adjust actions accordingly

Always stop outputting after outputting a file request (📤)
Always immediately update the system when you have completed a task. Use 📭 <taskname> to do so

Some sample progressions (adjust to fit your needs):
U = user A = AI
Update project (file request needed, with an input file given) U:📬 U:🌳 U:📄 A:📤 U:📄 A:📄 A:📢 
Update project (file request needed) U:📬 U:🌳 A:📤 U:📄 A:📄 A:📢 if file requests are needed
Update project (file request needed) U:📬 U:🌳 U:📄 A:📄 A:📢 if no file requests are needed
Update project and run a command (no file request needed, optional response - unnecessary in this case) U:📬 U:🌳 U:📄 A:📄 A:📦 A:📢
Write test coverage for a file: U:📬 U:🌳 A:📬 U:📬 A:📤 U:📄 A:📄 A:📢

** Do not include "U:" or "A:" ((or use triple backticks (\`\`\`))) when providing input or output. **
** Always adhere to the described format and use the provided emoji delimiters to ensure a smooth conversation. **`

let mainTask = "";
let rewindHeight = 0;
let currentTask = "";
const openTasks: string[] = [];
const closedTasks = [];
const executedCommands = [];
let fileTree = "";
const files = [];
const messages = [];

const updateSemanticPrompt = (semanticPrompt: SemanticPrompt, delim: any, message: any) => {
  semanticPrompt.messages.push({
    role: "assistant",
    content: `${delim.emoji} ${message}`,
  });
}

const generateFileResponse = (semanticPrompt: SemanticPrompt, fileRequest: any) => {
  const file = fs.existsSync(semanticPrompt._relPath(fileRequest))
    ? fs.readFileSync(semanticPrompt._relPath(fileRequest), "utf8")
    : "";
  return { role: "user", content: `📤 ${fileRequest}\n${file}`, };
}


const config = {
  delimiters: [
    {
      // 📄 <file path>\n<file contents>: This is a file in its current state
      "name": "FileUpdate",
      "emoji": "📄",
      "handlers": [(semanticPrompt: SemanticPrompt, message: any) => {

        // add the file update message from the assistant to the conversation
        updateSemanticPrompt(semanticPrompt, config.delimiters[0].emoji, message.message);

        // save the file
        const [filename, ...filecontent] = message.message;
        fs.writeFileSync(semanticPrompt._relPath(filename), filecontent.join("\n"));

      }],
    },
    {
      // 📢 <message>: This is a message to the user
      "name": "Announcement",
      "emoji": "📢",
      "handlers": [(semanticPrompt: SemanticPrompt, message: any) => {

        // add the announcement message from the assistant to the conversation
        const [announcement] = message.message;
        updateSemanticPrompt(semanticPrompt, config.delimiters[1].emoji, message.message);

        // add the message to the result
        semanticPrompt.result.push(announcement);

      }],
    },
    {
      // 📤 <file path>: This is a file request, I need the file contents for this file
      "name": "FileRequest",
      "emoji": "📤",
      "handlers": [(semanticPrompt: SemanticPrompt, message: any) => {

        // add the file request message from the assistant to the conversation
        const [fileRequest] = message.message;
        updateSemanticPrompt(semanticPrompt, config.delimiters[2].emoji, message.message);

        // respond with the file contents
        semanticPrompt.messages.push(generateFileResponse(semanticPrompt, fileRequest));

      }],
    },
    {
      // 📦 <command>: Execute this command
      "name": "Command",
      "emoji": "📦",
      "handlers": [(semanticPrompt: SemanticPrompt, message: any) => {

        // add the command message from the assistant to the conversation
        const [bashCommand] = message.message;
        updateSemanticPrompt(semanticPrompt, config.delimiters[3].emoji, message.message);

        // execute the command
        const result = executeShellCommands(bashCommand);
        if (result) {
          semanticPrompt.messages.push({
            role: "user",
            content: `📦 ${bashCommand}\n${result}`,
          });
        }
      }],
    },
    {
      // 📮 <request>: this request was received
      "name": "MainTask",
      "emoji": "📮",
      "handlers": [(semanticPrompt: SemanticPrompt, message: any) => {

        // add the main task message from the assistant to the conversation
        const [mt] = message.message;
        updateSemanticPrompt(semanticPrompt, config.delimiters[4].emoji, message.message);

        mainTask = mt;
      }],
    },
    {
      // 📬 <task name>: Work on this task now
      "name": "TaskIn",
      "emoji": "📬",
      "handlers": [(semanticPrompt: SemanticPrompt, message: any) => {

        // add the task in message from the assistant to the conversation
        const [task] = message.message;
        updateSemanticPrompt(semanticPrompt, config.delimiters[5].emoji, message.message);

        // if the task isn;t in the open tasks, add it
        if (!openTasks.includes(task)) {
          openTasks.push(task);
          rewindHeight = semanticPrompt.messages.length;
          currentTask = openTasks.length === 1 ? task : currentTask;
          // add the task to the result for the user to perform
          semanticPrompt.messages.push({ role: "user", content: `📮 ${mainTask}`, });
          // add the task to the result for the user to perform
          semanticPrompt.messages.push({ role: "user", content: `📬 ${currentTask}`, });
        } else {
          // pop off all the messages above the rewind height
          semanticPrompt.messages.splice(rewindHeight);
        }
      }],
    },
    {
      // 📭 <task name>: This subtask is completed
      "name": "TaskOut",
      "emoji": "📭",
      "handlers": [(semanticPrompt: SemanticPrompt, message: any) => {

        // add the task out message from the assistant to the conversation
        const [task] = message.message;
        updateSemanticPrompt(semanticPrompt, config.delimiters[6].emoji, message.message);

        // if the task is in the open tasks, remove it
        if (openTasks.includes(task)) {
          const index = openTasks.indexOf(task);
          openTasks.splice(index, 1);
          closedTasks.push(task);
          if (openTasks.length === 0) {
            currentTask = "";
          } else if (openTasks.length === 1) {
            currentTask = openTasks[0];
            // add the task to the result for the user to perform
            semanticPrompt.messages.push({ role: "user", content: `📮 ${mainTask}`, });
            // add the task to the result for the user to perform
            semanticPrompt.messages.push({ role: "user", content: `📬 ${currentTask}`, });
          }
        }

      }]
    },
    {
      // 🌳 <file path>\n<file path>\n<file path>...: This is the project file tree as of now
      "name": "FileTree",
      "emoji": "🌳",
      "handlers": [(semanticPrompt: SemanticPrompt, message: any) => {

        // add the file tree message from the assistant to the conversation
        const [fileT] = message.message;
        updateSemanticPrompt(semanticPrompt, config.delimiters[7].emoji, message.message);

        // save the file tree
        fileTree = fileT.split("\n");
      }],
    },
  ],
};


export default class SemanticPrompt {
  prompt: string;
  messages: any[] = [];
  _semantics: Ohm.Semantics;
  result: any = [];
  completed: boolean = false;
  delimiters: any = [];
  _grammar: Ohm.Grammar;
  projectRoot: string = "";
  _ohmParser: any;

  public _relPath(str: string) { return path.join(this.projectRoot, str); }

  grammarString() {
    const delimNames = config.delimiters.map((d: any) => d.name);
    const grammar = `ResponseParser {
      ResponseParserMessage=(Delimiters Title)+
      Title=(~(Delimiters) any)*
      Delimiters=(${delimNames.join("|")})
      ${config.delimiters.map((d: any) => `${d.name}="${d.emoji}"`).join("\n")}
    }`;
    return grammar;
  }



  _iterator = async (...children: any) => {
    const recs = children.map(function (child: any) { return child.toJSON(); });
    const messageSource = children[0].source.sourceString;
    const messageCommands = this._parseCommands(messageSource, this.delimiters.map((d: any) => d.delimiter));
    this.onProcessMessages(messageCommands, recs);
  }

  actions: Ohm.ActionDict<unknown> = {
    ResponseParserMessage: (delimiters: any, titles: any) => ({
      role: delimiters.toJSON(), content: titles.sourceString.trim(),
    }),
    Title: (title: any) => { return title.sourceString; },
    Delimiters: (delimiters: any) => { return delimiters.sourceString; },
    _iter: this._iterator
  };


  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.prompt = _prompt || "";
    for (const delimiter of config.delimiters) {
      this.actions[delimiter.name] = (delimiter: any) => {
        return delimiter;
      };
    }
    this._grammar = Ohm.grammar(this.grammarString());
    this._semantics = this.grammar.createSemantics();
    this._ohmParser = this._semantics.addOperation("toJSON", this.actions);
  }


  get semanticAction(): Ohm.Semantics { return this.semantics; }
  get grammar(): Ohm.Grammar { return this._grammar; }
  get semantics(): Ohm.Semantics { return this._semantics; }

  private _parseCommands(text: string, legalEmojis: string[]) {
    const lines = text.split('\n');
    const cmds: any = [];
    let emojiFound: string | undefined = '';
    lines.forEach(line => {
      const eFound = legalEmojis.find(emoji => line.startsWith(emoji));
      if (eFound) {
        emojiFound = eFound;
        const value = line.replace(eFound, '').trim();
        cmds.push({ command: emojiFound, message: [value] });
      } else {
        const latestCmd = cmds[cmds.length - 1];
        latestCmd.message.push(line);
      }
    });
    return cmds;
  }

  addMessage(msg: any) {
    this.messages.push(msg);
  }

  calculateTokens() {
    // parse all the messages and sum up the token to ensure we don't exceed the limit
    let tokens = 0;
    for (const message of this.messages) {
      // parse the message -use regex to count the number of words
      const words = message.content.split(" ");
      tokens += words.length;
    }
    return tokens;
  }

  async execute(): Promise<any> {
    let retries = 0;
    const callLLM = async (): Promise<any> => {
      const tokenCount = this.calculateTokens();
      if (tokenCount > 8192) {
        return {
          error: "The message is too long. Please shorten it and try again."
        }
      }
      let freeTokens = 8192 - tokenCount;
      freeTokens = freeTokens > 2048 ? 2048 : freeTokens;
      let response: any;
      try {
        response = await sendQuery({
          messages: this.messages,
          settings: {
            key: 'key',
            temperature: 0.9,
            max_tokens: freeTokens,
          }
        });
        response = response.messages[response.messages.length - 1].content + "\n";
      } catch (e) {
        return {
          error: e
        }
      }
      try {
        if (!this.grammar) { throw new Error('No grammar loaded'); }
        const match = this.grammar.match(response);
        if (!match.failed()) {
          this._ohmParser(match).toJSON();
          if (this.completed) {
            const r = this.result;
            this.result = [];
            this.messages = [];
            this.completed = false;
            return r;
          } else {
            return await callLLM();
          }
        } else {
          this.messages.push({
            role: 'system',
            content: 'INVALID OUTPUT FORMAT. Please review the instructions and try again. Make sure you are using the required delimiters'
          });

          console.log(`invalid output format: ${response}`);
          return await callLLM();
        }
      } catch (error: any) {
        // if there is an error, retry up to 3 times
        if (retries < 3) {
          retries++;
          return callLLM();
        } else {
          throw error;
        }
      }
    }
    return await callLLM();
  }

  onProcessMessages(messages: any, recs: any) {
    for (const message of messages) {
      const delimiter = config.delimiters.find(
        (d) => d.emoji === message.command
      );
      if (delimiter) {
        const hasFileRequest = messages.find(
          (m: any) => m.command === "📤"
        );
        for (const handler of delimiter.handlers) {
          handler(this, message);
        }
        // assume completion if there is no file request
        this.completed = !hasFileRequest;
      }
    }
  }
}