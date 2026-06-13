import { MarkerType, type Edge } from '@xyflow/react';
import type { ValueType } from '../../types/agentGraph';

export const VALUE_TYPE_STYLES: Record<ValueType, { stroke: string; strokeWidth: number; strokeDasharray?: string }> = {
  string: { stroke: '#666', strokeWidth: 2 },
  'list<string>': { stroke: '#999', strokeWidth: 2, strokeDasharray: '6 3' },
  image: { stroke: '#4caf50', strokeWidth: 2 },
  audio: { stroke: '#e91e63', strokeWidth: 2 },
};

export function applyEdgeStyle(edge: Edge, valueType: ValueType): Edge {
  const style = VALUE_TYPE_STYLES[valueType];
  return {
    ...edge,
    style,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: style.stroke,
      width: 24,
      height: 24,
    },
  };
}
