import { useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { AgentNodeData, AgentNodeType, TraceEntry } from '../types/agentGraph';
import { AGENT_NODE_DEFINITIONS } from '../types/agentGraph';
import { generateEmbedding } from '../ai/embeddings';
import { search as vectorSearch } from '../ai/vectorStore';

type NodeOutputValue = string | string[] | null;

interface NodeHandlerContext {
  firstStr: string;
  incomingEdges: Edge[];
  nodeData: AgentNodeData;
  outputs: Map<string, NodeOutputValue>;
  handleOutputs: Map<string, Map<string, NodeOutputValue>>;
  nodes: Node[];
  edges: Edge[];
  generateCompletionStream: (
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    onToken: (token: string) => void,
  ) => Promise<string>;
  onToken: (token: string) => void;
}

type NodeHandler = (ctx: NodeHandlerContext) => Promise<NodeOutputValue>;

function getSourceOutput(
  source: string,
  sourceHandle: string | null | undefined,
  outputs: Map<string, NodeOutputValue>,
  handleOutputs: Map<string, Map<string, NodeOutputValue>>,
): NodeOutputValue {
  if (sourceHandle && handleOutputs.has(source)) {
    return handleOutputs.get(source)!.get(sourceHandle) ?? null;
  }
  return outputs.get(source) ?? null;
}

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

const llmHandler: NodeHandler = async ({ firstStr, nodeData, generateCompletionStream, onToken }) => {
  const messageTemplate = (nodeData.message as string) ?? '{text}';
  const prompt = messageTemplate.replace('{text}', firstStr);
  return await generateCompletionStream(
    [{ role: 'user', content: prompt }],
    onToken,
  );
};

const ragHandler: NodeHandler = async ({ firstStr, nodeData }) => {
  const k = (nodeData.k as number) ?? 3;
  try {
    const embedding = await generateEmbedding(firstStr);
    const results = vectorSearch(embedding, k);
    if (results.length === 0) {
      console.log(`[AgentGraph] RAG node "${nodeData.label}": vector search returned 0 results (k=${k})`);
    }
    return results.map((r) => r.document.content);
  } catch (err) {
    console.warn(`[AgentGraph] RAG node "${nodeData.label}" failed:`, err);
    return [];
  }
};

const stringJoinerHandler: NodeHandler = async ({ incomingEdges, nodeData, outputs, handleOutputs, nodes }) => {
  const joinString = (nodeData.joinString as string) ?? '\n';
  const inputOrder = (nodeData.inputOrder as string[]) ?? [];

  const sortedEdges = [...incomingEdges].sort((a, b) => {
    const aIdx = inputOrder.indexOf(a.id);
    const bIdx = inputOrder.indexOf(b.id);
    return (aIdx === -1 ? Infinity : aIdx) - (bIdx === -1 ? Infinity : bIdx);
  });

  const allItems: string[] = [];
  for (const edge of sortedEdges) {
    const output = getSourceOutput(edge.source, edge.sourceHandle, outputs, handleOutputs);
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

  return allItems.join(joinString);
};

const formatStringHandler: NodeHandler = async ({ firstStr, nodeData }) => {
  const format = (nodeData.format as string) ?? '{text}';
  return format.replace('{text}', firstStr);
};

const ifStringContainsHandler: NodeHandler = async ({ firstStr, nodeData }) => {
  const containsString = (nodeData.containsString as string) ?? '';
  const caseSensitive = (nodeData.caseSensitive as boolean) ?? true;
  const haystack = caseSensitive ? firstStr : firstStr.toLowerCase();
  const needle = caseSensitive ? containsString : containsString.toLowerCase();
  return haystack.includes(needle) ? firstStr : null;
};

const ifClosestDocumentHandler: NodeHandler = async ({ firstStr, nodeData }) => {
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
  return conditionMet ? firstStr : null;
};

const chatMessageHandler: NodeHandler = async ({ firstStr }) => firstStr;

const andHandler: NodeHandler = async ({ incomingEdges, outputs, handleOutputs }) => {
  const conditionEdges = incomingEdges.filter((e) => e.targetHandle === 'conditions');
  const valueEdge = incomingEdges.find((e) => e.targetHandle === 'value');

  const allConditionsMet = conditionEdges.every((e) => {
    const val = getSourceOutput(e.source, e.sourceHandle, outputs, handleOutputs);
    return val !== null && val !== undefined;
  });

  if (!allConditionsMet) return null;

  const val = valueEdge
    ? getSourceOutput(valueEdge.source, valueEdge.sourceHandle, outputs, handleOutputs)
    : null;

  return typeof val === 'string' ? val : null;
};

const orHandler: NodeHandler = async ({ incomingEdges, outputs, handleOutputs }) => {
  const conditionEdges = incomingEdges.filter((e) => e.targetHandle === 'conditions');
  const valueEdge = incomingEdges.find((e) => e.targetHandle === 'value');

  const anyConditionMet = conditionEdges.some((e) => {
    const val = getSourceOutput(e.source, e.sourceHandle, outputs, handleOutputs);
    return val !== null && val !== undefined;
  });

  if (!anyConditionMet) return null;

  const val = valueEdge
    ? getSourceOutput(valueEdge.source, valueEdge.sourceHandle, outputs, handleOutputs)
    : null;

  return typeof val === 'string' ? val : null;
};

const HANDLERS: Partial<Record<AgentNodeType, NodeHandler>> = {
  llm: llmHandler,
  rag: ragHandler,
  'string-joiner': stringJoinerHandler,
  'format-string': formatStringHandler,
  'if-string-contains': ifStringContainsHandler,
  'if-closest-document': ifClosestDocumentHandler,
  'chat-message': chatMessageHandler,
  'logic-and': andHandler,
  'logic-or': orHandler,
};

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

    addTrace(userQueryNode, 'output', userInput);

    const outputs = new Map<string, NodeOutputValue>();
    const handleOutputs = new Map<string, Map<string, NodeOutputValue>>();
    outputs.set(userQueryNode.id, userInput);

    const topoOrder = topologicalSort(nodes, edges, userQueryNode.id);

    for (const nodeId of topoOrder) {
      if (nodeId === userQueryNode.id) continue;

      const node = nodes.find((n) => n.id === nodeId)!;
      const nodeData = node.data as unknown as AgentNodeData;
      const nodeType = nodeData.nodeType;

      const incomingEdges = edges.filter((e) => e.target === nodeId);
      const sourceOutputs: NodeOutputValue[] = incomingEdges.map(
        (e) => getSourceOutput(e.source, e.sourceHandle, outputs, handleOutputs),
      );
      const successfulOutputs = sourceOutputs.filter(
        (v): v is string | string[] => v !== null,
      );

      if (successfulOutputs.length === 0) {
        outputs.set(nodeId, null);
        addTrace(node, 'input', '(canceled)');
        addTrace(node, 'output', '(canceled)');
        continue;
      }

      const firstStr = successfulOutputs.find((v) => typeof v === 'string') ?? '';

      if (nodeType !== 'chat-message') {
        if (nodeType === 'string-joiner') {
          const inputSummary = successfulOutputs
            .map((v) => (typeof v === 'string' ? `"${preview(v)}"` : v.map((item) => preview(item)).join('\n---\n')))
            .join(', ');
          addTrace(node, 'input', inputSummary);
        } else {
          addTrace(node, 'input', preview(firstStr));
        }
      }

      const handler = HANDLERS[nodeType];
      if (!handler) {
        console.warn(`[AgentGraph] No handler for node type: ${nodeType}, canceling`);
        outputs.set(nodeId, null);
        addTrace(node, 'output', '(canceled - unknown type)');
        continue;
      }

      let result: NodeOutputValue;

      try {
        result = await handler({
          firstStr,
          incomingEdges,
          nodeData,
          outputs,
          handleOutputs,
          nodes,
          edges,
          generateCompletionStream,
          onToken,
        });
      } catch (err) {
        console.warn(`[AgentGraph] Handler for "${nodeType}" failed:`, err);
        result = null;
      }

      const isMultiOutput = nodeType === 'if-string-contains' || nodeType === 'if-closest-document';

      if (isMultiOutput) {
        const conditionMet = result !== null;
        handleOutputs.set(nodeId, new Map([
          ['true', conditionMet ? result : null],
          ['false', conditionMet ? null : result],
        ]));
      } else {
        // For single-output nodes, store primary result (for backward compat)
        // and also under the 'output' handle key for handle-aware readers
        outputs.set(nodeId, result);
      }

      if (result === null) {
        addTrace(node, 'output', '(canceled)');
      } else if (typeof result === 'string') {
        addTrace(node, 'output', preview(result));
      } else {
        addTrace(node, 'output', result.map((item) => preview(item)).join('\n---\n'));
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
