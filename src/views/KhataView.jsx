import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BookOpenCheck, 
  Search, 
  Plus, 
  MessageCircle, 
  Receipt, 
  Fuel, 
  Truck, 
  Phone, 
  User, 
  Wallet, 
  ArrowUpRight,
  CheckCircle2, 
  Calendar,
  Share2,
  Trash2,
  X,
  FileText
} from 'lucide-react';
import { 
  formatPKR, 
  formatLitres, 
  formatDateTime, 
  formatDate,
  generateWhatsAppSlip, 
  sanitizeWhatsAppPhone,
  generateCustomerStatementWhatsApp
} from '../utils/formatters';

export const KhataView = () => {
  const { 
    data, 
    addCustomer,
    recordKhataSale, 
    recordCustomerPayment, 
    updateCustomer,
    deleteCustomer,
    deleteKhataTransaction,
    setSelectedReceipt,
    totalCustomerKhata,
    language 
  } = useApp();
  
  const { customers = [], rates, khataTransactions = [], station } = data;
  const isUrdu = language === 'ur';

  const [activeTabSub, setActiveTabSub] = useState('new'); // 'new' | 'directory' | 'slips'
  const [searchQuery, setSearchQuery] = useState('');

  // New Credit Sale Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [phone, setPhone] = useState('');
  const [fuelType, setFuelType] = useState('petrol');
  const [litres, setLitres] = useState('');
  const [rate, setRate] = useState(String(rates?.petrol?.selling || 268.50));
  const [paidAmount, setPaidAmount] = useState('0');
  const [notes, setNotes] = useState('');

  // Recovery Payment Form Modal/Inline
  const [payingCustomerId, setPayingCustomerId] = useState(null);
  const [recoverAmount, setRecoverAmount] = useState('');
  const [recoverNotes, setRecoverNotes] = useState('');

  // Add New Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustVeh, setNewCustVeh] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');

  const handleFuelToggle = (type) => {
    setFuelType(type);
    const newRate = type === 'petrol' ? rates?.petrol?.selling || 268.50 : rates?.diesel?.selling || 278.00;
    setRate(String(newRate));
  };

  const handleSelectExistingCustomer = (cust) => {
    setSelectedCustomerId(cust.id);
    setCustomerName(cust.name);
    setVehicleNo(cust.vehicleNo);
    setPhone(cust.phone || '');
  };

  // Calculations
  const vol = parseFloat(litres) || 0;
  const unitRate = parseFloat(rate) || 0;
  const totalBill = vol * unitRate;
  const paid = parseFloat(paidAmount) || 0;
  const khataBalance = Math.max(0, totalBill - paid);

  const handleSubmitKhataSale = (e) => {
    e.preventDefault();

    if (vol <= 0 || unitRate <= 0) {
      alert('Please enter valid fuel litres and rate');
      return;
    }

    if (!vehicleNo.trim() && !customerName.trim()) {
      alert('Please provide at least a Vehicle Number or Customer Name');
      return;
    }

    const { transaction } = recordKhataSale({
      customerId: selectedCustomerId || null,
      customerName: customerName.trim() || 'Walking Customer',
      vehicleNo: vehicleNo.trim().toUpperCase(),
      phone: phone.trim(),
      fuelType,
      litres: vol,
      rate: unitRate,
      paidAmount: paid,
      notes,
    });

    // Auto open digital receipt modal
    setSelectedReceipt(transaction);

    // Reset inputs
    setLitres('');
    setPaidAmount('0');
    setNotes('');
  };

  const handleRecoverPaymentSubmit = (e) => {
    e.preventDefault();
    if (!payingCustomerId || !recoverAmount) return;
    recordCustomerPayment({
      customerId: payingCustomerId,
      amount: parseFloat(recoverAmount),
      notes: recoverNotes || 'Cash payment received for Khata clearance'
    });
    setPayingCustomerId(null);
    setRecoverAmount('');
    setRecoverNotes('');
  };

  // Direct WhatsApp deep link generator for individual slip
  const sendWhatsAppDirect = (tx) => {
    const slip = generateWhatsAppSlip({
      stationName: station.name,
      ownerName: station.owner,
      phone: tx.phone,
      vehicleNo: tx.vehicleNo,
      customerName: tx.customerName,
      fuelType: tx.fuelType,
      litres: tx.litres,
      rate: tx.rate,
      totalAmount: tx.totalBill,
      paidAmount: tx.paidAmount,
      remainingKhata: tx.khataAmount,
      date: tx.date,
    });

    const cleanPhone = sanitizeWhatsAppPhone(tx.phone);
    const encoded = encodeURIComponent(slip);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Send Full Customer Statement on WhatsApp
  const sendCustomerStatementWhatsApp = (cust) => {
    const custTransactions = khataTransactions.filter(tx => tx.customerId === cust.id || tx.vehicleNo === cust.vehicleNo);
    const statementText = generateCustomerStatementWhatsApp({
      stationName: station.name,
      ownerName: station.owner,
      phone: cust.phone || '',
      customerName: cust.name,
      vehicleNo: cust.vehicleNo,
      balanceKhata: cust.balanceKhata,
      transactions: custTransactions,
    });

    const cleanPhone = sanitizeWhatsAppPhone(cust.phone);
    const encoded = encodeURIComponent(statementText);
    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encoded}` 
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleAddNewCustomerSubmit = (e) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      alert('Please enter customer name');
      return;
    }
    addCustomer({
      name: newCustName.trim(),
      vehicleNo: newCustVeh.trim().toUpperCase() || 'N/A',
      phone: newCustPhone.trim(),
      notes: newCustNotes.trim() || 'Added from Ledger',
    });
    setNewCustName('');
    setNewCustVeh('');
    setNewCustPhone('');
    setNewCustNotes('');
    setShowAddCustomerModal(false);
  };

  const handleDeleteCust = (cust) => {
    if (confirm(`Are you sure you want to remove ${cust.name} from the ledger?`)) {
      deleteCustomer(cust.id);
    }
  };

  const handleDeleteKhataTx = (tx) => {
    if (confirm(`Delete this transaction (${formatPKR(tx.khataAmount || tx.paidAmount)})? This will reverse the customer's balance.`)) {
      deleteKhataTransaction(tx.id);
    }
  };

  // Filtered customer list
  const filteredCustomers = customers.filter(c => 
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.vehicleNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery)
  );

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-300 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BookOpenCheck className="w-5 h-5 text-emerald-700" />
            <span>{isUrdu ? 'گاہکوں کا ادھار کھاتہ و واٹس ایپ پرچیاں' : 'Customer Khata & WhatsApp Slips'}</span>
          </h2>
          <p className="text-xs text-slate-500 font-urdu mt-0.5">
            {isUrdu ? 'گاڑیوں کا ادھار، وصولی، پرچیاں، اور کھاتہ اسٹیٹمنٹ' : 'Vehicle credit accounts, cash recoveries, digital slips and WhatsApp statements'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
            <span className="text-[11px] text-slate-600 font-urdu">{isUrdu ? 'کل ادھار:' : 'Total Khata:'}</span>
            <span className="font-mono font-bold text-emerald-800 text-sm">{formatPKR(totalCustomerKhata)}</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="grid grid-cols-3 p-1.5 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold gap-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTabSub('new')}
          className={`py-2.5 rounded-xl transition-all ${
            activeTabSub === 'new'
              ? 'bg-emerald-700 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isUrdu ? '+ نئی پرچی' : '+ New Slip'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTabSub('directory')}
          className={`py-2.5 rounded-xl transition-all ${
            activeTabSub === 'directory'
              ? 'bg-emerald-700 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isUrdu ? `کھاتہ داران (${customers.length})` : `Ledger (${customers.length})`}
        </button>
        <button
          type="button"
          onClick={() => setActiveTabSub('slips')}
          className={`py-2.5 rounded-xl transition-all ${
            activeTabSub === 'slips'
              ? 'bg-emerald-700 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isUrdu ? `حالیہ پرچیاں (${khataTransactions.length})` : `Recent Slips (${khataTransactions.length})`}
        </button>
      </div>

      {activeTabSub === 'new' && (
        /* Create New Khata / Cash Slip Form */
        <form onSubmit={handleSubmitKhataSale} className="space-y-4 animate-in fade-in duration-200">
          
          {/* Quick Select Existing Khata Customer */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-urdu">
              {isUrdu ? 'تیز انتخاب (پہلے سے موجود گاہک):' : 'Fast Fill from Existing Ledger:'}
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectExistingCustomer(c)}
                  className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl border text-left text-xs transition-all ${
                    selectedCustomerId === c.id
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-1 ring-emerald-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-bold block truncate max-w-[120px]">{c.name}</span>
                  <span className="text-[10px] font-mono text-emerald-700">{c.vehicleNo}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle & Customer Details */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900 font-urdu">
                {isUrdu ? '۱. گاڑی اور گاہک کی تفصیلات' : '1. Vehicle & Customer Details'}
              </span>
              {selectedCustomerId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId('');
                    setCustomerName('');
                    setVehicleNo('');
                    setPhone('');
                  }}
                  className="text-[10px] text-red-600 hover:underline font-bold"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Vehicle Number */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Vehicle No *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TLA-786"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 uppercase focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Customer Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Customer / Driver Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zehri Transport"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Mobile / WhatsApp Phone Number */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1 font-urdu">
                {isUrdu ? 'واٹس ایپ موبائل نمبر (پرچی بھیجنے کے لیے):' : 'WhatsApp Phone Number (For direct slip sending):'}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  placeholder="03001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600 pl-8"
                />
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* Fuel Dispensing Details */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-900 font-urdu">
                {isUrdu ? '۲. ایندھن کا انتخاب اور مقدار' : '2. Fuel Selection & Quantity'}
              </span>
            </div>

            {/* Fuel Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFuelToggle('petrol')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  fuelType === 'petrol'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-1 ring-emerald-600 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Fuel className="w-4 h-4 text-emerald-600" />
                <span>Super Petrol</span>
              </button>

              <button
                type="button"
                onClick={() => handleFuelToggle('diesel')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  fuelType === 'diesel'
                    ? 'bg-amber-50 border-amber-600 text-amber-900 ring-1 ring-amber-600 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Truck className="w-4 h-4 text-amber-600" />
                <span>HSD Diesel</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Litres */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Litres Dispensed (L) *
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={litres}
                  onChange={(e) => setLitres(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-base font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Rate / Litre */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Rate / Litre (PKR)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.10"
                  required
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-base font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Quick Bill Total Output */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Total Bill Amount
                </span>
                <span className="text-xl font-black font-mono text-slate-900">
                  {formatPKR(totalBill)}
                </span>
              </div>
              <div className="text-right text-xs text-slate-500 font-mono">
                {formatLitres(vol)}
              </div>
            </div>

            {/* Settlement: Paid vs Khata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-emerald-800">
                    Cash Paid (PKR)
                  </label>
                  <button
                    type="button"
                    onClick={() => setPaidAmount(String(totalBill))}
                    className="text-[10px] text-emerald-700 hover:underline font-bold"
                  >
                    Full Paid
                  </button>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="1"
                  placeholder="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-700 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-red-600 block mb-1">
                  Udhaar / Khata (PKR)
                </label>
                <div className="w-full bg-red-50/50 border border-red-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-red-700">
                  {formatPKR(khataBalance)}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">
                Slip Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Authorized by fleet manager"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Submit & Generate WhatsApp Slip */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Receipt className="w-5 h-5" />
            <span>Generate & Send WhatsApp Slip</span>
          </button>
        </form>
      )}

      {activeTabSub === 'directory' && (
        /* Customer Ledger Directory & Payments */
        <div className="space-y-3 animate-in fade-in duration-200">
          
          {/* Header Controls: Search & Add Customer */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search vehicle no, customer name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 pl-9 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm active:scale-95 transition-all flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          </div>

          {/* Recovery Payment Modal / Inline Card */}
          {payingCustomerId && (
            <form onSubmit={handleRecoverPaymentSubmit} className="p-4 rounded-2xl bg-white border border-emerald-500 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Receive Customer Khata Payment</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPayingCustomerId(null)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Cash Received Amount (PKR) *
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    required
                    autoFocus
                    placeholder="0"
                    value={recoverAmount}
                    onChange={(e) => setRecoverAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Payment Note / Receipt No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cash received by cashier"
                    value={recoverNotes}
                    onChange={(e) => setRecoverNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
              >
                Confirm Cash Received & Clear Balance
              </button>
            </form>
          )}

          {/* Customers Directory */}
          <div className="space-y-2">
            {filteredCustomers.map((cust) => (
              <div
                key={cust.id}
                className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-800 text-sm bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                      {cust.vehicleNo}
                    </span>
                    <span className="font-bold text-slate-900 text-sm truncate max-w-[160px]">
                      {cust.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{cust.phone || 'No WhatsApp phone recorded'}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Last active: {formatDateTime(cust.lastTransaction)}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-500 block font-urdu">{isUrdu ? 'بقایا ادھار' : 'Khata Balance'}</span>
                    <span className={`font-mono font-bold text-sm ${cust.balanceKhata > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {formatPKR(cust.balanceKhata)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {cust.balanceKhata > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPayingCustomerId(cust.id);
                          setRecoverAmount(String(cust.balanceKhata));
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold active:scale-95 hover:bg-emerald-100"
                      >
                        Receive Cash
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectExistingCustomer(cust);
                        setActiveTabSub('new');
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-bold active:scale-95 hover:bg-slate-100"
                    >
                      + Sale
                    </button>
                    <button
                      type="button"
                      onClick={() => sendCustomerStatementWhatsApp(cust)}
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:scale-95"
                      title="Send Complete Ledger Statement on WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCust(cust)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete Customer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredCustomers.length === 0 && (
              <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 shadow-sm">
                No customer found matching "{searchQuery}".
              </div>
            )}
          </div>

        </div>
      )}

      {activeTabSub === 'slips' && (
        /* Recent Slips List */
        <div className="space-y-2 animate-in fade-in duration-200">
          {khataTransactions.map((tx) => (
            <div
              key={tx.id}
              className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-3 text-xs hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{tx.customerName}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold border border-slate-200">
                    {tx.vehicleNo}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {tx.fuelType || 'Credit Transaction'} {tx.litres > 0 ? `• ${formatLitres(tx.litres)} @ ${formatPKR(tx.rate)}` : ''}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {formatDateTime(tx.date)}
                </p>
              </div>

              <div className="text-right flex flex-col items-end gap-1.5">
                <div>
                  <span className="font-mono font-bold text-sm text-slate-900 block">
                    {formatPKR(tx.totalBill || tx.paidAmount)}
                  </span>
                  <span className={`text-[10px] font-bold ${tx.type === 'payment_received' ? 'text-emerald-700' : 'text-red-600'}`}>
                    {tx.type === 'payment_received' ? `Received: ${formatPKR(tx.paidAmount)}` : `Khata: ${formatPKR(tx.khataAmount)}`}
                  </span>
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => sendWhatsAppDirect(tx)}
                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:scale-95"
                    title="Send WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReceipt(tx)}
                    className="p-1.5 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 active:scale-95"
                    title="View Receipt"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteKhataTx(tx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:scale-95"
                    title="Delete Slip (Reverses Balance)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {khataTransactions.length === 0 && (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 shadow-sm">
              No khata slips recorded yet.
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD NEW CUSTOMER TO LEDGER */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <form onSubmit={handleAddNewCustomerSubmit} className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase text-slate-900">Add Customer to Khata Ledger</span>
              <button type="button" onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Customer / Fleet Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Balochistan Highway Coaches"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Primary Vehicle Number</label>
              <input
                type="text"
                placeholder="e.g. BSA-450"
                value={newCustVeh}
                onChange={(e) => setNewCustVeh(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600 uppercase"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">WhatsApp Phone Number</label>
              <input
                type="tel"
                placeholder="0300-XXXXXXX"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Ledger Notes</label>
              <input
                type="text"
                placeholder="e.g. Route coach account"
                value={newCustNotes}
                onChange={(e) => setNewCustNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-colors"
              >
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
