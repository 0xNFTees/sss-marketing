# Embedding the CDCP / RCSD calculator

One widget: the patient answers four questions and gets eligibility and an estimated out-of-pocket cost together. Nothing is pre-selected.

```html
<link rel="stylesheet" href="/cdcp-embed.css">

<div id="calculator"></div>

<script src="/cdcp-estimator-data.js"></script>   <!-- fee data; omit for an eligibility-only version -->
<script src="/cdcp-embed.js"></script>
<script>
  mountCdcpQuiz(document.getElementById("calculator"), "fr", {
    bookingUrl: "https://your-clinic.ca/rendez-vous",   // required for a real clinic
    insurers: ["Sun Life", "Manuvie", "Croix Bleue"],   // optional; shown on the private-insurance result
    phone: "+1 514 555 0123",                          // optional; with email, adds "Appelez ou envoyez un courriel à notre réception"
    email: "reception@your-clinic.ca"
  });
</script>
```

- `lang` is `"fr"` or `"en"`. Calling the function again on the same element (for example after a language switch) re-renders in place and keeps the patient's answers.
- `bookingUrl` defaults to `/#contact`, which is only right on sss.marketing. The widget appends `branch`, `utm_source` and, where relevant, `suggestedDate`.
- `province` defaults to `"QC"` and selects the fee data in `cdcp-estimator-data.js`. If that file is not loaded, the appointment question and cost estimate are left out and the tool becomes eligibility-only.
- `phone` and/or `email` add a front-desk line under the answers ("Vous préférez aller droit au but? Appelez ou envoyez un courriel à notre réception."), linked with `tel:` / `mailto:`. Without them it is not shown. Without `insurers` and `demo`, the insurer list is not shown. `demo: true` is used only on sss.marketing and shows the front-desk line without links.
- Fee figures live in `cdcp-estimator-data.js` and must be verified by the clinic before launch. If a fee needed for an appointment is missing from the data, the widget shows "estimate unavailable" for that appointment rather than a partial total.

## How it decides

| Answer | Result |
|---|---|
| Private insurance: yes | Private plan applies; no estimate |
| Income 90 k+ | Not eligible; estimate is the full standard fee |
| Tax return not filed | Must file first; estimate is what the patient would pay once the card is issued |
| Otherwise | Eligible; estimate = standard fee minus the RCSD amount for the income band |

Per line, the RCSD amount is the lesser of the RCSD grid fee times the band percentage (100, 60, 40, 0) and the standard fee, and is zero for services the RCSD does not cover.

## Theming

Set any of these on the container, a parent element, or `:root`. Unset tokens use the defaults shown.

| Token | Used for | Default |
|---|---|---|
| `--cdcp-brand` | selected-option ring, primary button | `#1c1812` |
| `--cdcp-on-brand` | text on brand | `#ffffff` |
| `--cdcp-ink` | text, strong borders | `#1c1812` |
| `--cdcp-paper` | widget background | `#ffffff` |
| `--cdcp-tint` | control track, the statement panel | `#f3f1ea` |
| `--cdcp-accent` | link underline, chevrons | `#b5835a` |
| `--cdcp-line` | hairlines | `#d8d4c8` |
| `--cdcp-good` | eligible, RCSD savings | `#2f6b35` |
| `--cdcp-bad` | not eligible, extra costs, blockers | `#b3261e` |
| `--cdcp-warn` | cautions (pre-authorization) | `#8a4f1c` |
| `--cdcp-font` | body font | inherits from the host |
| `--cdcp-display` | headlines, large figures | inherits from the host |
| `--cdcp-radius` | corner radius | `0` |

The widget checks your colours when it mounts: if button text on `--cdcp-brand`, body text on `--cdcp-paper`, or `--cdcp-good` / `--cdcp-bad` on paper fall below 4.5:1 contrast, it substitutes a readable colour for that one token. Still choose accessible colours: keep `--cdcp-brand` against `--cdcp-on-brand`, `--cdcp-ink` against `--cdcp-paper`, and `--cdcp-good` and `--cdcp-bad` against `--cdcp-paper`, at 4.5:1 contrast or better.

## Host-page safety

