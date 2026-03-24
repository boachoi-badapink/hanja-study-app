import React from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import StudyPage from './pages/StudyPage.jsx'
import TestPage from './pages/TestPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import { BookOpen, FlaskConical, Settings } from 'lucide-react'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', height: '100dvh' }}>

        {/* 상단 네비 - 모바일 대응 */}
        <nav style={{
          background: '#1a1209',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          height: 52,
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <span style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 17,
            color: '#c8a84b',
            fontWeight: 700,
            marginRight: 'auto',
            letterSpacing: 1,
            whiteSpace: 'nowrap'
          }}>漢字 마스터</span>

          {[
            { to: '/', icon: <BookOpen size={15} />, label: '공부' },
            { to: '/test', icon: <FlaskConical size={15} />, label: '테스트' },
            { to: '/admin', icon: <Settings size={15} />, label: '관리' },
          ].map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '6px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 11,
                fontWeight: 500,
                color: isActive ? '#c8a84b' : '#b5a48a',
                background: isActive ? 'rgba(200,168,75,0.15)' : 'transparent',
                transition: 'all 0.18s',
                minWidth: 52
              })}
            >
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<StudyPage />} />
            <Route path="/test" element={<TestPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
