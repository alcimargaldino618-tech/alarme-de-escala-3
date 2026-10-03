import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/instalar")({
  head: () => ({
    meta: [
      { title: "Como instalar no celular — Alarme de Escala" },
      {
        name: "description",
        content:
          "Passo a passo para instalar o Alarme de Escala na tela inicial do Android e liberar as permissões.",
      },
      { property: "og:title", content: "Como instalar no celular — Alarme de Escala" },
      {
        property: "og:description",
        content: "Instale o app na tela inicial e configure as permissões do Android.",
      },
    ],
  }),
  component: InstalarPage,
});

const PASSOS = [
  "Abra o aplicativo no navegador (Chrome no Android).",
  'Toque no menu do navegador e escolha "Adicionar à tela inicial".',
  "Confirme a instalação do aplicativo.",
  "Abra o app pelo ícone criado e permita as notificações.",
  "Nas configurações do Android, desative a otimização de bateria para o app/navegador.",
  "Configure sua escala (tipo, data de referência e situação).",
  "Cadastre seus alarmes e escolha a música do celular.",
];

function InstalarPage() {
  return (
    <AppShell title="COMO INSTALAR NO CELULAR" subtitle="Funciona offline depois de configurado">
      <ol className="space-y-3">
        {PASSOS.map((passo, i) => (
          <li
            key={passo}
            className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {i + 1}
            </span>
            <p className="text-sm leading-relaxed">{passo}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 rounded-2xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
        Importante: aplicativos web têm limites no Android. Se o app for encerrado pelo sistema ou a
        economia de bateria estiver agressiva, a música personalizada pode não tocar exatamente no
        horário. Manter o app instalado, com notificações liberadas e sem otimização de bateria é a
        configuração mais confiável.
      </p>
    </AppShell>
  );
}
