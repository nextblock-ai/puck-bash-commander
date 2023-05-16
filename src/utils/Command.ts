/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import { commands, ExtensionContext } from 'vscode';

// unregister the command
function unregisterCommand(commandId: string): void {
    const commandsList = vscode.commands.getCommands(false);
    commandsList.then((commands) => {
        if (commands.includes(commandId)) {
            vscode.commands.executeCommand('workbench.action.removeCommand', commandId);
        }
    });
}

// execute the command
async function executeCommand(commandId: string, ...args: any[]): Promise<any> {
    try {
        const result = await vscode.commands.executeCommand(commandId, ...args);
        return result;
    } catch (error) {
        console.error(`Error executing command ${commandId}:`, error);
        throw error;
    }
}

export abstract class Command {

    // Constructor
    constructor(public commandId: string, public title: string, public context: ExtensionContext) {
        const commandDisposable = commands.registerCommand(commandId, this.execute, this);
        context.subscriptions.push(commandDisposable);
        this.onDidRegister();
    }

    // To be overridden by subclasses, execute the command logic
    abstract execute(...args: any[]): Promise<void>;

    // Check if the command can be executed in the current context
    isExecutable(): boolean {
        // Default implementation returns true, can be overridden by subclasses
        return true;
    }

    // Called when the command registration with VS Code is completed
    protected onDidRegister(): void {
        // Default implementation is empty, can be overridden by subclasses
    }

    // Called before the command is unregistered from VS Code
    protected async onWillUnregister(): Promise<void> {
        // Default implementation is empty, can be overridden by subclasses
    }

    // Get the command ID
    getId(): string {
        return this.commandId;
    }

    // Get the command's VS Code Extension Context
    getCommandContext(): ExtensionContext {
        return this.context;
    }

    // Register the command with VS Code
    static async register<T extends Command>(this: new (context: ExtensionContext) => T, context: ExtensionContext): Promise<T> {
        const command = new this(context);
        return command;
    }

    // Unregister the command from VS Code
    static async unregister(command: Command): Promise<void> {
        await command.onWillUnregister();
        command.getCommandContext().subscriptions.forEach((subscription) => {
            subscription.dispose();
        });
        unregisterCommand(command.getId());
    }

    // Execute the command
    static async execute(commandId: string, ...args: any[]): Promise<any> {
        return executeCommand(commandId, ...args);
    }
}