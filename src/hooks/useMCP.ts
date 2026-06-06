import { useCallback } from 'react';
import type { MCPToolType } from '../types/mcp';
import { TOOL_DEFINITIONS } from '../types/mcp';
import type { ChatCompletionTool } from '../types/mcp';

export function getCurrentDate(): string {
  return new Date().toLocaleString();
}

export function calculate(expression: string): string {
  const sanitized = expression.replace(/[^0-9+\-*/.()%\s\sqrt]/g, '');
  try {
    const result = new Function(`"use strict"; return (${sanitized})`)();
    if (typeof result !== 'number' || !isFinite(result)) {
      return 'Error: invalid result';
    }
    return String(result);
  } catch {
    return 'Error: invalid expression';
  }
}

export function sayOutLoud(text: string): string {
  if (!('speechSynthesis' in window)) {
    return 'Error: speech synthesis not available';
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
  return `Spoken: "${text}"`;
}

export function regexFilter(pattern: string, text: string): string {
  try {
    const regex = new RegExp(pattern, 'g');
    const matches = text.match(regex);
    if (!matches || matches.length === 0) {
      return 'No matches found';
    }
    return matches.join('\n');
  } catch {
    return 'Error: invalid regex pattern';
  }
}

export function useMCP() {
  const executeTool = useCallback(async (name: string, args: Record<string, unknown>): Promise<string> => {
    switch (name) {
      case 'get_current_date':
        return getCurrentDate();
      case 'calculate':
        return calculate(args.expression as string);
      case 'say_out_loud':
        return sayOutLoud(args.text as string);
      case 'regex_filter':
        return regexFilter(args.pattern as string, args.text as string);
      default:
        return `Error: unknown tool "${name}"`;
    }
  }, []);

  const getToolDefinitions = useCallback((enabledTools: MCPToolType[]): ChatCompletionTool[] => {
    return enabledTools.map((t) => TOOL_DEFINITIONS[t]);
  }, []);

  return {
    executeTool,
    getToolDefinitions,
  };
}
