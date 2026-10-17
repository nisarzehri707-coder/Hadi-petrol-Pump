-- Migration: 001_initial_schema.sql
-- Description: Complete normalized schema for Hadi Petrol Pump Management System

-- 1. Station Configuration
CREATE TABLE IF NOT EXISTS station_config (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    station_name VARCHAR(150) NOT NULL,
    station_name_urdu VARCHAR(150),
    address TEXT,
    phone VARCHAR(50),
    owner_name VARCHAR(100) NOT NULL,
    currency VARCHAR(10) DEFAULT 'PKR',
    petrol_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    diesel_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    petrol_purchase_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    diesel_purchase_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Users & Roles
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'cashier')),
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Fuel Tanks
CREATE TABLE IF NOT EXISTS tanks (
    id VARCHAR(50) PRIMARY KEY,
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('Petrol', 'Diesel')),
    name VARCHAR(100) NOT NULL,
    current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (current_stock >= 0),
    capacity NUMERIC(12, 2) NOT NULL CHECK (capacity > 0),
    min_alert NUMERIC(12, 2) NOT NULL DEFAULT 1000.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Dispenser Nozzles
CREATE TABLE IF NOT EXISTS nozzles (
    id VARCHAR(50) PRIMARY KEY,
    tank_id VARCHAR(50) NOT NULL REFERENCES tanks(id) ON UPDATE CASCADE,
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('Petrol', 'Diesel')),
    name VARCHAR(50) NOT NULL,
    label VARCHAR(100),
    last_meter NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (last_meter >= 0),
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. Customers (Khata Accounts)
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    vehicle_no VARCHAR(50),
    phone VARCHAR(50),
    balance_khata NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    last_transaction TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Procurement Tanker Loads
CREATE TABLE IF NOT EXISTS loads (
    id VARCHAR(50) PRIMARY KEY,
    load_no VARCHAR(50) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    vehicle_type VARCHAR(50),
    vehicle_no VARCHAR(50),
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('Petrol', 'Diesel')),
    litres_received NUMERIC(12, 2) NOT NULL CHECK (litres_received > 0),
    purchase_rate NUMERIC(10, 2) NOT NULL CHECK (purchase_rate > 0),
    total_cost NUMERIC(14, 2) NOT NULL CHECK (total_cost > 0),
    litres_remaining NUMERIC(12, 2) NOT NULL CHECK (litres_remaining >= 0),
    retail_litres_sold NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    bulk_litres_sold NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'depleted', 'cancelled')),
    closed_at TIMESTAMP WITH TIME ZONE,
    supplier_name VARCHAR(150),
    driver_name VARCHAR(100),
    notes TEXT,
    created_by INT REFERENCES users(id)
);

-- 7. Load Direct Expenses
CREATE TABLE IF NOT EXISTS load_expenses (
    id VARCHAR(50) PRIMARY KEY,
    load_id VARCHAR(50) NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    notes TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 8. Retail Sales (Nozzle Shift Sales)
CREATE TABLE IF NOT EXISTS retail_sales (
    id VARCHAR(50) PRIMARY KEY,
    nozzle_id VARCHAR(50) NOT NULL REFERENCES nozzles(id),
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('Petrol', 'Diesel')),
    opening_meter NUMERIC(14, 2) NOT NULL,
    closing_meter NUMERIC(14, 2) NOT NULL CHECK (closing_meter >= opening_meter),
    litres_sold NUMERIC(12, 2) NOT NULL CHECK (litres_sold >= 0),
    rate NUMERIC(10, 2) NOT NULL CHECK (rate >= 0),
    total_sale_value NUMERIC(14, 2) NOT NULL CHECK (total_sale_value >= 0),
    cash_received NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (cash_received >= 0),
    credit_issued NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (credit_issued >= 0),
    credit_customer_id VARCHAR(50) REFERENCES customers(id),
    operator_name VARCHAR(100),
    notes TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by INT REFERENCES users(id)
);

-- 9. Retail Sale Load Allocations (FIFO Tracking)
CREATE TABLE IF NOT EXISTS sale_load_allocations (
    id SERIAL PRIMARY KEY,
    sale_id VARCHAR(50) NOT NULL REFERENCES retail_sales(id) ON DELETE CASCADE,
    load_id VARCHAR(50) NOT NULL REFERENCES loads(id),
    quantity_allocated NUMERIC(12, 2) NOT NULL CHECK (quantity_allocated > 0),
    CONSTRAINT uq_sale_load UNIQUE (sale_id, load_id)
);

