import * as vscode from 'vscode';
module.exports  = {
    schema: {
        type: 'function',
        function: {
            name: 'vscode_execute_command',
            description: 'execute a VS Code command using the given arguments (see https://code.visualstudio.com/api/references/commands)',
            parameters: {
                type: 'object',
                properties: {
                    command: {
                        type: 'string',
                        description: 'The VS Code command to execute.'
                    },
                    _arguments: {
                        type: 'array',
                        description: 'An array of arguments for the command.',
                        items: {
                            type: 'object',
                            additionalProperties: true
                        }
                    }
                },
                required: ['command']
            }
        },
    },
    function: async ({ command, _arguments }: any) => {
        try {
            return JSON.stringify(await vscode.commands.executeCommand(command, ... _arguments))
        } catch (err: any) {
            return err.message;
        }
    }
};
export default module.exports ;
