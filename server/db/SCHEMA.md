# Hadi Petrol Pump Management System - Database Schema Documentation (Stage 2)

## 1. Overview
This normalized relational database schema is designed for PostgreSQL to support multi-device, concurrent, ACID-compliant fuel pump management. It centralizes all station operations, prevents overselling and duplicate submissions, tracks exact FIFO load deductions and reversals, and enforces strict server-side role-based authorization (Owner and Cashier/Operator).

---

## 2. Table Summary & Migration Order

The schema is partitioned into modular migrations executed in the following strict order:

| Step | Table Name | Purpose | Foreign Key Dependencies |
| :--- | :--- | :--- | :--- |
| **01** | `station_config` | Pump metadata, contact details, currency, default settings | None |
| **02** | `users` | Station staff and owner credentials, bcrypt hashes, roles | None |
| **03** | `fuel_rates` | Historical and current selling and purchase rates per fuel type | `users(id)` |
| **04** | `tanks` | Underground fuel storage tanks, capacities, minimum alerts | None |
| **05** | `nozzles` | Dispensing nozzles linked to storage tanks and meter tracking | `tanks(id)` |
| **06** | `customers` | Credit (Khata) accounts, vehicle details, live ledger balances | None |
| **07** | `loads` | Tanker procurement shipments, purchase costs, remaining stock | `users(id)` |
| **08** | `load_expenses` | Direct procurement expenses (freight, driver tip, cess, etc.) | `loads(id)` |
| **09** | `retail_sales` | Shift nozzle meter sales, litres sold, cash vs credit | `nozzles(id)`, `customers(id)`, `users(id)` |
| **10** | `sale_load_allocations` | Exact FIFO mapping of retail sale volume to procurement loads | `retail_sales(id)`, `loads(id)` |
| **11** | `bulk_sales` | Vehicle dumping and wholesale fuel sales direct from tank | `customers(id)`, `users(id)` |
| **12** | `bulk_load_allocations` | Exact FIFO mapping of bulk sale volume to procurement loads | `bulk_sales(id)`, `loads(id)` |
| **13** | `khata_transactions` | Customer ledger entries (credit fuel issuance, debt payments) | `customers(id)`, `users(id)` |
| **14** | `daily_expenses` | Operational expenses (generator fuel, electricity, salaries, tea) | `loads(id)`, `users(id)` |
| **15** | `shift_closings` | End-of-shift reconciliation, drawer cash, discrepancy tracking | `users(id)` |
| **16** | `reconciliations` | Dip-rod physical stock vs book stock reconciliation audit | `users(id)` |
| **17** | `audit_logs` | Immutable audit trail of administrative and financial mutations | `users(id)` |
| **18** | `user_sessions` | Refresh token hashes and active session management | `users(id)` |

---

## 3. Detailed Table Definitions & Constraints

### 3.1. `station_config`
Stores key-value configurations and pump operational parameters.
- `id` VARCHAR(50) PRIMARY KEY DEFAULT 'default'
- `station_name` VARCHAR(150) NOT NULL
- `station_name_urdu` VARCHAR(150)
- `address` TEXT
- `phone` VARCHAR(50)
- `owner_name` VARCHAR(100) NOT NULL
- `currency` VARCHAR(10) DEFAULT 'PKR'
- `petrol_rate` NUMERIC(10, 2) NOT NULL DEFAULT 0.00
- `diesel_rate` NUMERIC(10, 2) NOT NULL DEFAULT 0.00
- `petrol_purchase_rate` NUMERIC(10, 2) NOT NULL DEFAULT 0.00
- `diesel_purchase_rate` NUMERIC(10, 2) NOT NULL DEFAULT 0.00
- `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()

### 3.2. `users`
Server-side authenticated accounts. Replaces client-side PIN storage.
- `id` SERIAL PRIMARY KEY
- `username` VARCHAR(50) UNIQUE NOT NULL
- `role` VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'cashier'))
- `name` VARCHAR(100) NOT NULL
- `password_hash` VARCHAR(255) NOT NULL (bcrypt hash)
- `is_active` BOOLEAN DEFAULT TRUE
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()
- `updated_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()

