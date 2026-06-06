export type AgentNodeType =
  | 'user-query'
  | 'llm'
  | 'rag'
  | 'string-joiner'
  | 'format-string'
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
  acceptsTypes?: ValueType[];
}

interface BasePropertyDefinition {
  key: string;
  label: string;
  description?: string;
}

interface TextPropertyDefinition extends BasePropertyDefinition {
  type: 'text';
  placeholder?: string;
}

interface NumberPropertyDefinition extends BasePropertyDefinition {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

interface BooleanPropertyDefinition extends BasePropertyDefinition {
  type: 'boolean';
}

interface SelectPropertyDefinition extends BasePropertyDefinition {
  type: 'select';
  options: { label: string; value: string }[];
}

export type PropertyDefinition =
  | TextPropertyDefinition
  | NumberPropertyDefinition
  | BooleanPropertyDefinition
  | SelectPropertyDefinition;

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
  properties: PropertyDefinition[];
  defaults: Record<string, unknown>;
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
    properties: [],
    defaults: {},
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
    properties: [
      { key: 'message', label: 'Message', type: 'text', placeholder: '{text}', description: 'Template for the LLM prompt. Use {text} to insert the input.' },
    ],
    defaults: { message: '{text}' },
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
    properties: [
      { key: 'database', label: 'Database', type: 'select', options: [{ label: 'Default', value: 'default' }], description: 'Which knowledge base to search' },
      { key: 'k', label: 'K', type: 'number', min: 1, max: 50, step: 1, description: 'Number of documents to return' },
    ],
    defaults: { database: 'default', k: 3 },
  },
  'string-joiner': {
    type: 'string-joiner',
    category: 'process',
    label: 'String Joiner',
    color: '#2196f3',
    description: 'Joins multiple strings into one',
    handles: [
      { id: 'input', label: 'Strings', type: 'target', position: 'top', valueType: 'list<string>', acceptsTypes: ['string', 'list<string>'] },
      { id: 'output', label: 'Output', type: 'source', position: 'bottom', valueType: 'string' },
    ],
    properties: [
      { key: 'joinString', label: 'Join String', type: 'text', placeholder: '\\n', description: 'The string to join each item with' },
    ],
    defaults: { joinString: '\n', inputOrder: [] },
  },
  'format-string': {
    type: 'format-string',
    category: 'process',
    label: 'Format String',
    color: '#2196f3',
    description: 'Formats a string using a template',
    handles: [
      { id: 'input', label: 'Input', type: 'target', position: 'top', valueType: 'string' },
      { id: 'output', label: 'Output', type: 'source', position: 'bottom', valueType: 'string' },
    ],
    properties: [
      { key: 'format', label: 'Format', type: 'text', placeholder: '{text}', description: 'Template for the output string. Use {text} to insert the input.' },
    ],
    defaults: { format: '{text}' },
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
    properties: [
      { key: 'containsString', label: 'Contains String', type: 'text', placeholder: 'substring', description: 'Does input contain this string?' },
      { key: 'caseSensitive', label: 'Case Sensitive', type: 'boolean', description: 'Whether the check is case-sensitive' },
    ],
    defaults: { containsString: '', caseSensitive: true },
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
    properties: [
      { key: 'threshold', label: 'Threshold', type: 'number', min: 0, max: 1, step: 0.05, description: 'Similarity threshold for matching' },
    ],
    defaults: { threshold: 0.7 },
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
    properties: [],
    defaults: {},
  },
};

export interface TraceEntry {
  id: string;
  timestamp: number;
  nodeId: string;
  nodeLabel: string;
  nodeType: AgentNodeType;
  type: 'input' | 'output';
  description: string;
}

export const AGENT_NODE_CATEGORIES: { key: AgentNodeCategory; label: string }[] = [
  { key: 'input', label: 'Input' },
  { key: 'process', label: 'Process' },
  { key: 'if', label: 'IF / Logic' },
  { key: 'output', label: 'Output' },
];
