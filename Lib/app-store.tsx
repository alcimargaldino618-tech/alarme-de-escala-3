import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addHistory,
  clearHistory as clearHistoryDb,
  DEFAULT_SETTINGS,
  deleteAlarm as deleteAlarmDb,
  deleteException as deleteExceptionDb,
  loadAlarms,
  loadExceptions,
  loadHistory,
  loadSchedule,
  loadSettings,
  resetApp as resetAppDb,
  saveAlarm as saveAlarmDb,
  saveException as saveExceptionDb,
  saveSchedule as saveScheduleDb,
  saveSettings as saveSettingsDb,
  type HistoryEntry,
  type UserSettings,
} from "./db";
import type { Alarm } from "./alarms";
import { fireKey, getNextOccurrence, shouldAlarmRing } from "./alarms";
import { getWorkStatus, toDateKey, type ScheduleConfig, type ScheduleException } from "./schedule";
import { alarmPlayer, showNotification } from "./audio";
import {
  isNativeApp,
  onNativeAlarmFired,
  onNativeResume,
  rescheduleNativeAlarms,
} from "./native";

interface RingingState {
  alarm: Alarm;
  when: Date;
  audioIssue: boolean;
}

interface AppStore {
  ready: boolean;
  settings: UserSettings;
  schedule: ScheduleConfig | null;
  alarms: Alarm[];
  exceptions: ScheduleException[];
  history: HistoryEntry[];
  ringing: RingingState | null;
  /** true quando rodando dentro do APK Android */
  isNative: boolean;
  /** quantos alarmes o Android tem agendados */
  nativeScheduled: number;
  updateSettings: (patch: Partial<UserSettings>) => Promise<void>;
  setSchedule: (config: ScheduleConfig) => Promise<void>;
  upsertAlarm: (alarm: Alarm) => Promise<void>;
  removeAlarm: (id: string) => Promise<void>;
  setException: (exception: ScheduleException) => Promise<void>;
  removeException: (date: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  reset: () => Promise<void>;
  refresh: () => Promise<void>;
  triggerAlarm: (alarm: Alarm, when?: Date) => Promise<void>;
  dismissAlarm: () => Promise<void>;
  snoozeAlarm: () => Promise<void>;
}

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [schedule, setScheduleState] = useState<ScheduleConfig | null>(null);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [ringing, setRinging] = useState<RingingState | null>(null);
  const firedRef = useRef<Set<string>>(new Set());
  const snoozeRef = useRef<{ alarm: Alarm; when: Date }[]>([]);

