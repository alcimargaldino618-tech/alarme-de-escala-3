import { openDB, type IDBPDatabase } from "idb";
import type { Alarm } from "./alarms";
import type { ScheduleConfig, ScheduleException } from "./schedule";

export interface UserSettings {
  id: "default";
  theme: "auto" | "claro" | "escuro";
  notificationsEnabled: boolean;
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  onboardingDone: boolean;
  createdAt: number;
  updatedAt: number;
}

export type HistoryAction =
  | "DISPAROU"
  | "IGNORADO_FOLGA"
  | "SONECA"
  | "DESLIGADO"
  | "EXCECAO_CRIADA"
  | "EXCECAO_REMOVIDA"
  | "ESCALA_ALTERADA";

export interface HistoryEntry {
  id: string;
  alarmId?: string | undefined;
  alarmName?: string | undefined;
  scheduledTime?: string | undefined;
  triggeredAt: number;
  action: HistoryAction;
  detail?: string | undefined;
  createdAt: number;
}

const DB_NAME = "alarme-de-escala";
const DB_VERSION = 1;

export const STORES = {
  settings: "user_settings",
  schedule: "work_schedule",
  alarms: "alarms",
  exceptions: "schedule_exceptions",
  history: "alarm_history",
  audio: "audio_files",
} as const;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB indisponível neste ambiente");
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.settings))
          db.createObjectStore(STORES.settings, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.schedule))
          db.createObjectStore(STORES.schedule, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.alarms))
          db.createObjectStore(STORES.alarms, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.exceptions))
          db.createObjectStore(STORES.exceptions, { keyPath: "date" });
        if (!db.objectStoreNames.contains(STORES.history))
          db.createObjectStore(STORES.history, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORES.audio)) db.createObjectStore(STORES.audio);
      },
    });
  }
  return dbPromise;
}

export const DEFAULT_SETTINGS: UserSettings = {
  id: "default",
  theme: "auto",
  notificationsEnabled: false,
  vibrationEnabled: true,
  soundEnabled: true,
  onboardingDone: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export async function loadSettings(): Promise<UserSettings> {
  const db = await getDB();
  const stored = (await db.get(STORES.settings, "default")) as UserSettings | undefined;
  return stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: UserSettings) {
  const db = await getDB();
  await db.put(STORES.settings, { ...settings, updatedAt: Date.now() });
}

interface StoredSchedule extends ScheduleConfig {
  id: "current";
  createdAt: number;
  updatedAt: number;
}

export async function loadSchedule(): Promise<ScheduleConfig | null> {
  const db = await getDB();
  const stored = (await db.get(STORES.schedule, "current")) as StoredSchedule | undefined;
  if (!stored) return null;
  return {
    scheduleType: stored.scheduleType,
    referenceDate: stored.referenceDate,
    referenceStatus: stored.referenceStatus,
  };
}

export async function saveSchedule(config: ScheduleConfig) {
  const db = await getDB();
  const existing = (await db.get(STORES.schedule, "current")) as StoredSchedule | undefined;
  await db.put(STORES.schedule, {
    id: "current",
    ...config,
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  });
}

export async function loadAlarms(): Promise<Alarm[]> {
  const db = await getDB();
  const all = (await db.getAll(STORES.alarms)) as Alarm[];
  return all.sort((a, b) => a.time.localeCompare(b.time));
}

export async function saveAlarm(alarm: Alarm) {
  const db = await getDB();
  await db.put(STORES.alarms, { ...alarm, updatedAt: Date.now() });
}

export async function deleteAlarm(id: string) {
  const db = await getDB();
  await db.delete(STORES.alarms, id);
}

export async function loadExceptions(): Promise<ScheduleException[]> {
  const db = await getDB();
  return (await db.getAll(STORES.exceptions)) as ScheduleException[];
}

export async function saveException(exception: ScheduleException) {
  const db = await getDB();
  await db.put(STORES.exceptions, { ...exception, createdAt: Date.now() });
}

export async function deleteException(date: string) {
  const db = await getDB();
  await db.delete(STORES.exceptions, date);
}

export async function loadHistory(limit = 200): Promise<HistoryEntry[]> {
  const db = await getDB();
  const all = (await db.getAll(STORES.history)) as HistoryEntry[];
  return all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

export async function addHistory(entry: Omit<HistoryEntry, "id" | "createdAt">) {
  const db = await getDB();
  const id =
    globalThis.crypto?.randomUUID?.() ?? `h-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await db.put(STORES.history, { ...entry, id, createdAt: Date.now() });
}

export async function clearHistory() {
  const db = await getDB();
  await db.clear(STORES.history);
}

/* ---------- Áudio (Blob local, nunca enviado a servidor) ---------- */

export async function saveAudio(key: string, file: Blob) {
  const db = await getDB();
  await db.put(STORES.audio, file, key);
}

export async function loadAudio(key: string): Promise<Blob | null> {
  const db = await getDB();
  const blob = (await db.get(STORES.audio, key)) as Blob | undefined;
  return blob ?? null;
}

export async function deleteAudio(key: string) {
  const db = await getDB();
  await db.delete(STORES.audio, key);
}

/* ---------- Exportar / importar / redefinir ---------- */

export interface BackupPayload {
  app: "ALARME DE ESCALA";
  version: 1;
  exportedAt: string;
  settings: UserSettings;
  schedule: ScheduleConfig | null;
  alarms: Alarm[];
  exceptions: ScheduleException[];
}

export async function exportBackup(): Promise<BackupPayload> {
  const [settings, schedule, alarms, exceptions] = await Promise.all([
    loadSettings(),
    loadSchedule(),
    loadAlarms(),
    loadExceptions(),
  ]);
  return {
    app: "ALARME DE ESCALA",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    schedule,
    alarms,
    exceptions,
  };
}

export async function importBackup(payload: BackupPayload) {
  const db = await getDB();
  if (payload.settings) await saveSettings({ ...DEFAULT_SETTINGS, ...payload.settings });
  if (payload.schedule) await saveSchedule(payload.schedule);
  if (Array.isArray(payload.alarms)) {
    await db.clear(STORES.alarms);
    for (const alarm of payload.alarms) await db.put(STORES.alarms, alarm);
  }
  if (Array.isArray(payload.exceptions)) {
    await db.clear(STORES.exceptions);
    for (const ex of payload.exceptions) await db.put(STORES.exceptions, ex);
  }
}

export async function resetApp() {
  const db = await getDB();
  for (const store of Object.values(STORES)) await db.clear(store);
}
