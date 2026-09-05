import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import type { Liability, LiabilityType, CurrencyCode } from '../../types';
import { CreditCard } from 'lucide-react';

interface LiabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  liabilityToEdit?: Liability;
}

export const LiabilityModal: React.FC<LiabilityModalProps> = ({
  isOpen,
  onClose,
  liabilityToEdit,
}) => {
  const { addLiability, updateLiability, activeVault, accounts, addTransaction } = useVault();

  const [name, setName] = useState(liabilityToEdit?.name || '');
  const [type, setType] = useState<LiabilityType>(liabilityToEdit?.type || 'home_loan');
  const [lender, setLender] = useState(liabilityToEdit?.lender || '');
  const [principalAmount, setPrincipalAmount] = useState(
    liabilityToEdit ? String(liabilityToEdit.principalAmount) : ''
  );
  const [outstandingBalance, setOutstandingBalance] = useState(
    liabilityToEdit ? String(liabilityToEdit.outstandingBalance) : ''
  );
  const [interestRate, setInterestRate] = useState(
    liabilityToEdit ? String(liabilityToEdit.interestRate) : '8.5'
  );
  const [interestType, setInterestType] = useState<'fixed' | 'floating'>(
    liabilityToEdit?.interestType || 'fixed'
  );
  const [benchmarkName, setBenchmarkName] = useState(
    liabilityToEdit?.benchmarkName || 'RBI Repo Rate'
  );
  const [benchmarkRate, setBenchmarkRate] = useState(
    liabilityToEdit?.benchmarkRate ? String(liabilityToEdit.benchmarkRate) : '6.50'
  );
  const [spread, setSpread] = useState(
    liabilityToEdit?.spread ? String(liabilityToEdit.spread) : '2.05'
  );
  const [emiAmount, setEmiAmount] = useState(
    liabilityToEdit ? String(liabilityToEdit.emiAmount) : ''
  );
  const [nextDueDate, setNextDueDate] = useState(liabilityToEdit?.nextDueDate || '');
  const [tenureRemainingMonths, setTenureRemainingMonths] = useState(
    liabilityToEdit?.tenureRemainingMonths ? String(liabilityToEdit.tenureRemainingMonths) : ''
  );
  const [currency, setCurrency] = useState<CurrencyCode>(
    liabilityToEdit?.currency || activeVault?.currency || 'INR'
  );
  const [notes, setNotes] = useState(liabilityToEdit?.notes || '');
  const [linkToBank, setLinkToBank] = useState(false);
  const [bankAccountId, setBankAccountId] = useState(accounts[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a loan or liability name');
      return;
    }

    const numPrincipal = parseFloat(principalAmount);
    const numOutstanding = parseFloat(outstandingBalance);
    const computedFloatingRate = Math.round(((parseFloat(benchmarkRate) || 0) + (parseFloat(spread) || 0)) * 100) / 100;
    const numRate = interestType === 'floating' ? computedFloatingRate : (parseFloat(interestRate) || 0);
    const numEmi = parseFloat(emiAmount) || 0;

    if (isNaN(numOutstanding) || numOutstanding < 0) {
      setError('Please enter a valid outstanding balance');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (liabilityToEdit) {
        await updateLiability({
          ...liabilityToEdit,
          name: name.trim(),
          type,
          lender: lender.trim(),
          principalAmount: isNaN(numPrincipal) ? numOutstanding : numPrincipal,
          outstandingBalance: numOutstanding,
          interestRate: numRate,
          emiAmount: numEmi,
          interestType,
          benchmarkName: interestType === 'floating' ? benchmarkName : undefined,
          benchmarkRate: interestType === 'floating' ? parseFloat(benchmarkRate) || 0 : undefined,
          spread: interestType === 'floating' ? parseFloat(spread) || 0 : undefined,
          nextDueDate: nextDueDate || undefined,
          tenureRemainingMonths: tenureRemainingMonths ? parseInt(tenureRemainingMonths, 10) : undefined,
          currency,
          notes: notes.trim() || undefined,
        });
      } else {
        const newLiability = await addLiability({
          name: name.trim(),
          type,
          lender: lender.trim(),
          principalAmount: isNaN(numPrincipal) ? numOutstanding : numPrincipal,
          outstandingBalance: numOutstanding,
          interestRate: numRate,
          emiAmount: numEmi,
          interestType,
          benchmarkName: interestType === 'floating' ? benchmarkName : undefined,
          benchmarkRate: interestType === 'floating' ? parseFloat(benchmarkRate) || 0 : undefined,
          spread: interestType === 'floating' ? parseFloat(spread) || 0 : undefined,
          nextDueDate: nextDueDate || undefined,
          tenureRemainingMonths: tenureRemainingMonths ? parseInt(tenureRemainingMonths, 10) : undefined,
          currency,
          notes: notes.trim() || undefined,
        });

        if (linkToBank && bankAccountId && numOutstanding > 0) {
          await addTransaction({
            date: new Date().toISOString().split('T')[0],
            amount: numOutstanding,
            type: 'income',
            currency,
            accountId: bankAccountId,
            note: `Loan disbursement: ${name.trim()} (${lender.trim()})`,
            linkedLiabilityId: newLiability.id,
            subType: 'regular',
          } as any);
        }
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save liability');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-rose-500" />
          <span>{liabilityToEdit ? 'Edit Liability / Loan' : 'Add Formal Debt / Loan'}</span>
        </div>
      }
      description="Track institutional mortgages, vehicle loans, education loans, and credit card debts"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <Input
          label="Loan / Liability Name"
          placeholder="e.g. HDFC Home Loan, Car Loan SBI, ICICI Amazon Pay Card"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Liability Category"
            value={type}
            onChange={(e) => {
              const newType = e.target.value as LiabilityType;
              setType(newType);
              if (newType === 'family_peer') {
                setInterestRate('0');
                setInterestType('fixed');
              }
            }}
            options={[
              { value: 'home_loan', label: 'Home Loan / Mortgage' },
              { value: 'car_loan', label: 'Car / Auto Loan' },
              { value: 'personal_loan', label: 'Personal Loan' },
              { value: 'education_loan', label: 'Education Loan' },
              { value: 'family_peer', label: 'Family / Relative / Personal Debt' },
              { value: 'credit_card', label: 'Credit Card Outstanding' },
              { value: 'gold_loan', label: 'Gold Loan' },
              { value: 'other', label: 'Other Institutional Debt' },
            ]}
          />

          <Input
            label={type === 'family_peer' ? 'Person / Lender (e.g. Sister)' : 'Lender / Financial Institution'}
            placeholder={type === 'family_peer' ? 'e.g. Sister, Father, Friend' : 'e.g. HDFC Bank, SBI, Tata Capital'}
            value={lender}
            onChange={(e) => setLender(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            step="any"
            label="Current Outstanding Balance"
            placeholder="0.00"
            value={outstandingBalance}
            onChange={(e) => setOutstandingBalance(e.target.value)}
            tabularNums
            required
          />

          <Input
            type="number"
            step="any"
            label="Original Principal Amount"
            placeholder="0.00"
            value={principalAmount}
            onChange={(e) => setPrincipalAmount(e.target.value)}
            tabularNums
          />
        </div>

        {/* Interest Type & Rate Configuration */}
        <div className="p-3.5 rounded-2xl bg-moss/60 border border-line space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-ink/60">
              Interest Structure
            </label>
            <div className="flex items-center gap-1 p-0.5 bg-card border border-line rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setInterestType('fixed')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  interestType === 'fixed'
                    ? 'bg-pine-700 text-white shadow-xs'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                Fixed Rate
              </button>
              <button
                type="button"
                onClick={() => setInterestType('floating')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  interestType === 'floating'
                    ? 'bg-pine-700 text-white shadow-xs'
                    : 'text-ink/60 hover:text-ink'
                }`}
              >
                Floating (RBI Repo)
              </button>
            </div>
          </div>

          {interestType === 'floating' ? (
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase text-ink/50 mb-1">
                    Benchmark
                  </label>
                  <select
                    value={benchmarkName}
                    onChange={(e) => setBenchmarkName(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-line bg-card text-xs font-semibold text-ink outline-none focus:border-pine-500"
                  >
                    <option value="RBI Repo Rate">RBI Repo Rate</option>
                    <option value="MCLR 1-Year">1-Yr MCLR</option>
                    <option value="Treasury Bill">3-Mo T-Bill</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold uppercase text-ink/50 mb-1">
                    Benchmark Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={benchmarkRate}
                    onChange={(e) => setBenchmarkRate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-line bg-card text-xs font-mono font-bold text-ink outline-none focus:border-pine-500"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold uppercase text-ink/50 mb-1">
                    Lender Spread (%)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={spread}
                    onChange={(e) => setSpread(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-line bg-card text-xs font-mono font-bold text-ink outline-none focus:border-pine-500"
                  />
                </div>
              </div>

              {/* Effective APR Dynamic Callout */}
              <div className="p-2.5 rounded-xl bg-card border border-pine-200 dark:border-pine-800 flex items-center justify-between text-xs">
                <span className="text-ink/70 font-medium">Effective Floating APR:</span>
                <span className="font-mono font-extrabold text-pine-700 dark:text-pine-400">
                  {benchmarkRate}% (Repo) + {spread}% (Spread) = {((parseFloat(benchmarkRate) || 0) + (parseFloat(spread) || 0)).toFixed(2)}% p.a.
                </span>
              </div>
            </div>
          ) : (
            <Input
              type="number"
              step="any"
              label="Fixed Annual Interest Rate (%)"
              placeholder="e.g. 8.75"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              tabularNums
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            step="any"
            label={type === 'family_peer' ? 'Monthly Repayment (Optional)' : 'Monthly EMI Amount'}
            placeholder={type === 'family_peer' ? '0.00 (Flexible / On-Demand)' : '0.00'}
            value={emiAmount}
            onChange={(e) => setEmiAmount(e.target.value)}
            tabularNums
          />

          <Input
            type="number"
            label="Remaining Tenure (Months)"
            placeholder="e.g. 180"
            value={tenureRemainingMonths}
            onChange={(e) => setTenureRemainingMonths(e.target.value)}
            tabularNums
          />
        </div>

        <div>
          <Input
            type="date"
            label="Next EMI Due Date"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
          />
        </div>

        <Input
          label="Notes / Loan Account Number"
          placeholder="e.g. Loan A/C # 981240124"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Bank Credit Toggle for New Liabilities */}
        {!liabilityToEdit && (
          <div className="p-3.5 rounded-2xl border border-line bg-moss/60 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="block text-xs font-bold text-ink">
                  Bank Balance Credit
                </span>
                <span className="block text-[11px] text-ink/50 mt-0.5">
                  {linkToBank
                    ? 'Credits newly disbursed loan amount into your bank account ledger'
                    : 'Pre-existing loan / debt — does not affect current bank balance (Recommended for existing loans)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLinkToBank(!linkToBank)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  linkToBank ? 'bg-pine-600' : 'bg-ink/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    linkToBank ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {linkToBank && (
              <div className="pt-2 border-t border-line/60">
                <Select
                  label="Credit Loan Proceeds Into Account"
                  value={bankAccountId}
                  onChange={(e: any) => setBankAccountId(e.target.value)}
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: `${a.name} (${a.currency} ${a.balance.toFixed(2)})`,
                  }))}
                  helperText="Creates a linked double-entry disbursement into this account"
                />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {liabilityToEdit ? 'Update Liability' : 'Save Liability'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
