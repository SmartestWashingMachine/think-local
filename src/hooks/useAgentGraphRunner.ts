import { useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { AgentNodeData, TraceEntry } from '../types/agentGraph';
import { AGENT_NODE_DEFINITIONS } from '../types/agentGraph';
import { generateEmbedding } from '../ai/embeddings';
import { search as vectorSearch } from '../ai/vectorStore';

type NodeOutput = string | string[] | null;

function topologicalSort(nodes: Node[], edges: Edge[], rootId: string): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    adj.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue = [rootId];
  const order: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    for (const neighbor of adj.get(current) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
  }

  return order;
}

function preview(val: string, max = 200): string {
  return val.length > max ? val.slice(0, max) + '...' : val;
}

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

    const outputs = new Map<string, NodeOutput>();
    outputs.set(userQueryNode.id, userInput);

    const topoOrder = topologicalSort(nodes, edges, userQueryNode.id);

    for (const nodeId of topoOrder) {
      if (nodeId === userQueryNode.id) continue;

      const node = nodes.find((n) => n.id === nodeId)!;
      const nodeData = node.data as unknown as AgentNodeData;
      const nodeType = nodeData.nodeType;
      const nodeDef = AGENT_NODE_DEFINITIONS[nodeType];

      const incomingEdges = edges.filter((e) => e.target === nodeId);
      const sourceOutputs: NodeOutput[] = incomingEdges.map(
        (e) => outputs.get(e.source) ?? null,
      );
      const successfulOutputs = sourceOutputs.filter(
        (v): v is string | string[] => v !== null,
      );

      if (successfulOutputs.length === 0) {
        outputs.set(nodeId, null);
        addTrace(node, 'input', `${nodeDef?.label ?? nodeType} Input: (canceled)`);
        addTrace(node, 'output', `${nodeDef?.label ?? nodeType} Output: (canceled)`);
        continue;
      }

      const firstStr = successfulOutputs.find((v) => typeof v === 'string') ?? '';

      if (nodeType === 'string-joiner') {
        const inputSummary = successfulOutputs
          .map((v) => (typeof v === 'string' ? `"${preview(v)}"` : `[${v.length} items]`))
          .join(', ');
        addTrace(node, 'input', `${nodeDef?.label ?? nodeType} Inputs: ${inputSummary}`);
      } else {
        addTrace(node, 'input', `${nodeDef?.label ?? nodeType} Input: ${preview(firstStr)}`);
      }

      let result: NodeOutput = null;

      if (nodeType === 'llm') {
        const messageTemplate = (nodeData.message as string) ?? '{text}';
        const prompt = messageTemplate.replace('{text}', firstStr);
        result = await generateCompletionStream(
          [{ role: 'user', content: prompt }],
          onToken,
        );
      } else if (nodeType === 'rag') {
        const k = (nodeData.k as number) ?? 3;
        try {
          const embedding = await generateEmbedding(firstStr);
          const results = vectorSearch(embedding, k);
          if (results.length === 0) {
            console.log(`[AgentGraph] RAG node "${nodeData.label}": vector search returned 0 results (k=${k})`);
          }
          result = results.map((r) => r.document.content);
        } catch (err) {
          console.warn(`[AgentGraph] RAG node "${nodeData.label}" failed:`, err);
          result = [];
        }
      } else if (nodeType === 'string-joiner') {
        const joinString = (nodeData.joinString as string) ?? '\n';
        const inputOrder = (nodeData.inputOrder as string[]) ?? [];

        const sortedEdges = [...incomingEdges].sort((a, b) => {
          const aIdx = inputOrder.indexOf(a.id);
          const bIdx = inputOrder.indexOf(b.id);
          return (aIdx === -1 ? Infinity : aIdx) - (bIdx === -1 ? Infinity : bIdx);
        });

        const allItems: string[] = [];
        for (const edge of sortedEdges) {
          const output = outputs.get(edge.source);
          if (output === null || output === undefined) continue;

          const srcNode = nodes.find((n) => n.id === edge.source)!;
          const srcData = srcNode.data as unknown as AgentNodeData;
          const srcDef = AGENT_NODE_DEFINITIONS[srcData.nodeType];
          const srcHandle = srcDef?.handles.find((h) => h.id === edge.sourceHandle);

          if (srcHandle?.valueType === 'list<string>') {
            allItems.push(...(output as string[]));
          } else {
            allItems.push(output as string);
          }
        }

        result = allItems.join(joinString);
      } else if (nodeType === 'format-string') {
        const format = (nodeData.format as string) ?? '{text}';
        result = format.replace('{text}', firstStr);
      } else if (nodeType === 'if-string-contains') {
        const containsString = (nodeData.containsString as string) ?? '';
        const caseSensitive = (nodeData.caseSensitive as boolean) ?? true;
        const haystack = caseSensitive ? firstStr : firstStr.toLowerCase();
        const needle = caseSensitive ? containsString : containsString.toLowerCase();
        result = haystack.includes(needle) ? firstStr : null;
      } else if (nodeType === 'if-closest-document') {
        const threshold = (nodeData.threshold as number) ?? 0.7;
        let conditionMet = false;
        try {
          const embedding = await generateEmbedding(firstStr);
          const vecResults = vectorSearch(embedding, 1);
          const bestScore = vecResults.length > 0 ? vecResults[0].score : 0;
          conditionMet = bestScore >= threshold;
          console.log(`[AgentGraph] if-closest-document "${nodeData.label}": bestScore=${bestScore.toFixed(4)}, threshold=${threshold}, conditionMet=${conditionMet}`);
        } catch (err) {
          console.warn(`[AgentGraph] if-closest-document "${nodeData.label}" embedding failed:`, err);
        }
        result = conditionMet ? firstStr : null;
      } else if (nodeType === 'chat-message') {
        result = firstStr;
      }

      outputs.set(nodeId, result);

      if (result === null) {
        addTrace(node, 'output', `${nodeDef?.label ?? nodeType} Output: (canceled)`);
      } else if (typeof result === 'string') {
        addTrace(node, 'output', `${nodeDef?.label ?? nodeType} Output: ${preview(result)}`);
      } else {
        addTrace(node, 'output', `${nodeDef?.label ?? nodeType} Output: [${result.length} items]`);
      }
    }

    const chatNode = nodes.find(
      (n) => (n.data as unknown as AgentNodeData).nodeType === 'chat-message',
    );
    const finalOutput = chatNode ? outputs.get(chatNode.id) : null;
    return typeof finalOutput === 'string' ? finalOutput : '';
  }, []);

  return { executeGraph };
}
