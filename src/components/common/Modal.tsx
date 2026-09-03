import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  /** If true, clicking the backdrop does NOT close the modal */
  preventBackdropClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  preventBackdropClose = false,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown, true);

    // Focus initial element ONLY once when opening
    const timer = setTimeout(() => {
      if (!modalContainerRef.current) return;
      if (
        document.activeElement &&
        modalContainerRef.current.contains(document.activeElement) &&
        document.activeElement !== closeButtonRef.current
      ) {
        return;
      }
      const focusTarget = modalContainerRef.current.querySelector<HTMLElement>(
        '[autofocus], input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])'
      );
      if (focusTarget) {
        focusTarget.focus();
      } else if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen]); // Only depends on isOpen, NOT onClose, preventing focus stealing on re-renders

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md sm:max-w-lg',
    lg: 'max-w-lg sm:max-w-xl lg:max-w-2xl',
    xl: 'max-w-xl sm:max-w-2xl lg:max-w-3xl',
    '2xl': 'max-w-2xl sm:max-w-3xl lg:max-w-4xl',
    '3xl': 'max-w-3xl sm:max-w-4xl lg:max-w-5xl',
    '4xl': 'max-w-4xl sm:max-w-5xl lg:max-w-6xl',
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain modal-contain"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
        onClick={preventBackdropClose ? undefined : onClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4 text-center">
        <div
          ref={modalContainerRef}
          className={cn(
            'relative w-full transform overflow-hidden text-left',
            // On mobile: full-width bottom sheet with rounded top corners
            'rounded-t-3xl sm:rounded-2xl',
            // PaisaBook card surface
            'bg-card',
            'border border-line',
            'shadow-card',
            // Padding
            'p-5 sm:p-6',
            // Slide-up animation on mobile, zoom-in on desktop
            'animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:fade-in sm:zoom-in-95 duration-200',
            maxWidthClasses[maxWidth]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-start justify-between pb-4 mb-4 border-b border-line">
            <div className="pr-4">
              {title && (
                <h3
                  id="modal-title"
                  className="text-base font-bold font-display text-ink tracking-tight"
                >
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-ink/55 mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="Close dialog"
              className="flex-shrink-0 p-1.5 rounded-xl text-ink/40 hover:text-ink hover:bg-moss transition-colors cursor-pointer -mt-0.5 -mr-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div>{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};
