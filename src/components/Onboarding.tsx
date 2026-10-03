import { useRef, useState } from "react";
import { Check, Music4 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/app-store";
import { createAlarm } from "@/lib/alarms";
import { CYCLES, SCHEDULE_TYPES, toDateKey, type DayStatus, type ScheduleType } from "@/lib/schedule";
import { ACCEPTED_AUDIO, requestNotificationPermission } from "@/lib/audio";
import { saveAudio } from "@/lib/db";

export function Onboarding() {
  const { setSchedule, upsertAlarm, updateSettings } = useAppStore();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<ScheduleType>("5x1");
  const [refDate, setRefDate] = useState(() => toDateKey(new Date()));
  const [refStatus, setRefStatus] = useState<DayStatus>("TRABALHO");
  const [time, setTime] = useState("05:30");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const finish = async (allowNotifications: boolean) => {
    setSaving(true);
    try {
      await setSchedule({ scheduleType: type, referenceDate: refDate, referenceStatus: refStatus });
      const alarm = createAlarm({ name: "Acordar para o trabalho", time, appliesTo: "TRABALHO" });
      if (file) {
        const key = `audio-${alarm.id}-${Date.now()}`;
        await saveAudio(key, file);
        alarm.soundType = "MUSICA";
        alarm.audioKey = key;
        alarm.audioName = file.name;
      }
      await upsertAlarm(alarm);
      let notificationsEnabled = false;
      if (allowNotifications) {
        notificationsEnabled = (await requestNotificationPermission()) === "granted";
      }
      await updateSettings({ onboardingDone: true, notificationsEnabled });
      toast.success("TUDO PRONTO!", {
        description:
          "Seu alarme será ativado automaticamente somente nos seus dias de trabalho.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between px-5 py-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-primary">
          PASSO {step} DE 6
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">ALARME DE ESCALA</h1>
        <div className="mt-3 flex gap-1">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`}
              aria-hidden
            />
          ))}
        </div>

        <div className="mt-8 space-y-4">
          {step === 1 ? (
            <>
              <h2 className="text-lg font-semibold">Qual é sua escala?</h2>
              <div className="grid grid-cols-2 gap-3">
                {SCHEDULE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      type === t ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <span className="block text-xl font-bold">{t}</span>
                    <span className="text-xs text-muted-foreground">
                      {CYCLES[t].workDays} trabalho / {CYCLES[t].cycleLength - CYCLES[t].workDays}{" "}
                      folga
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h2 className="text-lg font-semibold">Qual é a data de referência?</h2>
              <Label htmlFor="ob-date" className="text-xs text-muted-foreground">
                Um dia que você sabe exatamente se trabalhou ou folgou.
              </Label>
              <Input
                id="ob-date"
                type="date"
                value={refDate}
                onChange={(e) => setRefDate(e.target.value)}
                className="h-14 text-base"
              />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h2 className="text-lg font-semibold">
                Nessa data você trabalha ou está de folga?
              </h2>
              <div className="grid gap-3">
                {(["TRABALHO", "FOLGA"] as DayStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRefStatus(s)}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left font-bold transition-colors ${
                      refStatus === s ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <span
                      className={`size-4 rounded-full ${s === "TRABALHO" ? "bg-work" : "bg-off"}`}
                      aria-hidden
                    />
                    {s}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <h2 className="text-lg font-semibold">
                Qual horário você precisa acordar para trabalhar?
              </h2>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="tabular h-20 text-center text-4xl font-bold"
              />
            </>
          ) : null}

          {step === 5 ? (
            <>
              <h2 className="text-lg font-semibold">Deseja escolher uma música do celular?</h2>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_AUDIO}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFile(f);
                    toast.success("Música selecionada", { description: f.name });
                  }
                }}
              />
              <Button
                variant="secondary"
                className="h-14 w-full"
                onClick={() => fileRef.current?.click()}
              >
                <Music4 className="size-4" aria-hidden /> Escolher música
              </Button>
              {file ? (
                <p className="text-sm">
                  Música selecionada: <span className="font-medium break-all">{file.name}</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Opcional — você pode usar um som padrão e escolher a música depois.
                </p>
              )}
            </>
          ) : null}

          {step === 6 ? (
            <>
              <h2 className="text-lg font-semibold">Permitir notificações?</h2>
              <p className="text-sm text-muted-foreground">
                As notificações avisam quando é hora de trabalhar. Nenhuma notificação de trabalho é
                enviada em dias de folga.
              </p>
              <Button
                className="h-14 w-full text-base font-bold"
                disabled={saving}
                onClick={() => void finish(true)}
              >
                <Check className="size-4" aria-hidden /> Permitir e concluir
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                disabled={saving}
                onClick={() => void finish(false)}
              >
                Concluir sem notificações
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {step < 6 ? (
        <div className="flex gap-3 pt-8">
          {step > 1 ? (
            <Button variant="secondary" className="h-14 flex-1" onClick={() => setStep(step - 1)}>
              Voltar
            </Button>
          ) : null}
          <Button className="h-14 flex-[2] text-base font-bold" onClick={() => setStep(step + 1)}>
            Continuar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
