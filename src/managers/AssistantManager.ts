import { getOpenAIKey } from "../configuration";

const { Assistant, Thread, loadNewPersona } = require( '@nomyx/assistant');
const { tools, schemas } = require('../tools/index');

// a manager for OpenAI Assistant. Provides a simple interface to interact with the assistant
export default class AssistantManager {

    static assistant: any = undefined;
    
    static async get (
        threadId: string | undefined = undefined,
        ): Promise<any> {

            if(Assistant.assistant) {
                return Assistant.assistant;
            }

            // we hardcode the assistant name and model for now
            const name = 'vscode-assistant';
            const model = 'gpt-4-1106-preview';
            const apiKey = getOpenAIKey('puck');
            
            // look for an assistant with the given name
            const assistants = await Assistant.list(apiKey);
            AssistantManager.assistant = assistants.find((a: any) => a.name === name);

            // if we don't find one, create it
            if (!AssistantManager.assistant) {
                AssistantManager.assistant = await Assistant.create(
                    name,
                    await loadNewPersona(tools),
                    schemas,
                    model,
                    threadId,
                    apiKey
                );
            }

            if(threadId) AssistantManager.assistant.thread = await Thread.get(threadId);
            return AssistantManager.assistant;
    }

    static async query(q: string, threadId: string | undefined, onUpdate: (event: string, message: any) => void) {
        const assistant = await AssistantManager.get(threadId);
        const apiKey = getOpenAIKey('puck');
        const result = await assistant.run(q, tools, schemas, apiKey, onUpdate);
        return result;
    }

}