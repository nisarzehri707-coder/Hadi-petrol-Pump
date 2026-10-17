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
import { formatPKR } from '../utils/formatters';

export const Header = () => {
  const { data, isOnline, activeTab, setActiveTab, currentUser, logout, language, toggleLanguage } = useApp();
  const { station, rates } = data;
  const isUrdu = language === 'ur';
  const isOwner = currentUser?.role === 'owner';

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
      className="sticky top-0 z-40 px-3 md:px-6 py-2.5 shadow-sm"
      style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">

        {/* Left: Station Identity */}
        <div
          onClick={() => isOwner && setActiveTab('settings')}
          className={`flex items-center gap-2.5 flex-shrink-0 ${isOwner ? 'cursor-pointer' : ''}`}
          title={isOwner ? 'Station Settings' : station.name}
        >
          {/* Logo */}
          <div
            className="relative w-9 h-9 md:w-10 md:h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: 'var(--color-primary)', boxShadow: '0 2px 8px rgba(4,120,87,0.25)' }}
          >
            {station.logo ? (
              <img src={station.logo} alt={station.name} className="w-full h-full object-cover" />
            ) : (
              <Fuel className="w-5 h-5 text-white" />
            )}
          </div>

          {/* Titles */}
          <div className="min-w-0">
            <h1
              className="text-sm md:text-base font-bold tracking-tight truncate leading-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {station.name}
            </h1>
            <p className="text-[11px] font-urdu truncate leading-tight" style={{ color: 'var(--color-accent)' }}>
              {isUrdu ? `مالک: ${station.owner}` : `Prop: ${station.owner}`}
            </p>
          </div>
        </div>

        {/* Center: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-0.5 p-1 rounded-xl"
             style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          {navLinks.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all"
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

        {/* Right: Controls */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: 'var(--color-accent-light)',
              color: 'var(--color-primary)',
              border: '1px solid #A7F3D0',
            }}
            title={isUrdu ? 'Switch to English' : 'اردو زبان'}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{isUrdu ? 'ENG' : 'اردو'}</span>
          </button>

          {/* Live Fuel Rates — desktop only */}
          <div
            className="hidden lg:flex items-center gap-2.5 text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-primary)' }} />
              <span className="font-urdu" style={{ color: 'var(--color-text-secondary)' }}>
                {isUrdu ? 'پٹرول:' : 'Petrol:'}
              </span>
              <span className="font-bold font-mono" style={{ color: 'var(--color-primary)' }}>
                {formatPKR(rates.petrol.selling)}
              </span>
            </div>
            <span className="w-px h-3" style={{ background: 'var(--color-border)' }} />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-diesel)' }} />
              <span className="font-urdu" style={{ color: 'var(--color-text-secondary)' }}>
                {isUrdu ? 'ڈیزل:' : 'Diesel:'}
              </span>
              <span className="font-bold font-mono" style={{ color: 'var(--color-diesel)' }}>
                {formatPKR(rates.diesel.selling)}
              </span>
            </div>
          </div>

          {/* Online / Offline indicator */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase"
            style={{
              background: isOnline ? 'var(--color-success-light)' : 'var(--color-error-light)',
              color: isOnline ? 'var(--color-success)' : 'var(--color-error)',
              border: isOnline ? '1px solid #6EE7B7' : '1px solid #FECACA',
            }}
          >
            {isOnline ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--color-success)' }} />
                <span className="hidden sm:inline font-urdu">{isUrdu ? 'آن لائن' : 'Live'}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span className="hidden sm:inline font-urdu">{isUrdu ? 'آف لائن' : 'Offline'}</span>
              </>
            )}
          </div>

          {/* User Badge */}
          {currentUser && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
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
              <span className="font-semibold truncate max-w-[110px]">{currentUser.name}</span>
            </div>
          )}

          {/* Logout */}
          {currentUser && (
            <button
              onClick={logout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'var(--color-error-light)',
                color: 'var(--color-error)',
                border: '1px solid #FECACA',
              }}
              title={isUrdu ? 'لاگ آؤٹ' : 'Logout'}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-urdu">{isUrdu ? 'لاگ آؤٹ' : 'Logout'}</span>
            </button>
          )}

          {/* Mobile Settings Button */}
          <button
            onClick={() => setActiveTab('settings')}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center transition-all"
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

      {/* Mobile Rate Ticker */}
      <div
        className="lg:hidden mt-2 pt-2 flex items-center justify-between text-xs px-0.5"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-primary)' }} />
          <span className="font-urdu" style={{ color: 'var(--color-text-secondary)' }}>
            {isUrdu ? 'پٹرول:' : 'Petrol:'}
          </span>
          <span className="font-bold font-mono" style={{ color: 'var(--color-primary)' }}>
            {formatPKR(rates.petrol.selling)}
          </span>
        </div>
        <span className="w-px h-3 mx-1" style={{ background: 'var(--color-border)' }} />
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-diesel)' }} />
          <span className="font-urdu" style={{ color: 'var(--color-text-secondary)' }}>
            {isUrdu ? 'ڈیزل:' : 'Diesel:'}
          </span>
          <span className="font-bold font-mono" style={{ color: 'var(--color-diesel)' }}>
            {formatPKR(rates.diesel.selling)}
          </span>
        </div>
        <span className="w-px h-3 mx-1" style={{ background: 'var(--color-border)' }} />
        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {isUrdu ? 'فیول اسٹیشن' : 'Fuel Station'}
        </span>
      </div>
    </header>
  );
};
