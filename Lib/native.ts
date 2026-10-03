/**
 * Ponte com o Android nativo (Capacitor).
 *
 * Na versão APK os alarmes são AGENDADOS PELO ANDROID (AlarmManager, via
 * LocalNotifications com allowWhileIdle + exact alarms). Não dependemos de
 * setTimeout, aba aberta ou internet. Na versão web tudo isso é ignorado e o
 * motor de disparo em JavaScript continua sendo usado.
 */
import type { Alarm } from "./alarms";
import { alarmsForDay } from "./alarms";
import { addDays, type ScheduleConfig, type ScheduleException } from "./schedule";

export type PermissionState = "concedida" | "negada" | "indefinida" | "indisponivel";

export interface NativeStatus {
  isNative: boolean;
  platform: string;
  notifications: PermissionState;
  exactAlarms: PermissionState;
  scheduledCount: number;
}

/** Quantos dias à frente pré-agendamos no Android. */
const SCHEDULE_HORIZON_DAYS = 30;
/** Máximo de notificações agendadas (limite prático do Android). */
const MAX_SCHEDULED = 60;

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export function nativePlatform(): string {
  if (typeof window === "undefined") return "server";
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  return cap?.getPlatform?.() ?? "web";
}

async function localNotifications() {
  if (!isNativeApp()) return null;
  try {
    const mod = await import("@capacitor/local-notifications");
    return mod.LocalNotifications;
  } catch {
    return null;
  }
}

/** ID numérico estável por alarme + ocorrência. */
function notificationId(alarm: Alarm, when: Date): number {
  let hash = 0;
  const raw = `${alarm.id}|${when.getTime()}`;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) % 2_000_000_000;
  }
  return hash + 1;
}

export async function requestNativePermissions(): Promise<PermissionState> {
  const ln = await localNotifications();
  if (!ln) return "indisponivel";
  try {
    const res = await ln.requestPermissions();
    return res.display === "granted" ? "concedida" : "negada";
  } catch {
    return "negada";
  }
}

export async function getNativeStatus(): Promise<NativeStatus> {
  const base: NativeStatus = {
    isNative: isNativeApp(),
    platform: nativePlatform(),
    notifications: "indisponivel",
    exactAlarms: "indisponivel",
    scheduledCount: 0,
  };
  const ln = await localNotifications();
  if (!ln) return base;
  try {
    const perm = await ln.checkPermissions();
    base.notifications =
      perm.display === "granted"
        ? "concedida"
        : perm.display === "denied"
          ? "negada"
          : "indefinida";
  } catch {
    base.notifications = "indefinida";
  }
  try {
    const exact = await ln.checkExactNotificationSetting();
    base.exactAlarms = exact.exact_alarm === "granted" ? "concedida" : "negada";
  } catch {
    base.exactAlarms = "indefinida";
  }
  try {
    const pending = await ln.getPending();
    base.scheduledCount = pending.notifications.length;
  } catch {
    /* ignora */
  }
  return base;
}

/** Abre a tela do Android para autorizar alarmes exatos. */
export async function openExactAlarmSettings(): Promise<boolean> {
  const ln = await localNotifications();
  if (!ln) return false;
  try {
    await ln.changeExactNotificationSetting();
    return true;
  } catch {
    return false;
  }
}

/** Abre as configurações de notificação do app no Android. */
export async function openNotificationSettings(): Promise<boolean> {
  const ln = await localNotifications();
  if (!ln) return false;
  try {
    await ln.requestPermissions();
    return true;
  } catch {
    return false;
  }
}

export interface PlannedOccurrence {
  alarm: Alarm;
  when: Date;
}

/** Calcula as próximas ocorrências válidas respeitando a escala e exceções. */
export function planOccurrences(
  alarms: Alarm[],
  config: ScheduleConfig,
  exceptions: ScheduleException[],
  now = new Date(),
): PlannedOccurrence[] {
  const out: PlannedOccurrence[] = [];
  for (let i = 0; i <= SCHEDULE_HORIZON_DAYS && out.length < MAX_SCHEDULED; i++) {
    const day = addDays(now, i);
    for (const alarm of alarmsForDay(alarms, day, config, exceptions)) {
      const [h, m] = alarm.time.split(":").map(Number);
      const when = new Date(day);
      when.setHours(h ?? 0, m ?? 0, 0, 0);
      if (when.getTime() <= now.getTime()) continue;
      out.push({ alarm, when });
      if (out.length >= MAX_SCHEDULED) break;
    }
  }
  return out.sort((a, b) => a.when.getTime() - b.when.getTime());
}

/**
 * Reagenda TODOS os alarmes no Android. Chamado quando os dados mudam, quando o
 * app volta do segundo plano e após a reinicialização do celular.
 */
export async function rescheduleNativeAlarms(
  alarms: Alarm[],
  config: ScheduleConfig | null,
  exceptions: ScheduleException[],
): Promise<number> {
  const ln = await localNotifications();
  if (!ln || !config) return 0;

  try {
    const pending = await ln.getPending();
    if (pending.notifications.length) {
      await ln.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
  } catch {
    /* ignora */
  }

  const planned = planOccurrences(alarms, config, exceptions);
  if (!planned.length) return 0;

  try {
    await ln.createChannel({
      id: "alarme-escala",
      name: "Alarmes de escala",
      description: "Alarmes de trabalho e folga",
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: "alarme.wav",
    });
  } catch {
    /* canal pode já existir */
  }

  try {
    await ln.schedule({
      notifications: planned.map(({ alarm, when }) => ({
        id: notificationId(alarm, when),
        title: alarm.appliesTo === "FOLGA" ? "🔔 Alarme de folga" : "🔔 Alarme de trabalho",
        body: `${alarm.time} — ${alarm.name}`,
        channelId: "alarme-escala",
        smallIcon: "ic_stat_alarm",
        ongoing: true,
        autoCancel: false,
        extra: { alarmId: alarm.id, at: when.getTime() },
        schedule: {
          at: when,
          allowWhileIdle: true,
        },
      })),
    });
    return planned.length;
  } catch (error) {
    console.error("Falha ao agendar alarmes nativos", error);
    return 0;
  }
}

export async function cancelAllNativeAlarms(): Promise<void> {
  const ln = await localNotifications();
  if (!ln) return;
  try {
    const pending = await ln.getPending();
    if (pending.notifications.length) {
      await ln.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
  } catch {
    /* ignora */
  }
}

/**
 * Assina o toque do alarme nativo: quando o Android dispara a notificação, o
 * app abre e reproduz a música personalizada / mostra a tela de alarme.
 */
export async function onNativeAlarmFired(
  handler: (alarmId: string) => void,
): Promise<() => void> {
  const ln = await localNotifications();
  if (!ln) return () => {};
  const listeners: { remove: () => void }[] = [];
  try {
    const received = await ln.addListener("localNotificationReceived", (n) => {
      const id = (n.extra as { alarmId?: string } | undefined)?.alarmId;
      if (id) handler(id);
    });
    listeners.push(received);
    const action = await ln.addListener("localNotificationActionPerformed", (n) => {
      const id = (n.notification.extra as { alarmId?: string } | undefined)?.alarmId;
      if (id) handler(id);
    });
    listeners.push(action);
  } catch {
    /* ignora */
  }
  return () => listeners.forEach((l) => l.remove());
}

/** Reage ao app voltar ao primeiro plano (inclui pós-reinicialização). */
export async function onNativeResume(handler: () => void): Promise<() => void> {
  if (!isNativeApp()) return () => {};
  try {
    const { App } = await import("@capacitor/app");
    const sub = await App.addListener("resume", handler);
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
