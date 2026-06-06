import { useEffect, useRef } from 'react';
import type { TraceEntry } from '../../types/agentGraph';
import './TracePanel.css';

interface TracePanelProps {
  entries: TraceEntry[];
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function TracePanel({ entries }: TracePanelProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="trace-panel trace-panel--empty">
        <p className="trace-panel__placeholder">
          No trace data. Run the graph to see execution traces.
        </p>
      </div>
    );
  }

  return (
    <div className="trace-panel">
      <div className="trace-panel__header">
        <h3 className="trace-panel__title">Execution Trace</h3>
        <span className="trace-panel__count">{entries.length} step{entries.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="trace-panel__list" ref={listRef}>
        {entries.map((entry) => (
          <div key={entry.id} className={`trace-panel__entry trace-panel__entry--${entry.type}`}>
            <div className="trace-panel__entry-line">
              <span className={`trace-panel__tag trace-panel__tag--${entry.type}`}>
                {entry.type === 'input' ? 'IN' : 'OUT'}
              </span>
              <span className="trace-panel__label">{entry.nodeLabel}</span>
              <span className="trace-panel__time">{formatTime(entry.timestamp)}</span>
            </div>
            <p className="trace-panel__description">{entry.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
