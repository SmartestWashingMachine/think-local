import { useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { AgentNodeData, AgentNodeType, TraceEntry } from '../types/agentGraph';
import { AGENT_NODE_DEFINITIONS } from '../types/agentGraph';
import { generateEmbedding } from '../ai/embeddings';
import { search as vectorSearch } from '../ai/vectorStore';
import type { ChatCompletionTool } from '../types/mcp';
import type { ChatCompletionMessage, ChatCompletionMessageContent } from '@wllama/wllama/esm/types/oai-compat';
import type { Message } from '../types/chat';

type NodeOutputValue = string | string[] | ArrayBuffer | null;

interface NodeHandlerContext {
  firstStr: string;
  incomingEdges: Edge[];
  nodeData: AgentNodeData;
  outputs: Map<string, NodeOutputValue>;
  handleOutputs: Map<string, Map<string, NodeOutputValue>>;
  nodes: Node[];
  edges: Edge[];
  messages: Message[];
  generateCompletionStream: (
    messages: ChatCompletionMessage[],
    onToken: (token: string) => void,
  ) => Promise<string>;
  onToken: (token: string) => void;
  setAssistantContent?: (content: string) => void;
  mcpTools?: ChatCompletionTool[];
  mcpSystemMessage?: string;
  executeTool?: (name: string, args: Record<string, unknown>) => Promise<string>;
  generateCompletionWithTools?: (
    messages: ChatCompletionMessage[],
    onToken: (token: string) => void,
    tools: ChatCompletionTool[],
    executeTool: (name: string, args: Record<string, unknown>) => Promise<string>,
    onToolTrace?: (name: string, args: string, result: string) => void,
  ) => Promise<string>;
  onToolTrace?: (name: string, args: string, result: string) => void;
  onUserImageCapture?: (dataUrl: string) => void;
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

function buildMultimodalUserContent(
  prompt: string,
  incomingEdges: Edge[],
  inputOrder: string[],
  outputs: Map<string, NodeOutputValue>,
  handleOutputs: Map<string, Map<string, NodeOutputValue>>,
): string | ChatCompletionMessageContent[] {
  const imageEdges = incomingEdges.filter((e) => e.targetHandle === 'image');
  let imageData: ArrayBuffer | null = null;
  for (const edge of imageEdges) {
    const output = getSourceOutput(edge.source, edge.sourceHandle, outputs, handleOutputs);
    if (output instanceof ArrayBuffer) {
      imageData = output;
      break;
    }
  }

  if (!imageData) return prompt;

  const sortedEdges = [...incomingEdges].sort((a, b) => {
    const aIdx = inputOrder.indexOf(a.id);
    const bIdx = inputOrder.indexOf(b.id);
    return (aIdx === -1 ? Infinity : aIdx) - (bIdx === -1 ? Infinity : bIdx);
  });

  const contentParts: ChatCompletionMessageContent[] = [];
  for (const edge of sortedEdges) {
    if (edge.targetHandle === 'input') {
      contentParts.push({ type: 'text', text: prompt });
    } else if (edge.targetHandle === 'image' && imageData) {
      contentParts.push({ type: 'image', data: imageData });
    }
  }
  return contentParts;
}

const llmHandler: NodeHandler = async ({ firstStr, incomingEdges, nodeData, outputs, handleOutputs, messages: conversationHistory, generateCompletionStream, onToken, setAssistantContent, mcpTools, mcpSystemMessage, executeTool, generateCompletionWithTools, onToolTrace }) => {
  const messageTemplate = (nodeData.message as string) ?? '{text}';
  const prompt = messageTemplate.replace('{text}', firstStr);
  const streamOutput = (nodeData.streamOutput as boolean) ?? false;
  const inputOrder = (nodeData.inputOrder as string[]) ?? [];

  const userContent = buildMultimodalUserContent(prompt, incomingEdges, inputOrder, outputs, handleOutputs);

  const historyMessages: ChatCompletionMessage[] = conversationHistory
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));

  if (mcpTools && mcpTools.length > 0 && generateCompletionWithTools && executeTool) {
    setAssistantContent?.('');
    const messages: ChatCompletionMessage[] = [];
    if (mcpSystemMessage) {
      messages.push({ role: 'system', content: mcpSystemMessage });
    }
    messages.push(...historyMessages);
    messages.push({ role: 'user', content: userContent });
    return await generateCompletionWithTools(
      messages,
      onToken,
      mcpTools,
      executeTool,
      onToolTrace,
    );
  }

  const llmMessages: ChatCompletionMessage[] = [];
  if (mcpSystemMessage) {
    llmMessages.push({ role: 'system', content: mcpSystemMessage });
  }
  llmMessages.push(...historyMessages);
  llmMessages.push({ role: 'user', content: userContent });

  if (streamOutput) {
    setAssistantContent?.('');
    return await generateCompletionStream(
      llmMessages,
      onToken,
    );
  }

  return await generateCompletionStream(
    llmMessages,
    () => {},
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

const chatMessageHandler: NodeHandler = async ({ firstStr, setAssistantContent }) => {
  setAssistantContent?.(firstStr);
  return firstStr;
};

const webcamImageHandler: NodeHandler = async ({ onUserImageCapture }) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    stream.getTracks().forEach((track) => track.stop());

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
    });

    if (onUserImageCapture) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(blob);
      });
      onUserImageCapture(dataUrl);
    }

    return await blob.arrayBuffer();
  } catch (err) {
    console.warn('[AgentGraph] Webcam capture failed:', err);
    return null;
  }
};

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
  'webcam-image': webcamImageHandler,
};

