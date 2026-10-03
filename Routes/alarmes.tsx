import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BellOff, Music4, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AlarmEditor } from "@/components/AlarmEditor";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/lib/app-store";
import { APPLIES_LABEL, createAlarm, type Alarm } from "@/lib/alarms";

export const Route = createFileRoute("/alarmes")({
  head: () => ({
    meta: [
      { title: "Meus Alarmes — Alarme de Escala" },
      {
        name: "description",
        content:
          "Cadastre vários alarmes com música do celular, volume, vibração, soneca e regra de trabalho ou folga.",
      },
      { property: "og:title", content: "Meus Alarmes — Alarme de Escala" },
      {
        property: "og:description",
        content: "Alarmes que só tocam nos dias certos da sua escala.",
      },
    ],
  }),
  component: AlarmesPage,
});

const DOT: Record<Alarm["appliesTo"], string> = {
  TRABALHO: "bg-work",
  FOLGA: "bg-off",
  TODOS: "bg-muted-foreground",
};

function AlarmesPage() {
  const { alarms, upsertAlarm, removeAlarm } = useAppStore();
  const [editing, setEditing] = useState<Alarm | null>(null);

  const novo = () => setEditing(createAlarm());

  return (
    <AppShell
      title="MEUS ALARMES"
      subtitle={`${alarms.length} alarme(s) cadastrado(s)`}
      action={
        <Button size="sm" onClick={novo}>
          <Plus className="size-4" aria-hidden /> Novo
        </Button>
      }
    >
      <div className="space-y-3">
        {alarms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-semibold">Nenhum alarme ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie seu primeiro alarme de trabalho.
            </p>
            <Button className="mt-4" onClick={novo}>
              <Plus className="size-4" aria-hidden /> Criar alarme
            </Button>
          </div>
        ) : null}

        {alarms.map((alarm) => (
          <article
            key={alarm.id}
            className={`rounded-2xl border border-border bg-card p-4 transition-opacity ${
              alarm.enabled ? "" : "opacity-60"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setEditing(alarm)}
              >
                <p className="tabular text-3xl font-bold tracking-tight">{alarm.time}</p>
                <p className="truncate font-medium">{alarm.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`size-2 rounded-full ${DOT[alarm.appliesTo]}`} aria-hidden />
                  {APPLIES_LABEL[alarm.appliesTo]}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {alarm.soundType === "MUSICA" ? (
                    <>
                      <Music4 className="size-3.5" aria-hidden />
                      <span className="truncate">{alarm.audioName ?? "Música do celular"}</span>
                    </>
                  ) : alarm.soundType === "SILENCIO" ? (
                    <>
                      <BellOff className="size-3.5" aria-hidden /> Sem som
                    </>
                  ) : (
                    <>🔊 Som padrão</>
                  )}
                  <span aria-hidden>·</span> soneca {alarm.snoozeMinutes} min
                </p>
              </button>
              <div className="flex flex-col items-end gap-3">
                <Switch
                  checked={alarm.enabled}
                  aria-label={`Ativar ${alarm.name}`}
                  onCheckedChange={(v) => void upsertAlarm({ ...alarm, enabled: v })}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Excluir ${alarm.name}`}
                  onClick={() => {
                    void removeAlarm(alarm.id);
                    toast.success("Alarme excluído");
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          </article>
        ))}

        <p className="pt-2 text-xs text-muted-foreground">
          Regra: alarmes de <strong>TRABALHO</strong> nunca tocam em dia de folga; alarmes de{" "}
          <strong>FOLGA</strong> tocam apenas nas folgas; <strong>TODOS OS DIAS</strong> ignora a
          escala.
        </p>
      </div>

      {editing ? (
        <AlarmEditor
          alarm={editing}
          open={!!editing}
          onOpenChange={(o) => {
            if (!o) setEditing(null);
          }}
        />
      ) : null}
    </AppShell>
  );
}
