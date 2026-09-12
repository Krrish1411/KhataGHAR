import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { ConfirmModal } from '../components/common/ConfirmModal';

export interface ConfirmOptions {
  title: React.ReactNode;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'info';
  icon?: React.ReactNode;
  itemPreview?: React.ReactNode;
}

export interface AlertOptions {
  title: React.ReactNode;
  description?: string;
  confirmText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'info';
  icon?: React.ReactNode;
  itemPreview?: React.ReactNode;
}

interface DialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (optionsOrMessage: AlertOptions | string) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: React.ReactNode;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary' | 'info';
    icon?: React.ReactNode;
    itemPreview?: React.ReactNode;
    isAlert?: boolean;
  }>({
    isOpen: false,
    title: '',
  });

  const resolverRef = useRef<(value: boolean) => void>(() => {});

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogState({
        isOpen: true,
        title: options.title,
        description: options.description,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'primary',
        icon: options.icon,
        itemPreview: options.itemPreview,
        isAlert: false,
      });
    });
  }, []);

  const alert = useCallback((optionsOrMessage: AlertOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      resolverRef.current = () => resolve();
      if (typeof optionsOrMessage === 'string') {
        setDialogState({
          isOpen: true,
          title: 'Notification',
          description: optionsOrMessage,
          confirmText: 'Dismiss',
          variant: 'info',
          isAlert: true,
        });
      } else {
        setDialogState({
          isOpen: true,
          title: optionsOrMessage.title,
          description: optionsOrMessage.description,
          confirmText: optionsOrMessage.confirmText || 'Dismiss',
          variant: optionsOrMessage.variant || 'info',
          icon: optionsOrMessage.icon,
          itemPreview: optionsOrMessage.itemPreview,
          isAlert: true,
        });
      }
    });
  }, []);

  const handleClose = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    resolverRef.current(false);
  }, []);

  const handleConfirm = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    resolverRef.current(true);
  }, []);

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      <ConfirmModal
        isOpen={dialogState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={dialogState.title}
        description={dialogState.description}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        variant={dialogState.variant}
        icon={dialogState.icon}
        itemPreview={dialogState.itemPreview}
        isAlert={dialogState.isAlert}
      />
    </DialogContext.Provider>
  );
};

export const useDialog = (): DialogContextType => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

export const useConfirm = () => {
  const { confirm } = useDialog();
  return confirm;
};
