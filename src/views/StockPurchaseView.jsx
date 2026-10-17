import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Truck, 
  Fuel, 
  Plus, 
  CheckCircle2, 
  History, 
  Calendar, 
  DollarSign, 
  ShieldAlert, 
  FileText, 
  Car, 
  TrendingUp, 
  TrendingDown, 
  X, 
  Clock, 
  Receipt, 
  Eye, 
  Building2,
  BadgeCheck,
  Percent,
  PlusCircle,
  AlertTriangle
} from 'lucide-react';
import { formatPKR, formatLitres, formatDateTime, formatDate } from '../utils/formatters';

export const StockPurchaseView = () => {
  const { 
    data, 
    addLoad, 
    deleteLoad,
    generateLoadId,
    addLoadExpense, 
    deleteLoadExpense, 
    getLoadAudit, 
    activeLoads, 
    closedLoads, 
    rates, 
    tanks,
    language 
  } = useApp();

  const isUrdu = language === 'ur';
  const { loads = [] } = data;

  const [activeTabSub, setActiveTabSub] = useState('new_load'); // 'new_load' | 'load_audit'
  const [filterFuel, setFilterFuel] = useState('all'); // 'all' | 'diesel' | 'petrol'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'ACTIVE' | 'CLOSED'

  // Form State for New Load
  const [vehicleType, setVehicleType] = useState('Probox'); // 'Probox' | 'Zamyad' | 'Other'
  const [vehicleNo, setVehicleNo] = useState('');
  const [fuelType, setFuelType] = useState('diesel');
  const [litresReceived, setLitresReceived] = useState('1800'); // default Probox capacity
  const [purchaseRate, setPurchaseRate] = useState(String(data.rates?.diesel?.purchase || 266.00));
  const [supplierName, setSupplierName] = useState('Hub Terminal / Wholesale');
  const [driverName, setDriverName] = useState('');
  const [notes, setNotes] = useState('');

  // Initial Expenses list on new load
  const [expenses, setExpenses] = useState([
    { title: 'Vehicle Rent / Carriage', category: 'Vehicle Rent', amount: '12000', notes: '' },
    { title: 'Driver Expense / Bhatta', category: 'Driver Expense', amount: '3000', notes: '' },
    { title: 'Police / Checkpoint Clearance', category: 'Police / Checkpoint', amount: '4000', notes: '' }
  ]);

  // Modal State for Detailed Audit
  const [selectedAuditLoadId, setSelectedAuditLoadId] = useState(null);

  // New Expense inline form inside Audit Modal
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newExpCategory, setNewExpCategory] = useState('Police / Checkpoint');
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpNotes, setNewExpNotes] = useState('');

  // Preset capacity suggestions when vehicle type changes
  const handleVehicleTypeSelect = (type) => {
    setVehicleType(type);
    if (type === 'Probox') {
      setLitresReceived('1800');
    } else if (type === 'Zamyad') {
      setLitresReceived('2200');
    }
  };

  const handleFuelToggle = (type) => {
    setFuelType(type);
    const benchmark = type === 'petrol' ? rates.petrol.purchase : rates.diesel.purchase;
    setPurchaseRate(String(benchmark));
  };

  // Add an empty expense line to the new load form
  const handleAddExpenseRow = () => {
    setExpenses([...expenses, { title: '', category: 'General', amount: '', notes: '' }]);
  };

  const handleRemoveExpenseRow = (idx) => {
    setExpenses(expenses.filter((_, i) => i !== idx));
  };

  const handleUpdateExpenseRow = (idx, field, value) => {
    const updated = [...expenses];
    updated[idx][field] = value;
    if (field === 'category' && !updated[idx].title) {
      updated[idx].title = value;
    }
    setExpenses(updated);
  };

  // Derived Calculations for New Load Form
  const litres = parseFloat(litresReceived) || 0;
  const rate = parseFloat(purchaseRate) || 0;
  const totalCost = litres * rate;
  const totalExpensesSum = expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
  const totalInitialInvestment = totalCost + totalExpensesSum;
  const effectiveCostPerLitre = litres > 0 ? (totalInitialInvestment / litres) : rate;

  const handleSubmitLoad = (e) => {
    e.preventDefault();
    if (litres <= 0 || rate <= 0) {
      alert('Please enter valid Liters and Purchase Rate');
      return;
    }

    const cleanedExpenses = expenses
      .filter(e => parseFloat(e.amount) > 0)
      .map(e => ({
        title: e.title || e.category,
        category: e.category,
        amount: parseFloat(e.amount),
        notes: e.notes
      }));

    addLoad({
      vehicleType,
      vehicleNo: vehicleNo || (vehicleType === 'Probox' ? 'PROBOX TRIP' : 'ZAMYAD TRIP'),
      fuelType,
      litresReceived: litres,
      purchaseRate: rate,
      expenses: cleanedExpenses,
      supplierName,
      driverName,
      notes
    });

    // Reset Form
    setVehicleNo('');
    setDriverName('');
    setNotes('');
    setActiveTabSub('load_audit');
  };

  // Submit expense attached to open audit load
  const handleAttachExpenseToLoad = (e) => {
    e.preventDefault();
    const amt = parseFloat(newExpAmount);
    if (!amt || amt <= 0 || !selectedAuditLoadId) return;

    addLoadExpense({
      loadId: selectedAuditLoadId,
      title: newExpTitle || newExpCategory,
      category: newExpCategory,
      amount: amt,
      notes: newExpNotes
    });

    setNewExpAmount('');
    setNewExpTitle('');
    setNewExpNotes('');
    setShowAddExpenseModal(false);
  };

  // Filtered Loads for Audit List
  const filteredLoads = loads.filter(l => {
    if (filterFuel !== 'all' && l.fuelType !== filterFuel) return false;
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    return true;
  });

  // Selected load audit details
  const auditDetails = selectedAuditLoadId ? getLoadAudit(selectedAuditLoadId) : null;

  return (
    <div className="space-y-4 pb-20 w-full min-w-0 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Top Title & Context Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Car className="w-5 h-5 text-emerald-700" />
            <span>{isUrdu ? 'ایندھن آمد و لوڈ آڈٹ (پرو بکس / زامیاد)' : 'Fuel Procurement & Load Audit (Probox / Zamyad)'}</span>
          </h2>
          <p className="text-xs text-slate-500 font-urdu mt-0.5">
            {isUrdu 
              ? 'چھوٹی گاڑیوں کے ہر ٹرپ کا الگ لوڈ نمبر، اخراجات، اور مکمل منافع کھاتہ' 
              : 'Small vehicle loads tracking (max ~2000L), individual load expenses, and complete audit trail'}
          </p>
        </div>

        {/* Quick Active Loads Counter */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold font-mono">
            {activeLoads.length} Active Loads
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold font-mono">
            {closedLoads.length} Closed
          </span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold gap-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTabSub('new_load')}
          className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTabSub === 'new_load'
              ? 'bg-emerald-700 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{isUrdu ? '+ نیا لوڈ / ٹرپ درج کریں' : '+ Add New Load (Trip)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabSub('load_audit')}
          className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTabSub === 'load_audit'
              ? 'bg-emerald-700 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{isUrdu ? `لوڈز آڈٹ و ہسٹری (${loads.length})` : `Load Audit & History (${loads.length})`}</span>
        </button>
      </div>

      {/* VIEW 1: ADD NEW LOAD FORM */}
      {activeTabSub === 'new_load' && (
        <form onSubmit={handleSubmitLoad} className="space-y-4">
          
          {/* Card 1: Incoming Vehicle & Fuel Specs */}
          <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-700" />
                <span>1. Incoming Vehicle & Batch Trip Information</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold border border-slate-200">
                Auto Batch No: {generateLoadId ? generateLoadId(loads) : `LOAD-${new Date().getFullYear()}-${String(loads.length + 1).padStart(3, '0')}`}
              </span>
            </div>

            {/* Vehicle Type Selector (Probox / Zamyad / Other) */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-2 font-urdu">
                {isUrdu ? 'آنے والی چھوٹی گاڑی کی قسم:' : 'Incoming Vehicle Type:'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Probox', name: 'Probox', desc: 'Max ~2,000 Litres' },
                  { id: 'Zamyad', name: 'Zamyad', desc: 'Typical ~2,200 Litres' },
                  { id: 'Other', name: 'Other Vehicle', desc: 'Custom Small Tank' },
                ].map(v => {
                  const isSelected = vehicleType === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleVehicleTypeSelect(v.id)}
                      className={`p-3 rounded-xl border text-left transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-1 ring-emerald-600 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{v.name}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block truncate">{v.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid of Inputs: Vehicle No, Fuel Type, Liters, Purchase Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              
              {/* Vehicle Number */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. KHI-4920 / AFG-786"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 uppercase placeholder:text-slate-400"
                />
              </div>

              {/* Fuel Type Toggle */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 font-urdu">
                  {isUrdu ? 'تیل کی قسم:' : 'Fuel Type:'}
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleFuelToggle('diesel')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      fuelType === 'diesel'
                        ? 'bg-amber-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Diesel (HSD)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFuelToggle('petrol')}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      fuelType === 'petrol'
                        ? 'bg-emerald-700 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Petrol
                  </button>
                </div>
              </div>

              {/* Litres Received in this load */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 font-urdu">
                  {isUrdu ? 'کل موصول لیٹرز:' : 'Total Liters Received:'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={litresReceived}
                    onChange={(e) => setLitresReceived(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-10 py-2 text-sm font-mono font-black text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                    required
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-500 font-bold">L</span>
                </div>
              </div>

              {/* Purchase Rate per Litre */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1 font-urdu">
                  {isUrdu ? 'خریداری ریٹ فی لیٹر:' : 'Purchase Rate / Litre:'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={purchaseRate}
                    onChange={(e) => setPurchaseRate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-12 py-2 text-sm font-mono font-black text-emerald-700 focus:bg-white focus:outline-none focus:border-emerald-600"
                    required
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-slate-500 font-bold">PKR</span>
                </div>
              </div>

            </div>

            {/* Supplier / Driver info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Distributor / Source Depot
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hub Supply Terminal / Quetta Depot"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Driver Name / Phone
                </label>
                <input
                  type="text"
                  placeholder="Driver Sher Ali (03xx-xxxxxxx)"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

          </div>

          {/* Card 2: Attached Load Expenses (Vehicle Rent, Driver, Police, Commission) */}
          <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 font-urdu">
                  <DollarSign className="w-4 h-4 text-red-600" />
                  <span>{isUrdu ? '2. اس لوڈ کے مخصوص اخراجات (گاڑی کرایہ، ڈرائیور، پولیس، کمیشن)' : '2. Load-Specific Direct Expenses'}</span>
                </span>
                <p className="text-[10px] text-slate-500 font-urdu mt-0.5">
                  {isUrdu ? 'یہ اخراجات براہ راست اسی لوڈ کے کھاتے اور آڈٹ میں بند ہوں گے' : 'These expenses are permanently attached to this specific load'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddExpenseRow}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-700" />
                <span>Add Row</span>
              </button>
            </div>

            {/* List of expenses rows */}
            <div className="space-y-2.5">
              {expenses.map((exp, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 items-center">
                  {/* Category Picker */}
                  <div className="sm:col-span-4">
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Category</label>
                    <select
                      value={exp.category}
                      onChange={(e) => handleUpdateExpenseRow(idx, 'category', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-bold"
                    >
                      <option value="Vehicle Rent">Vehicle Rent / Carriage</option>
                      <option value="Driver Expense">Driver Bhatta / Expense</option>
                      <option value="Police / Checkpoint">Police / Checkpoint Clearance</option>
                      <option value="Commission">Commission / Munshiana</option>
                      <option value="Unloading">Unloading / Helper Labor</option>
                      <option value="General">Other Trip Expense</option>
                    </select>
                  </div>

                  {/* Title / Description */}
                  <div className="sm:col-span-4">
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Note / Details</label>
                    <input
                      type="text"
                      placeholder="e.g. Highway checkpoint clearance"
                      value={exp.notes}
                      onChange={(e) => handleUpdateExpenseRow(idx, 'notes', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* Amount */}
                  <div className="sm:col-span-3">
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Amount (PKR)</label>
                    <input
                      type="number"
                      placeholder="Amount"
                      value={exp.amount}
                      onChange={(e) => handleUpdateExpenseRow(idx, 'amount', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-red-600 focus:outline-none focus:border-red-500 text-right"
                    />
                  </div>

                  {/* Remove Button */}
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveExpenseRow(idx)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Expense Summary Strip */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-600 font-urdu">
                {isUrdu ? 'اس لوڈ کے کل اخراجات:' : 'Total Attached Load Expenses:'}
              </span>
              <span className="text-sm font-black font-mono text-red-600">
                {formatPKR(totalExpensesSum)}
              </span>
            </div>

          </div>

          {/* Card 3: Financial Summary & Submit Button */}
          <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Volume Received</span>
                <span className="text-sm md:text-base font-black font-mono text-slate-900 mt-1 block">
                  {formatLitres(litres)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Fuel Invoice Cost</span>
                <span className="text-sm md:text-base font-black font-mono text-slate-800 mt-1 block">
                  {formatPKR(totalCost)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Trip Expenses</span>
                <span className="text-sm md:text-base font-black font-mono text-red-600 mt-1 block">
                  {formatPKR(totalExpensesSum)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Net Cost / Litre</span>
                <span className="text-sm md:text-base font-black font-mono text-emerald-700 mt-1 block">
                  {effectiveCostPerLitre.toFixed(2)} PKR
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm tracking-wide shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isUrdu ? 'یہ لوڈ اسٹاک اور ٹینک میں شامل کریں' : `Confirm & Add ${vehicleType} Load to Storage`}</span>
            </button>

          </div>

        </form>
      )}

      {/* VIEW 2: LOAD AUDIT & FULL HISTORY */}
      {activeTabSub === 'load_audit' && (
        <div className="space-y-4">
          
          {/* Filters Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Fuel:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {['all', 'diesel', 'petrol'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterFuel(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      filterFuel === f ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'diesel' ? 'Diesel' : 'Petrol'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Status:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {['all', 'ACTIVE', 'CLOSED'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      filterStatus === s ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {s === 'all' ? 'All' : s}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Loads Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredLoads.map(load => {
              const audit = getLoadAudit(load.id);
              const isClosed = audit.isClosed;

              return (
                <div
                  key={load.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between bg-white ${
                    isClosed
                      ? 'border-slate-200 opacity-80'
                      : 'border-slate-200 shadow-sm hover:border-emerald-500/50'
                  }`}
                >
                  <div>
                    
                    {/* Header: Batch ID, Vehicle Type & Status Badge */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {load.id}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700">
                          {load.vehicleType}
                        </span>
                      </div>

                      {isClosed ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                          <BadgeCheck className="w-3 h-3 text-slate-500" />
                          <span>CLOSED</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          <span>ACTIVE</span>
                        </span>
                      )}
                    </div>

                    {/* Vehicle No & Arrival Date */}
                    <div className="flex items-center justify-between text-xs mt-2.5">
                      <span className="font-mono font-bold text-amber-700">
                        {load.vehicleNo}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatDate(load.date)}
                      </span>
                    </div>

                    {/* Progress Bar of Stock Depletion */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-urdu">
                          {isClosed ? '100% فروخت مکمل' : `باقی: ${formatLitres(audit.remaining)}`}
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {formatLitres(audit.totalSold)} / {formatLitres(audit.totalLitresReceived)}
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                        <div 
                          style={{ width: `${(audit.retailLitresSold / audit.totalLitresReceived) * 100}%` }}
                          className="bg-emerald-600 h-full"
                          title={`Retail: ${formatLitres(audit.retailLitresSold)}`}
                        />
                        <div 
                          style={{ width: `${(audit.bulkLitresSold / audit.totalLitresReceived) * 100}%` }}
                          className="bg-amber-500 h-full"
                          title={`Bulk: ${formatLitres(audit.bulkLitresSold)}`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          <span>Retail: {formatLitres(audit.retailLitresSold)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span>Bulk: {formatLitres(audit.bulkLitresSold)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Financial Snapshot */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-urdu">اخراجات:</span>
                        <span className="font-mono font-bold text-red-600">
                          {formatPKR(audit.totalExpenses)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block font-urdu">خالص منافع:</span>
                        <span className={`font-mono font-bold ${audit.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {formatPKR(audit.netProfit)}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Audit Trail Button */}
                  <button
                    type="button"
                    onClick={() => setSelectedAuditLoadId(load.id)}
                    className="w-full mt-3.5 py-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-emerald-800 font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{isUrdu ? 'مکمل آڈٹ ٹریل کھولیں' : 'Open Full Audit Trail'}</span>
                  </button>

                </div>
              );
            })}
          </div>

          {filteredLoads.length === 0 && (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 shadow-sm">
              No loads found matching current filter.
            </div>
          )}

        </div>
      )}

      {/* MODAL: COMPREHENSIVE LOAD AUDIT TRAIL */}
      {selectedAuditLoadId && auditDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-4 md:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 font-mono">
                      {auditDetails.load.id}
                    </h3>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700 border border-slate-200">
                      {auditDetails.load.vehicleType} - {auditDetails.load.vehicleNo}
                    </span>
                    {auditDetails.isClosed ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                        CLOSED
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-urdu mt-0.5">
                    {isUrdu ? 'مکمل آڈٹ رپورٹ: ایندھن کہاں اور کس گاڑی میں کتنا فروخت ہوا' : 'Audit Trail: Where, when, and to which vehicle this fuel was sold'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAuditLoadId(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-4 md:p-6 overflow-y-auto space-y-4">
              
              {/* 1. Volume Usage Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Received</span>
                  <span className="text-sm md:text-base font-black font-mono text-slate-900 mt-1 block">
                    {formatLitres(auditDetails.totalLitresReceived)}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Retail Dispenser</span>
                  <span className="text-sm md:text-base font-black font-mono text-emerald-800 mt-1 block">
                    {formatLitres(auditDetails.retailLitresSold)}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">Bulk Dumping</span>
                  <span className="text-sm md:text-base font-black font-mono text-amber-800 mt-1 block">
                    {formatLitres(auditDetails.bulkLitresSold)}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Remaining Stock</span>
                  <span className="text-sm md:text-base font-black font-mono text-slate-800 mt-1 block">
                    {formatLitres(auditDetails.remaining)}
                  </span>
                </div>
              </div>

              {/* 2. Where & When Used: Bulk Dumping Vehicle Issue Log */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase text-amber-800 flex items-center gap-1.5 font-urdu">
                    <Truck className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isUrdu ? 'بلک ڈمپنگ: جن گاڑیوں میں اس لوڈ کا تیل ڈالا گیا' : 'Bulk Dumping Issued to Vehicles from this Load'}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {auditDetails.bulkTransactions.length} Transactions
                  </span>
                </div>

                {auditDetails.bulkTransactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] text-slate-500 border-b border-slate-200 uppercase bg-slate-50">
                          <th className="py-2 px-2">Date & Time</th>
                          <th className="py-2 px-2">Target Vehicle</th>
                          <th className="py-2 px-2">Customer</th>
                          <th className="py-2 px-2 text-right">Liters Dumped</th>
                          <th className="py-2 px-2 text-right">Rate</th>
                          <th className="py-2 px-2 text-right">Total Bill</th>
                          <th className="py-2 px-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {auditDetails.bulkTransactions.map(b => (
                          <tr key={b.id} className="hover:bg-slate-50">
                            <td className="py-2 px-2 text-slate-500 text-[11px] whitespace-nowrap">{formatDateTime(b.date)}</td>
                            <td className="py-2 px-2 font-bold text-amber-800 whitespace-nowrap">{b.vehicleNo}</td>
                            <td className="py-2 px-2 text-slate-700 font-sans text-[11px] truncate max-w-[120px]">{b.customerName}</td>
                            <td className="py-2 px-2 text-right font-bold text-slate-900 whitespace-nowrap">{formatLitres(b.litres)}</td>
                            <td className="py-2 px-2 text-right text-slate-600 whitespace-nowrap">{b.rate}</td>
                            <td className="py-2 px-2 text-right font-bold text-emerald-700 whitespace-nowrap">{formatPKR(b.totalAmount)}</td>
                            <td className="py-2 px-2 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                b.paymentType === 'cash' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-sky-50 text-sky-800 border border-sky-200'
                              }`}>
                                {b.paymentType.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-2 text-center font-urdu">
                    {isUrdu ? 'اس لوڈ سے کوئی بلک ڈمپنگ نہیں ہوئی (سارا ریٹیل میٹر سے فروخت ہوا)' : 'No bulk dumping transactions recorded from this load yet.'}
                  </p>
                )}
              </div>

              {/* 3. Retail Dispenser Shifts Log */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase text-emerald-800 flex items-center gap-1.5 font-urdu">
                    <Fuel className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isUrdu ? 'ریٹیل یونٹ سیل: نوزل میٹر شفٹس' : 'Retail Nozzle Meter Shifts'}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {auditDetails.retailShifts.length} Shifts
                  </span>
                </div>

                {auditDetails.retailShifts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] text-slate-500 border-b border-slate-200 uppercase bg-slate-50">
                          <th className="py-2 px-2">Date & Time</th>
                          <th className="py-2 px-2">Operator</th>
                          <th className="py-2 px-2 text-right">Liters Sold</th>
                          <th className="py-2 px-2 text-right">Selling Rate</th>
                          <th className="py-2 px-2 text-right">Realized Sales</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {auditDetails.retailShifts.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="py-2 px-2 text-slate-500 text-[11px] whitespace-nowrap">{formatDateTime(s.date)}</td>
                            <td className="py-2 px-2 text-slate-700 font-sans text-[11px] whitespace-nowrap">{s.operatorName}</td>
                            <td className="py-2 px-2 text-right font-bold text-slate-900 whitespace-nowrap">{formatLitres(s.litresSold)}</td>
                            <td className="py-2 px-2 text-right text-slate-600 whitespace-nowrap">{s.rate}</td>
                            <td className="py-2 px-2 text-right font-bold text-emerald-700 whitespace-nowrap">{formatPKR(s.totalSaleValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-2 text-center font-urdu">
                    {isUrdu ? 'کوئی ریٹیل شفٹ لاگ نہیں ہے' : 'No retail shift records linked to this load.'}
                  </p>
                )}
              </div>

              {/* 4. Attached Load Expenses Breakdown */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold uppercase text-red-600 flex items-center gap-1.5 font-urdu">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>{isUrdu ? 'اس لوڈ سے بندھے ہوئے اخراجات' : 'Attached Load Expenses'}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowAddExpenseModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all active:scale-95"
                  >
                    <Plus className="w-3 h-3 text-red-600" />
                    <span>Add Expense</span>
                  </button>
                </div>

                {auditDetails.expenses.length > 0 ? (
                  <div className="space-y-1.5">
                    {auditDetails.expenses.map((exp) => (
                      <div key={exp.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{exp.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                              {exp.category}
                            </span>
                          </div>
                          {exp.notes && (
                            <p className="text-[10px] text-slate-500 mt-0.5">{exp.notes}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-red-600">
                            {formatPKR(exp.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteLoadExpense({ loadId: selectedAuditLoadId, expenseId: exp.id })}
                            className="text-slate-400 hover:text-red-600 p-1"
                            title="Delete expense"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold px-1">
                      <span className="text-slate-600 font-urdu">{isUrdu ? 'کل اخراجات:' : 'Total Attached Expenses:'}</span>
                      <span className="font-mono font-bold text-red-600">{formatPKR(auditDetails.totalExpenses)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-2 text-center">No expenses attached to this load.</p>
                )}
              </div>

              {/* 5. Complete Final Accounting & Net Profit Certificate */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 font-urdu">
                    {isUrdu ? 'حتمی کھاتہ و خالص منافع کی تفصیل' : 'Final Profitability & Audit Reconciliation'}
                  </span>
                  {auditDetails.isClosed && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                      ✓ Batch Fully Depleted & Closed
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Revenue</span>
                    <span className="text-xs md:text-sm font-bold font-mono text-emerald-700 mt-1 block">
                      {formatPKR(auditDetails.totalRevenue)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Fuel Cost (COGS)</span>
                    <span className="text-xs md:text-sm font-bold font-mono text-slate-800 mt-1 block">
                      {formatPKR(auditDetails.cogs)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Load Expenses</span>
                    <span className="text-xs md:text-sm font-bold font-mono text-red-600 mt-1 block">
                      {formatPKR(auditDetails.totalExpenses)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-300">
                    <span className="text-[10px] text-emerald-800 uppercase font-bold block">Net Profit</span>
                    <span className={`text-xs md:text-sm font-bold font-mono mt-1 block ${auditDetails.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatPKR(auditDetails.netProfit)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-emerald-100 flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-urdu">
                    {isUrdu ? 'خالص منافع فی لیٹر:' : 'Net Profit Margin per Litre:'}
                  </span>
                  <span className={`font-mono font-bold text-sm ${auditDetails.profitPerLitre >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {auditDetails.profitPerLitre.toFixed(2)} PKR / Litre
                  </span>
                </div>

              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Are you sure you want to void load ${auditDetails.load.id}? This will deduct ${formatLitres(auditDetails.remaining)} remaining stock from the underground tank.`)) {
                    deleteLoad(auditDetails.load.id);
                    setSelectedAuditLoadId(null);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all active:scale-95 shadow-sm"
              >
                Void / Delete Load
              </button>
              <button
                type="button"
                onClick={() => setSelectedAuditLoadId(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors"
              >
                Close Audit
              </button>
            </div>

          </div>
        </div>
      )}

      {/* POPUP: ATTACH EXPENSE MODAL */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleAttachExpenseToLoad} className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase text-slate-900 font-urdu">
                {isUrdu ? 'نیا خرچہ منسلک کریں' : 'Attach Expense to Load'}
              </span>
              <button type="button" onClick={() => setShowAddExpenseModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Expense Category</label>
              <select
                value={newExpCategory}
                onChange={(e) => setNewExpCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-bold"
              >
                <option value="Police / Checkpoint">Police / Checkpoint Clearance</option>
                <option value="Vehicle Rent">Vehicle Rent / Carriage</option>
                <option value="Driver Expense">Driver Bhatta / Food</option>
                <option value="Commission">Commission / Munshiana</option>
                <option value="Unloading">Unloading / Labor Helper</option>
                <option value="General">Other Expense</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Amount (PKR)</label>
              <input
                type="number"
                placeholder="e.g. 3000"
                value={newExpAmount}
                onChange={(e) => setNewExpAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-red-600 focus:outline-none focus:border-red-500"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Details / Note</label>
              <input
                type="text"
                placeholder="Checkpoint name or driver note"
                value={newExpNotes}
                onChange={(e) => setNewExpNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-colors"
              >
                Save Expense
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
