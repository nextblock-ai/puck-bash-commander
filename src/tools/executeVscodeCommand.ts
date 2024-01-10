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
                        type: 'string',
                        description: 'A comma-separated list of arguments to pass to the command.',
                    }
                },
                required: ['command']
            }
        },
    },
    function: async ({ command, _arguments }: any) => {
        try {
            _arguments = _arguments ? _arguments.split(',') : [];
            const result = await vscode.commands.executeCommand(command, ..._arguments);
            return result ? JSON.stringify(result) : 'command executed';
        } catch (err: any) {
            return err.message;
        }
    }
};
export default module.exports ;
