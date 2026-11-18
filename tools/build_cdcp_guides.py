#!/usr/bin/env python3
"""Builds the two patient-facing CDCP / RCSD guide pages from one template.

    /cdcp-calculator/index.html   (English, national)
    /calculateur-rcsd/index.html  (French, Quebec first)

Facts come from canada.ca and RAMQ; the dates and figures are in FACTS below.
Re-run after editing:  python3 tools/build_cdcp_guides.py
The page CSS is taken from /cdcp/index.html so the look stays in step with it.
"""
import html, json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://sss.marketing"

FACTS = {
    "verified_iso": "2026-11-18",
    "stats_asof_iso": "2026-10-31",
}

def esc(s):
    return html.escape(s, quote=True)

# --------------------------------------------------------------------------
# Content
# --------------------------------------------------------------------------
EN = {
    "lang": "en", "locale": "en_CA", "hreflang": "en-CA",
    "path": "/cdcp-calculator/", "alt_path": "/calculateur-rcsd/",
    "title": "CDCP Calculator 2026: Eligibility and Co-Pay | SSS",
    "desc": "Check if you qualify for the Canadian Dental Care Plan and estimate your co-pay in 60 seconds. Official 2026–27 income tiers, coverage and renewal dates.",
    "og_title": "CDCP calculator: eligibility and co-pay in 60 seconds",
    "skip": "Skip to content",
    "nav": [("/en/#services", "Method"), ("/en/pricing/", "Pricing"), ("/cdcp/", "For clinics")],
    "lang_link": ("/calculateur-rcsd/", "fr", "Français"),
    "nav_cta": ("/cdcp/", "For dental clinics"),
    "home": "/en/",
    "crumbs": [("SSS", "/en/"), ("CDCP calculator", "/cdcp-calculator/")],
    "eyebrow": "Canadian Dental Care Plan · 2026–27",
    "h1": "CDCP calculator: check your eligibility and co-pay in 60 seconds.",
    "sub": "Four questions based on the federal rules, then an estimate of your share for a typical visit. No account, no email.",
    "verified": "Rules checked against canada.ca on November 18, 2026.",
    "calc_kicker": "Free eligibility check",
    "calc_title": "Do you qualify, and how much will you pay?",
    "calc_note": "An estimate, not a decision. Only Service Canada confirms eligibility, and your dentist confirms the fee.",
    "widget": {"lang": "en", "province": "ON", "clinic": "a CDCP dentist near you",
               "booking": "https://www.sunlife.ca/sl/cdcp/en/member/provider-search/"},
    "sections": [
        {"id": "eligibility", "label": "Who qualifies", "title": "Four requirements, all of them.",
         "lede": "These are the federal requirements on canada.ca. Your spouse or common-law partner has to meet the tax ones too.",
         "grid": [
            ("No dental insurance", "No access to private coverage", "Not through a job, a pension, a family member's plan or a health spending account. Having access counts, even if you don't use it."),
            ("Income", "Under $90,000", "Adjusted family net income: line 23600 for you and your spouse or partner, adjusted for UCCB and RDSP amounts."),
            ("Taxes", "Last year's return filed", "You, and your spouse or common-law partner if you have one."),
            ("Residency", "Canadian resident for tax purposes", "Also applies to your spouse or common-law partner."),
         ],
         "after": "A provincial or territorial dental program does not disqualify you. If you have both, the plans coordinate so nothing is paid twice."},
        {"id": "copay", "label": "What you pay", "title": "Your share depends on family income.",
         "lede": "CDCP pays a percentage of its own established fee for each covered service. The rest is your co-payment.",
         "table": {"head": ["Adjusted family net income", "CDCP pays", "Your co-payment"],
                   "rows": [["Under $70,000", "100%", "0%"], ["$70,000 to $79,999", "60%", "40%"],
                            ["$80,000 to $89,999", "40%", "60%"], ["$90,000 or more", "Not eligible", "Full fee"]]},
         "example_title": "Canada.ca's own example: a service with a $134 CDCP fee",
         "example": [("Under $70,000", "CDCP pays $134. You pay $0."), ("$70,000 to $79,999", "CDCP pays $80.40. You pay $53.60."),
                     ("$80,000 to $89,999", "CDCP pays $53.60. You pay $80.40.")],
         "after": "Your dentist's fee can be higher than the CDCP fee. When it is, you pay the difference on top of any co-payment. Ask the clinic for an estimate before treatment."},
        {"id": "coverage", "label": "What's covered", "title": "Most everyday care is covered, and some of it needs approval first.",
         "lede": "The covered services, as canada.ca lists them. Items marked * require preauthorization: your dentist asks CDCP before treatment, and not every request is approved.",
         "cols": [
            ("Preventive", ["Exams, including emergency exams", "X-rays", "Cleaning (scaling)", "Fluoride", "Sealants"]),
            ("Basic", ["Fillings", "Root canals (re-treatment*)", "Cleaning under the gumline", "Treating abscesses", "Gum disease management"]),
            ("Major", ["Crowns*", "Complete dentures", "Partial dentures*", "Denture repairs and relines", "Extractions and oral surgery"]),
            ("Sedation", ["Nitrous oxide and oral sedation", "Conscious sedation*", "General anesthesia*"]),
         ],
         "after": "Orthodontic services, such as braces, are currently not available under CDCP. Implants, whitening and veneers are not on the covered list."},
        {"id": "renewal", "label": "Apply and renew", "title": "Coverage runs July 1 to June 30 and does not renew on its own.",
         "steps": [
            ("Apply", "Applications for the 2026–27 benefit period are open. Apply online on canada.ca or by phone at 1‑833‑537‑4342."),
            ("Get your coverage date", "Once approved, you get a coverage start date. Book after that date: care received before it is not covered. Sun Life processes CDCP claims for the government."),
            ("Renew each spring", "In 2026, renewal ran April 15 to June 1. Members who did not renew lost coverage on June 30 and can reapply, with a gap in coverage."),
         ],
         "after": "Care received while you are not covered is not reimbursed later."},
        {"id": "quebec", "label": "In Quebec", "title": "RAMQ pays first for what it covers.",
         "lede": "For children under 10 and people on financial assistance with a claim booklet, the dentist bills RAMQ for RAMQ-covered services. CDCP can cover the services RAMQ does not, such as cleanings, if the patient is eligible.",
         "link": ("/calculateur-rcsd/", "Read the full Quebec guide, in French")},
        {"id": "numbers", "label": "By the numbers", "title": "CDCP in 2026–27, as of October 31, 2026.",
         "stats": [("5,163,512", "people enrolled for 2026–27"), ("1,773,233", "of them have already had a claim approved"),
                   ("29,762", "participating oral health providers"), ("1,438,307", "people enrolled in Quebec")],
         "after": "Source: Canadian Dental Care Plan application statistics, canada.ca, updated weekly."},
    ],
    "faq_label": "Questions", "faq_title": "What people ask about CDCP.",
    "faq": [
        ("Is the Canadian Dental Care Plan free?", "It is free to apply and renew. Care is fully covered at CDCP fees only if your adjusted family net income is under $70,000. Between $70,000 and $89,999 you pay a 40% or 60% co-payment, and any clinic fee above the CDCP fee is also yours."),
        ("Who qualifies for CDCP?", "Canadian residents for tax purposes with no access to private dental insurance, an adjusted family net income under $90,000, and last year's tax return filed, for themselves and their spouse or common-law partner."),
        ("How much will I pay at the dentist with CDCP?", "Your co-payment is 0%, 40% or 60% of the CDCP fee depending on family income, plus any difference between your dentist's fee and the CDCP fee. The calculator on this page estimates it for a typical visit."),
        ("Does CDCP cover braces, Invisalign or implants?", "No. Orthodontic services are currently not available under CDCP, and implants are not on the list of covered services."),
        ("Does every dentist accept CDCP?", "No, but most do: 29,762 oral health providers participated as of October 31, 2026. Ask the clinic before booking, or use the provider search on Sun Life's CDCP site."),
        ("Can my dentist charge more than CDCP pays?", "Yes. CDCP fees are often below provincial fee guides. If the clinic's fee is higher, you pay the difference, in addition to any co-payment."),
        ("When do I need to renew CDCP?", "Every year, in the spring. In 2026 the renewal window ran April 15 to June 1, and coverage for those who did not renew ended June 30."),
        ("I missed the renewal deadline. What now?", "You can apply again for the 2026–27 benefit period, but you will have a gap in coverage, and care received during the gap is not reimbursed."),
    ],
    "clinic": {"title": "Run a dental clinic? Put this calculator on your website, free.",
               "body": "Same calculator, your clinic's name and colours, your booking link. SSS installs it in one 30-minute call.",
               "cta": ("/cdcp/", "See the clinic version")},
    "sources_label": "Sources",
    "sources": [
        ("Do you qualify, canada.ca", "https://www.canada.ca/en/services/benefits/dental/dental-care-plan/qualify.html"),
        ("What is covered, canada.ca", "https://www.canada.ca/en/services/benefits/dental/dental-care-plan/coverage.html"),
        ("Examples of co-payments and additional charges, canada.ca", "https://www.canada.ca/en/services/benefits/dental/dental-care-plan/coverage/examples-copayments-additional-charges.html"),
        ("Application statistics, canada.ca", "https://www.canada.ca/en/services/benefits/dental/dental-care-plan/statistics.html"),
        ("Coordination with Quebec programs, canada.ca", "https://www.canada.ca/en/services/benefits/dental/dental-care-plan/providers/fact-sheet-qc.html"),
    ],
    "disclaimer": "SSS is a marketing agency for dental clinics. This page is general information, not advice, and it is not affiliated with the Government of Canada.",
    "footer_tag": "Dental marketing, measured at the chair.",
    "footer_nav": [("/en/", "Home"), ("/en/pricing/", "Pricing"), ("/cdcp/", "CDCP calculator for clinics"), ("/calculateur-rcsd/", "Français")],
    "footer_contact": [("mailto:info@sss.marketing", "info@sss.marketing"), ("/en/#contact", "Book a call")],
    "nav_label": "Navigation", "contact_label": "Contact",
    "legal": "© 2026 SSS Marketing. All rights reserved. Anonymous visit counts, no cookies.",
    "app_name": "CDCP eligibility and co-pay calculator",
}