- Every rule is scoped under `.cdcp`, with a zero-specificity reset for buttons, inputs, fieldsets, links, headings and lists, so site-wide element styles do not restyle the widget.
- Widget class names are prefixed (`cq-`), so the host's own `.btn`, `.card` or `.matrix` rules do not apply.
- The widget is one card, 32rem wide at most and centred in its container; it fits a 320px column without horizontal scroll. There are no breakpoints: one screen is shown at a time.
- Browser support: current evergreen browsers (uses `:has()`, container queries and `overflow: clip`). Older browsers get the stacked layout where container queries are missing. Sticky positioning does not work inside a host ancestor that has `overflow: hidden` or `auto`; use `overflow: clip` there.

## Interaction model (one frame, three phases)

The card shows **one screen at a time**; each replaces the previous one inside the same frame, and nothing from an earlier step stays on screen.

1. **Setup:** one question per screen (private insurance, income, tax return; fewer when the answers end the assessment early) with **Retour** and progress ticks. A pointer click answers and advances; keyboard arrows choose without advancing and **Continuer** moves on.
2. **Appointment:** the appointment-type cards, under a small answer chip (`Non-assuré • < 70 k • Impôts : oui  Modifier`; each segment jumps to its question). Choosing a card (pointer) reveals the result; with the keyboard an arrow only chooses and **Continuer** reveals it. Skipped when private insurance ends the calculation or when no fee data is loaded.
3. **Result:** the card turns dark (the colour tokens are swapped on `[data-view="result"]`): status, large estimated share, covered/paid bar, `Coût du traitement | Versé par le RCSD`, one full-width primary action with a quiet text link for the second action, what is included, one **Avis de transparence tarifaire** drawer (which also holds the coverage matrix) and the front-desk card. **Retour** goes back to the appointment cards (the chosen one stays selected); **Effacer les réponses** is the only reset.

Changing an answer never clears the others. Screen changes slide in (the result springs in) and the frame animates its height; both are off under `prefers-reduced-motion`.

- `mountCdcpQuiz(...)` returns `{state, outcome, cost, view, set}`. `set({ins, inc, filed, appt})` sets several answers and re-renders without animation (deep links, tests); answers already held by the element are kept unless overwritten, so pass `appt: null` to land on the appointment screen. `view()` is the current question key or `null` once a question is not being asked.
- `data-view` on the root is the current screen: a question key (`ins`, `inc`, `filed`), `appt` or `result`; `data-state` is the outcome.

### Assessment, then estimate

Three visit types are offered (new patient, recall and cleaning, toothache emergency), defined once in the `PK` list in `cdcp-embed.js` (and `VISITS` in the React port). No prices are shown on the cards. The booking action appears only on the result screen, i.e. after an appointment type is chosen (except when private insurance applies or no fee data is loaded, where the result needs no appointment).

## Design system and maintenance

The rules live at the top of `cdcp-embed.css` (tokens, type roles, spacing scale, control sizes, the single focus ring, motion scale, money presentation). The file is organised in layers: tokens, reset, layout, text roles, components, states, motion, host wrappers. Add a rule to the layer it belongs to; do not append a new "pass".

- **New colour or size:** add a token in layer 1 and use it. The test suite fails on colour literals or px font sizes outside the token layer.
- **The dark result:** the result screen re-declares the colour tokens (`--c-paper`, `--c-ink`, `--c-brand`, `--c-line`, `--c-good`, `--c-bad`, `--c-warn`) in layer 1; components keep using the tokens and invert on their own. `--c-card` is the one surface that stays light on the dark result.
- **A new choice list:** reuse `.cq-opt` inside `.cq-seg` or `.cq-visit` (a stack of cards). Do not restyle options per page.
- **A new text control:** list it in the "quiet text control" rule; it gets the underline, the hover and the focus ring for free.
- **A figure:** tabular numerals, never wrapped; dollars large, cents/unit small (`--t-fig`, `--t-cents`).
- `tests/cdcp-calculator.test.py` section 10d enforces these rules (no duplicate selectors, three UI type sizes, 44px targets, selection ring, focus ring on every control, no breakpoints).

## Result layout
- Order of the result: back, status, figure and covered/paid bar, the cost | paid split, **actions** (`.cq-act`: booking, CDCP application), what is included and limits, one fine-print drawer, the front-desk card.
- Tests: sections 10b-10e of `tests/cdcp-calculator.test.py`.
