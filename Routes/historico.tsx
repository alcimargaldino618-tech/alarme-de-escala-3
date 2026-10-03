import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/app-store";
import { getDaysRange } from "@/lib/schedule";
import type { HistoryAction } from "@/lib/db";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico — Alarme de Escala" },
      {
        name: "description",
        content:
          "Dias trabalhados, folgas, alterações manuais, alarmes disparados e alarmes ignorados por ser folga.",
      },
      { property: "og:title", content: "Histórico — Alarme de Escala" },
      {
        property: "og:description",
        content: "Acompanhe tudo o que o app fez com seus alarmes e sua escala.",
      },
    ],
  }),
  component: HistoricoPage,
});

const LABEL: Record<HistoryAction, string> = {
  DISPAROU: "Alarme disparado",
  IGNORADO_FOLGA: "Alarme ignorado pela escala",
  SONECA: "Soneca",
  DESLIGADO: "Alarme desligado",
  EXCECAO_CRIADA: "Exceção criada",
  EXCECAO_REMOVIDA: "Exceção removida",
  ESCALA_ALTERADA: "Escala alterada",
};

function HistoricoPage() {
  const { history, clearHistory, schedule, exceptions } = useAppStore();

  const last30 = useMemo(() => {
    if (!schedule) return { work: 0, off: 0 };
    const start = new Date();
    start.setDate(start.getDate() - 29);
    const days = getDaysRange(start, 30, schedule, exceptions);
    return {
      work: days.filter((d) => d.status === "TRABALHO").length,
      off: days.filter((d) => d.status === "FOLGA").length,
    };
  }, [schedule, exceptions]);

  return (
    <AppShell
      title="HISTÓRICO"
      subtitle="Últimos 30 dias e eventos dos alarmes"
      action={
        history.length > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void clearHistory();
              toast.success("Histórico limpo");
            }}
          >
            <Trash2 className="size-4" aria-hidden /> Limpar
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-work-soft p-4">
            <p className="text-xs font-semibold text-work-foreground">Dias trabalhados</p>
            <p className="tabular text-3xl font-bold text-work-foreground">{last30.work}</p>
          </div>
          <div className="rounded-2xl border border-border bg-off-soft p-4">
            <p className="text-xs font-semibold text-off-foreground">Dias de folga</p>
            <p className="tabular text-3xl font-bold text-off-foreground">{last30.off}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-2">
          {history.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum evento registrado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((h) => (
                <li key={h.id} className="flex items-start justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{LABEL[h.action]}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[h.alarmName, h.scheduledTime, h.detail].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <p className="tabular shrink-0 text-xs text-muted-foreground">
                    {new Date(h.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
