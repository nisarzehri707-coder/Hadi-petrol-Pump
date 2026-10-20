import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Fuel, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle, 
  History, 
  ArrowRight,
  TrendingDown,
  Sparkles,
  Info,
  Truck,
  Layers,
  Wallet,
  Car,
  FileSpreadsheet,
  Clock,
  User,
  ArrowDownLeft,
  Search,
  Receipt,
  Trash2,
  Share2
} from 'lucide-react';
import { formatPKR, formatLitres, formatDateTime, formatNumber } from '../utils/formatters';

export const SaleShiftView = () => {
  const { 
    data, 
    currentUser,
    recordShiftSale, 
    deleteSale,
    recordBulkDumping, 
    deleteBulkSale,
    setSelectedReceipt,
    setActiveTab, 
    language 
  } = useApp();

  const isUrdu = language === 'ur';
  const { nozzles = [], rates, tanks, sales = [], bulkSales = [], customers = [] } = data;

  // Primary operation mode toggle: 'retail' vs 'bulk'
  const [operationTab, setOperationTab] = useState('retail'); // 'retail' | 'bulk'

  // Sub-view inside retail: 'record' vs 'history'
  const [retailSubView, setRetailSubView] = useState('record'); // 'record' | 'history'

  // Sub-view inside bulk: 'dump' vs 'history'
  const [bulkSubView, setBulkSubView] = useState('dump'); // 'dump' | 'history'

  // ==========================================
  // OPERATION A: RETAIL SHIFT SALE STATE
  // ==========================================
  const [selectedNozzleId, setSelectedNozzleId] = useState(nozzles[0]?.id || 'n1');
  const activeNozzle = nozzles.find(n => n.id === selectedNozzleId) || nozzles[0] || { fuelType: 'petrol', lastMeter: 0 };
  const fuelTypeRetail = activeNozzle?.fuelType || 'petrol';

  const [openingMeter, setOpeningMeter] = useState('');
  const [closingMeter, setClosingMeter] = useState('');
  const [sellingRateRetail, setSellingRateRetail] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [creditIssued, setCreditIssued] = useState('');
  const [creditCustomerId, setCreditCustomerId] = useState('');
  const [creditCustomerName, setCreditCustomerName] = useState('');
  const [operatorName, setOperatorName] = useState(currentUser?.name || 'Shift Cashier');
  const [retailNotes, setRetailNotes] = useState('');

  // Sync default values when nozzle changes
  useEffect(() => {
    if (activeNozzle) {
      setOpeningMeter(activeNozzle.lastMeter !== undefined ? String(activeNozzle.lastMeter) : '');
      setClosingMeter('');
      const defaultRate = fuelTypeRetail === 'petrol' ? rates?.petrol?.selling || 268.5 : rates?.diesel?.selling || 278;
      setSellingRateRetail(String(defaultRate));
    }
  }, [selectedNozzleId, rates, activeNozzle?.lastMeter]);

  // Derived Retail Calculations
  const op = parseFloat(openingMeter) || 0;
  const cl = parseFloat(closingMeter) || 0;
  const retailLitresSold = Math.max(0, cl - op);
  const retailRate = parseFloat(sellingRateRetail) || 0;
  const retailTotalSaleValue = retailLitresSold * retailRate;
  
  const cash = parseFloat(cashReceived) || 0;
  const credit = parseFloat(creditIssued) || 0;
  const settledTotal = cash + credit;
  const variance = retailTotalSaleValue - settledTotal;
  const isExactSettlement = Math.abs(variance) < 1 && retailTotalSaleValue > 0;

  const currentTankStockRetail = tanks[fuelTypeRetail]?.currentStock || 0;
  const willExceedStockRetail = retailLitresSold > currentTankStockRetail;

  const handleSubmitRetail = (e) => {
    e.preventDefault();
    const lastMeter = activeNozzle?.lastMeter !== undefined ? Number(activeNozzle.lastMeter) : 0;
    if (op < lastMeter - 0.01) {
      alert(`Opening meter (${op}) cannot be less than last recorded meter reading (${lastMeter}). Possible backdating error.`);
      return;
    }

    if (retailLitresSold <= 0) {
      alert('Closing meter reading must be greater than opening reading!');
      return;
    }

    if (willExceedStockRetail) {
      alert(`Cannot record sale: Litres sold (${formatLitres(retailLitresSold)}) exceeds available ${fuelTypeRetail} tank stock (${formatLitres(currentTankStockRetail)}).`);
      return;
    }

    if (credit > retailTotalSaleValue) {
      alert(`Credit amount (${formatPKR(credit)}) cannot exceed total sale value (${formatPKR(retailTotalSaleValue)})!`);
      return;
    }

    if (credit > 0 && !creditCustomerId && !creditCustomerName.trim()) {
      alert('Please specify or select a customer name for the credit portion.');
      return;
    }

    recordShiftSale({
      nozzleId: selectedNozzleId,
      openingMeter: op,
      closingMeter: cl,
      sellingRate: retailRate,
      cashReceived: cash,
      creditIssued: credit,
      creditCustomerId: credit > 0 ? (creditCustomerId || null) : null,
      creditCustomerName: credit > 0 ? (creditCustomerName || '') : '',
      operatorName,
      notes: retailNotes,
    });

    // Reset Form
    setClosingMeter('');
    setCashReceived('');
    setCreditIssued('');
    setCreditCustomerId('');
    setCreditCustomerName('');
    setRetailNotes('');
    setRetailSubView('history');
  };

  const handleVoidShift = (sale) => {
    if (confirm(`Are you sure you want to void this shift sale (${formatLitres(sale.litresSold)})? This will restore ${formatLitres(sale.litresSold)} back into the underground storage tank.`)) {
      deleteSale(sale.id);
    }
  };

  // ==========================================
  // OPERATION B: BULK DUMPING STATE
  // ==========================================
  const [bulkFuelType, setBulkFuelType] = useState('diesel');
  const [bulkVehicleNo, setBulkVehicleNo] = useState('');
  const [bulkCustomerName, setBulkCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [bulkLitres, setBulkLitres] = useState('');
  const [bulkRate, setBulkRate] = useState(String(rates?.diesel?.selling || 278.00));
  const [bulkPaymentType, setBulkPaymentType] = useState('cash'); // 'cash' | 'khata'
  const [bulkPaidAmount, setBulkPaidAmount] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');

  const handleBulkFuelToggle = (type) => {
    setBulkFuelType(type);
    const defRate = type === 'petrol' ? rates?.petrol?.selling || 268.50 : rates?.diesel?.selling || 278.00;
    setBulkRate(String(defRate));
  };

  const handleSelectCustomerForBulk = (cust) => {
    setSelectedCustomerId(cust.id);
    setBulkCustomerName(cust.name);
    setBulkVehicleNo(cust.vehicleNo || '');
  };

  const currentTankStockBulk = tanks[bulkFuelType]?.currentStock || 0;
  const bLitres = parseFloat(bulkLitres) || 0;
  const bRate = parseFloat(bulkRate) || 0;
  const bTotalAmount = bLitres * bRate;
  const bPaid = bulkPaymentType === 'cash' ? bTotalAmount : (parseFloat(bulkPaidAmount) || 0);
  const bKhata = Math.max(0, bTotalAmount - bPaid);
  const willExceedStockBulk = bLitres > currentTankStockBulk;

  const handleSubmitBulk = (e) => {
    e.preventDefault();
    if (bLitres <= 0 || bRate <= 0) {
      alert('Please enter valid bulk volume (litres) and selling rate!');
      return;
    }

    if (!bulkVehicleNo.trim()) {
      alert('Please enter Target Vehicle Number!');
      return;
    }

    if (willExceedStockBulk) {
      alert(`Cannot record bulk sale: Bulk volume (${formatLitres(bLitres)}) exceeds available ${bulkFuelType} storage stock (${formatLitres(currentTankStockBulk)}).`);
      return;
    }

    const effCustomerName = bulkCustomerName || (selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name : 'Bulk Fleet Customer');

    const bulkId = recordBulkDumping({
      vehicleNo: bulkVehicleNo,
      customerName: effCustomerName,
      fuelType: bulkFuelType,
      litres: bLitres,
      rate: bRate,
      paymentType: bulkPaymentType,
      paidAmount: bPaid,
      customerId: selectedCustomerId || null,
      operatorName: operatorName || 'Cashier / Attendant',
      notes: bulkNotes,
    });

    // Automatically prompt digital receipt
    setSelectedReceipt({
      id: bulkId || 'bulk_' + Date.now(),
      date: new Date().toISOString(),
      vehicleNo: bulkVehicleNo.toUpperCase(),
      customerName: effCustomerName,
      fuelType: bulkFuelType === 'petrol' ? 'Super Petrol' : 'High-Speed Diesel (HSD)',
      litres: bLitres,
      rate: bRate,
      totalBill: bTotalAmount,
      paidAmount: bPaid,
      khataAmount: bKhata,
      type: 'bulk_dumping',
      notes: bulkNotes
    });

    // Reset
    setBulkVehicleNo('');
    setBulkCustomerName('');
    setSelectedCustomerId('');
    setBulkLitres('');
    setBulkPaidAmount('');
    setBulkNotes('');
    setBulkSubView('history');
  };

  const handleVoidBulk = (bulk) => {
    if (confirm(`Are you sure you want to void this bulk dumping to ${bulk.vehicleNo} (${formatLitres(bulk.litres)})? This will return ${formatLitres(bulk.litres)} to the underground tank and reverse any credit balance.`)) {
      deleteBulkSale(bulk.id);
    }
  };

  const openBulkReceipt = (bulk) => {
    setSelectedReceipt({
      id: bulk.id,
      date: bulk.date,
      vehicleNo: bulk.vehicleNo,
      customerName: bulk.customerName,
      fuelType: bulk.fuelType === 'petrol' ? 'Super Petrol' : 'High-Speed Diesel (HSD)',
      litres: bulk.litres,
      rate: bulk.rate,
      totalBill: bulk.totalAmount,
      paidAmount: bulk.cashPaid !== undefined ? bulk.cashPaid : (bulk.paymentType === 'cash' ? bulk.totalAmount : 0),
      khataAmount: bulk.khataAmount || 0,
      type: 'bulk_dumping',
      notes: bulk.notes
    });
  };

  return (
    <div className="space-y-4 pb-20 w-full min-w-0 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Top Banner: Same Storage Tank Live Levels */}
      <div className="p-3.5 md:p-4 rounded-2xl md:rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2 font-urdu">
                <span>{isUrdu ? 'مشترکہ اسٹوریج ٹینک (ایک اسٹاک، دو آپریشنز)' : 'Unified Storage Tank (Same Storage, Dual Operations)'}</span>
              </h2>
              <p className="text-[11px] text-slate-500 font-urdu mt-0.5">
                {isUrdu 
                  ? 'ریٹیل نوزل فروخت اور گاڑیوں میں بلک ڈمپنگ دونوں اسی ایک زیر زمین ٹینک سے منہا ہوتے ہیں' 
                  : 'Retail Nozzle Sales and Bulk Dumping both deduct from the SAME common storage without double counting.'}
              </p>
            </div>
          </div>

          {/* Real-time Tank Gauges Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse flex-shrink-0"></span>
              <span className="text-[11px] text-slate-700 font-bold font-urdu">
                {isUrdu ? 'پٹرول ٹینک:' : 'Petrol Tank:'}
              </span>
              <span className="text-xs font-mono font-black text-emerald-700 tabular-nums" dir="ltr">
                {formatLitres(tanks?.petrol?.currentStock || 0)}
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse flex-shrink-0"></span>
              <span className="text-[11px] text-slate-700 font-bold font-urdu">
                {isUrdu ? 'ڈیزل ٹینک:' : 'Diesel Tank:'}
              </span>
              <span className="text-xs font-mono font-black text-amber-700 tabular-nums" dir="ltr">
                {formatLitres(tanks?.diesel?.currentStock || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Operation Mode Switcher: Retail vs Bulk Dumping */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold shadow-sm gap-1.5">
        <button
          type="button"
          onClick={() => setOperationTab('retail')}
          className={`py-3 px-2 rounded-xl transition-all flex items-center justify-center gap-2 font-urdu ${
            operationTab === 'retail'
              ? 'bg-emerald-700 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Fuel className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{isUrdu ? '۱. ریٹیل فروخت بذریعہ نوزل / میٹر' : '1. Retail Sale via Nozzle Meter'}</span>
        </button>

        <button
          type="button"
          onClick={() => setOperationTab('bulk')}
          className={`py-3 px-2 rounded-xl transition-all flex items-center justify-center gap-2 font-urdu ${
            operationTab === 'bulk'
              ? 'bg-amber-600 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Truck className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{isUrdu ? '۲. بلک ڈمپنگ برائے دیگر گاڑیاں' : '2. Bulk Dumping into Vehicles'}</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* OPERATION A: RETAIL SALE VIA NOZZLE METER                            */}
      {/* ==================================================================== */}
      {operationTab === 'retail' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Sub-view switcher: Record Shift vs Shift Log History */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <span className="text-xs font-bold text-slate-500 font-urdu">
              {isUrdu ? 'نوزل ریڈنگ اور کیش حساب کتاب درج کریں' : 'Dispenser meter readings & cash settlement'}
            </span>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setRetailSubView('record')}
                className={`px-3 py-1.5 rounded-lg transition-all font-urdu ${
                  retailSubView === 'record' ? 'bg-white text-emerald-800 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isUrdu ? '+ نئی ریڈنگ درج کریں' : '+ Record Reading'}
              </button>
              <button
                type="button"
                onClick={() => setRetailSubView('history')}
                className={`px-3 py-1.5 rounded-lg transition-all font-urdu ${
                  retailSubView === 'history' ? 'bg-white text-emerald-800 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isUrdu ? `شفٹ لاگز (${sales.length})` : `Shift Logs (${sales.length})`}
              </button>
            </div>
          </div>

          {retailSubView === 'record' ? (
            <div className="space-y-4">
              
              {/* Nozzle Selection Chips */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2 font-urdu">
                  {isUrdu ? 'ڈسپنسر نوزل منتخب کریں:' : 'Select Dispenser Nozzle:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {nozzles.map((noz) => {
                    const isSelected = noz.id === selectedNozzleId;
                    const isPetrolNoz = noz.fuelType === 'petrol';
                    return (
                      <button
                        key={noz.id}
                        type="button"
                        onClick={() => setSelectedNozzleId(noz.id)}
                        className={`flex flex-col p-2.5 rounded-xl border text-start transition-all active:scale-95 ${
                          isSelected
                            ? isPetrolNoz
                              ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-1 ring-emerald-600 shadow-sm'
                              : 'bg-amber-50 border-amber-600 text-amber-900 ring-1 ring-amber-600 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{noz.name}</span>
                          <span className={`w-2 h-2 rounded-full ${isPetrolNoz ? 'bg-emerald-600' : 'bg-amber-500'}`}></span>
                        </div>
                        <span className="text-[10px] truncate mt-0.5 font-medium">{noz.label}</span>
                        <span className="text-[10px] font-mono opacity-80 mt-1" dir="ltr">
                          {isUrdu ? 'سابقہ میٹر: ' : 'Last: '}{noz.lastMeter !== undefined ? Number(noz.lastMeter).toFixed(1) : 0} L
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Retail Form */}
              <form onSubmit={handleSubmitRetail} className="space-y-4">
                
                {/* Meter Readings Card */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-urdu">
                      <Calculator className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{isUrdu ? '۱. میٹر کی پیمائش (لیٹرز)' : '1. Meter Readings (Litres)'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500" dir="ltr">
                      {isUrdu ? 'دستیاب اسٹوریج: ' : 'Storage Stock: '}{formatLitres(currentTankStockRetail)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 font-urdu">
                        {isUrdu ? 'ابتدائی میٹر (Opening)' : 'Opening Meter'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={openingMeter}
                        onChange={(e) => setOpeningMeter(e.target.value)}
                        dir="ltr"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1 font-urdu">
                        {isUrdu ? 'موجودہ میٹر (Closing)' : 'Closing Meter'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={closingMeter}
                        onChange={(e) => setClosingMeter(e.target.value)}
                        placeholder={isUrdu ? 'موجودہ ریڈنگ درج کریں' : 'Current reading'}
                        dir="ltr"
                        className="w-full bg-emerald-50/50 border border-emerald-500 rounded-xl px-3 py-2 text-sm font-mono font-black text-emerald-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1 font-urdu">
                        {isUrdu ? 'فروخت ریٹ فی لیٹر' : 'Selling Rate / Litre'}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={sellingRateRetail}
                        onChange={(e) => setSellingRateRetail(e.target.value)}
                        dir="ltr"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        required
                      />
                    </div>
                  </div>

                  {/* Liters Sold & Total Sales Strip */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block font-urdu">
                        {isUrdu ? 'فروخت شدہ مقدار' : 'Volume Sold'}
                      </span>
                      <span className="text-base font-black font-mono text-slate-900 mt-0.5 block" dir="ltr">
                        {formatLitres(retailLitresSold)}
                      </span>
                    </div>
                    <div className="text-end">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block font-urdu">
                        {isUrdu ? 'کل متوقع رقم' : 'Expected Value'}
                      </span>
                      <span className="text-base font-black font-mono text-emerald-700 mt-0.5 block" dir="ltr">
                        {formatPKR(retailTotalSaleValue)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cash Settlement Card */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-urdu">
                      <Wallet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{isUrdu ? '۲. نقد کیش وصولی و ادھار' : '2. Cash Collection & Credit Settlement'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500" dir="ltr">
                      {isUrdu ? 'کل رقم: ' : 'Total: '}{formatPKR(retailTotalSaleValue)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 font-urdu">
                        {isUrdu ? 'وصول شدہ نقد رقم (Cash)' : 'Cash Collected in Hand'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        dir="ltr"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-700 focus:bg-white focus:outline-none focus:border-emerald-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 font-urdu">
                        {isUrdu ? 'دی گئی ادھار رقم (Credit / Khata)' : 'Credit / Khata Given in Shift'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={creditIssued}
                        onChange={(e) => setCreditIssued(e.target.value)}
                        dir="ltr"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-sky-700 focus:bg-white focus:outline-none focus:border-sky-600"
                      />
                    </div>
                  </div>

                  {/* Customer Attribution if credit issued */}
                  {credit > 0 && (
                    <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200 space-y-2">
                      <span className="text-[11px] font-bold text-sky-800 block font-urdu">
                        {isUrdu ? 'یہ ادھار کس گاہک کے کھاتے میں لکھنا ہے؟' : 'Assign this Credit to Customer Khata:'}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <select
                          value={creditCustomerId}
                          onChange={(e) => {
                            setCreditCustomerId(e.target.value);
                            const found = customers.find(c => c.id === e.target.value);
                            if (found) setCreditCustomerName(found.name);
                          }}
                          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-urdu"
                        >
                          <option value="">{isUrdu ? '-- کھاتہ دار منتخب کریں --' : '-- Select Existing Ledger Customer --'}</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.vehicleNo})</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          placeholder={isUrdu ? 'یا گاہک کا نام / گاڑی درج کریں' : 'Or type customer name / vehicle'}
                          value={creditCustomerName}
                          onChange={(e) => setCreditCustomerName(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-urdu"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 font-urdu">
                        {isUrdu ? 'آپریٹر / شفٹ انچارج' : 'Operator / Shift In-Charge'}
                      </label>
                      <input
                        type="text"
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600 font-urdu"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 font-urdu">
                        {isUrdu ? 'شفٹ ریمارکس / نوٹس' : 'Shift Notes / Remarks'}
                      </label>
                      <input
                        type="text"
                        placeholder={isUrdu ? 'مثال: نوزل کی پیمائش درست ہے' : 'e.g. Dispenser calibration ok'}
                        value={retailNotes}
                        onChange={(e) => setRetailNotes(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600 font-urdu"
                      />
                    </div>
                  </div>

                  {/* Cash Settlement Status Pill */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs flex-wrap gap-2">
                    <span className="text-slate-600 font-urdu">
                      {isUrdu ? 'کیش فرق (Settlement Variance):' : 'Settlement Variance:'}
                    </span>
                    <span className={`font-mono font-bold ${
                      isExactSettlement ? 'text-emerald-700' : variance > 0 ? 'text-red-600' : 'text-sky-700'
                    }`} dir="ltr">
                      {isExactSettlement 
                        ? (isUrdu ? '✓ بالکل برابر (کوئی فرق نہیں)' : '✓ Perfect Match (0 Variance)') 
                        : variance > 0 
                          ? `${isUrdu ? 'کمی: -' : 'Shortage: -'}${formatPKR(variance)}` 
                          : `${isUrdu ? 'اضافی: +' : 'Surplus: +'}${formatPKR(Math.abs(variance))}`}
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 font-urdu"
                  >
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{isUrdu ? 'شفٹ بند کریں اور ٹینک اسٹاک کم کریں' : 'Confirm Shift Closing & Deduct Storage'}</span>
                  </button>
                </div>

              </form>
            </div>
          ) : (
            /* Retail Shift Log History View */
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase text-emerald-800 flex items-center gap-1.5 font-urdu">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{isUrdu ? 'ریٹیل نوزل شفٹ کلوزنگ لاگ' : 'Retail Dispenser Shift Closing Log'}</span>
                </span>
                <span className="text-xs font-mono text-slate-500" dir="ltr">
                  {sales.length} {isUrdu ? 'شفٹس' : 'Shifts Recorded'}
                </span>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-start text-xs min-w-[700px]">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-200 bg-slate-50 font-mono font-urdu">
                      <th className="py-2.5 px-2 text-start">{isUrdu ? 'تاریخ و وقت' : 'Date & Time'}</th>
                      <th className="py-2.5 px-2 text-start">{isUrdu ? 'نوزل / ایندھن' : 'Nozzle / Fuel'}</th>
                      <th className="py-2.5 px-2 text-end">{isUrdu ? 'ابتدائی' : 'Opening'}</th>
                      <th className="py-2.5 px-2 text-end">{isUrdu ? 'اختتامی' : 'Closing'}</th>
                      <th className="py-2.5 px-2 text-end">{isUrdu ? 'لیٹرز' : 'Liters Sold'}</th>
                      <th className="py-2.5 px-2 text-end">{isUrdu ? 'ریٹ' : 'Rate'}</th>
                      <th className="py-2.5 px-2 text-end">{isUrdu ? 'کل رقم' : 'Realized'}</th>
                      <th className="py-2.5 px-2 text-end">{isUrdu ? 'نقد' : 'Cash'}</th>
                      <th className="py-2.5 px-2 text-end">{isUrdu ? 'ادھار' : 'Credit'}</th>
                      <th className="py-2.5 px-2 text-center">{isUrdu ? 'کارروائی' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {sales.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-2 text-slate-500 text-[11px] whitespace-nowrap text-start">{formatDateTime(s.date)}</td>
                        <td className="py-2.5 px-2 whitespace-nowrap text-start">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.fuelType === 'petrol' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {s.fuelType.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-end text-slate-600 whitespace-nowrap" dir="ltr">{Number(s.openingMeter).toFixed(1)}</td>
                        <td className="py-2.5 px-2 text-end text-slate-800 whitespace-nowrap" dir="ltr">{Number(s.closingMeter).toFixed(1)}</td>
                        <td className="py-2.5 px-2 text-end font-bold text-slate-900 whitespace-nowrap" dir="ltr">{formatLitres(s.litresSold)}</td>
                        <td className="py-2.5 px-2 text-end text-slate-600 whitespace-nowrap" dir="ltr">{s.rate}</td>
                        <td className="py-2.5 px-2 text-end font-bold text-emerald-700 whitespace-nowrap" dir="ltr">{formatPKR(s.totalSaleValue)}</td>
                        <td className="py-2.5 px-2 text-end text-slate-700 whitespace-nowrap" dir="ltr">{formatPKR(s.cashReceived)}</td>
                        <td className="py-2.5 px-2 text-end text-sky-700 whitespace-nowrap" dir="ltr">{formatPKR(s.creditIssued)}</td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt({
                                id: s.id,
                                date: s.date,
                                vehicleNo: s.creditCustomerName ? `Fleet (${s.creditCustomerName})` : 'Retail Dispenser',
                                customerName: s.creditCustomerName || s.operatorName,
                                fuelType: s.fuelName || (s.fuelType === 'petrol' ? 'Super Petrol' : 'High-Speed Diesel'),
                                litres: s.litresSold,
                                rate: s.rate,
                                totalBill: s.totalSaleValue,
                                paidAmount: s.cashReceived,
                                khataAmount: s.creditIssued,
                                type: 'RETAIL_SHIFT'
                              })}
                              className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all"
                              title="Print / Share Receipt"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVoidShift(s)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all"
                              title="Void Shift Sale (Restores Stock)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ==================================================================== */}
      {/* OPERATION B: BULK DUMPING INTO VEHICLES                              */}
      {/* ==================================================================== */}
      {operationTab === 'bulk' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Sub-view switcher: Dump Fuel vs Bulk Dumping Log */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <span className="text-xs font-bold text-slate-500 font-urdu">
              {isUrdu ? 'دیگر گاڑیوں، ٹرکوں اور ڈمپرز میں براہ راست بلک تیل کا اخراج' : 'Bulk issue / dumping into customer vehicles from storage tank'}
            </span>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setBulkSubView('dump')}
                className={`px-3 py-1.5 rounded-lg transition-all font-urdu ${
                  bulkSubView === 'dump' ? 'bg-white text-amber-800 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isUrdu ? '+ نئی بلک ڈمپنگ درج کریں' : '+ Issue Bulk Dumping'}
              </button>
              <button
                type="button"
                onClick={() => setBulkSubView('history')}
                className={`px-3 py-1.5 rounded-lg transition-all font-urdu ${
                  bulkSubView === 'history' ? 'bg-white text-amber-800 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isUrdu ? `بلک لاگز (${bulkSales.length})` : `Bulk Logs (${bulkSales.length})`}
              </button>
            </div>
          </div>

          {bulkSubView === 'dump' ? (
            <form onSubmit={handleSubmitBulk} className="space-y-4">
              
              <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
                  <span className="text-xs font-bold uppercase text-amber-800 flex items-center gap-2 font-urdu">
                    <Truck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>{isUrdu ? 'گاڑی میں بلک ایندھن کا اخراج (ڈمپنگ)' : 'Bulk Vehicle Issue Details'}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500" dir="ltr">
                    {isUrdu ? 'دستیاب اسٹوریج: ' : 'Storage Stock: '}{formatLitres(currentTankStockBulk)}
                  </span>
                </div>

                {/* Fast Existing Customer Chips */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-urdu">
                    {isUrdu ? 'کھاتہ لسٹ سے تیز انتخاب (اختیاری):' : 'Fast Fleet / Khata Selection (Optional):'}
                  </label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {customers.slice(0, 6).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomerForBulk(c)}
                        className={`flex-shrink-0 px-2.5 py-1 rounded-xl border text-start text-xs transition-all ${
                          selectedCustomerId === c.id
                            ? 'bg-amber-100 border-amber-500 text-amber-900 ring-1 ring-amber-500 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-bold block truncate max-w-[110px]">{c.name}</span>
                        <span className="text-[10px] font-mono text-amber-700" dir="ltr">{c.vehicleNo}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fuel Type & Target Vehicle Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Fuel Type Toggle */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 font-urdu">
                      {isUrdu ? 'تیل کی قسم:' : 'Fuel Type:'}
                    </label>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleBulkFuelToggle('diesel')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all font-urdu ${
                          bulkFuelType === 'diesel' ? 'bg-amber-600 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {isUrdu ? 'ڈیزل' : 'Diesel (HSD)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkFuelToggle('petrol')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all font-urdu ${
                          bulkFuelType === 'petrol' ? 'bg-emerald-700 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {isUrdu ? 'پٹرول' : 'Petrol'}
                      </button>
                    </div>
                  </div>

                  {/* Target Vehicle Number */}
                  <div>
                    <label className="text-[11px] font-bold text-amber-800 block mb-1 font-urdu">
                      {isUrdu ? 'گاڑی کا نمبر *' : 'Target Vehicle Number *'}
                    </label>
                    <input
                      type="text"
                      placeholder={isUrdu ? 'مثال: TLA-786 / KHI-9921' : 'e.g. TLA-786 / KHI-9921'}
                      value={bulkVehicleNo}
                      onChange={(e) => setBulkVehicleNo(e.target.value.toUpperCase())}
                      dir="ltr"
                      className="w-full bg-slate-50 border border-amber-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase placeholder:text-slate-400"
                      required
                    />
                  </div>

                  {/* Customer / Transporter Name */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 font-urdu">
                      {isUrdu ? 'گاہک / ٹرانسپورٹر کا نام' : 'Customer / Fleet Name'}
                    </label>
                    <input
                      type="text"
                      placeholder={isUrdu ? 'مثال: زہری گڈز ٹرانسپورٹ' : 'e.g. Zehri Goods Transport'}
                      value={bulkCustomerName}
                      onChange={(e) => setBulkCustomerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-urdu"
                    />
                  </div>

                </div>

                {/* Litres Dumped, Rate, Total Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 font-urdu">
                      {isUrdu ? 'کتنے لیٹرز ڈالے گئے؟' : 'Total Liters Dumped:'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 500"
                        value={bulkLitres}
                        onChange={(e) => setBulkLitres(e.target.value)}
                        dir="ltr"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-3 pe-10 py-2 text-sm font-mono font-black text-amber-800 focus:bg-white focus:outline-none focus:border-amber-500"
                        required
                      />
                      <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold pointer-events-none">L</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1 font-urdu">
                      {isUrdu ? 'فروخت ریٹ فی لیٹر' : 'Selling Rate per Litre'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={bulkRate}
                        onChange={(e) => setBulkRate(e.target.value)}
                        dir="ltr"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl ps-3 pe-12 py-2 text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                        required
                      />
                      <span className="absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold pointer-events-none">PKR</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1 font-urdu">
                      {isUrdu ? 'کل بل رقم' : 'Calculated Total Bill'}
                    </label>
                    <div className="w-full bg-emerald-50/70 border border-emerald-200 rounded-xl px-3 py-2 text-sm font-mono font-black text-emerald-800" dir="ltr">
                      {formatPKR(bTotalAmount)}
                    </div>
                  </div>
                </div>

                {/* Payment Type Toggle: Cash vs Khata Credit */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1.5 font-urdu">
                    {isUrdu ? 'ادائیگی کا طریقہ:' : 'Payment Mode:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkPaymentType('cash')}
                      className={`p-3 rounded-xl border text-start transition-all ${
                        bulkPaymentType === 'cash'
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-1 ring-emerald-600 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-bold text-xs block font-urdu">
                        {isUrdu ? 'نقد ادائیگی (Cash)' : 'Cash Paid (نقد ادائیگی)'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-urdu">
                        {isUrdu ? 'موقع پر فوری نقد وصول' : 'Collected in hand now'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBulkPaymentType('khata')}
                      className={`p-3 rounded-xl border text-start transition-all ${
                        bulkPaymentType === 'khata'
                          ? 'bg-sky-50 border-sky-600 text-sky-900 ring-1 ring-sky-600 shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="font-bold text-xs block font-urdu">
                        {isUrdu ? 'ادھار کھاتہ (Khata / Credit)' : 'Khata / Credit (ادھار کھاتہ)'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-urdu">
                        {isUrdu ? 'گاہک کے کھاتے میں اضافہ' : 'Adds to customer balance'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* If Khata, partial cash paid */}
                {bulkPaymentType === 'khata' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-sky-50/70 border border-sky-200">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1 font-urdu">
                        {isUrdu ? 'جزوی نقد وصولی (اگر کوئی ہے)' : 'Partial Cash Received (If Any)'}
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={bulkPaidAmount}
                        onChange={(e) => setBulkPaidAmount(e.target.value)}
                        dir="ltr"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-sky-800 uppercase block mb-1 font-urdu">
                        {isUrdu ? 'کھاتے میں شامل رقم' : 'Added to Customer Khata'}
                      </label>
                      <div className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-black text-sky-700" dir="ltr">
                        {formatPKR(bKhata)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes & Operator */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1 font-urdu">
                      {isUrdu ? 'ڈرائیور تفصیل / نوٹس' : 'Notes / Driver Details'}
                    </label>
                    <input
                      type="text"
                      placeholder={isUrdu ? 'مثال: ہائی وے لانگ روٹ ٹرک کیلئے بلک تیل' : 'e.g. Bulk issue for highway long-haul truck'}
                      value={bulkNotes}
                      onChange={(e) => setBulkNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500 font-urdu"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1 font-urdu">
                      {isUrdu ? 'ڈسپیچر آپریٹر' : 'Dispatcher Operator'}
                    </label>
                    <input
                      type="text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500 font-urdu"
                    />
                  </div>
                </div>

                {/* Submit Bulk Dumping */}
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 font-urdu"
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{isUrdu ? 'بلک ڈمپنگ محفوظ کریں اور رسید بنائیں' : 'Confirm Bulk Dumping & Generate Receipt'}</span>
                </button>

              </div>

            </form>
          ) : (
            /* Bulk Dumping Log Table */
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase text-amber-800 flex items-center gap-1.5 font-urdu">
                  <Truck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{isUrdu ? 'گاڑیوں میں بلک ڈمپنگ کا لاگ' : 'Vehicle Bulk Dumping Log'}</span>
                </span>
                <span className="text-xs font-mono text-slate-500" dir="ltr">
                  {bulkSales.length} {isUrdu ? 'ریکارڈز' : 'Entries'}
                </span>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-start text-xs min-w-[700px]">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-200 bg-slate-50 font-mono font-urdu">
                      <th className="py-2.5 px-2 text-start">{isUrdu ? 'تاریخ و وقت' : 'Date & Time'}</th>
                      <th className="py-2.5 px-2 text-start">{isUrdu ? 'گاڑی نمبر' : 'Target Vehicle'}</th>
                      <th className="py-2.5 px-2 text-start">{isUrdu ? 'گاہک کا نام' : 'Customer Name'}</th>
                      <th className="py-2.5 px-2 text-start">{isUrdu ? 'ایندھن' : 'Fuel'}</th>
                      <th className="py-2.5 px-2 text-end">{isUrdu ? 'لیٹرز' : 'Liters Dumped'}</th>
                      <th className="py-2.5 px-2 text-end">{isUrdu ? 'ریٹ' : 'Rate'}</th>
                      <th className="py-2.5 px-2 text-end">{isUrdu ? 'کل رقم' : 'Total Amount'}</th>
                      <th className="py-2.5 px-2 text-center">{isUrdu ? 'ادائیگی' : 'Payment'}</th>
                      <th className="py-2.5 px-2 text-center">{isUrdu ? 'کارروائی' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {bulkSales.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-2 text-slate-500 text-[11px] whitespace-nowrap text-start">{formatDateTime(b.date)}</td>
                        <td className="py-2.5 px-2 font-bold text-amber-800 whitespace-nowrap text-start" dir="ltr">{b.vehicleNo}</td>
                        <td className="py-2.5 px-2 text-slate-700 font-sans text-[11px] truncate max-w-[120px] text-start">{b.customerName}</td>
                        <td className="py-2.5 px-2 whitespace-nowrap text-start">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.fuelType === 'petrol' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {b.fuelType.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-end font-bold text-slate-900 whitespace-nowrap" dir="ltr">{formatLitres(b.litres)}</td>
                        <td className="py-2.5 px-2 text-end text-slate-600 whitespace-nowrap" dir="ltr">{b.rate}</td>
                        <td className="py-2.5 px-2 text-end font-bold text-emerald-700 whitespace-nowrap" dir="ltr">{formatPKR(b.totalAmount)}</td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            b.paymentType === 'cash' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-sky-50 text-sky-800 border border-sky-200'
                          }`}>
                            {b.paymentType.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openBulkReceipt(b)}
                              className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all"
                              title="Print / Share Receipt"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVoidBulk(b)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all"
                              title="Void Bulk Dumping (Restores Stock)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};

