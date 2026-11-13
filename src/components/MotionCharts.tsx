/** Gráficos de posição, velocidade e aceleração em função do tempo (SVG). */
import React from 'react';
import type { SimSample } from '../core/types';

interface Series {
  label: string;
  color: string;
  values: number[];
}

const W = 300;
const H = 150;
const PAD = { l: 38, r: 8, t: 10, b: 22 };

function LineChart({ title, unit, times, series }: { title: string; unit: string; times: number[]; series: Series[] }) {
  const all = series.flatMap((s) => s.values);
  let min = Math.min(0, ...all);
  let max = Math.max(0, ...all);
  if (max - min < 1e-6) {
    max += 1;
    min -= 1;
  }
  const tMax = Math.max(times[times.length - 1] ?? 1, 0.1);
  const x = (t: number) => PAD.l + (t / tMax) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);
  const fmt = (n: number) => (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1));

  return (
    <figure className="chart">
      <figcaption>
        <strong>{title}</strong>
        <span className="chart-legend">
          {series.map((s) => (
            <span key={s.label}>
              <i style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} em função do tempo`}>
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="chart-zero" />
        <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} className="chart-axis" />
        <text x={PAD.l - 4} y={PAD.t + 8} textAnchor="end" className="chart-label">
          {fmt(max)}
        </text>
        <text x={PAD.l - 4} y={H - PAD.b} textAnchor="end" className="chart-label">
          {fmt(min)}
        </text>
        <text x={W - PAD.r} y={H - 6} textAnchor="end" className="chart-label">
          {tMax.toFixed(1)} s
        </text>
        <text x={PAD.l} y={H - 6} className="chart-label">
          0 s · {unit}
        </text>
        {series.map((s) => (
          <polyline
            key={s.label}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            points={s.values.map((v, i) => `${x(times[i]).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
          />
        ))}
      </svg>
    </figure>
  );
}

export function MotionCharts({ samples }: { samples: SimSample[] }) {
  return (
    <section className="panel charts" aria-label="Gráficos do movimento">
      <h3 className="panel-title">
        <span className="dot dot-orange" /> Gráficos do movimento
      </h3>
      {samples.length < 2 ? (
        <p className="muted">Faça um disparo para ver os gráficos de posição, velocidade e aceleração.</p>
      ) : (
        <div className="chart-grid">
          <LineChart
            title="Posição"
            unit="m"
            times={samples.map((s) => s.t)}
            series={[
              { label: 'x', color: '#1c7ed6', values: samples.map((s) => s.x) },
              { label: 'y', color: '#e8590c', values: samples.map((s) => s.y) },
            ]}
          />
          <LineChart
            title="Velocidade"
            unit="m/s"
            times={samples.map((s) => s.t)}
            series={[
              { label: 'vx', color: '#1c7ed6', values: samples.map((s) => s.vx) },
              { label: 'vy', color: '#e8590c', values: samples.map((s) => s.vy) },
            ]}
          />
          <LineChart
            title="Aceleração"
            unit="m/s²"
            times={samples.map((s) => s.t)}
            series={[
              { label: 'ax', color: '#1c7ed6', values: samples.map((s) => s.ax) },
              { label: 'ay', color: '#e8590c', values: samples.map((s) => s.ay) },
            ]}
          />
        </div>
      )}
    </section>
  );
}