FR = {
    "lang": "fr", "locale": "fr_CA", "hreflang": "fr-CA",
    "path": "/calculateur-rcsd/", "alt_path": "/cdcp-calculator/",
    "title": "Calculateur RCSD 2026 : admissibilité et quote-part | SSS",
    "desc": "Vérifiez votre admissibilité au Régime canadien de soins dentaires et estimez votre quote-part en 60 secondes. Paliers 2026-2027, soins couverts, RAMQ.",
    "og_title": "Calculateur RCSD : admissibilité et quote-part en 60 secondes",
    "skip": "Aller au contenu",
    "nav": [("/#services", "Méthode"), ("/tarifs/", "Tarifs"), ("/rcsd/", "Pour les cliniques")],
    "lang_link": ("/cdcp-calculator/", "en", "English"),
    "nav_cta": ("/rcsd/", "Pour les cliniques dentaires"),
    "home": "/",
    "crumbs": [("SSS", "/"), ("Calculateur RCSD", "/calculateur-rcsd/")],
    "eyebrow": "Régime canadien de soins dentaires · 2026-2027",
    "h1": "Calculateur RCSD : vérifiez votre admissibilité et votre quote-part en 60 secondes.",
    "sub": "Quatre questions fondées sur les règles fédérales, puis une estimation de votre part pour une visite type. Sans compte, sans courriel.",
    "verified": "Règles vérifiées sur canada.ca le 18 novembre 2026.",
    "calc_kicker": "Vérification gratuite",
    "calc_title": "Êtes-vous admissible, et combien paierez-vous ?",
    "calc_note": "Une estimation, pas une décision. Seul Service Canada confirme l'admissibilité, et votre dentiste confirme ses honoraires.",
    "widget": {"lang": "fr", "province": "QC", "clinic": "un dentiste RCSD près de chez vous",
               "booking": "https://www.sunlife.ca/sl/cdcp/fr/member/provider-search/"},
    "sections": [
        {"id": "admissibilite", "label": "Qui est admissible", "title": "Quatre conditions, toutes requises.",
         "lede": "Ce sont les conditions fédérales publiées sur canada.ca. Votre conjoint·e ou conjoint·e de fait doit aussi remplir celles qui touchent l'impôt.",
         "grid": [
            ("Aucune assurance dentaire", "Aucun accès à une couverture privée", "Ni par l'emploi, ni par un régime de retraite, ni par le régime d'un membre de la famille, ni par un compte de gestion santé. Y avoir accès suffit, même sans l'utiliser."),
            ("Revenu", "Moins de 90 000 $", "Revenu familial net rajusté : ligne 23600 pour vous et votre conjoint·e, rajustée pour la PUGE et le REEI."),
            ("Impôts", "Déclaration de l'an dernier produite", "Pour vous, et pour votre conjoint·e ou conjoint·e de fait, le cas échéant."),
            ("Résidence", "Résident canadien aux fins de l'impôt", "S'applique aussi à votre conjoint·e ou conjoint·e de fait."),
         ],
         "after": "Une couverture par un programme provincial, comme la RAMQ, ne vous rend pas inadmissible. Les régimes se coordonnent pour que rien ne soit payé deux fois."},
        {"id": "quote-part", "label": "Ce que vous payez", "title": "Votre part dépend du revenu familial.",
         "lede": "Le RCSD paie un pourcentage de ses propres tarifs établis pour chaque soin couvert. Le reste est votre quote-part.",
         "table": {"head": ["Revenu familial net rajusté", "Le RCSD paie", "Votre quote-part"],
                   "rows": [["Moins de 70 000 $", "100 %", "0 %"], ["De 70 000 $ à 79 999 $", "60 %", "40 %"],
                            ["De 80 000 $ à 89 999 $", "40 %", "60 %"], ["90 000 $ ou plus", "Non admissible", "Plein tarif"]]},
         "example_title": "L'exemple de canada.ca : un soin dont le tarif RCSD est de 134 $",
         "example": [("Moins de 70 000 $", "Le RCSD paie 134 $. Vous payez 0 $."), ("De 70 000 $ à 79 999 $", "Le RCSD paie 80,40 $. Vous payez 53,60 $."),
                     ("De 80 000 $ à 89 999 $", "Le RCSD paie 53,60 $. Vous payez 80,40 $.")],
         "after": "Les honoraires de votre dentiste peuvent dépasser le tarif du RCSD, ce qui arrive souvent au Québec avec le guide de l'ACDQ. La différence s'ajoute alors à votre quote-part. Demandez une estimation à la clinique avant le traitement."},
        {"id": "couverture", "label": "Ce qui est couvert", "title": "La plupart des soins courants sont couverts, certains avec une autorisation préalable.",
         "lede": "Les soins couverts, tels que canada.ca les énumère. Ceux marqués * exigent une autorisation préalable : votre dentiste la demande au RCSD avant le traitement, et toutes les demandes ne sont pas acceptées.",
         "cols": [
            ("Prévention", ["Examens, y compris d'urgence", "Radiographies", "Nettoyage (détartrage)", "Fluorure", "Scellants"]),
            ("Soins de base", ["Obturations (plombages)", "Traitements de canal (reprise*)", "Nettoyage sous la gencive", "Traitement des abcès", "Traitement des maladies des gencives"]),
            ("Soins majeurs", ["Couronnes*", "Prothèses complètes", "Prothèses partielles*", "Réparations et regarnissages", "Extractions et chirurgie buccale"]),
            ("Sédation", ["Protoxyde d'azote et sédation orale", "Sédation consciente*", "Anesthésie générale*"]),
         ],
         "after": "Les services d'orthodontie, comme les broches, ne sont pas offerts par le RCSD pour le moment. Les implants, le blanchiment et les facettes ne figurent pas parmi les soins couverts."},
        {"id": "ramq", "label": "Au Québec", "title": "La RAMQ paie d'abord ce qu'elle couvre, et le RCSD peut couvrir le reste.",
         "lede": "Pour les enfants de moins de 10 ans et les prestataires d'une aide financière avec carnet de réclamation, le dentiste facture la RAMQ pour les services qu'elle couvre. Le RCSD ne paie pas ces services-là. Pour les soins couverts par le RCSD que la RAMQ ne couvre pas, la clinique peut réclamer au RCSD si le patient y est admissible.",
         "table": {"head": ["Enfant de moins de 10 ans", "Qui paie"],
                   "rows": [["Examen annuel ou d'urgence, radiographies", "RAMQ"], ["Plombages, extractions, traitements de canal", "RAMQ"],
                            ["Nettoyage (détartrage), fluorure, scellants", "RCSD, si l'enfant est admissible"],
                            ["Orthodontie (broches)", "Ni l'un ni l'autre"]]},
         "after": "La RAMQ couvre aussi plusieurs chirurgies buccales en milieu hospitalier, pour toute personne qui présente une carte d'assurance maladie valide."},
        {"id": "renouvellement", "label": "Demande et renouvellement", "title": "La couverture va du 1er juillet au 30 juin et ne se renouvelle pas toute seule.",
         "steps": [
            ("Faire la demande", "Les demandes pour la période 2026-2027 sont ouvertes. En ligne sur canada.ca, ou par téléphone au 1‑833‑537‑4342."),
            ("Attendre la date de début", "Une fois la demande acceptée, vous obtenez une date de début de couverture. Réservez après cette date : les soins reçus avant ne sont pas couverts. La Sun Life traite les réclamations du RCSD pour le gouvernement."),
            ("Renouveler chaque printemps", "En 2026, le renouvellement a eu lieu du 15 avril au 1er juin. Les membres qui n'ont pas renouvelé ont perdu leur couverture le 30 juin et peuvent refaire une demande, avec une période sans couverture."),
         ],
         "after": "Les soins reçus pendant une période sans couverture ne sont pas remboursés par la suite."},
        {"id": "chiffres", "label": "En chiffres", "title": "Le RCSD en 2026-2027, au 31 octobre 2026.",
         "stats": [("1 438 307", "personnes inscrites au Québec"), ("436 699", "d'entre elles ont déjà eu une réclamation approuvée"),
                   ("5 866", "fournisseurs de soins participants au Québec"), ("5 163 512", "personnes inscrites au Canada")],
         "after": "Source : statistiques sur les demandes au Régime canadien de soins dentaires, canada.ca, mises à jour chaque semaine."},
    ],
    "faq_label": "Questions", "faq_title": "Ce qu'on demande le plus sur le RCSD.",
    "faq": [
        ("Le Régime canadien de soins dentaires est-il gratuit ?", "La demande et le renouvellement sont gratuits. Les soins sont entièrement couverts au tarif du RCSD seulement si votre revenu familial net rajusté est de moins de 70 000 $. De 70 000 $ à 89 999 $, vous payez une quote-part de 40 % ou de 60 %, et tout écart entre les honoraires de la clinique et le tarif du RCSD reste à votre charge."),
        ("Qui est admissible au RCSD ?", "Les résidents canadiens aux fins de l'impôt qui n'ont accès à aucune assurance dentaire privée, dont le revenu familial net rajusté est de moins de 90 000 $ et qui ont produit leur déclaration de revenus de l'an dernier, ainsi que leur conjoint·e."),
        ("Combien vais-je payer chez le dentiste avec le RCSD ?", "Votre quote-part est de 0 %, 40 % ou 60 % du tarif du RCSD selon le revenu familial, plus tout écart entre les honoraires de votre dentiste et ce tarif. Le calculateur de cette page l'estime pour une visite type."),
        ("Le RCSD couvre-t-il les broches, l'Invisalign ou les implants ?", "Non. Les services d'orthodontie ne sont pas offerts par le RCSD pour le moment, et les implants ne figurent pas parmi les soins couverts."),
        ("Quelle est la différence entre la RAMQ et le RCSD ?", "La RAMQ est le régime du Québec : elle couvre certains soins dentaires pour les enfants de moins de 10 ans et les prestataires d'une aide financière, et paie d'abord ce qu'elle couvre. Le RCSD est fédéral et peut couvrir les soins que la RAMQ ne couvre pas, comme le nettoyage, pour les personnes admissibles."),
        ("Tous les dentistes acceptent-ils le RCSD ?", "Non, mais la plupart : au Québec, 5 866 fournisseurs de soins participaient au 31 octobre 2026. Demandez à la clinique avant de réserver, ou utilisez l'outil de recherche de fournisseurs de la Sun Life."),
        ("Mon dentiste peut-il facturer plus que ce que paie le RCSD ?", "Oui. Les tarifs du RCSD sont souvent inférieurs au guide de l'ACDQ. Si les honoraires de la clinique sont plus élevés, vous payez la différence, en plus de votre quote-part."),
        ("Quand dois-je renouveler le RCSD ?", "Chaque année, au printemps. En 2026, la période de renouvellement allait du 15 avril au 1er juin, et la couverture des personnes qui n'ont pas renouvelé a pris fin le 30 juin."),
    ],
    "clinic": {"title": "Vous dirigez une clinique dentaire ? Mettez ce calculateur sur votre site, gratuitement.",
               "body": "Le même calculateur, au nom et aux couleurs de votre clinique, avec votre lien de prise de rendez-vous. SSS l'installe pendant un appel de 30 minutes.",
               "cta": ("/rcsd/", "Voir la version pour les cliniques")},
    "sources_label": "Sources",
    "sources": [
        ("Êtes-vous admissible, canada.ca", "https://www.canada.ca/fr/services/prestations/dentaire/regime-soins-dentaires/admissibilite.html"),
        ("Ce qui est couvert, canada.ca", "https://www.canada.ca/fr/services/prestations/dentaire/regime-soins-dentaires/couverture.html"),
        ("Statistiques sur les demandes, canada.ca", "https://www.canada.ca/fr/services/prestations/dentaire/regime-soins-dentaires/statistiques.html"),
        ("Coordination entre le RCSD et les programmes du Québec, canada.ca", "https://www.canada.ca/fr/services/prestations/dentaire/regime-soins-dentaires/fournisseurs/fiche-qc.html"),
        ("Services dentaires, RAMQ", "https://www.ramq.gouv.qc.ca/fr/citoyens/assurance-maladie/services-dentaires"),
    ],
    "disclaimer": "SSS est une agence de marketing pour cliniques dentaires. Cette page est de l'information générale, pas un avis, et n'est pas affiliée au gouvernement du Canada.",
    "footer_tag": "Marketing dentaire, mesuré au fauteuil.",
    "footer_nav": [("/", "Accueil"), ("/tarifs/", "Tarifs"), ("/rcsd/", "Calculateur RCSD pour cliniques"), ("/cdcp-calculator/", "English")],
    "footer_contact": [("mailto:info@sss.marketing", "info@sss.marketing"), ("/#contact", "Réserver un appel")],
    "nav_label": "Navigation", "contact_label": "Contact",
    "legal": "© 2026 SSS Marketing. Tous droits réservés. Mesure d'audience anonyme, sans témoins.",
    "app_name": "Calculateur d'admissibilité et de quote-part RCSD",
}

