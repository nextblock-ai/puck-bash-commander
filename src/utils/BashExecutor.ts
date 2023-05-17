import { exec } from 'child_process';
import shelljs from 'shelljs';

export default class BashExecutor {
    private currentPath: string;

    constructor() {
        this.currentPath = process.cwd();
    }

    async executeBashCommand(command: string, log: any): Promise<{ stdout: string, stderr: string }> {
        const formattedCommands: any[] = this.formatMultilineBash(command);
        const output = { stdout: '', stderr: '' };
        for (const formattedCommand of formattedCommands) {
            // if the command is cd, update the current path
            if (formattedCommand.startsWith('cd')) {
                const path = formattedCommand.split(' ')[1];
                if (path === '-') {
                    this.currentPath = this.getFirstWorkspaceFolderPath() || '';
                } else {
                    this.currentPath = path;
                }
                continue;
            }
            log(formattedCommand);
            const result = await this.runBashCommand(formattedCommand, this.currentPath);
            log(result.stdout);
            output.stdout += result.stdout;
            output.stderr += result.stderr;
        }
        return output;
    }

    formatMultilineBash(input: string) {
        // Split the input by line
        const lines = input.split('\n');

        // Initialize the formatted commands array
        const formattedCommands: any = [];
        let currentCommand = '';

        // Process each line
        for (const line of lines) {
            // Remove any leading or trailing whitespace
            const trimmedLine = line.trim();

            // Check for an empty or commented line
            if (trimmedLine === '' || trimmedLine.startsWith('#')) {
                continue;
            }

            // Escape single quotes in sed commands
            if (trimmedLine.startsWith('sed')) {
                const pattern = /'(.*?)'/g;
                const replacement = (_: any, match: string) => {
                    return '\'' + match.replace(/'/g, '\'"\'"\'') + '\'';
                };
                const escapedLine = trimmedLine.replace(pattern, replacement);
                currentCommand += escapedLine;
            } else {
                currentCommand += trimmedLine;
            }

            // Check if the line ends with a backslash, and if so remove it and continue in the next iteration
            if (currentCommand.endsWith('\\')) {
                currentCommand = currentCommand.slice(0, -1) + ' ';
                continue;
            }

            // Add the current command to the formatted commands array and reset it
            formattedCommands.push(currentCommand);
            currentCommand = '';
        }

        return formattedCommands;
    }

    async runBashCommand(command: string, cwd: string): Promise<{ stdout: string, stderr: string }> {
        return new Promise((resolve, reject) => {
            shelljs.exec(command, { cwd }, (code, stdout, stderr) => {
                if (code !== 0) {
                    resolve({ stdout: '', stderr: stderr || 'Error' });
                } else {
                    resolve({ stdout, stderr: '' });
                }
            });
            // exec(command, { cwd }, (error, stdout, stderr) => {
            //     if (error) {
            //         resolve({ stdout: '', stderr: error.message });
            //     } else {
            //         resolve({ stdout, stderr });
            //     }
            // });
        });
    }

    getFirstWorkspaceFolderPath(): string {
        // Implement the logic to get the first workspace folder path
        // For example, in VSCode you can use: vscode.workspace.workspaceFolders[0].uri.fsPath
        return '';
    }
}

// Usage example
// const bashExecutor = new BashExecutor();

// async function executeAndLog(command: string) {
//     console.log(`Executing: ${command}`);
//     const result = await bashExecutor.executeBashCommand(command, console.log);
//     console.log(`Result:\n${result.stdout}`);
//     if (result.stderr) {
//         console.error(`Error:\n${result.stderr}`);
//     }
// }

// executeAndLog('echo "Hello, World!"');
// executeAndLog(`
//     echo "This is a multiline command:"
//     echo "Line 1"
//     echo "Line 2"
//     echo "Line 3"
// `);