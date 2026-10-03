# Alarme de Escala — versão Android (APK / AAB)

O projeto tem duas versões:

- **Web / PWA** — acesso pelo navegador e instalação na tela inicial.
- **Android nativo (APK)** — versão recomendada: o alarme é agendado pelo próprio
  Android, funciona com o app fechado, tela bloqueada e sem internet.

## Pré-requisitos (no seu computador)

- Node.js 20+
- Android Studio (Android SDK + plataforma 35 + Gradle)
- JDK 21

## Gerar o APK

```bash
npm install
npm run android:build      # build web estático em dist-android/
npx cap add android        # somente na primeira vez
npm run android:sync       # copia o web para o projeto Android
npm run android:apk        # APK de release
npm run android:aab        # AAB para a Google Play
```

Saídas:

- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

Para instalar no celular: copie o APK, abra no Android e autorize
“Instalar apps de fontes desconhecidas”. Publique o APK em `public/downloads/`
e informe o caminho em `src/lib/release.ts` para liberar o botão **BAIXAR APK**.

## Alarmes nativos

`src/lib/native.ts` agenda as próximas ocorrências (até 30 dias / 60 alarmes)
com `@capacitor/local-notifications`, usando `allowWhileIdle` + alarmes exatos,
que por baixo usam o `AlarmManager` do Android. Não usamos `setTimeout`,
`setInterval` nem conexão de rede para disparar.

O reagendamento acontece:

- quando a escala, os alarmes ou as exceções mudam;
- quando o app volta ao primeiro plano (`App.resume`), o que cobre o caso de
  **reinicialização do celular** — ao abrir o app os próximos dias são
  recalculados e reagendados;
- após cada disparo.

### Permissões necessárias em `android/app/src/main/AndroidManifest.xml`

Depois de `npx cap add android`, confirme que existem:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
```

Nada além disso é solicitado. Não tentamos burlar as políticas de bateria do
Android: a tela **Permissões do aplicativo** orienta o usuário a liberar
notificações, alarmes exatos e a remover restrições de bateria.

## Música do celular

O usuário escolhe o arquivo com o seletor nativo do Android (input de arquivo do
WebView). O conteúdo é **copiado para dentro do app** (IndexedDB, via
`src/lib/db.ts`), então o alarme continua funcionando mesmo se o arquivo original
for movido, renomeado ou excluído.

## Backup

`Configurações → Exportar / Importar` gera um JSON com escala, data de
referência, alarmes, exceções e preferências. As músicas ficam fora do backup de
propósito, porque o arquivo de áudio pode não existir no outro aparelho — depois
de importar, basta reescolher a música.
