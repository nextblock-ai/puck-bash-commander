/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Ohm from 'ohm-js';
import * as fs from 'fs';
import { GPTChatMessage, sendQuery } from '../gpt';

// an action handler for a semantic action
export type SemanticActionHandler = Ohm.ActionDict<unknown>;

// a semantic prompt structure - consists of a prompt, a grammar file, and semantic action handler
export default class SPS {
    protected prompt: string;
    private grammarFile: string;
    private semanticActionHandler: SemanticActionHandler | undefined;
    protected inputBuffer: GPTChatMessage[];
    private _executing: boolean;
    private _interrupted: boolean;
    private _llmOptions: any;
    // prompt and grammar file are required
    constructor(prompt: string, grammarFile: string, llmOptions = {
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1,
        messages: []
    }) {
        this.prompt = prompt;
        this.grammarFile = grammarFile;
        this.inputBuffer = [];
        this._executing = false;
        this._interrupted = false;
        this._llmOptions = llmOptions;
    }
    // add a message to the input buffer to send to the LLM
    addMessageToInputBuffer(message: GPTChatMessage): void { this.inputBuffer.push(message); }
    interrupt(): void { this._interrupted = true; }
    
    // perform a single iteration of the SPS
    async iterate(semanticActionHandler: SemanticActionHandler): Promise<any> {
        this.semanticActionHandler = semanticActionHandler;
        let response = await sendQuery({
            model: 'gpt-4',
            temperature: 0.8,
            max_tokens: 2048,
            top_p: 0.8,
            messages: [{
                role: 'system',
                content: this.prompt
            }, ...this.inputBuffer.map((message) => ({
                role: message.role,
                content: message.content
            })) as any]
        });
        try {
            response += '\n';
            const { grammar, semantics } = this.loadGrammar(this.grammarFile);
            const ohmParser = semantics.addOperation("toJSON", this.semanticActionHandler);
            const match = grammar.match(response);
            if (!match.failed()) {
                const result = await ohmParser(match).toJSON();
                return result;
            } else { 
                this.addMessageToInputBuffer({
                    role: 'system',
                    content: 'INVALID OUTPUT FORMAT. Please review the instructions and try again.'
                });
                console.log(`invalid output format: ${response}`);
                await this.iterate(semanticActionHandler);
            }
        } catch (e) { 
            await this.iterate(semanticActionHandler);
        }
    }

    // execute the SPS - iterates until explicitly disabled
    async execute(semanticActionHandler: SemanticActionHandler): Promise<any> {
        this._executing = true;
        const _run = async (): Promise<any> => {
            if (!this._executing) { return; }
            const result = await this.iterate(semanticActionHandler);
            if (result && result.stop) { // execution can be stopped by the semantic action handler
                this._executing = false;
                console.log('Execution stopped');
                return result;
            }
            if (this._interrupted) {
                this._executing = false;
                this._interrupted = false;
                return result;
            } 
            return await _run();
        }; 
        return await _run();
    }

    // serialize the SPS to a file
    serializeToFile(filePath: string): void {
        const serializedData = JSON.stringify({
            prompt: this.prompt,
            grammarFile: this.grammarFile,
            inputBuffer: this.inputBuffer,
        });
        fs.writeFileSync(filePath, serializedData);
    }

    // deserialize from file
    static deserializeFromFile(filePath: string): SPS {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const deserializedData = JSON.parse(fileContent);
        const sps = new SPS(
            deserializedData.prompt,
            deserializedData.grammarFile);
        sps.inputBuffer = deserializedData.inputBuffer;
        return sps;
    }

    // load the SPS grammar
    private loadGrammar(grammarFile: string) {
        // Read the grammar file and return an Ohm.js grammar object
        const grammar = Ohm.grammar(grammarFile);
        const semantics = grammar.createSemantics();
        return { grammar, semantics };
    }
}
