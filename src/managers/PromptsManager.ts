/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext } from 'vscode';
import { TreeNode } from './types';

export class PromptsManager {
    private dataPath: string;
    private data: { prompts: any[]; tags: any[] };

    constructor(context: ExtensionContext) {
        // load from the project root
        this.dataPath = path.join(context.extensionPath, 'prompts.json');
        this.data = { prompts: [], tags: [] };
        this.loadData();
    }

    private loadData(): void {
        try {
            // look for existing data file. if no file exists, create one with default data
            if(!fs.existsSync(this.dataPath)) {
                this.saveData();
            }
            const rawData = fs.readFileSync(this.dataPath, 'utf-8');
            this.data = JSON.parse(rawData);
        } catch (error) {
            this.data = { prompts: [], tags: [] };
            this.createDefaultTags();
            this.saveData();
        }
    }

    private saveData(): void {
        const dataString = JSON.stringify(this.data || {}
            , null, 2);
        fs.writeFileSync(this.dataPath, dataString, 'utf-8');
    }

    private createDefaultTags(): void {
        // Add default tags if they don't exist
    }

    public listPrompts(): Promise<any[]> {
        return Promise.resolve(this.data.prompts);
    }

    public async addPrompt(prompt: string): Promise<void> {
        const newPrompt = { id: Date.now(), prompt };
        this.data.prompts.push(newPrompt);
        this.saveData();
    }

    public editPrompt(prompt: { id: number; prompt: string }): Promise<void> {
        const index = this.data.prompts.findIndex(p => p.id === prompt.id);
        if (index !== -1) {
            this.data.prompts[index] = prompt;
            this.saveData();
        }
        return Promise.resolve();
    }

    public deletePrompt(promptID: number): Promise<void> {
        this.data.prompts = this.data.prompts.filter(p => p.id !== promptID);
        this.saveData();
        return Promise.resolve();
    }

    public async getPrompt(promptId: number): Promise<any> {
        const prompt = this.data.prompts.find(p => p.id === promptId);
        return Promise.resolve(prompt);
    }

    public listTags(): Promise<any[]> {
        return Promise.resolve(this.data.tags);
    }

    public addTag(tag: string): Promise<void> {
        const newTag = { id: Date.now(), tag };
        this.data.tags.push(newTag);
        this.saveData();
        return Promise.resolve();
    }

    public editTag(tag: { id: number; tag: string }): Promise<void> {
        const index = this.data.tags.findIndex(t => t.id === tag.id);
        if (index !== -1) {
            this.data.tags[index] = tag;
            this.saveData();
        }
        return Promise.resolve();
    }

    public deleteTag(tagID: number): Promise<void> {
        this.data.tags = this.data.tags.filter(t => t.id !== tagID);
        this.saveData();
        return Promise.resolve();
    }

    public getDefaultPrompt(): Promise<any> {
        const defaultPrompt = this.data.prompts.find(p => p.id === 1);
        return Promise.resolve(defaultPrompt ? defaultPrompt.prompt : "You are helpful assistant");
    }

    public createAndShowPromptExplorerView(tree: TreeNode): void {
        const treeDataProvider = new class implements vscode.TreeDataProvider<TreeNode> {
            onDidChangeTreeData: vscode.Event<TreeNode> | undefined;

            getTreeItem(element: TreeNode): vscode.TreeItem {
                const treeItem = new vscode.TreeItem(element.content);
                treeItem.collapsibleState = element.children.length > 0
                    ? vscode.TreeItemCollapsibleState.Collapsed
                    : vscode.TreeItemCollapsibleState.None;
                return treeItem;
            }

            getChildren(element?: TreeNode): TreeNode[] {
                if (!element) {
                    return tree.children;
                }
                return element.children;
            }
        }();

        const promptExplorerView = vscode.window.createTreeView('promptExplorer', {
            treeDataProvider: treeDataProvider
        });

        promptExplorerView.onDidChangeSelection(async (e) => {
            if (e.selection.length === 1) {
                const treeNode = e.selection[0];
                if (treeNode.type === 'promptContent') {
                //    await this.runWithPrompt(treeNode.content);
                }
            }
        });

        vscode.commands.executeCommand('attila.promptManager.promptExplorer');
    }
}

