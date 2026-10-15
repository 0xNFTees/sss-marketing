/**
 * EmbeddableDentalCalculator -- the CDCP / RCSD coverage estimator as a React component.
 *
 * Same rules, same French wording and same links as the dependency-free widget (cdcp-embed.js); the
 * calculation lives in ./engine and the copy in ./copy so the two implementations cannot drift.
 * Requires React 18+, Tailwind CSS v4 (container-query variants), framer-motion 11+, lucide-react.
 *
 * Layout follows the clinic's column, not the viewport (container queries): below ~672px the output leads and the
 * answers follow; from there up it is a two-pane card (inputs 7 / live output 5). See README.md for theming.
 */
import {
  useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode,
} from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Info, Mail, Phone, ShieldCheck } from "lucide-react";
import { LABELS, UI, type Lang } from "./copy";
import {
  EMPTY_ANSWERS, INCOME_KEYS, VISITS, estimate, firstUnanswered, indexProcedures, outcome, requiredSteps,
  type Answers, type Estimate, type IncomeKey, type Outcome, type Procedure, type Step, type VisitId, type YesNo,
} from "./engine";

/* ------------------------------------------------------------------------------------------------ public API */
export interface CalculatorTheme {
  primary?: string; accent?: string; radius?: string; ink?: string; paper?: string; tint?: string; line?: string;
  good?: string; bad?: string; warn?: string; panel?: string; onPanel?: string; font?: string; display?: string;
}
export interface EmbeddableDentalCalculatorProps {
  lang?: Lang;
  /** Shown in the card header: "Calculateur dentaire · {clinicName}". */
  clinicName?: string;
  /** Fee data (the `procedures` array of cdcp-estimator-data.js). Without it the tool is eligibility-only. */
  procedures?: readonly Procedure[];
  bookingUrl?: string;
  phone?: string;
  email?: string;
  insurers?: readonly string[];
  /** Inline brand tokens; the same values can be set as --cw-* custom properties from the host's CSS instead. */
  theme?: CalculatorTheme;
  /** Height of a fixed host header, so the pinned figure sits below it. */
  stickyTop?: number | string;
  defaultAnswers?: Partial<Answers>;
  className?: string;
  onChange?: (s: { answers: Answers; outcome: Outcome; estimate: Estimate | null }) => void;
}

/* ------------------------------------------------------------------------------------------------ helpers */
const HEADER = { fr: "Calculateur dentaire", en: "Dental calculator" } as const;
const nb = (s: string) => s.replace(/(\d) (?=\d)/g, "$1 ").replace(/ (%|\$)/g, " $1");
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]";

function withBookingParams(url: string, params: Record<string, string>) {
  try {
    const u = new URL(url, typeof window === "undefined" ? "https://example.invalid" : window.location.origin);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    return u.toString();
  } catch { return url; }
}
const weeksIso = (w: number) => { const d = new Date(); d.setDate(d.getDate() + w * 7); return d.toISOString().slice(0, 10); };

function themeVars(t: CalculatorTheme | undefined, sticky: number | string | undefined): CSSProperties {
  const v: Record<string, string> = {
    "--p": "var(--cw-primary, var(--cdcp-brand, #1c1812))", "--a": "var(--cw-accent, var(--cdcp-accent, #b5835a))",
    "--r": "var(--cw-radius, 1.5rem)", "--ink": "var(--cw-ink, var(--cdcp-ink, #1c1812))",
    "--paper": "var(--cw-paper, var(--cdcp-paper, #ffffff))", "--tint": "var(--cw-tint, var(--cdcp-tint, #f3f1ea))",
    "--line": "var(--cw-line, var(--cdcp-line, #d8d4c8))", "--good": "var(--cw-good, var(--cdcp-good, #2f6b35))",
    "--bad": "var(--cw-bad, var(--cdcp-bad, #b3261e))", "--warn": "var(--cw-warn, var(--cdcp-warn, #8a4f1c))",
    "--panel": "var(--cw-panel, var(--ink))", "--onpanel": "var(--cw-on-panel, var(--paper))",
    "--edge": "color-mix(in srgb, var(--ink) 48%, var(--paper))",
    "--good-on-panel": "color-mix(in srgb, var(--good) 40%, #ffffff)",
    "--stick": typeof sticky === "number" ? `${sticky}px` : sticky ?? "var(--cw-sticky-top, 0px)",
    fontFamily: "var(--cw-font, var(--cdcp-font, inherit))",
  };
  if (t) {
    const map: [keyof CalculatorTheme, string][] = [["primary", "--cw-primary"], ["accent", "--cw-accent"], ["radius", "--cw-radius"],
      ["ink", "--cw-ink"], ["paper", "--cw-paper"], ["tint", "--cw-tint"], ["line", "--cw-line"], ["good", "--cw-good"],
      ["bad", "--cw-bad"], ["warn", "--cw-warn"], ["panel", "--cw-panel"], ["onPanel", "--cw-on-panel"], ["font", "--cw-font"], ["display", "--cw-display"]];
    map.forEach(([k, name]) => { if (t[k]) v[name] = t[k] as string; });
  }
  return v as CSSProperties;
}

