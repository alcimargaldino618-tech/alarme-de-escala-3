import { AlarmClock, BellOff, Music4, TriangleAlert } from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { Button } from "@/components/ui/button";

export function AlarmRinging() {
  const { ringing, dismissAlarm, snoozeAlarm } = useAppStore();
  if (!ringing) return null;
  const { alarm, when, audioIssue } = ringing;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-background px-6 py-10 text-center">
      <div className="flex flex-col items-center gap-3 pt-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
          <AlarmClock className="size-4 animate-pulse" aria-hidden /> ALARME
        </span>
        <p className="tabular text-6xl font-bold tracking-tight">
          {when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-lg font-medium">{alarm.name}</p>
        {alarm.soundType === "MUSICA" && alarm.audioName ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Music4 className="size-4" aria-hidden /> {alarm.audioName}
          </p>
        ) : null}
        {alarm.soundType === "SILENCIO" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <BellOff className="size-4" aria-hidden /> Sem som
          </p>
        ) : null}
        {audioIssue ? (
          <p className="mx-auto flex max-w-xs items-start gap-2 rounded-xl bg-destructive/10 p-3 text-left text-sm text-destructive">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              <strong>Áudio não encontrado.</strong> Selecione novamente uma música para este
              alarme.
            </span>
          </p>
        ) : null}
      </div>

      <div className="w-full max-w-sm space-y-3">
        <Button
          size="lg"
          className="h-16 w-full text-lg font-bold"
          onClick={() => void dismissAlarm()}
        >
          DESLIGAR
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="h-14 w-full text-base font-semibold"
          onClick={() => void snoozeAlarm()}
        >
          SONECA ({alarm.snoozeMinutes} min)
        </Button>
      </div>
    </div>
  );
}