### 3.3. `tanks`
Underground fuel storage tanks.
- `id` VARCHAR(50) PRIMARY KEY (e.g. 'tank_petrol', 'tank_diesel')
- `fuel_type` VARCHAR(20) NOT NULL CHECK (fuel_type IN ('Petrol', 'Diesel'))
- `name` VARCHAR(100) NOT NULL
- `current_stock` NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (current_stock >= 0)
- `capacity` NUMERIC(12, 2) NOT NULL CHECK (capacity > 0)
- `min_alert` NUMERIC(12, 2) NOT NULL DEFAULT 1000.00
- `last_updated` TIMESTAMP WITH TIME ZONE DEFAULT NOW()

### 3.4. `nozzles`
Dispensing nozzles mounted on dispensers.
- `id` VARCHAR(50) PRIMARY KEY (e.g. 'n1', 'n2')
- `tank_id` VARCHAR(50) NOT NULL REFERENCES tanks(id) ON UPDATE CASCADE
- `fuel_type` VARCHAR(20) NOT NULL CHECK (fuel_type IN ('Petrol', 'Diesel'))
- `name` VARCHAR(50) NOT NULL
- `label` VARCHAR(100)
- `last_meter` NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (last_meter >= 0)
- `is_active` BOOLEAN DEFAULT TRUE

### 3.5. `customers`
Khata ledger account holders.
- `id` VARCHAR(50) PRIMARY KEY (preserves existing IDs like 'c1', 'c2')
- `name` VARCHAR(150) NOT NULL
- `vehicle_no` VARCHAR(50)
- `phone` VARCHAR(50)
- `balance_khata` NUMERIC(14, 2) NOT NULL DEFAULT 0.00 (Negative indicates advance payment)
- `notes` TEXT
- `last_transaction` TIMESTAMP WITH TIME ZONE
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()

### 3.6. `loads`
Fuel tanker procurement shipments.
- `id` VARCHAR(50) PRIMARY KEY (e.g. 'load_1', 'load_2')
- `load_no` VARCHAR(50) NOT NULL
- `date` TIMESTAMP WITH TIME ZONE NOT NULL
- `vehicle_type` VARCHAR(50)
- `vehicle_no` VARCHAR(50)
- `fuel_type` VARCHAR(20) NOT NULL CHECK (fuel_type IN ('Petrol', 'Diesel'))
- `litres_received` NUMERIC(12, 2) NOT NULL CHECK (litres_received > 0)
- `purchase_rate` NUMERIC(10, 2) NOT NULL CHECK (purchase_rate > 0)
- `total_cost` NUMERIC(14, 2) NOT NULL CHECK (total_cost > 0)
- `litres_remaining` NUMERIC(12, 2) NOT NULL CHECK (litres_remaining >= 0)
- `retail_litres_sold` NUMERIC(12, 2) NOT NULL DEFAULT 0.00
- `bulk_litres_sold` NUMERIC(12, 2) NOT NULL DEFAULT 0.00
- `status` VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'depleted', 'cancelled'))
- `closed_at` TIMESTAMP WITH TIME ZONE
- `supplier_name` VARCHAR(150)
- `driver_name` VARCHAR(100)
- `notes` TEXT
- `created_by` INT REFERENCES users(id)

### 3.7. `load_expenses`
Procurement-specific expenses directly linked to a load.
- `id` VARCHAR(50) PRIMARY KEY
- `load_id` VARCHAR(50) NOT NULL REFERENCES loads(id) ON DELETE CASCADE
- `title` VARCHAR(100) NOT NULL
- `category` VARCHAR(50) NOT NULL
- `amount` NUMERIC(12, 2) NOT NULL CHECK (amount >= 0)
- `notes` TEXT
- `date` TIMESTAMP WITH TIME ZONE NOT NULL

