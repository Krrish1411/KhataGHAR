import React from 'react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import {
  ShieldCheck,
  Lock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export const SecurityPrivacyView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto px-1 sm:px-2 pb-20 anim-fade">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
          <ShieldCheck className="w-4 h-4" />
        </span>
        <div>
          <h1 className="font-display font-extrabold text-[22px] sm:text-[24px] tracking-tight text-ink">
            Security Architecture & Cryptography Spec
          </h1>
          <p className="text-xs text-ink/50 mt-0.5">
            Cryptographic guarantees, client-side isolation, and zero-knowledge boundaries
          </p>
        </div>
      </div>

      {/* Cryptographic Spec Card */}
      <div className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-4 shadow-sm lift">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display font-bold text-sm text-ink">
              Native Web Crypto API (Client-Side Only)
            </h2>
            <span className="text-xs text-ink/50">
              Zero Server Footprint • Zero Telemetry • 100% Offline Cryptography
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3.5 rounded-xl bg-moss/70 border border-line space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-ink/45 block tracking-wider">Key Derivation</span>
            <span className="font-mono font-bold text-ink block text-sm">PBKDF2-SHA256</span>
            <span className="text-[11px] text-ink/50 block">250,000 Iterations</span>
          </div>

          <div className="p-3.5 rounded-xl bg-moss/70 border border-line space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-ink/45 block tracking-wider">Encryption Standard</span>
            <span className="font-mono font-bold text-ink block text-sm">AES-256-GCM</span>
            <span className="text-[11px] text-ink/50 block">Random 12-byte IV per record</span>
          </div>

          <div className="p-3.5 rounded-xl bg-moss/70 border border-line space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-ink/45 block tracking-wider">Key Lifetime</span>
            <span className="font-mono font-bold text-ink block text-sm">Volatile JS State</span>
            <span className="text-[11px] text-ink/50 block">Wiped on lock or reload</span>
          </div>
        </div>
      </div>

      {/* Grid: What is Encrypted vs What is Not */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* What's Encrypted */}
        <div className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-3.5 shadow-sm lift">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-pine-600" />
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink">
              Encrypted at Rest in IndexedDB:
            </h3>
          </div>
          <ul className="text-xs text-ink/75 space-y-2.5 list-disc list-inside leading-relaxed">
            <li><b>Transaction amounts</b>, descriptions, notes, and dates.</li>
            <li><b>Account names</b>, balances, institution details, and account numbers.</li>
            <li><b>People Ledger entries</b> (who you lent to/borrowed from, amounts, interest rates).</li>
            <li><b>Budgets & Savings Goals</b> (target amounts, limits, progress).</li>
            <li><b>Planned Bills & Expenses</b> (rent, EMI schedules, SIP mandates).</li>
            <li><b>Asset & Liability records</b> (valuations, appreciation history, loan EMIs).</li>
            <li><b>Document Vault attachments</b> (PDF policies, scans, warranty receipts).</li>
            <li><b>Custom notes or tags</b> added throughout the app.</li>
          </ul>
        </div>

        {/* What's Not Sensitive */}
        <div className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-3.5 shadow-sm lift">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-sky-600" />
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink">
              Stored As-Is (Non-Sensitive Metadata):
            </h3>
          </div>
          <ul className="text-xs text-ink/75 space-y-2.5 list-disc list-inside leading-relaxed">
            <li><b>Random UUID record IDs</b> used internally as database keys (opaque strings).</li>
            <li><b>App preferences</b> like theme mode and number formatting.</li>
            <li><b>The vault name</b> shown in the header vault switcher.</li>
            <li><b>Cryptographic salt</b> (random 16 bytes for PBKDF2 key derivation).</li>
            <li><b>Password verifier blob</b> (a known token encrypted with your key to test password).</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
