import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { db } from '../../db';
import type { DatabaseStats } from '../../db/types';
import {
  Database,
  HardDrive,
  Cpu,
  Trash2,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  FolderOpen,
  Sparkles,
} from 'lucide-react';

export const StorageDiagnosticsCard: React.FC = () => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState('');

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const s = await db.getStats();
      setStats(s);
    } catch (err) {
      console.warn('Failed to load storage stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handlePurge = async () => {
    setIsPurging(true);
    setPurgeSuccess('');
    try {
      const res = await db.purgeStorage();
      await loadStats();
      setPurgeSuccess('Database vacuumed and memory cache trimmed successfully!');
    } catch (err: any) {
      console.error('Failed to vacuum storage:', err);
    } finally {
      setIsPurging(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display font-bold text-base sm:text-lg text-ink">
          Storage & SQLite Diagnostics
        </h3>
        <p className="text-xs text-ink/60 mt-0.5">
          Zero-cloud, client-side database footprint and low-overhead local disk management.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-card p-5 sm:p-6 space-y-5 shadow-sm lift">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-line bg-card space-y-1">
            <span className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider block">
              DB Engine
            </span>
            <span className="font-display font-bold text-sm text-ink flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-pine-600 shrink-0" />
              <span>
                {stats?.engine === 'sqlite-native'
                  ? 'Native SQLite 3'
                  : stats?.engine === 'sqlite-wasm'
                  ? 'WASM SQLite'
                  : 'IndexedDB Vault'}
              </span>
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-line bg-card space-y-1">
            <span className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider block">
              Disk Usage
            </span>
            <span className="font-display font-bold text-sm text-ink num">
              {formatBytes(stats?.fileSizeBytes)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-line bg-card space-y-1">
            <span className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider block">
              Encrypted Records
            </span>
            <span className="font-display font-bold text-sm text-ink num">
              {stats?.recordCount ?? 0}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-line bg-card space-y-1">
            <span className="text-[11px] font-semibold text-ink/50 uppercase tracking-wider block">
              Concurrency Mode
            </span>
            <span className="font-mono font-bold text-xs text-pine-700 dark:text-pine-300">
              {stats?.journalMode || 'WAL (Low CPU)'}
            </span>
          </div>
        </div>

        {/* Database File Location */}
        {stats?.filePath && (
          <div className="p-3 rounded-xl bg-moss border border-line text-xs space-y-1">
            <span className="font-bold text-ink flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-pine-600" />
              <span>Local Database Path on Disk</span>
            </span>
            <p className="font-mono text-[11px] text-ink/65 break-all">
              {stats.filePath}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line">
          <Button
            onClick={handlePurge}
            variant="outline"
            size="sm"
            isLoading={isPurging}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5 text-pine-600" />
            <span>Vacuum Database & Trim Memory</span>
          </Button>

          <Button
            onClick={loadStats}
            variant="ghost"
            size="sm"
            isLoading={isLoading}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>Refresh Diagnostics</span>
          </Button>
        </div>

        {purgeSuccess && (
          <div className="p-3 rounded-xl bg-pine-50 dark:bg-pine-950/40 border border-pine-200 text-pine-700 dark:text-pine-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-pine-600 shrink-0" />
            <span>{purgeSuccess}</span>
          </div>
        )}
      </div>
    </div>
  );
};