EXTRA_CSS = """
/* Patient guide additions */
.verified{margin-top:22px;font-size:14px;color:var(--ink-2)}
.calc-note{margin-top:20px;font-size:14px;line-height:1.55;color:var(--ink-2);max-width:44em}
.criteria-grid--4{grid-template-columns:repeat(4,minmax(0,1fr))}
.sec-after{margin-top:32px;font-size:16px;line-height:1.6;color:var(--ink-2);max-width:44em}
.tbl{width:100%;max-width:880px;border-collapse:collapse;border-top:1px solid var(--tan);font-variant-numeric:tabular-nums}
.tbl th,.tbl td{text-align:left;padding:16px 20px 16px 0;border-bottom:1px solid var(--rule);vertical-align:top}
.tbl th{font-size:12px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:var(--tan-deep)}
.tbl td{font-size:17px}
.tbl td:first-child{font-family:var(--display);font-size:19px}
.example{margin-top:40px;max-width:880px}
.example h3{font-family:var(--display);font-weight:500;font-size:22px;line-height:1.3;margin-bottom:14px}
.example dl{display:grid;grid-template-columns:minmax(0,14em) 1fr;border-top:1px solid var(--rule)}
.example dt,.example dd{padding:12px 0;border-bottom:1px solid var(--rule);font-size:16px}
.example dt{color:var(--ink-2)}
.cov-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0 32px;border-top:1px solid var(--tan)}
.cov-col h3{font-size:12px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:var(--tan-deep);padding:20px 0 10px}
.cov-col li{padding:10px 0;border-bottom:1px solid var(--rule-soft);font-size:16px;line-height:1.45}
.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 32px;border-top:1px solid var(--tan);counter-reset:s}
.step{padding:24px 0 28px;border-bottom:1px solid var(--rule)}
.step h3{font-family:var(--display);font-weight:500;font-size:22px;line-height:1.25;margin-bottom:10px}
.step h3::before{counter-increment:s;content:counter(s,decimal-leading-zero);display:block;font-family:var(--body);font-size:12px;letter-spacing:0.16em;color:var(--tan-deep);margin-bottom:10px}
.step p{font-size:16px;line-height:1.6;color:var(--ink-2)}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0 32px;border-top:1px solid var(--tan)}
.stat{padding:24px 0 28px;border-bottom:1px solid var(--rule)}
.stat-n{display:block;font-family:var(--display);font-weight:500;font-size:clamp(30px,3.2vw,44px);line-height:1.05;letter-spacing:-0.02em;font-variant-numeric:lining-nums tabular-nums}
.stat-l{display:block;margin-top:10px;font-size:15px;line-height:1.5;color:var(--ink-2)}
.text-link{border-bottom:1px solid var(--tan);padding-bottom:2px;transition:border-color .2s var(--ease)}
.text-link:hover{border-bottom-color:var(--ink)}
.sources{margin-top:56px;padding-top:28px;border-top:1px solid var(--rule)}
.sources h2{font-size:12px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:var(--tan-deep);margin-bottom:12px;font-family:var(--body)}
.sources li{font-size:15px;line-height:1.5;padding:4px 0}
.sources a{border-bottom:1px solid var(--rule)}
.sources a:hover{border-bottom-color:var(--ink)}
.disclaimer{margin-top:20px;font-size:14px;line-height:1.55;color:var(--ink-2);max-width:48em}
.crumbs{font-size:13px;color:var(--ink-2);margin-bottom:20px}
.crumbs a{border-bottom:1px solid var(--rule)}
.crumbs span[aria-hidden]{margin:0 8px;color:var(--tan-deep)}
@media(max-width:1024px){
  .criteria-grid--4{grid-template-columns:1fr 1fr}
  .criteria-grid--4 .criteria-cell:nth-child(3){border-left:none;padding-left:0}
  .cov-grid,.stats{grid-template-columns:1fr 1fr}
  .steps{grid-template-columns:1fr}
}
@media(max-width:760px){
  .criteria-grid--4,.cov-grid,.stats{grid-template-columns:1fr}
  .criteria-grid--4 .criteria-cell{border-left:none;padding-left:0}
  .example dl{grid-template-columns:1fr}
  .example dt{border-bottom:none;padding-bottom:0}
  .tbl th,.tbl td{padding-right:12px}
  .tbl td,.tbl td:first-child{font-size:16px}
}
"""

