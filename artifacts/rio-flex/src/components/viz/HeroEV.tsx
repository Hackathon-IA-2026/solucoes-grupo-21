import { useId } from 'react';
import { useReducedMotion } from '@/components/manager/kit';

/**
 * Arte de abertura: um veículo elétrico em traço fino sobre piso quadriculado, com um carregador
 * e o cabo por onde corre a energia. Só linhas e luz (sem preenchimentos infantis): a intenção é
 * o mesmo clima de "produto em estúdio escuro" das páginas de marcas de energia premium.
 */
export function HeroEV({ className = '' }: { className?: string }) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (s: string) => `${uid}-${s}`;

  const body = 'M60 250 C60 232 78 224 110 218 L250 196 C300 150 350 118 430 110 L600 108 C690 108 760 150 812 198 L900 214 C940 222 950 236 950 254 L950 268 C950 274 946 278 940 278 L70 278 C64 278 60 274 60 268 Z';
  const glass = 'M292 198 C338 150 388 128 436 126 L604 124 C676 124 728 158 770 198 Z';

  return (
    <svg className={`lp-ev ${className}`} viewBox="0 0 1200 520" role="img" aria-label="Veículo elétrico carregando">
      <defs>
        <linearGradient id={id('sweep')} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="420" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".18" />
          <stop offset=".5" stopColor="#bff7e0" stopOpacity="1" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".18" />
          {!reduced && <animateTransform attributeName="gradientTransform" type="translate" from="-460 0" to="1000 0" dur="7s" repeatCount="indefinite" />}
        </linearGradient>
        <linearGradient id={id('base')} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".35" /><stop offset=".5" stopColor="#ffffff" stopOpacity=".6" /><stop offset="1" stopColor="#ffffff" stopOpacity=".3" />
        </linearGradient>
        <radialGradient id={id('pool')} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#4ae3a5" stopOpacity=".38" /><stop offset=".6" stopColor="#5cc8ff" stopOpacity=".1" /><stop offset="1" stopColor="#5cc8ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('floor')} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".16" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <filter id={id('glow')} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>

      {/* piso em perspectiva */}
      <g transform="translate(0 0)">
        <ellipse cx="600" cy="440" rx="520" ry="70" fill={`url(#${id('pool')})`} />
        <g stroke={`url(#${id('floor')})`} strokeWidth="1" fill="none">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={`h${i}`} d={`M${60 - i * 30} ${440 + i * i * 2.6 + i * 6} L${1140 + i * 30} ${440 + i * i * 2.6 + i * 6}`} />)}
          {Array.from({ length: 19 }, (_, i) => <path key={`v${i}`} d={`M${600 + (i - 9) * 40} 440 L${600 + (i - 9) * 110} 520`} />)}
        </g>
      </g>

      {/* carregador */}
      <g transform="translate(150 178)" stroke="#fff" strokeOpacity=".6" fill="none" strokeWidth="1.4">
        <rect x="0" y="0" width="34" height="120" rx="12" />
        <rect x="7" y="14" width="20" height="26" rx="4" strokeOpacity=".4" />
        <path d="M17 20 l-5 9 h4 l-1 7 l7 -10 h-4 z" stroke="#4ae3a5" strokeOpacity="1" />
        <path d="M17 66 h0" stroke="#4ae3a5" strokeWidth="4" strokeLinecap="round" className={reduced ? undefined : 'mk-led'} />
        <path d="M-10 122 H44" strokeOpacity=".35" />
      </g>
      <path d="M184 300 C 214 300, 226 292, 240 280 S 252 262 268 256" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.4" />
      <path id={id('c')} d="M184 300 C 214 300, 226 292, 240 280 S 252 262 268 256" fill="none" />

      {/* veículo */}
      <g transform="translate(170 46)">
        <g filter={`url(#${id('glow')})`} opacity=".55">
          <path d={body} fill="none" stroke={`url(#${id('sweep')})`} strokeWidth="3" />
          <path d={glass} fill="none" stroke={`url(#${id('sweep')})`} strokeWidth="2" />
        </g>
        <path d={body} fill="rgba(255,255,255,.015)" stroke={`url(#${id('base')})`} strokeWidth="1.5" strokeLinejoin="round" />
        <path d={body} fill="none" stroke={`url(#${id('sweep')})`} strokeWidth="1.8" strokeLinejoin="round" />
        <path d={glass} fill="rgba(92,200,255,.05)" stroke="#fff" strokeOpacity=".55" strokeWidth="1.3" />
        <path d="M528 126 L528 200" stroke="#fff" strokeOpacity=".3" strokeWidth="1.2" />
        <path d="M150 232 L905 232" stroke="#fff" strokeOpacity=".18" strokeWidth="1" />
        <path d="M812 200 C826 206 848 212 872 214" stroke="#fff" strokeOpacity=".35" fill="none" />
        {[240, 770].map((cx) => (
          <g key={cx}>
            <path d={`M${cx - 62} 278 A62 62 0 0 1 ${cx + 62} 278`} fill="#05070b" stroke="#fff" strokeOpacity=".5" strokeWidth="1.4" />
            <circle cx={cx} cy="278" r="46" fill="#05070b" stroke="#fff" strokeOpacity=".8" strokeWidth="1.6" />
            <circle cx={cx} cy="278" r="30" fill="none" stroke="#fff" strokeOpacity=".4" />
            <circle cx={cx} cy="278" r="8" fill="none" stroke="#4ae3a5" strokeOpacity=".9" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <line key={a} x1={cx + 10 * Math.cos((a * Math.PI) / 180)} y1={278 + 10 * Math.sin((a * Math.PI) / 180)} x2={cx + 30 * Math.cos((a * Math.PI) / 180)} y2={278 + 30 * Math.sin((a * Math.PI) / 180)} stroke="#fff" strokeOpacity=".35" />
            ))}
          </g>
        ))}
        <path d="M918 232 L946 236" stroke="#dff8ff" strokeWidth="3" strokeLinecap="round" />
        <path d="M946 236 L1180 214 L1180 262 Z" fill="#dff8ff" opacity=".045" />
        <path d="M62 236 L86 234" stroke="#ff5b5b" strokeWidth="3" strokeLinecap="round" />
        <circle cx="98" cy="210" r="5" fill="none" stroke="#4ae3a5" strokeWidth="1.4" className={reduced ? undefined : 'mk-led'} />
      </g>

      {/* energia no cabo */}
      {!reduced &&
        [0, 1, 2, 3].map((i) => (
          <circle key={i} r="2.6" fill="#7ff0c6" className="mk-particle">
            <animateMotion dur="2.4s" begin={`${-0.6 * i}s`} repeatCount="indefinite"><mpath href={`#${id('c')}`} /></animateMotion>
          </circle>
        ))}

      {/* leituras discretas */}
      <g className="lp-ev-tag" fill="#8b97a7" fontSize="11">
        <path d="M480 40 V96" stroke="#fff" strokeOpacity=".25" />
        <circle cx="480" cy="40" r="2.5" fill="#4ae3a5" />
        <text x="490" y="44">Potência de carga</text><text x="490" y="60" fill="#f3f6fa" fontSize="20" fontWeight="300">42 kW</text>
        <path d="M980 120 V196" stroke="#fff" strokeOpacity=".25" />
        <circle cx="980" cy="120" r="2.5" fill="#5cc8ff" />
        <text x="990" y="124">Janela de preço</text><text x="990" y="142" fill="#f3f6fa" fontSize="20" fontWeight="300">favorável</text>
      </g>
    </svg>
  );
}
