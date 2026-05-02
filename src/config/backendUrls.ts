/**
 * 后端 API 根地址，通过环境变量配置（Vite：在项目根目录的 `.env` 中设置，参考 `.env.example`）。
 */

type BackendEnvKey = 'VITE_NOTESYS_API_BASE' | 'VITE_RAGDATA_API_BASE';

function requiredBaseUrl(key: BackendEnvKey): string {
  const raw = import.meta.env[key];
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error(
      `Missing or empty ${key}. Copy .env.example to .env and set backend base URLs.`,
    );
  }
  return raw.trim().replace(/\/$/, '');
}

export const NOTESYS_API_BASE = requiredBaseUrl('VITE_NOTESYS_API_BASE');
export const RAGDATA_API_BASE = requiredBaseUrl('VITE_RAGDATA_API_BASE');
