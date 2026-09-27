/**
 * Cliente HTTP do backend de gestão (flexrioTest / FlexRioApiServer) — a origem que hoje já
 * roda o FlexIA (Bedrock AgentCore) e o portal do gestor de frota. Sessão via cookie httpOnly
 * cross-origin (credentials: 'include'); nunca guarda token no frontend.
 */

const BASE = (import.meta.env.VITE_MANAGER_API_URL ?? '').replace(/\/$/, '') + '/api/v1';

export class ManagerApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'RioFlex',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ManagerApiError(0, 'Não foi possível conectar à API de gestão. Verifique sua conexão.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ManagerApiError(res.status, data?.error?.message ?? `Erro ${res.status}`, data?.error?.code);
  }
  return data as T;
}

export const managerApi = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  del: <T = void>(path: string) => request<T>('DELETE', path),
};

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export type ManagerStreamEvent = { type: string; [k: string]: unknown };

/**
 * POST com resposta em Server-Sent Events (usado pelo chat da FlexIA). EventSource não aceita
 * POST nem cabeçalhos, então lemos o corpo em streaming e separamos os eventos por linha em branco.
 */
export async function managerStreamPost(
  path: string,
  body: unknown,
  onEvent: (e: ManagerStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', 'X-Requested-With': 'RioFlex' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => null);
    throw new ManagerApiError(res.status, data?.error?.message ?? `Erro ${res.status}`, data?.error?.code);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
      if (!data) continue;
      try {
        onEvent(JSON.parse(data));
      } catch {
        /* bloco incompleto */
      }
    }
  }
}
