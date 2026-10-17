import React from 'react';
import { useApp } from '../context/AppContext';
import { TankGauge } from '../components/TankGauge';
import {
  Wallet,
  Users,
  Fuel,
  FileText,
  Clock,
  TrendingUp,
  Truck,
  Car,
  WalletCards,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';
import { formatPKR, formatLitres, formatDateTime, generateWhatsAppSlip, sanitizeWhatsAppPhone } from '../utils/formatters';

const QuickCard = ({ icon: Icon, label, sub, value, color, onClick, borderColor }) => (
  <div
    onClick={onClick}
    className="card p-4 flex flex-col justify-between cursor-pointer transition-all active:scale-95"
    style={{ borderLeft: `3px solid ${borderColor}` }}
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold font-urdu uppercase tracking-wide"
            style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
      <div className="p-1.5 rounded-lg" style={{ background: `${borderColor}18` }}>
        <Icon className="w-4 h-4" style={{ color: borderColor }} />
      </div>
    </div>
    <div>
      <span className="text-xl md:text-2xl font-bold font-mono block truncate"
            style={{ color: borderColor }}>
        {value}
      </span>
      <span className="text-xs font-urdu mt-0.5 block" style={{ color: 'var(--color-text-muted)' }}>
        {sub}
      </span>
    </div>
  </div>
);

const ActionButton = ({ icon: Icon, title, sub, onClick, color, bgColor }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center text-center p-4 rounded-xl font-semibold text-white transition-all active:scale-95 space-y-1.5"
    style={{ background: color, boxShadow: `0 4px 12px ${bgColor}` }}
  >
    <Icon className="w-6 h-6 opacity-90" />
    <span className="text-sm font-bold font-urdu leading-tight">{title}</span>
    <span className="text-[10px] opacity-75 font-urdu">{sub}</span>
  </button>
);

export const DashboardView = () => {
  const {
    data,
    setActiveTab,
    setSelectedReceipt,
    todayCashCollected,
    totalCustomerKhata,
    todayExpenses,
    todayNetCash,
    language,
  } = useApp();

  const { tanks = {}, rates = {}, sales = [], khataTransactions = [], station = {} } = data || {};
  const safeSales = Array.isArray(sales) ? sales : [];
  const safeKhata = Array.isArray(khataTransactions) ? khataTransactions : [];
  const isUrdu = language === 'ur';

  const handleAddStock = () => setActiveTab('stock');

  const sendWhatsAppDirect = (tx) => {
    const slip = generateWhatsAppSlip({
      stationName: station.name, ownerName: station.owner, phone: tx.phone,
      vehicleNo: tx.vehicleNo, customerName: tx.customerName, fuelType: tx.fuelType,
      litres: tx.litres, rate: tx.rate, totalAmount: tx.totalBill,
      paidAmount: tx.paidAmount, remainingKhata: tx.khataAmount, date: tx.date,
    });
    const cleanPhone = sanitizeWhatsAppPhone(tx.phone);
    const encoded = encodeURIComponent(slip);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-5 md:space-y-6 animate-fade-in-up">

      {/* Banner */}
      <div
        className="p-4 md:p-5 rounded-2xl flex items-center justify-between"
        style={{ background: 'var(--color-primary)', boxShadow: '0 4px 16px rgba(4,120,87,0.2)' }}
      >
        <div>
          <h2 className="text-base md:text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2 font-urdu">
            {station.name}
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              {isUrdu ? 'آن لائن' : 'Active'}
            </span>
          </h2>
          <p className="text-xs text-emerald-100 font-urdu mt-0.5 opacity-90">
            {isUrdu ? `خوش آمدید! مالک: ${station.owner}` : `Welcome, ${station.owner}`}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-semibold text-emerald-200 uppercase font-urdu block">
            {isUrdu ? 'دراز میں کیش' : 'Drawer Cash'}
          </span>
          <span className="text-xl md:text-2xl font-bold font-mono text-white">
            {formatPKR(todayNetCash)}
          </span>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-3 gap-2.5 md:gap-4">
        <QuickCard
          icon={Wallet}
          label={isUrdu ? 'آج کا کیش' : 'Today Cash'}
          sub={isUrdu ? 'شفٹ وصولی' : 'Shift Collections'}
          value={formatPKR(todayCashCollected)}
          borderColor="var(--color-accent)"
          onClick={() => setActiveTab('sale')}
        />
        <QuickCard
          icon={Users}
          label={isUrdu ? 'ادھار کھاتہ' : 'Khata'}
          sub={isUrdu ? 'گاڑیوں کے ذمہ' : 'Receivables'}
          value={formatPKR(totalCustomerKhata)}
          borderColor="var(--color-info)"
          onClick={() => setActiveTab('khata')}
        />
        <QuickCard
          icon={Car}
          label={isUrdu ? 'فعال لوڈز' : 'Active Loads'}
          sub={isUrdu ? 'پرو بکس / زامیاد' : 'Probox / Zamyad'}
          value={`${data.loads?.filter(l => l.status === 'ACTIVE').length || 0} Loads`}
          borderColor="var(--color-warning)"
          onClick={() => setActiveTab('stock')}
        />
      </div>

      {/* Quick Actions */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3"
             style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
          <span className="text-sm font-bold font-urdu" style={{ color: 'var(--color-text-primary)' }}>
            {isUrdu ? 'فوری آپریشن (ایک کلک)' : 'Quick Operations'}
          </span>
          <span className="text-xs font-urdu" style={{ color: 'var(--color-accent)' }}>
            {isUrdu ? 'آسان استعمال' : 'One-tap access'}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <ActionButton
            icon={Fuel}
            title={isUrdu ? 'ریٹیل میٹر سیل' : 'Retail Meter Sale'}
            sub={isUrdu ? 'نوزل ریڈنگ شفٹ' : 'Dispenser Nozzles'}
            color="var(--color-primary)"
            bgColor="rgba(4,120,87,0.2)"
            onClick={() => setActiveTab('sale')}
          />
          <ActionButton
            icon={Truck}
            title={isUrdu ? 'بلک ڈمپنگ' : 'Bulk Dumping'}
            sub={isUrdu ? 'گاڑی میں بلک تیل' : 'Vehicle Bulk Issue'}
            color="var(--color-diesel)"
            bgColor="rgba(217,119,6,0.2)"
            onClick={() => setActiveTab('sale')}
          />
          <ActionButton
            icon={Car}
            title={isUrdu ? 'نیا ایندھن لوڈ' : 'New Load Intake'}
            sub={isUrdu ? 'پرو بکس / زامیاد' : 'Probox / Zamyad'}
            color="var(--color-info)"
            bgColor="rgba(59,130,246,0.2)"
            onClick={() => setActiveTab('stock')}
          />
          <ActionButton
            icon={WalletCards}
            title={isUrdu ? 'روزانہ خرچہ' : 'Daily Expenses'}
            sub={isUrdu ? 'کرایہ، پولیس، چائے' : 'Rent, Police, Staff'}
            color="var(--color-error)"
            bgColor="rgba(220,38,38,0.2)"
            onClick={() => setActiveTab('expenses')}
          />
        </div>
      </div>

      {/* Fuel Tanks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
            <h2 className="text-sm font-bold font-urdu" style={{ color: 'var(--color-text-primary)' }}>
              {isUrdu ? 'زیر زمین ٹینک اسٹاک' : 'Underground Storage Tanks'}
            </h2>
          </div>
          <span className="flex items-center gap-1.5 text-xs"
                style={{ color: 'var(--color-text-muted)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
                  style={{ background: 'var(--color-success)', display: 'inline-block' }} />
            {isUrdu ? 'لائیو' : 'Realtime'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <TankGauge fuelType="petrol" tankData={tanks.petrol} rateData={rates.petrol} onAddStock={handleAddStock} />
          <TankGauge fuelType="diesel" tankData={tanks.diesel} rateData={rates.diesel} onAddStock={handleAddStock} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
            <span className="text-sm font-bold font-urdu" style={{ color: 'var(--color-text-primary)' }}>
              {isUrdu ? 'حالیہ ریکارڈز' : 'Recent Records'}
            </span>
          </div>
          <button
            onClick={() => setActiveTab('summary')}
            className="text-xs font-semibold flex items-center gap-1 hover:underline font-urdu"
            style={{ color: 'var(--color-accent)' }}
          >
            {isUrdu ? 'تمام دیکھیں' : 'View All'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Latest Shifts */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide font-urdu"
               style={{ color: 'var(--color-text-muted)' }}>
              {isUrdu ? 'آخری شفٹ سیلز' : 'Latest Shifts'}
            </p>
            {safeSales.length === 0 ? (
              <div className="card p-4 text-center">
                <p className="text-sm font-urdu" style={{ color: 'var(--color-text-muted)' }}>
                  {isUrdu ? 'ابھی تک کوئی سیل نہیں' : 'No sales recorded yet'}
                </p>
              </div>
            ) : safeSales.slice(0, 2).map((sale) => (
              <div key={sale.id} className="card p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{
                    background: sale.fuelType === 'petrol' ? 'var(--color-success-light)' : 'var(--color-warning-light)',
                    color: sale.fuelType === 'petrol' ? 'var(--color-success)' : 'var(--color-diesel)',
                  }}>
                    <Fuel className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {sale.fuelName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
                        {formatLitres(sale.litresSold)}
                      </span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {formatDateTime(sale.date)} · {sale.operatorName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono block" style={{ color: 'var(--color-text-primary)' }}>
                    {formatPKR(sale.totalSaleValue)}
                  </span>
                  <span className="text-[10px] font-urdu" style={{ color: 'var(--color-accent)' }}>
                    {isUrdu ? `نقد: ${formatPKR(sale.cashReceived)}` : `Cash: ${formatPKR(sale.cashReceived)}`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Latest Khata */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide font-urdu"
               style={{ color: 'var(--color-text-muted)' }}>
              {isUrdu ? 'آخری ادھار پرچیاں' : 'Latest Khata Slips'}
            </p>
            {safeKhata.length === 0 ? (
              <div className="card p-4 text-center">
                <p className="text-sm font-urdu" style={{ color: 'var(--color-text-muted)' }}>
                  {isUrdu ? 'ابھی تک کوئی ادھار نہیں' : 'No khata transactions yet'}
                </p>
              </div>
            ) : safeKhata.slice(0, 2).map((tx) => (
              <div key={tx.id} className="card p-3.5 flex items-center justify-between gap-3">
                <div
                  onClick={() => setSelectedReceipt(tx)}
                  className="flex items-center gap-3 cursor-pointer flex-1"
                >
                  <div className="p-2 rounded-lg" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {tx.customerName}
                      </span>
                      {tx.vehicleNo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                              style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>
                          {tx.vehicleNo}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {tx.fuelType} · {formatDateTime(tx.date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono block" style={{ color: 'var(--color-error)' }}>
                      {formatPKR(tx.khataAmount)}
                    </span>
                    <span className="text-[10px] font-urdu" style={{ color: 'var(--color-text-muted)' }}>
                      {isUrdu ? 'ادھار' : 'Khata'}
                    </span>
                  </div>
                  <button
                    onClick={() => sendWhatsAppDirect(tx)}
                    className="p-2 rounded-lg transition-all active:scale-95"
                    style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}
                    title={isUrdu ? 'واٹس ایپ' : 'WhatsApp'}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
