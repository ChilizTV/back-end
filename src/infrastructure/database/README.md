# Database Schemas and Migrations

This directory contains all database schemas and migration files for the application.

## Directory Structure

```
src/infrastructure/database/
├── schemas/          # Database table schemas
├── migrations/       # Database migrations
├── supabase/        # Supabase client and configuration
└── README.md        # This file
```

## Schemas

All schema files are located in `schemas/`:

1. **schema.sql** - Main database schema (matches, predictions, users)
2. **waitlist-schema.sql** - Waitlist entries schema
3. **predictions-schema.sql** - Predictions table schema
4. **streams-schema.sql** - Live streams schema
5. **stream-wallet-schema.sql** - Stream wallet transactions schema
6. **stream-wallets-schema.sql** - Alternative stream wallets schema

## Migrations

Migration files are located in `migrations/` and should be applied via Supabase dashboard in order:

1. **001_add_unique_transaction_hash_predictions.sql** - Add unique constraint on transaction hash for predictions

## Setup Instructions

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the schemas and migrations in order via the Supabase SQL Editor

## Notes

- All schemas follow Supabase/PostgreSQL syntax
- Migrations should be applied via Supabase dashboard
- New migrations should be numbered sequentially (002, 003, etc.)
