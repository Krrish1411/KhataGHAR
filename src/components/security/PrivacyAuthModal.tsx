import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { usePrivacy } from '../../context/PrivacyContext';
import { deriveKey, verifyKey } from '../../services/crypto';
import { Eye, ShieldAlert } from 'lucide-react';

export const PrivacyAuthModal: React.FC = () => {
  const { activeVault } = useAuth();
  const { isAuthModalOpen, closeAuthModal, setPrivacyMode } = usePrivacy();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !activeVault) return;

    setIsVerifying(true);
    setError('');

    try {
      const key = await deriveKey(password, activeVault.salt);
      const isValid = await verifyKey(key, activeVault.verifier);

      if (isValid) {
        setPrivacyMode(false);
        setPassword('');
        closeAuthModal();
      } else {
        setError('Incorrect master password');
      }
    } catch (err) {
      setError('Verification failed. Try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    closeAuthModal();
  };

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Eye className="w-5 h-5" />
          </div>
          <span>Reveal Financial Figures</span>
        </div>
      }
      description="Enter your master password to disable Instant Privacy Mode and view numbers."
      maxWidth="sm"
    >
      <form onSubmit={handleVerify} className="space-y-4">
        <Input
          type="password"
          label="Master Password"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError('');
          }}
          error={error}
          autoFocus
          required
        />

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-navy-800 p-2.5 rounded-xl">
          <ShieldAlert className="w-4 h-4 text-brand-500 flex-shrink-0" />
          <span>Figures will remain visible until you toggle privacy mode on again or lock your vault.</span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isVerifying}>
            Reveal Figures
          </Button>
        </div>
      </form>
    </Modal>
  );
};
