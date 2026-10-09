interface ImportMetaEnv {
  readonly MXRAVEN_HOST?: string;
  readonly MXRAVEN_PORT?: string;
  readonly MXRAVEN_USERNAME?: string;
  readonly MXRAVEN_SECRET?: string;
  readonly MXRAVEN_WEBHOOK_SECRET?: string;
  readonly MXRAVEN_MAIL_FROM?: string;
  readonly MXRAVEN_CONTACT_TO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
