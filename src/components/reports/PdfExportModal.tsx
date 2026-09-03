import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { exportComprehensiveDossierPDF, type ComprehensivePdfOptions } from '../../services/export';
import type {
  VaultMeta,
  Transaction,
  Category,
  Account,
  Asset,
  Liability,
  PlannedExpense,
  PeopleLedgerEntry,
} from '../../types';
import {
  FileText,
  Download,
  CheckSquare,
  Square,
  Shield,
  Layers,
  PieChart,
  Activity,
  List,
  CalendarClock,
  Sparkles,
} from 'lucide-react';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: VaultMeta;
  periodLabel: string;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  assets: Asset[];
  liabilities: Liability[];
  plannedExpenses: PlannedExpense[];
  peopleLedger: PeopleLedgerEntry[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    savingsRate: number;
    netWorth?: number;
  };
  ratios?: Array<{ name: string; value: string; status: string; benchmark: string }>;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  vault,
  periodLabel,
  transactions,
  categories,
  accounts,
  assets,
  liabilities,
  plannedExpenses,
  peopleLedger,
  summary,
  ratios,
}) => {
  const [options, setOptions] = useState<ComprehensivePdfOptions>({
    includeSummary: true,
    includeBalanceSheet: true,
    includeCategories: true,
    includeRatios: true,
    includeLedger: true,
    includePlanned: true,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const toggleOption = (key: keyof ComprehensivePdfOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () => {
    setOptions({
      includeSummary: true,
      includeBalanceSheet: true,
      includeCategories: true,
      includeRatios: true,
      includeLedger: true,
      includePlanned: true,
    });
  };

  const clearAll = () => {
    setOptions({
      includeSummary: false,
      includeBalanceSheet: false,
      includeCategories: false,
      includeRatios: false,
      includeLedger: false,
      includePlanned: false,
    });
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      exportComprehensiveDossierPDF({
        vault,
        periodLabel,
        transactions,
        categories,
        summary: {
          ...summary,
          netWorth: summary.netWorth ?? 0,
        },
        accounts,
        assets,
        liabilities,
        plannedExpenses,
        peopleLedger,
        ratios,
        options,
      });
      onClose();
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Could not generate PDF dossier. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const sectionsList: Array<{
    key: keyof ComprehensivePdfOptions;
    title: string;
    desc: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      key: 'includeSummary',
      title: 'Executive Financial Summary',
      desc: 'Income, outlays, net savings, savings rate, and period overview',
      icon: <FileText className="w-4 h-4 text-pine-600" />,
    },
    {
      key: 'includeBalanceSheet',
      title: 'Balance Sheet: True Net Worth',
      desc: 'Liquid bank balances, custodial offsets, physical assets & institutional loans',
      icon: <Layers className="w-4 h-4 text-pine-600" />,
      badge: 'Assets & Debt',
    },
    {
      key: 'includeCategories',
      title: 'Categorical Outflow Distribution',
      desc: 'Top expense categories, percentage share, and total outflow ranking',
      icon: <PieChart className="w-4 h-4 text-mari-600" />,
    },
    {
      key: 'includeRatios',
      title: '16 Financial Health Diagnostic Ratios',
      desc: 'Full matrix of liquidity, debt, savings, and solvency ratios with benchmarks',
      icon: <Activity className="w-4 h-4 text-pine-600" />,
      badge: 'Advanced',
    },
    {
      key: 'includePlanned',
      title: 'Upcoming Bills & Scheduled Commitments',
      desc: 'Upcoming loan EMIs, rent, subscriptions, and planned allocations',
      icon: <CalendarClock className="w-4 h-4 text-mari-600" />,
    },
    {
      key: 'includeLedger',
      title: 'Full Transactions Ledger',
      desc: 'Chronological transaction history with accounts, categories, and narration notes',
      icon: <List className="w-4 h-4 text-ink/60" />,
    },
  ];

  const selectedCount = Object.values(options).filter(Boolean).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-pine-50 dark:bg-pine-950/40 text-pine-600 border border-pine-200/60 dark:border-pine-800/40">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold text-ink">
              Export Comprehensive Financial Dossier PDF
            </span>
            <span className="block text-xs text-ink/50">
              Select specific sections to include in your executive PDF report
            </span>
          </div>
        </div>
      }
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Quick Bulk Select Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-line text-xs">
          <span className="font-semibold text-ink/70">
            {selectedCount} of {sectionsList.length} sections selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-pine-600 hover:text-pine-700 font-bold cursor-pointer"
            >
              Select All
            </button>
            <span className="text-line">•</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-ink/45 hover:text-ink font-semibold cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Checkbox Options List */}
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
          {sectionsList.map((sec) => {
            const isChecked = options[sec.key];
            return (
              <div
                key={sec.key}
                onClick={() => toggleOption(sec.key)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  isChecked
                    ? 'border-pine-400 bg-pine-50/50 dark:bg-pine-950/30'
                    : 'border-line bg-moss/30 hover:bg-moss/60 opacity-60'
                }`}
              >
                <button
                  type="button"
                  className="mt-0.5 text-pine-700 dark:text-pine-400 cursor-pointer"
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-pine-600" />
                  ) : (
                    <Square className="w-4 h-4 text-ink/30" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                      {sec.icon}
                      {sec.title}
                    </span>
                    {sec.badge && (
                      <Badge tone={isChecked ? 'pine' : 'gray'}>{sec.badge}</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-ink/60 mt-0.5 leading-snug">
                    {sec.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Notice */}
        <div className="p-3 rounded-xl bg-moss/50 border border-line flex items-center gap-2 text-[11px] text-ink/60">
          <Shield className="w-4 h-4 text-pine-600 shrink-0" />
          <span>
            Generated 100% offline in your browser. No telemetry or financial data leaves your computer.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            disabled={selectedCount === 0 || isGenerating}
            isLoading={isGenerating}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate & Download Dossier</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
