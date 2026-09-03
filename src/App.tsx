import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PrivacyProvider } from './context/PrivacyContext';
import { VaultProvider } from './context/VaultContext';
import { AppLayout } from './components/layout/AppLayout';
import { LockScreen } from './components/security/LockScreen';

// Views
import { DashboardView } from './views/DashboardView';
import { AccountsView } from './views/AccountsView';
import { TransactionsView } from './views/TransactionsView';
import { PeopleLedgerView } from './views/PeopleLedgerView';
import { BudgetsGoalsView } from './views/BudgetsGoalsView';
import { PlansView } from './views/PlansView';
import { AssetsLiabilitiesView } from './views/AssetsLiabilitiesView';
import { ReportsView } from './views/ReportsView';
import { HealthScoreView } from './views/HealthScoreView';
import { ImportView } from './views/ImportView';
import { DocumentsView } from './views/DocumentsView';
import { FamilyOverviewView } from './views/FamilyOverviewView';
import { SettingsView } from './views/SettingsView';
import { SecurityPrivacyView } from './views/SecurityPrivacyView';

const AuthenticatedApp: React.FC = () => {
  const { isUnlocked, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-mono tracking-wider">
            INITIALIZING SECURE VAULT...
          </span>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return <LockScreen />;
  }

  return (
    <VaultProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<DashboardView />} />
            <Route path="accounts" element={<AccountsView />} />
            <Route path="transactions" element={<TransactionsView />} />
            <Route path="people" element={<PeopleLedgerView />} />
            <Route path="plans" element={<PlansView />} />
            <Route path="budgets" element={<BudgetsGoalsView />} />
            <Route path="assets" element={<AssetsLiabilitiesView />} />
            <Route path="reports" element={<ReportsView />} />
            <Route path="health-score" element={<HealthScoreView />} />
            <Route path="import" element={<ImportView />} />
            <Route path="documents" element={<DocumentsView />} />
            <Route path="family" element={<FamilyOverviewView />} />
            <Route path="settings" element={<SettingsView />} />
            <Route path="security-privacy" element={<SecurityPrivacyView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </VaultProvider>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PrivacyProvider>
          <AuthenticatedApp />
        </PrivacyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
