# Add the CDCP Calculator to your clinic's website

**Time needed: about 5 minutes. No coding skills required.**

The calculator lets your patients check their Canadian Dental Care Plan (CDCP) eligibility, see their estimated out-of-pocket cost, and book an appointment with you — right on your own website, in your own colors.

---

## 1. Your embed code

You received a snippet that looks like this:

```html
<script src="https://[YOUR-VERCEL-PROJECT].vercel.app/index.js" defer></script>

<cdcp-calculator
  data-clinic-name="Maple Valley Dental"
  data-primary-color="#0F766E"
  data-booking-url="https://www.maplevalleydental.com/book"
  data-phone="+1 555 555 5555"
  data-lang="en"
  data-province="ON">
</cdcp-calculator>
```

Copy the **whole block** every time — the first line loads the calculator, the second displays it.

## 2. Make it yours

Edit only the `data-…` lines, keeping the quotes:

| Setting | What it does | Example |
|---|---|---|
| `data-clinic-name` | Your clinic's name, shown on the calculator | `"Maple Valley Dental"` |
| `data-primary-color` | Your brand color (hex code — find yours at htmlcolorcodes.com) | `"#0F766E"` |
| `data-booking-url` | Where the **Book an appointment** button sends patients | your online booking page |
| `data-phone` | Adds a **Call** button (delete the whole line if you don't want it) | `"+1 555 555 5555"` |
| `data-lang` | `"en"` for English, `"fr"` for French | `"fr"` |
| `data-province` | Pre-selects your province's fee guide for the cost estimate | `"QC"`, `"ON"`, `"BC"`, `"AB"`, `"NS"`, `"NB"`, `"PE"`, `"MB"`, `"SK"`, `"NL"`, `"YT"`, `"NT"`, `"NU"` |

Serving both languages? Paste the block twice — once with `data-lang="en"` on your English page and once with `data-lang="fr"` on your French page. The `<script>` line only needs to appear once per page.

## 3. Paste it into your website

### WordPress
1. Edit the page where you want the calculator.
2. Click **+** to add a block and search for **Custom HTML**.
3. Paste the whole snippet into the block.
4. Click **Preview** to check it, then **Update**.

*Using the classic editor? Switch the editor to the **Text** tab (not Visual) and paste it there.*

### Squarespace
1. Edit the page, click an insert point, and choose **Code** from the block menu.
2. Make sure the block is set to **HTML** (it is by default).
3. Paste the whole snippet and click outside the block.
4. Save. (The calculator appears on the live page — Squarespace sometimes shows a placeholder in the editor preview. Business plan or higher is required for code blocks.)

### Wix
1. In the editor, click **Add Elements (+)** → **Embed Code** → **Embed HTML**.
2. Click **Enter Code**, paste the whole snippet, and click **Apply**.
3. Drag the frame tall and wide enough for the calculator (about 600 × 900 px works well — it will scroll inside the frame if it's too small).
4. Publish.

### Webflow
Add an **Embed** element where you want the calculator, paste the snippet, save, and publish.

### Shopify
In the theme editor, add a **Custom Liquid** (or Custom HTML) section to the page and paste the snippet.

## 4. Check it works

Open the page on your phone and on a computer:

- Your clinic name appears at the top right of the calculator.
- The buttons are in your brand color.
- Tap through the questions — the **Book an appointment** button should open your booking page.

## Common questions

**Will it clash with my website's design?**
No. The calculator is fully sealed off from your site's styles — your site can't break it and it can't change anything on your site.

**Is patient data stored anywhere?**
No. Answers live only in the visitor's browser while the page is open. Nothing is saved or sent anywhere.

**What do the dollar figures mean?**
They're estimates comparing your province's 2026 dentist fee guide with the federal CDCP Dental Benefit Grid for three common visits. They're labelled as estimates, not quotes, and patients are told to ask for a written estimate.

**Something's not working.**
Reply to the email this came in and include a link to the page — we'll sort it out.
