/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_ASSET_SERVER_URL: string;
  readonly VITE_WS_PORT: string;
  readonly VITE_BUILD_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __gameStore?: {
    getState: () => {
      sceneState: {
        scenes: unknown[];
      };
    };
  };
}
