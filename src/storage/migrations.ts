import { SCHEMA_VERSION } from "@/data/defaults";

/**
 * Migration chain. Each migration transforms the raw persisted object from
 * version N to N+1. They operate on plain objects (pre-validation) so a future
 * version can rename/reshape fields before normalization runs.
 *
 * To add a migration when bumping SCHEMA_VERSION to 2:
 *   migrations[1] = (data) => ({ ...data, newField: [] });
 */
type RawData = Record<string, unknown>;
type Migration = (data: RawData) => RawData;

const migrations: Record<number, Migration> = {
  // 1 -> 2 example (inactive until SCHEMA_VERSION >= 2):
  // 1: (data) => ({ ...data, recurring: data.recurring ?? [] }),
};

export interface MigrationResult {
  data: RawData;
  fromVersion: number;
  toVersion: number;
  migrated: boolean;
}

export function runMigrations(raw: RawData): MigrationResult {
  const meta = (raw.meta ?? {}) as RawData;
  let version = typeof meta.version === "number" ? meta.version : 1;
  const fromVersion = version;
  let data = raw;

  while (version < SCHEMA_VERSION) {
    const migrate = migrations[version];
    if (!migrate) break; // no path forward; normalization will backfill
    data = migrate(data);
    version += 1;
  }

  return {
    data,
    fromVersion,
    toVersion: version,
    migrated: version !== fromVersion,
  };
}
