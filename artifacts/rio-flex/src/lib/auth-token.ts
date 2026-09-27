// Lê o accessToken persistido pelo AuthContext (mesma chave de storage), para
// uso fora da árvore de componentes React — ex: helpers de fetch em src/api.
// Retorna null no Modo Demo (nunca gera token real) ou sem sessão ativa.
const STORAGE_KEY = 'rioflex_auth_session';

export function getStoredAccessToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.accessToken === 'string' ? parsed.accessToken : null;
  } catch {
    return null;
  }
}

export function authHeaders(): Record<string, string> {
  const token = getStoredAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
