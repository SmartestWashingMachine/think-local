export type AgentNodeType =
  | 'user-query'
  | 'user-image'
  | 'webcam-image'
  | 'llm'
  | 'rag'
  | 'string-joiner'
  | 'format-string'
  | 'if-string-contains'
  | 'if-closest-document'
  | 'logic-and'
  | 'logic-or'
  | 'chat-message'
  | 'mcp'
  | 'tts';

export type AgentNodeCategory = 'input' | 'process' | 'if' | 'output' | 'mcp';

export type ValueType = 'string' | 'list<string>' | 'image';

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

export type TraceNodeType = AgentNodeType | 'system-message' | 'tool-call';

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
  'user-image': {
    type: 'user-image',
    category: 'input',
    label: 'User Image',
    color: '#4caf50',
    description: 'An image attached by the user to their message',
    handles: [
      { id: 'output', label: 'Image', type: 'source', position: 'bottom', valueType: 'image' },
    ],
    properties: [],
    defaults: {},
  },
  'webcam-image': {
    type: 'webcam-image',
    category: 'input',
    label: 'Webcam Image',
    color: '#4caf50',
    description: 'Captures a frame from the webcam triggered by a text input',
    handles: [
      { id: 'trigger', label: 'Trigger', type: 'target', position: 'top', valueType: 'string' },
      { id: 'output', label: 'Image', type: 'source', position: 'bottom', valueType: 'image' },
    ],
    properties: [],
    defaults: {},
  },
  llm: {
    type: 'llm',
    category: 'process',
    label: 'LLM',
    color: '#2196f3',
    description: 'Calls a language model with an input string and optional image',
    handles: [
      { id: 'input', label: 'Input', type: 'target', position: 'top', valueType: 'string' },
      { id: 'image', label: 'Image', type: 'target', position: 'left', valueType: 'image' },
      { id: 'output', label: 'Output', type: 'source', position: 'bottom', valueType: 'string' },
    ],
    properties: [
      { key: 'message', label: 'Message', type: 'text', placeholder: '{text}', description: 'Template for the LLM prompt. Use {text} to insert the input.' },
      { key: 'streamOutput', label: 'Stream Output', type: 'boolean', description: 'When enabled, streams the LLM output token by token into the chat as it is generated.' },
    ],
    defaults: { message: '{text}', streamOutput: false, inputOrder: [] },
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
      { id: 'true', label: 'True', type: 'source', position: 'bottom', valueType: 'string' },
      { id: 'false', label: 'False', type: 'source', position: 'bottom', valueType: 'string' },
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
      { id: 'true', label: 'True', type: 'source', position: 'bottom', valueType: 'string' },
      { id: 'false', label: 'False', type: 'source', position: 'bottom', valueType: 'string' },
    ],
    properties: [
      { key: 'threshold', label: 'Threshold', type: 'number', min: 0, max: 1, step: 0.05, description: 'Similarity threshold for matching' },
    ],
    defaults: { threshold: 0.7 },
  },
  'logic-and': {
    type: 'logic-and',
    category: 'if',
    label: 'AND Gate',
    color: '#7c4dff',
    description: 'Outputs the value if ALL condition edges flow',
    handles: [
      { id: 'conditions', label: 'Conditions', type: 'target', position: 'left', valueType: 'string', acceptsTypes: ['string'] },
      { id: 'value', label: 'Value', type: 'target', position: 'top', valueType: 'string' },
      { id: 'output', label: 'Output', type: 'source', position: 'bottom', valueType: 'string' },
    ],
    properties: [],
    defaults: {},
  },
  'logic-or': {
    type: 'logic-or',
    category: 'if',
    label: 'OR Gate',
    color: '#00bcd4',
    description: 'Outputs the value if ANY condition edge flows',
    handles: [
      { id: 'conditions', label: 'Conditions', type: 'target', position: 'left', valueType: 'string', acceptsTypes: ['string'] },
      { id: 'value', label: 'Value', type: 'target', position: 'top', valueType: 'string' },
      { id: 'output', label: 'Output', type: 'source', position: 'bottom', valueType: 'string' },
    ],
    properties: [],
    defaults: {},
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
  tts: {
    type: 'tts',
    category: 'output',
    label: 'TTS',
    color: '#e91e63',
    description: 'Converts text to speech using Kokoro TTS and plays it aloud',
    handles: [
      { id: 'input', label: 'Input', type: 'target', position: 'top', valueType: 'string' },
    ],
    properties: [
      {
        key: 'voice', label: 'Voice', type: 'select',
        description: 'The voice to use for speech synthesis',
        options: [
          { label: '🇺🇸 af_bella (F)', value: 'af_bella' },
          { label: '🇺🇸 af_heart (F)', value: 'af_heart' },
          { label: '🇺🇸 af_nicole (F)', value: 'af_nicole' },
          { label: '🇺🇸 af_sarah (F)', value: 'af_sarah' },
          { label: '🇺🇸 af_sky (F)', value: 'af_sky' },
          { label: '🇺🇸 am_adam (M)', value: 'am_adam' },
          { label: '🇺🇸 am_echo (M)', value: 'am_echo' },
          { label: '🇺🇸 am_fenrir (M)', value: 'am_fenrir' },
          { label: '🇺🇸 am_liam (M)', value: 'am_liam' },
          { label: '🇺🇸 am_onyx (M)', value: 'am_onyx' },
          { label: '🇬🇧 bf_emma (F)', value: 'bf_emma' },
          { label: '🇬🇧 bf_isabella (F)', value: 'bf_isabella' },
          { label: '🇬🇧 bm_fable (M)', value: 'bm_fable' },
          { label: '🇬🇧 bm_george (M)', value: 'bm_george' },
        ],
      },
    ],
    defaults: { voice: 'af_bella' },
  },
  mcp: {
    type: 'mcp',
    category: 'mcp',
    label: 'MCP',
    color: '#ff9800',
    description: 'Enables MCP tool calling. Add this node to give the LLM access to built-in tools.',
    handles: [],
    properties: [
      { key: 'systemMessage', label: 'System Message', type: 'text', placeholder: 'Auto-generated from enabled tools', description: 'Template for the system prompt injected before each LLM call. Leave empty to auto-generate.' },
      { key: 'currentDateEnabled', label: 'Current Date', type: 'boolean', description: 'Get current date as a string' },
      { key: 'calculatorEnabled', label: 'Calculator', type: 'boolean', description: 'Parse math operation and calculate result' },
      { key: 'sayOutLoudEnabled', label: 'Say Out Loud', type: 'boolean', description: 'Use speech API for text to speech' },
      { key: 'regexFilterEnabled', label: 'Regex Filter', type: 'boolean', description: 'Apply a regex filter to a string and return matches' },
    ],
    defaults: {
      systemMessage: '',
      currentDateEnabled: true,
      calculatorEnabled: true,
      sayOutLoudEnabled: false,
      regexFilterEnabled: false,
    },
  },
};

export interface TraceEntry {
  id: string;
  timestamp: number;
  nodeId: string;
  nodeLabel: string;
  nodeType: TraceNodeType;
  type: 'input' | 'output';
  description: string;
}

export const AGENT_NODE_CATEGORIES: { key: AgentNodeCategory; label: string }[] = [
  { key: 'input', label: 'Input' },
  { key: 'process', label: 'Process' },
  { key: 'if', label: 'IF / Logic' },
  { key: 'output', label: 'Output' },
  { key: 'mcp', label: 'MCP' },
];