def base_css():
    s = (ROOT / "cdcp/index.html").read_text(encoding="utf-8")
    m = re.search(r"<style>(.*?)</style>", s, re.S)
    return m.group(1).rstrip() + "\n" + EXTRA_CSS


def jsonld(c):
    url = SITE + c["path"]
    graph = [
        {"@type": "WebPage", "@id": url + "#page", "url": url, "name": c["title"], "description": c["desc"],
         "inLanguage": c["hreflang"], "dateModified": FACTS["verified_iso"],
         "isPartOf": {"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": "SSS Marketing"},
         "publisher": {"@id": SITE + "/#org"},
         "about": {"@type": "GovernmentService", "name": "Canadian Dental Care Plan" if c["lang"] == "en" else "Régime canadien de soins dentaires",
                   "provider": {"@type": "GovernmentOrganization", "name": "Government of Canada" if c["lang"] == "en" else "Gouvernement du Canada"},
                   "areaServed": {"@type": "Country", "name": "Canada"}},
         "breadcrumb": {"@id": url + "#crumbs"}},
        {"@type": "BreadcrumbList", "@id": url + "#crumbs",
         "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + p} for i, (n, p) in enumerate(c["crumbs"])]},
        {"@type": "WebApplication", "name": c["app_name"], "url": url + "#calculator", "applicationCategory": "FinanceApplication",
         "operatingSystem": "Any", "inLanguage": c["hreflang"], "isAccessibleForFree": True,
         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "CAD"}, "publisher": {"@id": SITE + "/#org"}},
        {"@type": "Organization", "@id": SITE + "/#org", "name": "SSS Marketing", "url": SITE + "/", "logo": SITE + "/logo-mark@3x.png",
         "email": "info@sss.marketing"},
        {"@type": "FAQPage", "@id": url + "#faq",
         "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in c["faq"]]},
    ]
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, indent=1)


