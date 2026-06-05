import { useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { AgentNodeData } from '../types/agentGraph';

export function useAgentGraphRunner() {
  const executeGraph = useCallback(async (
    nodes: Node[],
    edges: Edge[],
    userInput: string,
    generateCompletionStream: (
      messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
      onToken: (token: string) => void,
    ) => Promise<string>,
    onToken: (token: string) => void,
  ): Promise<string> => {
    const userQueryNode = nodes.find(
      (n) => (n.data as unknown as AgentNodeData).nodeType === 'user-query',
    );
    if (!userQueryNode) return userInput;

    let currentOutput = userInput;
    let currentNodeId = userQueryNode.id;

    for (let i = 0; i < 20; i++) {
      const outgoingEdge = edges.find((e) => e.source === currentNodeId);
      if (!outgoingEdge) break;

      const nextNode = nodes.find((n) => n.id === outgoingEdge.target);
      if (!nextNode) break;

      const nodeData = nextNode.data as unknown as AgentNodeData;
      const nodeType = nodeData.nodeType;

      if (nodeType === 'llm') {
        const messageTemplate = (nodeData.message as string) ?? '{text}';
        const prompt = messageTemplate.replace('{text}', currentOutput);
        currentOutput = await generateCompletionStream(
          [{ role: 'user', content: prompt }],
          onToken,
        );
      }

      currentNodeId = nextNode.id;
    }

    return currentOutput;
  }, []);

  return { executeGraph };
}
