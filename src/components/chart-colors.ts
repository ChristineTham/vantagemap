/**
 * Shared chart palette (Rosely).
 *
 * Recharts renders to SVG on the client, so colours can reference the Rosely
 * CSS custom properties defined in `src/app/globals.css`. Using `var(--roselyN)`
 * (rather than hard-coded hex) means every chart automatically follows the
 * `.dark` override block and stays legible in both light and dark mode.
 *
 * Import these instead of inlining hex values in individual chart components.
 */

// ── Raw palette references (light/dark aware via CSS variables) ───────────────

export const ROSELY = {
  night: "var(--rosely0)", // #27272a → #f4eee8 (dark)
  dusk: "var(--rosely1)", // #615f5f → #a49e9e (dark)
  mauve: "var(--rosely2)",
  mist: "var(--rosely3)", // #a49e9e → #615f5f (dark)
  blush: "var(--rosely4)",
  petal: "var(--rosely5)", // #f4dede → #2e2e31 (dark)
  cream: "var(--rosely6)",
  periwinkle: "var(--rosely7)", // #93a9d1 — blue accent
  lilac: "var(--rosely8)", // #be9cc1 — real lilac
  dusty: "var(--rosely9)",
  plum: "var(--rosely10)",
  rose: "var(--rosely11)", // #d2386c — critical / error
  flamingo: "var(--rosely12)", // #ec809e — high / warning
  golden: "var(--rosely13)", // #eada4f — at risk
  teal: "var(--rosely14)", // #64bfa4 — success / good
  cornflower: "var(--rosely15)", // #919bc9 — true cornflower blue
} as const;

// ── Chart chrome (axis ticks, grid) — legible in BOTH light and dark ──────────

/** Muted-foreground token for axis tick labels. Flips with the theme. */
export const AXIS_TICK = ROSELY.dusk;
/** Subtle grid-line colour. `petal` is light in light mode, dark in dark mode. */
export const GRID_STROKE = ROSELY.petal;

// ── Health status colours (Excellent and Good are distinct hues) ──────────────

export const HEALTH_COLORS: Record<string, string> = {
  Excellent: ROSELY.teal, // green — best
  Good: ROSELY.periwinkle, // blue — distinct from Excellent
  Fair: ROSELY.golden,
  Poor: ROSELY.flamingo,
  Critical: ROSELY.rose,
  Unknown: ROSELY.mist,
};

// ── Initiative / roadmap status colours ───────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  "Not Started": ROSELY.mist,
  "In Progress": ROSELY.cornflower,
  Completed: ROSELY.teal,
  "On Hold": ROSELY.golden,
  Cancelled: ROSELY.rose,
};

// ── TIME rationalisation colours ──────────────────────────────────────────────

export const TIME_COLORS: Record<string, string> = {
  Tolerate: ROSELY.cornflower,
  Invest: ROSELY.teal,
  Migrate: ROSELY.golden,
  Eliminate: ROSELY.rose,
};

// ── 6R cloud-migration colours ────────────────────────────────────────────────

export const SIX_R_COLORS: Record<string, string> = {
  Retire: ROSELY.rose,
  Retain: ROSELY.mist,
  Repurchase: ROSELY.lilac, // real lilac (var --rosely8)
  Rehost: ROSELY.teal,
  Replatform: ROSELY.periwinkle,
  Rearchitect: ROSELY.golden,
};

// ── Obsolescence / severity risk colours ──────────────────────────────────────

export const RISK_COLORS: Record<string, string> = {
  Critical: ROSELY.rose,
  High: ROSELY.flamingo,
  Medium: ROSELY.golden,
  Low: ROSELY.teal,
};

// ── Audit action colours ──────────────────────────────────────────────────────

export const ACTION_COLORS: Record<string, string> = {
  create: ROSELY.teal,
  update: ROSELY.cornflower,
  delete: ROSELY.rose,
};

/** Fallback for any unmapped category. */
export const FALLBACK_COLOR = ROSELY.mist;

/** Primary and secondary series colours for grouped bar charts. */
export const BAR_PRIMARY = ROSELY.cornflower;
export const BAR_SECONDARY = ROSELY.lilac;

// ── Score / quality gradient helpers (shared thresholds) ──────────────────────

export function scoreColor(score: number): string {
  if (score >= 75) return ROSELY.teal;
  if (score >= 50) return ROSELY.golden;
  if (score >= 25) return ROSELY.flamingo;
  return ROSELY.rose;
}
