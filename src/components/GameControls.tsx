/**
 * Controles do disparo: sliders + campo numérico, com validação.
 * Componente de apresentação: recebe valores e devolve alterações via callbacks.
 */
import React, { useEffect, useState } from 'react';
import type { LaunchParams, LevelControls, ProjectileKind } from '../core/types';
import { LIMITS, Limit } from '../core/validation';
import { PROJECTILE_KINDS, PROJECTILES } from '../core/Projectile';

/** Aceita vírgula ou ponto decimal; texto vazio vira NaN (a validação acusa). */
export function parseDecimal(text: string): number {
  return text.trim() === '' ? NaN : Number(text.trim().replace(',', '.'));
}

interface RangeFieldProps {
  id: string;
  limit: Limit;
  value: number;
  max?: number;
  disabled?: boolean;
  hint?: string;
  onChange: (value: number) => void;
}

/** Slider + campo numérico sincronizados. Aceita digitação livre e deixa a validação apontar erros. */
export function RangeField({ id, limit, value, max, disabled, hint, onChange }: RangeFieldProps) {
  const [draft, setDraft] = useState(String(value));
  const upper = max ?? limit.max;

  // Sincroniza o texto quando o valor muda por fora (slider, troca de nível),
  // sem atrapalhar a digitação de valores intermediários como "2,".
  useEffect(() => {
    if (parseDecimal(draft) !== value && Number.isFinite(value)) setDraft(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commitText = (text: string) => {
    setDraft(text);
    onChange(parseDecimal(text));
  };

  const invalid = !Number.isFinite(value) || value < limit.min || value > upper;

  return (
    <div className={`field ${disabled ? 'is-disabled' : ''}`}>
      <div className="field-head">
        <label htmlFor={id}>{limit.label}</label>
        <span className="field-input">
          <input
            type="text"
            inputMode="decimal"
            aria-label={`${limit.label} (${limit.unit})`}
            className={invalid ? 'invalid' : ''}
            value={draft}
            disabled={disabled}
            onChange={(e) => commitText(e.target.value)}
          />
          <span className="unit">{limit.unit}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={limit.min}
        max={upper}
        step={limit.step}
        value={Number.isFinite(value) ? Math.min(upper, Math.max(limit.min, value)) : limit.min}
        disabled={disabled}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(Number(e.target.value));
        }}
      />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

interface GameControlsProps {
  params: LaunchParams;
  controls: LevelControls;
  forceMax: number;
  disabled: boolean;
  errors: string[];
  onChange: (patch: Partial<LaunchParams>) => void;
}

export function GameControls({ params, controls, forceMax, disabled, errors, onChange }: GameControlsProps) {
  const selectProjectile = (kind: ProjectileKind) => {
    onChange({ projectile: kind, mass: PROJECTILES[kind].defaultMass });
  };

  return (
    <section className="panel controls" aria-label="Controles do disparo">
      <h3 className="panel-title">
        <span className="dot dot-blue" /> Controles do disparo
      </h3>

      {controls.angle && (
        <RangeField id="ctl-angle" limit={LIMITS.angleDeg} value={params.angleDeg} disabled={disabled} onChange={(v) => onChange({ angleDeg: v })} />
      )}
      {controls.force && (
        <RangeField
          id="ctl-force"
          limit={LIMITS.force}
          value={params.force}
          max={forceMax}
          disabled={disabled}
          hint={forceMax < LIMITS.force.max ? `Restrição do nível: no máximo ${forceMax} N.` : undefined}
          onChange={(v) => onChange({ force: v })}
        />
      )}

      {controls.projectile && (
        <div className="field">
          <div className="field-head">
            <label>Tipo de projétil</label>
          </div>
          <div className="projectile-grid" role="radiogroup" aria-label="Tipo de projétil">
            {PROJECTILE_KINDS.map((kind) => {
              const spec = PROJECTILES[kind];
              const active = params.projectile === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`projectile-option ${active ? 'active' : ''}`}
                  disabled={disabled}
                  title={spec.description}
                  onClick={() => selectProjectile(kind)}
                >
                  <span className="ball" style={{ background: spec.color }} />
                  <span>{spec.name}</span>
                  <small>Cd {spec.dragCoefficient}</small>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {controls.mass && (
        <RangeField id="ctl-mass" limit={LIMITS.mass} value={params.mass} disabled={disabled} onChange={(v) => onChange({ mass: v })} />
      )}
      {controls.cannonMass && (
        <RangeField
          id="ctl-cannon"
          limit={LIMITS.cannonMass}
          value={params.cannonMass}
          disabled={disabled}
          hint="Canhão mais pesado → recuo menor (3ª lei)."
          onChange={(v) => onChange({ cannonMass: v })}
        />
      )}

      {errors.length > 0 && (
        <div className="errors" role="alert">
          {errors.map((e) => (
            <p key={e}>⚠ {e}</p>
          ))}
        </div>
      )}
    </section>
  );
}
