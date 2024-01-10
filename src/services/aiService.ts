import  {
    fixScriptPrompt,
    completeScriptPrompt,
    explainErrorPrompt,
    generateScriptFromRequirements,
    generateSuggestionsPrompt
} from './prompts';
import { sendQuery } from './core';
import FooterBar from '../controllers/footer';

interface generateScriptResponse {
    cells: string[];
}


export class AiService {

    footerBar: any;
    constructor() {
        this.footerBar = new FooterBar();
    }

    async generateScript(cellContent: string): Promise<generateScriptResponse> {
        this.footerBar.spinnerOn('Generating script...');
        const response = await sendQuery( generateScriptFromRequirements + cellContent);
        const message: string = response || ''
        this.footerBar.spinnerOff('Script generated successfully');
        return {
            cells: [message]
        }
    }

    async fixScript(script: string, errors: string): Promise<string> {
        this.footerBar.spinnerOn('Fixing errors...');
        const response = await sendQuery(fixScriptPrompt + script + '\nerrors\n' + errors);
        const message = response || '';
        this.footerBar.spinnerOff('Errors fixed successfully');
        return message;
    }

    async completeScript(partialScript: string): Promise<string> {
        this.footerBar.spinnerOn('Completing script...');
        const response = await sendQuery(completeScriptPrompt + partialScript);
        const message = response || '';
        this.footerBar.spinnerOff('Script completed successfully');
        return message;
    }

    async explainError(errorOutput: string): Promise<string> {
        this.footerBar.spinnerOn('Explaining error...');
        const response = await sendQuery(explainErrorPrompt + errorOutput);
        const message = response || '';
        this.footerBar.spinnerOff('Error explained successfully');
        return message;
    }

    async generateSuggestions(notebookInput: string, suggestion: string): Promise<string> {
        this.footerBar.spinnerOn('Generating suggestions...');
        const response = await sendQuery(generateSuggestionsPrompt + notebookInput + '\n' + 'Input:\n' + suggestion);
        const message = response || '';
        this.footerBar.spinnerOff('Suggestions generated successfully');
        return message;
    }
}

