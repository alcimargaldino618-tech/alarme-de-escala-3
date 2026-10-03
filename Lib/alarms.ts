import {
  addDays,
  getWorkStatus,
  startOfDayLocal,
  toDateKey,
  type DayStatus,
  type ScheduleConfig,
  type ScheduleException,
} from "./schedule";

export type AppliesTo = "TRABALHO" | "FOLGA" | "TODOS";
export type SoundType = "PADRAO" | "MUSICA" | "SILENCIO";
export type AlarmDuration = 30 | 60 | 120 | 300 | 0; // 0 = até desligar manualmente

export interface Alarm {
  id: string;
  name: string;
  /** "HH:MM" */
  time: string;
  enabled: boolean;
  appliesTo: AppliesTo;
  soundType: SoundType;
  /** som padrão escolhido quando soundType = PADRAO */
  presetSound: "classico" | "suave" | "digital";
  audioName?: string | undefined;
  /** chave do Blob de áudio no IndexedDB */
  audioKey?: string | undefined;
  volume: number; // 0..1
  vibration: boolean;
  snoozeMinutes: number;
  duration: AlarmDuration;
  createdAt: number;
  updatedAt: number;
}

export const APPLIES_LABEL: Record<AppliesTo, string> = {
  TRABALHO: "Somente dias de TRABALHO",
  FOLGA: "Somente dias de FOLGA",
  TODOS: "Todos os dias",
};

export const DURATION_OPTIONS: { value: AlarmDuration; label: string }[] = [
  { value: 30, label: "30 segundos" },
  { value: 60, label: "1 minuto" },
  { value: 120, label: "2 minutos" },
  { value: 300, label: "5 minutos" },
  { value: 0, label: "Até desligar manualmente" },
];

export const SNOOZE_OPTIONS = [5, 10, 15, 20, 30];

/**
 * REGRA PRINCIPAL — aplicada antes de qualquer tentativa de disparo.
 */
export function shouldAlarmRing(alarm: Alarm, dayStatus: DayStatus): boolean {
  if (!alarm.enabled) return false;
  if (alarm.appliesTo === "TODOS") return true;
  if (dayStatus === "TRABALHO") return alarm.appliesTo === "TRABALHO";
  return alarm.appliesTo === "FOLGA";
}

export function parseTime(time: string): { hours: number; minutes: number } {
  const [h, m] = time.split(":").map(Number);
  return { hours: h ?? 0, minutes: m ?? 0 };
}

export function alarmDateTime(alarm: Alarm, day: Date): Date {
  const { hours, minutes } = parseTime(alarm.time);
  const d = startOfDayLocal(day);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export interface NextOccurrence {
  alarm: Alarm;
  when: Date;
  dayStatus: DayStatus;
}

/**
 * Próxima ocorrência válida entre todos os alarmes, respeitando a escala.
 */
export function getNextOccurrence(
  alarms: Alarm[],
  config: ScheduleConfig,
  exceptions: ScheduleException[],
  now = new Date(),
  maxDays = 60,
): NextOccurrence | null {
  let best: NextOccurrence | null = null;
  for (let i = 0; i <= maxDays; i++) {
    const day = addDays(now, i);
    const dayStatus = getWorkStatus(day, config, exceptions);
    for (const alarm of alarms) {
      if (!shouldAlarmRing(alarm, dayStatus)) continue;
      const when = alarmDateTime(alarm, day);
      if (when.getTime() <= now.getTime()) continue;
      if (!best || when.getTime() < best.when.getTime()) {
        best = { alarm, when, dayStatus };
      }
    }
    if (best) return best;
  }
  return best;
}

/** Alarmes que valem para um dia específico, já filtrados pela regra. */
export function alarmsForDay(
  alarms: Alarm[],
  day: Date,
  config: ScheduleConfig,
  exceptions: ScheduleException[],
): Alarm[] {
  const status = getWorkStatus(day, config, exceptions);
  return alarms
    .filter((a) => shouldAlarmRing(a, status))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function formatCountdown(ms: number): string {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => `${n}`.padStart(2, "0");
  const base = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return days > 0 ? `${days}d ${base}` : base;
}

export function createAlarm(partial: Partial<Alarm> = {}): Alarm {
  const now = Date.now();
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `alarm-${now}-${Math.floor(Math.random() * 100000)}`,
    name: "Novo alarme",
    time: "05:30",
    enabled: true,
    appliesTo: "TRABALHO",
    soundType: "PADRAO",
    presetSound: "classico",
    volume: 0.8,
    vibration: true,
    snoozeMinutes: 10,
    duration: 60,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

/** Chave única de disparo por alarme/dia/horário, para não repetir o toque. */
export function fireKey(alarm: Alarm, when: Date): string {
  return `${alarm.id}@${toDateKey(when)}T${alarm.time}`;
}