### 3.8. `retail_sales`
Nozzle shift meter sales transactions.
- `id` VARCHAR(50) PRIMARY KEY
- `nozzle_id` VARCHAR(50) NOT NULL REFERENCES nozzles(id)
- `fuel_type` VARCHAR(20) NOT NULL CHECK (fuel_type IN ('Petrol', 'Diesel'))
- `opening_meter` NUMERIC(14, 2) NOT NULL
- `closing_meter` NUMERIC(14, 2) NOT NULL CHECK (closing_meter >= opening_meter)
- `litres_sold` NUMERIC(12, 2) NOT NULL CHECK (litres_sold >= 0)
- `rate` NUMERIC(10, 2) NOT NULL CHECK (rate >= 0)
- `total_sale_value` NUMERIC(14, 2) NOT NULL CHECK (total_sale_value >= 0)
- `cash_received` NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (cash_received >= 0)
- `credit_issued` NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (credit_issued >= 0)
- `credit_customer_id` VARCHAR(50) REFERENCES customers(id)
- `operator_name` VARCHAR(100)
- `notes` TEXT
- `date` TIMESTAMP WITH TIME ZONE NOT NULL
- `created_by` INT REFERENCES users(id)

### 3.9. `sale_load_allocations`
Junction table tracking exact FIFO deductions per retail sale.
- `id` SERIAL PRIMARY KEY
- `sale_id` VARCHAR(50) NOT NULL REFERENCES retail_sales(id) ON DELETE CASCADE
- `load_id` VARCHAR(50) NOT NULL REFERENCES loads(id)
- `quantity_allocated` NUMERIC(12, 2) NOT NULL CHECK (quantity_allocated > 0)
- CONSTRAINT uq_sale_load UNIQUE (sale_id, load_id)

### 3.10. `bulk_sales`
Vehicle dumping and bulk fuel sales.
- `id` VARCHAR(50) PRIMARY KEY
- `vehicle_no` VARCHAR(50) NOT NULL
- `customer_name` VARCHAR(150) NOT NULL
- `customer_id` VARCHAR(50) REFERENCES customers(id)
- `fuel_type` VARCHAR(20) NOT NULL CHECK (fuel_type IN ('Petrol', 'Diesel'))
- `litres` NUMERIC(12, 2) NOT NULL CHECK (litres > 0)
- `rate` NUMERIC(10, 2) NOT NULL CHECK (rate >= 0)
- `total_amount` NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0)
- `cash_paid` NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (cash_paid >= 0)
- `khata_amount` NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (khata_amount >= 0)
- `payment_type` VARCHAR(20) NOT NULL CHECK (payment_type IN ('Cash', 'Khata', 'Partial'))
- `operator_name` VARCHAR(100)
- `notes` TEXT
- `date` TIMESTAMP WITH TIME ZONE NOT NULL
- `created_by` INT REFERENCES users(id)

### 3.11. `bulk_load_allocations`
Junction table tracking exact FIFO deductions per bulk sale.
- `id` SERIAL PRIMARY KEY
- `bulk_id` VARCHAR(50) NOT NULL REFERENCES bulk_sales(id) ON DELETE CASCADE
- `load_id` VARCHAR(50) NOT NULL REFERENCES loads(id)
- `quantity_allocated` NUMERIC(12, 2) NOT NULL CHECK (quantity_allocated > 0)
- CONSTRAINT uq_bulk_load UNIQUE (bulk_id, load_id)

### 3.12. `khata_transactions`
Ledger transactions for credit accounts.
- `id` VARCHAR(50) PRIMARY KEY
- `customer_id` VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE
- `type` VARCHAR(20) NOT NULL CHECK (type IN ('Sale', 'Payment'))
- `fuel_type` VARCHAR(20)
- `litres` NUMERIC(12, 2) DEFAULT 0.00
- `rate` NUMERIC(10, 2) DEFAULT 0.00
- `total_bill` NUMERIC(14, 2) DEFAULT 0.00
- `paid_amount` NUMERIC(14, 2) DEFAULT 0.00
- `khata_amount` NUMERIC(14, 2) DEFAULT 0.00
- `notes` TEXT
- `operator` VARCHAR(100)
- `sale_ref_id` VARCHAR(50)
- `is_bulk` BOOLEAN DEFAULT FALSE
- `date` TIMESTAMP WITH TIME ZONE NOT NULL
- `created_by` INT REFERENCES users(id)

