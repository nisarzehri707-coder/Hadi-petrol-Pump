/**
 * Utility formatters for Hadi Petrol Pump Management System
 */

export const formatPKR = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rs 0';
  return 'Rs ' + Number(amount).toLocaleString('en-PK', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
};

export const formatLitres = (litres) => {
  if (litres === undefined || litres === null || isNaN(litres)) return '0.00 L';
  return Number(litres).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' L';
};

export const formatNumber = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  return Number(val).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Generate formatted WhatsApp message for customer slips
 */
export const generateWhatsAppSlip = ({
  stationName = 'HADI PETROL PUMP',
  ownerName = 'Tanveer Zehri',
  phone = '',
  vehicleNo = '',
  customerName = '',
  fuelType = 'Super Petrol',
  litres = 0,
  rate = 0,
  totalAmount = 0,
  paidAmount = 0,
  remainingKhata = 0,
  date = new Date().toISOString()
}) => {
  const isFullyPaid = paidAmount >= totalAmount;
  const status = isFullyPaid ? '✅ Fully Paid' : (paidAmount > 0 ? `⚠️ Partial Paid (Khata: ${formatPKR(remainingKhata)})` : '🔴 Udhaar / Khata');
  
  const text = 
`⛽ *${stationName.toUpperCase()}*
_Prop: ${ownerName}_
──────────────────
📅 Date: ${formatDateTime(date)}
🚗 Vehicle: *${vehicleNo || 'N/A'}*
👤 Customer: ${customerName || 'Walking Customer'}
⛽ Fuel: *${fuelType}*
📊 Volume: *${formatLitres(litres)}* @ Rs ${formatNumber(rate)}/L
──────────────────
💰 *Total Bill: ${formatPKR(totalAmount)}*
💵 Paid: ${formatPKR(paidAmount)}
📌 Status: *${status}*
${!isFullyPaid && remainingKhata > 0 ? `🧾 Current Khata Balance: *${formatPKR(remainingKhata)}*\n` : ''}──────────────────
_Thank you for choosing ${stationName}!_
_Contact: 03XX-XXXXXXX_`;

  return text;
};

/**
 * Clean phone number for Pakistani WhatsApp links
 */
export const sanitizeWhatsAppPhone = (phone) => {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('03')) {
    clean = '92' + clean.substring(1);
  } else if (clean.startsWith('3')) {
    clean = '92' + clean;
  }
  return clean;
};

/**
 * Generate formatted WhatsApp message for complete customer statement
 */
export const generateCustomerStatementWhatsApp = ({
  stationName = 'HADI PETROL PUMP',
  ownerName = 'Tanveer Zehri',
  phone = '',
  customerName = '',
  vehicleNo = '',
  balanceKhata = 0,
  transactions = []
}) => {
  let txList = '';
  transactions.slice(0, 8).forEach((tx, idx) => {
    const isCredit = tx.type === 'credit_sale';
    const sign = isCredit ? '+' : '-';
    const amt = isCredit ? tx.khataAmount : tx.paidAmount;
    txList += `${idx + 1}. ${formatDate(tx.date)}: ${isCredit ? `${tx.fuelType || 'Fuel'} (${formatLitres(tx.litres)})` : 'Cash Paid'} -> *${sign}${formatPKR(amt)}*\n`;
  });

  const text =
`📜 *KHATA STATEMENT / حساب لیجر*
⛽ *${stationName.toUpperCase()}*
_Prop: ${ownerName}_
──────────────────
👤 Customer: *${customerName}*
🚗 Vehicle: *${vehicleNo || 'N/A'}*
📞 Phone: ${phone || 'N/A'}
📅 Date: ${formatDateTime(new Date().toISOString())}
──────────────────
*Recent Transactions:*
${txList || 'No recent transactions recorded.\n'}──────────────────
🚨 *Total Outstanding Khata: ${formatPKR(balanceKhata)}*
──────────────────
_Please verify your balance. Thank you!_
_Hadi Petrol Pump, Balochistan_`;

  return text;
};

/**
 * Generate formatted WhatsApp message for supplier statement
 */
export const generateSupplierStatementWhatsApp = ({
  stationName = 'HADI PETROL PUMP',
  ownerName = 'Tanveer Zehri',
  supplierName = '',
  balancePayable = 0,
  recentPurchases = []
}) => {
  let list = '';
  recentPurchases.slice(0, 5).forEach((p, idx) => {
    list += `${idx + 1}. ${formatDate(p.date)}: ${p.fuelName} ${formatLitres(p.litresReceived)} (Inv: ${formatPKR(p.totalInvoice)}, Paid: ${formatPKR(p.cashPaid)})\n`;
  });

  const text =
`🚚 *SUPPLIER BAQI STATEMENT / سپلائر لیجر*
⛽ *${stationName.toUpperCase()}*
_Prop: ${ownerName}_
──────────────────
🏢 Supplier: *${supplierName}*
📅 As of: ${formatDateTime(new Date().toISOString())}
──────────────────
*Recent Deliveries:*
${list || 'No recent supplies recorded.\n'}──────────────────
💰 *Net Balance Payable (Baqi): ${formatPKR(balancePayable)}*
──────────────────
_Official Accounts Record - Hadi Petrol Pump_`;

  return text;
};

