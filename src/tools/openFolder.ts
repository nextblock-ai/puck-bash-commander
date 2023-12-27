import * as vscode from 'vscode';
module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'vscode_open_folder',
            description: 'Opens a specified folder in the VS code editor',
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
            await vscode.commands.executeCommand('vscode.openFolder', uri);
            return `Opened ${path}`
        } catch (err: any) {
            return `Error opening ${path}: ${err.message}`
        }
    }
};
export default module.exports;