/** Spring-tweens a number so a changed estimate settles instead of jumping. No motion when the user prefers none. */
function useTween(target: number | null, reduce: boolean | null) {
  const [shown, setShown] = useState<number | null>(target);
  const cur = useRef<number | null>(target);
  useEffect(() => {
    if (target === null || reduce || cur.current === null) { cur.current = target; setShown(target); return; }
    const c = animate(cur.current, target, {
      type: "spring", stiffness: 170, damping: 26, restDelta: 0.004,
      onUpdate: (v) => { cur.current = v; setShown(v); },
      onComplete: () => { cur.current = target; setShown(target); },
    });
    return () => c.stop();
  }, [target, reduce]);
  return shown === null ? null : Math.round(shown * 100) / 100;
}

/* ------------------------------------------------------------------------------------------------ small parts */
function Money({ value, lang, className = "" }: { value: number; lang: Lang; className?: string }) {
  const parts = useMemo(() => new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 }).formatToParts(value), [value, lang]);
  return (
    <span className={`whitespace-nowrap tabular-nums ${className}`}>
      {parts.map((p, i) =>
        p.type === "decimal" || p.type === "fraction" ? <span key={i} className="text-[.45em] font-semibold">{p.value}</span>
        : p.type === "currency" ? <span key={i} className="align-[.4em] text-[.42em] font-semibold">{p.value}</span>
        : p.type === "literal" ? <span key={i} className="text-[.42em]">{p.value}</span>
        : <span key={i}>{p.value}</span>)}
    </span>
  );
}
const plain = (n: number, lang: Lang) => new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD" }).format(n);

function StepPills({ n, t, label }: { n: number; t: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div role="progressbar" aria-label={label} aria-valuemin={1} aria-valuemax={t} aria-valuenow={n} className="flex gap-1.5">
        {Array.from({ length: t }, (_, i) => (
          <span key={i} className={`h-1.5 w-7 rounded-full transition-colors duration-200 ${i < n - 1 ? "bg-[var(--ink)]" : i === n - 1 ? "bg-[var(--edge)]" : "bg-[var(--line)]"}`} />
        ))}
      </div>
      <span className="text-xs font-semibold">{label}</span>
    </div>
  );
}

