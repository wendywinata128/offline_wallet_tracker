import type { AppData, StoredProfile, Workspace } from "@/types";
import { SCHEMA_VERSION, createInitialData } from "@/data/defaults";
import { normalizeAppData } from "./validate";
import { runMigrations } from "./migrations";
import { uid } from "@/lib/utils";

const KEY = "wallet-tracker:v1";
const BACKUP_KEY = "wallet-tracker:backup";
const QUARANTINE_KEY = "wallet-tracker:corrupt";

export type StorageEventType = "quota" | "corrupt" | "migrated" | "recovered";

export interface StorageEvent {
  type: StorageEventType;
  message: string;
}

type Listener = (event: StorageEvent) => void;

/**
 * The single owner of localStorage. Nothing else in the app touches the
 * localStorage API directly. It persists a *workspace* — a set of independent
 * profiles (each a full AppData dataset) plus the active profile id — and
 * handles versioning/migration, defensive validation, corruption quarantine +
 * recovery, backup-before-write, quota detection, and usage accounting.
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

  /** A brand-new single-profile workspace. */
  private seedWorkspace(now: string, name = "Profile 1"): Workspace {
    const profile: StoredProfile = {
      id: uid("prf"),
      name,
      createdAt: now,
      data: createInitialData(now),
    };
    return { version: SCHEMA_VERSION, savedAt: now, activeId: profile.id, profiles: [profile] };
  }

  /** Load, migrate, and validate. Falls back to a seeded workspace on failure. */
  load(): Workspace {
    const now = this.nowISO();
    if (!this.available) return this.seedWorkspace(now);

    const raw = localStorage.getItem(KEY);
    if (raw == null) {
      const seeded = this.seedWorkspace(now);
      this.save(seeded);
      return seeded;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const { workspace, migrated } = this.asWorkspace(parsed, now);
      if (migrated) {
        this.emit({ type: "migrated", message: "Your data was upgraded to the latest format." });
        this.save(workspace);
      }
      return workspace;
    } catch {
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
      const seeded = this.seedWorkspace(now);
      this.save(seeded);
      return seeded;
    }
  }

  /**
   * Coerce arbitrary parsed JSON into a valid Workspace. Supports:
   *  - a current workspace  { profiles: [...], activeId }
   *  - a legacy single envelope  { data: AppData }
   *  - a bare AppData object
   */
  private asWorkspace(parsed: unknown, now: string): { workspace: Workspace; migrated: boolean } {
    const obj = parsed as Record<string, unknown> | null;

    // Current multi-profile workspace.
    if (obj && Array.isArray(obj.profiles) && obj.profiles.length) {
      let migrated = false;
      const profiles: StoredProfile[] = (obj.profiles as unknown[]).map((p, i) => {
        const rec = (p ?? {}) as Record<string, unknown>;
        const migration = runMigrations(
          ((rec.data ?? {}) as Record<string, unknown>),
        );
        if (migration.migrated) migrated = true;
        return {
          id: typeof rec.id === "string" ? rec.id : uid("prf"),
          name: typeof rec.name === "string" ? rec.name : `Profile ${i + 1}`,
          createdAt: typeof rec.createdAt === "string" ? rec.createdAt : now,
          data: normalizeAppData(migration.data, now),
        };
      });
      const activeId =
        typeof obj.activeId === "string" &&
        profiles.some((p) => p.id === obj.activeId)
          ? obj.activeId
          : profiles[0].id;
      return {
        workspace: { version: SCHEMA_VERSION, savedAt: now, activeId, profiles },
        migrated,
      };
    }

    // Legacy single envelope { data } or a bare AppData object — wrap it.
    const rawData =
      obj && "data" in obj && typeof obj.data === "object" ? obj.data : parsed;
    const migration = runMigrations((rawData ?? {}) as Record<string, unknown>);
    const data = normalizeAppData(migration.data, now);
    const profile: StoredProfile = {
      id: uid("prf"),
      name: data.profile.name?.trim() || "Profile 1",
      createdAt: data.meta.createdAt || now,
      data,
    };
    return {
      workspace: {
        version: SCHEMA_VERSION,
        savedAt: now,
        activeId: profile.id,
        profiles: [profile],
      },
      migrated: true,
    };
  }

  /** Persist the workspace. Backs up the previous good state, handles quota. */
  save(workspace: Workspace): boolean {
    if (!this.available) return false;

    const stamped: Workspace = {
      ...workspace,
      version: SCHEMA_VERSION,
      savedAt: this.nowISO(),
    };
    const payload = JSON.stringify(stamped);

    try {
      const existing = localStorage.getItem(KEY);
      if (existing) {
        try {
          localStorage.setItem(BACKUP_KEY, existing);
        } catch {
          /* backup is best-effort */
        }
      }
      localStorage.setItem(KEY, payload);
      return true;
    } catch (err) {
      if (this.isQuotaError(err)) {
        try {
          localStorage.removeItem(BACKUP_KEY);
          localStorage.setItem(KEY, payload);
          this.emit({
            type: "quota",
            message:
              "Storage almost full — automatic backup was dropped to save your data. Consider exporting and removing attachments.",
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

  private tryRestoreBackup(now: string): Workspace | null {
    const backup = localStorage.getItem(BACKUP_KEY);
    if (!backup) return null;
    try {
      const parsed = JSON.parse(backup) as unknown;
      const { workspace } = this.asWorkspace(parsed, now);
      this.save(workspace);
      return workspace;
    } catch {
      return null;
    }
  }

  /** Build a fresh AppData for a new profile. */
  freshData(): AppData {
    return createInitialData(this.nowISO());
  }

  newProfileId(): string {
    return uid("prf");
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
    return { bytes, quota: 5 * 1024 * 1024 };
  }

  private savedAtOf(key: string): string | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { savedAt?: string };
      return parsed.savedAt ?? null;
    } catch {
      return null;
    }
  }

  getLastBackupTime(): string | null {
    return this.savedAtOf(BACKUP_KEY);
  }

  getLastSavedTime(): string | null {
    return this.savedAtOf(KEY);
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
