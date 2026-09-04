import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { useVault } from '../../context/VaultContext';
import { UserPlus } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (contactName: string) => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addPeopleEntry, activeVault } = useVault();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tag, setTag] = useState('Friend');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please provide a contact name');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const combinedNote = [tag ? `[${tag}]` : '', notes.trim()].filter(Boolean).join(' ') || undefined;

      await addPeopleEntry({
        contactName: trimmedName,
        contactPhone: phone.trim() || undefined,
        notes: combinedNote,
        amount: 0,
        type: 'holding',
        currency: activeVault?.currency || 'INR',
        date: new Date().toISOString().split('T')[0],
      });

      setName('');
      setPhone('');
      setNotes('');
      setTag('Friend');
      onSuccess?.(trimmedName);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save contact');
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
          <div className="w-8 h-8 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200/60 dark:border-pine-800/40 grid place-items-center text-pine-600">
            <UserPlus className="w-4 h-4" />
          </div>
          <span>Add New Contact Profile</span>
        </div>
      }
      description="Register a person or business contact in your directory with ₹0 balance without creating an active loan or debt."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-flare-100/70 dark:bg-flare-950/40 border border-flare-500/30 text-flare-700 dark:text-flare-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <Input
          label="Full Name / Display Name"
          placeholder="e.g. Ramesh Kumar, Sharma Ji, Landlord"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Phone Number (Optional)"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
          />

          <Select
            label="Relationship / Category"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            options={[
              { value: 'Friend', label: 'Friend' },
              { value: 'Family', label: 'Family' },
              { value: 'Colleague', label: 'Colleague / Work' },
              { value: 'Business', label: 'Business / Vendor' },
              { value: 'Landlord', label: 'Landlord / Tenant' },
              { value: 'Other', label: 'Other' },
            ]}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink/75 mb-1.5">
            Notes / Details (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Flatmate, shared utility expenses, UPI handle"
            className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs text-ink placeholder:text-ink/30 focus:border-pine-500 focus:outline-none min-h-[70px] resize-none"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2 border-t border-line">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
            Save Contact
          </Button>
        </div>
      </form>
    </Modal>
  );
};
