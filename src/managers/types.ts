/* eslint-disable @typescript-eslint/no-explicit-any */
export interface TreeNode {
    type: string;
    content: string;
    children: TreeNode[];
}

// interface of a proposed change object
// has a type, a target file, and a proposed change
export interface ProposedChange {
    agent?: ProjectAgent;
    oldFileName: string,
    newFileName: string,
    oldFileStart: number,
    newFileStart: number,
    oldFileLines: number,
    newFileLines: number,
    changes: [],
}

// defines an agent 
export interface ProjectAgent {
    id: string,
    name: string; // the agent's name
    description: string; // the agent's description
    prompt: string; // the agent's prompt
    sps?: any, 
    fileFilter: string[],
    proposedChanges: ProposedChange[]
    agentSettings?: any;
}
