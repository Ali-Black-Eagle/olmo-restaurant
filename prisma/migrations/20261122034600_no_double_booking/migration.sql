-- The no-double-booking guarantee lives in the database, not in application code.
-- Two bookings can never hold the same table over overlapping time ranges,
-- no matter how many requests race each other.
--
-- Safety notes: BookingTable is created in the previous migration and is empty
-- here, so adding the constraint takes no meaningful lock. Rollback:
--   ALTER TABLE "BookingTable" DROP CONSTRAINT no_overlap;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "BookingTable"
  ADD CONSTRAINT during_not_empty CHECK (NOT isempty("during"));

ALTER TABLE "BookingTable"
  ADD CONSTRAINT no_overlap
  EXCLUDE USING gist ("tableId" WITH =, "during" WITH &&);
