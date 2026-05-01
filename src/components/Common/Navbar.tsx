'use client'
import { useLang } from '@/lib/i18n'
import Link from 'next/link'

export default function Navbar() {
  const { lang, setLang, t } = useLang()

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(2,12,16,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(0,245,255,0.10)',
      padding: '0 28px',
      height: '52px',
      display: 'flex',
      alignItems: 'center',
      boxShadow: '0 1px 32px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(0,245,255,0.05)',
    }}>
      <div style={{
        maxWidth: '1100px',
        width: '100%',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      }}>
        {/* Logo */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          textDecoration: 'none',
        }}>
          <span style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '18px',
            fontWeight: 900,
            color: '#00F5FF',
            textShadow: '0 0 16px rgba(0,245,255,0.5)',
          }}>H</span>
          <span style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '18px',
            fontWeight: 700,
            color: '#E8F8FF',
          }}>ydroStack</span>
        </Link>

        {/* Pulse indicator */}
        <span style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: '#00FF88',
          boxShadow: '0 0 6px #00FF88',
          flexShrink: 0,
        }} className="blink" title="Sistema activo" />

        {/* Navigation links */}
        <div style={{
          display: 'flex',
          gap: '28px',
          marginLeft: 'auto',
        }} className="hide-mobile">
          <Link href="/calculators" style={{
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#00F5FF',
            fontFamily: "'IBM Plex Mono', monospace",
            transition: 'color 0.2s',
            textDecoration: 'none',
            textShadow: '0 0 10px rgba(0,245,255,0.4)',
          }}>
            {t.nav.calculators}
          </Link>
          <Link href="/chat" style={{
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#4A7A8A',
            fontFamily: "'IBM Plex Mono', monospace",
            transition: 'color 0.2s',
            textDecoration: 'none',
          }} className="nav-link">
            {t.nav.assistant}
          </Link>
          <a href="#about" style={{
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#4A7A8A',
            fontFamily: "'IBM Plex Mono', monospace",
            transition: 'color 0.2s',
            textDecoration: 'none',
          }} className="nav-link">
            {t.nav.about}
          </a>
        </div>

        {/* Language toggle */}
        <button onClick={() => setLang(lang === 'es' ? 'en' : 'es')} style={{
          background: 'transparent',
          border: '1px solid rgba(0,245,255,0.18)',
          borderRadius: '3px',
          padding: '4px 12px',
          color: '#4A7A8A',
          fontSize: '9px',
          fontFamily: "'IBM Plex Mono', monospace",
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }} className="btn-ghost hide-mobile">
          {t.nav.lang}
        </button>
      </div>
    </nav>
  )
}
