export type MCPToolType = 'current-date' | 'calculator' | 'say-out-loud' | 'regex-filter';

export interface ChatCompletionToolFunctionParameters {
  type: 'object';
  properties: Record<string, {
    type: string;
    description?: string;
    enum?: string[];
    [key: string]: unknown;
  }>;
  required?: string[];
}

export interface ChatCompletionToolFunction {
  name: string;
  description?: string;
  parameters?: ChatCompletionToolFunctionParameters;
}

export interface ChatCompletionTool {
  type: 'function';
  function: ChatCompletionToolFunction;
}

export const TOOL_DEFINITIONS: Record<MCPToolType, ChatCompletionTool> = {
  'current-date': {
    type: 'function',
    function: {
      name: 'get_current_date',
      description: 'Get the current date and time as a string. No arguments needed.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  'calculator': {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Evaluate a mathematical expression and return the numeric result. Supports +, -, *, /, parentheses, and basic math functions.',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'The mathematical expression to evaluate, e.g. "2 + 2" or "sqrt(16) * 3"',
          },
        },
        required: ['expression'],
      },
    },
  },
  'say-out-loud': {
    type: 'function',
    function: {
      name: 'say_out_loud',
      description: 'Use browser text-to-speech to speak the given text aloud.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text to speak aloud',
          },
        },
        required: ['text'],
      },
    },
  },
  'regex-filter': {
    type: 'function',
    function: {
      name: 'regex_filter',
      description: 'Apply a regular expression pattern to a string and return all matches.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'The regular expression pattern (without delimiters, e.g. "\\\\d+" for digits)',
          },
          text: {
            type: 'string',
            description: 'The text to search in',
          },
        },
        required: ['pattern', 'text'],
      },
    },
  },
};

export const MCP_TOOL_LABELS: Record<MCPToolType, string> = {
  'current-date': 'Current Date',
  'calculator': 'Calculator',
  'say-out-loud': 'Say Out Loud',
  'regex-filter': 'Regex Filter',
};

export function generateSystemMessage(enabledTools: MCPToolType[]): string {
  if (enabledTools.length === 0) return '';
  const lines = enabledTools.map((t) => {
    const def = TOOL_DEFINITIONS[t];
    return `- ${def.function.name}: ${def.function.description}`;
  });
  return [
    'You have access to the following tools:',
    '',
    ...lines,
    '',
    'When you need to use a tool, call it using the proper function call. Wait for the result before continuing.',
  ].join('\n');
}
