import shell from 'shelljs';
import bashParser from 'bash-parser';

export function parseAndExecuteBashCommands(inputString: any) {
    const parsedCommands = bashParser(inputString);
    return traverseAndExecute(parsedCommands);
}

function executeBashNode(node: any) {
    let output = {
        stdout: '',
        stderr: '',
    };

    switch (node.type) {
        case 'Command':
            const command = node.name.text;
            const args = node.suffix.map((arg: any) => arg.text).join(' ');
            const result = shell.exec(`${command} ${args}`, { silent: true });
            output.stdout += result.stdout;
            output.stderr += result.stderr;
            break;
        case 'Pipeline':
            node.commands.forEach((command: any) => {
                const pipelineOutput = executeBashNode(command);
                output.stdout += pipelineOutput.stdout;
                output.stderr += pipelineOutput.stderr;
            });
            break;
        case 'Subshell':
            const subshellOutput = traverseAndExecute(node.commands);
            output.stdout += subshellOutput.stdout;
            output.stderr += subshellOutput.stderr;
            break;
        case 'CompoundList':
            node.commands.forEach((command: any) => {
                const compoundListOutput = traverseAndExecute(command);
                output.stdout += compoundListOutput.stdout;
                output.stderr += compoundListOutput.stderr;
            });
            break;
        default:
            console.error(`Unsupported node type: ${node.type}`);
    }

    return output;
}

function traverseAndExecute(node: any) {
    let output = {
        stdout: '',
        stderr: '',
    };

    if (Array.isArray(node)) {
        node.forEach((n) => {
            const nodeOutput = traverseAndExecute(n);
            output.stdout += nodeOutput.stdout;
            output.stderr += nodeOutput.stderr;
        });
    } else {
        const nodeOutput = executeBashNode(node);
        output.stdout += nodeOutput.stdout;
        output.stderr += nodeOutput.stderr;
    }

    return output;
}