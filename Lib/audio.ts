import { loadAudio } from "./db";
import type { Alarm } from "./alarms";

export const PRESET_SOUNDS: Record<
  "classico" | "suave" | "digital",
  { label: string; freq: number[]; pattern: number }
> = {
  classico: { label: "Clássico", freq: [880, 660], pattern: 0.5 },
  suave: { label: "Suave", freq: [523, 659, 784], pattern: 0.9 },
  digital: { label: "Digital", freq: [1200, 900], pattern: 0.25 },
};

export const ACCEPTED_AUDIO = "audio/*,.mp3,.m4a,.wav,.ogg";

export class AlarmPlayer {
  private audioEl: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private ctx: AudioContext | null = null;
  private stopBeep: (() => void) | null = null;
  private vibrateTimer: number | null = null;

  /** Retorna "ok" | "sem-audio" | "silencio" */
  async play(alarm: Alarm, opts: { loop?: boolean } = {}): Promise<"ok" | "sem-audio" | "silencio"> {
    this.stop();
    const loop = opts.loop ?? true;

    if (alarm.vibration && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([600, 400, 600]);
      this.vibrateTimer = window.setInterval(() => navigator.vibrate?.([600, 400, 600]), 2000);
    }

    if (alarm.soundType === "SILENCIO") return "silencio";

    if (alarm.soundType === "MUSICA") {
      if (!alarm.audioKey) return "sem-audio";
      const blob = await loadAudio(alarm.audioKey);
      if (!blob) return "sem-audio";
      this.objectUrl = URL.createObjectURL(blob);
      const el = new Audio(this.objectUrl);
      el.loop = loop;
      el.volume = Math.max(0, Math.min(1, alarm.volume));
      this.audioEl = el;
      try {
        await el.play();
        return "ok";
      } catch {
        return "sem-audio";
      }
    }

    this.playPreset(alarm);
    return "ok";
  }

  private playPreset(alarm: Alarm) {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      this.ctx = ctx;
      const preset = PRESET_SOUNDS[alarm.presetSound] ?? PRESET_SOUNDS.classico;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.connect(gain);
      osc.start();
      let step = 0;
      const volume = Math.max(0, Math.min(1, alarm.volume)) * 0.25;
      const tick = () => {
        const freq = preset.freq[step % preset.freq.length] ?? 880;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.setValueAtTime(0, ctx.currentTime + preset.pattern * 0.6);
        step++;
      };
      tick();
      const interval = window.setInterval(tick, preset.pattern * 1000);
      this.stopBeep = () => {
        window.clearInterval(interval);
        try {
          osc.stop();
        } catch {
          /* já parado */
        }
        void ctx.close();
      };
    } catch {
      /* áudio indisponível */
    }
  }

  pause() {
    this.audioEl?.pause();
  }

  resume() {
    void this.audioEl?.play();
  }

  stop() {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.src = "";
      this.audioEl = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.stopBeep?.();
    this.stopBeep = null;
    this.ctx = null;
    if (this.vibrateTimer) {
      window.clearInterval(this.vibrateTimer);
      this.vibrateTimer = null;
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(0);
  }
}

export const alarmPlayer = new AlarmPlayer();

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function showNotification(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icons/icon-192.png", tag: "alarme-de-escala" });
  } catch {
    /* alguns navegadores exigem service worker */
  }
}
