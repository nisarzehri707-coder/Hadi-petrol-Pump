import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Fuel,
  WifiOff,
  Settings,
  LogOut,
  User,
  ShieldCheck,
  LayoutDashboard,
  Truck,
  BookOpenCheck,
  BarChart3,
  Sliders,
  Languages,
  WalletCards,
  Wifi,
} from 'lucide-react';
import { formatPKR, formatLitres } from '../utils/formatters';

export const Header = () => {
  const { data, isOnline, activeTab, setActiveTab, currentUser, logout, language, toggleLanguage } = useApp();
  const { station = {}, rates = {}, tanks = {} } = data || {};
  const isUrdu = language === 'ur';
  const isOwner = currentUser?.role === 'owner';

  const stationName = isUrdu ? (station.nameUrdu || 'ہادی پیٹرولیم سروس') : (station.name || 'HADI PETROL PUMP');
  const ownerName = isUrdu ? (station.ownerUrdu || 'تنویر زہری') : (station.owner || 'Tanveer Zehri');

  const allNavLinks = [
    { id: 'dashboard', labelEn: 'Home',           labelUr: 'ہوم',          icon: LayoutDashboard },
    { id: 'sale',      labelEn: 'Sale & Bulk',     labelUr: 'سیل و بلک',   icon: Fuel },
    { id: 'stock',     labelEn: 'Fuel Loads',      labelUr: 'گاڑی لوڈز',   icon: Truck,       ownerOnly: true },
    { id: 'khata',     labelEn: 'Khata',           labelUr: 'ادھار کھاتہ', icon: BookOpenCheck },
    { id: 'expenses',  labelEn: 'Expenses',        labelUr: 'روزنامچہ',    icon: WalletCards },
    { id: 'summary',   labelEn: 'Reports & Audit', labelUr: 'حساب و آڈٹ', icon: BarChart3,    ownerOnly: true },
    { id: 'settings',  labelEn: 'Settings',        labelUr: 'سیٹنگز',      icon: Sliders,     ownerOnly: true },
  ];

  const navLinks = allNavLinks.filter(tab => !tab.ownerOnly || isOwner);

  return (
    <header
      className="sticky top-0 z-40 px-3 md:px-6 py-2 shadow-sm"
      style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 lg:gap-4">

        {/* Start: Station Identity */}
        <div
          onClick={() => isOwner && setActiveTab('settings')}
          className={`flex items-center gap-2 flex-shrink-0 ${isOwner ? 'cursor-pointer' : ''}`}
          title={isOwner ? (isUrdu ? 'اسٹیشن سیٹنگز' : 'Station Settings') : stationName}
        >
          {/* Logo */}
          <div
            className="w-9 h-9 md:w-10 md:h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm"
            style={{ background: 'var(--color-primary)' }}
          >
            {station.logo ? (
              <img src={station.logo} alt={stationName} className="w-full h-full object-cover" />
            ) : (
              <Fuel className="w-5 h-5 text-white" />
            )}
          </div>

          {/* Titles */}
          <div className="min-w-0">
            <h1
              className="text-xs sm:text-sm md:text-base font-bold tracking-tight truncate leading-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {stationName}
            </h1>
            <p className="text-[11px] font-urdu truncate leading-tight" style={{ color: 'var(--color-accent)' }}>
              {isUrdu ? `مالک: ${ownerName}` : `Prop: ${ownerName}`}
            </p>
          </div>
        </div>

        {/* Center: Desktop Navigation */}
        <nav
          className="hidden md:flex items-center gap-0.5 lg:gap-1 p-1 rounded-xl flex-shrink min-w-0 overflow-x-auto no-scrollbar"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          {navLinks.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-2 lg:px-2.5 xl:px-3 py-1.5 rounded-lg text-xs transition-all flex-shrink-0"
                style={{
                  background: isActive ? 'var(--color-surface)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  boxShadow: isActive ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-urdu whitespace-nowrap">{isUrdu ? tab.labelUr : tab.labelEn}</span>
              </button>
            );
          })}
        </nav>

        {/* End: Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 shadow-sm"
            style={{
              background: 'var(--color-accent-light)',
              color: 'var(--color-primary)',
              border: '1px solid #A7F3D0',
            }}
            title={isUrdu ? 'Switch to English' : 'اردو زبان منتخب کریں'}
          >
            <Languages className="w-3.5 h-3.5 flex-shrink-0" />
            <span className={isUrdu ? 'font-sans' : 'font-urdu'}>{isUrdu ? 'English' : 'اردو'}</span>
          </button>

          {/* Online / Offline indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex-shrink-0"
            style={{
              background: isOnline ? 'var(--color-success-light)' : 'var(--color-error-light)',
              color: isOnline ? 'var(--color-success)' : 'var(--color-error)',
              border: isOnline ? '1px solid #6EE7B7' : '1px solid #FECACA',
            }}
          >
            {isOnline ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--color-success)' }} />
                <span className="font-urdu whitespace-nowrap">{isUrdu ? 'آن لائن' : 'Live'}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 flex-shrink-0" />
                <span className="font-urdu whitespace-nowrap">{isUrdu ? 'آف لائن' : 'Offline'}</span>
              </>
            )}
          </div>

          {/* User Badge */}
          {currentUser && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs flex-shrink-0"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
              }}
            >
              {currentUser.role === 'owner' ? (
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              ) : (
                <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-warning)' }} />
              )}
              <span className="font-semibold truncate max-w-[85px] lg:max-w-[120px]">{currentUser.name}</span>
            </div>
          )}

          {/* Logout */}
          {currentUser && (
            <button
              onClick={logout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
              style={{
                background: 'var(--color-error-light)',
                color: 'var(--color-error)',
                border: '1px solid #FECACA',
              }}
              title={isUrdu ? 'لاگ آؤٹ' : 'Logout'}
            >
              <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden xl:inline font-urdu">{isUrdu ? 'لاگ آؤٹ' : 'Logout'}</span>
            </button>
          )}

          {/* Mobile Settings Button */}
          <button
            onClick={() => setActiveTab('settings')}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fuel Rates & Storage Tank Balance Strip */}
      <div
        className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs flex-wrap"
      >
        {/* Live Selling Rates */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-primary)' }} />
            <span className="font-urdu" style={{ color: 'var(--color-text-secondary)' }}>
              {isUrdu ? 'پٹرول ریٹ:' : 'Petrol:'}
            </span>
            <span className="font-bold font-mono text-emerald-800" dir="ltr">
              {formatPKR(rates?.petrol?.selling || 0)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-200">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-diesel)' }} />
            <span className="font-urdu" style={{ color: 'var(--color-text-secondary)' }}>
              {isUrdu ? 'ڈیزل ریٹ:' : 'Diesel:'}
            </span>
            <span className="font-bold font-mono text-amber-800" dir="ltr">
              {formatPKR(rates?.diesel?.selling || 0)}
            </span>
          </div>
        </div>

        {/* Live Storage Tank Balances */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200">
            <Fuel className="w-3 h-3 text-emerald-600 flex-shrink-0" />
            <span className="font-urdu text-slate-500">{isUrdu ? 'پٹرول اسٹاک:' : 'Petrol Tank:'}</span>
            <span className="font-bold font-mono text-slate-800" dir="ltr">
              {formatLitres(tanks?.petrol?.currentStock || 0)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200">
            <Fuel className="w-3 h-3 text-amber-600 flex-shrink-0" />
            <span className="font-urdu text-slate-500">{isUrdu ? 'ڈیزل اسٹاک:' : 'Diesel Tank:'}</span>
            <span className="font-bold font-mono text-slate-800" dir="ltr">
              {formatLitres(tanks?.diesel?.currentStock || 0)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