def section_html(i, s):
    out = []
    out.append(f'<section class="section {"section--surface-b" if i % 2 else "section--paper"}" id="{s["id"]}" aria-labelledby="{s["id"]}-t">')
    out.append('  <div class="section-rule"></div>\n  <div class="container">')
    out.append(f'    <div class="section-head fade-in"><span class="num">{i + 2:02d}</span><span class="sep"></span><span>{esc(s["label"])}</span></div>')
    out.append(f'    <h2 class="section-title fade-in d1" id="{s["id"]}-t">{esc(s["title"])}</h2>')
    if s.get("lede"):
        out.append(f'    <p class="section-lede fade-in d2">{esc(s["lede"])}</p>')
    if "grid" in s:
        cells = "".join(f'<div class="criteria-cell"><div class="criteria-label">{esc(a)}</div><div class="criteria-value">{esc(b)}</div><p class="criteria-note">{esc(c)}</p></div>' for a, b, c in s["grid"])
        out.append(f'    <div class="criteria-grid criteria-grid--4 fade-in">{cells}</div>')
    if "table" in s:
        t = s["table"]
        head = "".join(f'<th scope="col">{esc(h)}</th>' for h in t["head"])
        rows = "".join("<tr>" + "".join(f"<td>{esc(c)}</td>" for c in r) + "</tr>" for r in t["rows"])
        out.append(f'    <table class="tbl fade-in"><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table>')
    if "example" in s:
        items = "".join(f"<dt>{esc(a)}</dt><dd>{esc(b)}</dd>" for a, b in s["example"])
        out.append(f'    <div class="example fade-in"><h3>{esc(s["example_title"])}</h3><dl>{items}</dl></div>')
    if "cols" in s:
        cols = "".join(f'<div class="cov-col"><h3>{esc(h)}</h3><ul>' + "".join(f"<li>{esc(x)}</li>" for x in items) + "</ul></div>" for h, items in s["cols"])
        out.append(f'    <div class="cov-grid fade-in">{cols}</div>')
    if "steps" in s:
        st = "".join(f'<div class="step"><h3>{esc(h)}</h3><p>{esc(p)}</p></div>' for h, p in s["steps"])
        out.append(f'    <div class="steps fade-in">{st}</div>')
    if "stats" in s:
        st = "".join(f'<div class="stat"><span class="stat-n">{esc(n)}</span><span class="stat-l">{esc(l)}</span></div>' for n, l in s["stats"])
        out.append(f'    <div class="stats fade-in">{st}</div>')
    if s.get("after"):
        out.append(f'    <p class="sec-after fade-in">{esc(s["after"])}</p>')
    if s.get("link"):
        href, txt = s["link"]
        out.append(f'    <p class="sec-after fade-in"><a class="text-link" href="{href}" hreflang="fr">{esc(txt)} &#8594;</a></p>')
    out.append("  </div>\n</section>")
    return "\n".join(out)


