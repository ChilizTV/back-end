-- Migration: Add UNIQUE constraint on transaction_hash to prevent duplicate predictions
-- Run this after cleaning duplicates (see below)

-- Step 1: Delete duplicate predictions, keeping only the first one per transaction_hash
DELETE FROM predictions a
USING predictions b
WHERE a.id > b.id
  AND a.transaction_hash = b.transaction_hash;

-- Step 2: Add unique constraint
ALTER TABLE predictions 
ADD CONSTRAINT predictions_transaction_hash_unique UNIQUE (transaction_hash);
