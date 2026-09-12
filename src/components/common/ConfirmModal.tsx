import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Trash2, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: React.ReactNode;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'info';
  icon?: React.ReactNode;
  itemPreview?: React.ReactNode;
  isLoading?: boolean;
  isAlert?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon,
  itemPreview,
  isLoading = false,
  isAlert = false,
}) => {
  const getIcon = () => {
    if (icon) return icon;
    switch (variant) {
      case 'danger':
        return <Trash2 className="w-5 h-5 text-flare-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-mari-600 dark:text-mari-400" />;
      case 'info':
      case 'primary':
      default:
        return <Info className="w-5 h-5 text-pine-600 dark:text-pine-400" />;
    }
  };

  const getBadgeClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-flare-100/80 dark:bg-flare-950/60 border border-flare-200 dark:border-flare-800/60 text-flare-600';
      case 'warning':
        return 'bg-mari-100/80 dark:bg-mari-950/60 border border-mari-200 dark:border-mari-800/60 text-mari-600 dark:text-mari-400';
      case 'info':
      case 'primary':
      default:
        return 'bg-pine-50 dark:bg-pine-950/60 border border-pine-200 dark:border-pine-800/60 text-pine-700 dark:text-pine-300';
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case 'danger':
        return 'bg-flare-600 hover:bg-flare-700 active:bg-flare-800 text-white shadow-xs font-bold border border-flare-700/30';
      case 'warning':
        return 'bg-mari-500 hover:bg-mari-600 active:bg-mari-700 text-white shadow-xs font-bold border border-mari-600/30';
      case 'info':
      case 'primary':
      default:
        return 'bg-pine-700 hover:bg-pine-600 active:bg-pine-800 text-white shadow-xs font-bold border border-pine-800/30';
    }
  };

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      title={
        <div className="flex items-center gap-2.5">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', getBadgeClass())}>
            {getIcon()}
          </div>
          <span className="font-display font-bold text-ink text-base tracking-tight">
            {title}
          </span>
        </div>
      }
      description={description}
    >
      <div className="space-y-4 pt-1">
        {itemPreview && (
          <div className="p-3 rounded-xl bg-moss/70 dark:bg-navy-900/60 border border-line">
            {itemPreview}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          {!isAlert && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
              getConfirmButtonClasses()
            )}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
