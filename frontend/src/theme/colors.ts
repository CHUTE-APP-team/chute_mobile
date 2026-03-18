/**
 * CHUTE Design System — Color Tokens
 *
 * Single source of truth for all colors in the app.
 * Screens should import `colors` from here — never use hardcoded hex values.
 *
 * Future dark mode: swap this object via a ThemeContext and every screen
 * that consumes `colors` will update automatically with zero changes.
 */

export const colors = {
  // ─── Backgrounds ────────────────────────────────────────────────
  background:     "#FFF3E6",   // warm off-white — main screen background
  card:           "#FFFFFF",   // white — cards, inputs, elevated surfaces

  // ─── Brand ──────────────────────────────────────────────────────
  primary:        "#FF6A00",   // orange — buttons, active states, links
  primaryDark:    "#E25700",   // darker orange — pressed state / accents

  // ─── Text ───────────────────────────────────────────────────────
  text:           "#1A1A1A",   // near-black — headings and body text
  textSecondary:  "#666666",   // medium grey — subtitles, hints
  textMuted:      "#999999",   // light grey — placeholders, timestamps
  textOnPrimary:  "#FFFFFF",   // white — text sitting on primary color

  // ─── Borders & Dividers ─────────────────────────────────────────
  border:         "#E5E5E5",   // standard border
  borderWarm:     "#E8D5C4",   // warm-tinted border — matches background palette

  // ─── Semantic ───────────────────────────────────────────────────
  error:          "#D32F2F",   // red — validation errors
  disabled:       "#CCCCCC",   // grey — disabled buttons / states
  disabledText:   "#888888",   // grey — text on disabled surfaces
};

// Alias — lets screens write `const theme = colors;` for future dark-mode
// readiness without any structural change needed later.
export type ColorTokens = typeof colors;
