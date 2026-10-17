import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Printer, 
  Share2, 
  Fuel, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  MessageCircle
} from 'lucide-react';
import { 
  formatPKR, 
  formatLitres, 
  formatDateTime, 
  generateWhatsAppSlip, 
  sanitizeWhatsAppPhone 
} from '../utils/formatters';

export const ReceiptModal = () => {
  const { selectedReceipt, setSelectedReceipt, data, showToast } = useApp();
  const { station } = data;

  if (!selectedReceipt) return null;

  const {
    id,
    date = new Date().toISOString(),
    vehicleNo,
    customerName,
    phone,
    fuelType,
    litres,
    rate,
    totalBill,
    paidAmount = 0,
    khataAmount = 0,
    type,
    notes
  } = selectedReceipt;

  const isFullyPaid = paidAmount >= totalBill;
  const slipText = generateWhatsAppSlip({
    stationName: station.name,
    ownerName: station.owner,
    phone: phone || '',
    vehicleNo: vehicleNo || '',
    customerName: customerName || '',
    fuelType: fuelType || 'Fuel',
    litres: litres || 0,
    rate: rate || 0,
    totalAmount: totalBill || 0,
    paidAmount: paidAmount || 0,
    remainingKhata: khataAmount || 0,
    date
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopySlip = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(slipText);
      showToast('Slip copied to clipboard!');
    }
  };

  const handleWhatsAppShare = () => {
    const cleanPhone = sanitizeWhatsAppPhone(phone);
    const encodedText = encodeURIComponent(slipText);
    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Fuel className="w-4 h-4 text-emerald-600" />
            <span>Official Receipt Preview</span>
          </div>
          <button
            onClick={() => setSelectedReceipt(null)}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center active:scale-95 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Ticket Area */}
        <div className="overflow-y-auto p-4 flex-1">
          <div 
            id="printable-receipt" 
            className="bg-slate-50/70 text-slate-900 rounded-2xl p-4 shadow-sm font-mono text-xs border border-slate-200"
          >
            {/* Station Logo & Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-slate-300">
              <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden bg-white ring-2 ring-emerald-500/30 flex items-center justify-center shadow-inner">
                {station.logo ? (
                  <img
                    src={station.logo}
                    alt={station.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white font-sans font-black text-xl">
                    HP
                  </div>
                )}
              </div>
              <h2 className="text-base font-black tracking-tight text-slate-900 uppercase font-sans">
                {station.name}
              </h2>
              <p className="text-[11px] font-bold text-emerald-800 uppercase font-sans mt-0.5">
                Proprietor: {station.owner}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                {station.address}
              </p>
              <p className="text-[10px] text-slate-500 font-sans">
                Phone: {station.phone || '0300-XXXXXXX'}
              </p>
            </div>

            {/* Receipt Details Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-bold">{id || 'REC-786'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span>{formatDateTime(date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle No:</span>
                <span className="font-bold text-slate-900">{vehicleNo || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold">{customerName || 'Walking Customer'}</span>
              </div>
            </div>

            {/* Fuel Breakdown */}
            <div className="py-3 border-b-2 border-dashed border-slate-300 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-800">
                <span>{fuelType || 'Fuel Item'}</span>
                <span>{formatLitres(litres)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Rate per Litre:</span>
                <span>{formatPKR(rate)}</span>
              </div>
              <div className="pt-2 flex justify-between text-sm font-black text-slate-950 border-t border-slate-200">
                <span>TOTAL BILL:</span>
                <span>{formatPKR(totalBill)}</span>
              </div>
            </div>

            {/* Payment Settlement Status */}
            <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-700">
                <span>Cash Paid:</span>
                <span className="font-bold text-emerald-700">{formatPKR(paidAmount)}</span>
              </div>
              {khataAmount > 0 && (
                <div className="flex justify-between text-rose-700 font-bold">
                  <span>Khata / Udhaar:</span>
                  <span>{formatPKR(khataAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 font-bold">
                <span>Payment Status:</span>
                <span className={isFullyPaid ? 'text-emerald-700' : 'text-amber-700'}>
                  {isFullyPaid ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'KHATA')}
                </span>
              </div>
            </div>

            {/* Footer Tagline */}
            <div className="pt-3 text-center text-[10px] text-slate-500 font-sans leading-tight">
              <p className="font-bold text-slate-700">Thank you for visiting Hadi Petrol Pump!</p>
              <p className="mt-0.5 text-slate-400">Quality Fuel & Accurate Meter Guaranteed</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
          {/* Primary WhatsApp Action */}
          <button
            onClick={handleWhatsAppShare}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs tracking-wide shadow-md transition-all active:scale-95"
          >
            <MessageCircle className="w-4 h-4 fill-white text-transparent" />
            <span>Send Slip to WhatsApp</span>
          </button>

          {/* Secondary Actions: Print & Copy */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-all active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={handleCopySlip}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-all active:scale-95"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Text</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
