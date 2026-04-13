import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.softdynamix.laptopflip",
  appName: "LaptopFlip",
  webDir: "out",
  // Set this to your deployed URL when ready (e.g., Vercel, Railway, etc.)
  // Until then, the app will use the static export in /out
  server: {
    // Uncomment and set your deployed URL:
    // url: "https://your-app.vercel.app",
    // cleartext: true,
    androidScheme: "https",
  },
  plugins: {
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#10b981",
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#10b981",
      showSpinner: true,
      spinnerColor: "#ffffff",
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
