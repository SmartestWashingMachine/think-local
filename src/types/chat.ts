export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  imageData?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export type ViewState = 'landing' | 'chat' | 'rag' | 'agent-graph';
