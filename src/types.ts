
export interface Deliverable {
  id: number
  title: string;
  description: string;
  completed: boolean;
  tasks: Task[];
}

// An interface representing a task object
export interface Task {
  id: number;
  deliverableId: number;
  title: string;
  description: string;
  completed: boolean;
  steps: Step[];
}

// An interface representing a step object (a subtask)
export interface Step {
  title: string;
  completed: boolean;
}

export interface Message {
  role: string;
  content: string;
}

export interface Conversation {
  messages: Message[];
  settings: LLMSettings;
}

export interface LLMSettings {
  key: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
}

export interface LLMSettingsMapping {
  [key: string]: LLMSettings;
}

export interface LLMHistoryEntry {
  prompt: Message;
  response: Message;
  settings: LLMSettings;
}

export interface LLMHistoryManager {
  getConversationHistory(): LLMHistoryEntry[];
  setConversationHistory(history: LLMHistoryEntry[]): void;
}

export interface LLMSession extends Conversation {
  llm: LLM;
}

export interface LLM {
  settings: LLMSettings;
  history: LLMHistoryEntry[];
}

export interface LLMCoreInterface {
  name: string;
  sendRequest(request: Conversation): Promise<Conversation>;
  streamRequest(request: Conversation, onUpdate: (response: Message) => void, onEnd: () => void): void;
  configure(settings: object): void;
  registerHistory(historyEntry: object): void;
}

export interface GPTChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GPTChatConversation {
  model: string;
  messages: GPTChatMessage[];
  max_tokens?: number;
  top_p?: number;
  temperature?: number;
  stream?: boolean;
  apikey?: string;
}