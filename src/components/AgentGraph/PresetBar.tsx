import type { GraphPreset } from '../../constants/presets';
import './PresetBar.css';

interface PresetBarProps {
  presets: GraphPreset[];
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
}

export default function PresetBar({ presets, activePresetId, onSelectPreset }: PresetBarProps) {
  return (
    <div className="preset-bar">
      <label className="preset-bar__label" htmlFor="preset-select">Preset:</label>
      <select
        id="preset-select"
        className="preset-bar__select"
        value={activePresetId}
        onChange={(e) => onSelectPreset(e.target.value)}
      >
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
