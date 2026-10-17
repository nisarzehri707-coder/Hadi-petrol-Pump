export class InsufficientStockError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'InsufficientStockError';
    this.status = 400;
    this.details = details;
  }
}

// In-process mutex queues to serialize concurrent transactions per fuel type
const tankMutexes = new Map();

export async function withTankLock(fuelType, taskFn) {
  const key = fuelType || 'ALL';
  const previous = tankMutexes.get(key) || Promise.resolve();

  let release;
  const current = new Promise(resolve => { release = resolve; });
  tankMutexes.set(key, current);

  try {
    await previous;
    return await taskFn();
  } finally {
    release();
    if (tankMutexes.get(key) === current) {
      tankMutexes.delete(key);
    }
  }
}

/**
 * Atomically deducts stock from tank and allocates to loads using FIFO with row-level locking.
 * Must be called within an active database transaction client (BEGIN).
 */

export async function allocateStockFIFO(client, { fuelType, requestedLitres, transactionType = 'retail' }) {
  const qty = parseFloat(requestedLitres);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('Requested volume must be a positive number.');
  }

  // 1. Acquire PostgreSQL transaction-level advisory lock (cross-process cluster safe)
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext('tank_' || $1));",
    [fuelType]
  );

  // 2. Lock the fuel tank row for update
  const tankRes = await client.query(
    'SELECT * FROM tanks WHERE fuel_type = $1 FOR UPDATE;',
    [fuelType]
  );


  if (tankRes.rows.length === 0) {
    throw new Error(`Fuel storage tank for "${fuelType}" not found in database.`);
  }

  const tank = tankRes.rows[0];
  const currentStock = parseFloat(tank.current_stock);

  // 2. Validate current tank stock >= requested volume
  if (currentStock < qty) {
    throw new InsufficientStockError(
      `Insufficient tank stock for ${fuelType}. Available: ${currentStock.toFixed(2)}L, requested: ${qty.toFixed(2)}L.`,
      { available: currentStock, requested: qty, deficit: qty - currentStock }
    );
  }

  // 3. Fetch active loads with remaining stock ordered by date ASC (FIFO) with row lock
  const loadsRes = await client.query(
    'SELECT * FROM loads WHERE fuel_type = $1 AND litres_remaining > 0 ORDER BY date ASC, id ASC FOR UPDATE;',
    [fuelType]
  );

  let needed = qty;
  const allocations = [];

  for (const load of loadsRes.rows) {
    if (needed <= 0.0001) break;

    const remaining = parseFloat(load.litres_remaining);
    const take = Math.min(remaining, needed);
    const newRemaining = Math.max(0, remaining - take);

    const isRetail = transactionType === 'retail';
    const retailAdd = isRetail ? take : 0;
    const bulkAdd = !isRetail ? take : 0;
    const newStatus = newRemaining === 0 ? 'depleted' : 'active';
    const closedAt = newRemaining === 0 ? new Date().toISOString() : null;

    await client.query(
      `UPDATE loads 
       SET litres_remaining = $1,
           retail_litres_sold = retail_litres_sold + $2,
           bulk_litres_sold = bulk_litres_sold + $3,
           status = $4,
           closed_at = CASE WHEN $4 = 'depleted' THEN NOW() ELSE closed_at END
       WHERE id = $5;`,
      [newRemaining, retailAdd, bulkAdd, newStatus, load.id]
    );

    allocations.push({
      loadId: load.id,
      quantity: take,
      purchaseRate: parseFloat(load.purchase_rate),
    });

    needed -= take;
  }

  // 4. If loads did not have enough unallocated litres, track remainder gracefully
  // (In real operations, fuel may be in tank before load entry is created)
  if (needed > 0.0001) {
    allocations.push({
      loadId: null,
      quantity: needed,
      purchaseRate: parseFloat(tank.current_stock > 0 ? (fuelType === 'Petrol' ? 268 : 273.5) : 0),
    });
  }

  // 5. Deduct tank inventory
  const updatedTankStock = Math.max(0, currentStock - qty);
  await client.query(
    'UPDATE tanks SET current_stock = $1, last_updated = NOW() WHERE fuel_type = $2;',
    [updatedTankStock, fuelType]
  );

  return {
    allocations,
    previousStock: currentStock,
    newStock: updatedTankStock,
  };
}

/**
 * Atomically reverses stock deduction load-by-load.
 * Must be called within an active database transaction client (BEGIN).
 */
export async function reverseStockAllocation(client, { fuelType, allocations, totalLitres, transactionType = 'retail' }) {
  const qty = parseFloat(totalLitres);

  // 1. Acquire PostgreSQL transaction-level advisory lock
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext('tank_' || $1));",
    [fuelType]
  );

  // 2. Lock the tank row for update
  await client.query(
    'SELECT * FROM tanks WHERE fuel_type = $1 FOR UPDATE;',
    [fuelType]
  );


  // 2. Restore individual load balances exactly as originally deducted
  if (Array.isArray(allocations)) {
    for (const alloc of allocations) {
      if (!alloc.loadId) continue;
      const allocQty = parseFloat(alloc.quantity);
      const isRetail = transactionType === 'retail';
      const retailSub = isRetail ? allocQty : 0;
      const bulkSub = !isRetail ? allocQty : 0;

      await client.query(
        `UPDATE loads
         SET litres_remaining = litres_remaining + $1,
             retail_litres_sold = GREATEST(0::numeric, retail_litres_sold - $2),
             bulk_litres_sold = GREATEST(0::numeric, bulk_litres_sold - $3),
             status = 'active',
             closed_at = NULL
         WHERE id = $4;`,
        [allocQty, retailSub, bulkSub, alloc.loadId]
      );
    }
  }

  // 3. Restore tank inventory
  await client.query(
    'UPDATE tanks SET current_stock = current_stock + $1, last_updated = NOW() WHERE fuel_type = $2;',
    [qty, fuelType]
  );
}

export default {
  InsufficientStockError,
  allocateStockFIFO,
  reverseStockAllocation,
};
