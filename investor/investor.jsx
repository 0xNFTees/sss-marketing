import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  Building2,
  Users,
  Receipt,
  Layers,
  Wifi,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  Crown,
  Briefcase,
  Activity,
  Target,
  Lock,
  Zap,
  Stethoscope,
  Smile,
  CircuitBoard,
  Cpu,
  DollarSign,
  CalendarClock,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────
//  MODEL — Strict adherence to brief
// ─────────────────────────────────────────────────────────────────────
const CONFIG = {
  startClinics: 3,
  targetClinics: 100,
  horizonMonths: 24,
  networkSize: 500, // 123Dentist reference; 20% target = 100
  // Revenue
  mgmtFee: 449,
  mgmtCost: 149,
  setupFee: 499,
  setupCost: 320, // 300 white-label + 20 NFC
  lpFee: 999,
  lpCost: 750,
  // Friction
  stripe: 0.03,
  corpTax: 0.13, // Canadian
  // Splits
  founderShare: 0.85,
  partnerShare: 0.15,
  // OpEx
  swBase: 400,
  swMax: 1800,
  laborMax: 3000,
  laborThreshold: 50,
  // Capital
  injection: 30000,
};

// Per-transaction net (post-Stripe, pre-tax)
const SETUP_NET = CONFIG.setupFee - CONFIG.setupCost - CONFIG.setupFee * CONFIG.stripe; // 164.03
const LP_NET = CONFIG.lpFee - CONFIG.lpCost - CONFIG.lpFee * CONFIG.stripe; // 219.03
const RECURRING_GROSS = CONFIG.mgmtFee - CONFIG.mgmtCost; // 300
const RECURRING_NET = RECURRING_GROSS - CONFIG.mgmtFee * CONFIG.stripe; // 286.53
const RECURRING_MARGIN = RECURRING_GROSS / CONFIG.mgmtFee; // 0.668

// Linear clinic growth 3 → 100 across 24 months
function clinicsAt(month) {
  const t = (month - 1) / (CONFIG.horizonMonths - 1);
  return CONFIG.startClinics + (CONFIG.targetClinics - CONFIG.startClinics) * t;
}

function monthMetrics(month) {
  const clinics = clinicsAt(month);
  const prevClinics = month === 1 ? CONFIG.startClinics : clinicsAt(month - 1);
  const newClinics = Math.max(0, clinics - prevClinics);

  const recurringProfit = clinics * RECURRING_NET;
  const setupProfit = newClinics * SETUP_NET;
  // LP refresh: 1 per clinic per year on average
  const lpProfit = (clinics * LP_NET) / 12;

  const grossProfit = recurringProfit + setupProfit + lpProfit;

  const software =
    CONFIG.swBase +
    (CONFIG.swMax - CONFIG.swBase) *
      Math.max(0, clinics - CONFIG.startClinics) /
      (CONFIG.targetClinics - CONFIG.startClinics);
  const labor =
    clinics <= CONFIG.laborThreshold
      ? 0
      : CONFIG.laborMax *
        Math.min(1, (clinics - CONFIG.laborThreshold) / CONFIG.laborThreshold);
  const opex = software + labor;

  const ebt = grossProfit - opex;
  const tax = ebt > 0 ? ebt * CONFIG.corpTax : 0;
  const net = ebt - tax;

  return {
    month,
    clinics,
    newClinics,
    recurringProfit,
    setupProfit,
    lpProfit,
    grossProfit,
    software,
    labor,
    opex,
    ebt,
    tax,
    net,
    founder: net * CONFIG.founderShare,
    partner: net * CONFIG.partnerShare,
  };
}

// Precompute full 24-month series + cumulative partner dividend
const SERIES = Array.from({ length: CONFIG.horizonMonths }, (_, i) =>
  monthMetrics(i + 1)
);
let runningPartner = 0;
let runningVenture = 0;
const SERIES_WITH_CUM = SERIES.map((row) => {
  runningPartner += row.partner;
  runningVenture += row.net;
  return { ...row, cumPartner: runningPartner, cumVenture: runningVenture };
});

const PARTNER_PAYBACK_MONTH =
  SERIES_WITH_CUM.find((r) => r.cumPartner >= CONFIG.injection)?.month ?? null;
const VENTURE_BREAKEVEN_MONTH =
  SERIES_WITH_CUM.find((r) => r.cumVenture >= CONFIG.injection)?.month ?? null;
const FINAL = SERIES_WITH_CUM[CONFIG.horizonMonths - 1];

// ─────────────────────────────────────────────────────────────────────
//  FORMATTERS
// ─────────────────────────────────────────────────────────────────────
const fmtUSD = (v, opts = {}) =>
  v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    ...opts,
  });
const fmtUSDc = (v) =>
  v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
const fmtPct = (v, d = 1) =>
  `${(v * 100).toLocaleString("en-US", { maximumFractionDigits: d })}%`;
const fmtN = (v, d = 0) =>
  v.toLocaleString("en-US", { maximumFractionDigits: d });

