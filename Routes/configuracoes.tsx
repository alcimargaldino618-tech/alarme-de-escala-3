import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import {
  AlarmClock,
  BatteryWarning,
  CalendarDays,
  Download,
  History,
  ShieldCheck,
  Smartphone,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppStore } from "@/lib/app-store";
import { exportBackup, importBackup, type BackupPayload } from "@/lib/db";
import { requestNotificationPermission, showNotification } from "@/lib/audio";
import { createAlarm } from "@/lib/alarms";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Alarme de Escala" },
      {
        name: "description",
        content:
          "Tema, notificações, vibração, backup das configurações e informações sobre funcionamento em segundo plano.",
      },
      { property: "og:title", content: "Configurações — Alarme de Escala" },
      {
        property: "og:description",
        content: "Ajuste sons, notificações, tema e faça backup dos seus alarmes.",
      },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { settings, updateSettings, alarms, triggerAlarm, reset, refresh } = useAppStore();
  const importRef = useRef<HTMLInputElement>(null);

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const perm = await requestNotificationPermission();
      if (perm !== "granted") {
        toast.error("Permissão de notificação negada", {
          description: "Autorize as notificações nas configurações do navegador.",
        });
        return;
      }
    }
    await updateSettings({ notificationsEnabled: value });
  };

  const doExport = async () => {
    const payload = await exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alarme-de-escala-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Configurações exportadas");
  };

  const doImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text()) as BackupPayload;
      await importBackup(payload);
      await refresh();
      toast.success("Configurações importadas");
    } catch {
      toast.error("Arquivo inválido");
    }
  };

  return (
    <AppShell title="CONFIGURAÇÕES" subtitle="Tudo salvo apenas no seu aparelho">
      <div className="space-y-4">
        <section className="divide-y divide-border rounded-2xl border border-border bg-card">
          {[
            { to: "/escala", label: "Minha escala", icon: CalendarDays },
            { to: "/alarmes", label: "Alarmes, sons, música e volume", icon: AlarmClock },
            { to: "/historico", label: "Histórico", icon: History },
            { to: "/permissoes", label: "Permissões do aplicativo", icon: ShieldCheck },
            { to: "/baixar-apk", label: "Baixar aplicativo Android (APK)", icon: Download },
            { to: "/instalar", label: "Como instalar no celular", icon: Smartphone },
          ].map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 px-4 py-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              {label}
            </Link>
          ))}
        </section>

        <section className="space-y-1 rounded-2xl border border-border bg-card p-4">
          <Label className="mb-2 block">Tema</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["auto", "claro", "escuro"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => void updateSettings({ theme: t })}
                className={`rounded-xl border py-3 text-sm font-semibold capitalize transition-colors ${
                  settings.theme === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {t === "auto" ? "Automático" : t}
              </button>
            ))}
          </div>
        </section>

        <section className="divide-y divide-border rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-4">
            <Label htmlFor="notif">Notificações</Label>
            <Switch
              id="notif"
              checked={settings.notificationsEnabled}
              onCheckedChange={(v) => void toggleNotifications(v)}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <Label htmlFor="vib">Vibração</Label>
            <Switch
              id="vib"
              checked={settings.vibrationEnabled}
              onCheckedChange={(v) => void updateSettings({ vibrationEnabled: v })}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <Label htmlFor="som">Som</Label>
            <Switch
              id="som"
              checked={settings.soundEnabled}
              onCheckedChange={(v) => void updateSettings({ soundEnabled: v })}
            />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            className="h-12"
            onClick={() => {
              if (!settings.notificationsEnabled) {
                toast.error("Ative as notificações primeiro");
                return;
              }
              showNotification("🔔 Alarme de trabalho", "Está na hora de acordar.");
              toast.success("Notificação de teste enviada");
            }}
          >
            Testar notificação
          </Button>
          <Button
            variant="secondary"
            className="h-12"
            onClick={() => {
              const alarm = alarms[0] ?? createAlarm({ name: "Teste", time: "00:00" });
              void triggerAlarm(alarm, new Date());
            }}
          >
            Testar alarme
          </Button>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12" onClick={() => void doExport()}>
            <Download className="size-4" aria-hidden /> Exportar
          </Button>
          <Button variant="outline" className="h-12" onClick={() => importRef.current?.click()}>
            <Upload className="size-4" aria-hidden /> Importar
          </Button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => void doImport(e.target.files?.[0])}
          />
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <BatteryWarning className="size-4" aria-hidden /> Funcionamento em segundo plano
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Toda a lógica da escala funciona offline. Porém, um app web (PWA) no Android tem
            limitações reais: com o aplicativo <strong>totalmente encerrado</strong> ou com a
            economia de bateria ativa, o sistema pode impedir que sua música personalizada toque no
            horário exato. Para maior confiabilidade: instale o app na tela inicial, permita
            notificações, desative a otimização de bateria para o navegador/app e mantenha o app
            aberto em segundo plano durante a noite.
          </p>
        </section>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="h-12 w-full">
              Redefinir aplicativo
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Redefinir tudo?</AlertDialogTitle>
              <AlertDialogDescription>
                Isso apaga sua escala, alarmes, músicas salvas, exceções e histórico deste aparelho.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  void reset();
                  toast.success("Aplicativo redefinido");
                }}
              >
                Redefinir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
