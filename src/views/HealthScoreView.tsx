import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { computeHealthScore } from '../services/ratios';
import { formatCurrency, formatCompactCurrency } from '../utils/formatters';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Award,
  Zap,
  TrendingUp,
  Compass,
  Sliders,
  Scale,
  ArrowRight,
} from 'lucide-react';

export const HealthScoreView: React.FC = () => {
  const { activeVault, accounts, transactions, categories, peopleLedger, budgets, assets, liabilities } =
    useVault();

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  const [simReduceSpend, setSimReduceSpend] = useState<number>(5000);
  const [simDebtPrepay, setSimDebtPrepay] = useState<number>(25000);
  const [simBufferBoost, setSimBufferBoost] = useState<number>(1);

  const health = useMemo(() => {
    return computeHealthScore({
      accounts,
      transactions,
      categories,
      peopleLedger,
      budgets,
      assets,
      liabilities,
    });
  }, [accounts, transactions, categories, peopleLedger, budgets, assets, liabilities]);

  const projectedScore = useMemo(() => {
    const boostFromSpend = (simReduceSpend / 5000) * 3.5;
    const boostFromDebt = (simDebtPrepay / 25000) * 3.5;
    const boostFromBuffer = simBufferBoost * 5;
    return Math.min(100, Math.round(health.score + boostFromSpend + boostFromDebt + boostFromBuffer));
  }, [health.score, simReduceSpend, simDebtPrepay, simBufferBoost]);

  const ratingColor =
    health.score >= 80
      ? 'text-pine-700 dark:text-pine-400'
      : health.score >= 60
      ? 'text-mari-600'
      : health.score >= 40
      ? 'text-mari-700'
      : 'text-flare-600';

  const ratingStroke =
    health.score >= 80
      ? '#12855a'
      : health.score >= 60
      ? '#d97706'
      : health.score >= 40
      ? '#b45309'
      : '#e05252';

  const strokeDash = useMemo(() => {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (health.score / 100) * circumference;
    return { circumference, offset };
  }, [health.score]);

  const dimensions = [
    {
      name: 'Savings Rate',
      weight: '30%',
      target: '30%+ of monthly income',
      score: health.savingsRateScore.score,
      advice: health.savingsRateScore.advice,
    },
    {
      name: 'Debt-to-Income Safety',
      weight: '25%',
      target: 'Under 30% of gross inflow',
      score: health.debtToIncomeScore.score,
      advice: health.debtToIncomeScore.advice,
    },
    {
      name: 'Emergency Buffer',
      weight: '20%',
      target: '6+ months liquid runway',
      score: health.emergencyFundScore.score,
      advice: health.emergencyFundScore.advice,
    },
    {
      name: 'Budget Discipline',
      weight: '15%',
      target: 'Spend within allocated budget caps',
      score: health.budgetAdherenceScore.score,
      advice: health.budgetAdherenceScore.advice,
    },
  ];

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto px-1 sm:px-2 pb-16 anim-fade">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
          <Activity className="w-4 h-4" />
        </span>
        <div>
          <h1 className="font-display font-extrabold text-[22px] sm:text-[24px] tracking-tight text-ink">
            Financial Health Score
          </h1>
          <p className="text-xs text-ink/50 mt-0.5">
            0–100 composite diagnostic rating based on savings, debt safety, liquid buffer, and budget discipline
          </p>
        </div>
      </div>

      {/* Main Score Hero Card */}
      <div className="rounded-2xl border border-line bg-card p-6 sm:p-7 space-y-6 shadow-sm lift">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Circular Score Visual with SVG Ring */}
          <div className="flex flex-col items-center text-center space-y-3 flex-shrink-0">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full score-ring" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  className="stroke-moss"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  stroke={ratingStroke}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={strokeDash.circumference}
                  strokeDashoffset={strokeDash.offset}
                  strokeLinecap="round"
                  className="score-ring-track transition-all duration-700"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-display font-black text-4xl num tracking-tight ${ratingColor}`}>
                  {health.score}
                </span>
                <span className="text-[10px] uppercase font-bold text-ink/45 tracking-wider">
                  out of 100
                </span>
              </div>
            </div>

            <Badge
              tone={health.score >= 75 ? 'pine' : health.score >= 50 ? 'mari' : 'flare'}
              icon={<Award className="w-3 h-3" />}
            >
              {health.rating} Grade
            </Badge>
          </div>

          {/* Diagnostic overview */}
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-pine-600" />
                <span>Diagnostic Assessment & Key Indicators</span>
              </h2>
              <p className="text-xs text-ink/50 mt-0.5">
                Evaluated against financial health standards for household resilience.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Strengths */}
              <div className="rounded-2xl p-4 bg-pine-50/50 dark:bg-pine-950/30 border border-pine-200/60 dark:border-pine-800/40 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-pine-700 dark:text-pine-400">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-pine-600" />
                  <span>Key Strengths</span>
                </div>
                <ul className="text-xs text-ink/75 space-y-1.5">
                  {health.keyStrengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-snug">
                      <span className="text-pine-600 font-bold mt-0.5">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div className="rounded-2xl p-4 bg-mari-50/50 dark:bg-mari-950/30 border border-mari-200/60 dark:border-mari-800/40 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-mari-700 dark:text-mari-400">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-mari-600" />
                  <span>Recommended Next Steps</span>
                </div>
                <ul className="text-xs text-ink/75 space-y-1.5">
                  {health.keyImprovements.map((imp, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-snug">
                      <span className="text-mari-600 font-bold mt-0.5">•</span>
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Score Sub-Breakdown Matrix */}
      <div className="space-y-3">
        <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 px-1">
          Diagnostic Breakdown by Dimension
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {dimensions.map((dim, idx) => {
            const scoreColor =
              dim.score >= 80
                ? 'text-pine-700 dark:text-pine-400'
                : dim.score >= 60
                ? 'text-mari-600'
                : 'text-flare-600';

            const barColor =
              dim.score >= 80 ? 'bg-pine-600' : dim.score >= 60 ? 'bg-mari-500' : 'bg-flare-500';

            return (
              <div
                key={idx}
                className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-3 shadow-sm lift flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-display font-bold text-sm text-ink">
                        {dim.name}
                      </h3>
                      <span className="text-[11px] text-ink/45 block mt-0.5">
                        Weight: {dim.weight} • {dim.target}
                      </span>
                    </div>
                    <span className={`font-display font-extrabold text-base num ${scoreColor}`}>
                      {dim.score} / 100
                    </span>
                  </div>

                  {/* Dimension score bar */}
                  <div className="w-full bg-moss h-2 rounded-full overflow-hidden mt-3">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                </div>

                <p className="text-xs text-ink/65 pt-2.5 border-t border-line/60 leading-relaxed">
                  {dim.advice}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive What-If Health Simulator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-mari-600" />
            <span>Interactive "What-If" Score Simulator</span>
          </h2>
          <Badge tone={projectedScore >= 80 ? 'pine' : projectedScore >= 60 ? 'mari' : 'flare'}>
            Projected: {projectedScore} / 100 ({projectedScore >= health.score ? `+${projectedScore - health.score}` : ''} pts)
          </Badge>
        </div>

        <div className="rounded-2xl border border-line bg-card p-5 space-y-5 shadow-sm lift">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-moss/50 border border-line">
            <div>
              <span className="text-xs font-bold text-ink block">
                Simulate Tactical Financial Decisions
              </span>
              <span className="text-[11.5px] text-ink/60 mt-0.5 block">
                Adjust the levers below to preview how spending cuts, debt prepayments, or emergency fund growth boost your score in real time.
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10.5px] uppercase font-bold text-ink/45 block">Current Score</span>
                <span className="font-display font-extrabold text-xl text-ink num">{health.score}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-pine-600" />
              <div className="text-left">
                <span className="text-[10.5px] uppercase font-bold text-pine-700 dark:text-pine-400 block">Projected Score</span>
                <span className="font-display font-extrabold text-2xl text-pine-700 dark:text-pine-400 num">{projectedScore}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Slider 1: Cut Discretionary Spend */}
            <div className="p-4 rounded-xl border border-line bg-card space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-ink">Trim Discretionary Outlays</span>
                <span className="font-bold text-pine-700 dark:text-pine-400 num">
                  +{formatCurrency(simReduceSpend, baseCurrency, numberFormat, false)}/mo
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30000}
                step={1000}
                value={simReduceSpend}
                onChange={(e) => setSimReduceSpend(Number(e.target.value))}
                className="w-full accent-pine-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink/40">
                <span>₹0</span>
                <span>₹15k</span>
                <span>₹30k/mo</span>
              </div>
              <span className="text-[10.5px] text-ink/50 block pt-1">
                Boosts Savings Rate score by ~{Math.round((simReduceSpend / 5000) * 3.5)} pts
              </span>
            </div>

            {/* Slider 2: Debt Prepayment */}
            <div className="p-4 rounded-xl border border-line bg-card space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-ink">Pre-pay Loan Balance</span>
                <span className="font-bold text-mari-700 dark:text-mari-400 num">
                  +{formatCurrency(simDebtPrepay, baseCurrency, numberFormat, false)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={200000}
                step={10000}
                value={simDebtPrepay}
                onChange={(e) => setSimDebtPrepay(Number(e.target.value))}
                className="w-full accent-mari-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink/40">
                <span>₹0</span>
                <span>₹1 Lakh</span>
                <span>₹2 Lakh</span>
              </div>
              <span className="text-[10.5px] text-ink/50 block pt-1">
                Shrinks DTI debt drag by ~{Math.round((simDebtPrepay / 25000) * 3.5)} pts
              </span>
            </div>

            {/* Slider 3: Buffer Expansion */}
            <div className="p-4 rounded-xl border border-line bg-card space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-ink">Add Liquid Buffer</span>
                <span className="font-bold text-skyx-600 dark:text-skyx-400 num">
                  +{simBufferBoost} {simBufferBoost === 1 ? 'Month' : 'Months'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={6}
                step={1}
                value={simBufferBoost}
                onChange={(e) => setSimBufferBoost(Number(e.target.value))}
                className="w-full accent-skyx-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-ink/40">
                <span>+0 mo</span>
                <span>+3 mos</span>
                <span>+6 mos</span>
              </div>
              <span className="text-[10.5px] text-ink/50 block pt-1">
                Fortifies Emergency Runway score by ~{simBufferBoost * 5} pts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Industry Financial Benchmarks Comparison */}
      <div className="space-y-3">
        <h2 className="font-display font-bold text-xs uppercase tracking-wider text-ink/75 px-1 flex items-center gap-1.5">
          <Scale className="w-4 h-4 text-pine-600" />
          <span>Golden Rule Financial Benchmarks</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Benchmark 1: 50/30/20 Rule */}
          <div className="rounded-2xl border border-line bg-card p-4 space-y-3 shadow-sm lift">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-ink block">50 / 30 / 20 Budget Rule</span>
                <span className="text-[11px] text-ink/50 mt-0.5 block">Needs ≤50% • Wants ≤30% • Savings ≥20%</span>
              </div>
              <Badge tone={health.savingsRateScore.score >= 70 ? 'pine' : 'mari'}>
                {health.savingsRateScore.score >= 70 ? 'Optimal' : 'Needs Tuning'}
              </Badge>
            </div>
            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between text-ink/70">
                <span>Your Savings Ratio:</span>
                <span className="font-bold text-ink num">
                  {Math.round(health.savingsRateScore.score * 0.4)}% of income
                </span>
              </div>
              <div className="h-1.5 w-full bg-moss rounded-full overflow-hidden">
                <div
                  className="h-full bg-pine-600 rounded-full"
                  style={{ width: `${Math.min(100, Math.round(health.savingsRateScore.score * 0.4) * 2.5)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Benchmark 2: 6-Month Emergency Runway */}
          <div className="rounded-2xl border border-line bg-card p-4 space-y-3 shadow-sm lift">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-ink block">6-Month Emergency Shield</span>
                <span className="text-[11px] text-ink/50 mt-0.5 block">Liquid survival cushion in accounts</span>
              </div>
              <Badge tone={health.emergencyFundScore.score >= 80 ? 'pine' : 'mari'}>
                {health.emergencyFundScore.score >= 80 ? 'Fortress' : 'Growing'}
              </Badge>
            </div>
            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between text-ink/70">
                <span>Emergency Cushion:</span>
                <span className="font-bold text-ink num">
                  {(health.emergencyFundScore.score / 16.6).toFixed(1)} / 6.0 Months
                </span>
              </div>
              <div className="h-1.5 w-full bg-moss rounded-full overflow-hidden">
                <div
                  className="h-full bg-skyx-600 rounded-full"
                  style={{ width: `${Math.min(100, health.emergencyFundScore.score)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Benchmark 3: 30% DTI Debt Ceiling */}
          <div className="rounded-2xl border border-line bg-card p-4 space-y-3 shadow-sm lift">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-ink block">30% Debt Ceiling (DTI)</span>
                <span className="text-[11px] text-ink/50 mt-0.5 block">Max total EMIs as % of income</span>
              </div>
              <Badge tone={health.debtToIncomeScore.score >= 75 ? 'pine' : 'flare'}>
                {health.debtToIncomeScore.score >= 75 ? 'Safe Debt' : 'Elevated'}
              </Badge>
            </div>
            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between text-ink/70">
                <span>Debt Safety Rating:</span>
                <span className="font-bold text-ink num">
                  {health.debtToIncomeScore.score} / 100
                </span>
              </div>
              <div className="h-1.5 w-full bg-moss rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${health.debtToIncomeScore.score >= 75 ? 'bg-pine-600' : 'bg-flare-500'}`}
                  style={{ width: `${Math.min(100, health.debtToIncomeScore.score)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
