import * as vscode from "vscode";

import InsertAssistantTagCommand from "./InsertAssistantTagCommand";
import InsertUserTagCommand from "./InsertUserTagCommand";
import InsertSystemTagCommand from "./InsertSystemTagCommand";
import SubmitChatCommand from "./SubmitChatCommand";
import PuckREPLCommand from "./PuckREPLCommand";
import SetOpenAIKeyCommand from "./SetOpenAIKeyCommand";
import OpenChatCommand from "./OpenChatCommand";
import activateCommands from "./commands";

import * as ConversationDocumentsCommand from "./ConversationDocumentsCommand";

export default function activate(context: vscode.ExtensionContext) {
	new PuckREPLCommand("puck.bashCommander", "Bash Commander", context);
	new SetOpenAIKeyCommand("setOpenAIKey", "Set OpenAI Key", context);
    new OpenChatCommand('puck.openChat', 'Open Puck Assistant Chat', context );
    
    ConversationDocumentsCommand.activate(context);

    new InsertAssistantTagCommand("puck.insertAssistantTag", "Insert 🤖", context);
    new InsertUserTagCommand("puck.insertUserTag", "Insert 👤", context);
    new InsertSystemTagCommand("puck.insertSystemTag", "Insert 🌐", context);
    new SubmitChatCommand("puck.submitChat", "Submit Chat", context);

    activateCommands (context);
}


export function deactivate() { }