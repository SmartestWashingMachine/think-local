export type AgentNodeType =
  | 'user-query'
  | 'llm'
  | 'rag'
  | 'string-joiner'
  | 'if-string-contains'
  | 'if-closest-document'
  | 'chat-message';

export type AgentNodeCategory = 'input' | 'process' | 'if' | 'output';

export type ValueType = 'string' | 'list<string>';

export interface HandleConfig {
  id: string;
  label: string;
  type: 'source' | 'target';
  position: 'left' | 'right' | 'top' | 'bottom';
  valueType: ValueType;
}

export interface AgentNodeData {
  nodeType: AgentNodeType;
  label: string;
  [key: string]: unknown;
}

export interface AgentNodeDefinition {
  type: AgentNodeType;
  category: AgentNodeCategory;
  label: string;
  color: string;
  description: string;
  handles: HandleConfig[];
}

export const AGENT_NODE_DEFINITIONS: Record<AgentNodeType, AgentNodeDefinition> = {
  'user-query': {
    type: 'user-query',
    category: 'input',
    label: 'User Query',
    color: '#4caf50',
    description: 'The initial user input — always present',
    handles: [
      { id: 'output', label: 'Query', type: 'source', position: 'bottom', valueType: 'string' },
    ],
  },
  llm: {
    type: 'llm',
    category: 'process',
    label: 'LLM',
    color: '#2196f3',
    description: 'Calls a language model with an input string',
    handles: [
      { id: 'input', label: 'Input', type: 'target', position: 'top', valueType: 'string' },
      { id: 'output', label: 'Output', type: 'source', position: 'bottom', valueType: 'string' },
    ],
  },
  rag: {
    type: 'rag',
    category: 'process',
    label: 'RAG',
    color: '#2196f3',
    description: 'Retrieves relevant document chunks for a query',
    handles: [
      { id: 'input', label: 'Query', type: 'target', position: 'top', valueType: 'string' },
      { id: 'output', label: 'Chunks', type: 'source', position: 'bottom', valueType: 'list<string>' },
    ],
  },
  'string-joiner': {
    type: 'string-joiner',
    category: 'process',
    label: 'String Joiner',
    color: '#2196f3',
    description: 'Joins multiple strings into one',
    handles: [
      { id: 'input', label: 'Strings', type: 'target', position: 'top', valueType: 'list<string>' },
      { id: 'output', label: 'Output', type: 'source', position: 'bottom', valueType: 'string' },
    ],
  },
  'if-string-contains': {
    type: 'if-string-contains',
    category: 'if',
    label: 'If String Contains',
    color: '#ff9800',
    description: 'Branches based on whether a substring is found',
    handles: [
      { id: 'input', label: 'Input', type: 'target', position: 'top', valueType: 'string' },
      { id: 'output', label: 'Output', type: 'source', position: 'bottom', valueType: 'string' },
    ],
  },
  'if-closest-document': {
    type: 'if-closest-document',
    category: 'if',
    label: 'If Closest Document',
    color: '#ff9800',
    description: 'Branches based on the closest matching document',
    handles: [
      { id: 'input', label: 'Query', type: 'target', position: 'top', valueType: 'string' },
      { id: 'output', label: 'Output', type: 'source', position: 'bottom', valueType: 'string' },
    ],
  },
  'chat-message': {
    type: 'chat-message',
    category: 'output',
    label: 'Chat Message',
    color: '#9c27b0',
    description: 'Displays the final output as a chat message',
    handles: [
      { id: 'input', label: 'Input', type: 'target', position: 'top', valueType: 'string' },
    ],
  },
};

export const AGENT_NODE_CATEGORIES: { key: AgentNodeCategory; label: string }[] = [
  { key: 'input', label: 'Input' },
  { key: 'process', label: 'Process' },
  { key: 'if', label: 'IF / Logic' },
  { key: 'output', label: 'Output' },
];
