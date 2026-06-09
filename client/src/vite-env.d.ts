/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TEMPLATE_STORE_BASE_URL?: string;
  readonly VITE_TEMPLATE_STORE_ALLOWED_HOSTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
