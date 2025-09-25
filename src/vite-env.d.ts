/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ASSET_SERVER_URL: string
  readonly VITE_WS_PORT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
