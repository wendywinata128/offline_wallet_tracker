import type { AppData } from "@/types";
import { APP_VERSION, SCHEMA_VERSION, createInitialData } from "@/data/defaults";
import { normalizeAppData } from "./validate";
import { runMigrations } from "./migrations";

const KEY = "wallet-tracker:v1";
const BACKUP_KEY = "wallet-tracker:backup";
const QUARANTINE_KEY = "wallet-tracker:corrupt";

interface StoredEnvelope {
  version: number;
  savedAt: string;
  data: AppData;
}

export type StorageEventType = "quota" | "corrupt" | "migrated" | "recovered";

export interface StorageEvent {
  type: StorageEventType;
  message: string;
}

type Listener = (event: StorageEvent) => void;

/**
 * The single owner of localStorage. Nothing else in the app touches the
 * localStorage API directly. Responsibilities:
 *  - versioning + migration on load
 *  - defensive validation / corruption quarantine + recovery
 *  - automatic backup-before-write
 *  - quota-exceeded detection and reporting
 *  - storage usage accounting
 */
class StorageService {
  private listeners = new Set<Listener>();
  private available: boolean;

  constructor() {
    this.available = this.checkAvailable();
  }

  private checkAvailable(): boolean {
    try {
      const k = "__wt_probe__";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  }

  get isAvailable() {
    return this.available;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: StorageEvent) {
    this.listeners.forEach((l) => l(event));
  }

  private nowISO(): string {
    return new Date().toISOString();
  }

  /** Load, migrate, and validate. Falls back to seeded data on any failure. */
  load(): AppData {
    const now = this.nowISO();
    if (!this.available) return createInitialData(now);

    const raw = localStorage.getItem(KEY);
    if (raw == null) {
      // First run — seed and persist.
      const seeded = createInitialData(now);
      this.save(seeded);
      return seeded;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const envelope = this.asEnvelope(parsed);
      const migration = runMigrations(envelope.data as unknown as Record<string, unknown>);
      const data = normalizeAppData(migration.data, now);

      if (migration.migrated) {
        this.emit({
          type: "migrated",
          message: `Data upgraded from v${migration.fromVersion} to v${migration.toVersion}.`,
        });
        this.save(data);
      }
      return data;
    } catch (err) {
      // Corruption path: quarantine the bad blob, try the last good backup.
      this.quarantine(raw);
      const recovered = this.tryRestoreBackup(now);
      if (recovered) {
        this.emit({
          type: "recovered",
          message: "Main data was corrupted — restored from the last backup.",
        });
        return recovered;
      }
      this.emit({
        type: "corrupt",
        message:
          "Stored data was unreadable and no backup existed. A fresh workspace was created (your old data was saved for recovery).",
      });
      const seeded = createInitialData(now);
      this.save(seeded);
      return seeded;
    }
  }

  private asEnvelope(parsed: unknown): StoredEnvelope {
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "data" in parsed &&
      typeof (parsed as Record<string, unknown>).data === "object"
    ) {
      return parsed as StoredEnvelope;
    }
    // Legacy/plain payload: treat the whole object as AppData.
    return { version: SCHEMA_VERSION, savedAt: this.nowISO(), data: parsed as AppData };
  }

  /** Persist. Backs up the previous good state first, handles quota errors. */
  save(data: AppData): boolean {
    if (!this.available) return false;

    // Keep meta fresh.
    const stamped: AppData = {
      ...data,
      meta: {
        ...data.meta,
        version: SCHEMA_VERSION,
        appVersion: APP_VERSION,
        lastModified: this.nowISO(),
      },
    };

    const envelope: StoredEnvelope = {
      version: SCHEMA_VERSION,
      savedAt: this.nowISO(),
      data: stamped,
    };

    try {
      // Back up the current good value before overwriting.
      const existing = localStorage.getItem(KEY);
      if (existing) {
        try {
          localStorage.setItem(BACKUP_KEY, existing);
        } catch {
          /* backup is best-effort; don't block the primary save */
        }
      }
      localStorage.setItem(KEY, JSON.stringify(envelope));
      return true;
    } catch (err) {
      if (this.isQuotaError(err)) {
        // Free the backup slot and retry once.
        try {
          localStorage.removeItem(BACKUP_KEY);
          localStorage.setItem(KEY, JSON.stringify(envelope));
          this.emit({
            type: "quota",
            message:
              "Storage almost full — automatic backup was dropped to save your data. Consider exporting and clearing old attachments.",
          });
          return true;
        } catch {
          this.emit({
            type: "quota",
            message:
              "Storage quota exceeded. Your latest change could not be saved. Export your data and remove attachments to free space.",
          });
          return false;
        }
      }
      this.emit({
        type: "corrupt",
        message: "Could not write to storage. Your latest change was not saved.",
      });
      return false;
    }
  }

  private isQuotaError(err: unknown): boolean {
    return (
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        err.code === 22)
    );
  }

  private quarantine(raw: string) {
    try {
      localStorage.setItem(QUARANTINE_KEY, raw);
    } catch {
      /* ignore */
    }
  }

  private tryRestoreBackup(now: string): AppData | null {
    const backup = localStorage.getItem(BACKUP_KEY);
    if (!backup) return null;
    try {
      const parsed = JSON.parse(backup) as unknown;
      const envelope = this.asEnvelope(parsed);
      const data = normalizeAppData(envelope.data, now);
      this.save(data);
      return data;
    } catch {
      return null;
    }
  }

  /** Approximate bytes used by all app keys (UTF-16 → 2 bytes/char). */
  getUsage(): { bytes: number; quota: number } {
    let bytes = 0;
    try {
      for (const key of [KEY, BACKUP_KEY, QUARANTINE_KEY]) {
        const v = localStorage.getItem(key);
        if (v) bytes += (v.length + key.length) * 2;
      }
    } catch {
      /* ignore */
    }
    // Browsers typically allow ~5MB per origin for localStorage.
    return { bytes, quota: 5 * 1024 * 1024 };
  }

  getLastBackupTime(): string | null {
    try {
      const raw = localStorage.getItem(BACKUP_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredEnvelope;
      return parsed.savedAt ?? null;
    } catch {
      return null;
    }
  }

  getLastSavedTime(): string | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredEnvelope;
      return parsed.savedAt ?? null;
    } catch {
      return null;
    }
  }

  hasQuarantine(): boolean {
    try {
      return localStorage.getItem(QUARANTINE_KEY) != null;
    } catch {
      return false;
    }
  }

  /** Wipe everything this app owns. */
  clearAll() {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(BACKUP_KEY);
      localStorage.removeItem(QUARANTINE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export const storage = new StorageService();
