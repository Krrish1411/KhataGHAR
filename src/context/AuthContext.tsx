import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { VaultMeta } from '../types';
import { db } from '../db';
import { deriveKey, verifyKey, hashStringSHA256 } from '../services/crypto';

interface AuthContextType {
  activeVault: VaultMeta | null;
  allVaults: VaultMeta[];
  isUnlocked: boolean;
  isDecoyMode: boolean;
  sessionKey: CryptoKey | null;
  isLoading: boolean;
  unlockVaultWithPassword: (vaultId: string, password: string) => Promise<boolean>;
  lockVault: () => void;
  refreshVaultList: () => Promise<void>;
  setActiveVaultMeta: (vault: VaultMeta) => void;
  setSessionCredentials: (vault: VaultMeta, key: CryptoKey) => void;
  exitDemoVault: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allVaults, setAllVaults] = useState<VaultMeta[]>([]);
  const [activeVault, setActiveVault] = useState<VaultMeta | null>(null);
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);
  const [isDecoyMode, setIsDecoyMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const lockTimerRef = useRef<number | null>(null);

  const activeVaultRef = useRef<VaultMeta | null>(activeVault);
  activeVaultRef.current = activeVault;

  const isUnlocked = Boolean(activeVault && sessionKey);

  // Load all vaults from IndexedDB on initial mount (and purge temporary demo vaults on refresh)
  const refreshVaultList = useCallback(async (isInitialStartup = false, overrideActiveVault?: VaultMeta) => {
    try {
      if (isInitialStartup) {
        // Automatically delete ephemeral demo vaults on browser refresh/startup
        const allVaultsInDb = await db.vaults.toArray();
        const demoVaults = allVaultsInDb.filter((v) => Boolean(v.isDemo));
        for (const dv of demoVaults) {
          await db.records.where('vaultId').equals(dv.id).delete();
          await db.vaults.delete(dv.id);
        }
      }

      const vaults = await db.vaults.toArray();
      setAllVaults(vaults);

      const targetCurrent = overrideActiveVault ?? activeVaultRef.current;
      if (targetCurrent) {
        const refreshedActive = vaults.find((v) => v.id === targetCurrent.id) || targetCurrent;
        activeVaultRef.current = refreshedActive;
        setActiveVault(refreshedActive);
      } else if (vaults.length > 0) {
        // Select primary or first non-demo vault by default
        const primary = vaults.find((v) => v.isPrimary) || vaults[0];
        activeVaultRef.current = primary;
        setActiveVault(primary);
      } else {
        activeVaultRef.current = null;
        setActiveVault(null);
      }
    } catch (err) {
      console.error('Failed to load vaults:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshVaultList(true);
  }, [refreshVaultList]);

  // Exit & delete demo vault cleanly
  const exitDemoVault = useCallback(async () => {
    try {
      const allVaultsInDb = await db.vaults.toArray();
      const demoVaults = allVaultsInDb.filter((v) => Boolean(v.isDemo));
      for (const dv of demoVaults) {
        await db.records.where('vaultId').equals(dv.id).delete();
        await db.vaults.delete(dv.id);
      }
    } catch (err) {
      console.error('Error exiting demo vault:', err);
    }
    setSessionKey(null);
    activeVaultRef.current = null;
    setActiveVault(null);
    await refreshVaultList(false);
  }, [refreshVaultList]);

  // Lock the active session: wipe sessionKey and reset state
  const lockVault = useCallback(() => {
    setSessionKey(null);
    setIsDecoyMode(false);
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  // Unlock with password (or decoy PIN)
  const unlockVaultWithPassword = async (vaultId: string, password: string): Promise<boolean> => {
    // Always fetch fresh from IndexedDB to ensure updated salt/verifier are used after password changes
    const targetVault = (await db.vaults.get(vaultId)) || allVaults.find((v) => v.id === vaultId);
    if (!targetVault) return false;

    // Check if entered password matches Decoy PIN hash
    if (targetVault.decoyConfig?.enabled && targetVault.decoyConfig.pinHash) {
      const enteredHash = await hashStringSHA256(password);
      if (enteredHash === targetVault.decoyConfig.pinHash) {
        setIsDecoyMode(true);
        // Derive session key directly from the entered Decoy PIN so encrypted snapshot can be decrypted
        const decoyKey = await deriveKey(password, targetVault.salt);
        activeVaultRef.current = targetVault;
        setActiveVault(targetVault);
        setSessionKey(decoyKey);
        await refreshVaultList(false, targetVault);
        return true;
      }
    }

    try {
      const key = await deriveKey(password, targetVault.salt);
      const isValid = await verifyKey(key, targetVault.verifier);
      if (!isValid) return false;

      setIsDecoyMode(false);
      activeVaultRef.current = targetVault;
      setSessionKey(key);
      setActiveVault(targetVault);
      await refreshVaultList(false, targetVault);
      return true;
    } catch (err) {
      console.error('Error during vault unlock:', err);
      return false;
    }
  };

  const setSessionCredentials = (vault: VaultMeta, key: CryptoKey) => {
    activeVaultRef.current = vault;
    setActiveVault(vault);
    setSessionKey(key);
  };

  const setActiveVaultMeta = (vault: VaultMeta) => {
    activeVaultRef.current = vault;
    setActiveVault(vault);
  };

  // Setup auto-lock inactivity timer
  useEffect(() => {
    if (!isUnlocked || !activeVault) return;

    const timeoutMinutes = activeVault.autoLockMinutes ?? 5;
    if (timeoutMinutes <= 0) return; // Never lock

    const timeoutMs = timeoutMinutes * 60 * 1000;

    const resetTimer = () => {
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
      }
      lockTimerRef.current = window.setTimeout(() => {
        console.warn('Auto-lock triggered due to inactivity');
        lockVault();
      }, timeoutMs);
    };

    resetTimer();

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
      }
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [isUnlocked, activeVault, lockVault]);

  // Tab switch / window blur auto-lock
  useEffect(() => {
    if (!isUnlocked) return;

    const handleVisibilityChange = () => {
      const autoLockTab = localStorage.getItem('khata_auto_lock_tab_switch') === 'true';
      if (autoLockTab && document.visibilityState === 'hidden') {
        console.warn('Auto-lock triggered on tab switch / window blur');
        lockVault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isUnlocked, lockVault]);

  return (
    <AuthContext.Provider
      value={{
        activeVault,
        allVaults,
        isUnlocked,
        sessionKey,
        isLoading,
        unlockVaultWithPassword,
        lockVault,
        refreshVaultList,
        setActiveVaultMeta,
        setSessionCredentials,
        isDecoyMode,
        exitDemoVault,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
