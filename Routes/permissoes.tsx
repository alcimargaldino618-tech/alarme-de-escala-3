import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, BatteryWarning, Bell, CheckCircle2, Clock, Music } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/app-store";
import {
  getNativeStatus,
  openExactAlarmSettings,
  openNotificationSettings,
  requestNativePermissions,
  type NativeStatus,
  type PermissionState,
} from "@/lib/native";
import { requestNotificationPermission } from "@/lib/audio";

export const Route = createFileRoute("/permissoes")({
  head: () => ({
    meta: [
      { title: "Permissões do aplicativo — Alarme de Escala" },
      {
        name: "description",
        content:
          "Confira notificações, alarmes exatos, música selecionada e economia de bateria para garantir que o alarme toque no horário.",
      },
      { property: "og:title", content: "Permissões do aplicativo — Alarme de Escala" },
      {
        property: "og:description",
        content: "Verifique e libere as permissões necessárias para o alarme funcionar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PermissoesPage,
});

const LABEL: Record<PermissionState, string> = {
  concedida: "Permitido",
  negada: "Bloqueado",
  indefinida: "Não solicitado",
  indisponivel: "Indisponível nesta versão",
};

function Row({
  icon: Icon,
  title,
  description,
  state,
  onFix,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  state: PermissionState;
  onFix?: () => void;
}) {
  const ok = state === "concedida";
  return (
    <div className="space-y-2 px-4 py-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
        <div className="flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <span
          className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${
            ok ? "bg-off-soft text-off-foreground" : "bg-destructive/10 text-destructive"
          }`}
        >
          {ok ? (
            <CheckCircle2 className="size-3" aria-hidden />
          ) : (
            <AlertTriangle className="size-3" aria-hidden />
          )}
          {LABEL[state]}
        </span>
      </div>
      {!ok && onFix ? (
        <Button variant="outline" size="sm" className="w-full" onClick={onFix}>
          CONFIGURAR
        </Button>
      ) : null}
    </div>
  );
}

function PermissoesPage() {
  const { alarms, isNative, nativeScheduled } = useAppStore();
  const [status, setStatus] = useState<NativeStatus | null>(null);
  const [webNotif, setWebNotif] = useState<PermissionState>("indefinida");

  const refreshStatus = useCallback(async () => {
    setStatus(await getNativeStatus());
    if (typeof Notification !== "undefined") {
      setWebNotif(
        Notification.permission === "granted"
          ? "concedida"
          : Notification.permission === "denied"
            ? "negada"
            : "indefinida",
      );
    } else {
      setWebNotif("indisponivel");
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const musicAlarms = alarms.filter((a) => a.soundType === "MUSICA");
  const musicState: PermissionState = !musicAlarms.length
    ? "indefinida"
    : musicAlarms.every((a) => Boolean(a.audioKey))
      ? "concedida"
      : "negada";

  const notifState = isNative ? (status?.notifications ?? "indefinida") : webNotif;

  return (
    <AppShell title="PERMISSÕES DO APLICATIVO" subtitle="Necessárias para o alarme tocar na hora">
      <div className="space-y-4">
        <section className="divide-y divide-border rounded-2xl border border-border bg-card">
          <Row
            icon={Bell}
            title="Notificações"
            description="Permite avisar e mostrar a tela do alarme no horário programado."
            state={notifState}
            onFix={() => {
              void (isNative ? requestNativePermissions() : requestNotificationPermission()).then(
                async () => {
                  await refreshStatus();
                  if (isNative) await openNotificationSettings();
                },
              );
            }}
          />
          <Row
            icon={Clock}
            title="Alarmes exatos"
            description="No Android, autoriza o sistema a disparar o alarme no minuto exato, mesmo com o app fechado."
            state={isNative ? (status?.exactAlarms ?? "indefinida") : "indisponivel"}
            onFix={() => {
              void openExactAlarmSettings().then(() => void refreshStatus());
            }}
          />
          <Row
            icon={Music}
            title="Música selecionada"
            description="A música escolhida fica salva dentro do aplicativo, então continua funcionando mesmo se o arquivo original for movido."
            state={musicState}
          />
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <BatteryWarning className="size-4" aria-hidden /> Economia de bateria
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Para garantir que seus alarmes funcionem corretamente, permita que o aplicativo execute
            os alarmes mesmo com a economia de bateria ativada. No Android:{" "}
            <strong>Configurações → Aplicativos → Alarme de Escala → Bateria → Sem restrições</strong>
            .
          </p>
        </section>

        {isNative ? (
          <p className="text-center text-xs text-muted-foreground">
            {nativeScheduled || status?.scheduledCount || 0} alarmes já agendados no Android.
          </p>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Você está usando a versão web/PWA. Alarmes exatos com o app fechado exigem a versão
            Android (APK).
          </p>
        )}

        <Button
          variant="secondary"
          className="h-12 w-full"
          onClick={() => {
            void refreshStatus();
            toast.success("Permissões verificadas");
          }}
        >
          Verificar novamente
        </Button>
      </div>
    </AppShell>
  );
}
