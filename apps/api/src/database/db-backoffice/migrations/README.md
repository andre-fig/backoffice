# Database Migrations

This directory contains TypeORM migrations for the db_backoffice database.

## Running Migrations

### Prerequisites

- Ensure your `.env` file has the correct database credentials:
  - `DB_BACKOFFICE_HOST`
  - `DB_BACKOFFICE_PORT`
  - `DB_BACKOFFICE_USERNAME`
  - `DB_BACKOFFICE_PASSWORD`
  - `DB_BACKOFFICE_DATABASE`
  - `DB_BACKOFFICE_SSL` (optional, defaults to true)

### Commands

```bash
# Show pending migrations
npm run migration:show

# Run all pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert

# Generate a new migration (pass a name)
npm run migration:generate --name=AddYourMigrationName
```

## Migration Order

The migrations must be run in order:

1. **1762376880000-AddUuidColumnsAndExternalIds.ts** (Phase 1 - Additive)

   - Adds UUID columns to all three tables (wabas, lines, analytics)
   - Adds external_id and external_source columns
   - Adds normalized_phone_number to lines
   - Backfills all new columns with data from existing columns
   - Creates unique indexes on (external_source, external_id)
   - **This migration is non-breaking** - the old schema still works

2. **1762376881000-RenameTablesAndSwapPrimaryKeys.ts** (Phase 2 - Swap & Cleanup)
   - Renames tables: im_wabas→wabas, meta_lines→lines, conversation_analytics→analytics
   - Swaps primary keys from text-based IDs to UUIDs
   - Updates foreign key relationships to use UUIDs
   - Drops old text-based ID columns
   - **This migration is breaking** - requires the application code to be updated first

## Important Notes

⚠️ **CRITICAL**: Before running these migrations in production:

1. **Create a full database backup**
2. **Test migrations on a staging/development database first**
3. **Ensure the application code has been deployed** (PR #18 must be merged and deployed)
4. **Run migrations during a maintenance window** (Phase 2 will cause brief downtime)

## Rollback Strategy

- **Phase 1 migration** can be safely reverted with `npm run migration:revert`
- **Phase 2 migration** cannot be safely reverted - restore from backup if needed

## What These Migrations Do

### Phase 1: Additive Changes (Non-Breaking)

- Adds new UUID-based columns alongside existing text-based IDs
- Backfills data so both old and new columns have values
- Application can continue using old columns during this phase

### Phase 2: Swap & Cleanup (Breaking)

- Switches primary keys from text to UUID
- Renames tables to simpler names
- Removes old text-based ID columns
- Application MUST use new UUID-based code after this phase

## Verification

After running migrations, verify the schema:

```sql
-- Check wabas table structure
\d wabas

-- Check lines table structure
\d lines

-- Check analytics table structure
\d analytics

-- Verify data integrity
SELECT COUNT(*) FROM wabas;
SELECT COUNT(*) FROM lines;
SELECT COUNT(*) FROM analytics;
```