def page(c, css):
    url = SITE + c["path"]
    en_url = SITE + (c["path"] if c["lang"] == "en" else c["alt_path"])
    fr_url = SITE + (c["path"] if c["lang"] == "fr" else c["alt_path"])
    w = c["widget"]
    nav_links = "".join(f'<a href="{h}">{esc(t)}</a>' for h, t in c["nav"])
    crumbs = '<span aria-hidden="true">/</span>'.join(
        (f'<a href="{p}">{esc(n)}</a>' if i < len(c["crumbs"]) - 1 else f'<span aria-current="page">{esc(n)}</span>')
        for i, (n, p) in enumerate(c["crumbs"]))
    sections = "\n\n".join(section_html(i, s) for i, s in enumerate(c["sections"]))
    nfaq = len(c["sections"]) + 2
    faq = "\n".join(f'<details><summary>{esc(q)}</summary><div class="faq-a">{esc(a)}</div></details>' for q, a in c["faq"])
    sources = "".join(f'<li><a href="{u}" rel="noopener" target="_blank">{esc(n)}</a></li>' for n, u in c["sources"])
    fnav = "".join(f'<li><a href="{h}">{esc(t)}</a></li>' for h, t in c["footer_nav"])
    fcon = "".join(f'<li><a href="{h}">{esc(t)}</a></li>' for h, t in c["footer_contact"])
    lh, lhl, lt = c["lang_link"]
    return f"""<!doctype html>
<html lang="{c['hreflang']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#fefae0">
<title>{esc(c['title'])}</title>
<meta name="description" content="{esc(c['desc'])}">
<meta name="format-detection" content="telephone=no">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="en-CA" href="{en_url}">
<link rel="alternate" hreflang="fr-CA" href="{fr_url}">
<link rel="alternate" hreflang="x-default" href="{en_url}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.png" type="image/png" sizes="32x32">
<link rel="shortcut icon" href="/favicon.ico">
<link rel="preload" as="font" type="font/woff2" href="/fonts/newsreader-latin-opsz-normal.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/fonts/hanken-grotesk-latin-wght-normal.woff2" crossorigin>
<meta property="og:type" content="website">
<meta property="og:site_name" content="SSS">
<meta property="og:locale" content="{c['locale']}">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{esc(c['og_title'])}">
<meta property="og:description" content="{esc(c['desc'])}">
<meta property="og:image" content="{SITE}{'/cdcp/og-image.png' if c['lang'] == 'en' else '/rcsd/og-image.png'}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
{jsonld(c)}
</script>
<style>
{css}
</style>
</head>
<body>
<a class="skip-link" href="#main-content">{esc(c['skip'])}</a>

<nav id="nav" aria-label="{'Main' if c['lang'] == 'en' else 'Principal'}">
  <div class="nav-inner">
    <a href="{c['home']}" class="nav-logo" aria-label="SSS">
      <img src="/logo-nav.png" srcset="/logo-nav.png 1x, /logo-nav@2x.png 2x, /logo-nav@3x.png 3x" alt="SSS" width="74" height="30" fetchpriority="high" loading="eager" decoding="async">
    </a>
    <div class="nav-links">{nav_links}</div>
    <div class="nav-right">
      <a class="nav-lang-link" href="{lh}" hreflang="{lhl}" lang="{lhl}">{esc(lt)}</a>
      <a href="{c['nav_cta'][0]}" class="cta-nav">{esc(c['nav_cta'][1])}</a>
    </div>
  </div>
</nav>

<main id="main-content">
<header class="hero" id="top">
  <div class="container">
    <div class="hero-left">
      <p class="crumbs fade-in">{crumbs}</p>
      <p class="eyebrow label fade-in d1">{esc(c['eyebrow'])}</p>
      <h1 class="fade-in d2">{esc(c['h1'])}</h1>
      <p class="hero-sub fade-in d3">{esc(c['sub'])}</p>
      <p class="verified fade-in d3">{esc(c['verified'])}</p>
    </div>
  </div>
</header>

<section class="section section--surface-b" id="calculator" aria-labelledby="calcTitle">
  <div class="section-rule"></div>
  <div class="container">
    <div class="section-head fade-in"><span class="num">01</span><span class="sep"></span><span>{esc(c['calc_kicker'])}</span></div>
    <h2 class="calc-title fade-in d1" id="calcTitle">{esc(c['calc_title'])}</h2>
    <div class="quiz-wrap fade-in d2">
      <cdcp-calculator data-lang="{w['lang']}" data-province="{w['province']}" data-primary-color="#1B3B36" data-clinic-name="{esc(w['clinic'])}" data-booking-url="{w['booking']}"></cdcp-calculator>
      <p class="calc-note">{esc(c['calc_note'])}</p>
    </div>
  </div>
</section>

{sections}

<section class="section section--paper" id="faq" aria-labelledby="faqTitle">
  <div class="section-rule"></div>
  <div class="container">
    <div class="section-head fade-in"><span class="num">{nfaq:02d}</span><span class="sep"></span><span>{esc(c['faq_label'])}</span></div>
    <h2 class="section-title fade-in d1" id="faqTitle">{esc(c['faq_title'])}</h2>
    <div class="faq fade-in d2">
{faq}
    </div>
    <div class="demo-cta fade-in" style="margin-top:56px">
      <p>{esc(c['clinic']['title'])}</p>
      <a href="{c['clinic']['cta'][0]}" class="cta-primary">{esc(c['clinic']['cta'][1])}<span class="cta-arrow" aria-hidden="true">&#8594;</span></a>
    </div>
    <p class="disclaimer" style="margin-top:16px">{esc(c['clinic']['body'])}</p>
    <div class="sources">
      <h2>{esc(c['sources_label'])}</h2>
      <ul>{sources}</ul>
      <p class="disclaimer">{esc(c['disclaimer'])}</p>
    </div>
  </div>
</section>
</main>

<footer>
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="footer-brand-mark"><img src="/logo-mark.png" srcset="/logo-mark.png 1x, /logo-mark@2x.png 2x, /logo-mark@3x.png 3x" alt="SSS" width="148" height="61" loading="lazy" decoding="async"></div>
        <p class="footer-brand-tag">{esc(c['footer_tag'])}</p>
      </div>
      <div class="footer-col"><div class="footer-col-label">{esc(c['nav_label'])}</div><ul>{fnav}</ul></div>
      <div class="footer-col"><div class="footer-col-label">{esc(c['contact_label'])}</div><ul>{fcon}</ul></div>
    </div>
    <div class="footer-legal">{esc(c['legal'])}</div>
  </div>
</footer>

<script>
(function(){{
  var nav=document.getElementById("nav"),ticking=false;
  window.addEventListener("scroll",function(){{if(!ticking){{requestAnimationFrame(function(){{nav.classList.toggle("scrolled",window.scrollY>24);ticking=false;}});ticking=true;}}}},{{passive:true}});
  var io=new IntersectionObserver(function(es){{es.forEach(function(e){{if(e.isIntersecting){{e.target.classList.add("visible");io.unobserve(e.target);}}}});}},{{threshold:0.12,rootMargin:"0px 0px -40px 0px"}});
  document.querySelectorAll(".fade-in").forEach(function(el){{io.observe(el);}});
}})();
</script>
<script src="/s.js" defer></script>
<script src="/embed/index.js?v=2768d471" defer></script>
</body>
</html>
"""


def main():
    css = base_css()
    for c in (EN, FR):
        out = ROOT / c["path"].strip("/") / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(c, css), encoding="utf-8")
        print("wrote", out.relative_to(ROOT))


if __name__ == "__main__":
    main()
