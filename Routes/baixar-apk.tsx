import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Download, Smartphone, Terminal } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ANDROID_RELEASE } from "@/lib/release";

export const Route = createFileRoute("/baixar-apk")({
  head: () => ({
    meta: [
      { title: "Baixar aplicativo Android (APK) — Alarme de Escala" },
      {
        name: "description",
        content:
          "Baixe o APK do Alarme de Escala e instale direto no Android: alarmes nativos confiáveis, música do celular e uso offline.",
      },
      { property: "og:title", content: "Baixar aplicativo Android (APK) — Alarme de Escala" },
      {
        property: "og:description",
        content: "Versão Android instalável com alarme nativo mesmo com o app fechado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BaixarApkPage,
});

const BUILD_STEPS = [
  "npm install",
  "npm run android:build   # gera a pasta web (dist-android)",
  "npx cap add android     # apenas na primeira vez",
  "npx cap sync android",
  "cd android && ./gradlew assembleRelease   # gera o APK",
  "./gradlew bundleRelease                   # gera o AAB (Google Play)",
];

function BaixarApkPage() {
  const release = ANDROID_RELEASE;

  return (
    <AppShell title="BAIXAR APLICATIVO" subtitle="Versão Android instalável (APK)">
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-5 text-center">
          <Smartphone className="mx-auto size-8 text-primary" aria-hidden />
          <h2 className="mt-2 text-base font-bold">ALARME DE ESCALA — ANDROID</h2>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl bg-surface px-2 py-3">
              <dt className="text-muted-foreground">Versão</dt>
              <dd className="font-semibold">{release.version}</dd>
            </div>
            <div className="rounded-xl bg-surface px-2 py-3">
              <dt className="text-muted-foreground">Formato</dt>
              <dd className="font-semibold">APK</dd>
            </div>
            <div className="rounded-xl bg-surface px-2 py-3">
              <dt className="text-muted-foreground">Tamanho</dt>
              <dd className="font-semibold">{release.apkSize ?? "—"}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            Data da versão: {new Date(release.releaseDate).toLocaleDateString("pt-BR")}
          </p>

          {release.apkUrl ? (
            <Button asChild className="mt-4 h-12 w-full text-base font-bold">
              <a href={release.apkUrl} download>
                <Download className="size-5" aria-hidden /> BAIXAR APK
              </a>
            </Button>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border p-3 text-xs leading-relaxed text-muted-foreground">
              O arquivo APK ainda não foi publicado. O projeto já está preparado para gerá-lo: basta
              rodar a compilação Android uma vez (passos abaixo) e colocar o arquivo em{" "}
              <code>public/downloads/</code>, informando o caminho em <code>src/lib/release.ts</code>
              . O botão de download aparece automaticamente.
            </div>
          )}
          {release.aabUrl ? (
            <Button asChild variant="outline" className="mt-2 h-11 w-full">
              <a href={release.aabUrl} download>
                Baixar AAB (Google Play)
              </a>
            </Button>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">O que a versão Android faz melhor</h3>
          <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
            {release.notes.map((n) => (
              <li key={n} className="flex gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-off-foreground" aria-hidden />
                {n}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Terminal className="size-4" aria-hidden /> Como gerar o APK / AAB
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            A compilação Android precisa do Android Studio (SDK + Gradle) em um computador. Baixe o
            código do projeto e rode:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-surface p-3 text-[11px] leading-relaxed">
            {BUILD_STEPS.join("\n")}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            O APK final fica em <code>android/app/build/outputs/apk/release/</code>. Para instalar
            manualmente no celular, ative “Instalar apps de fontes desconhecidas”.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">Atualizações</p>
          <p className="mt-1">
            Versão atual: <strong>{release.version}</strong>. Ao instalar uma nova versão por cima,
            seus dados são mantidos: escala, alarmes, músicas, exceções, configurações e histórico.
            Ainda assim, vale exportar um backup em{" "}
            <Link to="/configuracoes" className="underline">
              Configurações
            </Link>
            .
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Button asChild variant="outline" className="h-12">
            <Link to="/permissoes">Permissões</Link>
          </Button>
          <Button asChild variant="outline" className="h-12">
            <Link to="/instalar">Instalar PWA</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
