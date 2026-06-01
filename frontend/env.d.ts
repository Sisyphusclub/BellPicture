/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_BRAND_ASSET_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