### 3.13. `daily_expenses`
General operational expenses (excluding direct tanker load expenses).
- `id` VARCHAR(50) PRIMARY KEY
- `category` VARCHAR(100) NOT NULL
- `amount` NUMERIC(12, 2) NOT NULL CHECK (amount > 0)
- `paid_to` VARCHAR(150)
- `notes` TEXT
- `load_id` VARCHAR(50) REFERENCES loads(id)
- `date` TIMESTAMP WITH TIME ZONE NOT NULL
- `created_by` INT REFERENCES users(id)

### 3.14. `shift_closings`
Shift drawer summaries and discrepancy logs.
- `id` VARCHAR(50) PRIMARY KEY
- `shift_name` VARCHAR(100) NOT NULL
- `operator_name` VARCHAR(100) NOT NULL
- `date` TIMESTAMP WITH TIME ZONE NOT NULL
- `total_litres` NUMERIC(12, 2) NOT NULL DEFAULT 0.00
- `total_revenue` NUMERIC(14, 2) NOT NULL DEFAULT 0.00
- `total_cash` NUMERIC(14, 2) NOT NULL DEFAULT 0.00
- `total_credit` NUMERIC(14, 2) NOT NULL DEFAULT 0.00
- `total_expenses` NUMERIC(14, 2) NOT NULL DEFAULT 0.00
- `net_drawer_cash` NUMERIC(14, 2) NOT NULL DEFAULT 0.00
- `actual_drawer_cash` NUMERIC(14, 2) NOT NULL DEFAULT 0.00
- `discrepancy` NUMERIC(14, 2) NOT NULL DEFAULT 0.00
- `status` VARCHAR(20) DEFAULT 'closed'
- `notes` TEXT
- `created_by` INT REFERENCES users(id)

### 3.15. `reconciliations`
Tank dip stock audits.
- `id` VARCHAR(50) PRIMARY KEY
- `date` TIMESTAMP WITH TIME ZONE NOT NULL
- `fuel_type` VARCHAR(20) NOT NULL CHECK (fuel_type IN ('Petrol', 'Diesel'))
- `book_stock` NUMERIC(12, 2) NOT NULL
- `physical_stock` NUMERIC(12, 2) NOT NULL
- `variance_litres` NUMERIC(12, 2) NOT NULL
- `variance_value` NUMERIC(14, 2) NOT NULL
- `inspector_name` VARCHAR(100)
- `notes` TEXT
- `created_by` INT REFERENCES users(id)

### 3.16. `audit_logs`
Immutable administrative audit log.
- `id` SERIAL PRIMARY KEY
- `user_id` INT REFERENCES users(id)
- `action` VARCHAR(50) NOT NULL
- `entity_type` VARCHAR(50) NOT NULL
- `entity_id` VARCHAR(50)
- `old_values` JSONB
- `new_values` JSONB
- `ip_address` VARCHAR(50)
- `created_at` TIMESTAMP WITH TIME ZONE DEFAULT NOW()

---

## 4. Concurrency & Integrity Mechanisms

1. **Row-Level Locking on Tanks & Loads**:
   Every stock deduction query begins with:
   `SELECT * FROM tanks WHERE fuel_type = $1 FOR UPDATE;`
   and
   `SELECT * FROM loads WHERE fuel_type = $1 AND litres_remaining > 0 ORDER BY date ASC, id ASC FOR UPDATE;`
   This guarantees that two mobile cashiers attempting to sell fuel simultaneously will never execute overlapping deductions or cause negative tank inventory.

2. **Foreign Key Integrity with Cascade Reversals**:
   - Deleting a retail sale automatically removes its entries from `sale_load_allocations`.
   - Reversal logic atomically restores `loads.litres_remaining` by the recorded `quantity_allocated` values.

3. **Check Constraints**:
   - `tanks.current_stock >= 0` (Database-level hard guarantee against overselling).
   - `loads.litres_remaining >= 0` (Deduction can never leave a load negative).
   - `closing_meter >= opening_meter` (Disallows negative meter flow).
