// Design Dials (Step 5 of the harvest rollout). A self-contained
// 3-slider control that lets the user nudge the agent's tone
// (variance, motion, density). It is a presentational component:
// the parent owns the live values and we surface change events
// through `onChange`, debounced so we don't fire 60 IPC calls per
// second while the user drags.
//
// Harvested from the "Taste" / "Cohesion" trend in agent-UI
// design — give the user three low-stakes knobs instead of
// asking them to author a soul.md from scratch.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "./useI18n";

export interface DesignDials {
  variance: number;
  motion: number;
  density: number;
}

interface DesignDialsProps {
  /** The current dials. Parent owns state. */
  value: DesignDials;
  /** Fired on every change. Parent should debounce IPC writes. */
  onChange: (next: DesignDials) => void;
  /** Optional: hide the per-dial hints (useful in narrow sidebars). */
  compact?: boolean;
}

interface DialConfig {
  key: keyof DesignDials;
  labelKey: string;
  hintKey: string;
  /** Min/max; both always 0..100, kept here for documentation. */
  min: number;
  max: number;
}

const DIALS: readonly DialConfig[] = [
  {
    key: "variance",
    labelKey: "welcome.designDials.varianceLabel",
    hintKey: "welcome.designDials.varianceHint",
    min: 0,
    max: 100,
  },
  {
    key: "motion",
    labelKey: "welcome.designDials.motionLabel",
    hintKey: "welcome.designDials.motionHint",
    min: 0,
    max: 100,
  },
  {
    key: "density",
    labelKey: "welcome.designDials.densityLabel",
    hintKey: "welcome.designDials.densityHint",
    min: 0,
    max: 100,
  },
];

/** Default values mirror `DEFAULT_DESIGN_DIALS` in the main process
 *  so the "Reset" button does something useful even when the
 *  persisted file is missing. */
const DEFAULT_DIALS: DesignDials = {
  variance: 35,
  motion: 50,
  density: 55,
};

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value);
  if (rounded < 0) return 0;
  if (rounded > 100) return 100;
  return rounded;
}

export function DesignDialsControl({
  value,
  onChange,
  compact = false,
}: DesignDialsProps): React.JSX.Element {
  const { t } = useI18n();
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (flashTimer.current !== null) {
        window.clearTimeout(flashTimer.current);
      }
    },
    [],
  );

  const handleSlider = useCallback(
    (key: keyof DesignDials, raw: string) => {
      const n = clamp(Number(raw));
      onChange({ ...value, [key]: n });
      setSavedFlash(true);
      if (flashTimer.current !== null) {
        window.clearTimeout(flashTimer.current);
      }
      flashTimer.current = window.setTimeout(() => {
        setSavedFlash(false);
        flashTimer.current = null;
      }, 700);
    },
    [onChange, value],
  );

  const handleReset = useCallback(() => {
    onChange({ ...DEFAULT_DIALS });
    setSavedFlash(true);
    if (flashTimer.current !== null) {
      window.clearTimeout(flashTimer.current);
    }
    flashTimer.current = window.setTimeout(() => {
      setSavedFlash(false);
      flashTimer.current = null;
    }, 700);
  }, [onChange]);

  const sortedChips = useMemo(
    () => DIALS.map((d) => ({ ...d, current: value[d.key] })),
    [value],
  );

  return (
    <div className="design-dials" data-compact={compact ? "true" : "false"}>
      <header className="design-dials-header">
        <h3 className="design-dials-title">
          {t("welcome.designDials.title")}
        </h3>
        <p className="design-dials-subtitle">
          {t("welcome.designDials.subtitle")}
        </p>
      </header>

      <div className="design-dials-rows">
        {sortedChips.map((d) => (
          <div key={d.key} className="design-dials-row">
            <div className="design-dials-row-head">
              <label
                htmlFor={`design-dial-${d.key}`}
                className="design-dials-row-label"
              >
                {t(d.labelKey)}
              </label>
              <span
                className="design-dials-row-value"
                aria-live="polite"
              >
                {d.current}
              </span>
            </div>
            <input
              id={`design-dial-${d.key}`}
              className="design-dials-slider"
              type="range"
              min={d.min}
              max={d.max}
              step={1}
              value={d.current}
              onChange={(e) => handleSlider(d.key, e.target.value)}
              aria-label={t(d.labelKey)}
            />
            {!compact && (
              <p className="design-dials-row-hint">{t(d.hintKey)}</p>
            )}
          </div>
        ))}
      </div>

      <div className="design-dials-footer">
        <button
          type="button"
          className="btn-ghost design-dials-reset"
          onClick={handleReset}
        >
          {t("welcome.designDials.reset")}
        </button>
        <span
          className={`design-dials-saved ${savedFlash ? "is-flashing" : ""}`.trim()}
          aria-live="polite"
        >
          {savedFlash ? t("welcome.designDials.saved") : ""}
        </span>
      </div>
    </div>
  );
}

export const DESIGN_DIAL_DEFAULTS = DEFAULT_DIALS;
