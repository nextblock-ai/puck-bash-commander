import * as vscode from 'vscode';

module.exports  = {
    schema: {
        type: "function",
        function: {
            name: "vscode_navigate_to",
            description: "Navigates to a specific position or line in a file in the VS code editor",
            parameters: {
                type: "object",
                properties: {
                    filePath: {
                        type: "string",
                        description: "The file path to navigate in"
                    },
                    line: {
                        type: "number",
                        description: "The line number to navigate to"
                    },
                    character: {
                        type: "number",
                        description: "The character position on the line (optional)"
                    }
                },
                required: ["filePath", "line"]
            }
        }
    },
    function: async (params: any) => {
        const { filePath, line, character = 0 } = params;
        const uri = vscode.Uri.file(filePath);
        
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document, {
                selection: new vscode.Range(line, character, line, character)
            });
            return `Navigated to ${filePath}:${line}:${character}`
        } catch (err: any) {
            return `Error navigating to ${filePath}:${line}:${character}: ${err.message}`
        }
    }
}
export default module.exports ;
