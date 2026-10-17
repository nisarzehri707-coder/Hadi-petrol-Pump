import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Fuel,
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  ArrowRight,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import { formatPKR } from '../utils/formatters';

export const LoginView = () => {
  const { data, login, isOnline } = useApp();
  const { station = {}, rates = {}, tanks = {} } = data || {};
  const tanksList = Array.isArray(tanks)
    ? tanks
    : (tanks && typeof tanks === 'object')
      ? Object.values(tanks)
      : [];

  const [selectedRole, setSelectedRole] = useState('owner');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!pin) return;
    setIsLoading(true);
    setTimeout(() => {
      login(selectedRole, pin);
      setIsLoading(false);
    }, 200);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 font-sans overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Subtle background accent */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none opacity-40"
        style={{ background: 'radial-gradient(circle, #D1FAE5, transparent)', filter: 'blur(60px)' }}
      />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10 items-stretch">

        {/* Left: Station Info Panel — Desktop only */}
        <div
          className="hidden lg:flex lg:col-span-5 rounded-2xl p-8 flex-col justify-between"
          style={{
            background: 'var(--color-primary)',
            boxShadow: '0 8px 32px rgba(4,120,87,0.25)',
          }}
        >
          <div className="space-y-6">
            {/* Logo & Station Name */}
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center shadow-lg"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                {station.logo ? (
                  <img src={station.logo} alt={station.name} className="w-full h-full object-cover" />
                ) : (
                  <Fuel className="w-7 h-7 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight uppercase leading-tight">
                  {station.name}
                </h1>
                <p className="text-sm text-emerald-200 mt-0.5">Prop: {station.owner}</p>
              </div>
            </div>

            <p className="text-sm text-emerald-100 leading-relaxed opacity-90">
              Official station control and accounting system — fuel dispatch, tanker loads, and customer ledgers.
            </p>

            {/* Live Fuel Rates */}
            <div className="space-y-3 pt-1">
              <div
                className="p-3.5 rounded-xl flex items-center justify-between"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse-dot" />
                  <span className="text-sm text-white font-semibold">Super Petrol</span>
                </div>
                <span className="text-sm font-bold font-mono text-white">
                  {rates?.petrol?.selling ? `${formatPKR(rates.petrol.selling)}/L` : '—'}
                </span>
              </div>
              <div
                className="p-3.5 rounded-xl flex items-center justify-between"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full animate-pulse-dot"
                        style={{ background: 'var(--color-warning)' }} />
                  <span className="text-sm text-white font-semibold">High-Speed Diesel</span>
                </div>
                <span className="text-sm font-bold font-mono" style={{ color: '#FDE68A' }}>
                  {rates?.diesel?.selling ? `${formatPKR(rates.diesel.selling)}/L` : '—'}
                </span>
              </div>

              {/* Tank Stock Preview */}
              {tanksList.slice(0, 2).map((tank, idx) => (
                <div key={tank.id || tank.name || idx}
                     className="p-3 rounded-xl flex items-center justify-between"
                     style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <span className="text-xs text-emerald-100">{tank.name}</span>
                  <span className="text-xs font-bold text-white font-mono">
                    {Number(tank.currentStock || 0).toLocaleString()} L
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom status */}
          <div className="pt-5 mt-4 flex items-center justify-between text-xs"
               style={{ borderTop: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}>
            <span className="flex items-center gap-1.5">
              {isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-dot" />
                  <span className="text-white font-semibold">Live Synchronized</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline Ready</span>
                </>
              )}
            </span>
            <span>PWA v4.0</span>
          </div>
        </div>

        {/* Right: Login Card */}
        <div
          className="lg:col-span-7 rounded-2xl p-6 md:p-8 flex flex-col justify-between"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 24px rgba(15,23,42,0.08)',
          }}
        >
          <div>
            {/* Mobile branding */}
            <div
              className="flex lg:hidden items-center gap-3 mb-6 pb-5"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div
                className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ background: 'var(--color-primary)' }}
              >
                {station.logo ? (
                  <img src={station.logo} alt={station.name} className="w-full h-full object-cover" />
                ) : (
                  <Fuel className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold tracking-tight uppercase truncate"
                    style={{ color: 'var(--color-text-primary)' }}>
                  {station.name}
                </h2>
                <p className="text-xs font-medium truncate" style={{ color: 'var(--color-accent)' }}>
                  Prop: {station.owner}
                </p>
              </div>
            </div>

            {/* Title */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
                Sign In to Portal
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Select your role and enter security PIN
              </p>
            </div>

            {/* Role Switcher */}
            <div
              className="grid grid-cols-2 p-1.5 rounded-xl gap-1 mb-6"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            >
              <button
                type="button"
                onClick={() => { setSelectedRole('owner'); setPin(''); }}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-semibold text-sm transition-all active:scale-97"
                style={{
                  background: selectedRole === 'owner' ? 'var(--color-surface)' : 'transparent',
                  color: selectedRole === 'owner' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  boxShadow: selectedRole === 'owner' ? '0 1px 3px rgba(15,23,42,0.1)' : 'none',
                  fontWeight: selectedRole === 'owner' ? 700 : 500,
                }}
              >
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>Owner / Admin</span>
              </button>
              <button
                type="button"
                onClick={() => { setSelectedRole('operator'); setPin(''); }}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-semibold text-sm transition-all active:scale-97"
                style={{
                  background: selectedRole === 'operator' ? 'var(--color-surface)' : 'transparent',
                  color: selectedRole === 'operator' ? 'var(--color-diesel)' : 'var(--color-text-secondary)',
                  boxShadow: selectedRole === 'operator' ? '0 1px 3px rgba(15,23,42,0.1)' : 'none',
                  fontWeight: selectedRole === 'operator' ? 700 : 500,
                }}
              >
                <User className="w-4 h-4 flex-shrink-0" />
                <span>Shift Attendant</span>
              </button>
            </div>

            {/* PIN Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="form-label flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
                    <span>
                      {selectedRole === 'owner' ? 'Owner Security PIN' : 'Staff Passcode'}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-xs font-medium hover:underline"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {showPin ? 'Hide' : 'Show'}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    required
                    autoFocus
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="form-input text-lg font-mono font-bold tracking-widest pr-10"
                    style={{ padding: '12px 42px 12px 14px', height: '52px' }}
                  />
                  <Lock className="w-4 h-4 absolute right-3.5 top-4"
                        style={{ color: 'var(--color-text-muted)' }} />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !pin}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 mt-1"
                style={{
                  background: pin
                    ? (selectedRole === 'owner' ? 'var(--color-primary)' : '#D97706')
                    : 'var(--color-surface-2)',
                  color: pin ? '#fff' : 'var(--color-text-muted)',
                  cursor: pin ? 'pointer' : 'not-allowed',
                  boxShadow: pin ? '0 4px 16px rgba(4,120,87,0.25)' : 'none',
                  border: pin ? 'none' : '1px solid var(--color-border)',
                }}
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>
                      Sign In as {selectedRole === 'owner' ? 'Owner' : 'Attendant'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer info */}
          <div
            className="mt-8 pt-4 flex items-center justify-between text-xs"
            style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            <span>{station.owner} · {station.address || 'Highway Bypass'}</span>
            <span>Hadi Petrol Pump v4.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
