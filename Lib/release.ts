/** Informações da versão Android. Atualize aqui a cada novo APK publicado. */
export interface AndroidRelease {
  version: string;
  releaseDate: string;
  /** Coloque o APK em public/downloads/ e informe o caminho aqui. */
  apkUrl: string | null;
  apkSize: string | null;
  /** AAB para publicação futura na Google Play. */
  aabUrl: string | null;
  notes: string[];
}

export const CURRENT_APP_VERSION = "1.0.0";

export const ANDROID_RELEASE: AndroidRelease = {
  version: CURRENT_APP_VERSION,
  releaseDate: "2026-08-19",
  apkUrl: null,
  apkSize: null,
  aabUrl: null,
  notes: [
    "Alarmes agendados pelo próprio Android (funcionam com o app fechado)",
    "Música do celular como toque, salva dentro do aplicativo",
    "Reagendamento automático após reiniciar o celular",
    "Soneca, vibração e notificações",
    "100% offline — nada é enviado para a internet",
  ],
};
