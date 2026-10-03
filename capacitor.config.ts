import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuração do aplicativo Android (APK/AAB).
 * O conteúdo web é empacotado dentro do APK (webDir), então o app funciona offline.
 */
const config: CapacitorConfig = {
  appId: "app.lovable.alarmedeescala",
  appName: "Alarme de Escala",
  webDir: "dist-android",
  android: {
    allowMixedContent: false,
    backgroundColor: "#0b1020",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_alarm",
      iconColor: "#4f46e5",
      sound: "alarme.wav",
    },
  },
};

export default config;
