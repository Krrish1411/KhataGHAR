import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import { usePrivacy } from '../context/PrivacyContext';
import { Button } from '../components/common/Button';
import { Select } from '../components/common/Select';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import {
  parseCSV,
  guessColumnMappings,
  processStatementRows,
  parseIndianUpiSMS,
  type ColumnMapping,
  type StagedTransaction,
  type ParsedSMSResult,
} from '../services/parser';
import { formatCurrency } from '../utils/formatters';
import { formatReadableDate } from '../utils/dates';
import type { Account } from '../types';
import {
  FileSpreadsheet,
  MessageSquare,
  Upload,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export const ImportView: React.FC = () => {
  const { accounts, transactions, bulkAddTransactions, activeVault } = useVault();
  const { isPrivacyMode } = usePrivacy();

  const [activeTab, setActiveTab] = useState<'statement' | 'sms'>('statement');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts.length > 0 ? accounts[0].id : '');

  // Statement CSV State
  const [csvFileName, setCsvFileName] = useState('');
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ dateCol: 0, descCol: 1 });
  const [stagedTxs, setStagedTxs] = useState<StagedTransaction[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping' | 'review'>('upload');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState('');

  // SMS Import State
  const [smsRawText, setSmsRawText] = useState('');
  const [parsedSMSList, setParsedSMSList] = useState<ParsedSMSResult[]>([]);
  const [smsAccountId, setSmsAccountId] = useState(accounts.length > 0 ? accounts[0].id : '');
  const [selectedSMSIndices, setSelectedSMSIndices] = useState<Set<number>>(new Set());

  const baseCurrency = activeVault?.currency || 'INR';
  const numberFormat = activeVault?.numberFormat || 'indian';

  // Handle CSV File Upload
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        setCsvRows(parsed);
        const headers = parsed[0];
        const guessed = guessColumnMappings(headers);
        setMapping(guessed);
        setStep('mapping');
      }
    };
    reader.readAsText(file);
  };

  // Move from Mapping to Review
  const handleProceedToReview = () => {
    const staged = processStatementRows(csvRows, mapping, transactions, baseCurrency);
    setStagedTxs(staged);
    setStep('review');
  };

  // Toggle single transaction selection
  const toggleStagedSelection = (id: string) => {
    setStagedTxs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  // Toggle all transactions
  const toggleSelectAllStaged = (selectAll: boolean) => {
    setStagedTxs((prev) => prev.map((t) => ({ ...t, selected: selectAll })));
  };

  // Commit Staged Transactions to Vault
  const handleCommitStatement = async () => {
    if (!selectedAccountId) {
      alert('Please choose an account to assign these transactions to.');
      return;
    }

    const toImport = stagedTxs.filter((t) => t.selected);
    if (toImport.length === 0) {
      alert('No transactions selected for import.');
      return;
    }

    setIsImporting(true);
    try {
      const formattedForVault = toImport.map((t) => ({
        vaultId: activeVault?.id || '',
        accountId: selectedAccountId,
        type: t.type,
        amount: t.amount,
        currency: t.currency || baseCurrency,
        date: t.date,
        note: t.description,
        tags: ['statement-import'],
        isRecurring: false,
      }));

      await bulkAddTransactions(formattedForVault);

      setImportSuccessMessage(`Successfully imported ${formattedForVault.length} transactions into account!`);
      setStep('upload');
      setCsvRows([]);
      setStagedTxs([]);
      setCsvFileName('');
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Parse SMS text block
  const handleParseSMS = () => {
    if (!smsRawText.trim()) return;
    const results = parseIndianUpiSMS(smsRawText);
    setParsedSMSList(results);
    setSelectedSMSIndices(new Set(results.map((_, i) => i)));
  };

  // Commit Parsed SMS
  const handleCommitSMS = async () => {
    if (!smsAccountId) {
      alert('Please select an account.');
      return;
    }

    const selectedSMS = parsedSMSList.filter((_, i) => selectedSMSIndices.has(i));
    if (selectedSMS.length === 0) {
      alert('No SMS selected.');
      return;
    }

    setIsImporting(true);
    try {
      const formatted = selectedSMS.map((s) => ({
        vaultId: activeVault?.id || '',
        accountId: smsAccountId,
        type: s.type,
        amount: s.amount,
        currency: baseCurrency,
        date: s.date,
        note: s.merchant ? `${s.merchant} (Ref: ${s.refNumber || ''})` : s.rawText.slice(0, 40),
        tags: ['sms-import', 'upi'],
        isRecurring: false,
      }));

      await bulkAddTransactions(formatted);

      setImportSuccessMessage(`Imported ${formatted.length} SMS transactions!`);
      setSmsRawText('');
      setParsedSMSList([]);
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-1 sm:px-2 pb-16 anim-fade">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
          <FileSpreadsheet className="w-4 h-4" />
        </span>
        <div>
          <h1 className="font-display font-extrabold text-[22px] sm:text-[24px] tracking-tight text-ink">
            Import Bank Statements & SMS
          </h1>
          <p className="text-xs text-ink/50 mt-0.5">
            Ingest raw bank statement CSVs and pasted Indian UPI transactional SMS alerts in 100% offline memory
          </p>
        </div>
      </div>

      {importSuccessMessage && (
        <div className="p-3.5 rounded-2xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 text-pine-800 dark:text-pine-200 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-pine-600 flex-shrink-0" />
          <span>{importSuccessMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-moss/80 rounded-xl max-w-sm border border-line">
        <button
          onClick={() => setActiveTab('statement')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'statement'
              ? 'bg-card text-ink font-bold shadow-xs border border-line'
              : 'text-ink/60 hover:text-ink'
          }`}
        >
          Bank CSV Statement
        </button>

        <button
          onClick={() => setActiveTab('sms')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'sms'
              ? 'bg-card text-ink font-bold shadow-xs border border-line'
              : 'text-ink/60 hover:text-ink'
          }`}
        >
          UPI SMS Parser
        </button>
      </div>

      {/* TAB 1: Statement CSV */}
      {activeTab === 'statement' && (
        <div className="space-y-4">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="rounded-2xl border border-line bg-card text-center p-8 space-y-4 shadow-sm lift">
              <div className="max-w-md mx-auto space-y-2">
                <label className="border-2 border-dashed border-line hover:border-pine-300 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-moss/40">
                  <Upload className="w-10 h-10 text-pine-600 mb-2" />
                  <span className="font-display font-bold text-sm text-ink">
                    Select Bank Statement CSV
                  </span>
                  <span className="text-xs text-ink/50 mt-1">
                    Drag and drop or click to browse CSV from your device
                  </span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                  <div className="mt-3">
                    <span className="text-[11px] text-ink/45">
                      Supports HDFC, SBI, ICICI, Axis, Kotak & any custom CSV format
                    </span>
                  </div>
                </label>
              </div>

              <div className="text-left bg-moss/70 p-4 rounded-2xl text-xs text-ink/65 space-y-1 max-w-xl mx-auto border border-line">
                <div className="flex items-center gap-1.5 font-bold text-ink">
                  <ShieldCheck className="w-4 h-4 text-pine-600" />
                  <span>Zero-Cloud Processing Guarantee</span>
                </div>
                <p className="leading-relaxed">
                  Khata Ghar processes and maps your CSV rows purely in your browser's local memory. No data ever leaves your device.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Column Mapping */}
          {step === 'mapping' && csvRows.length > 0 && (
            <div className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-5 shadow-sm lift">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div>
                  <h3 className="font-display font-bold text-sm text-ink">
                    Map Columns: {csvFileName}
                  </h3>
                  <p className="text-xs text-ink/50 mt-0.5">
                    Confirm columns matching Date, Narration, Debit, and Credit.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                  Back
                </Button>
              </div>

              {/* Column Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select
                  label="Date Column"
                  value={String(mapping.dateCol)}
                  onChange={(e: any) => setMapping({ ...mapping, dateCol: parseInt(e.target.value, 10) })}
                  options={csvRows[0].map((h, i) => ({ value: String(i), label: `Col ${i}: ${h}` }))}
                />

                <Select
                  label="Description / Narration Column"
                  value={String(mapping.descCol)}
                  onChange={(e: any) => setMapping({ ...mapping, descCol: parseInt(e.target.value, 10) })}
                  options={csvRows[0].map((h, i) => ({ value: String(i), label: `Col ${i}: ${h}` }))}
                />

                <Select
                  label="Debit / Withdrawal Column"
                  value={mapping.debitCol !== undefined ? String(mapping.debitCol) : ''}
                  onChange={(e: any) =>
                    setMapping({
                      ...mapping,
                      debitCol: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  options={[
                    { value: '', label: 'None (Use single Amount column)' },
                    ...csvRows[0].map((h, i) => ({ value: String(i), label: `Col ${i}: ${h}` })),
                  ]}
                />

                <Select
                  label="Credit / Deposit Column"
                  value={mapping.creditCol !== undefined ? String(mapping.creditCol) : ''}
                  onChange={(e: any) =>
                    setMapping({
                      ...mapping,
                      creditCol: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  options={[
                    { value: '', label: 'None' },
                    ...csvRows[0].map((h, i) => ({ value: String(i), label: `Col ${i}: ${h}` })),
                  ]}
                />
              </div>

              {/* Destination Account Selection */}
              <div className="p-4 bg-moss/70 rounded-2xl border border-line">
                <Select
                  label="Assign Transactions to Account"
                  value={selectedAccountId}
                  onChange={(e: any) => setSelectedAccountId(e.target.value)}
                  options={accounts.map((a: Account) => ({
                    value: a.id,
                    label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
                  }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleProceedToReview}>
                  <span>Review Extracted Transactions</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Review & Commit */}
          {step === 'review' && (
            <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm lift">
              <div className="p-4 sm:px-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink">
                    Review Extracted Transactions ({stagedTxs.filter((t) => t.selected).length} of {stagedTxs.length} selected)
                  </h3>
                  <p className="text-[11px] text-ink/50 mt-0.5">
                    Duplicates are automatically detected against existing records.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSelectAllStaged(true)}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSelectAllStaged(false)}
                  >
                    Deselect All
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={isImporting}
                    onClick={handleCommitStatement}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    <span>Import Selected</span>
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96 custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-moss/70 border-b border-line text-ink/50 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-4 w-10">Select</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {stagedTxs.map((t) => (
                      <tr
                        key={t.id}
                        className={`hover:bg-moss/40 transition-colors ${
                          t.isDuplicate ? 'opacity-60 bg-mari-50/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          <input
                            type="checkbox"
                            checked={t.selected}
                            onChange={() => toggleStagedSelection(t.id)}
                            className="rounded text-pine-600 focus:ring-pine-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-4 font-mono whitespace-nowrap text-ink/60">
                          {formatReadableDate(t.date)}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-ink truncate max-w-xs">
                          {t.description}
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge tone={t.type === 'income' ? 'pine' : 'flare'} size="xs">
                            {t.type}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold tabular-nums font-mono num whitespace-nowrap text-ink">
                          {formatCurrency(t.amount, baseCurrency, numberFormat, isPrivacyMode)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {t.isDuplicate ? (
                            <Badge tone="mari" size="xs">
                              Duplicate
                            </Badge>
                          ) : (
                            <Badge tone="pine" size="xs">
                              New
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UPI SMS Parser */}
      {activeTab === 'sms' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-4 shadow-sm lift">
            <div className="space-y-1">
              <h3 className="font-display font-bold text-sm text-ink flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-pine-600" />
                <span>Paste SMS Notification Texts</span>
              </h3>
              <p className="text-xs text-ink/50">
                Paste bank SMS alerts (e.g. HDFC, ICICI, SBI, Google Pay, PhonePe, Paytm). The regex engine will extract amounts, merchants, UPI refs, and dates.
              </p>
            </div>

            <textarea
              rows={5}
              placeholder={`Example:\nRs 450.00 spent on your HDFC Bank Card ending 1234 on 02-SEP at SWIGGY. Bal: Rs 12000.\n\nSent Rs. 150.00 from Kotak Bank to rahul@upi on 02-09-2026. Ref 928374829.`}
              value={smsRawText}
              onChange={(e) => setSmsRawText(e.target.value)}
              className="w-full rounded-2xl border border-line bg-moss/40 text-ink p-3.5 text-xs font-mono focus:border-pine-400 focus:ring-2 focus:ring-pine-500/20 transition-colors"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="w-full sm:w-72">
                <Select
                  value={smsAccountId}
                  onChange={(e: any) => setSmsAccountId(e.target.value)}
                  options={accounts.map((a: Account) => ({
                    value: a.id,
                    label: `Deposit into: ${a.name}`,
                  }))}
                />
              </div>

              <button
                onClick={handleParseSMS}
                className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm shadow-pine-900/20 flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Extract Transactions</span>
              </button>
            </div>
          </div>

          {/* Parsed SMS Results */}
          {parsedSMSList.length > 0 && (
            <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm lift">
              <div className="p-4 sm:px-5 border-b border-line flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink">
                    Extracted {parsedSMSList.length} Transactions
                  </h3>
                </div>

                <button
                  onClick={handleCommitSMS}
                  className="px-4 py-2 rounded-xl bg-pine-700 hover:bg-pine-600 active:scale-[0.97] text-white text-xs font-bold shadow-sm shadow-pine-900/20 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save {selectedSMSIndices.size} Transactions</span>
                </button>
              </div>

              <div className="divide-y divide-line/60">
                {parsedSMSList.map((sms, idx) => (
                  <div key={idx} className="p-3.5 px-4 sm:px-5 flex items-center justify-between gap-3 text-xs hover:bg-moss/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedSMSIndices.has(idx)}
                        onChange={() => {
                          const next = new Set(selectedSMSIndices);
                          if (next.has(idx)) next.delete(idx);
                          else next.add(idx);
                          setSelectedSMSIndices(next);
                        }}
                        className="rounded text-pine-600 focus:ring-pine-500 w-4 h-4 cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-ink flex items-center gap-2">
                          <span>{sms.merchant || 'Extracted Transaction'}</span>
                          <Badge tone={sms.type === 'income' ? 'pine' : 'flare'} size="xs">
                            {sms.type}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-ink/45 block mt-0.5">
                          {formatReadableDate(sms.date)} • Ref: {sms.refNumber || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`font-bold tabular-nums font-mono num ${
                        sms.type === 'expense' ? 'text-flare-600' : 'text-pine-700 dark:text-pine-400'
                      }`}
                    >
                      {sms.type === 'expense' ? '-' : '+'}
                      {formatCurrency(sms.amount, baseCurrency, numberFormat, isPrivacyMode)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
