import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { formatLitres, formatPKR } from '../utils/formatters';
import { getT } from '../utils/translations';
import {
  authApi,
  stationApi,
  loadsApi,
  salesApi,
  bulkApi,
  customersApi,
  khataApi,
  expensesApi,
  shiftsApi,
  reportsApi,
} from '../services/api';

const AppContext = createContext();


const STORAGE_KEY = 'hadi_petrol_pump_data_v4';

const INITIAL_DATA = {
  station: {
    name: 'HADI PETROL PUMP',
    owner: 'Tanveer Zehri',
    phone: '0300-9876543',
    address: 'Main Highway Bypass, Balochistan',
    logo: null,
    ownerPin: '7860',
    staffPin: '1234',
  },
  rates: {
    petrol: {
      selling: 268.50,
      purchase: 258.00,
    },
    diesel: {
      selling: 278.00,
      purchase: 266.00,
    }
  },
  // Unified common storage tanks
  tanks: {
    petrol: {
      name: 'Super Petrol Storage Tank',
      currentStock: 3500.00,
      capacity: 15000.00,
      minAlert: 1000.00,
      lastUpdated: new Date().toISOString(),
    },
    diesel: {
      name: 'High-Speed Diesel Storage Tank',
      currentStock: 4200.00,
      capacity: 20000.00,
      minAlert: 1500.00,
      lastUpdated: new Date().toISOString(),
    }
  },
  nozzles: [
    { id: 'n1', name: 'Nozzle 1', fuelType: 'petrol', label: 'Super Petrol Dispenser #1', lastMeter: 45280.50 },
    { id: 'n2', name: 'Nozzle 2', fuelType: 'petrol', label: 'Super Petrol Dispenser #2', lastMeter: 18450.00 },
    { id: 'n3', name: 'Nozzle 3', fuelType: 'diesel', label: 'HSD Diesel Dispenser #1', lastMeter: 89410.20 },
    { id: 'n4', name: 'Nozzle 4', fuelType: 'diesel', label: 'HSD Diesel Dispenser #2', lastMeter: 34120.00 },
  ],
  // Load / Trip procurement (Small vehicles: Probox max ~2000L and Zamyad)
  loads: [
    {
      id: 'LOAD-2026-001',
      date: new Date(Date.now() - 86400000 * 3).toISOString(),
      vehicleType: 'Probox',
      vehicleNo: 'KHI-4920',
      fuelType: 'diesel',
      litresReceived: 1800.00,
      purchaseRate: 265.00,
      totalCost: 477000.00,
      litresRemaining: 0.00,
      retailLitresSold: 1200.00,
      bulkLitresSold: 600.00,
      status: 'CLOSED',
      closedAt: new Date(Date.now() - 86400000).toISOString(),
      expenses: [
        { id: 'lexp_1', title: 'Vehicle Rent / Carriage', category: 'Vehicle Rent', amount: 12000, notes: 'Direct carriage from Hub depot', date: new Date(Date.now() - 86400000 * 3).toISOString() },
        { id: 'lexp_2', title: 'Driver Expense / Bhatta', category: 'Driver Expense', amount: 3000, notes: 'Trip bhatta and meal', date: new Date(Date.now() - 86400000 * 3).toISOString() },
        { id: 'lexp_3', title: 'Police / Checkpoint Clearance', category: 'Police / Checkpoint', amount: 4000, notes: 'Highway security clearance', date: new Date(Date.now() - 86400000 * 3).toISOString() },
        { id: 'lexp_4', title: 'Commission / Munshiana', category: 'Commission', amount: 2000, notes: 'Terminal munshi commission', date: new Date(Date.now() - 86400000 * 3).toISOString() },
      ],
      totalExpenses: 21000.00,
      totalRevenue: 500400.00,
      costOfGoodsSold: 477000.00,
      netProfit: 2400.00,
      supplierName: 'Hub Depot Supply',
      driverName: 'Sher Ali',
      notes: 'First completed Probox load, auto-closed after 1800L sold out'
    },
    {
      id: 'LOAD-2026-002',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      vehicleType: 'Zamyad',
      vehicleNo: 'ZMD-8812',
      fuelType: 'diesel',
      litresReceived: 2200.00,
      purchaseRate: 266.00,
      totalCost: 585200.00,
      litresRemaining: 900.00,
      retailLitresSold: 800.00,
      bulkLitresSold: 500.00,
      status: 'ACTIVE',
      closedAt: null,
      expenses: [
        { id: 'lexp_5', title: 'Vehicle Rent / Carriage', category: 'Vehicle Rent', amount: 15000, notes: 'Zamyad transport carriage', date: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: 'lexp_6', title: 'Police / Checkpoint Clearance', category: 'Police / Checkpoint', amount: 5000, notes: 'Border bypass checkpost', date: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: 'lexp_7', title: 'Driver Expense', category: 'Driver Expense', amount: 3500, notes: 'Driver payment', date: new Date(Date.now() - 86400000 * 2).toISOString() }
      ],
      totalExpenses: 23500.00,
      totalRevenue: 361400.00,
      costOfGoodsSold: 345800.00,
      netProfit: -7900.00,
      supplierName: 'Quetta Logistics',
      driverName: 'Gul Khan',
      notes: 'Zamyad morning trip, currently active & dispensing'
    },
    {
      id: 'LOAD-2026-003',
      date: new Date(Date.now() - 86400000).toISOString(),
      vehicleType: 'Probox',
      vehicleNo: 'AFG-3310',
      fuelType: 'petrol',
      litresReceived: 1750.00,
      purchaseRate: 258.00,
      totalCost: 451500.00,
      litresRemaining: 1100.00,
      retailLitresSold: 650.00,
      bulkLitresSold: 0.00,
      status: 'ACTIVE',
      closedAt: null,
      expenses: [
        { id: 'lexp_8', title: 'Vehicle Rent', category: 'Vehicle Rent', amount: 11000, notes: 'Probox carriage', date: new Date(Date.now() - 86400000).toISOString() },
        { id: 'lexp_9', title: 'Commission', category: 'Commission', amount: 2500, notes: 'Munshi commission', date: new Date(Date.now() - 86400000).toISOString() }
      ],
      totalExpenses: 13500.00,
      totalRevenue: 174525.00,
      costOfGoodsSold: 167700.00,
      netProfit: -6675.00,
      supplierName: 'Hub Terminal',
      driverName: 'Niamatullah',
      notes: 'Fresh Super Petrol Probox trip'
    }
  ],
  // Operation B: Bulk Dumping Log (direct issue into other vehicles)
  bulkSales: [
    {
      id: 'bulk_1',
      date: new Date(Date.now() - 86400000).toISOString(),
      vehicleNo: 'TLA-786',
      customerName: 'Zehri Goods Transport',
      fuelType: 'diesel',
      litres: 500.00,
      rate: 278.00,
      totalAmount: 139000.00,
      paymentType: 'khata',
      cashPaid: 0,
      khataAmount: 139000.00,
      allocatedLoadIds: ['LOAD-2026-002'],
      operatorName: 'Shift 2 (Night)',
      notes: 'Bulk issue for highway long-route truck'
    },
    {
      id: 'bulk_2',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      vehicleNo: 'KHI-9921',
      customerName: 'Khanzada Dumper Service',
      fuelType: 'diesel',
      litres: 600.00,
      rate: 278.00,
      totalAmount: 166800.00,
      paymentType: 'cash',
      cashPaid: 166800.00,
      khataAmount: 0,
      allocatedLoadIds: ['LOAD-2026-001'],
      operatorName: 'Shift 1 (Day)',
      notes: 'Bulk filling for quarry dumper'
    }
  ],
  // Operation A: Retail Shift / Meter Readings Log
  sales: [
    {
      id: 'sale_1',
      date: new Date(Date.now() - 86400000).toISOString(),
      nozzleId: 'n3',
      fuelType: 'diesel',
      fuelName: 'High-Speed Diesel (HSD)',
      openingMeter: 87910.20,
      closingMeter: 88710.20,
      litresSold: 800.00,
      rate: 278.00,
      totalSaleValue: 222400.00,
      cashReceived: 200000.00,
      creditIssued: 22400.00,
      variance: 0,
      operatorName: 'Shift 2 (Night)',
      notes: 'Highway night shift meter closing',
      allocatedLoadIds: ['LOAD-2026-002']
    },
    {
      id: 'sale_2',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      nozzleId: 'n1',
      fuelType: 'petrol',
      fuelName: 'Super Petrol',
      openingMeter: 44630.50,
      closingMeter: 45280.50,
      litresSold: 650.00,
      rate: 268.50,
      totalSaleValue: 174525.00,
      cashReceived: 170000.00,
      creditIssued: 4525.00,
      variance: 0,
      operatorName: 'Shift 1 (Day)',
      notes: 'Day shift petrol dispenser sales',
      allocatedLoadIds: ['LOAD-2026-003']
    }
  ],
  suppliers: [
    {
      id: 'sup_1',
      name: 'Hub Petroleum Supply',
      phone: '0321-4567890',
      location: 'Hub Border / Terminal',
      balancePayable: 180000,
      lastSupply: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'sup_2',
      name: 'Quetta Diesel Logistics',
      phone: '0333-7890123',
      location: 'Depot Bypass',
      balancePayable: 120000,
      lastSupply: new Date(Date.now() - 86400000 * 4).toISOString(),
    }
  ],
  customers: [
    {
      id: 'cust_1',
      name: 'Zehri Goods Transport',
      vehicleNo: 'TLA-786',
      phone: '0300-1122334',
      balanceKhata: 85000,
      notes: 'HSD Diesel fleet customer',
      lastTransaction: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'cust_2',
      name: 'Khanzada Dumper Service',
      vehicleNo: 'KHI-9921',
      phone: '0315-9988776',
      balanceKhata: 42000,
      notes: 'Weekly clearance',
      lastTransaction: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'cust_3',
      name: 'Haji Aslam Passenger Coach',
      vehicleNo: 'BSA-450',
      phone: '0345-5544332',
      balanceKhata: 16500,
      notes: 'Route coach',
      lastTransaction: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: 'cust_4',
      name: 'Malik Tariq (Personal Vigo)',
      vehicleNo: 'BF-8822',
      phone: '0322-6677889',
      balanceKhata: 9200,
      notes: 'Super Petrol account',
      lastTransaction: new Date(Date.now() - 86400000 * 5).toISOString(),
    }
  ],
  khataTransactions: [
    {
      id: 'ktx_1',
      customerId: 'cust_1',
      customerName: 'Zehri Goods Transport',
      vehicleNo: 'TLA-786',
      phone: '0300-1122334',
      date: new Date(Date.now() - 86400000).toISOString(),
      fuelType: 'diesel',
      litres: 133.09,
      rate: 278.00,
      totalBill: 37000,
      paidAmount: 0,
      khataAmount: 37000,
      type: 'credit_sale',
      notes: 'Bulk issue credit for TLA-786'
    }
  ],
  expenses: [
    {
      id: 'exp_1',
      date: new Date(Date.now() - 86400000).toISOString(),
      category: 'Generator Fuel',
      amount: 4500,
      paidTo: 'Generator Diesel Fill',
      notes: 'Load shedding backup generator running',
      loadId: null
    },
    {
      id: 'exp_2',
      date: new Date().toISOString(),
      category: 'Staff Food & Tea',
      amount: 1500,
      paidTo: 'Highway Hotel & Chai',
      notes: 'Day & night staff shift refreshments',
      loadId: null
    }
  ],
  // Physical Dip Reconciliations History
  reconciliations: [
    {
      id: 'rec_1',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      fuelType: 'petrol',
      fuelName: 'Super Petrol',
      bookStock: 3520.00,
      physicalStock: 3500.00,
      varianceLitres: -20.00,
      varianceValue: -5160.00,
      inspectorName: 'Tanveer Zehri',
      notes: 'Evening physical dip stick audit - minor normal evaporation',
    },
    {
      id: 'rec_2',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      fuelType: 'diesel',
      fuelName: 'High-Speed Diesel',
      bookStock: 4210.00,
      physicalStock: 4200.00,
      varianceLitres: -10.00,
      varianceValue: -2660.00,
      inspectorName: 'Tanveer Zehri',
      notes: 'Diesel underground dip verified accurately',
    }
  ],
  // Shift Closings Log
  shiftClosings: [
    {
      id: 'sc_1',
      date: new Date(Date.now() - 86400000).toISOString(),
      shiftName: 'Night Shift (8 PM - 8 AM)',
      operatorName: 'Shift 2 (Night)',
      totalLitresDispensed: 1300.00,
      totalSalesRevenue: 361400.00,
      totalCashCollected: 200000.00,
      totalCreditIssued: 161400.00,
      totalExpensesDeducted: 4500.00,
      netDrawerCash: 195500.00,
      actualDrawerCash: 195500.00,
      cashDiscrepancy: 0.00,
      status: 'VERIFIED',
      notes: 'Night shift closed balanced. All meter readings verified by Tanveer Zehri.'
    }
  ]
};

