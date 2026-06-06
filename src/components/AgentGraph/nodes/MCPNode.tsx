import { type NodeProps } from '@xyflow/react';
import type { AgentNodeData } from '../../../types/agentGraph';
import './MCPNode.css';

const MCP_TOOL_KEYS: (keyof AgentNodeData)[] = [
  'currentDateEnabled',
  'calculatorEnabled',
  'sayOutLoudEnabled',
  'regexFilterEnabled',
] as unknown as (keyof AgentNodeData)[];

export default function MCPNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const enabledTools = MCP_TOOL_KEYS.filter((k) => nodeData[k] === true).length;

  return (
    <div className={`mcp-node ${selected ? 'mcp-node--selected' : ''}`}>
      <span className="mcp-node__label">{nodeData.label}</span>
      <span className="mcp-node__badge">{enabledTools} tool{enabledTools !== 1 ? 's' : ''} active</span>
    </div>
  );
}
