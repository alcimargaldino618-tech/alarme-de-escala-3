import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, History } from "lucide-react";
import { toast } from "sonner";
import { AppShell, StatusPill } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/lib/app-store";
import { CYCLES, SCHEDULE_TYPES, toDateKey, type DayStatus, type ScheduleType } from "@/lib/schedule";

export const Route = createFileRoute("/escala")({
  head: () => ({
    meta: [
      { title: "Minha Escala — Alarme de Escala" },
      {
        name: "description",
        content:
          "Configure sua escala 5x1, 6x1, 4x2 ou 5x2 com data de referência e situação do dia.",
      },
      { property: "og:title", content: "Minha Escala — Alarme de Escala" },
      {
        property: "og:description",
        content: "Cadastre sua escala e deixe o app calcular trabalho e folga automaticamente.",
      },
    ],
  }),
  component: EscalaPage,
});

function EscalaPage() {
  const { schedule, setSchedule } = useAppStore();
  const [type, setType] = useState<ScheduleType>("5x1");
  const [refDate, setRefDate] = useState(() => toDateKey(new Date()));
  const [refStatus, setRefStatus] = useState<DayStatus>("TRABALHO");

  useEffect(() => {
    if (schedule) {
      setType(schedule.scheduleType);
      setRefDate(schedule.referenceDate);
      setRefStatus(schedule.referenceStatus);
    }
  }, [schedule]);

  const save = async () => {
    await setSchedule({ scheduleType: type, referenceDate: refDate, referenceStatus: refStatus });
    toast.success("Escala salva", {
      description: "Isso recalcula sua escala a partir da nova data de referência.",
    });
  };

  const cycle = CYCLES[type];

  return (
    <AppShell title="MINHA ESCALA" subtitle="Sua escala é calculada pela data de referência">
      <div className="space-y-5">
        <section className="rounded-2xl border border-border bg-card p-4">
          <Label className="mb-3 block">Tipo de escala</Label>
          <div className="grid grid-cols-4 gap-2">
            {SCHEDULE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-xl border py-3 text-base font-bold transition-colors ${
                  type === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Ciclo de {cycle.cycleLength} dias — {cycle.workDays} de trabalho e{" "}
            {cycle.cycleLength - cycle.workDays} de folga.
          </p>
        </section>

        <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <Label htmlFor="ref-date">Data de referência</Label>
          <Input
            id="ref-date"
            type="date"
            value={refDate}
            onChange={(e) => setRefDate(e.target.value)}
            className="h-12 text-base"
          />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <Label className="mb-1 block">Situação da data de referência</Label>
          <p className="mb-3 text-xs text-muted-foreground">
            Obrigatório — o app nunca assume automaticamente.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["TRABALHO", "FOLGA"] as DayStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRefStatus(s)}
                className={`flex items-center justify-center gap-2 rounded-xl border py-4 text-sm font-bold transition-colors ${
                  refStatus === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                <span
                  className={`size-3 rounded-full ${s === "TRABALHO" ? "bg-work" : "bg-off"}`}
                  aria-hidden
                />
                {s}
              </button>
            ))}
          </div>
        </section>

        <Button className="h-14 w-full text-base font-bold" onClick={() => void save()}>
          {schedule ? "SALVAR NOVA ESCALA" : "SALVAR ESCALA"}
        </Button>

        {schedule ? (
          <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
            <p className="font-semibold">Escala atual</p>
            <p className="mt-1 text-muted-foreground">
              {schedule.scheduleType} · referência{" "}
              {schedule.referenceDate.split("-").reverse().join("/")}
            </p>
            <div className="mt-2">
              <StatusPill status={schedule.referenceStatus} />
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Button asChild variant="secondary" className="h-12">
            <Link to="/calendario">
              <CalendarDays className="size-4" aria-hidden /> Calendário
            </Link>
          </Button>
          <Button asChild variant="secondary" className="h-12">
            <Link to="/historico">
              <History className="size-4" aria-hidden /> Histórico
            </Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