  const refresh = useCallback(async () => {
    const [s, sch, al, ex, hi] = await Promise.all([
      loadSettings(),
      loadSchedule(),
      loadAlarms(),
      loadExceptions(),
      loadHistory(),
    ]);
    setSettings(s);
    setScheduleState(sch);
    setAlarms(al);
    setExceptions(ex);
    setHistory(hi);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await refresh();
      } catch (error) {
        console.error("Falha ao carregar dados locais", error);
      }
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  /* Tema */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const apply = () => {
      const dark =
        settings.theme === "escuro" ||
        (settings.theme === "auto" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.classList.toggle("dark", dark);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme]);

  const triggerAlarm = useCallback(
    async (alarm: Alarm, when: Date = new Date()) => {
      const result = await alarmPlayer.play(alarm, { loop: true });
      setRinging({ alarm, when, audioIssue: result === "sem-audio" });
      if (settings.notificationsEnabled) {
        showNotification(
          alarm.appliesTo === "FOLGA" ? "🔔 Alarme de folga" : "🔔 Alarme de trabalho",
          `${alarm.time} — ${alarm.name}`,
        );
      }
      await addHistory({
        alarmId: alarm.id,
        alarmName: alarm.name,
        scheduledTime: alarm.time,
        triggeredAt: when.getTime(),
        action: "DISPAROU",
        detail: result === "sem-audio" ? "Áudio não encontrado" : undefined,
      });
      setHistory(await loadHistory());
      if (alarm.duration > 0) {
        window.setTimeout(() => {
          alarmPlayer.stop();
        }, alarm.duration * 1000);
      }
    },
    [settings.notificationsEnabled],
  );

  const dismissAlarm = useCallback(async () => {
    if (!ringing) return;
    alarmPlayer.stop();
    await addHistory({
      alarmId: ringing.alarm.id,
      alarmName: ringing.alarm.name,
      scheduledTime: ringing.alarm.time,
      triggeredAt: Date.now(),
      action: "DESLIGADO",
    });
    setRinging(null);
    setHistory(await loadHistory());
  }, [ringing]);

  const snoozeAlarm = useCallback(async () => {
    if (!ringing) return;
    alarmPlayer.stop();
    const when = new Date(Date.now() + ringing.alarm.snoozeMinutes * 60_000);
    snoozeRef.current = [...snoozeRef.current, { alarm: ringing.alarm, when }];
    await addHistory({
      alarmId: ringing.alarm.id,
      alarmName: ringing.alarm.name,
      scheduledTime: ringing.alarm.time,
      triggeredAt: Date.now(),
      action: "SONECA",
      detail: `Reagendado para ${when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    });
    setRinging(null);
    setHistory(await loadHistory());
  }, [ringing]);

  /* Motor de disparo — âncora em Date.now(), reavaliado a cada segundo
     e ao voltar do segundo plano (visibilitychange). */
  useEffect(() => {
    if (!ready || !schedule) return;

    const check = () => {
      if (ringing) return;
      const now = new Date();

      // Sonecas pendentes (respeitam a regra da escala novamente)
      const dueSnooze = snoozeRef.current.find((s) => s.when.getTime() <= now.getTime());
      if (dueSnooze) {
        snoozeRef.current = snoozeRef.current.filter((s) => s !== dueSnooze);
        const status = getWorkStatus(now, schedule, exceptions);
        if (shouldAlarmRing(dueSnooze.alarm, status)) {
          void triggerAlarm(dueSnooze.alarm, now);
          return;
        }
        void addHistory({
          alarmId: dueSnooze.alarm.id,
          alarmName: dueSnooze.alarm.name,
          scheduledTime: dueSnooze.alarm.time,
          triggeredAt: now.getTime(),
          action: "IGNORADO_FOLGA",
          detail: "Soneca cancelada pela escala",
        });
        return;
      }

      const status = getWorkStatus(now, schedule, exceptions);
      for (const alarm of alarms) {
        const [h, m] = alarm.time.split(":").map(Number);
        const scheduled = new Date(now);
        scheduled.setHours(h ?? 0, m ?? 0, 0, 0);
        const diff = now.getTime() - scheduled.getTime();
        if (diff < 0 || diff > 120_000) continue;
        const key = fireKey(alarm, scheduled);
        if (firedRef.current.has(key)) continue;
        firedRef.current.add(key);
        if (shouldAlarmRing(alarm, status)) {
          void triggerAlarm(alarm, scheduled);
          return;
        }
        if (alarm.enabled) {
          void addHistory({
            alarmId: alarm.id,
            alarmName: alarm.name,
            scheduledTime: alarm.time,
            triggeredAt: now.getTime(),
            action: "IGNORADO_FOLGA",
            detail: `Hoje é ${status.toLowerCase()} (${toDateKey(now)})`,
          });
        }
      }
    };

    check();
    const interval = window.setInterval(check, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ready, schedule, exceptions, alarms, ringing, triggerAlarm]);

  /* ANDROID (APK): o próprio sistema agenda os alarmes (AlarmManager).
     Reagendamos quando os dados mudam e sempre que o app volta ao primeiro
     plano — inclusive depois de o celular reiniciar. */
  const [nativeScheduled, setNativeScheduled] = useState(0);
  useEffect(() => {
    if (!ready || !isNativeApp()) return;
    let active = true;
    const sync = async () => {
      const count = await rescheduleNativeAlarms(alarms, schedule, exceptions);
      if (active) setNativeScheduled(count);
    };
    void sync();
    let offResume: () => void = () => {};
    let offFired: () => void = () => {};
    void onNativeResume(() => void sync()).then((fn) => {
      offResume = fn;
      if (!active) fn();
    });
    void onNativeAlarmFired((alarmId) => {
      const alarm = alarms.find((a) => a.id === alarmId);
      if (alarm) void triggerAlarm(alarm, new Date());
      void sync();
    }).then((fn) => {
      offFired = fn;
      if (!active) fn();
    });
    return () => {
      active = false;
      offResume();
      offFired();
    };
  }, [ready, alarms, schedule, exceptions, triggerAlarm]);



  const value = useMemo<AppStore>(
    () => ({
      ready,
      settings,
      schedule,
      alarms,
      exceptions,
      history,
      ringing,
      isNative: isNativeApp(),
      nativeScheduled,
      refresh,
      async updateSettings(patch) {
        const next = { ...settings, ...patch, updatedAt: Date.now() };
        setSettings(next);
        await saveSettingsDb(next);
      },
      async setSchedule(config) {
        setScheduleState(config);
        await saveScheduleDb(config);
        await addHistory({
          triggeredAt: Date.now(),
          action: "ESCALA_ALTERADA",
          detail: `${config.scheduleType} · referência ${config.referenceDate} (${config.referenceStatus})`,
        });
        setHistory(await loadHistory());
      },
      async upsertAlarm(alarm) {
        await saveAlarmDb(alarm);
        setAlarms(await loadAlarms());
      },
      async removeAlarm(id) {
        await deleteAlarmDb(id);
        setAlarms(await loadAlarms());
      },
      async setException(exception) {
        await saveExceptionDb(exception);
        setExceptions(await loadExceptions());
        await addHistory({
          triggeredAt: Date.now(),
          action: "EXCECAO_CRIADA",
          detail: `${exception.date} → ${exception.status}`,
        });
        setHistory(await loadHistory());
      },
      async removeException(date) {
        await deleteExceptionDb(date);
        setExceptions(await loadExceptions());
        await addHistory({
          triggeredAt: Date.now(),
          action: "EXCECAO_REMOVIDA",
          detail: date,
        });
        setHistory(await loadHistory());
      },
      async clearHistory() {
        await clearHistoryDb();
        setHistory([]);
      },
      async reset() {
        await resetAppDb();
        firedRef.current = new Set();
        snoozeRef.current = [];
        await refresh();
      },
      triggerAlarm,
      dismissAlarm,
      snoozeAlarm,
    }),
    [
      ready,
      settings,
      schedule,
      alarms,
      exceptions,
      history,
      ringing,
      nativeScheduled,
      refresh,
      triggerAlarm,
      dismissAlarm,
      snoozeAlarm,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore precisa estar dentro de AppStoreProvider");
  return ctx;
}

/** Próximo alarme válido, recalculado a cada segundo (contagem regressiva). */
export function useNextAlarm() {
  const { alarms, schedule, exceptions } = useAppStore();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const i = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(i);
  }, []);

  const next = useMemo(() => {
    if (!schedule || !now) return null;
    return getNextOccurrence(alarms, schedule, exceptions, now);
  }, [alarms, schedule, exceptions, now]);

  return { next, now };
}
