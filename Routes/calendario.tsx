import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppShell, StatusPill } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/app-store";
import { getMonthGrid, type DayInfo, type DayStatus } from "@/lib/schedule";
import { alarmsForDay } from "@/lib/alarms";
import {
  getDayEvents,
  HOLIDAY_DOT_CLASS,
  HOLIDAY_LABEL,
  HOLIDAY_TEXT_CLASS,
  PAYDAY_DOT_CLASS,
  PAYDAY_TEXT_CLASS,
  WEEKDAY_LONG,
} from "@/lib/calendar-events";


export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário da Escala — Alarme de Escala" },
      {
        name: "description",
        content:
          "Veja mês a mês seus dias de trabalho e folga e registre exceções manuais na escala.",
      },
      { property: "og:title", content: "Calendário da Escala — Alarme de Escala" },
      {
        property: "og:description",
        content: "Trabalho e folga calculados automaticamente, com exceções manuais.",
      },
    ],
  }),
  component: CalendarioPage,
});

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function CalendarioPage() {
  const { schedule, exceptions, alarms, setException, removeException } = useAppStore();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<DayInfo | null>(null);

  const grid = useMemo(
    () => (schedule ? getMonthGrid(year, month, schedule, exceptions) : []),
    [schedule, exceptions, year, month],
  );

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  if (!schedule) {
    return (
      <AppShell title="CALENDÁRIO">
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-semibold">Cadastre sua escala primeiro</p>
          <Button asChild className="mt-4">
            <Link to="/escala">Ir para Minha Escala</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const workCount = grid.filter((d) => d?.status === "TRABALHO").length;
  const offCount = grid.filter((d) => d?.status === "FOLGA").length;

  return (
    <AppShell title="CALENDÁRIO" subtitle={`Escala ${schedule.scheduleType}`}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button size="icon" variant="secondary" aria-label="Mês anterior" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <div className="text-center">
            <p className="font-display text-lg font-bold">
              {MESES[month]} {year}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <button type="button" className="underline" onClick={() => setYear(year - 1)}>
                {year - 1}
              </button>
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setYear(today.getFullYear());
                  setMonth(today.getMonth());
                }}
              >
                hoje
              </button>
              <button type="button" className="underline" onClick={() => setYear(year + 1)}>
                {year + 1}
              </button>
            </div>
          </div>
          <Button size="icon" variant="secondary" aria-label="Próximo mês" onClick={() => shift(1)}>
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="grid grid-cols-7 gap-1 pb-2 text-center text-xs font-semibold text-muted-foreground">
            {SEMANA.map((d, i) => (
              <span key={`${d}-${i}`}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((day, i) => {
              if (!day) return <span key={`empty-${i}`} className="aspect-square" />;
              const { holiday, payday } = getDayEvents(day.key);
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelected(day)}
                  aria-label={`${day.date.toLocaleDateString("pt-BR")} — ${day.status}${holiday ? ` — ${HOLIDAY_LABEL[holiday.type]}: ${holiday.name}` : ""}${payday ? " — Dia de pagamento" : ""}`}
                  className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-sm font-semibold ${
                    day.status === "TRABALHO"
                      ? "bg-work-soft text-work-foreground"
                      : "bg-off-soft text-off-foreground"
                  } ${day.key === `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-${`${today.getDate()}`.padStart(2, "0")}` ? "ring-2 ring-primary" : ""}`}
                >
                  <span className="leading-none">{day.date.getDate()}</span>
                  {holiday || payday ? (
                    <span className="flex items-center gap-0.5" aria-hidden>
                      {holiday ? (
                        <span className={`size-1.5 rounded-full ${HOLIDAY_DOT_CLASS[holiday.type]}`} />
                      ) : null}
                      {payday ? (
                        <span className={`size-1.5 rounded-full ${PAYDAY_DOT_CLASS}`} />
                      ) : null}
                    </span>
                  ) : null}
                  {day.isException ? (
                    <span className="absolute right-1 top-1 size-1.5 rounded-full bg-primary" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-work" aria-hidden /> Trabalho ({workCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-off" aria-hidden /> Folga ({offCount})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-holiday-national" aria-hidden /> Feriado nacional
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-holiday-municipal" aria-hidden /> Feriado municipal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-holiday-state" aria-hidden /> Estadual / Rural
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-payday" aria-hidden /> Dia de pagamento
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-primary" aria-hidden /> Exceção
            </span>
          </div>

        </div>

        <p className="text-xs text-muted-foreground">
          Toque em um dia para ver os detalhes (feriado, pagamento e alarme) ou editá-lo. Feriados
          não alteram sua escala — só a exceção manual muda o dia.
        </p>

      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>DETALHES DO DIA</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="tabular text-lg font-bold">
                    {selected.date.toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {WEEKDAY_LONG[selected.date.getDay()]}
                  </p>
                </div>
                <StatusPill status={selected.status} />
              </div>

              <dl className="space-y-2 rounded-xl border border-border bg-surface p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Escala</dt>
                  <dd className="font-semibold">
                    {selected.status}
                    {selected.isException ? " (exceção manual)" : ""}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Feriado / evento</dt>
                  <dd className="text-right font-semibold">
                    {(() => {
                      const h = getDayEvents(selected.key).holiday;
                      if (!h) return <span className="text-muted-foreground">Nenhum</span>;
                      return (
                        <span className={HOLIDAY_TEXT_CLASS[h.type]}>
                          {h.name}
                          <span className="block text-xs font-medium">
                            {HOLIDAY_LABEL[h.type]}
                          </span>
                        </span>
                      );
                    })()}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Pagamento</dt>
                  <dd className="font-semibold">
                    {getDayEvents(selected.key).payday ? (
                      <span className={PAYDAY_TEXT_CLASS}>Dia de pagamento</span>
                    ) : (
                      <span className="text-muted-foreground">Não</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Próximo alarme</dt>
                  <dd className="text-right font-semibold">
                    {(() => {
                      const list = alarmsForDay(
                        alarms.filter((a) => a.enabled),
                        selected.date,
                        schedule,
                        exceptions,
                      );
                      const next = list[0];
                      if (!next) return <span className="text-muted-foreground">Nenhum</span>;
                      return (
                        <span className="tabular">
                          {next.time}
                          <span className="block text-xs font-medium text-muted-foreground">
                            {next.name}
                          </span>
                        </span>
                      );
                    })()}
                  </dd>
                </div>
              </dl>

              <div className="grid grid-cols-2 gap-2">
                {(["TRABALHO", "FOLGA"] as DayStatus[]).map((s) => (
                  <Button
                    key={s}
                    variant={selected.status === s ? "default" : "secondary"}
                    className="h-12"
                    onClick={() => {
                      void setException({ date: selected.key, status: s, reason: "Ajuste manual" });
                      toast.success(`${selected.date.toLocaleDateString("pt-BR")} → ${s}`);
                      setSelected(null);
                    }}
                  >
                    Alterar para {s}
                  </Button>
                ))}
              </div>
              {selected.isException ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    void removeException(selected.key);
                    toast.success("Exceção removida — volta ao cálculo normal");
                    setSelected(null);
                  }}
                >
                  <RotateCcw className="size-4" aria-hidden /> Remover exceção
                </Button>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
