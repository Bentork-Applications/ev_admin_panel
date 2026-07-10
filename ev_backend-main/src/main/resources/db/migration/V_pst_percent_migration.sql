-- PST Migration: Rename column from flat per-kWh to percentage-based
-- Run this BEFORE deploying the new code

-- Step 1: Rename the column
ALTER TABLE charger RENAME COLUMN pst_per_kwh TO pst_percent;

-- Step 2: Convert existing flat ₹ values to percentage values
-- If your chargers currently store flat amounts (e.g., pst_per_kwh = 2 with rate = 16),
-- then the equivalent percentage = (flat_amount / rate) × 100
-- Example: 2 / 16 × 100 = 12.5%
-- 
-- UNCOMMENT and run this if your existing data has flat ₹ values:
-- UPDATE charger SET pst_percent = (pst_percent / rate) * 100 WHERE rate > 0 AND pst_percent > 0;
--
-- If your existing data already has percentage values (e.g., 12.5), skip Step 2.