-- 10. Bulk Sales (Direct Vehicle Dumping)
CREATE TABLE IF NOT EXISTS bulk_sales (
    id VARCHAR(50) PRIMARY KEY,
    vehicle_no VARCHAR(50) NOT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_id VARCHAR(50) REFERENCES customers(id),
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('Petrol', 'Diesel')),
    litres NUMERIC(12, 2) NOT NULL CHECK (litres > 0),
    rate NUMERIC(10, 2) NOT NULL CHECK (rate >= 0),
    total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
    cash_paid NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (cash_paid >= 0),
    khata_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (khata_amount >= 0),
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('Cash', 'Khata', 'Partial')),
    operator_name VARCHAR(100),
    notes TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by INT REFERENCES users(id)
);

-- 11. Bulk Load Allocations (FIFO Tracking)
CREATE TABLE IF NOT EXISTS bulk_load_allocations (
    id SERIAL PRIMARY KEY,
    bulk_id VARCHAR(50) NOT NULL REFERENCES bulk_sales(id) ON DELETE CASCADE,
    load_id VARCHAR(50) NOT NULL REFERENCES loads(id),
    quantity_allocated NUMERIC(12, 2) NOT NULL CHECK (quantity_allocated > 0),
    CONSTRAINT uq_bulk_load UNIQUE (bulk_id, load_id)
);

-- 12. Khata Customer Transactions (Ledger)
CREATE TABLE IF NOT EXISTS khata_transactions (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('Sale', 'Payment')),
    fuel_type VARCHAR(20),
    litres NUMERIC(12, 2) DEFAULT 0.00,
    rate NUMERIC(10, 2) DEFAULT 0.00,
    total_bill NUMERIC(14, 2) DEFAULT 0.00,
    paid_amount NUMERIC(14, 2) DEFAULT 0.00,
    khata_amount NUMERIC(14, 2) DEFAULT 0.00,
    notes TEXT,
    operator VARCHAR(100),
    sale_ref_id VARCHAR(50),
    is_bulk BOOLEAN DEFAULT FALSE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by INT REFERENCES users(id)
);

-- 13. General Operational Expenses
CREATE TABLE IF NOT EXISTS daily_expenses (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    paid_to VARCHAR(150),
    notes TEXT,
    load_id VARCHAR(50) REFERENCES loads(id),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by INT REFERENCES users(id)
);

-- 14. Shift Closings
CREATE TABLE IF NOT EXISTS shift_closings (
    id VARCHAR(50) PRIMARY KEY,
    shift_name VARCHAR(100) NOT NULL,
    operator_name VARCHAR(100) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_litres NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_revenue NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_cash NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_credit NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_expenses NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    net_drawer_cash NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    actual_drawer_cash NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    discrepancy NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'closed',
    notes TEXT,
    created_by INT REFERENCES users(id)
);

-- 15. Tank Stock Reconciliations
CREATE TABLE IF NOT EXISTS reconciliations (
    id VARCHAR(50) PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('Petrol', 'Diesel')),
    book_stock NUMERIC(12, 2) NOT NULL,
    physical_stock NUMERIC(12, 2) NOT NULL,
    variance_litres NUMERIC(12, 2) NOT NULL,
    variance_value NUMERIC(14, 2) NOT NULL,
    inspector_name VARCHAR(100),
    notes TEXT,
    created_by INT REFERENCES users(id)
);

-- 16. Immutable Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance and high-throughput queries
CREATE INDEX IF NOT EXISTS idx_loads_fuel_status ON loads (fuel_type, status, date);
CREATE INDEX IF NOT EXISTS idx_retail_sales_date ON retail_sales (date);
CREATE INDEX IF NOT EXISTS idx_bulk_sales_date ON bulk_sales (date);
CREATE INDEX IF NOT EXISTS idx_khata_customer_date ON khata_transactions (customer_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_date ON daily_expenses (date);
CREATE INDEX IF NOT EXISTS idx_shift_closings_date ON shift_closings (date);
