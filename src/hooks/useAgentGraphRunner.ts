import { useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { AgentNodeData, TraceEntry } from '../types/agentGraph';
import { AGENT_NODE_DEFINITIONS } from '../types/agentGraph';
import { generateEmbedding } from '../ai/embeddings';
import { search as vectorSearch } from '../ai/vectorStore';

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
    onTrace?: (entry: TraceEntry) => void,
  ): Promise<string> => {
    const userQueryNode = nodes.find(
      (n) => (n.data as unknown as AgentNodeData).nodeType === 'user-query',
    );
    if (!userQueryNode) return userInput;

    const addTrace = (node: Node, type: 'input' | 'output', description: string) => {
      const nodeData = node.data as unknown as AgentNodeData;
      onTrace?.({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        nodeId: node.id,
        nodeLabel: nodeData.label,
        nodeType: nodeData.nodeType,
        type,
        description,
      });
    };

    addTrace(userQueryNode, 'output', `User Query: ${userInput}`);

    let currentOutput = userInput;
    let currentNodeId = userQueryNode.id;

    for (let i = 0; i < 20; i++) {
      const outgoingEdge = edges.find((e) => e.source === currentNodeId);
      if (!outgoingEdge) break;

      const nextNode = nodes.find((n) => n.id === outgoingEdge.target);
      if (!nextNode) break;

      const nodeData = nextNode.data as unknown as AgentNodeData;
      const nodeType = nodeData.nodeType;
      const nodeDef = AGENT_NODE_DEFINITIONS[nodeType];

      const inputPreview = currentOutput.length > 200
        ? currentOutput.slice(0, 200) + '...'
        : currentOutput;
      addTrace(nextNode, 'input', `${nodeDef?.label ?? nodeType} Input: ${inputPreview}`);

      if (nodeType === 'llm') {
        const messageTemplate = (nodeData.message as string) ?? '{text}';
        const prompt = messageTemplate.replace('{text}', currentOutput);
        currentOutput = await generateCompletionStream(
          [{ role: 'user', content: prompt }],
          onToken,
        );
      } else if (nodeType === 'rag') {
        const k = (nodeData.k as number) ?? 3;
        let chunks: string[];
        try {
          const embedding = await generateEmbedding(currentOutput);
          const results = vectorSearch(embedding, k);
          if (results.length === 0) {
            console.log(`[AgentGraph] RAG node "${nodeData.label}": vector search returned 0 results (k=${k})`);
          }
          chunks = results.map((r) => r.document.content);
        } catch (err) {
          console.warn(`[AgentGraph] RAG node "${nodeData.label}" failed:`, err);
          chunks = [];
        }
        currentOutput = chunks.join('\n\n---\n\n');
      } else if (nodeType === 'string-joiner') {
        const joinString = (nodeData.joinString as string) ?? '\n';
        const parts = currentOutput.split('\n\n---\n\n');
        currentOutput = parts.join(joinString);
        console.log(`[AgentGraph] string-joiner "${nodeData.label}": joined ${parts.length} parts with separator "${joinString.replace('\n', '\\n')}"`);
      } else if (nodeType === 'if-string-contains') {
        const containsString = (nodeData.containsString as string) ?? '';
        const caseSensitive = (nodeData.caseSensitive as boolean) ?? true;
        const haystack = caseSensitive ? currentOutput : currentOutput.toLowerCase();
        const needle = caseSensitive ? containsString : containsString.toLowerCase();
        if (!haystack.includes(needle)) {
          currentOutput = '';
          break;
        }
      } else if (nodeType === 'if-closest-document') {
        const threshold = (nodeData.threshold as number) ?? 0.7;
        let conditionMet = false;
        try {
          const embedding = await generateEmbedding(currentOutput);
          const results = vectorSearch(embedding, 1);
          const bestScore = results.length > 0 ? results[0].score : 0;
          conditionMet = bestScore >= threshold;
          console.log(`[AgentGraph] if-closest-document "${nodeData.label}": bestScore=${bestScore.toFixed(4)}, threshold=${threshold}, conditionMet=${conditionMet}`);
        } catch (err) {
          console.warn(`[AgentGraph] if-closest-document "${nodeData.label}" embedding failed:`, err);
        }
        if (!conditionMet) {
          currentOutput = '';
          break;
        }
      }

      const outputPreview = currentOutput.length > 200
        ? currentOutput.slice(0, 200) + '...'
        : currentOutput;
      addTrace(nextNode, 'output', `${nodeDef?.label ?? nodeType} Output: ${outputPreview}`);

      currentNodeId = nextNode.id;
    }

    return currentOutput;
  }, []);

  return { executeGraph };
}
