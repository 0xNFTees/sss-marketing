# CDCP Calculator — 60-second onboarding cheat sheet

For the call. Goal: calculator live on their site before the call ends.

**Prep (before the call, 2 min):** open `https://sss.marketing/embed/kit.html`, fill in their clinic name, brand hex, booking URL, phone, language, and province — it generates both snippets with a copy button and a live preview. Keep that tab open through the call.

**Opening line:** "Share your screen, open your website editor, and we'll have it live in about a minute."

---

## Step 0 — create the page (the snippet fills a page, it doesn't create one)
Before pasting, make the page the calculator will live on — ~30 seconds in any CMS:
1. New page, titled to match the site's language: **"CDCP"** (English) or **"RCSD"** (French). WordPress: Pages → Add New · Wix: Menus & Pages → + Add Page · Squarespace: Pages → + · Webflow: Pages panel → + · GoDaddy: Website → Add Page · Shopify: Online Store → Pages → Add.
2. Set the URL slug to **/cdcp** or **/rcsd**.
3. Optional one-line intro above the widget, then paste the snippet (per the steps below).
4. Confirm the page appears in the site menu (most builders add it automatically — check), then publish.
Pasting into an existing page works too (a "Services" page, a homepage section) — the widget is just an element. A dedicated /cdcp or /rcsd page is better: it's linkable from Google Business Profile and can rank for "dentiste RCSD / CDCP dentist + city".

## If they use WordPress
1. Edit the target page → click **+** → search **Custom HTML** → paste **Snippet 1**.
2. **Preview** → **Update**. Done.
- *Elementor:* drag in an **HTML** widget instead, paste Snippet 1.
- *Classic editor:* switch the editor tab from Visual to **Text**, paste Snippet 1.
- *Calculator doesn't appear after publishing?* A security/optimizer plugin is stripping scripts → go to **"If their CMS blocks scripts"** below. No debugging on the call.

## If they use Wix
1. **Add Elements (+)** → **Embed Code** → **Embed HTML** → **Enter Code**.
2. Paste **Snippet 2** (the iframe) → **Apply**.
3. Drag the element to ~**700px tall**, full content width → **Publish**.
- Wix keeps embeds in their own box, so have them size it generously; the calculator resizes itself inside it.

## If they use Squarespace
1. Edit the page → insert a **Code** block (requires Business plan or higher).
2. Paste **Snippet 1** → save.
- The editor sometimes shows a grey placeholder — check the **live** page, not the preview.
- On a Personal plan (no code blocks): use **Snippet 2** in an Embed block pointed at the frame URL.

## If they use Webflow
1. Add an **Embed** element where the calculator goes.
2. Paste **Snippet 1** → save → **Publish**.

## If they use GoDaddy Website Builder
1. Add a section → **HTML** (embed custom code).
2. Paste **Snippet 2** → set section height ~700px → publish.

## If they use Shopify
1. Theme editor → add a **Custom Liquid** section to the page.
2. Paste **Snippet 1** → save.

## If their CMS blocks scripts (or you can't tell what it is)
The universal fallback — works anywhere an iframe is allowed:
1. Paste **Snippet 2** wherever custom HTML/embed is accepted.
2. If even the 3-line listener script gets stripped, paste the iframe alone and set its `height` to **1000px** — tall enough for every screen of the calculator with no cutoff.

---

## Verify together (30 seconds)
1. Open the live page **on their phone**.
2. Clinic name in the header? Buttons in their brand color?
3. Answer the four questions → tap **Book an appointment** → their booking page opens.

## Likely questions
- **"Can we change the color/name later?"** Yes — edit the values in the snippet any time; no reinstall.
- **"French?"** Change `data-lang="en"` to `"fr"` (or `lang=fr` in the iframe URL). Paste one per language page.
- **"Is patient data stored?"** No. Answers never leave the visitor's browser.
- **"What are the dollar figures?"** 2026 provincial fee-guide bundles vs the federal CDCP grid for three common visits — labelled on the widget as estimates, not quotes.
- **"What's the badge?"** "Powered by SSS Marketing" — the only thing we ask for in exchange for the free widget. It links to us; everything else is their brand.
