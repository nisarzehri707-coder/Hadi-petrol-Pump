import React from 'react';
import { Fuel, AlertTriangle, ArrowUpRight, Droplets } from 'lucide-react';
import { formatLitres, formatPKR } from '../utils/formatters';

export const TankGauge = ({ fuelType, tankData, rateData, onAddStock }) => {
  const isPetrol = fuelType === 'petrol';
  const { name, currentStock, capacity, minAlert } = tankData;
  const percentage = Math.min(100, Math.max(0, (currentStock / capacity) * 100));
  const isLowStock = currentStock <= minAlert;

  const accent = isPetrol ? 'var(--color-primary)' : 'var(--color-diesel)';
  const accentLight = isPetrol ? 'var(--color-petrol-light)' : 'var(--color-diesel-light)';
  const fillColor = isPetrol
    ? 'linear-gradient(90deg, #059669, #10B981)'
    : 'linear-gradient(90deg, #D97706, #F59E0B)';

  return (
    <div
      className="card p-4 transition-all"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg" style={{ background: accentLight }}>
            <Fuel className="w-5 h-5" style={{ color: accent }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{name}</h3>
              {isLowStock && (
                <span
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold animate-pulse"
                  style={{ background: 'var(--color-error-light)', color: 'var(--color-error)' }}
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Low Stock
                </span>
              )}
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              Capacity: {formatLitres(capacity)}
            </p>
          </div>
        </div>

        {/* Rate Badge */}
        <div className="text-right">
          <span
            className="inline-block px-2 py-0.5 rounded-md text-xs font-mono font-bold"
            style={{ background: accentLight, color: accent }}
          >
            {formatPKR(rateData?.selling || 0)}/L
          </span>
          <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--color-text-muted)' }}>
            Cost: {formatPKR(rateData?.purchase || 0)}
          </p>
        </div>
      </div>

      {/* Volume & Percentage */}
      <div className="flex items-baseline justify-between my-2">
        <div>
          <span className="text-2xl font-bold font-mono" style={{ color: 'var(--color-text-primary)' }}>
            {formatLitres(currentStock)}
          </span>
          <span className="text-xs ml-1.5" style={{ color: 'var(--color-text-muted)' }}>remaining</span>
        </div>
        <div className="font-mono text-sm font-bold" style={{ color: accent }}>
          {percentage.toFixed(1)}%
        </div>
      </div>

      {/* Progress Bar */}
      <div
        className="relative h-3 w-full rounded-full overflow-hidden my-2"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${percentage}%`, background: fillColor }}
        />
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-2.5 text-xs"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
          <Droplets className="w-3.5 h-3.5" />
          <span>Alert below {formatLitres(minAlert)}</span>
        </div>

        <button
          onClick={() => onAddStock(fuelType)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95"
          style={{ background: accentLight, color: accent, border: `1px solid ${accentLight}` }}
        >
          <span>+ Add Stock</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
