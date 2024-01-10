import * as vscode from 'vscode';
module.exports = {
    schema: {
        type: 'function',
        function: {
            name: 'vscode_apply_edit',
            description: 'Applies a WorkspaceEdit to the workspace',
            parameters: {
                type: 'object',
                properties: {
                    edit: {
                        type: 'object',
                        description: 'WorkspaceEdit to apply'
                    }
                },
                required: ['edit']
            }
        },
    },
    function: async (obj: any) => {
        try {
            const edit = new vscode.WorkspaceEdit();
            for (const [uri, edits] of Object.entries(obj.edit)) {
                const uriObj = vscode.Uri.parse(uri);
                edit.set(uriObj, edits as any);
            }
            await vscode.workspace.applyEdit(edit);
            return `Applied WorkspaceEdit`
        } catch (err: any) {
            return `Error applying WorkspaceEdit: ${err.message}`
        }
    }
};
export default module.exports;
