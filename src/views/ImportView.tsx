import React, { useState, useMemo } from 'react';
import { useVault } from '../context/VaultContext';
import { usePrivacy } from '../context/PrivacyContext';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Select } from '../components/common/Select';
import { Badge } from '../components/common/Badge';
import { SearchableTargetPicker } from '../components/import/SearchableTargetPicker';
import {
  parseCSV,
  guessColumnMappings,
  detectHeaderRowIndex,
  processStatementRows,
  parseIndianUpiSMS,
  type ColumnMapping,
  type StagedTransaction,
  type StagedEntryType,
  type ParsedSMSResult,
} from '../services/parser';
import { formatCurrency } from '../utils/formatters';
import { formatReadableDate, isTxAfterBaseline } from '../utils/dates';
import type { Account, PeopleLedgerEntry } from '../types';
import {
  TrendingUp,
  Landmark,
  FileSpreadsheet,
  MessageSquare,
  Upload,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ArrowLeftRight,
  Users,
  Building2,
  Undo2,
  Split,
  AlertTriangle,
  CheckSquare,
  Square,
  Filter,
  Layers,
} from 'lucide-react';

export const ImportView: React.FC = () => {
  const {
    accounts,
    transactions,
    categories,
    peopleLedger,
    assets,
    liabilities,
    addTransaction,
    addPeopleEntry,
    addSettlement,
    addAsset,
    bulkAddTransactions,
    undoImport,
    activeVault,
  } = useVault();
  const { isPrivacyMode } = usePrivacy();

  const [activeTab, setActiveTab] = useState<'statement' | 'sms'>('statement');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts.length > 0 ? accounts[0].id : '');

  // Statement CSV State
  const [csvFileName, setCsvFileName] = useState('');
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
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

  // Last Import Batch tracking for 1-Click Rollback / Undo
  const [lastImportBatch, setLastImportBatch] = useState<{
    batchId: string;
    timestamp: string;
    count: number;
    accountName: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('khata_last_import_batch');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isUndoing, setIsUndoing] = useState(false);

  // Row Split Modal State
  const [splitTargetTx, setSplitTargetTx] = useState<StagedTransaction | null>(null);
  const [splitPart1Amount, setSplitPart1Amount] = useState('');
  const [splitPart1CatId, setSplitPart1CatId] = useState('');
  const [splitPart1Type, setSplitPart1Type] = useState<StagedEntryType>('expense');
  const [splitPart2CatId, setSplitPart2CatId] = useState('');
  const [splitPart2Type, setSplitPart2Type] = useState<StagedEntryType>('expense');

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
        const detectedIdx = detectHeaderRowIndex(parsed);
        setHeaderRowIndex(detectedIdx);
        const headers = parsed[detectedIdx] || parsed[0];
        const guessed = guessColumnMappings(headers);
        setMapping(guessed);
        setStep('mapping');
      }
    };
    reader.readAsText(file);
  };

  // Move from Mapping to Review
  const handleProceedToReview = () => {
    const staged = processStatementRows(csvRows, mapping, transactions, baseCurrency, headerRowIndex + 1);
    // Initialize default categories or transfer accounts
    const otherAccounts = accounts.filter((a) => a.id !== selectedAccountId);
    const defaultToAccount = otherAccounts.length > 0 ? otherAccounts[0].id : undefined;
    const initialContacts = Array.from(new Set(peopleLedger.map((p) => p.contactName.trim()))).filter(Boolean);

    const initialized = staged.map((t) => {
      const descLower = t.description.toLowerCase();
      let detectedType: StagedEntryType = t.type;
      let detectedAssetId: string | undefined = undefined;
      let detectedLiabilityId: string | undefined = undefined;
      let detectedToAccountId: string | undefined = undefined;
      let detectedContact: string | undefined = undefined;
      let catId: string | undefined = undefined;

      // Check Category guess first
      if (t.categoryGuess) {
        const found = categories.find((c) => c.name.toLowerCase() === t.categoryGuess?.toLowerCase());
        if (found) catId = found.id;
      }

      // 1. Smart Asset / SIP detection (Nippon, UTI, HDFC MF, Zerodha, Groww, Demat, etc.)
      const matchedAsset = assets.find((a) => descLower.includes(a.name.toLowerCase()));
      if (matchedAsset || descLower.includes('sip') || descLower.includes('mutual fund') || descLower.includes('zerodha') || descLower.includes('groww') || descLower.includes('cams') || descLower.includes('kfintech')) {
        detectedType = 'invest';
        detectedAssetId = matchedAsset ? matchedAsset.id : (assets.length > 0 ? assets[0].id : undefined);
      }
      // 2. Smart Loan / EMI detection (Home Loan, Auto Loan, Personal Loan, Bajaj, EMI)
      else if (descLower.includes('emi') || descLower.includes('loan') || liabilities.some((l) => descLower.includes(l.name.toLowerCase()))) {
        const matchedLiab = liabilities.find((l) => descLower.includes(l.name.toLowerCase()));
        detectedType = 'debt_payment';
        detectedLiabilityId = matchedLiab ? matchedLiab.id : (liabilities.length > 0 ? liabilities[0].id : undefined);
      }
      // 3. Smart Self-Transfer detection
      else if (otherAccounts.some((a) => descLower.includes(a.name.toLowerCase()))) {
        const matchedAcc = otherAccounts.find((a) => descLower.includes(a.name.toLowerCase()));
        detectedType = 'transfer';
        detectedToAccountId = matchedAcc?.id || defaultToAccount;
      }
      // 4. Smart People Ledger detection
      else if (initialContacts.some((c) => descLower.includes(c.toLowerCase()))) {
        const matchedContact = initialContacts.find((c) => descLower.includes(c.toLowerCase()));
        detectedType = t.type === 'income' ? 'borrowed' : 'lent';
        detectedContact = matchedContact;
      }

      return {
        ...t,
        type: detectedType,
        rawFlow: t.rawFlow || (detectedType === 'income' ? 'inflow' : 'outflow'),
        categoryId: catId,
        toAccountId: detectedToAccountId || defaultToAccount,
        linkedAssetId: detectedAssetId || (assets.length > 0 ? assets[0].id : undefined),
        linkedLiabilityId: detectedLiabilityId || (liabilities.length > 0 ? liabilities[0].id : undefined),
        contactName: detectedContact,
      };
    });

    setStagedTxs(initialized);
    setStep('review');
  };

  // Toggle single transaction selection
  const toggleStagedSelection = (id: string) => {
    setStagedTxs((prev) => prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t)));
  };

  // Toggle all transactions
  const toggleSelectAllStaged = (selectAll: boolean) => {
    setStagedTxs((prev) => prev.map((t) => ({ ...t, selected: selectAll })));
  };

  // Toggle inflow/outflow manually for a transaction
  const toggleStagedFlow = (id: string) => {
    setStagedTxs((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextFlow: 'inflow' | 'outflow' = t.rawFlow === 'inflow' ? 'outflow' : 'inflow';
        let nextType = t.type;
        if (t.type === 'income' && nextFlow === 'outflow') nextType = 'expense';
        else if (t.type === 'expense' && nextFlow === 'inflow') nextType = 'income';
        else if (t.type === 'borrowed' && nextFlow === 'outflow') nextType = 'borrowed_repaid';
        else if (t.type === 'borrowed_repaid' && nextFlow === 'inflow') nextType = 'borrowed';
        else if (t.type === 'lent' && nextFlow === 'inflow') nextType = 'lent_repaid';
        else if (t.type === 'lent_repaid' && nextFlow === 'outflow') nextType = 'lent';
        else if (t.type === 'holding' && nextFlow === 'outflow') nextType = 'holding_returned';
        else if (t.type === 'holding_returned' && nextFlow === 'inflow') nextType = 'holding';
        return {
          ...t,
          rawFlow: nextFlow,
          type: nextType,
        };
      })
    );
  };

  // Update staged transaction parameters
  const updateStagedType = (id: string, newType: StagedEntryType) => {
    setStagedTxs((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const otherAccs = accounts.filter((a) => a.id !== selectedAccountId);
        let nextFlow = t.rawFlow;
        if (['income', 'borrowed', 'holding', 'lent_repaid'].includes(newType)) nextFlow = 'inflow';
        else if (['expense', 'invest', 'debt_payment', 'lent', 'borrowed_repaid', 'holding_returned'].includes(newType)) nextFlow = 'outflow';
        // If transfer, keep previous nextFlow (so inflow stays incoming transfer, outflow stays outgoing transfer)

        const isPeople = ['lent', 'lent_repaid', 'borrowed', 'borrowed_repaid', 'holding', 'holding_returned'].includes(newType);

        return {
          ...t,
          type: newType,
          rawFlow: nextFlow,
          toAccountId: newType === 'transfer' ? (t.toAccountId || (otherAccs.length > 0 ? otherAccs[0].id : undefined)) : undefined,
          linkedAssetId: newType === 'invest' ? (t.linkedAssetId || (assets.length > 0 ? assets[0].id : undefined)) : undefined,
          linkedLiabilityId: newType === 'debt_payment' ? (t.linkedLiabilityId || (liabilities.length > 0 ? liabilities[0].id : undefined)) : undefined,
          contactName: isPeople ? (t.contactName || t.description.slice(0, 30)) : undefined,
        };
      })
    );
  };

  const updateStagedCategory = (id: string, categoryId: string) => {
    setStagedTxs((prev) => prev.map((t) => (t.id === id ? { ...t, categoryId } : t)));
  };

  const updateStagedToAccount = (id: string, toAccountId: string) => {
    setStagedTxs((prev) => prev.map((t) => (t.id === id ? { ...t, toAccountId } : t)));
  };

  const updateStagedContact = (id: string, contactName: string) => {
    setStagedTxs((prev) => prev.map((t) => (t.id === id ? { ...t, contactName } : t)));
  };

  const updateStagedAsset = (id: string, linkedAssetId: string) => {
    setStagedTxs((prev) => prev.map((t) => (t.id === id ? { ...t, linkedAssetId } : t)));
  };

  const updateStagedLiability = (id: string, linkedLiabilityId: string) => {
    setStagedTxs((prev) => prev.map((t) => (t.id === id ? { ...t, linkedLiabilityId } : t)));
  };

  // Batch actions on selected rows
  const handleBatchSetCategory = (catId: string) => {
    setStagedTxs((prev) =>
      prev.map((t) => (t.selected ? { ...t, categoryId: catId } : t))
    );
  };

  const handleBatchSetType = (newType: StagedEntryType) => {
    const otherAccs = accounts.filter((a) => a.id !== selectedAccountId);
    setStagedTxs((prev) =>
      prev.map((t) => {
        if (!t.selected) return t;
        let nextFlow = t.rawFlow;
        if (['income', 'borrowed', 'holding', 'lent_repaid'].includes(newType)) nextFlow = 'inflow';
        else if (['expense', 'invest', 'debt_payment', 'lent', 'borrowed_repaid', 'holding_returned'].includes(newType)) nextFlow = 'outflow';

        const isPeople = ['lent', 'lent_repaid', 'borrowed', 'borrowed_repaid', 'holding', 'holding_returned'].includes(newType);

        return {
          ...t,
          type: newType,
          rawFlow: nextFlow,
          toAccountId: newType === 'transfer' ? (t.toAccountId || (otherAccs.length > 0 ? otherAccs[0].id : undefined)) : undefined,
          linkedAssetId: newType === 'invest' ? (t.linkedAssetId || (assets.length > 0 ? assets[0].id : undefined)) : undefined,
          linkedLiabilityId: newType === 'debt_payment' ? (t.linkedLiabilityId || (liabilities.length > 0 ? liabilities[0].id : undefined)) : undefined,
          contactName: isPeople ? (t.contactName || t.description.slice(0, 30)) : undefined,
        };
      })
    );
  };

  const handleSkipDuplicates = () => {
    setStagedTxs((prev) =>
      prev.map((t) => (t.isDuplicate ? { ...t, selected: false } : t))
    );
  };

  const handleOpenSplitModal = (tx: StagedTransaction) => {
    setSplitTargetTx(tx);
    const half = Math.round((tx.amount / 2) * 100) / 100;
    setSplitPart1Amount(String(half));
    setSplitPart1CatId(tx.categoryId || '');
    setSplitPart1Type(tx.type);
    setSplitPart2CatId(tx.categoryId || '');
    setSplitPart2Type(tx.type);
  };

  const handleConfirmRowSplit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!splitTargetTx) return;
    const num1 = parseFloat(splitPart1Amount);
    if (isNaN(num1) || num1 <= 0 || num1 >= splitTargetTx.amount) {
      alert(`Please enter an amount between 0 and ${splitTargetTx.amount}`);
      return;
    }
    const num2 = Math.round((splitTargetTx.amount - num1) * 100) / 100;

    const part1: StagedTransaction = {
      ...splitTargetTx,
      id: `${splitTargetTx.id}_split1`,
      amount: num1,
      type: splitPart1Type,
      rawFlow: splitTargetTx.rawFlow,
      categoryId: splitPart1CatId || undefined,
      description: `${splitTargetTx.description} (Part 1)`,
      selected: true,
    };

    const part2: StagedTransaction = {
      ...splitTargetTx,
      id: `${splitTargetTx.id}_split2`,
      amount: num2,
      type: splitPart2Type,
      rawFlow: splitTargetTx.rawFlow,
      categoryId: splitPart2CatId || undefined,
      description: `${splitTargetTx.description} (Part 2)`,
      selected: true,
    };

    setStagedTxs((prev) => {
      const idx = prev.findIndex((t) => t.id === splitTargetTx.id);
      if (idx < 0) return prev;
      const next = [...prev];
      next.splice(idx, 1, part1, part2);
      return next;
    });

    setSplitTargetTx(null);
  };

  const handleUndoLastImport = async () => {
    if (!lastImportBatch) return;
    if (
      !window.confirm(
        `Undo last statement import of ${lastImportBatch.count} transactions for ${lastImportBatch.accountName}? Account balances and changes will be automatically restored.`
      )
    ) {
      return;
    }

    setIsUndoing(true);
    try {
      const removedCount = await undoImport(lastImportBatch.batchId);
      localStorage.removeItem('khata_last_import_batch');
      setLastImportBatch(null);
      setImportSuccessMessage(
        `Successfully reversed import! Removed ${removedCount} transactions and restored account balances.`
      );
    } catch (err: any) {
      alert(`Undo failed: ${err.message}`);
    } finally {
      setIsUndoing(false);
    }
  };

  // Commit Staged Transactions to Vault with Batch Tagging
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
    const batchId = `batch_${Date.now()}`;
    try {
      // 1. Regular Expenses and Incomes
      const regularTxs = toImport.filter((t) => t.type === 'expense' || t.type === 'income');
      if (regularTxs.length > 0) {
        const formatted = regularTxs.map((t) => ({
          vaultId: activeVault?.id || '',
          accountId: selectedAccountId,
          type: t.type as 'expense' | 'income',
          amount: t.amount,
          currency: t.currency || baseCurrency,
          date: t.date,
          note: t.description,
          categoryId: t.categoryId,
          tags: ['statement-import'],
          isRecurring: false,
          importBatchId: batchId,
        }));
        await bulkAddTransactions(formatted);
      }

      // 2. Self-Transfers (Bidirectional support)
      const transferTxs = toImport.filter((t) => t.type === 'transfer');
      for (const t of transferTxs) {
        const otherAccs = accounts.filter((a) => a.id !== selectedAccountId);
        const destination = t.toAccountId || (otherAccs.length > 0 ? otherAccs[0].id : undefined);
        if (destination) {
          // If rawFlow === 'inflow', funds were received into selectedAccountId from destination (source = destination, target = selectedAccountId)
          // If rawFlow === 'outflow', funds were sent from selectedAccountId to destination (source = selectedAccountId, target = destination)
          const sourceAccount = t.rawFlow === 'inflow' ? destination : selectedAccountId;
          const targetAccount = t.rawFlow === 'inflow' ? selectedAccountId : destination;

          await addTransaction({
            accountId: sourceAccount,
            toAccountId: targetAccount,
            type: 'transfer',
            amount: t.amount,
            currency: t.currency || baseCurrency,
            date: t.date,
            note: t.description,
            tags: [
              'statement-import',
              'self-transfer',
              t.rawFlow === 'inflow' ? 'incoming-transfer' : 'outgoing-transfer',
            ],
            isRecurring: false,
            importBatchId: batchId,
          });
        }
      }

      // 3. Asset & SIP Purchases
      const investTxs = toImport.filter((t) => t.type === 'invest');
      for (const t of investTxs) {
        let finalAssetId = t.linkedAssetId;

        // If user picked "+ Create Asset: ..." or typed a new asset name
        if (finalAssetId && finalAssetId.startsWith('new-asset:')) {
          const rawName = finalAssetId.replace('new-asset:', '').trim();
          const existing = assets.find((a) => a.name.toLowerCase() === rawName.toLowerCase());
          if (existing) {
            finalAssetId = existing.id;
          } else {
            const createdAsset = await addAsset({
              name: rawName,
              type: 'mutual_fund',
              currentValue: 0,
              purchasePrice: 0,
              currency: t.currency || baseCurrency,
              notes: `Auto-created from statement import: ${t.description}`,
              importBatchId: batchId,
            });
            finalAssetId = createdAsset.id;
          }
        } else if (!finalAssetId) {
          // If no asset was picked, auto-create one based on description
          const autoName = t.description.slice(0, 30).trim() || 'Imported Investment Asset';
          const existing = assets.find((a) => a.name.toLowerCase() === autoName.toLowerCase());
          if (existing) {
            finalAssetId = existing.id;
          } else {
            const createdAsset = await addAsset({
              name: autoName,
              type: 'mutual_fund',
              currentValue: 0,
              purchasePrice: 0,
              currency: t.currency || baseCurrency,
              notes: `Auto-created from statement import: ${t.description}`,
              importBatchId: batchId,
            });
            finalAssetId = createdAsset.id;
          }
        }

        await addTransaction({
          accountId: selectedAccountId,
          type: 'expense',
          amount: t.amount,
          currency: t.currency || baseCurrency,
          date: t.date,
          note: t.description,
          linkedAssetId: finalAssetId,
          tags: ['statement-import', 'sip-investment'],
          isRecurring: false,
          importBatchId: batchId,
        });
      }

      // 4. Loan EMIs & Debt Paydowns
      const debtTxs = toImport.filter((t) => t.type === 'debt_payment');
      for (const t of debtTxs) {
        await addTransaction({
          accountId: selectedAccountId,
          type: 'expense',
          amount: t.amount,
          currency: t.currency || baseCurrency,
          date: t.date,
          note: t.description,
          linkedLiabilityId: t.linkedLiabilityId || (liabilities.length > 0 ? liabilities[0].id : undefined),
          tags: ['statement-import', 'loan-emi'],
          isRecurring: false,
          importBatchId: batchId,
        });
      }

      // 5. People Ledger Entries (New Lent, Borrowed, Custodial Holding)
      const peopleNewTxs = toImport.filter((t) => ['lent', 'borrowed', 'holding'].includes(t.type));
      const newlyCreatedPeopleEntries: PeopleLedgerEntry[] = [];

      for (const t of peopleNewTxs) {
        const cName = t.contactName?.trim() || t.description.slice(0, 30);
        const created = await addPeopleEntry({
          contactName: cName,
          type: t.type as 'lent' | 'borrowed' | 'holding',
          amount: t.amount,
          currency: t.currency || baseCurrency,
          date: t.date,
          accountId: selectedAccountId,
          notes: `Imported from statement: ${t.description}`,
          importBatchId: batchId,
        });
        newlyCreatedPeopleEntries.push(created);
      }

      // 6. People Settlements & Returns (Lent Repaid, Borrowed Repaid, Holding Returned)
      const peopleSettlementTxs = toImport.filter((t) =>
        ['lent_repaid', 'borrowed_repaid', 'holding_returned'].includes(t.type)
      );

      for (const t of peopleSettlementTxs) {
        const cName = t.contactName?.trim() || t.description.slice(0, 30);
        const cNameLower = cName.toLowerCase();
        const targetType =
          t.type === 'lent_repaid' ? 'lent' : t.type === 'borrowed_repaid' ? 'borrowed' : 'holding';

        // Check if there is an open entry to settle (in this batch or in existing peopleLedger)
        let matchedEntry = newlyCreatedPeopleEntries.find(
          (e) =>
            (e.type === targetType || (targetType === 'holding' && e.type === 'lent') || (targetType === 'lent' && e.type === 'holding')) &&
            e.contactName.trim().toLowerCase() === cNameLower &&
            e.status !== 'closed'
        );

        if (!matchedEntry) {
          matchedEntry = peopleLedger.find(
            (e) =>
              (e.type === targetType || (targetType === 'holding' && e.type === 'lent') || (targetType === 'lent' && e.type === 'holding')) &&
              e.contactName.trim().toLowerCase() === cNameLower &&
              e.status !== 'closed'
          );
        }

        if (matchedEntry) {
          await addSettlement(matchedEntry.id, {
            amount: t.amount,
            date: t.date,
            accountId: selectedAccountId,
            note: `Statement settlement: ${t.description}`,
            importBatchId: batchId,
          });
          matchedEntry.settlements = [
            ...(matchedEntry.settlements || []),
            { id: 'import-settle', amount: t.amount, date: t.date, importBatchId: batchId },
          ];
          const totalSettled = matchedEntry.settlements.reduce((s, x) => s + x.amount, 0);
          if (totalSettled >= matchedEntry.amount) {
            matchedEntry.status = 'closed';
          }
        } else {
          // No open record exists to settle: create a closed record with this transaction
          const created = await addPeopleEntry({
            contactName: cName,
            type: targetType,
            amount: t.amount,
            currency: t.currency || baseCurrency,
            date: t.date,
            notes: `Settled on import: ${t.description}`,
            importBatchId: batchId,
          });
          await addSettlement(created.id, {
            amount: t.amount,
            date: t.date,
            accountId: selectedAccountId,
            note: `Statement settlement: ${t.description}`,
            importBatchId: batchId,
          });
        }
      }

      const summaryParts: string[] = [];
      if (regularTxs.length > 0) summaryParts.push(`${regularTxs.length} transactions`);
      if (transferTxs.length > 0) summaryParts.push(`${transferTxs.length} self-transfers`);
      if (investTxs.length > 0) summaryParts.push(`${investTxs.length} SIP/Asset tranches`);
      if (debtTxs.length > 0) summaryParts.push(`${debtTxs.length} loan EMIs`);
      if (peopleNewTxs.length > 0) summaryParts.push(`${peopleNewTxs.length} people loans/holdings`);
      if (peopleSettlementTxs.length > 0) summaryParts.push(`${peopleSettlementTxs.length} people repayments/returns`);

      const targetAcc = accounts.find((a) => a.id === selectedAccountId);
      const batchRecord = {
        batchId,
        timestamp: new Date().toISOString(),
        count: toImport.length,
        accountName: targetAcc?.name || 'Account',
      };
      localStorage.setItem('khata_last_import_batch', JSON.stringify(batchRecord));
      setLastImportBatch(batchRecord);

      setImportSuccessMessage(`Successfully imported ${summaryParts.join(', ')}! (Batch ID: ${batchId})`);
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
        note: s.merchant
          ? `${s.merchant}${s.refNumber ? ` (Ref: ${s.refNumber})` : ''}${s.bankName ? ` [${s.bankName}]` : ''}`
          : s.rawText.slice(0, 40),
        tags: ['sms-import', 'upi', ...(s.bankName ? [s.bankName.toLowerCase().replace(/\s+/g, '-')] : [])],
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

  const otherAccounts = accounts.filter((a) => a.id !== selectedAccountId);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const preBaselineTxs = useMemo(() => {
    if (!selectedAccount?.balanceAsOfDate) return [];
    return stagedTxs.filter((t) => t.selected && !isTxAfterBaseline(t.date, selectedAccount.balanceAsOfDate));
  }, [stagedTxs, selectedAccount?.balanceAsOfDate]);

  // Dynamically aggregate contacts from existing ledger AND any contacts typed in staged transactions
  const allAvailableContacts = useMemo(() => {
    const set = new Set<string>();
    peopleLedger.forEach((p) => {
      if (p.contactName?.trim()) set.add(p.contactName.trim());
    });
    stagedTxs.forEach((t) => {
      if (t.contactName?.trim()) set.add(t.contactName.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [peopleLedger, stagedTxs]);

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto px-1 sm:px-2 pb-16 anim-fade">
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

            {/* Last Import 1-Click Rollback Banner */}
      {lastImportBatch && (
        <div className="p-4 rounded-2xl bg-mari-50 dark:bg-mari-950/40 border border-mari-200 dark:border-mari-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-mari-100 dark:bg-mari-900/60 border border-mari-300 dark:border-mari-700 grid place-items-center text-mari-700 dark:text-mari-300 shrink-0">
              <Undo2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs text-ink">Recent Statement Import</span>
                <Badge tone="mari" size="xs">
                  {lastImportBatch.count} entries
                </Badge>
              </div>
              <p className="text-[11px] text-ink/60 mt-0.5">
                Imported for <span className="font-semibold text-ink">{lastImportBatch.accountName}</span> on{' '}
                {new Date(lastImportBatch.timestamp).toLocaleDateString()} at{' '}
                {new Date(lastImportBatch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              isLoading={isUndoing}
              onClick={handleUndoLastImport}
              className="text-xs border-mari-300 dark:border-mari-800 text-mari-800 dark:text-mari-300 hover:bg-mari-100 dark:hover:bg-mari-900/60"
            >
              <Undo2 className="w-3.5 h-3.5 mr-1" />
              <span>Undo Last Import</span>
            </Button>
          </div>
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
                      Supports SBI, HDFC, ICICI, Axis, Kotak, Navnirman Co-op & any bank CSV
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

          {/* STEP 2: Column Mapping & Header Row Auto-Detection */}
          {step === 'mapping' && csvRows.length > 0 && (
            <div className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-5 shadow-sm lift">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div>
                  <h3 className="font-display font-bold text-sm text-ink">
                    Map Columns: {csvFileName}
                  </h3>
                  <p className="text-xs text-ink/50 mt-0.5">
                    Confirm header row and columns matching Date, Particulars, Debit, and Credit.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                  Back
                </Button>
              </div>

              {/* Automatic Header Detection Alert & Row Selector */}
              <div className="p-3.5 rounded-2xl bg-mari-50 dark:bg-mari-950/40 border border-mari-200 dark:border-mari-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-mari-600 shrink-0" />
                  <span className="text-ink">
                    {headerRowIndex > 0 ? (
                      <>
                        <strong>Auto-detected Table Header at Row #{headerRowIndex + 1}</strong> ({headerRowIndex} preamble metadata rows skipped above)
                      </>
                    ) : (
                      <>
                        <strong>Table Header at Row #1</strong> (First row contains column headers)
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-ink/60 font-medium whitespace-nowrap">Header Row:</span>
                  <select
                    value={headerRowIndex}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value, 10);
                      setHeaderRowIndex(idx);
                      const newHeaders = csvRows[idx] || [];
                      setMapping(guessColumnMappings(newHeaders));
                    }}
                    className="px-2.5 py-1 rounded-xl bg-card border border-line text-ink font-semibold shadow-xs text-xs outline-none focus:border-pine-500 cursor-pointer"
                  >
                    {csvRows.slice(0, 35).map((r, i) => (
                      <option key={i} value={i}>
                        Row {i + 1}: {r.slice(0, 3).filter(Boolean).join(' | ').substring(0, 45)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Column Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select
                  label="Date Column"
                  value={String(mapping.dateCol)}
                  onChange={(e: any) => setMapping({ ...mapping, dateCol: parseInt(e.target.value, 10) })}
                  options={(csvRows[headerRowIndex] || csvRows[0]).map((h, i) => ({
                    value: String(i),
                    label: `Col ${i}: ${h || `[Column ${i}]`}`,
                  }))}
                />

                <Select
                  label="Description / Narration Column"
                  value={String(mapping.descCol)}
                  onChange={(e: any) => setMapping({ ...mapping, descCol: parseInt(e.target.value, 10) })}
                  options={(csvRows[headerRowIndex] || csvRows[0]).map((h, i) => ({
                    value: String(i),
                    label: `Col ${i}: ${h || `[Column ${i}]`}`,
                  }))}
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
                    ...(csvRows[headerRowIndex] || csvRows[0]).map((h, i) => ({
                      value: String(i),
                      label: `Col ${i}: ${h || `[Column ${i}]`}`,
                    })),
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
                    ...(csvRows[headerRowIndex] || csvRows[0]).map((h, i) => ({
                      value: String(i),
                      label: `Col ${i}: ${h || `[Column ${i}]`}`,
                    })),
                  ]}
                />
              </div>

              {/* Destination Account Selection */}
              <div className="p-4 bg-moss/70 rounded-2xl border border-line">
                <Select
                  label="Assign Statement Transactions to Primary Account"
                  value={selectedAccountId}
                  onChange={(e: any) => setSelectedAccountId(e.target.value)}
                  options={accounts.map((a: Account) => ({
                    value: a.id,
                    label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})${a.balanceAsOfDate ? ` [Baseline: ${a.balanceAsOfDate}, Opening: ₹${a.initialBalance ?? 0}]` : ''}`,
                  }))}
                />
                {selectedAccount && (
                  <p className="text-[11px] text-ink/60 mt-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-pine-600 shrink-0" />
                    <span>
                      Fixed Opening Balance: <strong className="text-ink">{formatCurrency(selectedAccount.initialBalance ?? 0, selectedAccount.currency, numberFormat)}</strong> as of <strong className="text-ink">{selectedAccount.balanceAsOfDate ? formatReadableDate(selectedAccount.balanceAsOfDate) : 'Creation'}</strong>. Transactions on or before this date will not alter this baseline balance.
                    </span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleProceedToReview}>
                  <span>Review & Customize Transactions</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Review, Customize & Commit */}
          {step === 'review' && (
            <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm lift">
              <div className="p-4 sm:px-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink">
                      Review & Customize Entries
                    </h3>
                    <Badge tone="pine" size="xs">
                      {stagedTxs.filter((t) => t.selected).length} of {stagedTxs.length} selected
                    </Badge>
                    {stagedTxs.some((t) => t.isDuplicate) && (
                      <Badge tone="mari" size="xs" className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {stagedTxs.filter((t) => t.isDuplicate).length} probable duplicates
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-ink/50 mt-0.5">
                    Batch assign categories, adjust types (Self-Transfer, Loan EMI, Asset SIP), or split multi-item expenses.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {stagedTxs.some((t) => t.isDuplicate) && (
                    <Button variant="outline" size="sm" onClick={handleSkipDuplicates} className="text-xs">
                      <Filter className="w-3.5 h-3.5 mr-1" />
                      <span>Skip Duplicates</span>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => toggleSelectAllStaged(true)}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggleSelectAllStaged(false)}>
                    Deselect All
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    isLoading={isImporting}
                    onClick={handleCommitStatement}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    <span>Import Selected ({stagedTxs.filter((t) => t.selected).length})</span>
                  </Button>
                </div>
              </div>

              {/* Baseline Date Protection Banner */}
              {preBaselineTxs.length > 0 && selectedAccount?.balanceAsOfDate && (
                <div className="px-4 py-2.5 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200/70 dark:border-amber-800/50 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold">Baseline Date Protection Active: </span>
                    <span>
                      {preBaselineTxs.length} selected transaction(s) are dated on or before {selectedAccount.name}&apos;s opening date ({formatReadableDate(selectedAccount.balanceAsOfDate)}).
                      They will be added to your ledger history for records, but will <strong>NOT</strong> modify your fixed opening balance ({formatCurrency(selectedAccount.initialBalance ?? 0, selectedAccount.currency, numberFormat)}).
                    </span>
                  </div>
                </div>
              )}

              {/* Batch Selection Action Bar */}
              {stagedTxs.filter((t) => t.selected).length > 0 && (
                <div className="px-4 py-2.5 bg-pine-50/70 dark:bg-pine-950/40 border-b border-pine-200/60 dark:border-pine-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-pine-900 dark:text-pine-200">
                    <Layers className="w-4 h-4 text-pine-600" />
                    <span>Batch Actions for {stagedTxs.filter((t) => t.selected).length} selected rows:</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Batch Category with Search */}
                    <div className="flex items-center gap-1.5 min-w-[200px]">
                      <span className="text-[11px] text-ink/60 font-semibold shrink-0">Set Category:</span>
                      <SearchableTargetPicker
                        type="expense"
                        rawFlow="outflow"
                        value=""
                        onChange={(catId) => handleBatchSetCategory(catId)}
                        categories={categories}
                        accounts={accounts}
                        currentAccountId={selectedAccountId}
                        assets={assets}
                        liabilities={liabilities}
                        existingContacts={allAvailableContacts}
                        baseCurrency={baseCurrency}
                        numberFormat={numberFormat}
                        isPrivacyMode={isPrivacyMode}
                      />
                    </div>

                    {/* Batch Type */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-ink/60 font-semibold">Set Type:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleBatchSetType(e.target.value as StagedEntryType);
                            e.target.value = '';
                          }
                        }}
                        className="px-2 py-1 rounded-lg bg-card border border-line text-xs font-semibold text-ink shadow-xs outline-none focus:border-pine-500 cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled>Choose Entry Type...</option>
                        <option value="expense">🔴 Expense (Outflow)</option>
                        <option value="income">🟢 Income (Inflow)</option>
                        <option value="transfer">🔄 Self-Transfer</option>
                        <option value="invest">📈 Invest in Asset / SIP</option>
                        <option value="debt_payment">🏛️ Loan EMI / Debt</option>
                        <optgroup label="People & Custody">
                          <option value="lent">🤝 Lent (Given Out)</option>
                          <option value="lent_repaid">📥 Lent Repaid (Recovery)</option>
                          <option value="borrowed">📥 Borrowed (Loan Taken)</option>
                          <option value="borrowed_repaid">📤 Borrowed Repaid (Paid Back)</option>
                          <option value="holding">🛡️ Holding (Custodial Deposit)</option>
                          <option value="holding_returned">📤 Holding Returned (Paid Out)</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Datalist for existing people contacts */}
              <datalist id="existing-people-contacts">
                {allAvailableContacts.map((contact: string) => (
                  <option key={contact} value={contact} />
                ))}
              </datalist>

              <div className="overflow-x-auto max-h-[60vh] custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-moss/70 border-b border-line text-ink/50 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 backdrop-blur-sm">
                      <th className="py-2.5 px-3 w-10 text-center">Include</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                      <th className="py-2.5 px-3">Description / Narration</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Entry Type</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Category / Destination / Person</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {stagedTxs.map((t) => (
                      <tr
                        key={t.id}
                        className={`hover:bg-moss/40 transition-colors ${
                          !t.selected ? 'opacity-40 bg-moss/20' : t.isDuplicate ? 'bg-mari-50/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={t.selected}
                            onChange={() => toggleStagedSelection(t.id)}
                            className="rounded text-pine-600 focus:ring-pine-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono whitespace-nowrap text-ink/60">
                          {formatReadableDate(t.date)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-ink truncate max-w-xs" title={t.description}>
                          {t.description}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold tabular-nums font-mono num whitespace-nowrap text-ink">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className={t.rawFlow === 'inflow' ? 'text-pine-600' : 'text-flare-600'}>
                              {t.rawFlow === 'inflow' ? '+' : '-'}{formatCurrency(t.amount, baseCurrency, numberFormat, isPrivacyMode)}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleStagedFlow(t.id)}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase transition-all cursor-pointer ${
                                t.rawFlow === 'inflow'
                                  ? 'bg-pine-50 dark:bg-pine-950/60 text-pine-600 hover:bg-pine-100 dark:hover:bg-pine-900 border border-pine-200/60 dark:border-pine-800'
                                  : 'bg-flare-50 dark:bg-flare-950/60 text-flare-600 hover:bg-flare-100 dark:hover:bg-flare-900 border border-flare-200/60 dark:border-flare-800'
                              }`}
                              title={`Currently: ${t.rawFlow === 'inflow' ? 'Inflow (Credit)' : 'Outflow (Debit)'}. Click to switch flow direction.`}
                            >
                              {t.rawFlow === 'inflow' ? 'In' : 'Out'}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={t.type}
                            onChange={(e) => updateStagedType(t.id, e.target.value as StagedEntryType)}
                            className="px-2 py-1 rounded-lg bg-card border border-line text-xs font-semibold text-ink shadow-xs outline-none focus:border-pine-500 cursor-pointer"
                          >
                            <option value="expense">🔴 Expense (Outflow)</option>
                            <option value="income">🟢 Income (Inflow)</option>
                            <option value="transfer">
                              {t.rawFlow === 'inflow' ? '🔄 Transfer (Received From)' : '🔄 Transfer (Sent To)'}
                            </option>
                            <option value="invest">📈 Invest in Asset / SIP</option>
                            <option value="debt_payment">🏛️ Loan EMI / Debt Paydown</option>
                            <optgroup label="People & Custody">
                              <option value="lent">🤝 Lent (Udhar Given - Outflow)</option>
                              <option value="lent_repaid">📥 Lent Repaid (Recovery - Inflow)</option>
                              <option value="borrowed">📥 Borrowed (Loan Taken - Inflow)</option>
                              <option value="borrowed_repaid">📤 Borrowed Repaid (Paid Back - Outflow)</option>
                              <option value="holding">🛡️ Holding (Custodial Inflow)</option>
                              <option value="holding_returned">📤 Holding Returned (Paid Out - Outflow)</option>
                            </optgroup>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 min-w-[210px]">
                          {/* Searchable Combobox Selector for Category / Destination / Person / Asset */}
                          <SearchableTargetPicker
                            type={t.type}
                            rawFlow={t.rawFlow}
                            value={
                              t.type === 'transfer'
                                ? (t.toAccountId || '')
                                : t.type === 'invest'
                                ? (t.linkedAssetId || '')
                                : t.type === 'debt_payment'
                                ? (t.linkedLiabilityId || '')
                                : ['lent', 'lent_repaid', 'borrowed', 'borrowed_repaid', 'holding', 'holding_returned'].includes(t.type)
                                ? (t.contactName || '')
                                : (t.categoryId || '')
                            }
                            onChange={(newVal) => {
                              if (t.type === 'transfer') updateStagedToAccount(t.id, newVal);
                              else if (t.type === 'invest') updateStagedAsset(t.id, newVal);
                              else if (t.type === 'debt_payment') updateStagedLiability(t.id, newVal);
                              else if (['lent', 'lent_repaid', 'borrowed', 'borrowed_repaid', 'holding', 'holding_returned'].includes(t.type)) updateStagedContact(t.id, newVal);
                              else updateStagedCategory(t.id, newVal);
                            }}
                            categories={categories}
                            accounts={accounts}
                            currentAccountId={selectedAccountId}
                            assets={assets}
                            liabilities={liabilities}
                            existingContacts={allAvailableContacts}
                            baseCurrency={baseCurrency}
                            numberFormat={numberFormat}
                            isPrivacyMode={isPrivacyMode}
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {t.isDuplicate ? (
                              <Badge tone="mari" size="xs">
                                Duplicate
                              </Badge>
                            ) : (
                              <Badge tone="pine" size="xs">
                                New
                              </Badge>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenSplitModal(t)}
                              className="p-1 rounded-lg border border-line bg-card hover:bg-moss text-ink/60 hover:text-pine-600 transition-colors cursor-pointer"
                              title="Split transaction into two categories/allocations"
                            >
                              <Split className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Row Split Modal */}
          {splitTargetTx && (
            <Modal
              isOpen={Boolean(splitTargetTx)}
              onClose={() => setSplitTargetTx(null)}
              title={
                <div className="flex items-center gap-2">
                  <Split className="w-5 h-5 text-pine-600" />
                  <span>Split Imported Transaction</span>
                </div>
              }
              description={`Split "${splitTargetTx.description}" (${baseCurrency} ${splitTargetTx.amount}) into two separate entries`}
              maxWidth="md"
            >
              <form onSubmit={handleConfirmRowSplit} className="space-y-4">
                {/* Original Transaction Summary */}
                <div className="p-3 bg-moss/70 rounded-xl border border-line text-xs flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-ink block">{splitTargetTx.description}</span>
                    <span className="text-ink/50">{splitTargetTx.date}</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-ink">
                    {formatCurrency(splitTargetTx.amount, baseCurrency, numberFormat, isPrivacyMode)}
                  </span>
                </div>

                {/* Part 1 */}
                <div className="p-3 bg-card rounded-xl border border-line space-y-3">
                  <span className="text-xs font-bold text-ink/70 uppercase tracking-wider block">Part 1</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-ink/60 uppercase block mb-1">Amount</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={splitPart1Amount}
                        onChange={(e) => setSplitPart1Amount(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-line bg-card text-xs font-mono font-bold text-ink outline-none focus:border-pine-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-ink/60 uppercase block mb-1">Type</label>
                      <select
                        value={splitPart1Type}
                        onChange={(e) => setSplitPart1Type(e.target.value as StagedEntryType)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-line bg-card text-xs text-ink font-semibold outline-none focus:border-pine-500"
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                        <option value="invest">Asset / SIP</option>
                        <option value="debt_payment">Loan EMI</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 uppercase block mb-1">Category</label>
                    <select
                      value={splitPart1CatId}
                      onChange={(e) => setSplitPart1CatId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-line bg-card text-xs text-ink outline-none focus:border-pine-500"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Part 2 (Auto-calculated remainder) */}
                <div className="p-3 bg-card rounded-xl border border-line space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-ink/70 uppercase tracking-wider block">Part 2 (Remainder)</span>
                    <span className="font-mono font-bold text-xs text-pine-600">
                      {formatCurrency(
                        Math.max(0, Math.round((splitTargetTx.amount - (parseFloat(splitPart1Amount) || 0)) * 100) / 100),
                        baseCurrency,
                        numberFormat,
                        isPrivacyMode
                      )}
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 uppercase block mb-1">Type</label>
                    <select
                      value={splitPart2Type}
                      onChange={(e) => setSplitPart2Type(e.target.value as StagedEntryType)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-line bg-card text-xs text-ink font-semibold outline-none focus:border-pine-500"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                      <option value="invest">Asset / SIP</option>
                      <option value="debt_payment">Loan EMI</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 uppercase block mb-1">Category</label>
                    <select
                      value={splitPart2CatId}
                      onChange={(e) => setSplitPart2CatId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-line bg-card text-xs text-ink outline-none focus:border-pine-500"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <Button variant="ghost" size="sm" type="button" onClick={() => setSplitTargetTx(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit">
                    Apply Split
                  </Button>
                </div>
              </form>
            </Modal>
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
                Paste Indian bank UPI SMS alerts (e.g. Navnirman Co-op, SBI, HDFC, ICICI, Google Pay, PhonePe, Paytm). The parser will automatically extract amounts, merchants, UPI refs, and dates.
              </p>
            </div>

            <textarea
              rows={5}
              placeholder={`Paste raw SMS alerts here... e.g.:
Dear Customer, acct XXX606 has been debited for Rs.1500.00 on 31-Aug-26 towards linked PATEL KRISH RAS. UPI Ref no 111831555235 THE NAVNIRMAN CO-OP BANK

Sent Rs.450.00 from HDFC Bank AC **1234 to Swiggy on 02-09-26 Ref 4245678912`}
              value={smsRawText}
              onChange={(e) => setSmsRawText(e.target.value)}
              className="w-full p-3 rounded-2xl bg-ground border border-line text-xs font-mono text-ink placeholder:text-ink/30 focus:border-pine-500 focus:ring-1 focus:ring-pine-500 outline-none"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex-1 max-w-sm">
                <Select
                  label="Assign SMS Transactions to Account"
                  value={smsAccountId}
                  onChange={(e: any) => setSmsAccountId(e.target.value)}
                  options={accounts.map((a: Account) => ({
                    value: a.id,
                    label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
                  }))}
                />
              </div>

              <div className="self-end sm:self-auto pt-4">
                <Button variant="primary" size="sm" onClick={handleParseSMS}>
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  <span>Parse SMS Notifications</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Parsed SMS Review */}
          {parsedSMSList.length > 0 && (
            <div className="rounded-2xl border border-line bg-card overflow-hidden shadow-sm lift">
              <div className="p-4 sm:px-5 border-b border-line flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-ink">
                    Parsed Transactions ({selectedSMSIndices.size} of {parsedSMSList.length} selected)
                  </h3>
                  <p className="text-[11px] text-ink/50 mt-0.5">
                    Select transactions to commit to your encrypted ledger.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isImporting}
                  onClick={handleCommitSMS}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span>Commit Selected</span>
                </Button>
              </div>

              <div className="divide-y divide-line/60">
                {parsedSMSList.map((sms, idx) => {
                  const isSelected = selectedSMSIndices.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedSMSIndices((prev) => {
                          const next = new Set(prev);
                          if (next.has(idx)) next.delete(idx);
                          else next.add(idx);
                          return next;
                        });
                      }}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-moss/40 transition-colors ${
                        isSelected ? 'bg-pine-50/20' : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Handled by parent div
                          className="mt-1 rounded text-pine-600 focus:ring-pine-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge tone={sms.type === 'income' ? 'pine' : 'flare'} size="xs">
                              {sms.type}
                            </Badge>
                            <span className="font-bold text-xs text-ink">{sms.merchant}</span>
                            {sms.bankName && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-moss border border-line text-ink/60 font-semibold">
                                {sms.bankName}
                              </span>
                            )}
                            {sms.accountEnding && (
                              <span className="text-[10px] text-ink/40 font-mono">
                                A/C *{sms.accountEnding}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink/50 font-mono">
                            Date: {formatReadableDate(sms.date)} • Ref: {sms.refNumber || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-display font-extrabold text-base num text-ink shrink-0">
                        {formatCurrency(sms.amount, baseCurrency, numberFormat, isPrivacyMode)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Row Split Modal */}
          {splitTargetTx && (
            <Modal
              isOpen={Boolean(splitTargetTx)}
              onClose={() => setSplitTargetTx(null)}
              title={
                <div className="flex items-center gap-2">
                  <Split className="w-5 h-5 text-pine-600" />
                  <span>Split Imported Transaction</span>
                </div>
              }
              description={`Split "${splitTargetTx.description}" (${baseCurrency} ${splitTargetTx.amount}) into two separate entries`}
              maxWidth="md"
            >
              <form onSubmit={handleConfirmRowSplit} className="space-y-4">
                {/* Original Transaction Summary */}
                <div className="p-3 bg-moss/70 rounded-xl border border-line text-xs flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-ink block">{splitTargetTx.description}</span>
                    <span className="text-ink/50">{splitTargetTx.date}</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-ink">
                    {formatCurrency(splitTargetTx.amount, baseCurrency, numberFormat, isPrivacyMode)}
                  </span>
                </div>

                {/* Part 1 */}
                <div className="p-3 bg-card rounded-xl border border-line space-y-3">
                  <span className="text-xs font-bold text-ink/70 uppercase tracking-wider block">Part 1</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-ink/60 uppercase block mb-1">Amount</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={splitPart1Amount}
                        onChange={(e) => setSplitPart1Amount(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-line bg-card text-xs font-mono font-bold text-ink outline-none focus:border-pine-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-ink/60 uppercase block mb-1">Type</label>
                      <select
                        value={splitPart1Type}
                        onChange={(e) => setSplitPart1Type(e.target.value as StagedEntryType)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-line bg-card text-xs text-ink font-semibold outline-none focus:border-pine-500"
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                        <option value="invest">Asset / SIP</option>
                        <option value="debt_payment">Loan EMI</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 uppercase block mb-1">Category</label>
                    <select
                      value={splitPart1CatId}
                      onChange={(e) => setSplitPart1CatId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-line bg-card text-xs text-ink outline-none focus:border-pine-500"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Part 2 (Auto-calculated remainder) */}
                <div className="p-3 bg-card rounded-xl border border-line space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-ink/70 uppercase tracking-wider block">Part 2 (Remainder)</span>
                    <span className="font-mono font-bold text-xs text-pine-600">
                      {formatCurrency(
                        Math.max(0, Math.round((splitTargetTx.amount - (parseFloat(splitPart1Amount) || 0)) * 100) / 100),
                        baseCurrency,
                        numberFormat,
                        isPrivacyMode
                      )}
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 uppercase block mb-1">Type</label>
                    <select
                      value={splitPart2Type}
                      onChange={(e) => setSplitPart2Type(e.target.value as StagedEntryType)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-line bg-card text-xs text-ink font-semibold outline-none focus:border-pine-500"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                      <option value="invest">Asset / SIP</option>
                      <option value="debt_payment">Loan EMI</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-ink/60 uppercase block mb-1">Category</label>
                    <select
                      value={splitPart2CatId}
                      onChange={(e) => setSplitPart2CatId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-line bg-card text-xs text-ink outline-none focus:border-pine-500"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <Button variant="ghost" size="sm" type="button" onClick={() => setSplitTargetTx(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit">
                    Apply Split
                  </Button>
                </div>
              </form>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
};
