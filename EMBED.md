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
    insurers: ["Sun Life", "Manuvie", "Croix Bleue"]    // optional; shown on the private-insurance result
  });
</script>
```

- `lang` is `"fr"` or `"en"`. Calling the function again on the same element (for example after a language switch) re-renders in place and keeps the patient's answers.
- `bookingUrl` defaults to `/#contact`, which is only right on sss.marketing. The widget appends `branch`, `utm_source` and, where relevant, `suggestedDate`.
- `province` defaults to `"QC"` and selects the fee data in `cdcp-estimator-data.js`. If that file is not loaded, the appointment question and cost estimate are left out and the tool becomes eligibility-only.
- Without `insurers` and `demo`, the insurer list and the sss.marketing audit link are not shown. `demo: true` is used only on sss.marketing.
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
- Layout follows the width of the container, not the viewport: two columns from 680px, stacked below. It fits a 320px column without horizontal scroll. When stacked, the estimated-share bar stays pinned to the bottom of the viewport while the patient changes answers.
- Browser support: current evergreen browsers (uses `:has()`, container queries and `overflow: clip`). Older browsers get the stacked layout where container queries are missing. Sticky positioning does not work inside a host ancestor that has `overflow: hidden` or `auto`; use `overflow: clip` there.

## Interaction model (stage, then result)

The widget asks one question at a time in the left stage (insurance, income, tax return, appointment type) while the statement on the right builds from the answers so far. A click answers and advances; keyboard arrows choose without advancing and **Continuer** moves on. **Retour** goes back. Once everything required is answered (or private insurance ends the calculation) the stage becomes **Vos réponses**: each answer has **Modifier**, and the appointment-type list stays in place so the patient can compare visit types. Changing an answer never clears the others; **Effacer les réponses** is the only reset.

- `mountCdcpQuiz(...)` returns `{state, outcome, cost, view, set}`. `set({ins, inc, filed, appt})` sets several answers and re-renders (useful for deep links and tests); `view()` is the current question key or `null` for the summary.
- `data-view` on the root is the current question key or `result`; `data-state` is the outcome.
- `--cdcp-sticky-top` (default 16px): offset for the pinned answers column on wide layouts, set it to your fixed header height.
