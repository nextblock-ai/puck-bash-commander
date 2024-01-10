import * as vscode from 'vscode';
import SidebarWebview from '../webviews/sidebar';
import NotebookController from '../controllers/notebook';
import { AiService } from '../services/aiService';

export const generateScriptCommand = 'puck.generateScript';
export const scriptFromNotebookCommand = 'puck.scriptFromNotebook';
export const completeCellWithPromptCommand = 'puck.completeCellWithPrompt';
export const completeCellCommand = 'puck.completeCell';
export const fixNotebookCommand = 'puck.fixNotebook';

export default function activateCommands(context: vscode.ExtensionContext) {

    const sidebarWebview = new SidebarWebview();
    const notebookController = new NotebookController();
    const aiService = new AiService();

    // generate a script from a notebook requirements doc cell
    context.subscriptions.push(
        vscode.commands.registerCommand(generateScriptCommand, async () => {

            const cellText = vscode.window.activeTextEditor?.document.getText();
            if (!cellText) { return }
            // Use AI to generate script
            
            const script = await aiService.generateScript(cellText);
            const cellContent = script.cells[0]
            if(!cellContent) {
                return;
            }

            await notebookController.insertNotebookCells(
                cellContent.length,
                [NotebookController.createNotebookCell(script.cells[0], 'python')]
            )
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(fixNotebookCommand, async () => {

            const cellText = vscode.window.activeTextEditor?.document.getText();
            if (!cellText) { return }

            const cell = NotebookController.cell();
            if(!cell) { return }

            const errors = NotebookController.getCellsErrors();
            if (errors.length !== 0) {
            
                // Call AI to fix errors
                const fixedScript = await aiService.fixScript(NotebookController.toString(), errors as any);
                if(!fixedScript) { 
                    return;
                }
            
                // create a range that spans the entire cell
                const range = vscode.window.activeTextEditor?.selection;
                await notebookController.replaceNotebookCells(
                    range,
                    [NotebookController.createNotebookCell(fixedScript)]
                );
            } else {
                vscode.window.showInformationMessage('No errors to fix');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(completeCellCommand, async () => {
            const cellText = vscode.window.activeTextEditor?.document.getText();
            if (!cellText) { return }

            const cell = NotebookController.cell();
            if(!cell) { return }
            
            // Call AI to fix errors
            const fixedScript = await aiService.completeScript(NotebookController.toString());

            // create a range that spans the entire cell
            const range = vscode.window.activeTextEditor?.selection;
            await notebookController.replaceNotebookCells(
                range,
                [NotebookController.createNotebookCell(fixedScript)]
            );
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(completeCellWithPromptCommand, async () => {
            const cellText = vscode.window.activeTextEditor?.document.getText();
            if (!cellText) { return }

            const cell = NotebookController.cell();
            if(!cell) { return }

            const response = await vscode.window.showInputBox({
                prompt: 'Enter the text to complete the cell with',
                placeHolder: 'Enter the text to complete the cell with',
                value: ''
            });
            
            // Call AI to fix errors
            const fixedScript = await aiService.completeScript(response + '\n---\n' + NotebookController.toString());

            let ncell = NotebookController.createNotebookCell(fixedScript)
            ncell.metadata = cell.metadata;
            // create a range that spans the entire cell
            const range = vscode.window.activeTextEditor?.selection;
            await notebookController.replaceNotebookCells(
                range,
                [ncell]
            );
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(scriptFromNotebookCommand, async () => {
            const cellText = vscode.window.activeTextEditor?.document.getText();
            if (!cellText) { return }

            const cell = NotebookController.cell();
            if(!cell) { return }

            const jdoc = NotebookController.getNotebookSourceWithErrors();
            
            // Ccreate a new vs code document and open it
            const doc = await vscode.workspace.openTextDocument({ language: 'python', content: jdoc });

            // set the document text
            await vscode.window.showTextDocument(doc, { preview: false });
        })
    );
    sidebarWebview.activate(context);
}

// Helper functions