export const AppProvider = ({ children }) => {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_DATA,
          ...parsed,
          station: { ...INITIAL_DATA.station, ...(parsed.station || {}) },
          rates: {
            petrol: { ...INITIAL_DATA.rates.petrol, ...(parsed.rates?.petrol || {}) },
            diesel: { ...INITIAL_DATA.rates.diesel, ...(parsed.rates?.diesel || {}) },
          },
          tanks: {
            petrol: { ...INITIAL_DATA.tanks.petrol, ...(parsed.tanks?.petrol || {}) },
            diesel: { ...INITIAL_DATA.tanks.diesel, ...(parsed.tanks?.diesel || {}) },
          },
          loads: parsed.loads?.length ? parsed.loads : INITIAL_DATA.loads,
          bulkSales: parsed.bulkSales || INITIAL_DATA.bulkSales,
          sales: parsed.sales || INITIAL_DATA.sales,
          expenses: parsed.expenses || INITIAL_DATA.expenses,
          suppliers: parsed.suppliers || INITIAL_DATA.suppliers,
          customers: parsed.customers || INITIAL_DATA.customers,
          nozzles: parsed.nozzles || INITIAL_DATA.nozzles,
          reconciliations: parsed.reconciliations || INITIAL_DATA.reconciliations,
          shiftClosings: parsed.shiftClosings || INITIAL_DATA.shiftClosings,
        };
      }
    } catch (e) {
      console.error('Error loading saved data from localStorage:', e);
    }
    return INITIAL_DATA;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [toast, setToast] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Persistent local cache safeguard across restarts
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [data]);

  const [isLoading, setIsLoading] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(true);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const LANG_KEY = 'hadi_petrol_lang_v1';
  const [language, setLanguage] = useState(() => {
    try {
      const savedLang = localStorage.getItem(LANG_KEY);
      if (savedLang) return savedLang;
    } catch (e) {}
    return 'ur';
  });

  const toggleLanguage = () => {
    setLanguage(prev => {
      const next = prev === 'ur' ? 'en' : 'ur';
      try {
        localStorage.setItem(LANG_KEY, next);
      } catch (e) {}
      showToast(next === 'ur' ? 'زبان اردو منتخب ہوگئی' : 'Switched to English');
      return next;
    });
  };

  const t = getT(language);

  const AUTH_KEY = 'hadi_petrol_auth_user_v1';
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedAuth = localStorage.getItem(AUTH_KEY);
      if (savedAuth) {
        return JSON.parse(savedAuth);
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  // Central refreshData: queries backend and updates React state
  const refreshData = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const [
        bootRes, loadsRes, salesRes, bulkRes, custRes, khataRes, expRes, shiftsRes
      ] = await Promise.all([
        stationApi.getBootstrap(),
        loadsApi.getAll().catch(() => ({ loads: [] })),
        salesApi.getAll().catch(() => ({ sales: [] })),
        bulkApi.getAll().catch(() => ({ bulkSales: [] })),
        customersApi.getAll().catch(() => ({ customers: [] })),
        khataApi.getTransactions().catch(() => ({ transactions: [] })),
        expensesApi.getAll().catch(() => ({ expenses: [] })),
        shiftsApi.getAll().catch(() => ({ shifts: [] })),
      ]);

      const st = bootRes.station || {};
      const tks = bootRes.tanks || [];
      const nzs = bootRes.nozzles || [];

      const petrolTank = tks.find(t => t.fuelType === 'Petrol') || {};
      const dieselTank = tks.find(t => t.fuelType === 'Diesel') || {};

      setData(prev => ({
        ...prev,
        station: {
          ...prev.station,
          name: st.name || prev.station.name,
          nameUrdu: st.nameUrdu || prev.station.nameUrdu,
          address: st.address || prev.station.address,
          phone: st.phone || prev.station.phone,
          owner: st.ownerName || prev.station.owner,
          currency: st.currency || 'PKR',
        },
        rates: {
          petrol: {
            selling: Number(st.petrolRate) || 279.75,
            purchase: Number(st.petrolPurchaseRate) || 268.00,
          },
          diesel: {
            selling: Number(st.dieselRate) || 285.50,
            purchase: Number(st.dieselPurchaseRate) || 273.50,
          },
        },
        tanks: {
          petrol: {
            name: petrolTank.name || 'Super Petrol Storage Tank',
            currentStock: Number(petrolTank.currentStock) || 0,
            capacity: Number(petrolTank.capacity) || 15000,
            minAlert: Number(petrolTank.minAlert) || 1000,
            lastUpdated: petrolTank.lastUpdated || new Date().toISOString(),
          },
          diesel: {
            name: dieselTank.name || 'High-Speed Diesel Storage Tank',
            currentStock: Number(dieselTank.currentStock) || 0,
            capacity: Number(dieselTank.capacity) || 20000,
            minAlert: Number(dieselTank.minAlert) || 1500,
            lastUpdated: dieselTank.lastUpdated || new Date().toISOString(),
          },
        },
        nozzles: nzs.length > 0 ? nzs.map(n => ({
          id: n.id,
          name: n.name,
          label: n.label,
          fuelType: n.fuelType?.toLowerCase() === 'petrol' ? 'petrol' : 'diesel',
          lastMeter: Number(n.lastMeter) || 0,
          isActive: n.isActive,
        })) : prev.nozzles,
        loads: (loadsRes.loads && loadsRes.loads.length > 0) ? loadsRes.loads.map(l => ({
          ...l,
          fuelType: l.fuelType?.toLowerCase() === 'petrol' ? 'petrol' : 'diesel',
          status: l.status?.toUpperCase() || 'ACTIVE',
        })) : prev.loads,
        sales: (salesRes.sales && salesRes.sales.length > 0) ? salesRes.sales.map(s => ({
          ...s,
          fuelType: s.fuelType?.toLowerCase() === 'petrol' ? 'petrol' : 'diesel',
        })) : prev.sales,
        bulkSales: (bulkRes.bulkSales && bulkRes.bulkSales.length > 0) ? bulkRes.bulkSales.map(b => ({
          ...b,
          fuelType: b.fuelType?.toLowerCase() === 'petrol' ? 'petrol' : 'diesel',
        })) : prev.bulkSales,
        customers: (custRes.customers && custRes.customers.length > 0) ? custRes.customers : prev.customers,
        khataTransactions: (khataRes.transactions && khataRes.transactions.length > 0) ? khataRes.transactions.map(k => ({
          ...k,
          type: k.type === 'Payment' ? 'payment_received' : 'credit_sale',
        })) : prev.khataTransactions,
        expenses: (expRes.expenses && expRes.expenses.length > 0) ? expRes.expenses : prev.expenses,
        shiftClosings: (shiftsRes.shifts && shiftsRes.shifts.length > 0) ? shiftsRes.shifts : prev.shiftClosings,
      }));

      setIsBackendConnected(true);
    } catch (err) {
      console.warn('Backend connection unavailable, running with cached data:', err.message);
      setIsBackendConnected(false);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  // Initial load: verify auth session and fetch latest data
  useEffect(() => {
    const initApp = async () => {
      try {
        const meRes = await authApi.getMe();
        if (meRes?.user) {
          setCurrentUser(meRes.user);
          localStorage.setItem(AUTH_KEY, JSON.stringify(meRes.user));
        }
      } catch (e) {
        // Token expired or invalid
      }
      await refreshData();
    };
    initApp();
  }, []);

  // Multi-device live synchronization: silent background poll every 6 seconds
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      refreshData(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Secure server-side authentication
  const login = async (role, enteredPin) => {
    if (!enteredPin || enteredPin.trim() === '') {
      showToast('Please enter a PIN.', 'error');
      return { success: false, error: 'No PIN entered' };
    }

    try {
      const serverRole = role === 'operator' ? 'cashier' : role;
      const res = await authApi.login({ role: serverRole, pin: enteredPin.trim() });
      const user = {
        id: res.user.id,
        name: res.user.name,
        role: res.user.role === 'cashier' ? 'operator' : res.user.role,
        username: res.user.username,
        title: res.user.role === 'owner' ? 'Station Owner / Admin' : 'Pump Attendant / Staff',
      };
      setCurrentUser(user);
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      await refreshData();
      showToast(`Welcome back, ${user.name}!`);
      return { success: true };
    } catch (err) {
      showToast(err.message || 'Invalid PIN. Access denied.', 'error');
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {}
    setCurrentUser(null);
    localStorage.removeItem(AUTH_KEY);
    showToast('Logged out successfully');
  };


  const updatePins = (ownerPin, staffPin) => {
    setData(prev => ({
      ...prev,
      station: {
        ...prev.station,
        ownerPin: ownerPin ? String(ownerPin).trim() : prev.station.ownerPin,
        staffPin: staffPin ? String(staffPin).trim() : prev.station.staffPin,
      }
    }));
    showToast('Security PINs updated successfully!');
  };

  const updateLogo = (base64String) => {
    setData(prev => ({
      ...prev,
      station: {
        ...prev.station,
        logo: base64String,
      }
    }));
    showToast('Station Logo updated successfully!');
  };

  const resetLogo = () => {
    setData(prev => ({
      ...prev,
      station: {
        ...prev.station,
        logo: null,
      }
    }));
    showToast('Reset to default logo');
  };

  const updateStationInfo = (info) => {
    setData(prev => ({
      ...prev,
      station: {
        ...prev.station,
        ...info,
      }
    }));
    showToast('Station details saved!');
  };

  const updateRates = (newRates) => {
    setData(prev => ({
      ...prev,
      rates: {
        ...prev.rates,
        ...newRates,
      }
    }));
    stationApi.updateRates({
      petrolRate: newRates.petrol?.selling,
      dieselRate: newRates.diesel?.selling,
      petrolPurchaseRate: newRates.petrol?.purchase,
      dieselPurchaseRate: newRates.diesel?.purchase,
    }).catch(err => console.warn('Background sync rates error:', err.message));
    showToast('Fuel rates updated!');
  };

  const calibrateTank = (fuelType, currentStock, capacity, minAlert) => {
    setData(prev => ({
      ...prev,
      tanks: {
        ...prev.tanks,
        [fuelType]: {
          ...prev.tanks[fuelType],
          currentStock: Number(currentStock),
          capacity: Number(capacity),
          minAlert: Number(minAlert),
          lastUpdated: new Date().toISOString(),
        }
      }
    }));
    showToast(`${fuelType === 'petrol' ? 'Petrol' : 'Diesel'} tank calibrated!`);
  };

  // Helper: Generate next Load / Batch ID — collision-safe even after deletions
  // H1 FIX: Use the highest existing load number + 1 instead of array.length + 1
  const generateLoadId = (existingLoads = data.loads) => {
    const year = new Date().getFullYear();
    let maxNum = 0;
    (existingLoads || []).forEach(l => {
      // Parse the numeric suffix from IDs like "LOAD-2026-007"
      const match = l.id && l.id.match(/(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    const next = maxNum + 1;
    const padded = String(next).padStart(3, '0');
    return `LOAD-${year}-${padded}`;
  };

  // 1. FUEL PROCUREMENT AS LOADS / TRIPS (Small Vehicles: Probox / Zamyad)
  const addLoad = ({
    vehicleType = 'Probox',
    vehicleNo,
    fuelType = 'diesel',
    litresReceived,
    purchaseRate,
    expenses = [],
    supplierName = '',
    driverName = '',
    notes = '',
  }) => {
    const litres = Number(litresReceived) || 0;
    const rate = Number(purchaseRate) || 0;
    const totalCost = litres * rate;

    const newExpenses = (expenses || []).map((exp, idx) => ({
      id: `lexp_${Date.now()}_${idx}`,
      title: exp.title || exp.category || 'Load Expense',
      category: exp.category || 'General',
      amount: Number(exp.amount) || 0,
      notes: exp.notes || '',
      date: new Date().toISOString()
    }));

    const totalExp = newExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const loadId = generateLoadId(data.loads);

    const newLoad = {
      id: loadId,
      date: new Date().toISOString(),
      vehicleType,
      vehicleNo: vehicleNo ? vehicleNo.toUpperCase().trim() : (vehicleType === 'Probox' ? 'PROBOX TRIP' : 'ZAMYAD TRIP'),
      fuelType,
      litresReceived: litres,
      purchaseRate: rate,
      totalCost,
      litresRemaining: litres,
      retailLitresSold: 0.00,
      bulkLitresSold: 0.00,
      status: 'ACTIVE',
      closedAt: null,
      expenses: newExpenses,
      totalExpenses: totalExp,
      totalRevenue: 0.00,
      costOfGoodsSold: 0.00,
      netProfit: -totalExp,
      supplierName: supplierName || 'Highway Wholesale Supply',
      driverName: driverName || '',
      notes: notes || `${vehicleType} trip arrival with ${formatLitres(litres)}`,
    };

    setData(prev => {
      // 1. Increment common storage tank stock
      const currentTankStock = Number(prev.tanks[fuelType]?.currentStock || 0);
      const updatedTankStock = currentTankStock + litres;

      // 2. Update rates purchase benchmark
      const updatedRates = {
        ...prev.rates,
        [fuelType]: {
          ...prev.rates[fuelType],
          purchase: rate,
        }
      };

      return {
        ...prev,
        tanks: {
          ...prev.tanks,
          [fuelType]: {
            ...prev.tanks[fuelType],
            currentStock: updatedTankStock,
            lastUpdated: new Date().toISOString(),
          }
        },
        rates: updatedRates,
        loads: [newLoad, ...(prev.loads || [])],
      };
    });

    loadsApi.create({
      id: loadId,
      loadNo: loadId,
      vehicleType,
      vehicleNo: newLoad.vehicleNo,
      fuelType: fuelType === 'petrol' ? 'Petrol' : 'Diesel',
      litresReceived: litres,
      purchaseRate: rate,
      totalCost,
      supplierName,
      driverName,
      notes,
      expenses: newExpenses,
      date: newLoad.date,
    }).catch(err => console.warn('Background sync load error:', err.message));

    showToast(`✅ ${vehicleType} Load (${formatLitres(litres)}) Added! ID: ${loadId}`);
    return newLoad;
  };

  // Delete / Void a Load (reverses remaining stock from tank)
  const deleteLoad = (loadId) => {
    const targetLoad = (data.loads || []).find(l => l.id === loadId);
    if (!targetLoad) return;

    setData(prev => {
      const remaining = Number(targetLoad.litresRemaining) || 0;
      const fuelType = targetLoad.fuelType;
      const currentStock = Number(prev.tanks[fuelType]?.currentStock || 0);
      const updatedStock = Math.max(0, currentStock - remaining);

      return {
        ...prev,
        tanks: {
          ...prev.tanks,
          [fuelType]: {
            ...prev.tanks[fuelType],
            currentStock: updatedStock,
            lastUpdated: new Date().toISOString(),
          }
        },
        loads: (prev.loads || []).filter(l => l.id !== loadId),
      };
    });

    showToast(`Load ${loadId} voided and stock adjusted!`);
  };

  // 2. ATTACH EXPENSE TO SPECIFIC LOAD
  const addLoadExpense = ({ loadId, title, category, amount, notes = '' }) => {
    const amt = Number(amount) || 0;
    if (amt <= 0 || !loadId) return;

    const newExp = {
      id: `lexp_${Date.now()}`,
      title: title || category || 'Load Expense',
      category: category || 'General',
      amount: amt,
      notes,
      date: new Date().toISOString()
    };

    setData(prev => {
      const updatedLoads = (prev.loads || []).map(l => {
        if (l.id === loadId) {
          const updatedExpenses = [...(l.expenses || []), newExp];
          const totalExpenses = updatedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          const litresSold = (Number(l.retailLitresSold) || 0) + (Number(l.bulkLitresSold) || 0);
          const costOfGoodsSold = litresSold * (Number(l.purchaseRate) || 0);
          const netProfit = (Number(l.totalRevenue) || 0) - costOfGoodsSold - totalExpenses;

          return {
            ...l,
            expenses: updatedExpenses,
            totalExpenses,
            netProfit
          };
        }
        return l;
      });

      return {
        ...prev,
        loads: updatedLoads
      };
    });

    showToast(`خرچہ محفوظ ہوگیا: ${formatPKR(amt)} برائے ${loadId}`);
  };

  // Delete Load Expense
  const deleteLoadExpense = ({ loadId, expenseId }) => {
    setData(prev => {
      const updatedLoads = (prev.loads || []).map(l => {
        if (l.id === loadId) {
          const updatedExpenses = (l.expenses || []).filter(e => e.id !== expenseId);
          const totalExpenses = updatedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          const litresSold = (Number(l.retailLitresSold) || 0) + (Number(l.bulkLitresSold) || 0);
          const costOfGoodsSold = litresSold * (Number(l.purchaseRate) || 0);
          const netProfit = (Number(l.totalRevenue) || 0) - costOfGoodsSold - totalExpenses;

          return {
            ...l,
            expenses: updatedExpenses,
            totalExpenses,
            netProfit
          };
        }
        return l;
      });

      return {
        ...prev,
        loads: updatedLoads
      };
    });

    showToast('خرچہ ہٹا دیا گیا');
  };

  // 3. UNIFIED DEDUCTION CORE (SINGLE STORAGE TANK, NO DOUBLE COUNTING)
  // C8 FIX: Returns { error } instead of clamping to 0 when stock is insufficient.
  // C4 FIX: Stores per-load allocation details so reversals are exact.
  const deductFromStorageAndLoads = (prevData, fuelType, litresToDeduct, sellingRate, opType, opRefId) => {
    const currentTankStock = Number(prevData.tanks[fuelType]?.currentStock || 0);

    // Hard reject if insufficient stock — do not allow oversell
    if (litresToDeduct > currentTankStock + 0.001) {
      return {
        error: `Insufficient ${fuelType} stock. Available: ${currentTankStock.toFixed(2)} L, Requested: ${litresToDeduct.toFixed(2)} L`,
        updatedTankStock: currentTankStock,
        updatedLoads: prevData.loads || [],
        allocatedLoadIds: [],
        allocatedLoadDetails: [],
      };
    }

    const updatedTankStock = Math.max(0, currentTankStock - litresToDeduct);

    let remainingToAllocate = litresToDeduct;
    const allocatedLoadIds = [];
    // C4 FIX: store per-load quantity so reversals can be exact
    const allocatedLoadDetails = []; // [{ loadId, quantity }]

    // Sort loads by date ascending (FIFO)
    const sortedLoads = [...(prevData.loads || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

    const updatedLoads = sortedLoads.map(load => {
      if (load.fuelType !== fuelType || remainingToAllocate <= 0) {
        return load;
      }

      const availableInLoad = Number(load.litresRemaining) || 0;
      if (availableInLoad <= 0 && load.status === 'CLOSED') {
        return load;
      }

      const allocatedQty = Math.min(availableInLoad, remainingToAllocate);
      if (allocatedQty <= 0) return load;

      remainingToAllocate -= allocatedQty;
      allocatedLoadIds.push(load.id);
      // C4 FIX: record exact quantity allocated to this load
      allocatedLoadDetails.push({ loadId: load.id, quantity: allocatedQty });

      const newRemaining = Math.max(0, availableInLoad - allocatedQty);
      const isNowClosed = newRemaining <= 0.01;

      const newRetailSold = (Number(load.retailLitresSold) || 0) + (opType === 'retail' ? allocatedQty : 0);
      const newBulkSold = (Number(load.bulkLitresSold) || 0) + (opType === 'bulk' ? allocatedQty : 0);
      const totalSoldFromLoad = newRetailSold + newBulkSold;

      const addRevenue = allocatedQty * sellingRate;
      const newTotalRevenue = (Number(load.totalRevenue) || 0) + addRevenue;

      const newCogs = totalSoldFromLoad * (Number(load.purchaseRate) || 0);
      const totalExp = Number(load.totalExpenses) || 0;
      const newNetProfit = newTotalRevenue - newCogs - totalExp;

      return {
        ...load,
        litresRemaining: newRemaining,
        retailLitresSold: newRetailSold,
        bulkLitresSold: newBulkSold,
        totalRevenue: newTotalRevenue,
        costOfGoodsSold: newCogs,
        netProfit: newNetProfit,
        status: isNowClosed ? 'CLOSED' : load.status,
        closedAt: isNowClosed && !load.closedAt ? new Date().toISOString() : load.closedAt,
      };
    });

    return {
      updatedTankStock,
      updatedLoads,
      allocatedLoadIds,
      allocatedLoadDetails, // C4 FIX: exact per-load quantities for safe reversal
    };
  };

  // 4. OPERATION A: RETAIL SHIFT & NOZZLE METER SALES
  const recordShiftSale = ({
    nozzleId,
    openingMeter,
    closingMeter,
    sellingRate,
    cashReceived,
    creditIssued = 0,
    creditCustomerId = null,
    creditCustomerName = '',
    operatorName = '',
    notes = '',
  }) => {
    const nozzle = data.nozzles.find(n => n.id === nozzleId) || data.nozzles[0];
    const fuelType = nozzle.fuelType;
    const op = Number(openingMeter) || 0;
    const cl = Number(closingMeter) || 0;
    const litresSold = Math.max(0, cl - op);
    const rate = Number(sellingRate) || 0;
    const totalSaleValue = litresSold * rate;
    const cash = Number(cashReceived) || 0;
    const credit = Number(creditIssued) || 0;
    const variance = totalSaleValue - (cash + credit);

    // M4 FIX: Validate opening meter is not less than last recorded meter
    const lastMeter = Number(nozzle.lastMeter) || 0;
    if (op < lastMeter - 0.01) {
      showToast(
        `Opening meter (${op}) cannot be less than last recorded meter (${lastMeter}). Possible backdating.`,
        'error'
      );
      return null;
    }

    if (litresSold <= 0) {
      showToast('Closing meter must be greater than opening meter.', 'error');
      return null;
    }

    const saleId = 'sale_' + Date.now();
    const fuelLabel = fuelType === 'petrol' ? 'Super Petrol' : 'High-Speed Diesel (HSD)';

    // C8 FIX: pre-check stock before entering setData (setData callback runs async)
    const currentTankStock = Number(data.tanks[fuelType]?.currentStock || 0);
    if (litresSold > currentTankStock + 0.001) {
      showToast(
        `Insufficient ${fuelType} stock. Available: ${currentTankStock.toFixed(2)} L, Trying to sell: ${litresSold.toFixed(2)} L`,
        'error'
      );
      return null;
    }

    let savedSaleId = null;

    setData(prev => {
      // C8 FIX: check stock inside setData too (handles rapid concurrent calls)
      const deductResult = deductFromStorageAndLoads(
        prev,
        fuelType,
        litresSold,
        rate,
        'retail',
        saleId
      );

      if (deductResult.error) {
        // Cannot modify state here but the pre-check above catches it.
        return prev; // no-op
      }

      const { updatedTankStock, updatedLoads, allocatedLoadIds, allocatedLoadDetails } = deductResult;

      // Update nozzle last meter reading
      const updatedNozzles = prev.nozzles.map(n => {
        if (n.id === nozzleId) {
          return { ...n, lastMeter: cl };
        }
        return n;
      });

      // C5 FIX: All customer mutations happen inside setData callback using prev
      let updatedCustomers = [...prev.customers];
      let updatedKhataTx = [...prev.khataTransactions];
      let effectiveCustId = creditCustomerId || null;
      let creditTxId = null;

      if (credit > 0 && (creditCustomerId || creditCustomerName)) {
        let custIndex = -1;
        if (creditCustomerId) {
          custIndex = updatedCustomers.findIndex(c => c.id === creditCustomerId);
        } else if (creditCustomerName) {
          custIndex = updatedCustomers.findIndex(c => c.name.toLowerCase() === creditCustomerName.toLowerCase().trim());
        }

        let custObj = null;

        if (custIndex >= 0) {
          custObj = {
            ...updatedCustomers[custIndex],
            balanceKhata: (Number(updatedCustomers[custIndex].balanceKhata) || 0) + credit,
            lastTransaction: new Date().toISOString(),
          };
          updatedCustomers[custIndex] = custObj;
          effectiveCustId = custObj.id;
        } else {
          effectiveCustId = 'cust_' + Date.now();
          custObj = {
            id: effectiveCustId,
            name: creditCustomerName.trim() || 'Retail Credit Customer',
            vehicleNo: 'NOZZLE DISP',
            phone: '',
            balanceKhata: credit,
            notes: `Shift credit from ${nozzle.name}`,
            lastTransaction: new Date().toISOString(),
          };
          updatedCustomers.push(custObj);
        }

        creditTxId = 'ktx_' + Date.now();
        const newKtx = {
          id: creditTxId,
          saleRefId: saleId,
          customerId: effectiveCustId,
          customerName: custObj.name,
          vehicleNo: custObj.vehicleNo,
          phone: custObj.phone || '',
          date: new Date().toISOString(),
          fuelType: fuelLabel,
          litres: litresSold,
          rate,
          totalBill: totalSaleValue,
          paidAmount: cash,
          khataAmount: credit,
          type: 'credit_sale',
          notes: `Retail shift credit via ${nozzle.name}`,
        };

        updatedKhataTx = [newKtx, ...updatedKhataTx];
      }

      const newSale = {
        id: saleId,
        date: new Date().toISOString(),
        nozzleId,
        fuelType,
        fuelName: fuelLabel,
        openingMeter: op,
        closingMeter: cl,
        litresSold,
        rate,
        totalSaleValue,
        cashReceived: cash,
        creditIssued: credit,
        creditCustomerId: effectiveCustId,
        creditTxId,
        variance,
        operatorName: operatorName || 'Shift Cashier',
        notes,
        allocatedLoadIds,
        allocatedLoadDetails, // C4 FIX: store exact per-load quantities
      };

      savedSaleId = saleId;
      return {
        ...prev,
        tanks: {
          ...prev.tanks,
          [fuelType]: {
            ...prev.tanks[fuelType],
            currentStock: updatedTankStock,
            lastUpdated: new Date().toISOString(),
          }
        },
        nozzles: updatedNozzles,
        loads: updatedLoads,
        sales: [newSale, ...(prev.sales || [])],
        customers: updatedCustomers,
        khataTransactions: updatedKhataTx,
      };
    });

    if (savedSaleId) {
      salesApi.create({
        id: savedSaleId,
        nozzleId,
        fuelType: fuelType === 'petrol' ? 'Petrol' : 'Diesel',
        openingMeter: op,
        closingMeter: cl,
        litresSold,
        rate,
        totalSaleValue,
        cashReceived: cash,
        creditIssued: credit,
        creditCustomerId: credit > 0 ? (creditCustomerId || null) : null,
        creditCustomerName: credit > 0 ? (creditCustomerName || '') : '',
        operatorName: operatorName || 'Shift Cashier',
        notes,
        date: new Date().toISOString(),
      }).catch(err => console.warn('Background sync sale error:', err.message));

      showToast(`✅ Shift Recorded! Sold ${formatLitres(litresSold)} (${formatPKR(totalSaleValue)})`);
    }
    return savedSaleId;
  };

  // Void / Delete a Shift Sale (Restores tank stock & load allocation & reverses khata debt)
  // C4 FIX: Uses allocatedLoadDetails for exact per-load reversal
  const deleteSale = (saleId) => {
    const targetSale = (data.sales || []).find(s => s.id === saleId);
    if (!targetSale) return;

    setData(prev => {
      const fuelType = targetSale.fuelType;
      const vol = Number(targetSale.litresSold) || 0;
      const currentStock = Number(prev.tanks[fuelType]?.currentStock || 0);
      const updatedStock = currentStock + vol;

      // C4 FIX: Use exact per-load allocation details if available
      const exactDetails = targetSale.allocatedLoadDetails; // [{ loadId, quantity }]

      const updatedLoads = (prev.loads || []).map(l => {
        if (exactDetails && exactDetails.length > 0) {
          // New transactions: use exact per-load quantities
          const detail = exactDetails.find(d => d.loadId === l.id);
          if (!detail) return l;
          const restoredRemaining = (Number(l.litresRemaining) || 0) + detail.quantity;
          const restoredRetail = Math.max(0, (Number(l.retailLitresSold) || 0) - detail.quantity);
          return {
            ...l,
            litresRemaining: restoredRemaining,
            retailLitresSold: restoredRetail,
            status: 'ACTIVE',
            closedAt: null,
          };
        } else if (targetSale.allocatedLoadIds && targetSale.allocatedLoadIds.includes(l.id)) {
          // Legacy transactions (no allocatedLoadDetails): fall back to equal division
          const count = targetSale.allocatedLoadIds.length;
          const share = vol / count;
          const restoredRemaining = (Number(l.litresRemaining) || 0) + share;
          const restoredRetail = Math.max(0, (Number(l.retailLitresSold) || 0) - share);
          return {
            ...l,
            litresRemaining: restoredRemaining,
            retailLitresSold: restoredRetail,
            status: 'ACTIVE',
            closedAt: null,
          };
        }
        return l;
      });

      // Reverse customer khata balance if credit was issued on this sale
      let updatedCustomers = [...prev.customers];
      if (targetSale.creditIssued > 0 && targetSale.creditCustomerId) {
        updatedCustomers = updatedCustomers.map(c => {
          if (c.id === targetSale.creditCustomerId) {
            return {
              ...c,
              balanceKhata: Math.max(0, (Number(c.balanceKhata) || 0) - targetSale.creditIssued),
            };
          }
          return c;
        });
      }

      // Remove the linked khata transaction if any
      const updatedKhataTx = (prev.khataTransactions || []).filter(
        k => k.saleRefId !== saleId && (!targetSale.creditTxId || k.id !== targetSale.creditTxId)
      );

      return {
        ...prev,
        tanks: {
          ...prev.tanks,
          [fuelType]: {
            ...prev.tanks[fuelType],
            currentStock: updatedStock,
            lastUpdated: new Date().toISOString(),
          }
        },
        loads: updatedLoads,
        sales: (prev.sales || []).filter(s => s.id !== saleId),
        customers: updatedCustomers,
        khataTransactions: updatedKhataTx,
      };
    });

    salesApi.delete(saleId).catch(err => console.warn('Background sync delete sale error:', err.message));
    showToast(`Shift sale voided and stock restored (+${formatLitres(targetSale.litresSold)})`);
  };

  // 5. OPERATION B: BULK DUMPING / BULK ISSUE INTO VEHICLES
  const recordBulkDumping = ({
    vehicleNo,
    customerName = '',
    fuelType = 'diesel',
    litres,
    rate,
    paymentType = 'cash',
    paidAmount = 0,
    customerId = null,
    operatorName = '',
    notes = '',
  }) => {
    const vol = Number(litres) || 0;
    const unitRate = Number(rate) || 0;
    const totalAmount = vol * unitRate;
    const cash = paymentType === 'cash' ? totalAmount : (Number(paidAmount) || 0);
    const khataBalance = Math.max(0, totalAmount - cash);

    // C8 FIX: pre-check stock before entering setData
    const currentTankStock = Number(data.tanks[fuelType]?.currentStock || 0);
    if (vol > currentTankStock + 0.001) {
      showToast(
        `Insufficient ${fuelType} stock. Available: ${currentTankStock.toFixed(2)} L, Requested: ${vol.toFixed(2)} L`,
        'error'
      );
      return null;
    }

    const bulkId = 'bulk_' + Date.now();
    const cleanVehicleNo = vehicleNo ? vehicleNo.toUpperCase().trim() : 'BULK VEHICLE';

    setData(prev => {
      // 1. Deduct from SAME common storage tank and deplete active loads FIFO
      const deductResult = deductFromStorageAndLoads(
        prev,
        fuelType,
        vol,
        unitRate,
        'bulk',
        bulkId
      );

      if (deductResult.error) {
        return prev; // no-op (pre-check above catches this)
      }

      const { updatedTankStock, updatedLoads, allocatedLoadIds, allocatedLoadDetails } = deductResult;

      let updatedCustomers = [...prev.customers];
      let updatedKhataTx = [...prev.khataTransactions];
      let effCustId = customerId || null;
      let bulkTxId = null;

      if (paymentType === 'khata' && khataBalance > 0) {
        let custIndex = -1;
        if (customerId) {
          custIndex = updatedCustomers.findIndex(c => c.id === customerId);
        } else if (cleanVehicleNo) {
          custIndex = updatedCustomers.findIndex(c => c.vehicleNo?.toUpperCase() === cleanVehicleNo);
        }

        let custObj = null;

        if (custIndex >= 0) {
          custObj = {
            ...updatedCustomers[custIndex],
            balanceKhata: (Number(updatedCustomers[custIndex].balanceKhata) || 0) + khataBalance,
            lastTransaction: new Date().toISOString(),
          };
          updatedCustomers[custIndex] = custObj;
          effCustId = custObj.id;
        } else {
          effCustId = 'cust_' + Date.now();
          custObj = {
            id: effCustId,
            name: customerName.trim() || `Vehicle ${cleanVehicleNo}`,
            vehicleNo: cleanVehicleNo,
            phone: '',
            balanceKhata: khataBalance,
            notes: 'Bulk dumping customer',
            lastTransaction: new Date().toISOString(),
          };
          updatedCustomers.push(custObj);
        }

        bulkTxId = 'ktx_' + Date.now();
        const newKtx = {
          id: bulkTxId,
          bulkRefId: bulkId,
          customerId: effCustId,
          customerName: custObj.name,
          vehicleNo: cleanVehicleNo,
          phone: custObj.phone || '',
          date: new Date().toISOString(),
          fuelType: fuelType === 'petrol' ? 'Super Petrol' : 'High-Speed Diesel (HSD)',
          litres: vol,
          rate: unitRate,
          totalBill: totalAmount,
          paidAmount: cash,
          khataAmount: khataBalance,
          type: 'bulk_credit',
          notes: `Bulk issue dumped into ${cleanVehicleNo}`,
        };

        updatedKhataTx = [newKtx, ...updatedKhataTx];
      }

      const newBulkSale = {
        id: bulkId,
        date: new Date().toISOString(),
        vehicleNo: cleanVehicleNo,
        customerName: customerName.trim() || 'Bulk Fleet Customer',
        fuelType,
        litres: vol,
        rate: unitRate,
        totalAmount,
        cashPaid: cash,
        khataAmount: khataBalance,
        paymentType,
        customerId: effCustId,
        bulkTxId,
        allocatedLoadIds,
        allocatedLoadDetails, // C4 FIX: exact per-load quantities
        operatorName: operatorName || 'Bulk Dispatch Operator',
        notes,
      };

      return {
        ...prev,
        tanks: {
          ...prev.tanks,
          [fuelType]: {
            ...prev.tanks[fuelType],
            currentStock: updatedTankStock,
            lastUpdated: new Date().toISOString(),
          }
        },
        loads: updatedLoads,
        bulkSales: [newBulkSale, ...(prev.bulkSales || [])],
        customers: updatedCustomers,
        khataTransactions: updatedKhataTx,
      };
    });

    bulkApi.create({
      id: bulkId,
      vehicleNo: cleanVehicleNo,
      customerName: customerName.trim() || 'Bulk Fleet Customer',
      customerId: effCustId || null,
      fuelType: fuelType === 'petrol' ? 'Petrol' : 'Diesel',
      litres: vol,
      rate: unitRate,
      totalAmount,
      cashPaid: cash,
      khataAmount: khataBalance,
      paymentType: paymentType === 'khata' ? (cash > 0 ? 'Partial' : 'Khata') : 'Cash',
      operatorName: operatorName || 'Bulk Dispatch Operator',
      notes,
      date: new Date().toISOString(),
    }).catch(err => console.warn('Background sync bulk error:', err.message));

    showToast(`✅ Bulk Dumping Recorded: ${formatLitres(vol)} to ${cleanVehicleNo}!`);
    return bulkId;
  };

  // Void / Delete a Bulk Dumping (Restores tank stock & reverses khata)
  // C4 FIX: Uses allocatedLoadDetails for exact per-load reversal
  const deleteBulkSale = (bulkId) => {
    const targetBulk = (data.bulkSales || []).find(b => b.id === bulkId);
    if (!targetBulk) return;

    setData(prev => {
      const fuelType = targetBulk.fuelType;
      const vol = Number(targetBulk.litres) || 0;
      const currentStock = Number(prev.tanks[fuelType]?.currentStock || 0);
      const updatedStock = currentStock + vol;

      // C4 FIX: Use exact per-load allocation details if available
      const exactDetails = targetBulk.allocatedLoadDetails;

      const updatedLoads = (prev.loads || []).map(l => {
        if (exactDetails && exactDetails.length > 0) {
          const detail = exactDetails.find(d => d.loadId === l.id);
          if (!detail) return l;
          const restoredRemaining = (Number(l.litresRemaining) || 0) + detail.quantity;
          const restoredBulk = Math.max(0, (Number(l.bulkLitresSold) || 0) - detail.quantity);
          return {
            ...l,
            litresRemaining: restoredRemaining,
            bulkLitresSold: restoredBulk,
            status: 'ACTIVE',
            closedAt: null,
          };
        } else if (targetBulk.allocatedLoadIds && targetBulk.allocatedLoadIds.includes(l.id)) {
          // Legacy: equal division fallback
          const count = targetBulk.allocatedLoadIds.length;
          const share = vol / count;
          const restoredRemaining = (Number(l.litresRemaining) || 0) + share;
          const restoredBulk = Math.max(0, (Number(l.bulkLitresSold) || 0) - share);
          return {
            ...l,
            litresRemaining: restoredRemaining,
            bulkLitresSold: restoredBulk,
            status: 'ACTIVE',
            closedAt: null,
          };
        }
        return l;
      });

      // Reverse customer khata balance if khata amount was applied
      let updatedCustomers = [...prev.customers];
      if (targetBulk.paymentType === 'khata' && targetBulk.khataAmount > 0) {
        updatedCustomers = updatedCustomers.map(c => {
          if ((targetBulk.customerId && c.id === targetBulk.customerId) || c.vehicleNo?.toUpperCase() === targetBulk.vehicleNo?.toUpperCase() || c.name === targetBulk.customerName) {
            return {
              ...c,
              balanceKhata: Math.max(0, (Number(c.balanceKhata) || 0) - targetBulk.khataAmount),
            };
          }
          return c;
        });
      }

      // Remove the linked khata transaction
      const updatedKhataTx = (prev.khataTransactions || []).filter(
        k => k.bulkRefId !== bulkId && (!targetBulk.bulkTxId || k.id !== targetBulk.bulkTxId)
      );

      return {
        ...prev,
        tanks: {
          ...prev.tanks,
          [fuelType]: {
            ...prev.tanks[fuelType],
            currentStock: updatedStock,
            lastUpdated: new Date().toISOString(),
          }
        },
        loads: updatedLoads,
        bulkSales: (prev.bulkSales || []).filter(b => b.id !== bulkId),
        customers: updatedCustomers,
        khataTransactions: updatedKhataTx,
      };
    });

    bulkApi.delete(bulkId).catch(err => console.warn('Background sync delete bulk error:', err.message));
    showToast(`Bulk dumping voided and stock restored (+${formatLitres(targetBulk.litres)})`);
  };

  // 6. CUSTOMER KHATA RECOVERY & SLIP RECORDING
  // C5 FIX: All customer mutations happen inside setData(prev =>) callback
  const recordKhataSale = ({
    customerId,
    customerName,
    vehicleNo,
    phone,
    fuelType,
    litres,
    rate,
    paidAmount = 0,
    notes = '',
  }) => {
    const vol = Number(litres) || 0;
    const price = Number(rate) || 0;
    const totalBill = vol * price;
    const paid = Number(paidAmount) || 0;
    const khataAmount = Math.max(0, totalBill - paid);
    const txId = 'ktx_' + Date.now();

    let capturedCustomer = null;

    setData(prev => {
      // C5 FIX: operate on prev.customers, not data.customers closure
      const updatedCustomers = [...prev.customers];
      let custIndex = -1;

      if (customerId) {
        custIndex = updatedCustomers.findIndex(c => c.id === customerId);
      } else if (vehicleNo) {
        custIndex = updatedCustomers.findIndex(c => c.vehicleNo?.toLowerCase() === vehicleNo.toLowerCase().trim());
      }

      let customerObj = null;

      if (custIndex >= 0) {
        customerObj = {
          ...updatedCustomers[custIndex],
          balanceKhata: (Number(updatedCustomers[custIndex].balanceKhata) || 0) + khataAmount,
          lastTransaction: new Date().toISOString(),
          phone: phone || updatedCustomers[custIndex].phone,
          vehicleNo: vehicleNo || updatedCustomers[custIndex].vehicleNo,
        };
        updatedCustomers[custIndex] = customerObj;
      } else {
        customerObj = {
          id: 'cust_' + Date.now(),
          name: customerName || 'Khata Customer',
          vehicleNo: vehicleNo || 'N/A',
          phone: phone || '',
          balanceKhata: khataAmount,
          notes: notes || 'New Customer',
          lastTransaction: new Date().toISOString(),
        };
        updatedCustomers.push(customerObj);
      }

      capturedCustomer = customerObj;

      const newTx = {
        id: txId,
        customerId: customerObj.id,
        customerName: customerObj.name,
        vehicleNo: customerObj.vehicleNo,
        phone: customerObj.phone,
        date: new Date().toISOString(),
        fuelType: fuelType === 'petrol' ? 'Super Petrol' : 'High-Speed Diesel (HSD)',
        litres: vol,
        rate: price,
        totalBill,
        paidAmount: paid,
        khataAmount,
        type: 'credit_sale',
        notes,
      };

      return {
        ...prev,
        customers: updatedCustomers,
        khataTransactions: [newTx, ...(prev.khataTransactions || [])],
      };
    });

    // Return a proxy transaction object for the receipt modal
    const proxyTx = {
      id: txId,
      customerId: customerId || 'new',
      customerName: customerName || 'Khata Customer',
      vehicleNo: vehicleNo || 'N/A',
      phone: phone || '',
      date: new Date().toISOString(),
      fuelType: fuelType === 'petrol' ? 'Super Petrol' : 'High-Speed Diesel (HSD)',
      litres: vol,
      rate: price,
      totalBill,
      paidAmount: paid,
      khataAmount,
      type: 'credit_sale',
      notes,
    };

    showToast(`Khata slip created for ${customerName || 'Customer'}`);
    return { transaction: proxyTx, customer: capturedCustomer };
  };

  // H4 FIX: Record overpayments as advance credit (negative balance) not silently discarded
  const recordCustomerPayment = ({ customerId, amount, notes = '' }) => {
    const amt = Number(amount) || 0;
    if (amt <= 0) return;

    setData(prev => {
      let customerObj = null;
      const updatedCustomers = prev.customers.map(c => {
        if (c.id === customerId) {
          // H4 FIX: allow balance to go negative (advance credit) instead of clamping at 0
          const currentBalance = Number(c.balanceKhata) || 0;
          const newBalance = currentBalance - amt;
          customerObj = { ...c, balanceKhata: newBalance, lastTransaction: new Date().toISOString() };
          return customerObj;
        }
        return c;
      });

      if (!customerObj) return prev;

      const newTx = {
        id: 'kpay_' + Date.now(),
        customerId,
        customerName: customerObj.name,
        vehicleNo: customerObj.vehicleNo,
        phone: customerObj.phone,
        date: new Date().toISOString(),
        totalBill: 0,
        paidAmount: amt,
        khataAmount: -amt, // negative = credit/payment
        type: 'payment_received',
        notes: notes || 'Cash payment received for Khata clearance',
      };

      return {
        ...prev,
        customers: updatedCustomers,
        khataTransactions: [newTx, ...(prev.khataTransactions || [])],
      };
    });

    khataApi.recordPayment({
      customerId,
      amount: amt,
      notes,
      date: new Date().toISOString(),
    }).catch(err => console.warn('Background sync payment error:', err.message));

    showToast(`Payment of ${formatPKR(amt)} received!`);
  };

  // H3 FIX: Consistent delta calculation for all transaction types
  const deleteKhataTransaction = (txId) => {
    const targetTx = (data.khataTransactions || []).find(t => t.id === txId);
    if (!targetTx) return;

    setData(prev => {
      const updatedCustomers = (prev.customers || []).map(c => {
        if (c.id === targetTx.customerId) {
          let balanceAdjustment = 0;
          if (targetTx.type === 'credit_sale' || targetTx.type === 'bulk_credit') {
            // Reversing a credit sale: reduce balance by the khata amount that was added
            balanceAdjustment = -Math.abs(targetTx.khataAmount || 0);
          } else if (targetTx.type === 'payment_received') {
            // H3 FIX: Reversing a payment: restore the debt (add back the payment amount)
            balanceAdjustment = Math.abs(targetTx.paidAmount || 0);
          }
          return {
            ...c,
            balanceKhata: (Number(c.balanceKhata) || 0) + balanceAdjustment,
          };
        }
        return c;
      });

      return {
        ...prev,
        customers: updatedCustomers,
        khataTransactions: (prev.khataTransactions || []).filter(t => t.id !== txId),
      };
    });

    khataApi.deleteTransaction(txId).catch(err => console.warn('Background sync delete khata error:', err.message));
    showToast('Khata transaction deleted and ledger adjusted');
  };

  // 7. GENERAL DAILY EXPENSES (Roznamcha)
  // H2 FIX: Load-linked expenses go ONLY into loads[].expenses.
  // They are NOT duplicated into the global expenses[] array.
  // Station-level expenses (loadId = null) go into global expenses[].
  const addExpense = ({ category, amount, paidTo = '', notes = '', loadId = null }) => {
    const amt = Number(amount) || 0;
    if (amt <= 0) return;

    if (loadId) {
      // H2 FIX: Only add to load, do NOT also add to global expenses
      addLoadExpense({
        loadId,
        title: category,
        category,
        amount: amt,
        notes: paidTo ? `${paidTo} - ${notes}` : notes
      });
      showToast(`خرچہ لوڈ ${loadId} میں درج ہوگیا: ${formatPKR(amt)}`);
      return; // Do NOT fall through to global expenses
    }

    // Station-level expense (not linked to a load)
    const newExp = {
      id: 'exp_' + Date.now(),
      date: new Date().toISOString(),
      category: category || 'General Expense',
      amount: amt,
      paidTo: paidTo || 'Cash Expense',
      notes,
      loadId: null
    };

    setData(prev => ({
      ...prev,
      expenses: [newExp, ...(prev.expenses || [])],
    }));

    expensesApi.create({
      id: newExp.id,
      category: newExp.category,
      amount: newExp.amount,
      paidTo: newExp.paidTo,
      notes: newExp.notes,
      date: newExp.date,
    }).catch(err => console.warn('Background sync expense error:', err.message));

    showToast(`خرچہ درج ہوگیا: ${formatPKR(amt)}`);
    return newExp;
  };

  const deleteExpense = (expId) => {
    setData(prev => ({
      ...prev,
      expenses: (prev.expenses || []).filter(e => e.id !== expId),
    }));
    expensesApi.delete(expId).catch(err => console.warn('Background sync delete expense error:', err.message));
    showToast('خرچہ حذف کر دیا گیا');
  };

  // K1 FIX: Proper addCustomer function (KhataView was mutating data.customers directly)
  const addCustomer = ({ name, vehicleNo, phone, notes }) => {
    if (!name || !name.trim()) {
      showToast('Customer name is required', 'error');
      return null;
    }
    const newCust = {
      id: 'cust_' + Date.now(),
      name: name.trim(),
      vehicleNo: vehicleNo ? vehicleNo.trim().toUpperCase() : 'N/A',
      phone: phone ? phone.trim() : '',
      balanceKhata: 0,
      notes: notes ? notes.trim() : 'Added from Ledger',
      lastTransaction: new Date().toISOString()
    };
    setData(prev => ({
      ...prev,
      customers: [...prev.customers, newCust],
    }));

    customersApi.create({
      id: newCust.id,
      name: newCust.name,
      vehicleNo: newCust.vehicleNo,
      phone: newCust.phone,
      balanceKhata: newCust.balanceKhata,
      notes: newCust.notes,
    }).catch(err => console.warn('Background sync customer error:', err.message));

    showToast(`گاہک ${newCust.name} شامل ہوگیا`);
    return newCust;
  };

  // 8. NOZZLE & CUSTOMER MANAGEMENT
  const updateNozzle = (nozzleId, updatedFields) => {
    setData(prev => ({
      ...prev,
      nozzles: prev.nozzles.map(n => {
        if (n.id === nozzleId) {
          return {
            ...n,
            ...updatedFields,
            lastMeter: updatedFields.lastMeter !== undefined ? Number(updatedFields.lastMeter) : n.lastMeter,
          };
        }
        return n;
      }),
    }));
    showToast('نوزل کی ترتیبات محفوظ ہوگئیں');
  };

  const addNozzle = ({ name, label, fuelType, lastMeter }) => {
    const newNoz = {
      id: 'n_' + Date.now(),
      name: name || `Nozzle ${data.nozzles.length + 1}`,
      label: label || `${fuelType === 'petrol' ? 'Super Petrol' : 'HSD Diesel'} Nozzle`,
      fuelType: fuelType || 'petrol',
      lastMeter: Number(lastMeter) || 0,
    };
    setData(prev => ({
      ...prev,
      nozzles: [...prev.nozzles, newNoz],
    }));
    showToast('نئی نوزل شامل کر دی گئی');
    return newNoz;
  };

  const deleteNozzle = (nozzleId) => {
    if (data.nozzles.length <= 1) {
      showToast('کم از کم ایک نوزل کا ہونا لازمی ہے', 'error');
      return;
    }
    setData(prev => ({
      ...prev,
      nozzles: prev.nozzles.filter(n => n.id !== nozzleId),
    }));
    showToast('نوزل ہٹا دی گئی');
  };

  const updateCustomer = (customerId, updatedFields) => {
    setData(prev => ({
      ...prev,
      customers: prev.customers.map(c => {
        if (c.id === customerId) {
          return { ...c, ...updatedFields };
        }
        return c;
      }),
    }));

    customersApi.update(customerId, updatedFields).catch(err => console.warn('Background sync update customer error:', err.message));
    showToast('گاہک کا ریکارڈ اپڈیٹ ہو گیا');
  };

  const deleteCustomer = (customerId) => {
    setData(prev => ({
      ...prev,
      customers: prev.customers.filter(c => c.id !== customerId),
    }));
    showToast('گاہک کو کھاتے سے ہٹا دیا گیا');
  };

  // 9. STOCK RECONCILIATION & PHYSICAL DIP MEASUREMENT
  const recordStockReconciliation = ({ fuelType, physicalStock, inspectorName = '', notes = '' }) => {
    const phys = Number(physicalStock) || 0;
    const currentBook = Number(data.tanks[fuelType]?.currentStock || 0);
    const varianceLitres = phys - currentBook;
    const purchaseRate = Number(data.rates[fuelType]?.purchase || 0);
    const varianceValue = varianceLitres * purchaseRate;
    const fuelLabel = fuelType === 'petrol' ? 'Super Petrol' : 'High-Speed Diesel';

    const newRec = {
      id: 'rec_' + Date.now(),
      date: new Date().toISOString(),
      fuelType,
      fuelName: fuelLabel,
      bookStock: currentBook,
      physicalStock: phys,
      varianceLitres,
      varianceValue,
      inspectorName: inspectorName || (data.station.owner || 'Tanveer Zehri'),
      notes: notes || `Tank physical dip calibration: ${varianceLitres >= 0 ? '+' : ''}${formatLitres(varianceLitres)}`,
    };

    setData(prev => ({
      ...prev,
      tanks: {
        ...prev.tanks,
        [fuelType]: {
          ...prev.tanks[fuelType],
          currentStock: phys,
          lastUpdated: new Date().toISOString(),
        }
      },
      reconciliations: [newRec, ...(prev.reconciliations || [])],
    }));

    showToast(`Dip verified! ${fuelLabel} calibrated to ${formatLitres(phys)} (${varianceLitres >= 0 ? '+' : ''}${formatLitres(varianceLitres)})`);
    return newRec;
  };

  const deleteReconciliation = (recId) => {
    setData(prev => ({
      ...prev,
      reconciliations: (prev.reconciliations || []).filter(r => r.id !== recId),
    }));
    showToast('Reconciliation record removed');
  };

  // 10. DAILY CLOSING & SHIFT SUMMARY
  // H5 FIX: Use local PKT date string instead of UTC ISO prefix
  const getLocalDatePrefix = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const closeDailyShift = ({
    shiftName = 'General Day Shift',
    operatorName = '',
    actualDrawerCash = 0,
    notes = '',
  }) => {
    // H5 FIX: filter by local date, not UTC ISO prefix
    const todayPrefix = getLocalDatePrefix();
    // Dates are stored as ISO strings; compare using local date string
    const isToday = (dateStr) => {
      const d = new Date(dateStr);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}` === todayPrefix;
    };

    const todaysSales = (data.sales || []).filter(s => isToday(s.date));
    const todaysBulk = (data.bulkSales || []).filter(b => isToday(b.date));
    // H2 FIX: Exclude load-linked expenses from daily cash deductions
    // (they are part of load cost, not station cash drawer)
    const todaysExpenses = (data.expenses || []).filter(e => isToday(e.date) && !e.loadId);
    const todaysRecoveries = (data.khataTransactions || []).filter(k => isToday(k.date) && k.type === 'payment_received');

    const totalLitresDispensed = todaysSales.reduce((acc, s) => acc + (Number(s.litresSold) || 0), 0) +
                                 todaysBulk.reduce((acc, b) => acc + (Number(b.litres) || 0), 0);

    const totalSalesRevenue = todaysSales.reduce((acc, s) => acc + (Number(s.totalSaleValue) || 0), 0) +
                              todaysBulk.reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0);

    const retailCash = todaysSales.reduce((acc, s) => acc + (Number(s.cashReceived) || 0), 0);
    const bulkCash = todaysBulk.reduce((acc, b) => acc + (Number(b.cashPaid) || (b.paymentType === 'cash' ? b.totalAmount : 0)), 0);
    const recoveryCash = todaysRecoveries.reduce((acc, r) => acc + (Number(r.paidAmount) || 0), 0);
    const totalCashCollected = retailCash + bulkCash + recoveryCash;

    const totalCreditIssued = todaysSales.reduce((acc, s) => acc + (Number(s.creditIssued) || 0), 0) +
                              todaysBulk.reduce((acc, b) => acc + (Number(b.khataAmount) || 0), 0);

    const totalExpensesDeducted = todaysExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const expectedDrawerCash = Math.max(0, totalCashCollected - totalExpensesDeducted);
    const actualCash = Number(actualDrawerCash) || expectedDrawerCash;
    const cashDiscrepancy = actualCash - expectedDrawerCash;

    const newClosing = {
      id: 'sc_' + Date.now(),
      date: new Date().toISOString(),
      shiftName,
      operatorName: operatorName || (currentUser?.name || 'Shift Cashier'),
      totalLitresDispensed,
      totalSalesRevenue,
      totalCashCollected,
      totalCreditIssued,
      totalExpensesDeducted,
      netDrawerCash: expectedDrawerCash,
      actualDrawerCash: actualCash,
      cashDiscrepancy,
      status: Math.abs(cashDiscrepancy) < 5 ? 'VERIFIED' : (cashDiscrepancy < 0 ? 'SHORTAGE' : 'SURPLUS'),
      notes: notes || 'Official daily closing summary recorded',
    };

    setData(prev => ({
      ...prev,
      shiftClosings: [newClosing, ...(prev.shiftClosings || [])],
    }));

    shiftsApi.close({
      id: newClosing.id,
      shiftName,
      operatorName: newClosing.operatorName,
      date: newClosing.date,
      totalLitres: totalLitresDispensed,
      totalRevenue: totalSalesRevenue,
      totalCash: totalCashCollected,
      totalCredit: totalCreditIssued,
      totalExpenses: totalExpensesDeducted,
      netDrawerCash: expectedDrawerCash,
      actualDrawerCash: actualCash,
      discrepancy: cashDiscrepancy,
      notes: newClosing.notes,
    }).catch(err => console.warn('Background sync shift error:', err.message));

    showToast(`Daily Shift Closed! Net Drawer: ${formatPKR(actualCash)}`);
    return newClosing;
  };

  const deleteShiftClosing = (scId) => {
    setData(prev => ({
      ...prev,
      shiftClosings: (prev.shiftClosings || []).filter(sc => sc.id !== scId),
    }));
    showToast('Shift closing record removed');
  };

  // AUDIT HELPER: Get Full Detailed Audit for any Load
  const getLoadAudit = (loadId) => {
    const load = (data.loads || []).find(l => l.id === loadId);
    if (!load) return null;

    const bulkTransactions = (data.bulkSales || []).filter(b => 
      b.allocatedLoadId === loadId || (b.allocatedLoadIds && b.allocatedLoadIds.includes(loadId))
    );

    const retailShifts = (data.sales || []).filter(s =>
      s.allocatedLoadIds && s.allocatedLoadIds.includes(loadId)
    );

    const totalLitresReceived = Number(load.litresReceived) || 0;
    const retailLitresSold = Number(load.retailLitresSold) || 0;
    const bulkLitresSold = Number(load.bulkLitresSold) || 0;
    const totalSold = retailLitresSold + bulkLitresSold;
    const remaining = Math.max(0, Number(load.litresRemaining) || 0);

    const totalCostOfLoad = totalLitresReceived * (Number(load.purchaseRate) || 0);
    const cogs = totalSold * (Number(load.purchaseRate) || 0);
    const totalExpenses = (load.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalRevenue = Number(load.totalRevenue) || 0;
    const grossProfit = totalRevenue - cogs;
    const netProfit = totalRevenue - cogs - totalExpenses;
    const profitPerLitre = totalSold > 0 ? (netProfit / totalSold) : 0;

    return {
      load,
      totalLitresReceived,
      retailLitresSold,
      bulkLitresSold,
      totalSold,
      remaining,
      percentDepleted: totalLitresReceived > 0 ? Math.min(100, Math.round((totalSold / totalLitresReceived) * 100)) : 100,
      totalCostOfLoad,
      cogs,
      totalExpenses,
      totalRevenue,
      grossProfit,
      netProfit,
      profitPerLitre,
      expenses: load.expenses || [],
      bulkTransactions,
      retailShifts,
      isClosed: load.status === 'CLOSED' || remaining <= 0.01
    };
  };

  // UNIFIED TRANSACTION AUDIT FEED (Combines all activity into a single chronological ledger)
  const allTransactions = useMemo(() => {
    const txList = [];

    // 1. Retail Sales
    (data.sales || []).forEach(s => {
      txList.push({
        id: s.id,
        date: s.date,
        type: 'retail_sale',
        typeLabel: 'Retail Nozzle Shift',
        party: s.operatorName || 'Shift Operator',
        vehicleNo: s.nozzleId?.toUpperCase() || 'DISPENSER',
        fuelType: s.fuelType,
        litres: s.litresSold,
        rate: s.rate,
        totalAmount: s.totalSaleValue,
        cashEffect: s.cashReceived,
        khataEffect: s.creditIssued,
        notes: s.notes,
        raw: s
      });
    });

    // 2. Bulk Dumping
    (data.bulkSales || []).forEach(b => {
      txList.push({
        id: b.id,
        date: b.date,
        type: 'bulk_dumping',
        typeLabel: 'Bulk Vehicle Dumping',
        party: b.customerName,
        vehicleNo: b.vehicleNo,
        fuelType: b.fuelType,
        litres: b.litres,
        rate: b.rate,
        totalAmount: b.totalAmount,
        cashEffect: b.cashPaid,
        khataEffect: b.khataAmount,
        notes: b.notes,
        raw: b
      });
    });

    // 3. Stock Loads (Fuel Intake)
    (data.loads || []).forEach(l => {
      txList.push({
        id: l.id,
        date: l.date,
        type: 'load_intake',
        typeLabel: `${l.vehicleType} Load Intake`,
        party: l.supplierName || 'Distributor',
        vehicleNo: l.vehicleNo,
        fuelType: l.fuelType,
        litres: l.litresReceived,
        rate: l.purchaseRate,
        totalAmount: l.totalCost,
        cashEffect: -l.totalCost,
        khataEffect: 0,
        notes: l.notes,
        raw: l
      });
    });

    // 4. Khata Recoveries
    (data.khataTransactions || []).filter(k => k.type === 'payment_received').forEach(k => {
      txList.push({
        id: k.id,
        date: k.date,
        type: 'khata_payment',
        typeLabel: 'Customer Cash Recovery',
        party: k.customerName,
        vehicleNo: k.vehicleNo || 'LEDGER',
        fuelType: 'N/A',
        litres: 0,
        rate: 0,
        totalAmount: k.paidAmount,
        cashEffect: k.paidAmount,
        khataEffect: -k.paidAmount,
        notes: k.notes,
        raw: k
      });
    });

    // 5. Daily Expenses
    (data.expenses || []).forEach(e => {
      txList.push({
        id: e.id,
        date: e.date,
        type: 'station_expense',
        typeLabel: `Expense: ${e.category}`,
        party: e.paidTo || 'Cash Expense',
        vehicleNo: e.loadId || 'STATION',
        fuelType: 'N/A',
        litres: 0,
        rate: 0,
        totalAmount: e.amount,
        cashEffect: -e.amount,
        khataEffect: 0,
        notes: e.notes,
        raw: e
      });
    });

    // Sort descending by date
    return txList.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data]);

  // Quick Totals & Dashboard Aggregates
  const totalCustomerKhata = (data.customers || []).reduce((acc, c) => acc + (Number(c.balanceKhata) || 0), 0);
  const activeLoads = (data.loads || []).filter(l => l.status === 'ACTIVE' && (Number(l.litresRemaining) || 0) > 0);
  const closedLoads = (data.loads || []).filter(l => l.status === 'CLOSED' || (Number(l.litresRemaining) || 0) <= 0);

  // Today's Sales Aggregation (H5 FIX: Uses local date prefix, not UTC)
  const todayDatePrefix = getLocalDatePrefix();
  const todayRetailSales = (data.sales || []).filter(s => s.date && s.date.startsWith(todayDatePrefix));
  const todayBulkSales = (data.bulkSales || []).filter(b => b.date && b.date.startsWith(todayDatePrefix));

  const todayRetailLitres = todayRetailSales.reduce((acc, s) => acc + (Number(s.litresSold) || 0), 0);
  const todayBulkLitres = todayBulkSales.reduce((acc, b) => acc + (Number(b.litres) || 0), 0);
  const todayTotalLitres = todayRetailLitres + todayBulkLitres;

  const todayRetailCash = todayRetailSales.reduce((acc, s) => acc + (Number(s.cashReceived) || 0), 0);
  const todayBulkCash = todayBulkSales.reduce((acc, b) => acc + (Number(b.cashPaid) || (b.paymentType === 'cash' ? b.totalAmount : 0)), 0);
  const todayKhataRecoveries = (data.khataTransactions || []).filter(k => k.date && k.date.startsWith(todayDatePrefix) && k.type === 'payment_received');
  const todayRecoveryCash = todayKhataRecoveries.reduce((acc, k) => acc + (Number(k.paidAmount) || 0), 0);
  const todayCashCollected = todayRetailCash + todayBulkCash + todayRecoveryCash;

  const todayRetailRevenue = todayRetailSales.reduce((acc, s) => acc + (Number(s.totalSaleValue) || 0), 0);
  const todayBulkRevenue = todayBulkSales.reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0);
  const todayTotalRevenue = todayRetailRevenue + todayBulkRevenue;

  // Expenses Aggregation (H2 FIX: Station expenses only, load expenses are part of load procurement)
  const todayExpensesList = (data.expenses || []).filter(e => e.date && e.date.startsWith(todayDatePrefix) && !e.loadId);
  const todayExpenses = todayExpensesList.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const totalGeneralExpenses = (data.expenses || []).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  const todayNetCash = Math.max(0, todayCashCollected - todayExpenses);

  // C7 & L3 FIX: Reset to Demo Data - owner only, requires explicit confirmation
  const resetToDemoData = () => {
    if (currentUser?.role !== 'owner') {
      showToast('Only the station owner can reset data to demo defaults.', 'error');
      return false;
    }
    // Auto backup current real records before resetting
    try {
      localStorage.setItem('hadi_petrol_pre_reset_backup_' + Date.now(), JSON.stringify(data));
    } catch (e) {}

    setData(INITIAL_DATA);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DATA));
    showToast('Reset to demo sample data successfully!');
    return true;
  };

  // Export JSON backup
  const exportData = () => {
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonStr);
    downloadAnchor.setAttribute("download", `hadi_petrol_v4_backup_${getLocalDatePrefix()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Database exported successfully!');
  };

  // C6 FIX: Import JSON backup with validation and pre-import safety backup
  const importData = (importedJson) => {
    if (currentUser?.role !== 'owner') {
      showToast('Only the station owner can restore database backups.', 'error');
      return false;
    }
    try {
      const parsed = typeof importedJson === 'string' ? JSON.parse(importedJson) : importedJson;
      if (parsed.station && parsed.tanks && parsed.nozzles) {
        // Pre-import automatic safety backup to localStorage
        try {
          localStorage.setItem('hadi_petrol_pre_import_backup_' + Date.now(), JSON.stringify(data));
        } catch (e) {}

        setData(parsed);
        showToast('Database restored successfully!');
        return true;
      } else {
        showToast('Invalid backup file structure: missing station, tanks, or nozzles!', 'error');
        return false;
      }
    } catch (e) {
      showToast('Failed to parse backup JSON file.', 'error');
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        data,
        rates: data.rates,
        tanks: data.tanks,
        totalSupplierPayable: (data.suppliers || []).reduce((acc, s) => acc + (Number(s.balancePayable) || 0), 0),
        activeTab,
        setActiveTab,
        selectedReceipt,
        setSelectedReceipt,
        toast,
        showToast,
        isOnline,
        currentUser,
        login,
        logout,
        language,
        setLanguage,
        toggleLanguage,
        t,
        updatePins,
        updateLogo,
        resetLogo,
        updateStationInfo,
        updateRates,
        calibrateTank,
        // Loads & Procurement
        addLoad,
        deleteLoad,
        generateLoadId,
        addLoadExpense,
        deleteLoadExpense,
        getLoadAudit,
        activeLoads,
        closedLoads,
        // Dual Operations
        recordShiftSale,
        deleteSale,
        recordBulkDumping,
        deleteBulkSale,
        // Khata & Customer
        addCustomer,
        recordKhataSale,
        recordCustomerPayment,
        updateCustomer,
        deleteCustomer,
        deleteKhataTransaction,
        totalCustomerKhata,
        // Expenses
        addExpense,
        deleteExpense,
        todayExpenses,
        totalGeneralExpenses,
        todayNetCash,
        // Nozzles
        updateNozzle,
        addNozzle,
        deleteNozzle,
        // Stock Reconciliation
        recordStockReconciliation,
        deleteReconciliation,
        reconciliations: data.reconciliations || [],
        // Daily Shift Closing
        closeDailyShift,
        deleteShiftClosing,
        shiftClosings: data.shiftClosings || [],
        // Master Audit Feed
        allTransactions,
        // Daily Aggregates
        todayCashCollected,
        todayTotalRevenue,
        todayRetailLitres,
        todayBulkLitres,
        todayTotalLitres,
        // Utilities
        resetToDemoData,
        exportData,
        importData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
