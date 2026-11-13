/** Indicadores numéricos e medidores de força, aceleração e velocidade. */
import React from 'react';
import type { ForceBreakdown, RecoilInfo } from '../core/types';
import { VECTOR_COLORS } from '../render/Vectors';

export interface HudSnapshot {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  accel: number;
  forces: ForceBreakdown;
}

const fmt = (n: number, d = 1) =>
  Number.isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';

function Meter({ label, value, max, unit, color, digits = 0 }: { label: string; value: number; max: number; unit: string; color: string; digits?: number }) {
  const ratio = Number.isFinite(value) ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="meter">
      <div className="meter-head">
        <span>{label}</span>
        <strong>
          {fmt(value, digits)} <small>{unit}</small>
        </strong>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${ratio * 100}%`, background: color }} />
      </div>
    </div>
  );
}

function Stat({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: string }) {
  return (
    <div className={`stat ${tone ?? ''}`}>
      <span>{label}</span>
      <strong>
        {value}
        {unit && <small> {unit}</small>}
      </strong>
    </div>
  );
}

interface StatsPanelProps {
  force: number;
  mass: number;
  acceleration: number;
  launchSpeed: number;
  distanceToTarget: number;
  flightTime: number | null;
  flightTimeIsEstimate: boolean;
  maxHeight: number | null;
  recoil: RecoilInfo | null;
  maxRecoil?: number;
  hud: HudSnapshot | null;
}

export function StatsPanel(p: StatsPanelProps) {
  const recoilWarn = p.recoil && p.maxRecoil !== undefined && p.recoil.distance > p.maxRecoil;
  return (
    <section className="panel stats" aria-label="Indicadores">
      <h3 className="panel-title">
        <span className="dot dot-green" /> Indicadores (antes do disparo)
      </h3>
      <div className="meters">
        <Meter label="Força aplicada (F)" value={p.force} max={12000} unit="N" color="#7048e8" />
        <Meter label="Aceleração no cano (a = F/m)" value={p.acceleration} max={12000} unit="m/s²" color="#f08c00" />
        <Meter label="Velocidade inicial (v₀ = a·Δt)" value={p.launchSpeed} max={60} unit="m/s" color={VECTOR_COLORS.velocity} digits={1} />
      </div>
      <div className="stat-grid">
        <Stat label="Massa do projétil" value={fmt(p.mass)} unit="kg" />
        <Stat label="Distância até o alvo" value={fmt(p.distanceToTarget)} unit="m" />
        <Stat label={p.flightTimeIsEstimate ? 'Tempo de voo (estimativa)' : 'Tempo de voo previsto'} value={p.flightTime === null ? '—' : fmt(p.flightTime, 2)} unit="s" />
        <Stat label="Altura máxima prevista" value={p.maxHeight === null ? '—' : fmt(p.maxHeight)} unit="m" />
        <Stat label="Recuo do canhão" value={p.recoil ? fmt(p.recoil.velocity, 2) : '—'} unit="m/s" />
        <Stat
          label={p.maxRecoil !== undefined ? `Distância de recuo (máx ${fmt(p.maxRecoil)} m)` : 'Distância de recuo'}
          value={p.recoil ? fmt(p.recoil.distance, 2) : '—'}
          unit="m"
          tone={recoilWarn ? 'warn' : p.maxRecoil !== undefined ? 'ok' : ''}
        />
      </div>

      {p.hud && (
        <>
          <h4 className="sub-title">Em tempo real</h4>
          <div className="stat-grid live">
            <Stat label="t" value={fmt(p.hud.t, 2)} unit="s" />
            <Stat label="x" value={fmt(p.hud.x)} unit="m" />
            <Stat label="y" value={fmt(p.hud.y)} unit="m" />
            <Stat label="|v|" value={fmt(p.hud.speed)} unit="m/s" />
            <Stat label="vx" value={fmt(p.hud.vx)} unit="m/s" />
            <Stat label="|a|" value={fmt(p.hud.accel, 2)} unit="m/s²" />
          </div>
        </>
      )}
    </section>
  );
}

export function VectorLegend() {
  const items = [
    { color: VECTOR_COLORS.velocity, label: 'Velocidade (v)' },
    { color: VECTOR_COLORS.gravity, label: 'Gravidade (g)' },
    { color: VECTOR_COLORS.wind, label: 'Vento' },
    { color: VECTOR_COLORS.drag, label: 'Resistência do ar' },
    { color: VECTOR_COLORS.action, label: 'Ação (no projétil)' },
    { color: VECTOR_COLORS.reaction, label: 'Reação (no canhão)' },
  ];
  return (
    <div className="legend" aria-label="Legenda dos vetores">
      {items.map((i) => (
        <span key={i.label}>
          <i style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
      <span>
        <i className="legend-dots" />
        Trajetória prevista
      </span>
    </div>
  );
}
