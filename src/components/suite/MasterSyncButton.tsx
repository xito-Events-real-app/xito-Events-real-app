// MasterSyncButton has been removed as part of the cache-only architecture.
// All reads now come exclusively from the database cache.
// This component is kept as an empty export to avoid breaking imports.

export function MasterSyncButton() {
  return null;
}
