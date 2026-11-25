import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mygdd.app',
  appName: 'My GDD',
  webDir: 'www',
  plugins: {
    // Las peticiones a la API salen por la parte nativa de Android: la web va dentro de la app
    // (https://localhost) y la API está en Render, así no hace falta CORS en el servidor.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
