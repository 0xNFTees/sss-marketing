/**
 * Calculation engine for the CDCP / RCSD calculator. Pure TypeScript, no React, no DOM.
 * A line-for-line port of the rules in cdcp-embed.js (the two must stay identical; see engine.parity.test.mjs).
 *
 *   Outcome:  ins=yes     -> private plan applies (no RCSD estimate)
 *             inc=over90  -> not eligible; cost is the full standard fee
 *             filed=no    -> must file first; cost shown for when the card is issued
 *             otherwise   -> eligible; cost = standard fee - RCSD amount
 *   Per line: covered = isCoveredByCDCP ? min(cdcpGridFee * tier%, acdqFee) : 0, rounded to the cent;
 *             you pay = acdqFee - covered. A fee that is missing, negative or not finite makes the estimate
 *             unavailable; it never produces a partial total.
 */
export type IncomeKey = "under70" | "band70" | "band80" | "over90";
export type YesNo = "yes" | "no";
export type VisitId = "new" | "recall" | "emerg" | "filling" | "major";
export type Step = "ins" | "inc" | "filed";

export interface Answers { ins: YesNo | null; inc: IncomeKey | null; filed: YesNo | null; appt: VisitId | null }
export const EMPTY_ANSWERS: Answers = { ins: null, inc: null, filed: null, appt: null };

export interface Procedure {
  code: string;
  acdqFee2026: number;
  cdcpGridFee2026: number;
  isCoveredByCDCP: boolean;
  preAuthRequired?: boolean;
  hasLabFee?: boolean;
}

export const INCOME_KEYS: readonly IncomeKey[] = ["under70", "band70", "band80", "over90"];
export const TIER_PCT: Record<IncomeKey, number> = { under70: 1, band70: 0.6, band80: 0.4, over90: 0 };
export const VISITS: readonly { id: VisitId; items: readonly (readonly [string, number])[] }[] = [
  { id: "new", items: [["01103", 1], ["02102", 1], ["11112", 1], ["12101", 1]] },
  { id: "recall", items: [["01202", 1], ["11112", 1]] },
  { id: "emerg", items: [["01205", 1], ["02102", 1]] },
  { id: "filling", items: [["23311", 1]] },
  { id: "major", items: [["51101", 1]] },
];

export type Outcome = "pending" | "insurance" | "income" | "tax" | "qualified" | "unconfirmed";

/** The questions that decide eligibility, in order. The visit type is not one of them. */
export function requiredSteps(a: Answers): Step[] {
  const r: Step[] = ["ins"];
  if (a.ins === "no") { r.push("inc"); if (a.inc !== "over90") r.push("filed"); }
  return r;
}
export function firstUnanswered(a: Answers): Step | null {
  for (const k of requiredSteps(a)) if (!a[k]) return k;
  return null;
}
export function outcome(a: Answers): Outcome {
  if (a.ins === "yes") return "insurance";
  if (a.ins !== "no" || !a.inc) return "pending";
  if (a.inc === "over90") return "income";
  if (a.filed === "no") return "tax";
  if (a.filed === "yes") return "qualified";
  return "unconfirmed";
}

export interface Estimate {
  visit: VisitId;
  bad: boolean;       // a needed fee is missing or invalid: show "estimate unavailable"
  fee: number; covered: number; patient: number;
  known: boolean;     // false while the income tier is unknown: covered is 0 and means "not yet known"
  tierPct: number | null;
  preAuth: boolean; lab: boolean; excluded: boolean;
}
const valid = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const cents = (n: number) => Math.round(n * 100) / 100;

export function estimate(a: Answers, byCode: ReadonlyMap<string, Procedure> | null): Estimate | null {
  const visit = VISITS.find((v) => v.id === a.appt);
  if (!visit || !byCode) return null;
  const known = a.ins === "no" && !!a.inc;
  const tp = known && a.inc ? TIER_PCT[a.inc] ?? 0 : null;
  let fee = 0, cov = 0, pre = false, lab = false, excl = false;
  for (const [code, qty] of visit.items) {
    const c = byCode.get(code);
    if (!c || !valid(c.acdqFee2026) || !valid(c.cdcpGridFee2026))
      return { visit: visit.id, bad: true, fee: 0, covered: 0, patient: 0, known, tierPct: tp, preAuth: false, lab: false, excluded: false };
    fee += c.acdqFee2026 * qty;
    const x = known && c.isCoveredByCDCP ? cents(Math.min(c.cdcpGridFee2026 * (tp ?? 0), c.acdqFee2026)) : 0;
    cov += x * qty;
    if (c.preAuthRequired) pre = true;
    if (c.hasLabFee) lab = true;
    if (!c.isCoveredByCDCP) excl = true;
  }
  fee = cents(fee); cov = cents(cov);
  return { visit: visit.id, bad: false, fee, covered: cov, patient: cents(fee - cov), known, tierPct: tp, preAuth: pre, lab, excluded: excl };
}

export const indexProcedures = (list: readonly Procedure[] | undefined) =>
  list ? new Map(list.map((p) => [p.code, p] as const)) : null;
