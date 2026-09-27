import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, Bell, Bot, FileText, LayoutDashboard, LogOut, Megaphone, Monitor, Scale, Search, Workflow } from 'lucide-react';
import { useManagerAuth } from '@/context/ManagerAuthContext';
import { useManagerAlerts } from '@/hooks/manager-alerts';
import { SearchPalette } from '@/components/manager/SearchPalette';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((p) => /^[A-Za-zÀ-ú]/.test(p))
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

type NavItem = { href: string; label: string; icon: typeof Activity; badge?: 'alerts' };
const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Operação',
    items: [
      { href: '/gestor', label: 'Visão geral', icon: LayoutDashboard },
      { href: '/gestor/alertas', label: 'Alertas', icon: Bell, badge: 'alerts' },
      { href: '/gestor/ciclo', label: 'Ciclo', icon: Workflow },
      { href: '/gestor/rede', label: 'Rede, preço & clima', icon: Activity },
    ],
  },
  {
    section: 'Ação',
    items: [
      { href: '/gestor/sinais', label: 'Sinais de preço', icon: Megaphone },
      { href: '/gestor/flexia', label: 'FlexIA', icon: Bot },
    ],
  },
  {
    section: 'Análise',
    items: [
      { href: '/gestor/relatorios', label: 'Relatórios', icon: FileText },
      { href: '/gestor/regulacao', label: 'Regulação & protocolos', icon: Scale },
    ],
  },
];
const MOBILE = [NAV[0]!.items[0]!, NAV[0]!.items[1]!, NAV[1]!.items[1]!, NAV[2]!.items[0]!];

export function ManagerShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useManagerAuth();
  const { open } = useManagerAlerts();
  const [searching, setSearching] = useState(false);
  const isActive = (href: string) => (href === '/gestor' ? location === '/gestor' : location.startsWith(href));
  const critical = open.filter((a) => a.level === 3).length;

  // Título da aba mostra quantos alertas pedem atenção.
  useEffect(() => {
    document.title = open.length ? `Rio Flex · Gestão (${open.length} alerta${open.length > 1 ? 's' : ''})` : 'Rio Flex · Gestão';
    return () => { document.title = 'Rio Flex · Mobilidade Elétrica Inteligente'; };
  }, [open.length]);

  // Atalhos: Ctrl/Cmd+K e "/" abrem a busca (a barra não dispara dentro de campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearching(true); }
      else if (e.key === '/' && !typing) { e.preventDefault(); setSearching(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const badge = (item: NavItem) =>
    item.badge === 'alerts' && open.length > 0 ? (
      <span className={`mk-nav-badge ${critical ? 'crit' : ''}`} aria-label={`${open.length} alertas abertos`}>{open.length}</span>
    ) : null;

  return (
    <div className="rf-app rf-shell">
      <aside className="rf-sidebar manager">
        <Link href="/gestor" className="rf-logo" style={{ color: '#f4f7f9' }}>
          <span className="rf-logo-mark">RF</span>
          <span>rio flex <span style={{ color: '#b98cff', fontSize: 12 }}>gestão</span></span>
        </Link>
        {NAV.map((group) => (
          <div key={group.section} className="mk-nav-group">
            <div className="rf-nav-section">{group.section}</div>
            <nav className="rf-nav" aria-label={group.section}>
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className={`rf-nav-link ${isActive(item.href) ? 'active' : ''}`} aria-current={isActive(item.href) ? 'page' : undefined}>
                  <item.icon size={18} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {badge(item)}
                </Link>
              ))}
            </nav>
          </div>
        ))}
        <div style={{ marginTop: 'auto' }} className="rf-asset-note">
          <div className="rf-eyebrow">Sessão</div>
          <p style={{ margin: '6px 0 10px', fontSize: 12 }}>{user?.name}<br /><span className="rf-tiny">{user?.email}</span></p>
          <button type="button" className="rf-btn secondary small full" onClick={async () => { await logout(); setLocation('/gestor/login'); }}>
            <LogOut size={13} /> Sair
          </button>
        </div>
      </aside>

      <main className="rf-main">
        <header className="rf-topbar mk-topbar">
          <button type="button" className="mk-search-btn" onClick={() => setSearching(true)} aria-label="Abrir busca">
            <Search size={15} />
            <span>Buscar tela, região ou perguntar…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="rf-topbar-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/gestor/telao" className="mk-icon-btn" aria-label="Modo telão" title="Modo telão"><Monitor size={16} /></Link>
            <Link href="/gestor/alertas" className={`mk-icon-btn ${critical ? 'crit' : ''}`} aria-label={`Alertas: ${open.length} abertos`} title="Alertas">
              <Bell size={16} />
              {open.length > 0 && <b>{open.length}</b>}
            </Link>
            <span className="rf-avatar" style={{ background: '#b98cff' }}>{user ? initials(user.name) : '?'}</span>
          </div>
        </header>
        <div className="rf-content rf-enter">{children}</div>
      </main>

      <nav className="rf-mobile-nav">
        {MOBILE.map((item) => (
          <Link key={item.href} href={item.href} className={isActive(item.href) ? 'active' : ''}>
            <item.icon size={20} />
            <span>{item.label.split(' ')[0]}</span>
          </Link>
        ))}
      </nav>
      <SearchPalette open={searching} onClose={() => setSearching(false)} />
    </div>
  );
}
