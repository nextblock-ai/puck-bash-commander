import * as vscode from 'vscode';
module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'vscode_open_file',
            description: 'Opens a specified file in the VS code editor',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'File path to open'
                    }
                },
                required: ['path']
            }
        },
    },
    function: async ({ path }: any) => {
        const uri = vscode.Uri.file(path);
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
            return `Opened ${path}`
        } catch (err: any) {
            return `Error opening ${path}: ${err.message}`
        }
    }
};
export default module.exports;
