# CDCP Widget — Lead Magnet Playbook

One page. Everything lives at `sss.marketing/embed/` and in the repo folder `embed/`.

## The map — which file for which moment

| Moment | Open this | What it is |
|---|---|---|
| LinkedIn post / sharing the tool | `sss.marketing/embed/demo.html` | Public live demo (EN/FR), SSS-branded |
| **Before + during an onboarding call** | `sss.marketing/embed/kit.html` | **Internal generator: type clinic details → copy either snippet → live preview. This is the only page you need on a call.** |
| Call script, CMS by CMS | `embed/ONBOARDING-CHEAT-SHEET.md` | 60-second steps for WordPress, Wix, Squarespace, Webflow, GoDaddy, Shopify + script-blocked fallback |
| Email to send after the call | `embed/CLINIC-GUIDE.md` | Polished self-serve guide for office managers |
| Reference snippets (blank) | `embed/snippet.html` | Both snippet templates with comments |
| The product itself | `embed/index.js`, `embed/frame.html` | Web component + iframe shell. Don't edit by hand — ask Claude |

## The pipeline

**1 · DM arrives** → reply with the qualifier (template below). Goal: book 15 minutes **with the person who can edit the website**, and learn which CMS.

**2 · Two minutes before the call** → open `kit.html`, fill in clinic name, brand color (eyedrop it from their site), booking URL, phone, language, province. Leave the tab open.

**3 · On the call** (cheat sheet open in a second tab) → they share screen → you paste the snippet from kit.html → live before the call ends → verify on their phone. Then the real agenda: you've just watched their website workflow — talk about what else SSS does.

**4 · Within the hour** → follow-up email (template below) with their exact snippet + the clinic guide. They now have your work on their homepage with your badge on it.

**5 · Log it** → clinic, contact, CMS, date, outcome — one line per clinic wherever you track leads.

## Templates

**DM reply (EN):**
> Love it — happy to set this up for you, free. It takes one 15-minute call while someone shares their screen. Quick questions so I come prepared: who updates your website (you, staff, or an agency), and is it WordPress, Wix, Squarespace or something else? Send me 2–3 times that work and I'll confirm one.

**DM reply (FR):**
> Avec plaisir — je vous l'installe gratuitement. Ça prend un seul appel de 15 minutes pendant que quelqu'un partage son écran. Deux questions pour bien me préparer : qui met à jour votre site (vous, votre équipe ou une agence), et c'est WordPress, Wix, Squarespace ou autre ? Envoyez-moi 2-3 disponibilités et je confirme.

**Follow-up email (EN):**
> Subject: Your CDCP calculator is live 🎉
> Great call today — the calculator is live on your site. Attached is a short guide for your team (changing the color, phone number, or language takes 30 seconds, no reinstall). Your exact embed code is below in case you ever rebuild the page.
> [paste their snippet from kit.html]
> While I had your site open I noticed a couple of things that could bring you more patients — want me to send over a quick 3-point summary?

**Follow-up email (FR):**
> Objet : Votre calculateur RCSD est en ligne 🎉
> Bel appel aujourd'hui — le calculateur est en ligne sur votre site. Ci-joint un court guide pour votre équipe (changer la couleur, le téléphone ou la langue prend 30 secondes, sans réinstallation). Votre code d'intégration exact est ci-dessous au cas où vous referiez la page.
> [coller leur extrait depuis kit.html]
> En parcourant votre site, j'ai noté deux ou trois éléments qui pourraient vous amener plus de patients — je vous envoie un résumé en 3 points ?

## Rules of the system

- **Never hand-edit snippets or URL-encode anything** — kit.html does it.
- The widget updates for every clinic at once when `index.js` is redeployed; clinics never reinstall.
- Figures are 2026 fee-guide bundles vs the CDCP grid, labelled as estimates. Non-Quebec bundles are as supplied — verify before heavy promotion.
- The "Powered by SSS Marketing" badge is the price of free. If a clinic asks to remove it, that's a paid conversation.
