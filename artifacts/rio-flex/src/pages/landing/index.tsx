import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowRight, ArrowUpRight, Bell, Bot, Car, FileText, Gauge, Map as MapIcon, Route, ShieldCheck, Smartphone, Sparkles, Timer, Wallet } from 'lucide-react';
import { EnergyFlow } from '@/components/viz/EnergyFlow';
import { HeroEV } from '@/components/viz/HeroEV';
import { usePwa } from '@/context/PwaContext';
import { useAuth } from '@/context/AuthContext';

/** Revela o bloco com fade + subida suave quando entra na tela (respeita "reduzir movimento"). */
function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: ElementType }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`lp-reveal ${shown ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</Tag>;
}

function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="13" stroke="url(#lpg)" strokeWidth="1.6" />
      <path d="M17.5 6 L10 17.5 h5.5 L14 26 l8-12 h-5.5 z" fill="url(#lpg)" />
      <defs><linearGradient id="lpg" x1="4" y1="4" x2="28" y2="28"><stop stopColor="#4ae3a5" /><stop offset="1" stopColor="#5cc8ff" /></linearGradient></defs>
    </svg>
  );
}

const TABS = [
  {
    id: 'motorista', label: 'Motorista', icon: Car,
    title: 'Carregue onde e quando vale mais a pena.',
    text: 'O mapa mostra os carregadores do estado com preço e potência lado a lado, traça a rota até o ponto escolhido e recompensa quem carrega nos horários que ajudam a rede.',
    points: [[MapIcon, 'Mapa de calor de preço, potência e densidade'], [Route, 'Rota de carro com tempo e distância reais'], [Wallet, 'Economia em R$ por carregar no horário certo']] as const,
    cta: { label: 'Abrir o mapa', href: '/app/map' },
    stat: { n: '828', l: 'carregadores mapeados no estado do Rio' },
  },
  {
    id: 'frotas', label: 'Frotas', icon: Timer,
    title: 'A frota carrega sozinha, no menor custo.',
    text: 'O smart charging distribui a carga no intervalo que você definir, evita os horários de pico e respeita os limites elétricos e de bateria de cada veículo.',
    points: [[Timer, 'Janelas de recarga que seguem o preço da energia'], [ShieldCheck, 'Limites de potência e segurança da instalação'], [Gauge, 'Medição independente de cada sessão']] as const,
    cta: { label: 'Acessar a plataforma', href: '/login' },
    stat: { n: '42 kW', l: 'potência modulada em uma sessão de exemplo' },
  },
  {
    id: 'gestao', label: 'Gestão', icon: Gauge,
    title: 'Decidir com dado, não com achismo.',
    text: 'Um painel de operação com alertas em três níveis, modo telão para a sala de operação, relatórios prontos e a FlexIA para perguntar — cada número na tela mostra de onde veio.',
    points: [[Bell, 'Central de alertas com regras que você ajusta'], [FileText, 'Relatórios prontos para exportar em CSV ou PDF'], [Bot, 'FlexIA responde e sempre cita a fonte']] as const,
    cta: { label: 'Portal do gestor', href: '/gestor/login' },
    stat: { n: '3', l: 'níveis de alerta, do informativo ao crítico' },
  },
] as const;

const NUMBERS = [
  { v: '37,2', u: 'TWh', l: 'de geração solar e eólica desperdiçada em 2025', s: 'ONS Dados Abertos' },
  { v: '25.429', u: '', l: 'pontos de recarga no Brasil em maio de 2026; 8.601 em corrente contínua', s: 'ABVE/Tupi' },
  { v: '828', u: '', l: 'carregadores mapeados no estado do Rio, em 60 municípios', s: 'Carregados · coleta Cavuca, 22/09/2026' },
];

export default function LandingPage() {
  const { isInstalled, promptInstall } = usePwa();
  const { isAuthenticated, user, loginWithGoogle } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('motorista');
  const active = TABS.find((t) => t.id === tab)!;
  const firstName = user?.name ? user.name.split(' ')[0] : 'Condutor';

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <div className="lp">
      <header className={`lp-nav ${scrolled ? 'solid' : ''}`}>
        <Link href="/" className="lp-logo" aria-label="Rio Flex — início"><Mark /><span>rio<b>flex</b></span></Link>
        <nav aria-label="Principal" className="lp-nav-links">
          <a href="#motorista" onClick={() => setTab('motorista')}>Motoristas</a>
          <a href="#motorista" onClick={() => setTab('frotas')}>Frotas</a>
          <a href="#motorista" onClick={() => setTab('gestao')}>Gestão</a>
          <a href="#tecnologia">Tecnologia</a>
          <a href="#flexia">FlexIA</a>
        </nav>
        <div className="lp-nav-end">
          {!isInstalled && <button type="button" className="lp-icon" onClick={promptInstall} aria-label="Instalar o app" title="Instalar o app"><Smartphone size={16} /></button>}
          <Link href="/gestor/login" className="lp-pill ghost">Portal do gestor</Link>
          <Link href={isAuthenticated ? '/app' : '/login'} className="lp-pill">{isAuthenticated ? `Olá, ${firstName}` : 'Entrar'}</Link>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-glow" aria-hidden="true" />
        <div className="lp-hero-text">
          <span className="lp-eyebrow">Smart charging · medição inteligente · V2X</span>
          <h1>A recarga que <span>devolve para a rede.</span></h1>
          <p>O Rio Flex decide quando carregar o veículo elétrico — entre casa, frota e rede — com segurança, consentimento do dono e o menor custo possível.</p>
          <div className="lp-actions">
            <Link href={isAuthenticated ? '/app' : '/login'} className="lp-btn primary">{isAuthenticated ? 'Abrir o app' : 'Acessar a plataforma'} <ArrowRight size={16} /></Link>
            {isAuthenticated ? (
              <Link href="/app/map" className="lp-btn ghost"><MapIcon size={15} /> Ver carregadores</Link>
            ) : (
              <button type="button" onClick={loginWithGoogle} className="lp-btn ghost">Entrar com Google</button>
            )}
          </div>
        </div>
        <div className="lp-hero-art"><HeroEV /></div>
        <div className="lp-scroll" aria-hidden="true"><span /></div>
      </section>

      <section className="lp-statement" id="tecnologia">
        <Reveal><span className="lp-eyebrow">Como funciona</span></Reveal>
        <Reveal delay={80}><h2>Do carro à rede,<br />em um só ciclo.</h2></Reveal>
        <Reveal delay={160}><p>O veículo carrega e o medidor inteligente mede tudo em tempo real, informando a distribuidora e o orquestrador. O orquestrador conversa com o medidor — em ida e volta — e com a FlexIA, que orienta o consumidor e o gestor a cada decisão.</p></Reveal>
        <Reveal delay={200} className="lp-flow"><EnergyFlow /></Reveal>
      </section>

      <section className="lp-solutions" id="motorista">
        <Reveal><span className="lp-eyebrow">Uma plataforma, três papéis</span></Reveal>
        <Reveal delay={80}><h2>Feito para quem carrega, opera e decide.</h2></Reveal>
        <div className="lp-tabs" role="tablist" aria-label="Soluções">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              <t.icon size={16} strokeWidth={1.6} /> {t.label}
            </button>
          ))}
        </div>
        <div className="lp-panel" key={active.id}>
          <div className="lp-panel-copy">
            <h3>{active.title}</h3>
            <p>{active.text}</p>
            <ul>
              {active.points.map(([Icon, text]) => <li key={text}><Icon size={18} strokeWidth={1.5} />{text}</li>)}
            </ul>
            <Link href={active.cta.href} className="lp-link">{active.cta.label} <ArrowUpRight size={16} /></Link>
          </div>
          <div className="lp-panel-stat">
            <strong>{active.stat.n}</strong>
            <span>{active.stat.l}</span>
            <i aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="lp-v2x">
        <Reveal><span className="lp-eyebrow">V2X</span></Reveal>
        <Reveal delay={80}><h2>Da recarga simples ao suporte à rede.</h2></Reveal>
        <ol>
          {[
            ['V2L', 'Hoje', 'O veículo alimenta a casa em uma falta de energia e reduz os picos de consumo do imóvel.'],
            ['V2H', 'Próximo passo', 'A bateria do carro passa a fazer parte da gestão da casa e da geração solar, sempre com consentimento e limites definidos pelo dono.'],
            ['V2G', 'Evolução', 'Serviço à rede: a frota devolve energia ao sistema elétrico nos momentos em que ele mais precisa.'],
          ].map(([k, w, t], i) => (
            <Reveal key={k} as="li" delay={i * 90}>
              <em>{w}</em><strong>{k}</strong><p>{t}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="lp-numbers">
        <Reveal><span className="lp-eyebrow">O tamanho da oportunidade</span></Reveal>
        <ul>
          {NUMBERS.map((n, i) => (
            <Reveal key={n.v} as="li" delay={i * 90}>
              <strong>{n.v}<small>{n.u}</small></strong>
              <p>{n.l}</p>
              <span>Fonte: {n.s}</span>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="lp-ai" id="flexia">
        <div className="lp-ai-copy">
          <Reveal><span className="lp-eyebrow">FlexIA</span></Reveal>
          <Reveal delay={80}><h2>Pergunte. A resposta chega com a fonte.</h2></Reveal>
          <Reveal delay={160}><p>Um agente de IA que conhece os dados do setor elétrico e da rede de recarga: consulta as tabelas, cita de onde tirou cada número e propõe sinais de preço que só valem depois que um gestor aprova.</p></Reveal>
          <Reveal delay={200}><Link href="/gestor/login" className="lp-link">Ver no portal do gestor <ArrowUpRight size={16} /></Link></Reveal>
        </div>
        <Reveal delay={120} className="lp-chat">
          <div className="lp-chat-head"><Sparkles size={14} /> FlexIA <small>exemplo ilustrativo</small></div>
          <div className="lp-msg user">Qual região está mais pressionada agora e o que devo priorizar?</div>
          <div className="lp-msg ai">
            <p>Vou consultar a carga por região e os sinais ativos…</p>
            <p><b>Sugestão:</b> publicar uma janela amarela nas regiões acima de 85% de carga entre 18h e 21h.</p>
            <small>Toda proposta aguarda aprovação de um gestor antes de ser publicada.</small>
          </div>
        </Reveal>
      </section>

      <section className="lp-cta">
        <Reveal><h2>Comece pelo mapa.</h2></Reveal>
        <Reveal delay={80}><p>828 carregadores no estado do Rio, com preço, potência e rota até a sua porta.</p></Reveal>
        <Reveal delay={140}><Link href={isAuthenticated ? '/app/map' : '/login'} className="lp-btn primary">Abrir o mapa <ArrowRight size={16} /></Link></Reveal>
      </section>

      <footer className="lp-foot">
        <div className="lp-foot-top">
          <Link href="/" className="lp-logo"><Mark /><span>rio<b>flex</b></span></Link>
          <nav aria-label="Rodapé">
            <Link href="/login">Motorista</Link>
            <Link href="/gestor/login">Gestor</Link>
            <Link href="/app/map">Mapa</Link>
          </nav>
        </div>
        <p>Rio Flex · Hélio Energy — projeto da final do Hackathon ONS + UFRJ. Preços de carregadores são informados por comunidade ou operador e não foram confirmados. Fontes: ONS, ABVE/Tupi, Carregados (coleta Cavuca).</p>
      </footer>
    </div>
  );
}
