import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Fuel, 
  Truck, 
  Calendar, 
  Users, 
  FileSpreadsheet, 
  Printer, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  Car,
  BadgeCheck,
  Layers,
  Percent,
  Download,
  ClipboardCheck,
  Search,
  Receipt,
  MessageCircle,
  Wallet,
  Clock,
  History,
  ShieldCheck,
  Scale
} from 'lucide-react';
import { 
  formatPKR, 
  formatLitres, 
  formatDateTime, 
  formatDate, 
  formatNumber,
  generateWhatsAppSlip,
  sanitizeWhatsAppPhone 
} from '../utils/formatters';

export const ReportsView = () => {
  const { 
    data, 
    rates, 
    tanks, 
    station, 
    reconciliations = [], 
    recordStockReconciliation, 
    deleteReconciliation,
    shiftClosings = [], 
    closeDailyShift, 
    deleteShiftClosing,
    allTransactions = [],
    setSelectedReceipt,
    language 
  } = useApp();

  const { sales = [], bulkSales = [], loads = [], expenses = [], customers = [] } = data;
  const isUrdu = language === 'ur';

  // Navigation tab inside Reports
  const [activeReportSection, setActiveReportSection] = useState('profit_margin'); 
  // 'profit_margin' | 'shift_closing' | 'stock_reconciliation' | 'transaction_history' | 'loads_audit'

  // Timeframe filter for profit/margin
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month'

  // Transaction history filters
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all');
  const [historyFuelFilter, setHistoryFuelFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');

  // Physical Dip Form State
  const [dipFuelType, setDipFuelType] = useState('petrol');
  const [dipPhysicalLitres, setDipPhysicalLitres] = useState('');
  const [dipInspector, setDipInspector] = useState(data.station.owner || 'Tanveer Zehri');
  const [dipNotes, setDipNotes] = useState('');

  // Daily Shift Closing Form State
  const [closingShiftName, setClosingShiftName] = useState('Day Shift');
  const [closingOperator, setClosingOperator] = useState('Shift Cashier');
  const [closingActualCash, setClosingActualCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  // Date filtering helper
  const now = new Date();
  const filterDateMatch = (dateStr) => {
    if (dateFilter === 'all') return true;
    const d = new Date(dateStr);
    if (dateFilter === 'today') {
      return d.toDateString() === now.toDateString();
    }
    if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 86400000);
      return d >= weekAgo;
    }
    if (dateFilter === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filteredSales = sales.filter(s => filterDateMatch(s.date));
  const filteredBulk = bulkSales.filter(b => filterDateMatch(b.date));
  const filteredExpenses = expenses.filter(e => filterDateMatch(e.date));

  // =========================================================================
  // CORE REPORT CALCULATIONS:
  // Fuel Type, Total Volume, Margin per Liter, Total Value, Expenses, Net Profit, Stock
  // =========================================================================

  // PETROL METRICS
  const petrolRetailVol = filteredSales.filter(s => s.fuelType === 'petrol').reduce((sum, s) => sum + (Number(s.litresSold) || 0), 0);
  const petrolBulkVol = filteredBulk.filter(b => b.fuelType === 'petrol').reduce((sum, b) => sum + (Number(b.litres) || 0), 0);
  const petrolTotalVol = petrolRetailVol + petrolBulkVol;

  const petrolRetailRev = filteredSales.filter(s => s.fuelType === 'petrol').reduce((sum, s) => sum + (Number(s.totalSaleValue) || 0), 0);
  const petrolBulkRev = filteredBulk.filter(b => b.fuelType === 'petrol').reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  const petrolTotalValue = petrolRetailRev + petrolBulkRev;

  // H7 FIX: Calculate COGS by matching each sale's allocated load(s) and using that load's actual purchase rate
  const calculateTransactionCOGS = (txList, defaultPurchaseRate) => {
    return txList.reduce((totalCogs, tx) => {
      const vol = Number(tx.litresSold || tx.litres || 0);
      if (vol <= 0) return totalCogs;

      // 1. If exact per-load allocation details are available
      if (tx.allocatedLoadDetails && tx.allocatedLoadDetails.length > 0) {
        let matchedQty = 0;
        let txCogs = 0;
        tx.allocatedLoadDetails.forEach(detail => {
          const load = loads.find(l => l.id === detail.loadId);
          const rate = load ? Number(load.purchaseRate || 0) : defaultPurchaseRate;
          txCogs += detail.quantity * rate;
          matchedQty += detail.quantity;
        });
        if (vol > matchedQty) {
          txCogs += (vol - matchedQty) * defaultPurchaseRate;
        }
        return totalCogs + txCogs;
      }

      // 2. Fallback: If allocatedLoadIds array exists
      if (tx.allocatedLoadIds && tx.allocatedLoadIds.length > 0) {
        let matchedRatesSum = 0;
        let validLoadsCount = 0;
        tx.allocatedLoadIds.forEach(id => {
          const load = loads.find(l => l.id === id);
          if (load) {
            matchedRatesSum += Number(load.purchaseRate || 0);
            validLoadsCount++;
          }
        });
        const avgLoadRate = validLoadsCount > 0 ? (matchedRatesSum / validLoadsCount) : defaultPurchaseRate;
        return totalCogs + (vol * avgLoadRate);
      }

      return totalCogs + (vol * defaultPurchaseRate);
    }, 0);
  };

  const petrolSalesList = filteredSales.filter(s => s.fuelType === 'petrol');
  const petrolBulkList = filteredBulk.filter(b => b.fuelType === 'petrol');
  const petrolAvgSellingRate = petrolTotalVol > 0 ? (petrolTotalValue / petrolTotalVol) : (rates?.petrol?.selling || 268.50);
  const petrolPurchaseRate = rates?.petrol?.purchase || 258.00;
  const petrolCOGS = calculateTransactionCOGS([...petrolSalesList, ...petrolBulkList], petrolPurchaseRate);
  const petrolEffectiveCostRate = petrolTotalVol > 0 ? (petrolCOGS / petrolTotalVol) : petrolPurchaseRate;
  const petrolMarginPerLitre = petrolAvgSellingRate - petrolEffectiveCostRate;

  // Attached Load Expenses for Petrol (date filtered loads or total proportional)
  const petrolLoadExpenses = loads
    .filter(l => l.fuelType === 'petrol' && filterDateMatch(l.date))
    .reduce((sum, l) => sum + (Number(l.totalExpenses) || 0), 0);

  // H2 & M9 FIX: Exclude load-linked expenses from general expenses to prevent double-counting
  const totalGenExpenses = filteredExpenses
    .filter(e => !e.loadId)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Combined Volume for ratio
  const dieselRetailVol = filteredSales.filter(s => s.fuelType === 'diesel').reduce((sum, s) => sum + (Number(s.litresSold) || 0), 0);
  const dieselBulkVol = filteredBulk.filter(b => b.fuelType === 'diesel').reduce((sum, b) => sum + (Number(b.litres) || 0), 0);
  const dieselTotalVol = dieselRetailVol + dieselBulkVol;
  const combinedTotalVol = petrolTotalVol + dieselTotalVol;

  const petrolRatio = combinedTotalVol > 0 ? (petrolTotalVol / combinedTotalVol) : 0.5;
  const petrolApportionedGenExp = totalGenExpenses * petrolRatio;
  const petrolTotalExpenses = petrolLoadExpenses + petrolApportionedGenExp;
  const petrolNetProfit = petrolTotalValue - petrolCOGS - petrolTotalExpenses;
  const petrolRemainingStock = Number(tanks?.petrol?.currentStock || 0);
  const petrolStockValue = petrolRemainingStock * petrolPurchaseRate;

  // DIESEL METRICS
  const dieselRetailRev = filteredSales.filter(s => s.fuelType === 'diesel').reduce((sum, s) => sum + (Number(s.totalSaleValue) || 0), 0);
  const dieselBulkRev = filteredBulk.filter(b => b.fuelType === 'diesel').reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  const dieselTotalValue = dieselRetailRev + dieselBulkRev;

  const dieselSalesList = filteredSales.filter(s => s.fuelType === 'diesel');
  const dieselBulkList = filteredBulk.filter(b => b.fuelType === 'diesel');
  const dieselAvgSellingRate = dieselTotalVol > 0 ? (dieselTotalValue / dieselTotalVol) : (rates?.diesel?.selling || 278.00);
  const dieselPurchaseRate = rates?.diesel?.purchase || 266.00;
  const dieselCOGS = calculateTransactionCOGS([...dieselSalesList, ...dieselBulkList], dieselPurchaseRate);
  const dieselEffectiveCostRate = dieselTotalVol > 0 ? (dieselCOGS / dieselTotalVol) : dieselPurchaseRate;
  const dieselMarginPerLitre = dieselAvgSellingRate - dieselEffectiveCostRate;

  const dieselLoadExpenses = loads
    .filter(l => l.fuelType === 'diesel' && filterDateMatch(l.date))
    .reduce((sum, l) => sum + (Number(l.totalExpenses) || 0), 0);

  const dieselRatio = combinedTotalVol > 0 ? (dieselTotalVol / combinedTotalVol) : 0.5;
  const dieselApportionedGenExp = totalGenExpenses * dieselRatio;
  const dieselTotalExpenses = dieselLoadExpenses + dieselApportionedGenExp;
  const dieselNetProfit = dieselTotalValue - dieselCOGS - dieselTotalExpenses;
  const dieselRemainingStock = Number(tanks?.diesel?.currentStock || 0);
  const dieselStockValue = dieselRemainingStock * dieselPurchaseRate;

  // COMBINED STATION TOTALS
  const grandTotalVol = petrolTotalVol + dieselTotalVol;
  const grandTotalValue = petrolTotalValue + dieselTotalValue;
  const grandTotalCOGS = petrolCOGS + dieselCOGS;
  const grandTotalExpenses = petrolTotalExpenses + dieselTotalExpenses;
  const grandNetProfit = grandTotalValue - grandTotalCOGS - grandTotalExpenses;
  const grandAvgMargin = grandTotalVol > 0 ? ((grandTotalValue - grandTotalCOGS) / grandTotalVol) : 0;
  const grandRemainingStock = petrolRemainingStock + dieselRemainingStock;
  const grandStockValue = petrolStockValue + dieselStockValue;

  // Handlers for Physical Dip Reconciliation
  const handleSaveDip = (e) => {
    e.preventDefault();
    const phys = parseFloat(dipPhysicalLitres);
    if (isNaN(phys) || phys < 0) {
      alert('Please enter a valid physical dip volume in litres!');
      return;
    }
    recordStockReconciliation({
      fuelType: dipFuelType,
      physicalStock: phys,
      inspectorName: dipInspector,
      notes: dipNotes
    });
    setDipPhysicalLitres('');
    setDipNotes('');
  };

  // Handlers for Shift Closing
  const handleCloseShiftSubmit = (e) => {
    e.preventDefault();
    const cashVal = closingActualCash ? parseFloat(closingActualCash) : undefined;
    closeDailyShift({
      shiftName: closingShiftName,
      operatorName: closingOperator,
      actualDrawerCash: cashVal,
      notes: closingNotes
    });
    setClosingActualCash('');
    setClosingNotes('');
  };

  // Filtered Master Transactions Feed
  const filteredTransactions = allTransactions.filter(tx => {
    if (historyTypeFilter !== 'all' && tx.type !== historyTypeFilter) return false;
    if (historyFuelFilter !== 'all' && tx.fuelType !== historyFuelFilter) return false;
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      const matchParty = (tx.party || '').toLowerCase().includes(q);
      const matchVeh = (tx.vehicleNo || '').toLowerCase().includes(q);
      const matchNotes = (tx.notes || '').toLowerCase().includes(q);
      const matchId = (tx.id || '').toLowerCase().includes(q);
      if (!matchParty && !matchVeh && !matchNotes && !matchId) return false;
    }
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-20 w-full min-w-0 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-700" />
            <span>{isUrdu ? 'جامع کاروباری رپورٹ، حساب کتاب و آڈٹ' : 'Station Intelligence, Accounting & Audit Records'}</span>
          </h2>
          <p className="text-xs text-slate-500 font-urdu mt-0.5">
            {isUrdu 
              ? 'فروخت شدہ تیل کا حجم، مارجن فی لیٹر، روزانہ شفٹ کلوزنگ، فزیکل ڈِپ آڈٹ، اور ماسٹر ٹرانزیکشن ہسٹری' 
              : 'Complete fuel-wise profitability, daily shift reconciliation, tank physical dip verification, and master audit ledger'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe Filter (For Margins & Volume) */}
          {activeReportSection === 'profit_margin' && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: '7 Days' },
                { id: 'month', label: 'Month' }
              ].map(tf => (
                <button
                  key={tf.id}
                  onClick={() => setDateFilter(tf.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    dateFilter === tf.id ? 'bg-emerald-700 text-white font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition-all active:scale-95 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-700" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Primary Section Switcher Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-5 p-1.5 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold gap-1 shadow-sm">
        
        {/* Tab 1: Fuel Margin & Profit */}
        <button
          type="button"
          onClick={() => setActiveReportSection('profit_margin')}
          className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center ${
            activeReportSection === 'profit_margin'
              ? 'bg-emerald-700 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="truncate">{isUrdu ? 'ایندھن منافع رپورٹ' : 'Fuel Profit / Margin'}</span>
        </button>

        {/* Tab 2: Daily Shift Closing */}
        <button
          type="button"
          onClick={() => setActiveReportSection('shift_closing')}
          className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center ${
            activeReportSection === 'shift_closing'
              ? 'bg-emerald-700 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          <span className="truncate">{isUrdu ? 'روزانہ شفٹ کلوزنگ' : 'Daily Shift Closing'}</span>
        </button>

        {/* Tab 3: Physical Dip Stock Reconciliation */}
        <button
          type="button"
          onClick={() => setActiveReportSection('stock_reconciliation')}
          className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center ${
            activeReportSection === 'stock_reconciliation'
              ? 'bg-emerald-700 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span className="truncate">{isUrdu ? 'ٹینک ڈِپ ری کنسلیشن' : 'Dip Reconciliation'}</span>
        </button>

        {/* Tab 4: Master Transaction History */}
        <button
          type="button"
          onClick={() => setActiveReportSection('transaction_history')}
          className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center ${
            activeReportSection === 'transaction_history'
              ? 'bg-emerald-700 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span className="truncate">{isUrdu ? 'مکمل ٹرانزیکشن ہسٹری' : 'Transaction History'}</span>
        </button>

        {/* Tab 5: Loads Batch Audit */}
        <button
          type="button"
          onClick={() => setActiveReportSection('loads_audit')}
          className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center col-span-2 md:col-span-1 ${
            activeReportSection === 'loads_audit'
              ? 'bg-emerald-700 text-white font-bold shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span className="truncate">{isUrdu ? 'گاڑی لوڈز آڈٹ' : 'Loads Batch Audit'}</span>
        </button>

      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: MANDATORY FUEL PROFITABILITY & MARGIN REPORT                  */}
      {/* ========================================================================= */}
      {activeReportSection === 'profit_margin' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Executive Reconciliation Table */}
          <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Fuel-Wise Quantity, Value, Margin & Stock Report
                  </h3>
                  <span className="text-[10px] text-slate-500 font-urdu">
                    {isUrdu ? 'پٹرول و ڈیزل کی الگ مقدار، اوسط فروخت، مارجن فی لیٹر، اخراجات، خالص منافع اور باقی اسٹاک' : 'Official reconciliation displaying volume, revenue, costs, net profit and remaining tank stock'}
                  </span>
                </div>
              </div>

              <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono font-bold border border-slate-200">
                Period: {dateFilter.toUpperCase()}
              </span>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-200 bg-slate-50 font-mono">
                    <th className="py-3 px-3">Fuel Type</th>
                    <th className="py-3 px-3 text-right">Volume Dispensed</th>
                    <th className="py-3 px-3 text-right">Avg Selling Rate</th>
                    <th className="py-3 px-3 text-right">Purchase Cost</th>
                    <th className="py-3 px-3 text-right">Gross Margin / L</th>
                    <th className="py-3 px-3 text-right">Total Revenue</th>
                    <th className="py-3 px-3 text-right">Expenses</th>
                    <th className="py-3 px-3 text-right text-emerald-800">Net Profit</th>
                    <th className="py-3 px-3 text-right text-amber-800">Remaining Tank Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  
                  {/* Row 1: Super Petrol */}
                  <tr className="hover:bg-slate-50 transition-all">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                        <span className="font-bold text-slate-900 font-sans">Super Petrol</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block ml-4.5 font-mono">
                        (Retail: {formatLitres(petrolRetailVol)} | Bulk: {formatLitres(petrolBulkVol)})
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                      {formatLitres(petrolTotalVol)}
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-700">
                      {petrolAvgSellingRate.toFixed(2)} PKR
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-500">
                      {petrolPurchaseRate.toFixed(2)} PKR
                    </td>
                    <td className={`py-3.5 px-3 text-right font-bold ${petrolMarginPerLitre >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {petrolMarginPerLitre >= 0 ? '+' : ''}{petrolMarginPerLitre.toFixed(2)} PKR
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                      {formatPKR(petrolTotalValue)}
                    </td>
                    <td className="py-3.5 px-3 text-right text-red-600 font-bold">
                      {formatPKR(petrolTotalExpenses)}
                    </td>
                    <td className={`py-3.5 px-3 text-right font-bold text-sm ${petrolNetProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatPKR(petrolNetProfit)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-emerald-800">
                      <div>{formatLitres(petrolRemainingStock)}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{formatPKR(petrolStockValue)}</div>
                    </td>
                  </tr>

                  {/* Row 2: High-Speed Diesel (HSD) */}
                  <tr className="hover:bg-slate-50 transition-all">
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        <span className="font-bold text-slate-900 font-sans">High-Speed Diesel (HSD)</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block ml-4.5 font-mono">
                        (Retail: {formatLitres(dieselRetailVol)} | Bulk: {formatLitres(dieselBulkVol)})
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                      {formatLitres(dieselTotalVol)}
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-700">
                      {dieselAvgSellingRate.toFixed(2)} PKR
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-500">
                      {dieselPurchaseRate.toFixed(2)} PKR
                    </td>
                    <td className={`py-3.5 px-3 text-right font-bold ${dieselMarginPerLitre >= 0 ? 'text-amber-700' : 'text-red-600'}`}>
                      {dieselMarginPerLitre >= 0 ? '+' : ''}{dieselMarginPerLitre.toFixed(2)} PKR
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                      {formatPKR(dieselTotalValue)}
                    </td>
                    <td className="py-3.5 px-3 text-right text-red-600 font-bold">
                      {formatPKR(dieselTotalExpenses)}
                    </td>
                    <td className={`py-3.5 px-3 text-right font-bold text-sm ${dieselNetProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatPKR(dieselNetProfit)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-amber-800">
                      <div>{formatLitres(dieselRemainingStock)}</div>
                      <div className="text-[10px] text-slate-500 font-normal">{formatPKR(dieselStockValue)}</div>
                    </td>
                  </tr>

                  {/* Row 3: COMBINED SUMMARY ROW */}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                    <td className="py-4 px-3 uppercase tracking-wider text-emerald-800 font-sans">
                      Station Total
                    </td>
                    <td className="py-4 px-3 text-right text-slate-900 text-sm">
                      {formatLitres(grandTotalVol)}
                    </td>
                    <td className="py-4 px-3 text-right text-slate-500 text-[11px]">
                      -
                    </td>
                    <td className="py-4 px-3 text-right text-slate-500 text-[11px]">
                      -
                    </td>
                    <td className="py-4 px-3 text-right text-emerald-800">
                      +{grandAvgMargin.toFixed(2)} PKR/L
                    </td>
                    <td className="py-4 px-3 text-right text-slate-900 text-sm">
                      {formatPKR(grandTotalValue)}
                    </td>
                    <td className="py-4 px-3 text-right text-red-600 text-sm">
                      {formatPKR(grandTotalExpenses)}
                    </td>
                    <td className="py-4 px-3 text-right text-emerald-800 text-base">
                      {formatPKR(grandNetProfit)}
                    </td>
                    <td className="py-4 px-3 text-right text-emerald-800 text-sm">
                      <div>{formatLitres(grandRemainingStock)}</div>
                      <div className="text-[10px] text-slate-600 font-normal">{formatPKR(grandStockValue)}</div>
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>

          </div>

          {/* 4 Executive Snapshot Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] uppercase font-bold text-slate-600 font-urdu">
                {isUrdu ? 'کل فروخت (ریونیو)' : 'Total Fuel Sales Realized'}
              </span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1">
                {formatPKR(grandTotalValue)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                Total Volume: {formatLitres(grandTotalVol)}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] uppercase font-bold text-red-600 font-urdu">
                {isUrdu ? 'کل اخراجات (لوڈز + اسٹیشن)' : 'Total Load & Operating Exp'}
              </span>
              <span className="text-xl font-bold font-mono text-red-600 mt-1">
                {formatPKR(grandTotalExpenses)}
              </span>
              <span className="text-[10px] text-slate-500 font-urdu mt-0.5">
                {isUrdu ? 'گاڑی کرایہ، ڈرائیور، پولیس و پمپ' : 'Direct carriage & running expenses'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] uppercase font-bold text-emerald-800 font-urdu">
                {isUrdu ? 'خالص کاروباری منافع' : 'Net Business Profit'}
              </span>
              <span className="text-xl font-bold font-mono text-emerald-800 mt-1">
                {formatPKR(grandNetProfit)}
              </span>
              <span className="text-[10px] text-emerald-700 font-mono mt-0.5">
                Net Margin: {grandTotalVol > 0 ? (grandNetProfit / grandTotalVol).toFixed(2) : '0.00'} PKR/L
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] uppercase font-bold text-amber-700 font-urdu">
                {isUrdu ? 'زیر زمین موجود اسٹاک مالیت' : 'Current Stock Asset Value'}
              </span>
              <span className="text-xl font-bold font-mono text-amber-700 mt-1">
                {formatPKR(grandStockValue)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                In Tanks: {formatLitres(grandRemainingStock)}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: DAILY SHIFT CLOSING & CASH DRAWER RECONCILIATION              */}
      {/* ========================================================================= */}
      {activeReportSection === 'shift_closing' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Shift Closing Entry Card */}
          <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Daily Shift Closing & Drawer Reconciliation
                  </h3>
                  <p className="text-[11px] text-slate-500 font-urdu">
                    {isUrdu ? 'شفٹ کے اختتام پر نوزل میٹرز، کیش وصولی، اخراجات اور دراز کا باضابطہ اندراج' : 'Official shift sign-off reconciling meter readings, cash collected, expenses and drawer variance'}
                  </p>
                </div>
              </div>
            </div>

            {/* Shift Form */}
            <form onSubmit={handleCloseShiftSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Shift Name / Period</label>
                  <input
                    type="text"
                    required
                    value={closingShiftName}
                    onChange={(e) => setClosingShiftName(e.target.value)}
                    placeholder="e.g. Day Shift (8 AM - 8 PM)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Shift In-Charge / Cashier</label>
                  <input
                    type="text"
                    required
                    value={closingOperator}
                    onChange={(e) => setClosingOperator(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-emerald-800 block mb-1">Physical Cash Count in Drawer (PKR)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Physical cash counted"
                    value={closingActualCash}
                    onChange={(e) => setClosingActualCash(e.target.value)}
                    className="w-full bg-emerald-50/50 border border-emerald-500 rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-900 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Closing Remarks / Handover Notes</label>
                <input
                  type="text"
                  placeholder="e.g. All nozzle meters verified, cash handed over to Tanveer Zehri"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Sign-Off Official Shift Closing</span>
              </button>
            </form>
          </div>

          {/* Historical Shift Closings Table */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase text-emerald-800 flex items-center gap-1.5 font-urdu">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>{isUrdu ? 'سابقہ شفٹ کلوزنگ ریکارڈز' : 'Past Shift Closing Audit Log'}</span>
              </span>
              <span className="text-xs font-mono text-slate-500">
                {shiftClosings.length} Shift Records
              </span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-200 bg-slate-50 font-mono">
                    <th className="py-2.5 px-2">Date & Time</th>
                    <th className="py-2.5 px-2">Shift</th>
                    <th className="py-2.5 px-2">Operator</th>
                    <th className="py-2.5 px-2 text-right">Litres Sold</th>
                    <th className="py-2.5 px-2 text-right">Sales Value</th>
                    <th className="py-2.5 px-2 text-right">Cash In</th>
                    <th className="py-2.5 px-2 text-right">Expenses Out</th>
                    <th className="py-2.5 px-2 text-right">Expected Drawer</th>
                    <th className="py-2.5 px-2 text-right">Actual Count</th>
                    <th className="py-2.5 px-2 text-center">Status</th>
                    <th className="py-2.5 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {shiftClosings.map(sc => (
                    <tr key={sc.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-2 text-slate-500 text-[11px] whitespace-nowrap">{formatDateTime(sc.date)}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-900 whitespace-nowrap">{sc.shiftName}</td>
                      <td className="py-2.5 px-2 text-slate-700 font-sans text-[11px] whitespace-nowrap">{sc.operatorName}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-800 whitespace-nowrap">{formatLitres(sc.totalLitresDispensed)}</td>
                      <td className="py-2.5 px-2 text-right text-emerald-700 font-bold whitespace-nowrap">{formatPKR(sc.totalSalesRevenue)}</td>
                      <td className="py-2.5 px-2 text-right text-slate-700 whitespace-nowrap">{formatPKR(sc.totalCashCollected)}</td>
                      <td className="py-2.5 px-2 text-right text-red-600 whitespace-nowrap">{formatPKR(sc.totalExpensesDeducted)}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-900 whitespace-nowrap">{formatPKR(sc.netDrawerCash)}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-emerald-700 whitespace-nowrap">{formatPKR(sc.actualDrawerCash)}</td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          sc.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          {sc.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => deleteShiftClosing(sc.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Delete Record"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: PHYSICAL DIP STOCK RECONCILIATION                             */}
      {/* ========================================================================= */}
      {activeReportSection === 'stock_reconciliation' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Dip Calibration Entry Card */}
          <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Physical Dip Stick Verification & Variance Calibration
                  </h3>
                  <p className="text-[11px] text-slate-500 font-urdu">
                    {isUrdu ? 'زیر زمین ٹینک کی ڈِپ راڈ سے اصل پیمائش درج کریں اور فرق (کمی یا بیشی) کا حساب دیکھیں' : 'Compare theoretical book stock with real physical dip measurement and track evaporation / calibration variance'}
                  </p>
                </div>
              </div>
            </div>

            {/* Current Book Level Reference Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Super Petrol Book Stock</span>
                  <span className="text-base font-bold font-mono text-emerald-700 mt-0.5 block">
                    {formatLitres(tanks.petrol.currentStock)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDipFuelType('petrol')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dipFuelType === 'petrol' ? 'bg-emerald-700 text-white font-bold shadow-sm' : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  Verify Petrol Dip
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">High-Speed Diesel Book Stock</span>
                  <span className="text-base font-bold font-mono text-amber-700 mt-0.5 block">
                    {formatLitres(tanks.diesel.currentStock)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDipFuelType('diesel')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dipFuelType === 'diesel' ? 'bg-amber-600 text-white font-bold shadow-sm' : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  Verify Diesel Dip
                </button>
              </div>
            </div>

            {/* Dip Entry Form */}
            <form onSubmit={handleSaveDip} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800">
                  Selected Tank: <span className="font-mono text-emerald-800 font-bold uppercase">{dipFuelType === 'petrol' ? 'Super Petrol' : 'High-Speed Diesel'}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Current Book Stock: {formatLitres(tanks[dipFuelType]?.currentStock)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-800 block mb-1">
                    Physical Dip Stick Litres *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 3480"
                    value={dipPhysicalLitres}
                    onChange={(e) => setDipPhysicalLitres(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Auditor / Inspector Name
                  </label>
                  <input
                    type="text"
                    value={dipInspector}
                    onChange={(e) => setDipInspector(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Audit Notes / Inspection Reason
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Daily morning calibration"
                    value={dipNotes}
                    onChange={(e) => setDipNotes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Live Variance Calculation Display */}
              {dipPhysicalLitres && (
                <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-600 block">Variance (Physical - Book):</span>
                    <span className={`font-mono font-bold text-sm ${
                      (parseFloat(dipPhysicalLitres) - Number(tanks[dipFuelType]?.currentStock || 0)) >= 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}>
                      {(parseFloat(dipPhysicalLitres) - Number(tanks[dipFuelType]?.currentStock || 0)) >= 0 ? '+' : ''}
                      {formatLitres(parseFloat(dipPhysicalLitres) - Number(tanks[dipFuelType]?.currentStock || 0))}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-600 block">Financial Value of Variance:</span>
                    <span className={`font-mono font-bold text-sm ${
                      (parseFloat(dipPhysicalLitres) - Number(tanks[dipFuelType]?.currentStock || 0)) >= 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}>
                      {formatPKR((parseFloat(dipPhysicalLitres) - Number(tanks[dipFuelType]?.currentStock || 0)) * (rates[dipFuelType]?.purchase || 0))}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Physical Dip & Calibrate Underground Tank</span>
              </button>
            </form>
          </div>

          {/* Historical Reconciliations Table */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase text-amber-800 flex items-center gap-1.5 font-urdu">
                <Scale className="w-4 h-4 text-amber-600" />
                <span>{isUrdu ? 'ماضی کی ڈِپ ری کنسلیشن ہسٹری' : 'Physical Dip Stock Calibration History'}</span>
              </span>
              <span className="text-xs font-mono text-slate-500">
                {reconciliations.length} Calibration Logs
              </span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-200 bg-slate-50 font-mono">
                    <th className="py-2.5 px-2">Date & Time</th>
                    <th className="py-2.5 px-2">Fuel Type</th>
                    <th className="py-2.5 px-2 text-right">Book Stock</th>
                    <th className="py-2.5 px-2 text-right">Physical Dip</th>
                    <th className="py-2.5 px-2 text-right">Variance (L)</th>
                    <th className="py-2.5 px-2 text-right">Value (PKR)</th>
                    <th className="py-2.5 px-2">Inspector</th>
                    <th className="py-2.5 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {reconciliations.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-2 text-slate-500 text-[11px] whitespace-nowrap">{formatDateTime(r.date)}</td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.fuelType === 'petrol' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {r.fuelName}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-600 whitespace-nowrap">{formatLitres(r.bookStock)}</td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-900 whitespace-nowrap">{formatLitres(r.physicalStock)}</td>
                      <td className={`py-2.5 px-2 text-right font-bold whitespace-nowrap ${r.varianceLitres >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {r.varianceLitres >= 0 ? '+' : ''}{formatLitres(r.varianceLitres)}
                      </td>
                      <td className={`py-2.5 px-2 text-right font-bold whitespace-nowrap ${r.varianceValue >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {r.varianceValue >= 0 ? '+' : ''}{formatPKR(r.varianceValue)}
                      </td>
                      <td className="py-2.5 px-2 text-slate-700 font-sans text-[11px] whitespace-nowrap">{r.inspectorName}</td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => deleteReconciliation(r.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Delete Record"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: MASTER TRANSACTION HISTORY & AUDIT LEDGER                     */}
      {/* ========================================================================= */}
      {activeReportSection === 'transaction_history' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              
              {/* Search Box */}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search vehicle number, party, operator, or reference ID..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pl-9 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Type:</span>
                <select
                  value={historyTypeFilter}
                  onChange={(e) => setHistoryTypeFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                >
                  <option value="all">All Types</option>
                  <option value="retail_sale">Retail Dispenser Sale</option>
                  <option value="bulk_dumping">Bulk Vehicle Dumping</option>
                  <option value="load_intake">Fuel Load Intake</option>
                  <option value="khata_payment">Customer Cash Recovery</option>
                  <option value="station_expense">Station Expense</option>
                </select>
              </div>

              {/* Fuel Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Fuel:</span>
                <select
                  value={historyFuelFilter}
                  onChange={(e) => setHistoryFuelFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                >
                  <option value="all">All Fuels</option>
                  <option value="petrol">Super Petrol</option>
                  <option value="diesel">High-Speed Diesel</option>
                </select>
              </div>

            </div>
          </div>

          {/* Master Transaction Table */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase text-emerald-800 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-600" />
                <span>Unified Audit Trail ({filteredTransactions.length} Transactions)</span>
              </span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-200 bg-slate-50 font-mono">
                    <th className="py-2.5 px-2">Date & Time</th>
                    <th className="py-2.5 px-2">Type</th>
                    <th className="py-2.5 px-2">Party / Vehicle</th>
                    <th className="py-2.5 px-2">Fuel</th>
                    <th className="py-2.5 px-2 text-right">Volume</th>
                    <th className="py-2.5 px-2 text-right">Rate</th>
                    <th className="py-2.5 px-2 text-right">Total Amount</th>
                    <th className="py-2.5 px-2 text-right">Cash In/Out</th>
                    <th className="py-2.5 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-2 text-slate-500 text-[11px] whitespace-nowrap">{formatDateTime(tx.date)}</td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          tx.type === 'retail_sale' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          tx.type === 'bulk_dumping' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                          tx.type === 'load_intake' ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                          tx.type === 'khata_payment' ? 'bg-sky-50 text-sky-800 border border-sky-200' :
                          'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          {tx.typeLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-xs">{tx.party}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{tx.vehicleNo}</div>
                      </td>
                      <td className="py-2.5 px-2 whitespace-nowrap text-slate-700 uppercase text-[10px]">
                        {tx.fuelType}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-900 whitespace-nowrap">
                        {tx.litres > 0 ? formatLitres(tx.litres) : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-600 whitespace-nowrap">
                        {tx.rate > 0 ? tx.rate : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatPKR(tx.totalAmount)}
                      </td>
                      <td className={`py-2.5 px-2 text-right font-bold whitespace-nowrap ${
                        tx.cashEffect > 0 ? 'text-emerald-700' : tx.cashEffect < 0 ? 'text-red-600' : 'text-slate-500'
                      }`}>
                        {tx.cashEffect !== 0 ? (tx.cashEffect > 0 ? `+${formatPKR(tx.cashEffect)}` : formatPKR(tx.cashEffect)) : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        {(tx.type === 'retail_sale' || tx.type === 'bulk_dumping' || tx.type === 'khata_payment') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReceipt({
                                id: tx.id,
                                date: tx.date,
                                vehicleNo: tx.vehicleNo,
                                customerName: tx.party,
                                fuelType: tx.fuelType === 'petrol' ? 'Super Petrol' : (tx.fuelType === 'diesel' ? 'High-Speed Diesel' : 'Fuel'),
                                litres: tx.litres,
                                rate: tx.rate,
                                totalBill: tx.totalAmount,
                                paidAmount: tx.cashEffect > 0 ? tx.cashEffect : 0,
                                khataAmount: tx.khataEffect || 0,
                                type: tx.type,
                                notes: tx.notes
                              });
                            }}
                            className="p-1 rounded text-emerald-700 hover:bg-emerald-50"
                            title="View Receipt Slip"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: LOAD-WISE AUDIT RECONCILIATION TABLE                          */}
      {/* ========================================================================= */}
      {activeReportSection === 'loads_audit' && (
        <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5 font-urdu">
              <Car className="w-4 h-4 text-amber-600" />
              <span>{isUrdu ? 'ہر لوڈ کا الگ کھاتہ و منافع ہسٹری' : 'Load Batch Financial Audit Trail'}</span>
            </span>
            <span className="text-xs font-mono text-slate-500">
              {loads.length} Small Vehicle Loads Tracked
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-200 bg-slate-50 font-mono">
                  <th className="py-2.5 px-2">Load ID</th>
                  <th className="py-2.5 px-2">Vehicle</th>
                  <th className="py-2.5 px-2">Date</th>
                  <th className="py-2.5 px-2 text-right">Received (L)</th>
                  <th className="py-2.5 px-2 text-right">Retail (L)</th>
                  <th className="py-2.5 px-2 text-right">Bulk (L)</th>
                  <th className="py-2.5 px-2 text-right">Remaining</th>
                  <th className="py-2.5 px-2 text-right">Expenses</th>
                  <th className="py-2.5 px-2 text-right">Revenue</th>
                  <th className="py-2.5 px-2 text-right">Net Profit</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loads.map(load => (
                  <tr key={load.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 font-bold text-slate-900 whitespace-nowrap">{load.id}</td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <span className="font-bold text-amber-800">{load.vehicleType}</span>
                      <span className="text-[10px] text-slate-500 block">{load.vehicleNo}</span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-500 text-[11px] whitespace-nowrap">{formatDate(load.date)}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900 whitespace-nowrap">{formatLitres(load.litresReceived)}</td>
                    <td className="py-2.5 px-2 text-right text-emerald-700 whitespace-nowrap">{formatLitres(load.retailLitresSold)}</td>
                    <td className="py-2.5 px-2 text-right text-amber-700 whitespace-nowrap">{formatLitres(load.bulkLitresSold)}</td>
                    <td className="py-2.5 px-2 text-right text-slate-700 whitespace-nowrap">{formatLitres(load.litresRemaining)}</td>
                    <td className="py-2.5 px-2 text-right text-red-600 whitespace-nowrap">{formatPKR(load.totalExpenses)}</td>
                    <td className="py-2.5 px-2 text-right text-slate-800 whitespace-nowrap">{formatPKR(load.totalRevenue)}</td>
                    <td className={`py-2.5 px-2 text-right font-bold whitespace-nowrap ${load.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatPKR(load.netProfit)}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        load.status === 'CLOSED' ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {load.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
