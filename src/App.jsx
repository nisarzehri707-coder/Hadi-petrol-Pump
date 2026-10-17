import React from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { ReceiptModal } from './components/ReceiptModal';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { SaleShiftView } from './views/SaleShiftView';
import { StockPurchaseView } from './views/StockPurchaseView';
import { KhataView } from './views/KhataView';
import { DailyExpensesView } from './views/DailyExpensesView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { CheckCircle2, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

export const App = () => {
  const { data, activeTab, setActiveTab, toast, isOnline, currentUser, language } = useApp();
  const station = data?.station || { name: 'HADI PETROL PUMP' };
  const isUrdu = language === 'ur';

  // If user is not logged in, render the login portal
  if (!currentUser) {
    return (
      <>
        <LoginView />
        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4">
            <div className={`p-3.5 rounded-xl shadow-xl flex items-center gap-2.5 border text-sm font-semibold ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              )}
              <span className="flex-1 leading-tight font-urdu">{toast.message}</span>
            </div>
          </div>
        )}
      </>
    );
  }

  const renderActiveView = () => {
    const isOwner = currentUser?.role === 'owner';
    if (!isOwner && (activeTab === 'settings' || activeTab === 'summary' || activeTab === 'stock')) {
      return (
        <div className="max-w-md mx-auto my-12">
          <div className="card p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-7 h-7 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Owner Authorization Required</h3>
              <p className="text-sm text-gray-500 mt-1 font-urdu leading-relaxed">
                {isUrdu
                  ? 'یہ سیکشن صرف اسٹیشن مالک کے لیے مخصوص ہے۔'
                  : 'This section is restricted to the Station Owner / Admin.'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('sale')}
              className="btn-primary w-full"
            >
              {isUrdu ? 'سیل پر واپس جائیں' : 'Return to Sales'}
            </button>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'sale':      return <SaleShiftView />;
      case 'stock':     return <StockPurchaseView />;
      case 'khata':     return <KhataView />;
      case 'expenses':  return <DailyExpensesView />;
      case 'summary':   return <ReportsView />;
      case 'settings':  return <SettingsView />;
      default:          return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col font-sans overflow-x-hidden"
         style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
      
      {/* Offline Alert Strip */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Working offline — data saved locally until connection is restored.</span>
        </div>
      )}

      {/* Max-width shell */}
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col relative min-h-screen overflow-x-hidden">

        <Header />

        {/* Main content area */}
        <main className="flex-1 p-3 md:p-6 pb-24 md:pb-6 overflow-y-auto">
          {renderActiveView()}
        </main>

        {/* Footer */}
        <footer className="w-full border-t py-3 px-4 text-center text-xs mb-14 md:mb-0"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', background: 'var(--color-surface)' }}>
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
            <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {station.name} · Fuel Station Management System V4.0
            </span>
            <span>
              Developed by <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>Nisar</span>
            </span>
          </div>
        </footer>

        <BottomNav />
        <ReceiptModal />

        {/* Global Toast */}
        {toast && (
          <div className="fixed top-16 md:top-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4 animate-fade-in-up">
            <div className={`p-3.5 rounded-xl shadow-lg flex items-center gap-2.5 border text-sm font-semibold ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              )}
              <span className="flex-1 leading-tight font-urdu">{toast.message}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
