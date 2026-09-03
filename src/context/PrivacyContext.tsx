import React, { createContext, useContext, useState } from 'react';

interface PrivacyContextType {
  isPrivacyMode: boolean;
  togglePrivacy: () => void;
  setPrivacyMode: (value: boolean) => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const togglePrivacy = () => {
    if (isPrivacyMode) {
      // Numbers are masked -> revealing requires master password verification
      openAuthModal();
    } else {
      // Instant shield -> mask numbers immediately
      setIsPrivacyMode(true);
    }
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const setPrivacyMode = (value: boolean) => {
    setIsPrivacyMode(value);
  };

  return (
    <PrivacyContext.Provider
      value={{
        isPrivacyMode,
        togglePrivacy,
        setPrivacyMode,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
};

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
}
