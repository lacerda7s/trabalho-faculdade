/** Painel do Modo Laboratório: liga/desliga forças e altera o ambiente. */
import React from 'react';
import type { LabToggles, WorldSettings } from '../core/types';
import { LIMITS } from '../core/validation';
import { describeWind } from '../core/WindSystem';
import { RangeField } from './GameControls';

const TOGGLE_LABELS: Record<keyof LabToggles, string> = {
  gravity: 'Gravidade',
  wind: 'Vento',
  airResistance: 'Resistência do ar',
  collisions: 'Colisões',
  recoil: 'Recuo do canhão',
};

const GRAVITY_PRESETS = [
  { name: 'Terra', g: 9.81 },
  { name: 'Lua', g: 1.62 },
  { name: 'Marte', g: 3.71 },
  { name: 'Júpiter', g: 24.79 },
];

interface LabPanelProps {
  world: WorldSettings;
  disabled: boolean;
  keepTraces: boolean;
  traceCount: number;
  onWorld: (patch: Partial<WorldSettings>) => void;
  onKeepTraces: (value: boolean) => void;
  onClearTraces: () => void;
}

export function LabPanel({ world, disabled, keepTraces, traceCount, onWorld, onKeepTraces, onClearTraces }: LabPanelProps) {
  const setToggle = (key: keyof LabToggles, value: boolean) => onWorld({ toggles: { ...world.toggles, [key]: value } });

  return (
    <section className="panel lab" aria-label="Modo laboratório">
      <h3 className="panel-title">
        <span className="dot dot-purple" /> Modo laboratório
      </h3>

      <div className="toggle-grid">
        {(Object.keys(TOGGLE_LABELS) as Array<keyof LabToggles>).map((key) => (
          <label key={key} className={`switch ${world.toggles[key] ? 'on' : ''}`}>
            <input type="checkbox" checked={world.toggles[key]} disabled={disabled} onChange={(e) => setToggle(key, e.target.checked)} />
            <span className="switch-track">
              <span className="switch-thumb" />
            </span>
            {TOGGLE_LABELS[key]}
          </label>
        ))}
      </div>

      <RangeField
        id="lab-gravity"
        limit={LIMITS.gravity}
        value={world.gravity}
        disabled={disabled || !world.toggles.gravity}
        onChange={(v) => onWorld({ gravity: v })}
      />
      <div className="chip-row">
        {GRAVITY_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className={`chip ${Math.abs(world.gravity - p.g) < 0.01 ? 'active' : ''}`}
            disabled={disabled || !world.toggles.gravity}
            onClick={() => onWorld({ gravity: p.g })}
          >
            {p.name}
          </button>
        ))}
      </div>

      <RangeField
        id="lab-wind"
        limit={LIMITS.windSpeed}
        value={world.windSpeed}
        disabled={disabled || !world.toggles.wind}
        hint={describeWind(world.windSpeed)}
        onChange={(v) => onWorld({ windSpeed: v })}
      />
      <RangeField
        id="lab-air"
        limit={LIMITS.airDensityFactor}
        value={world.airDensityFactor}
        disabled={disabled || !world.toggles.airResistance}
        hint="1× = ar ao nível do mar."
        onChange={(v) => onWorld({ airDensityFactor: v })}
      />

      <div className="field">
        <div className="field-head">
          <label>Comparar trajetórias</label>
        </div>
        <label className={`switch ${keepTraces ? 'on' : ''}`}>
          <input type="checkbox" checked={keepTraces} onChange={(e) => onKeepTraces(e.target.checked)} />
          <span className="switch-track">
            <span className="switch-thumb" />
          </span>
          Manter as últimas 5 trajetórias
        </label>
        <button type="button" className="btn btn-ghost btn-small" disabled={traceCount === 0} onClick={onClearTraces}>
          Limpar trajetórias ({traceCount})
        </button>
      </div>
    </section>
  );
}
