import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  WalletCards, Plus, Trash2, Coffee, Zap, Wrench, FileText,
  Coins, Calendar, CheckCircle2, AlertCircle, Car, ShieldAlert,
  Truck, Search, Filter
} from 'lucide-react';
import { formatPKR, formatDateTime } from '../utils/formatters';

const Stat = ({ label, value, color, sub }) => (
  <div className="stat-card flex flex-col justify-between" style={{ borderLeftColor: color }}>
    <span className="text-xs font-semibold uppercase font-urdu"
          style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
    <span className="text-lg md:text-xl font-bold font-mono mt-1 truncate" style={{ color }}>{value}</span>
    {sub && <span className="text-[10px] font-urdu mt-0.5 hidden sm:block"
                  style={{ color: 'var(--color-text-muted)' }}>{sub}</span>}
  </div>
);

export const DailyExpensesView = () => {
  const { data, addExpense, deleteExpense, todayExpenses, todayCashCollected, todayNetCash, language, activeLoads = [] } = useApp();
  const { expenses = [] } = data;
  const isUrdu = language === 'ur';

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Staff Food & Tea');
  const [paidTo, setPaidTo] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedLoadId, setSelectedLoadId] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = [
    { id: 'Staff Food & Tea',      labelUr: 'اسٹاف چائے و کھانا',  labelEn: 'Staff Tea & Food',    icon: Coffee },
    { id: 'Generator Fuel',        labelUr: 'جنریٹر ڈیزل و آئل',   labelEn: 'Generator Fuel',      icon: Zap },
    { id: 'Vehicle Rent',          labelUr: 'گاڑی کرایہ / فریٹ',   labelEn: 'Vehicle Rent (Load)', icon: Truck },
    { id: 'Police / Checkpoint',   labelUr: 'پولیس / چیک پوسٹ',    labelEn: 'Police Clearance',    icon: ShieldAlert },
    { id: 'Driver Expense',        labelUr: 'ڈرائیور بھتہ / خرچہ', labelEn: 'Driver Expense',      icon: Car },
    { id: 'Maintenance',           labelUr: 'پمپ و مشین مرمت',     labelEn: 'Maintenance',         icon: Wrench },
    { id: 'General Misc',          labelUr: 'متفرق اخراجات',        labelEn: 'Miscellaneous',       icon: FileText },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!numAmt || numAmt <= 0) {
      alert(isUrdu ? 'براہ کرم خرچے کی رقم درج کریں' : 'Please enter a valid expense amount');
      return;
    }
    addExpense({
      category, amount: numAmt,
      paidTo: paidTo.trim() || (isUrdu ? 'نقد خرچہ' : 'Cash Expense'),
      notes: notes.trim(),
      loadId: selectedLoadId || null
    });
    setAmount(''); setPaidTo(''); setNotes(''); setSelectedLoadId('');
  };

  const filteredExpenses = expenses.filter(e => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (e.category || '').toLowerCase().includes(q)
          || (e.paidTo || '').toLowerCase().includes(q)
          || (e.notes || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-5 pb-20 w-full min-w-0 max-w-5xl mx-auto animate-fade-in-up">

      {/* Header */}
      <div className="flex items-center gap-2">
        <WalletCards className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-error)' }} />
        <div>
          <h2 className="text-lg font-bold font-urdu" style={{ color: 'var(--color-text-primary)' }}>
            {isUrdu ? 'روزانہ اخراجات' : 'Daily Station Expenses'}
          </h2>
          <p className="text-xs font-urdu" style={{ color: 'var(--color-text-muted)' }}>
            {isUrdu ? 'چائے، جنریٹر، گاڑی کرایہ، پولیس، اور لوڈ اخراجات' : 'Track staff, maintenance, load & operational costs'}
          </p>
        </div>
      </div>

      {/* Financial Snapshot */}
      <div className="grid grid-cols-3 gap-2.5 md:gap-4">
        <Stat
          label={isUrdu ? 'کل موصول کیش' : 'Today Cash'}
          value={formatPKR(todayCashCollected)}
          color="var(--color-accent)"
          sub={isUrdu ? 'فروخت و ریکوری سے' : 'Sales & Recoveries'}
        />
        <Stat
          label={isUrdu ? 'آج کا کل خرچہ' : 'Today Expenses'}
          value={formatPKR(todayExpenses)}
          color="var(--color-error)"
          sub={isUrdu ? 'دراز سے منہا' : 'Deducted from drawer'}
        />
        <Stat
          label={isUrdu ? 'دراز میں باقی کیش' : 'Net Cash in Drawer'}
          value={formatPKR(todayNetCash)}
          color="var(--color-success)"
          sub={isUrdu ? 'کیش ان ہینڈ' : 'Reconciled in Drawer'}
        />
      </div>

      {/* Expense Entry Form */}
      <form onSubmit={handleSubmit} className="card p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between pb-3"
             style={{ borderBottom: '1px solid var(--color-border)' }}>
          <span className="text-sm font-bold font-urdu" style={{ color: 'var(--color-text-primary)' }}>
            {isUrdu ? 'نیا خرچہ درج کریں' : 'Record New Expense'}
          </span>
          <span className="text-xs badge badge-error font-urdu">
            {isUrdu ? 'دراز سے منہا' : 'Auto-deducted'}
          </span>
        </div>

        {/* Category Chips */}
        <div>
          <label className="form-label font-urdu">
            {isUrdu ? 'خرچے کی قسم:' : 'Category:'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className="flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all font-urdu"
                  style={{
                    background: isSelected ? 'var(--color-error-light)' : 'var(--color-surface-2)',
                    borderColor: isSelected ? '#FECACA' : 'var(--color-border)',
                    color: isSelected ? 'var(--color-error)' : 'var(--color-text-secondary)',
                    fontWeight: isSelected ? 700 : 500,
                  }}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{isUrdu ? cat.labelUr : cat.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Load Link */}
        {activeLoads.length > 0 && (
          <div>
            <label className="form-label font-urdu" style={{ color: 'var(--color-warning)' }}>
              {isUrdu ? 'لوڈ ٹرپ سے جوڑیں (اختیاری):' : 'Attach to Load Trip (Optional):'}
            </label>
            <select
              value={selectedLoadId}
              onChange={(e) => setSelectedLoadId(e.target.value)}
              className="form-input mt-1 font-mono text-xs"
            >
              <option value="">-- General Station Expense --</option>
              {activeLoads.map(load => (
                <option key={load.id} value={load.id}>
                  {load.id} ({load.vehicleType} - {load.vehicleNo} · {load.fuelType?.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="form-label font-urdu" style={{ color: 'var(--color-error)' }}>
            {isUrdu ? 'رقم (روپے) *' : 'Amount (PKR) *'}
          </label>
          <input
            type="number" inputMode="numeric" step="1" required
            placeholder="e.g. 3500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="form-input mt-1 text-lg font-mono font-bold"
            style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)', background: '#FFF5F5' }}
          />
        </div>

        {/* Paid To + Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="form-label font-urdu">
              {isUrdu ? 'کس کو دیے؟' : 'Paid To / Person'}
            </label>
            <input
              type="text"
              placeholder={isUrdu ? 'مثال: ڈرائیور یا ہوٹل' : 'e.g. Driver / Checkpoint / Hotel'}
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              className="form-input mt-1 text-sm"
            />
          </div>
          <div>
            <label className="form-label font-urdu">
              {isUrdu ? 'تفصیل' : 'Notes / Description'}
            </label>
            <input
              type="text"
              placeholder={isUrdu ? 'مثال: رات کی شفٹ چائے' : 'e.g. Night shift tea'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input mt-1 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 font-urdu"
          style={{ background: 'var(--color-error)', boxShadow: '0 4px 12px rgba(220,38,38,0.2)' }}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isUrdu ? 'خرچہ محفوظ کریں اور کیش سے منہا کریں' : 'Save Expense & Deduct from Cash'}</span>
        </button>
      </form>

      {/* Expenses Log */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-sm font-bold font-urdu flex items-center gap-1.5"
                style={{ color: 'var(--color-text-primary)' }}>
            <Coins className="w-4 h-4" style={{ color: 'var(--color-error)' }} />
            {isUrdu ? 'اخراجات کی تاریخ' : 'Expenses History'}
          </span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="form-input py-1.5 pl-7 pr-3 text-xs w-40"
              />
              <Search className="w-3 h-3 absolute left-2.5 top-2.5" style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="form-input py-1.5 text-xs w-auto"
            >
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.labelEn}</option>)}
            </select>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Coins className="w-6 h-6" /></div>
              <p className="text-sm font-urdu" style={{ color: 'var(--color-text-muted)' }}>
                {isUrdu ? 'کوئی خرچہ ریکارڈ نہیں ملا' : 'No expenses matching current filter.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {filteredExpenses.map((exp, i) => (
              <div
                key={exp.id}
                className="flex items-center justify-between gap-3 px-4 py-3.5 transition-all hover:bg-gray-50"
                style={{ borderBottom: i < filteredExpenses.length - 1 ? '1px solid var(--color-border)' : 'none' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg flex-shrink-0"
                       style={{ background: 'var(--color-error-light)', color: 'var(--color-error)' }}>
                    <Coins className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold font-urdu" style={{ color: 'var(--color-text-primary)' }}>
                        {exp.category}
                      </span>
                      {exp.paidTo && (
                        <span className="badge badge-neutral">{exp.paidTo}</span>
                      )}
                      {exp.loadId && (
                        <span className="badge badge-warning font-mono">Load: {exp.loadId}</span>
                      )}
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {exp.notes ? `${exp.notes} · ` : ''}{formatDateTime(exp.date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono font-bold text-sm" style={{ color: 'var(--color-error)' }}>
                    −{formatPKR(exp.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete this expense (−${formatPKR(exp.amount)})?`)) deleteExpense(exp.id);
                    }}
                    className="p-1.5 rounded-lg transition-all active:scale-95"
                    style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}
                    title={isUrdu ? 'حذف کریں' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
