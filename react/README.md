# EmbeddableDentalCalculator (React)

React + TypeScript + Tailwind v4 + Framer Motion + lucide-react port of the RCSD/CDCP estimator.
The live site keeps using the dependency-free `cdcp-embed.js`; this is the version for a React host app.
Typechecked (`strict`, `noUnused*`), rendered and exercised in a scratch Vite project; not yet used in production.

## Files
- `EmbeddableDentalCalculator.tsx` - the component (layout, states, motion, theming).
- `engine.ts` - pure rules: required steps, outcome, tiers 100/60/40/0, per-line `min(grid x tier, ACDQ)` rounded to the cent, visit packages, "estimate unavailable" on bad fee data. No React.
- `copy.ts` - FR/EN labels and UI strings, copied from `cdcp-embed.js` so wording has one source. Regenerate when that file's strings change.
- `parity.py` - Playwright check: all 270 answer combinations, engine.ts vs the live vanilla widget (fee, covered, share, flags, outcome). Needs the scratch harness exposing `window.engine`.

## Requirements
React 18+, Tailwind CSS v4 (container-query variants, `has-[]`), `framer-motion`, `lucide-react`.
Add `@source` for this folder in your Tailwind CSS so the utility classes are generated.

## Usage
```tsx
import { EmbeddableDentalCalculator } from "./react/EmbeddableDentalCalculator";
<EmbeddableDentalCalculator lang="fr" clinicName="Clinique X" procedures={QC.procedures}
  bookingUrl="/#contact" phone="514-555-0100" email="reception@clinique.ca" />
```
Props: `lang`, `clinicName`, `procedures` (without it: eligibility only), `bookingUrl`, `phone`, `email`, `insurers`, `theme`, `stickyTop`, `defaultAnswers`, `className`, `onChange({answers, outcome, estimate})`.

## White-label theme
CSS variables on any ancestor, or the `theme` prop: `--cw-primary`, `--cw-accent`, `--cw-radius`, `--cw-display` (they fall back to `--cdcp-*`). `stickyTop` offsets the pinned panel/mini-figure under a fixed site nav.

## Behaviour notes
- Layout follows the container, not the viewport: two columns (7/5) from ~672px wide, single column below, with the result first and a mini-figure pinned once the main figure scrolls away.
- Eligibility questions are shown one at a time; pointer selection advances, keyboard selection waits for "Continuer". The visit type is a lens on the result, not a required step.
- The one-line estimate caveat and the primary CTA stay visible; the long legal notes, billing notice and coverage matrix live in the "Transparence tarifaire et notes" drawer.
