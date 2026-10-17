import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Fuel,
  Truck,
  BookOpenCheck,
  WalletCards,
  BarChart3,
} from 'lucide-react';

export const BottomNav = () => {
  const { activeTab, setActiveTab, language, currentUser } = useApp();
  const isUrdu = language === 'ur';
  const isOwner = currentUser?.role === 'owner';

  const allNavItems = [
    { id: 'dashboard', labelEn: 'Home',    labelUr: 'ہوم',    icon: LayoutDashboard },
    { id: 'sale',      labelEn: 'Sale',    labelUr: 'سیل',    icon: Fuel },
    { id: 'khata',     labelEn: 'Khata',  labelUr: 'کھاتہ',  icon: BookOpenCheck },
    { id: 'stock',     labelEn: 'Loads',  labelUr: 'لوڈز',   icon: Truck,   ownerOnly: true },
    { id: 'expenses',  labelEn: 'Expenses',labelUr: 'خرچہ',  icon: WalletCards },
    { id: 'summary',   labelEn: 'Reports', labelUr: 'حساب',  icon: BarChart3, ownerOnly: true },
  ];

  const navItems = allNavItems.filter(item => !item.ownerOnly || isOwner);
  const cols = navItems.length;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        boxShadow: '0 -4px 16px rgba(15,23,42,0.08)',
      }}
    >
      <div
        className="max-w-md mx-auto px-1 py-1 pb-safe"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (navigator.vibrate) navigator.vibrate(10);
              }}
              className="relative flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all active:scale-90"
              style={{
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
              }}
            >
              {/* Active pill indicator */}
              {isActive && (
                <div
                  className="absolute top-0.5 w-8 h-7 rounded-xl -z-10"
                  style={{ background: 'var(--color-accent-light)' }}
                />
              )}

              <Icon className="w-5 h-5" />

              <span
                className="text-[10px] font-urdu leading-tight mt-0.5 truncate max-w-full"
                style={{
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                }}
              >
                {isUrdu ? item.labelUr : item.labelEn}
              </span>

              {isActive && (
                <span
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ background: 'var(--color-primary)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
