# Embedding the CDCP / RCSD calculators

Two independent widgets. Each needs its own CSS and JS; the cost estimator also needs its fee data file.

```html
<link rel="stylesheet" href="/cdcp-embed.css">
<link rel="stylesheet" href="/cdcp-estimator.css">

<div id="eligibility"></div>
<div id="cost"></div>

<script src="/cdcp-embed.js"></script>
<script src="/cdcp-estimator-data.js"></script>
<script src="/cdcp-estimator.js"></script>
<script>
  mountCdcpQuiz(document.getElementById("eligibility"), "fr", {
    bookingUrl: "https://your-clinic.ca/rendez-vous",   // required for a real clinic
    insurers: ["Sun Life", "Manuvie", "Croix Bleue"]    // optional; shown on the private-insurance result
  });
  mountCdcpEstimator(document.getElementById("cost"), "fr", "QC", {
    bookingUrl: "https://your-clinic.ca/rendez-vous"
  });
</script>
```

- `lang` is `"fr"` or `"en"`. To switch language, call the mount function again on the same element; it replaces its contents.
- `bookingUrl` defaults to `/#contact`, which is only right on sss.marketing. The quiz appends `branch`, `utm_source` and, where relevant, `suggestedDate` to it.
- Without `insurers` and `demo`, the insurer list and the sss.marketing audit link are not shown. `demo: true` is used only on sss.marketing.
- Fee figures live in `cdcp-estimator-data.js` and must be verified by the clinic before launch.

## Theming

Set any of these on the container, a parent element, or `:root`. Unset tokens use the defaults shown.

| Token | Used for | Default |
|---|---|---|
| `--cdcp-brand` | selected options, primary buttons, step numbers | `#1c1812` |
| `--cdcp-on-brand` | text on brand | `#ffffff` |
| `--cdcp-ink` | text, strong borders | `#1c1812` |
| `--cdcp-paper` | widget background | `#ffffff` |
| `--cdcp-tint` | hover rows, result panel | `#f3f1ea` |
| `--cdcp-accent` | coverage ring, savings bar, link underline | `#b5835a` |
| `--cdcp-line` | hairlines | `#d8d4c8` |
| `--cdcp-good` | positive tier | `#3f6f3d` |
| `--cdcp-warn` | notices | `#8a4f1c` |
| `--cdcp-font` | body font | inherits from the host |
| `--cdcp-display` | headlines, large figures | inherits from the host |
| `--cdcp-radius` | corner radius | `0` |

Keep `--cdcp-brand` against `--cdcp-on-brand`, and `--cdcp-ink` against `--cdcp-paper`, at 4.5:1 contrast or better.

## Host-page safety

- Every rule is scoped under `.cdcp`, with a zero-specificity reset for buttons, inputs, fieldsets, links, headings and lists, so site-wide element styles do not restyle the widget.
- Widget class names are prefixed (`cq-`, `est-`), so the host's own `.btn`, `.card` or `.matrix` rules do not apply.
- Layout follows the width of the container, not the viewport: the quiz goes two-column at 640px and the estimator at 560px. Both fit a 320px column without horizontal scroll.
- Browser support: current evergreen browsers (uses `:has()`, container queries and `overflow: clip`). Older browsers get the stacked single-column layout where container queries are missing.
