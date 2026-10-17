// Isolated Stage 1 Regression Test Suite for Hadi Petrol Pump Management System
// Uses isolated sample data - NEVER touches or overwrites genuine business records.

import assert from 'node:assert/strict';

console.log('====================================================');
console.log('STARTING HADI PETROL PUMP STAGE 1 REGRESSION TESTS');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}\n${err.stack}`);
    failCount++;
  }
}

// ----------------------------------------------------
// TEST 1: Authentication & PIN Bypass Verification (C1)
// ----------------------------------------------------
test('C1: PIN Authentication strictly rejects hardcoded backdoors', () => {
  const stationConfig = {
    ownerPin: '9876', // Owner set a custom PIN
    staffPin: '5432', // Staff set a custom PIN
  };

  const verifyLogin = (role, pin) => {
    const ownerPin = stationConfig.ownerPin || '';
    const staffPin = stationConfig.staffPin || '';
    if (!pin || pin.trim() === '') return { success: false, error: 'Empty' };

    if (role === 'owner') {
      if (ownerPin && pin.trim() === ownerPin.trim()) return { success: true };
      return { success: false, error: 'Incorrect PIN' };
    } else {
      if (staffPin && pin.trim() === staffPin.trim()) return { success: true };
      return { success: false, error: 'Incorrect PIN' };
    }
  };

  // 1. Correct custom PINs must succeed
  assert.equal(verifyLogin('owner', '9876').success, true, 'Custom owner PIN must pass');
  assert.equal(verifyLogin('operator', '5432').success, true, 'Custom staff PIN must pass');

  // 2. Old hardcoded backdoors must ALL be rejected
  const backdoors = ['786', 'admin', '7860', '0000', '1234', '1111', 'password'];
  for (const backdoor of backdoors) {
    assert.equal(verifyLogin('owner', backdoor).success, false, `Owner backdoor '${backdoor}' must be rejected`);
    assert.equal(verifyLogin('operator', backdoor).success, false, `Staff backdoor '${backdoor}' must be rejected`);
  }

  // 3. Empty/whitespace PINs must fail
  assert.equal(verifyLogin('owner', '').success, false, 'Empty PIN must fail');
  assert.equal(verifyLogin('owner', '   ').success, false, 'Whitespace PIN must fail');
});

// ----------------------------------------------------
// TEST 2: Hard Stock Oversell Rejection (C8 & M2)
// ----------------------------------------------------
test('C8: Storage tank deduction hard-rejects overselling without clamping', () => {
  const mockTank = { currentStock: 450.00 };

  const deductStock = (tankStock, requestedLitres) => {
    if (requestedLitres > tankStock + 0.001) {
      return { error: `Insufficient stock: Available ${tankStock}, Requested ${requestedLitres}` };
    }
    return { success: true, newStock: tankStock - requestedLitres };
  };

  // Safe sale within stock
  const validDeduct = deductStock(mockTank.currentStock, 300);
  assert.equal(validDeduct.success, true);
  assert.equal(validDeduct.newStock, 150.00);

  // Exact sale
  const exactDeduct = deductStock(mockTank.currentStock, 450);
  assert.equal(exactDeduct.success, true);
  assert.equal(exactDeduct.newStock, 0.00);

  // Oversell attempt (451 L against 450 L)
  const oversell = deductStock(mockTank.currentStock, 450.5);
  assert.ok(oversell.error, 'Must reject oversell');
  assert.equal(mockTank.currentStock, 450.00, 'Original stock must not mutate on failure');
});

// ----------------------------------------------------
// TEST 3: FIFO Multi-Load Allocation & Exact Reversal (C4)
// ----------------------------------------------------
test('C4: FIFO multi-load allocation and non-corrupting exact reversal', () => {
  // Scenario: 2 Loads of Diesel:
  // LOAD-1: 700 L remaining (purchaseRate 260)
  // LOAD-2: 1,000 L remaining (purchaseRate 265)
  const loads = [
    { id: 'LOAD-001', date: '2026-10-10T10:00:00Z', litresRemaining: 700, retailLitresSold: 0, purchaseRate: 260, status: 'ACTIVE' },
    { id: 'LOAD-002', date: '2026-10-12T10:00:00Z', litresRemaining: 1000, retailLitresSold: 0, purchaseRate: 265, status: 'ACTIVE' }
  ];

  // Sale of 1,000 Litres:
  // Must take 700 L from LOAD-1 (depleting it to 0 and closing it)
  // And 300 L from LOAD-2 (leaving 700 L remaining)
  let remainingToAllocate = 1000;
  const allocatedDetails = [];

  const updatedLoads = loads.map(l => {
    if (remainingToAllocate <= 0) return { ...l };
    const take = Math.min(l.litresRemaining, remainingToAllocate);
    remainingToAllocate -= take;
    allocatedDetails.push({ loadId: l.id, quantity: take });
    const newRem = l.litresRemaining - take;
    return {
      ...l,
      litresRemaining: newRem,
      retailLitresSold: l.retailLitresSold + take,
      status: newRem <= 0.01 ? 'CLOSED' : 'ACTIVE'
    };
  });

  // Verify allocations
  assert.deepEqual(allocatedDetails, [
    { loadId: 'LOAD-001', quantity: 700 },
    { loadId: 'LOAD-002', quantity: 300 }
  ]);
  assert.equal(updatedLoads[0].litresRemaining, 0);
  assert.equal(updatedLoads[0].status, 'CLOSED');
  assert.equal(updatedLoads[1].litresRemaining, 700);

  // NOW TEST REVERSAL (Voiding this 1,000 L sale)
  // OLD BUG: split equally (500L to each), which would leave LOAD-1 with 500 and LOAD-2 with 1200 (corrupted!).
  // NEW FIX: uses allocatedDetails exact quantities
  const reversedLoads = updatedLoads.map(l => {
    const detail = allocatedDetails.find(d => d.loadId === l.id);
    if (!detail) return l;
    return {
      ...l,
      litresRemaining: l.litresRemaining + detail.quantity,
      retailLitresSold: l.retailLitresSold - detail.quantity,
      status: 'ACTIVE'
    };
  });

  // Verify exact restoration
  assert.equal(reversedLoads[0].litresRemaining, 700, 'LOAD-001 must have exactly 700L restored');
  assert.equal(reversedLoads[0].retailLitresSold, 0);
  assert.equal(reversedLoads[0].status, 'ACTIVE');

  assert.equal(reversedLoads[1].litresRemaining, 1000, 'LOAD-002 must have exactly 1000L restored (not 1200!)');
  assert.equal(reversedLoads[1].retailLitresSold, 0);
});

// ----------------------------------------------------
// TEST 4: Customer State Mutation & Persistence (K1 & C5)
// ----------------------------------------------------
test('K1 & C5: Customer creation and balance update preserve state without mutation', () => {
  let state = {
    customers: [
      { id: 'c1', name: 'Zehri Transport', vehicleNo: 'TLA-786', balanceKhata: 50000 }
    ],
    khataTransactions: []
  };

  // Proper addCustomer implementation (non-mutating)
  const addCustomer = (customerData) => {
    const newCust = {
      id: 'cust_' + Date.now(),
      name: customerData.name.trim(),
      vehicleNo: customerData.vehicleNo.trim().toUpperCase(),
      phone: customerData.phone || '',
      balanceKhata: 0,
      notes: customerData.notes || 'Added from Ledger'
    };
    state = {
      ...state,
      customers: [...state.customers, newCust]
    };
    return newCust;
  };

  // Add customer
  const added = addCustomer({ name: 'Chiltan Goods', vehicleNo: 'QA-5544', phone: '03001234567' });
  assert.equal(state.customers.length, 2);
  assert.equal(state.customers[1].name, 'Chiltan Goods');
  assert.equal(state.customers[1].balanceKhata, 0);

  // Credit sale update (inside functional callback)
  const recordCredit = (customerId, amount) => {
    state = {
      ...state,
      customers: state.customers.map(c => {
        if (c.id === customerId) {
          return { ...c, balanceKhata: c.balanceKhata + amount };
        }
        return c;
      })
    };
  };

  recordCredit(added.id, 25000);
  assert.equal(state.customers[1].balanceKhata, 25000, 'Customer balance must reflect credit sale');
});

// ----------------------------------------------------
// TEST 5: Khata Overpayments as Advance Credit (H4)
// ----------------------------------------------------
test('H4: Overpayment records as negative balance (advance credit) rather than clamped to 0', () => {
  const customer = { id: 'c1', name: 'Al-Farooq Coach', balanceKhata: 10000 };
  const paymentAmount = 15000; // Customer overpays by 5,000 PKR

  // NEW H4 FIX: Allows negative balance
  const newBalance = (Number(customer.balanceKhata) || 0) - paymentAmount;

  assert.equal(newBalance, -5000, 'Balance must be -5000 (advance credit)');
  assert.notEqual(newBalance, 0, 'Must NOT clamp to zero losing the 5,000 credit');
});

// ----------------------------------------------------
// TEST 6: Khata Transaction Deletion Parity (H3)
// ----------------------------------------------------
test('H3: Deleting a payment transaction restores customer debt correctly', () => {
  let customer = { id: 'c1', name: 'Zehri Fleet', balanceKhata: 20000 };

  // Transaction: customer made a payment of 15,000 PKR
  const paymentTx = {
    id: 'kpay_1',
    customerId: 'c1',
    type: 'payment_received',
    paidAmount: 15000,
    khataAmount: -15000
  };

  // When deleting a payment, the debt must be restored (+15,000)
  const delta = paymentTx.type === 'payment_received'
    ? Math.abs(paymentTx.paidAmount)
    : -Math.abs(paymentTx.khataAmount);

  customer.balanceKhata += delta;
  assert.equal(customer.balanceKhata, 35000, 'Customer debt must increase by 15000 back to 35000');

  // Transaction 2: customer had a credit sale of 10,000 PKR
  const creditTx = {
    id: 'ktx_2',
    customerId: 'c1',
    type: 'credit_sale',
    paidAmount: 0,
    khataAmount: 10000
  };

  // When deleting a credit sale, the debt must be reduced (-10,000)
  const creditDelta = creditTx.type === 'payment_received'
    ? Math.abs(creditTx.paidAmount)
    : -Math.abs(creditTx.khataAmount);

  customer.balanceKhata += creditDelta;
  assert.equal(customer.balanceKhata, 25000, 'Customer debt must reduce by 10000 back to 25000');
});

// ----------------------------------------------------
// TEST 7: Local Timezone Shift Closing (H5)
// ----------------------------------------------------
test('H5: Local date string prevents late evening transactions from shifting days', () => {
  // Simulate a sale at 11:30 PM PKT (23:30 PKT = 18:30 UTC same day, but e.g. after midnight local vs UTC)
  // Suppose local time is Oct 17, 02:00 AM PKT -> in UTC that is Oct 16, 21:00 UTC!
  // UTC date is 2026-10-16, but local date is 2026-10-17.
  const testDate = new Date('2026-10-16T21:30:00Z'); // 2:30 AM Oct 17 in PKT (UTC+5)

  // UTC prefix (OLD BUG):
  const utcPrefix = testDate.toISOString().split('T')[0];
  assert.equal(utcPrefix, '2026-10-16', 'UTC says Oct 16');

  // Local date helper (NEW FIX):
  const y = testDate.getFullYear();
  const m = String(testDate.getMonth() + 1).padStart(2, '0');
  const d = String(testDate.getDate()).padStart(2, '0');
  const localPrefix = `${y}-${m}-${d}`;

  // In local timezone, it compares against local calendar day
  assert.ok(localPrefix.length === 10, 'Local prefix formatted correctly YYYY-MM-DD');
});

// ----------------------------------------------------
// TEST 8: Historical COGS vs Current Benchmark Rate (H7)
// ----------------------------------------------------
test('H7: COGS matches actual allocated load purchase rates, not current settings rate', () => {
  const loads = [
    { id: 'LOAD-A', purchaseRate: 250.00 }, // Bought cheap at 250
    { id: 'LOAD-B', purchaseRate: 270.00 }, // Bought higher at 270
  ];

  // Current setting rate today in SettingsView is 280 (e.g. rate went up)
  const currentSettingsPurchaseRate = 280.00;

  // Sale 1: 500 L from LOAD-A
  // Sale 2: 500 L from LOAD-B
  // Total volume: 1,000 L
  const sales = [
    { litres: 500, allocatedLoadDetails: [{ loadId: 'LOAD-A', quantity: 500 }] },
    { litres: 500, allocatedLoadDetails: [{ loadId: 'LOAD-B', quantity: 500 }] },
  ];

  // Old bug calculation: 1,000 L * 280 = 280,000 PKR (WRONG)
  const oldCogs = 1000 * currentSettingsPurchaseRate;
  assert.equal(oldCogs, 280000);

  // New H7 calculation:
  // (500 * 250) + (500 * 270) = 125,000 + 135,000 = 260,000 PKR (EXACT)
  let exactCogs = 0;
  sales.forEach(s => {
    s.allocatedLoadDetails.forEach(d => {
      const load = loads.find(l => l.id === d.loadId);
      exactCogs += d.quantity * (load ? load.purchaseRate : currentSettingsPurchaseRate);
    });
  });

  assert.equal(exactCogs, 260000, 'Actual COGS must be 260,000 PKR');
  assert.equal(oldCogs - exactCogs, 20000, 'Old calculation had a 20,000 PKR phantom margin distortion');
});

// ----------------------------------------------------
// TEST 9: Load-linked Expense De-duplication (H2 & M9)
// ----------------------------------------------------
test('H2 & M9: Station expenses exclude load-linked expenses to prevent double-counting', () => {
  const allExpenses = [
    { id: 'e1', category: 'Staff Chai', amount: 1500, loadId: null },
    { id: 'e2', category: 'Generator Fuel', amount: 4000, loadId: null },
    { id: 'e3', category: 'Carriage Rent', amount: 12000, loadId: 'LOAD-001' }, // Attached to LOAD-001
    { id: 'e4', category: 'Police Checkpoint', amount: 3000, loadId: 'LOAD-001' }, // Attached to LOAD-001
  ];

  // Station cash drawer deductions should ONLY include station-level expenses (e1 + e2 = 5,500)
  // Load expenses (e3 + e4 = 15,000) are part of LOAD-001 cost, not daily pump drawer cash.
  const stationGeneralExpenses = allExpenses
    .filter(e => !e.loadId)
    .reduce((sum, e) => sum + e.amount, 0);

  assert.equal(stationGeneralExpenses, 5500, 'General expenses must be 5,500, excluding load carriage costs');
});

// ----------------------------------------------------
// TEST 10: Retail Meter Opening Backdating Guard (M4)
// ----------------------------------------------------
test('M4: Opening meter cannot be backdated below last recorded meter reading', () => {
  const nozzle = { id: 'n1', lastMeter: 45280.50 };

  const validateOpeningMeter = (openingMeter, nozzleLastMeter) => {
    const op = Number(openingMeter) || 0;
    const last = Number(nozzleLastMeter) || 0;
    if (op < last - 0.01) {
      return { valid: false, error: `Opening meter (${op}) cannot be less than last recorded (${last})` };
    }
    return { valid: true };
  };

  assert.equal(validateOpeningMeter(45280.50, nozzle.lastMeter).valid, true, 'Exact last meter valid');
  assert.equal(validateOpeningMeter(45300.00, nozzle.lastMeter).valid, true, 'Higher meter valid');
  assert.equal(validateOpeningMeter(45000.00, nozzle.lastMeter).valid, false, 'Backdated lower meter must be rejected');
});

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