export function useAgentGraphRunner() {
  const executeGraph = useCallback(async (
    nodes: Node[],
    edges: Edge[],
    userInput: string,
    messages: Message[],
    generateCompletionStream: (
      messages: ChatCompletionMessage[],
      onToken: (token: string) => void,
    ) => Promise<string>,
    onToken: (token: string) => void,
    setAssistantContent?: (content: string) => void,
    onTrace?: (entry: TraceEntry) => void,
    mcpConfig?: {
      systemMessage: string;
      tools: ChatCompletionTool[];
      executeTool: (name: string, args: Record<string, unknown>) => Promise<string>;
    } | null,
    generateCompletionWithToolsFn?: (
      messages: ChatCompletionMessage[],
      onToken: (token: string) => void,
      tools: ChatCompletionTool[],
      executeTool: (name: string, args: Record<string, unknown>) => Promise<string>,
      onToolTrace?: (name: string, args: string, result: string) => void,
    ) => Promise<string>,
    onUserImageCapture?: (dataUrl: string) => void,
  ): Promise<string> => {
    const userQueryNode = nodes.find(
      (n) => (n.data as unknown as AgentNodeData).nodeType === 'user-query',
    );
    if (!userQueryNode) return userInput;

    const mcpNode = nodes.find(
      (n) => (n.data as unknown as AgentNodeData).nodeType === 'mcp',
    );

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
            .map((v) => {
              if (typeof v === 'string') return `"${preview(v)}"`;
              if (v instanceof ArrayBuffer) return `(image: ${v.byteLength} bytes)`;
              return v.map((item) => preview(item)).join('\n---\n');
            })
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
          messages,
          generateCompletionStream,
          onToken,
          setAssistantContent,
          mcpTools: mcpConfig?.tools,
          mcpSystemMessage: mcpConfig?.systemMessage,
          executeTool: mcpConfig?.executeTool,
          generateCompletionWithTools: generateCompletionWithToolsFn,
          onUserImageCapture,
          onToolTrace: (name, args, toolResult) => {
            const nodeLabel = `Tool: ${name}`;
            onTrace?.({
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              nodeId: mcpNode?.id ?? 'mcp',
              nodeLabel,
              nodeType: 'tool-call',
              type: 'input',
              description: args,
            });
            onTrace?.({
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              nodeId: mcpNode?.id ?? 'mcp',
              nodeLabel,
              nodeType: 'tool-call',
              type: 'output',
              description: toolResult,
            });
          },
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
        outputs.set(nodeId, result);
      }

      if (result === null) {
        addTrace(node, 'output', '(canceled)');
      } else if (typeof result === 'string') {
        addTrace(node, 'output', preview(result));
      } else if (result instanceof ArrayBuffer) {
        addTrace(node, 'output', `(image: ${result.byteLength} bytes)`);
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
