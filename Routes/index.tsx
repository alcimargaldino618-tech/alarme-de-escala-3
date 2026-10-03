import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlarmClock, CalendarDays, Music4, Plus } from "lucide-react";
import { AppShell, StatusPill } from "@/components/AppShell";
import { Onboarding } from "@/components/Onboarding";
import { Button } from "@/components/ui/button";
import { useAppStore, useNextAlarm } from "@/lib/app-store";
import { alarmsForDay, formatCountdown } from "@/lib/alarms";
import { getDaysRange, getWorkStatus, findNextDayWithStatus } from "@/lib/schedule";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alarme de Escala — alarme automático 5x1, 6x1, 4x2 e 5x2" },
      {
        name: "description",
        content:
          "Alarme que toca somente nos seus dias de trabalho. Configure sua escala uma vez e use sua própria música do celular.",
      },
      { property: "og:title", content: "Alarme de Escala — alarme automático por escala" },
      {
        property: "og:description",
        content:
          "Escalas 5x1, 6x1, 4x2 e 5x2 com alarmes que respeitam trabalho e folga, offline no seu celular.",
      },
    ],
  }),
  component: Index,
});

const SEMANA_LONGA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function Index() {
  const { ready, settings, schedule, alarms, exceptions } = useAppStore();
  const { next, now } = useNextAlarm();

  const info = useMemo(() => {
    if (!schedule || !now) return null;
    const todayStatus = getWorkStatus(now, schedule, exceptions);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      todayStatus,
      tomorrowStatus: getWorkStatus(tomorrow, schedule, exceptions),
      nextWork: findNextDayWithStatus(now, "TRABALHO", schedule, exceptions),
      nextOff: findNextDayWithStatus(now, "FOLGA", schedule, exceptions),
      next7: getDaysRange(now, 7, schedule, exceptions),
      todayAlarms: alarmsForDay(alarms, now, schedule, exceptions),
    };
  }, [schedule, exceptions, alarms, now]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!settings.onboardingDone || !schedule) return <Onboarding />;
  if (!info || !now) return null;

  const work = info.todayStatus === "TRABALHO";

  return (
    <AppShell
      title="ALARME DE ESCALA"
      subtitle={`Escala ${schedule.scheduleType}`}
      action={
        <Button asChild size="sm" variant="secondary">
          <Link to="/alarmes">
            <Plus className="size-4" aria-hidden /> Alarme
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <section
          className={`rounded-3xl border border-border p-5 ${work ? "bg-work-soft" : "bg-off-soft"}`}
        >
          <p className="text-xs font-bold tracking-widest text-foreground/70">HOJE</p>
          <p className="tabular mt-1 text-sm text-foreground/80">
            {now.toLocaleDateString("pt-BR")} — {SEMANA_LONGA[now.getDay()]}
          </p>
          <p className="mt-3 flex items-center gap-2 font-display text-4xl font-bold text-foreground">
            <span className={`size-4 rounded-full ${work ? "bg-work" : "bg-off"}`} aria-hidden />
            {info.todayStatus}
          </p>

          <div className="mt-5 rounded-2xl bg-background/70 p-4">
            <p className="text-xs font-bold tracking-widest text-muted-foreground">
              PRÓXIMO ALARME
            </p>
            {next ? (
              <>
                <p className="tabular mt-1 text-4xl font-bold">{next.alarm.time}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {next.alarm.name} ·{" "}
                  {next.when.toDateString() === now.toDateString()
                    ? "hoje"
                    : next.when.toLocaleDateString("pt-BR")}
                </p>
                <p className="tabular mt-2 text-sm">
                  Daqui a{" "}
                  <span className="font-bold">
                    {formatCountdown(next.when.getTime() - now.getTime())}
                  </span>
                </p>
                {next.alarm.soundType === "MUSICA" && next.alarm.audioName ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Music4 className="size-3.5" aria-hidden />
                    <span className="truncate">{next.alarm.audioName}</span>
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Nenhum alarme programado. Cadastre um alarme para começar.
              </p>
            )}
            {!work ? (
              <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                Hoje é folga: nenhum alarme de trabalho hoje. Próximo dia de trabalho:{" "}
                <strong>{info.nextWork?.toLocaleDateString("pt-BR")}</strong>
              </p>
            ) : null}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground">AMANHÃ</p>
            <div className="mt-2">
              <StatusPill status={info.tomorrowStatus} />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground">PRÓXIMA FOLGA</p>
            <p className="tabular mt-2 text-sm font-bold">
              {info.nextOff?.toLocaleDateString("pt-BR") ?? "—"}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold tracking-widest text-muted-foreground">
            ALARMES DE HOJE
          </p>
          {info.todayAlarms.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhum alarme válido para hoje ({info.todayStatus.toLowerCase()}).
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {info.todayAlarms.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="tabular font-bold">{a.time}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{a.name}</span>
                  <AlarmClock className="size-4 text-muted-foreground" aria-hidden />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <p className="text-xs font-bold tracking-widest text-muted-foreground">PRÓXIMOS 7 DIAS</p>
          {info.next7.map((day) => {
            const dayAlarms = alarmsForDay(alarms, day.date, schedule, exceptions);
            return (
              <div
                key={day.key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="tabular text-sm font-bold">
                    {day.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {SEMANA_LONGA[day.date.getDay()]}
                    {day.isException ? " · exceção" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular text-xs text-muted-foreground">
                    {dayAlarms[0]?.time ?? "—"}
                  </span>
                  <StatusPill status={day.status} />
                </div>
              </div>
            );
          })}
        </section>

        <Button asChild variant="secondary" className="h-12 w-full">
          <Link to="/calendario">
            <CalendarDays className="size-4" aria-hidden /> Ver calendário completo
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}