interface Option<V extends string> { value: V; label: string; hint?: string; aria?: string; amount?: string }
/** A radio group drawn as selectable cards. Native radios underneath: arrows, Space and screen readers all work. */
function Choice<V extends string>(props: {
  name: string; legend: string; hint?: string; options: readonly Option<V>[]; value: V | null; onChange: (v: V) => void;
  onPointer: (isPointer: boolean) => void; columns?: 1 | 2; invalid?: boolean; legendId?: string;
}) {
  const { name, legend, hint, options, value, onChange, onPointer, columns = 1, invalid } = props;
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 w-full">
        <span className="block font-[family-name:var(--cw-display,var(--cdcp-display,inherit))] text-xl font-medium leading-tight tracking-tight">{legend}</span>
        {hint && <span className="mt-0.5 block text-[13px] leading-snug opacity-75">{hint}</span>}
      </legend>
      <div className={`grid gap-2.5 ${columns === 2 ? "@md:grid-cols-2" : ""}`}>
        {options.map((o) => (
          <label key={o.value} onPointerDown={() => onPointer(true)} onKeyDown={() => onPointer(false)}
            className={`group/c relative block cursor-pointer rounded-2xl border border-[var(--line)] bg-[var(--tint)] text-[var(--ink)] transition duration-150 ease-out
              hover:-translate-y-px hover:bg-[var(--paper)] hover:shadow-sm active:translate-y-0
              has-[:checked]:border-transparent has-[:checked]:bg-[linear-gradient(var(--paper),var(--paper))_padding-box,linear-gradient(135deg,var(--p),var(--a))_border-box]
              has-[:checked]:shadow-[0_6px_18px_-10px_rgb(0_0_0/.35)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ink)]
              forced-colors:has-[:checked]:border-[Highlight] ${invalid ? "has-[:checked]:[background:linear-gradient(var(--paper),var(--paper))_padding-box,linear-gradient(var(--bad),var(--bad))_border-box]" : ""}
              motion-reduce:transition-none motion-reduce:hover:translate-y-0`}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} aria-label={o.aria ?? (o.hint ? `${o.label}. ${o.hint}` : o.label)}
              onChange={() => onChange(o.value)} className="peer absolute inset-0 size-full cursor-pointer opacity-0" />
            <span className="flex min-h-14 items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold leading-snug">{o.label}</span>
                {o.hint && <span className="mt-0.5 block text-[13px] leading-snug opacity-75">{o.hint}</span>}
              </span>
              {o.amount && <span aria-hidden className="shrink-0 font-[family-name:var(--cw-display,var(--cdcp-display,inherit))] text-xl font-medium tabular-nums">{o.amount}</span>}
              <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full border border-[var(--edge)] bg-[var(--paper)] text-[var(--paper)] transition duration-150
                group-has-[:checked]/c:border-transparent group-has-[:checked]/c:bg-[var(--p)] group-has-[:checked]/c:text-[var(--paper)]">
                <Check className="size-3 scale-50 opacity-0 transition duration-150 group-has-[:checked]/c:scale-100 group-has-[:checked]/c:opacity-100" strokeWidth={3} />
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CtaLink({ href, children, external, variant = "primary" }: { href: string; children: ReactNode; external?: boolean; variant?: "primary" | "secondary" }) {
  return (
    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13px] font-semibold leading-tight transition duration-150 ${FOCUS}
        ${variant === "primary" ? "bg-[var(--paper)] text-[var(--ink)] hover:brightness-95 active:translate-y-px" : "border border-white/30 text-[var(--onpanel)] hover:bg-white/10"}`}>
      {children}
      {external ? <ArrowUpRight className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
    </a>
  );
}

function Drawer({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group/d rounded-2xl border border-white/15 bg-white/5">
      <summary className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-2 text-[13px] font-semibold marker:hidden [&::-webkit-details-marker]:hidden ${FOCUS}`}>
        <span className="flex items-center gap-2"><Info className="size-4" aria-hidden />{title}</span>
        <ChevronDown className="size-4 transition-transform duration-200 group-open/d:rotate-180 motion-reduce:transition-none" aria-hidden />
      </summary>
      <div className="space-y-3 px-4 pb-4 text-[13px] leading-relaxed">{children}</div>
    </details>
  );
}

/* ------------------------------------------------------------------------------------------------ main component */
export function EmbeddableDentalCalculator({
  lang = "fr", clinicName, procedures, bookingUrl = "/#contact", phone, email, insurers, theme, stickyTop,
  defaultAnswers, className = "", onChange,
}: EmbeddableDentalCalculatorProps) {
  const L = LABELS[lang], U = UI[lang], uid = useId(), reduce = useReducedMotion();
  const byCode = useMemo(() => indexProcedures(procedures), [procedures]);
  const hasFees = !!byCode;
  const [a, setA] = useState<Answers>({ ...EMPTY_ANSWERS, ...defaultAnswers });
  const [cur, setCur] = useState<Step | null>(null);
  // narrow screens: the pinned mini-figure appears only once the hero figure has scrolled out of view
  const figRef = useRef<HTMLParagraphElement>(null);
  const [figSeen, setFigSeen] = useState(true);
  // summary dock: shown once the main actions have scrolled out of view
  const actRef = useRef<HTMLDivElement>(null);
  const [actSeen, setActSeen] = useState(true);
  const pointer = useRef(false), advance = useRef<ReturnType<typeof setTimeout>>(undefined), stage = useRef<HTMLDivElement>(null);

  const steps = requiredSteps(a);
  const view: Step | null = cur && steps.includes(cur) ? cur : firstUnanswered(a);
  const complete = view === null;
  const oc = outcome(a);
  const est = useMemo(() => (oc === "insurance" ? null : estimate(a, byCode)), [a, oc, byCode]);
  const showFigure = !!est && !est.bad && est.known;
  const shown = useTween(showFigure ? est.patient : null, reduce);

  useEffect(() => { onChange?.({ answers: a, outcome: oc, estimate: est }); }, [a, oc, est, onChange]);
  useEffect(() => () => clearTimeout(advance.current), []);
  // keyboard users keep their place: after a step change the focus moves into the new question
  useEffect(() => {
    const el = figRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setFigSeen(e.isIntersecting || e.boundingClientRect.top > 0), { rootMargin: "-56px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [complete, oc, hasFees]);
  useEffect(() => {
    const el = actRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setActSeen(e.isIntersecting), { rootMargin: "0px 0px -72px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [complete, oc, hasFees, est?.known]);
  const mounted = useRef(false);
  useEffect(() => { if (!mounted.current) { mounted.current = true; return; } if (!pointer.current) stage.current?.querySelector<HTMLElement>("input:checked, input, button")?.focus({ preventScroll: true }); }, [view]);

  const set = useCallback(<K extends keyof Answers>(k: K, v: Answers[K]) => {
    setA((p) => ({ ...p, [k]: v }));
    if (k === "appt") return;
    setCur(k); // hold the question: keyboard users move on with "Continuer"; pointer users auto-advance below
    clearTimeout(advance.current);
    if (pointer.current) advance.current = setTimeout(() => setCur(null), 140);
  }, []);
  const clear = () => { setA(EMPTY_ANSWERS); setCur(null); pointer.current = false; };

  /* ----- copy for the current outcome ----- */
  const R = L.results;
  const tier = a.inc === "under70" ? "100" : a.inc === "band70" ? "60" : a.inc === "band80" ? "40" : null;
  const head: { title: string; detail: string | null; tone: "good" | "bad" | "warn" | "neutral"; label: string } = (() => {
    switch (oc) {
      case "insurance": return { title: R.branchInsurance.headline, detail: R.branchInsurance.microCopy, tone: "good", label: U.st.insurance };
      case "income": return { title: R.branchIncome.headline, detail: R.branchIncome.microCopy, tone: "bad", label: U.st.income };
      case "tax": return { title: R.branchTaxFiling.headline, detail: R.branchTaxFiling.microCopy, tone: "warn", label: U.st.tax };
      case "qualified": return { title: nb(R[`tier${tier}Badge` as "tier100Badge"]), detail: null, tone: "good", label: U.st.qualified };
      case "unconfirmed": return { title: nb(U.tierUnconfirmed.replace("{n}", String(tier === "100" ? 100 : tier))), detail: null, tone: "warn", label: U.st.unconfirmed };
      default: return { title: U.pendH, detail: U.pendS, tone: "neutral", label: a.ins || a.inc || a.filed ? U.st.pending : U.st.none };
    }
  })();
  const book = (extra: Record<string, string>) => withBookingParams(bookingUrl, { utm_source: "cdcp-calculator", ...extra });
  const missingLine = (() => {
    if (est?.bad) return U.unavailable;
    if (!complete) {
      const done = [a.ins, a.inc, a.filed].filter(Boolean).length + (a.appt ? 1 : 0);
      const todo = [!a.ins && U.ins, a.ins === "no" && !a.inc && U.inc, a.inc && a.inc !== "over90" && a.ins === "no" && !a.filed && U.filed].filter(Boolean).join(", ");
      const lead = a.ins ? U.prog.replace("{n}", String(done)).replace("{t}", String(steps.length + (hasFees ? 1 : 0))) + ". " : "";
      return lead + U.remain + " " + todo + ".";
    }
    return hasFees && !a.appt && oc !== "insurance" ? U.pickVisit : "";
  })();
  const announce = `${head.title}${showFigure && est ? `. ${U.cost} ${plain(est.fee, lang)}, ${U.paid} ${plain(est.covered, lang)}. ${U.share} ${plain(est.patient, lang)}` : ""}`;

  /* ----- left pane ----- */
  const yn = (k: "ins" | "filed"): Option<YesNo>[] => {
    const s = k === "ins" ? L.step1 : L.step3;
    return [{ value: "yes", label: s.yes }, { value: "no", label: s.no }];
  };
  const incomeOptions: Option<IncomeKey>[] = INCOME_KEYS.map((k) => ({ value: k, label: nb(L.step2[k]) }));
  // what each visit would cost the patient under the answers so far: same estimate() rules, shown only where a personal figure is shown
  const showShare = oc === "qualified" || oc === "unconfirmed" || oc === "income" || oc === "tax";
  const visitOptions: Option<VisitId>[] = VISITS.map((v) => {
    const e = showShare ? estimate({ ...a, appt: v.id }, byCode) : null;
    const amount = e && !e.bad ? plain(oc === "tax" ? e.fee : e.patient, lang) : undefined;
    return { value: v.id, label: U.pk[v.id][0], hint: U.pk[v.id][1], amount, aria: amount ? `${U.pk[v.id][0]}. ${U.pk[v.id][1]}. ${U.share} ${amount}` : undefined };
  });
  const answerText = (k: Step): string | null =>
    k === "ins" ? (a.ins ? (a.ins === "yes" ? L.step1.yes : L.step1.no) : null)
    : k === "inc" ? (a.inc ? nb(L.step2[a.inc]) : null) : a.filed ? (a.filed === "yes" ? L.step3.yes : L.step3.no) : null;
  const stepLabel = (k: Step) => (k === "ins" ? U.ins : k === "inc" ? U.inc : U.filed);

  const stagePane = view ? (
    <motion.div key={view} ref={stage} initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.16 }}>
      <div className="mb-4 flex min-h-11 items-center justify-between gap-3">
        {steps.indexOf(view) > 0
          ? <button type="button" onClick={() => setCur(steps[steps.indexOf(view) - 1])} className={`inline-flex min-h-11 items-center gap-1 rounded-lg pr-2 text-[13px] font-semibold underline underline-offset-4 ${FOCUS}`}><ChevronLeft className="size-4" aria-hidden />{L.back}</button>
          : <span />}
        <StepPills n={steps.indexOf(view) + 1} t={steps.length} label={(a.ins ? U.qn : U.qn.replace(/ (sur|of) \{t\}/, "")).replace("{n}", String(steps.indexOf(view) + 1)).replace("{t}", String(steps.length))} />
      </div>
      {view === "ins" && <Choice name={`${uid}ins`} legend={U.ins} hint={U.insI} options={yn("ins")} value={a.ins} onChange={(v) => set("ins", v)} onPointer={(p) => (pointer.current = p)} />}
      {view === "inc" && <Choice name={`${uid}inc`} legend={U.inc} hint={U.incI} options={incomeOptions} value={a.inc} onChange={(v) => set("inc", v)} onPointer={(p) => (pointer.current = p)} columns={2} />}
      {view === "filed" && <Choice name={`${uid}filed`} legend={U.filed} hint={U.filedI} options={yn("filed")} value={a.filed} onChange={(v) => set("filed", v)} onPointer={(p) => (pointer.current = p)} />}
      {a[view] && (
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={() => { setCur(null); }} className={`inline-flex min-h-11 items-center gap-1 rounded-xl border border-[var(--ink)] px-4 text-[13px] font-semibold transition hover:bg-[var(--ink)] hover:text-[var(--paper)] ${FOCUS}`}>{U.cont}<ChevronRight className="size-4" aria-hidden /></button>
        </div>
      )}
    </motion.div>
  ) : (
    <motion.div key="done" ref={stage} initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.16 }} className="space-y-6">
      <section aria-labelledby={`${uid}yours`}>
        <h3 id={`${uid}yours`} className="mb-2 text-xs font-semibold tracking-wide opacity-70">{U.yours}</h3>
        <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]">
          {steps.map((k) => (
            <li key={k}>
              <button type="button" onClick={() => { pointer.current = false; setCur(k); }} aria-label={`${U.edit} : ${stepLabel(k)}, ${answerText(k)}`}
                className={`flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left transition hover:bg-[var(--tint)] focus-visible:outline-offset-[-2px] ${FOCUS}`}>
                <span className="min-w-0"><span className="block text-xs opacity-70">{stepLabel(k)}</span><span className="block text-[13px] font-semibold">{answerText(k)}</span></span>
                <span className="shrink-0 text-xs font-semibold underline underline-offset-4">{U.edit}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      {hasFees && oc !== "insurance" && (
        <Choice name={`${uid}appt`} legend={U.appt} options={visitOptions} value={a.appt} onChange={(v) => set("appt", v)} onPointer={(p) => (pointer.current = p)} invalid={!!est?.bad} />
      )}
    </motion.div>
  );

  /* ----- right pane (live output) ----- */
  const badgeIcon = head.tone === "good" ? <ShieldCheck className="size-4" aria-hidden /> : <Info className="size-4" aria-hidden />;
  const coveredPct = est && est.fee > 0 ? Math.max(0, Math.min(100, (est.covered / est.fee) * 100)) : 0;
  const covers = est && est.tierPct && (est.covered > 0 || !est.excluded);
  const notes: { tone: "bad" | "warn"; text: string }[] = [];
  if (est && !est.bad) {
    const x = (U.pk[est.visit] as readonly string[])[2];
    if (x) notes.push({ tone: "bad", text: x });
    if (est.known && est.preAuth && est.covered) notes.push({ tone: "warn", text: U.pre });
    if (est.lab) notes.push({ tone: "bad", text: U.lab });
    if (est.excluded) notes.push({ tone: "bad", text: U.excl });
  }
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null;

  const dockOn = !!(est && !est.bad && est.known && est.fee > 0 && (oc === "qualified" || oc === "unconfirmed" || oc === "income"));
  const dockHref = oc === "qualified" ? book({ branch: "qualified", cdcpTier: tier ?? "", suggestedDate: weeksIso(7) }) : book({ branch: oc });
  const dockLabel = oc === "qualified" ? R.branchQualified.step2Cta : R.branchIncome.primaryCta;
  const ctaNode = (
    <>
      {oc !== "pending" && (
          <div ref={actRef} className="space-y-3 pt-1"><div className="flex flex-wrap gap-3">
            {oc === "insurance" && <CtaLink href={book({ branch: "insurance" })}>{R.branchInsurance.primaryCta}</CtaLink>}
            {oc === "income" && <CtaLink href={book({ branch: "income" })}>{R.branchIncome.primaryCta}</CtaLink>}
            {oc === "unconfirmed" && <CtaLink href={book({ branch: "unconfirmed" })}>{R.branchIncome.primaryCta}</CtaLink>}
            {oc === "tax" && (<><CtaLink href={L.craMyAccountUrl} external>{R.branchTaxFiling.primaryCta}</CtaLink>
              <CtaLink variant="secondary" href={book({ branch: "tax-filing", suggestedDate: weeksIso(4) })}>{R.branchTaxFiling.secondaryCta}</CtaLink></>)}
            {oc === "qualified" && (<><CtaLink href={book({ branch: "qualified", cdcpTier: tier ?? "", suggestedDate: weeksIso(7) })}>{R.branchQualified.step2Cta}</CtaLink>
              <CtaLink variant="secondary" href={L.cdcpApplyUrl} external>{R.branchQualified.step1Cta}</CtaLink></>)}
          </div>
            {oc === "qualified" && (
              <ol className="space-y-2 text-[13px] leading-relaxed opacity-90">
                <li><b>{L.stepLabel.replace("{current}", "1").replace("{total}", "2")} · {R.branchQualified.step1Title.replace(/^[^—-]*[—-]\s*/, "")}</b> {R.branchQualified.step1Body}</li>
                <li><b>{L.stepLabel.replace("{current}", "2").replace("{total}", "2")} · {R.branchQualified.step2Title.replace(/^[^—-]*[—-]\s*/, "")}</b> {R.branchQualified.step2MicroCopy}</li>
                <li>{R.branchQualified.step3Title.replace(/^[^—-]*[—-]\s*/, "")}{" "}<a className={`font-semibold underline underline-offset-4 ${FOCUS}`} href={book({ branch: "qualified-help" })}>{R.branchQualified.step3Cta}</a></li>
              </ol>
            )}
          </div>
        )}
    </>
  );

  const panel = (
    <div className="flex h-full flex-col gap-5 bg-[var(--panel)] p-6 text-[var(--onpanel)] @2xl:p-8">
      <div className="space-y-3">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1 text-xs font-semibold">
          <span className={head.tone === "good" ? "text-[var(--good-on-panel)]" : head.tone === "bad" ? "text-[#ffb4ab]" : head.tone === "warn" ? "text-[#ffd8a8]" : ""}>{badgeIcon}</span>{head.label}
        </p>
        <h2 className="font-[family-name:var(--cw-display,var(--cdcp-display,inherit))] text-[clamp(1.25rem,3.4cqw,1.6rem)] font-medium leading-tight tracking-tight text-balance">{head.title}</h2>
        {head.detail && <p className="max-w-[52ch] text-[13px] leading-relaxed opacity-85">{head.detail}</p>}

        {oc !== "insurance" && hasFees && (
          <div className="pt-2">
            <p className="text-[13px] font-semibold">{U.share}</p>
            <p ref={figRef} aria-hidden className={`mt-1 font-[family-name:var(--cw-display,var(--cdcp-display,inherit))] text-5xl font-extrabold leading-none tracking-tight @2xl:text-6xl ${shown === null ? "opacity-25" : ""}`}>
              {shown === null ? <span>—<span className="ml-1 align-[.4em] text-[.42em]">$</span></span> : <Money value={shown} lang={lang} />}
            </p>
            {missingLine && <p className="mt-2 text-[13px] leading-snug opacity-85">{missingLine}</p>}
            {est && !est.bad && !est.known && null}
          </div>
        )}

        {est && !est.bad && est.known && (
          <div className="space-y-3 pt-1">
            <div aria-hidden className="flex h-2.5 overflow-hidden rounded-full bg-[var(--onpanel)]/90">
              <motion.div className="h-full bg-[var(--good-on-panel)]" initial={false} animate={{ width: `${coveredPct}%` }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 24 }} />
            </div>
            <details className="group/d">
              <summary className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-xs marker:hidden [&::-webkit-details-marker]:hidden ${FOCUS}`}>
                <span className="flex-1 opacity-85">{U.estNote}</span>
                <span className="font-semibold underline decoration-[var(--a)] decoration-2 underline-offset-4">{U.viewCalc}</span>
                <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-open/d:rotate-180 motion-reduce:transition-none" aria-hidden />
              </summary>
              <div className="border-t border-white/15 text-[13px]">
                <dl className="divide-y divide-white/15 text-[13px]">
              <div className="flex items-baseline justify-between gap-3 py-2"><dt>{U.cost}<small className="block text-xs opacity-70">{U.std}</small></dt><dd className="font-semibold tabular-nums">{plain(est.fee, lang)}</dd></div>
              <div className="flex items-baseline justify-between gap-3 py-2">
                <dt className="flex-1"><span className="mr-2 inline-block size-2 bg-[var(--good-on-panel)] align-baseline" aria-hidden />{U.paid}
                  <small className="block text-xs opacity-80">{nb(covers ? U.grid.replace("{n}", String(Math.round((est.tierPct ?? 0) * 100))) : est.tierPct ? U.noCover : U.noelig)}</small></dt>
                <dd className="font-semibold tabular-nums">{est.covered ? "− " : ""}{plain(est.covered, lang)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2"><dt><span className="mr-2 inline-block size-2 bg-[var(--onpanel)] align-baseline" aria-hidden />{U.you}</dt><dd className="font-semibold tabular-nums">{plain(est.patient, lang)}</dd></div>
            </dl>
              </div>
            </details>
            {ctaNode}
            {oc === "tax" && <p className="text-xs opacity-80">{U.whenIssued}</p>}
            {oc === "unconfirmed" && <p className="text-xs opacity-80">{U.ifQualify}</p>}
            {est.fee > 0 && est.patient === 0 && <p className="text-xs opacity-80">{U.full}</p>}
          </div>
        )}
        {!(est && !est.bad && est.known) && ctaNode}
        {est && !est.bad && (
          <div className="space-y-1 text-[13px] leading-relaxed">
            <p><b>{U.incl}</b>{lang === "fr" ? " : " : ": "}{U.pk[est.visit][1]}</p>
            {notes.map((n) => <p key={n.text} className={n.tone === "bad" ? "text-[#ffb4ab]" : "text-[#ffd8a8]"}>{n.text}</p>)}
          </div>
        )}

      </div>

      {oc !== "pending" && (
        <div className="space-y-2">
          {(oc === "qualified" || oc === "unconfirmed" || (est && !est.bad)) && (
            <Drawer title={R.billingNoticeHeading}>
              {(oc === "qualified" || oc === "unconfirmed") && <p className="border-l-2 border-[var(--a)] pl-3"><b>{R.billingNoticeHeading}.</b> {R.billingNoticeBody}</p>}
              {(oc === "qualified" || oc === "unconfirmed") && <p className="opacity-85">{U.ramq}</p>}
              {est && !est.bad && <p className="opacity-85">{U.disc}</p>}
              {oc === "qualified" && <p className="opacity-85">{R.sourceNote}</p>}
            </Drawer>
          )}
          {(oc === "qualified" || oc === "unconfirmed") && (
            <Drawer title={U.matrix}>
              {([["standard", R.coverageMatrix.standard], ["major", R.coverageMatrix.major], ["excluded", R.coverageMatrix.excluded]] as const).map(([k, m]) => (
                <details key={k} className="rounded-xl border border-white/15 px-3 py-2" open={k === "standard"}>
                  <summary className={`cursor-pointer text-[13px] font-semibold ${FOCUS}`}>{m.title} <span className="font-normal opacity-75">· {m.subtitle}</span></summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5">{m.services.map((x) => <li key={x}>{x}</li>)}</ul>
                  <p className="mt-2 text-xs opacity-80">{m.note}</p>
                </details>
              ))}
            </Drawer>
          )}
          {oc === "insurance" && !!insurers?.length && (
            <Drawer title={U.insurers}><p>{insurers.join(" · ")}</p></Drawer>
          )}
        </div>
      )}
    </div>
  );

  /* ----- assembly ----- */
  const linkCls = `inline-flex min-h-11 items-center gap-1.5 font-semibold underline decoration-[var(--a)] decoration-2 underline-offset-4 hover:decoration-[var(--ink)] ${FOCUS}`;
  const frontDesk = (phone || email) && (
    <p className="mt-auto rounded-xl border border-[var(--line)] border-l-[3px] border-l-[var(--a)] bg-[var(--paper)] px-4 py-3 text-sm leading-relaxed">
      <span className="block font-semibold">{L.skipPrompt}</span>
      {phoneHref && <a href={phoneHref} className={linkCls}><Phone className="size-3.5" aria-hidden />{L.skipCall}</a>}
      {phoneHref && email ? L.skipOr : ""}
      {email && <a href={`mailto:${email}`} className={linkCls}><Mail className="size-3.5" aria-hidden />{phone ? L.skipMail : L.skipMail[0].toUpperCase() + L.skipMail.slice(1)}</a>}
      {phone && !email ? L.skipTailCall : L.skipTail}
    </p>
  );
  const anyAnswer = !!(a.ins || a.inc || a.filed || a.appt);

  return (
    <section aria-label={U.label} style={themeVars(theme, stickyTop)}
      className={`@container mx-auto w-full max-w-4xl overflow-clip rounded-[var(--r)] border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xl ${className}`}>
      <div role="status" className="sr-only">{announce}</div>

      <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-6 py-3">
        <p className="min-w-0 truncate text-xs font-semibold tracking-wide">{HEADER[lang]}{clinicName ? ` · ${clinicName}` : ""}</p>
        <ShieldCheck className="size-4 shrink-0 opacity-60" aria-hidden />
      </header>

      {/* narrow: the running figure stays pinned once the assessment is complete */}
      {complete && oc !== "insurance" && hasFees && (
        <div className="sticky top-[var(--stick)] z-20 h-0 @2xl:hidden">
          <div aria-hidden={figSeen} className={`absolute inset-x-0 top-0 flex items-baseline justify-between gap-3 border-b border-[var(--line)] bg-[var(--paper)] px-6 py-2.5 shadow-sm transition duration-200 ${figSeen ? "pointer-events-none -translate-y-2 opacity-0" : ""}`}>
            <span className="text-[13px] font-semibold">{U.share}</span>
            {shown === null ? <span className="text-xs opacity-70">{est?.bad ? U.unavailable : U.pickVisit}</span> : <Money value={shown} lang={lang} className="font-[family-name:var(--cw-display,var(--cdcp-display,inherit))] text-3xl font-extrabold leading-none tracking-tight" />}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 @2xl:grid-cols-12">
        <div className={`flex flex-col px-6 py-6 @2xl:col-span-7 @2xl:p-8 ${complete ? "order-2 @2xl:order-none bg-[var(--tint)] @2xl:bg-[var(--paper)]" : ""}`}>
          <AnimatePresence mode="wait" initial={false}>{stagePane}</AnimatePresence>
          {anyAnswer && (
            <button type="button" onClick={clear} className={`mt-6 inline-flex w-fit min-h-11 items-center text-[13px] font-semibold underline underline-offset-4 opacity-80 hover:opacity-100 ${FOCUS}`}>{U.clear}</button>
          )}
          {frontDesk}
        </div>
        <div className={`@2xl:col-span-5 ${complete ? "order-1 @2xl:order-none" : ""}`}>{panel}</div>
      </div>

      {/* sticky dock: share, total and the booking action stay reachable without scrolling back up */}
      {dockOn && !actSeen && est && (
        <div role="region" aria-label={`${U.share} / ${U.total}`}
          className="sticky bottom-0 z-30 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/15 bg-[var(--panel)] px-6 py-3 text-[var(--onpanel)]">
          <p className="flex flex-col text-xs"><span className="opacity-85">{U.share}</span><b className="text-lg font-semibold tabular-nums">{plain(est.patient, lang)}</b></p>
          <p className="flex flex-col border-l border-white/30 pl-5 text-xs"><span className="opacity-85">{U.total}</span><b className="text-lg font-semibold tabular-nums">{plain(est.fee, lang)}</b></p>
          <a href={dockHref} className={`ml-auto inline-flex min-h-11 flex-1 basis-48 items-center justify-center gap-2 rounded-xl bg-[var(--onpanel)] px-4 text-[13px] font-semibold text-[var(--panel)] hover:opacity-90 sm:max-w-xs ${FOCUS}`}>
            {dockLabel}<ChevronRight className="size-4" aria-hidden />
          </a>
        </div>
      )}
    </section>
  );
}

export default EmbeddableDentalCalculator;