// ─────────────────────────────────────────────────────────────────────
//  PRIMITIVES
// ─────────────────────────────────────────────────────────────────────
const Card = ({ children, className = "", glow = false }) => (
  <div
    className={`relative rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm ${
      glow ? "shadow-[0_0_40px_-12px_rgba(14,165,233,0.35)]" : ""
    } ${className}`}>
    {children}
  </div>
);

const SectionLabel = ({ children, num }) => (
  <div className="mb-6 flex items-center gap-3">
    <span className="font-mono text-[11px] tracking-[0.2em] text-sky-500/80">
      {num}
    </span>
    <span className="h-px flex-none w-8 bg-slate-700" />
    <span className="font-mono text-[11px] tracking-[0.25em] uppercase text-slate-400">
      {children}
    </span>
  </div>
);

const StatRow = ({ label, value, accent = "" }) => (
  <div className="flex items-baseline justify-between border-b border-slate-800/60 py-2.5 last:border-b-0">
    <span className="text-[11px] uppercase tracking-wider text-slate-500">{label}</span>
    <span className={`font-mono text-sm tabular-nums ${accent || "text-slate-200"}`}>{value}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────────────────────────────────────────
export default function SSSEquityDashboard() {
  const [month, setMonth] = useState(12);
  const m = SERIES_WITH_CUM[month - 1];

  // Inject Google Fonts once
  useEffect(() => {
    const id = "sss-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  // Reusable curve path generator
  const buildPath = (key, w = 600, h = 120) => {
    const max = Math.max(...SERIES_WITH_CUM.map((r) => r[key]));
    const min = Math.min(...SERIES_WITH_CUM.map((r) => r[key]));
    const range = max - min || 1;
    const pts = SERIES_WITH_CUM.map((r, i) => {
      const x = (i / (CONFIG.horizonMonths - 1)) * w;
      const y = h - ((r[key] - min) / range) * h;
      return [x, y];
    });
    const d = pts.map(([x, y], i) => (i === 0 ? `M ${x},${y}` : `L ${x},${y}`)).join(" ");
    const area = `${d} L ${w},${h} L 0,${h} Z`;
    return { d, area, pts };
  };

  return (
    <div
      className="min-h-screen w-full bg-slate-950 text-slate-200"
      style={{ fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif" }}>
      <style>{`
        .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        .grid-bg {
          background-image:
            linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .num-glow { text-shadow: 0 0 24px rgba(14,165,233,0.25); }
        .profit-glow { text-shadow: 0 0 24px rgba(16,185,129,0.3); }
        input[type=range].sss-slider {
          -webkit-appearance: none; appearance: none;
          background: transparent;
          width: 100%;
        }
        input[type=range].sss-slider::-webkit-slider-runnable-track {
          height: 4px;
          background: linear-gradient(90deg, #0ea5e9 0%, #0ea5e9 var(--val,50%), #1e293b var(--val,50%), #1e293b 100%);
          border-radius: 999px;
        }
        input[type=range].sss-slider::-moz-range-track { height: 4px; background: #1e293b; border-radius: 999px; }
        input[type=range].sss-slider::-moz-range-progress { height: 4px; background: #0ea5e9; border-radius: 999px; }
        input[type=range].sss-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 999px; background: #f8fafc; border: 3px solid #0ea5e9; margin-top: -9px; box-shadow: 0 0 0 6px rgba(14,165,233,0.15), 0 0 30px rgba(14,165,233,0.5); cursor: grab; transition: transform .15s ease;
        }
        input[type=range].sss-slider::-webkit-slider-thumb:active { transform: scale(1.1); cursor: grabbing; }
        input[type=range].sss-slider::-moz-range-thumb { width: 22px; height: 22px; border-radius: 999px; background: #f8fafc; border: 3px solid #0ea5e9; cursor: grab; }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════════════ */}
      <header className="relative border-b border-slate-800/80 grid-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-950/30 via-transparent to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          {/* Wordmark */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center font-bold text-white text-lg tracking-tighter shadow-[0_0_30px_-6px_rgba(14,165,233,0.6)]">S³</div>
            </div>
            <div className="leading-tight">
              <div className="font-bold tracking-tight text-slate-50 text-[15px]">SSS MARKETING</div>
              <div className="mono text-[10px] tracking-[0.2em] text-slate-500 uppercase">Capital Partners</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live Model</div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500">Confidential · Series Seed Memorandum</div>
            <div className="mono text-[11px] text-slate-400">Rev. 05.2026</div>
          </div>
        </div>

        {/* Hero strip */}
        <div className="relative mx-auto max-w-7xl px-6 pb-12 pt-8">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-sky-400/90 mb-4"><Briefcase className="w-3.5 h-3.5" />Partner Equity Dashboard</div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-50 leading-[1.05] max-w-4xl">A <span className="text-sky-400">$30,000</span> position in the <span className="italic text-slate-300">utility layer</span> of Canadian dental care.</h1>
*** End Patch