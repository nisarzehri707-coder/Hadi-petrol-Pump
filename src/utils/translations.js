/**
 * Bilingual Urdu / English dictionary for Hadi Petrol Pump
 * Specially designed for non-technical pump operators and owners
 */

export const TRANSLATIONS = {
  // Navigation
  nav: {
    dashboard: { en: 'Home', ur: 'ہوم' },
    sale: { en: 'Shift Sale', ur: 'سیل میٹر' },
    stock: { en: 'Bowser Stock', ur: 'تیل اسٹاک' },
    khata: { en: 'Khata', ur: 'ادھار کھاتہ' },
    expenses: { en: 'Kharcha', ur: 'روزانہ خرچہ' },
    reports: { en: 'Reports', ur: 'حساب کتاب' },
    settings: { en: 'Settings', ur: 'سیٹنگز' },
  },

  // Main KPI Badges
  kpi: {
    todayCash: { en: "Today's Cash", ur: 'آج کا نقد کیش' },
    drawerRegister: { en: 'Cash in Drawer', ur: 'دراز میں نقد رقم' },
    supplierBaqi: { en: 'Supplier Baqi', ur: 'سپلائر کا بقایا' },
    bowserPayable: { en: 'Bowser Payables', ur: 'باؤزر ادھار' },
    customerKhata: { en: 'Customer Udhaar', ur: 'گاہکوں کا ادھار' },
    receivables: { en: 'Total Receivables', ur: 'کل وصول طلب ادھار' },
    todayExpenses: { en: "Today's Expenses", ur: 'آج کا خرچہ' },
    netCash: { en: 'Net Cash In Drawer', ur: 'خالص کیش دراز' },
  },

  // Tank Gauges
  tanks: {
    title: { en: 'Live Underground Fuel Tanks', ur: 'زیر زمین پٹرول و ڈیزل ٹینک' },
    realtime: { en: 'Live Tank Dip', ur: 'لائیو پیمائش' },
    superPetrol: { en: 'Super Petrol', ur: 'سپر پٹرول' },
    diesel: { en: 'High-Speed Diesel', ur: 'ہائی اسپیڈ ڈیزل' },
    capacity: { en: 'Capacity', ur: 'گنجائش' },
    remaining: { en: 'remaining', ur: 'باقی اسٹاک' },
    addStock: { en: '+ Refill Stock', ur: '+ نیا تیل ڈالیں' },
    lowStock: { en: 'Low Stock Alert!', ur: 'تیل کم ہے!' },
    turnover: { en: 'Avg Turnover: 3,000L / 2d', ur: 'اوسط کھپت: 3 ہزار لیٹر' },
  },

  // Quick Action Buttons
  actions: {
    quickOps: { en: 'Fast Dispenser Operations', ur: 'فوری بٹن (ایک کلک)' },
    shiftClose: { en: 'Shift Meter Close', ur: 'شفٹ میٹر بند کریں' },
    shiftSub: { en: 'Nozzles 1 to 4', ur: 'نوزل ریڈنگ درج کریں' },
    newKhataSlip: { en: 'New Khata Slip', ur: 'نیا ادھار پرچی' },
    khataSub: { en: 'Vehicle Udhaar', ur: 'گاڑی کا ادھار لکھیں' },
    addExpense: { en: 'Record Expense', ur: 'خرچہ درج کریں' },
    expenseSub: { en: 'Staff & Generator', ur: 'چائے، کھانا، جنریٹر' },
    bowserIntake: { en: 'Bowser Intake', ur: 'باؤزر سپلائی وصولی' },
  },

  // Sale Shift Form
  sale: {
    title: { en: 'Shift Closing & Meter Reading', ur: 'شفٹ کلوزنگ و میٹر ریڈنگ' },
    subtitle: { en: 'Enter closing meter reading and collect cash', ur: 'نئی میٹر ریڈنگ لکھیں اور کیش کا حساب ملائیں' },
    step1: { en: '1. Select Nozzle', ur: '۱. نوزل منتخب کریں' },
    step2: { en: '2. Meter Reading', ur: '۲. میٹر ریڈنگ' },
    step3: { en: '3. Cash & Khata Settlement', ur: '۳. نقد رقم اور ادھار' },
    openingMeter: { en: 'Opening Meter', ur: 'پرانی میٹر ریڈنگ' },
    closingMeter: { en: 'Closing Meter (Current)', ur: 'نئی میٹر ریڈنگ (آخری)' },
    sellingRate: { en: 'Selling Rate (PKR/L)', ur: 'ریٹ فی لیٹر (روپے)' },
    litresSold: { en: 'Litres Sold', ur: 'فروخت شدہ لیٹر' },
    totalSaleValue: { en: 'Total Sale Amount', ur: 'کل فروخت کی رقم' },
    cashReceived: { en: 'Cash Received (PKR)', ur: 'وصول شدہ نقد کیش' },
    creditIssued: { en: 'Credit / Khata (PKR)', ur: 'ادھار / کھاتہ رقم' },
    allCash: { en: 'All Cash (No Credit)', ur: 'تمام کیش ملا (کوئی ادھار نہیں)' },
    operatorName: { en: 'Shift / Operator Name', ur: 'شفٹ انچارج کا نام' },
    notes: { en: 'Shift Notes (Optional)', ur: 'کوئی خاص بات یا نوٹ' },
    saveShift: { en: 'Save & Close Shift', ur: 'شفٹ کا حساب محفوظ کریں' },
    shortage: { en: 'Cash Shortage Alert!', ur: 'خبردار: کیش کم ہے!' },
    surplus: { en: 'Surplus Excess Cash', ur: 'کیش زیادہ ہے' },
    balanced: { en: 'Perfect Match (Balanced)', ur: 'حساب بالکل درست ہے' },
  },

  // Khata & WhatsApp Slips
  khata: {
    title: { en: 'Customer Khata & WhatsApp Slips', ur: 'گاہکوں کا ادھار کھاتہ و واٹس ایپ پرچی' },
    subtitle: { en: 'Vehicle credit sales, ledger balance & slip sharing', ur: 'گاڑیوں کا ادھار، بقایا بیلنس اور واٹس ایپ پر پرچی' },
    tabNew: { en: '+ New Slip', ur: '+ نئی پرچی' },
    tabLedger: { en: 'Customer Ledger', ur: 'گاہکوں کی لسٹ' },
    tabRecent: { en: 'Recent Slips', ur: 'حالیہ پرچیاں' },
    vehicleNo: { en: 'Vehicle No. *', ur: 'گاڑی نمبر (لازمی)' },
    vehiclePlaceholder: { en: 'e.g. TLA-786', ur: 'مثال: TLA-786' },
    customerName: { en: 'Customer / Driver Name', ur: 'ڈرائیور یا مالک کا نام' },
    phone: { en: 'WhatsApp Mobile No.', ur: 'واٹس ایپ موبائل نمبر' },
    fuelType: { en: 'Select Fuel', ur: 'تیل کا انتخاب کریں' },
    litres: { en: 'Litres Dispensed (L) *', ur: 'کتنے لیٹر تیل ڈالا؟' },
    rate: { en: 'Rate / Litre (PKR)', ur: 'فی لیٹر قیمت' },
    totalBill: { en: 'Total Bill Amount', ur: 'کل بل کی رقم' },
    cashPaid: { en: 'Cash Paid (PKR)', ur: 'نقد کتنے دیے؟' },
    udhaarAmount: { en: 'Remaining Udhaar (Khata)', ur: 'باقی ادھار کھاتہ' },
    fullPaid: { en: 'Full Paid (Cash)', ur: 'مکمل ادا کر دیا' },
    generateSlip: { en: 'Generate & Send WhatsApp Slip', ur: 'واٹس ایپ پرچی تیار کر کے بھیجیں' },
    searchCustomer: { en: 'Search vehicle no or customer...', ur: 'گاڑی نمبر یا گاہک کا نام تلاش کریں...' },
    receiveCash: { en: 'Receive Cash', ur: 'کیش وصولی' },
    viewStatement: { en: 'Full Statement', ur: 'مکمل کھاتہ' },
    sendStatementWA: { en: 'Send Statement on WhatsApp', ur: 'مکمل کھاتہ واٹس ایپ پر بھیجیں' },
  },

  // Stock Bowser
  stock: {
    title: { en: 'Bowser Stock Refill & Payables', ur: 'باؤزر سے ٹینک بھرائی اور سپلائر حساب' },
    subtitle: { en: 'Intake fuel deliveries into underground tanks', ur: 'باؤزر سے پٹرول یا ڈیزل ٹینک میں اسٹاک منتقل کریں' },
    tabIntake: { en: '+ New Bowser Intake', ur: '+ نیا باؤزر وصول کریں' },
    tabSuppliers: { en: 'Supplier Payables', ur: 'سپلائر کا ادھار (بقایا)' },
    selectFuel: { en: 'Select Fuel Stock to Refill', ur: 'کس ٹینک میں تیل ڈالنا ہے؟' },
    supplier: { en: 'Supplier / Depot', ur: 'سپلائر / آئل ڈپو' },
    litresReceived: { en: 'Litres Received (L) *', ur: 'کتنے لیٹر تیل وصول کیا؟' },
    purchaseRate: { en: 'Purchase Rate / Litre', ur: 'خریداری ریٹ فی لیٹر' },
    totalInvoice: { en: 'Total Bowser Bill', ur: 'باؤزر کا کل بل' },
    cashPaid: { en: 'Upfront Cash Paid', ur: 'نقد کتنا کیش ادا کیا؟' },
    balanceAdded: { en: 'Added to Supplier Baqi', ur: 'سپلائر کے کھاتے میں باقی' },
    tankerNo: { en: 'Tanker / Bowser No.', ur: 'باؤزر / ٹینکر نمبر' },
    driverName: { en: 'Bowser Driver Name', ur: 'ڈرائیور کا نام' },
    confirmIntake: { en: 'Confirm & Add to Tank', ur: 'تصدیق کر کے ٹینک میں شامل کریں' },
    payBaqi: { en: 'Pay Baqi', ur: 'بقایا ادا کریں' },
  },

  // Expenses (Kharcha)
  expenses: {
    title: { en: 'Daily Station Expenses (Kharcha)', ur: 'روزانہ کے اسٹیشن اخراجات (خرچہ)' },
    subtitle: { en: 'Generator, staff food, electricity & misc expenses', ur: 'جنریٹر، عملے کا کھانا چائے، بجلی اور دیگر اخراجات' },
    addBtn: { en: '+ Record New Expense', ur: '+ نیا خرچہ لکھیں' },
    amount: { en: 'Expense Amount (PKR) *', ur: 'خرچ کی رقم (روپے) *' },
    category: { en: 'Expense Category', ur: 'خرچے کی قسم' },
    catGenerator: { en: 'Generator / Diesel Fuel', ur: 'جنریٹر ڈیزل و آئل' },
    catStaff: { en: 'Staff Food & Tea (Chai)', ur: 'اسٹاف کھانا، چائے و ناشتہ' },
    catElectricity: { en: 'Electricity / WAPDA', ur: 'بجلی کا بل' },
    catMaintenance: { en: 'Pump Maintenance', ur: 'پمپ و مشین مرمت' },
    catMisc: { en: 'Other / Miscellaneous', ur: 'متفرق خرچہ' },
    paidTo: { en: 'Paid To (Person / Shop)', ur: 'کس کو دیے؟ (دکان یا شخص)' },
    notes: { en: 'Details / Description', ur: 'تفصیل / نوٹ' },
    saveExpense: { en: 'Save Expense', ur: 'خرچہ محفوظ کریں' },
    recentExpenses: { en: 'Today & Recent Expenses', ur: 'آج کے اخراجات کی تفصیل' },
    deductedFromCash: { en: 'Automatically deducted from daily cash drawer', ur: 'یہ رقم دراز کے نقد کیش سے خود بخود منہا ہو جائے گی' },
  },

  // Common UI
  common: {
    cancel: { en: 'Cancel', ur: 'منسوخ' },
    save: { en: 'Save', ur: 'محفوظ کریں' },
    delete: { en: 'Delete', ur: 'حذف کریں' },
    edit: { en: 'Edit', ur: 'تبدیل کریں' },
    print: { en: 'Print Slip', ur: 'پرچی پرنٹ کریں' },
    copy: { en: 'Copy Slip', ur: 'پرچی کاپی کریں' },
    close: { en: 'Close', ur: 'بند کریں' },
    offline: { en: 'Working Offline. Changes are saved safely.', ur: 'انٹرنیٹ بند ہے۔ تمام ڈیٹا موبائل میں محفوظ ہے۔' },
    switchLang: { en: 'اردو میں دیکھیں', ur: 'Switch to English' },
    langShort: { en: 'اردو', ur: 'ENG' },
  }
};

/**
 * Get translation helper
 */
export const getT = (lang = 'ur') => {
  return (category, key) => {
    try {
      const item = TRANSLATIONS[category]?.[key];
      if (!item) return key;
      return item[lang] || item['en'] || key;
    } catch {
      return key;
    }
  };
};
