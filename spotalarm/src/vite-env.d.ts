/// <reference types="vite/client" />

// Typed environment variables (only VITE_-prefixed ones reach the browser).
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
