// src/pages/StudyPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useHanjaList, getProgress, setMemorized, getCategories } from '../hooks/useHanja.js'
import { Eye, EyeOff, ChevronLeft, ChevronRight, LayoutGrid, List, Check, X } from 'lucide-react'

const tab = (active) => ({
  padding: '6px 12px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 500,
  cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap',
  background: active ? 'var(--ink)' : 'var(--parchment-2)',
  color: active ? 'white' : 'var(--ink-3)'
})

const iconBtn = (active) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 34, height: 34, borderRadius: 8, border: 'none', cursor: 'pointer', flexShrink: 0,
  background: active ? 'var(--ink)' : 'var(--parchment-2)',
  color: active ? 'white' : 'var(--ink-3)',
  transition: 'all 0.18s'
})

export default function StudyPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState('card')
  const [showMeaning, setShowMeaning] = useState(true)
  const [autoShowMeaning, setAutoShowMeaning] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState([])
  const [progress, setProgress] = useState({})
  const [cardIndex, setCardIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const { list, loading } = useHanjaList()

  useEffect(() => {
    getCategories().then(setCategories)
    getProgress().then(setProgress)
  }, [])

  const filtered = list.filter(h => {
    const matchCat = !categoryFilter || (h.category || '').trim() === categoryFilter.trim()
    if (!matchCat) return false
    if (activeTab === 'memorized') return progress[h.id]?.memorized
    if (activeTab === 'notMemorized') return !progress[h.id]?.memorized
    return true
  })

  const toggleMemorized = useCallback(async (hanjaId, current) => {
    await setMemorized(hanjaId, !current)
    setProgress(p => ({ ...p, [hanjaId]: { ...(p[hanjaId] || {}), memorized: !current } }))
  }, [])

  const goCard = (dir) => {
    setCardIndex(i => Math.max(0, Math.min(filtered.length - 1, i + dir)))
    setRevealed(false)
  }

  const stats = {
    total: list.length,
    memorized: list.filter(h => progress[h.id]?.memorized).length
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div style={{ textAlign:'center', color:'var(--ink-3)' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>漢</div>
        <div>불러오는 중...</div>
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--parchment)', overflow:'hidden' }}>

      {/* 툴바 줄 1: 탭 */}
      <div style={{ display:'flex', gap:6, padding:'10px 12px 0', background:'white', overflowX:'auto', flexShrink:0 }}>
        {[
          { key:'all', label:`전체 (${stats.total})` },
          { key:'memorized', label:`외운 (${stats.memorized})` },
          { key:'notMemorized', label:`못외운 (${stats.total - stats.memorized})` },
        ].map(({ key, label }) => (
          <button key={key} style={tab(activeTab===key)}
            onClick={() => { setActiveTab(key); setCardIndex(0); setRevealed(false) }}>
            {label}
          </button>
        ))}
      </div>

      {/* 툴바 줄 2: 옵션 */}
      <div style={{
        display:'flex', alignItems:'center', gap:8, padding:'8px 12px 10px',
        background:'white', borderBottom:'1px solid var(--parchment-3)', flexShrink:0,
        overflowX:'auto'
      }}>
        {/* 카테고리 */}
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          style={{ fontSize:12, padding:'5px 8px', borderRadius:8, flexShrink:0 }}>
          <option value="">전체 분류</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div style={{ flex:1 }}/>

        {/* 카드 모드: 뜻+음 on/off */}
        {viewMode === 'card' && (
          <button
            onClick={() => { setAutoShowMeaning(v => !v); setRevealed(false) }}
            style={{
              display:'flex', alignItems:'center', gap:5,
              padding:'5px 10px', borderRadius:8, border:'none', cursor:'pointer',
              fontSize:12, fontWeight:600, flexShrink:0,
              background: autoShowMeaning ? 'var(--ink)' : 'var(--parchment-2)',
              color: autoShowMeaning ? 'white' : 'var(--ink-3)'
            }}>
            {autoShowMeaning ? <Eye size={14}/> : <EyeOff size={14}/>}
            뜻+음 {autoShowMeaning ? 'ON' : 'OFF'}
          </button>
        )}

        {/* 리스트 모드: 전체 뜻+음 토글 */}
        {viewMode === 'list' && (
          <button style={iconBtn(showMeaning)} onClick={() => setShowMeaning(v=>!v)}>
            {showMeaning ? <Eye size={15}/> : <EyeOff size={15}/>}
          </button>
        )}

        {/* 뷰 모드 전환 */}
        <button style={iconBtn(viewMode==='card')} onClick={() => setViewMode('card')}>
          <LayoutGrid size={15}/>
        </button>
        <button style={iconBtn(viewMode==='list')} onClick={() => setViewMode('list')}>
          <List size={15}/>
        </button>
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex:1, overflow:'auto', padding: viewMode==='card' ? '16px 12px' : '16px 12px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', color:'var(--ink-3)', paddingTop:80 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🈳</div>
            <div>표시할 한자가 없습니다</div>
          </div>
        ) : viewMode === 'card' ? (
          <CardView
            hanja={filtered[cardIndex]}
            index={cardIndex}
            total={filtered.length}
            progress={progress}
            onToggleMemorized={toggleMemorized}
            onPrev={() => goCard(-1)}
            onNext={() => goCard(1)}
            autoShowMeaning={autoShowMeaning}
            revealed={revealed}
            setRevealed={setRevealed}
          />
        ) : (
          <ListView
            list={filtered}
            progress={progress}
            onToggleMemorized={toggleMemorized}
            showMeaning={showMeaning}
          />
        )}
      </div>
    </div>
  )
}

// ── 급수 뱃지 색상 ─────────────────────────────────────────────
function gradeColor(cat) {
  if (!cat) return { bg:"var(--gold-light)", color:"var(--gold)" }
  if (cat.includes("1급")) return { bg:"#fff0f0", color:"#c0392b" }
  if (cat.includes("2급")) return { bg:"#fff4e6", color:"#c8622a" }
  if (cat.includes("3급")) return { bg:"#fffbe6", color:"#c8a84b" }
  if (cat.includes("4급")) return { bg:"#f0fff4", color:"#2d6a4f" }
  if (cat.includes("5급")) return { bg:"#e8f4fd", color:"#1a6a9a" }
  if (cat.includes("6급")) return { bg:"#f0ecff", color:"#6c5ce7" }
  if (cat.includes("7급")) return { bg:"#fce8f3", color:"#a0522d" }
  if (cat.includes("8급")) return { bg:"#e8f8f8", color:"#2c8c7a" }
  return { bg:"var(--gold-light)", color:"var(--gold)" }
}

// ── 카드 뷰 ────────────────────────────────────────────────────
function CardView({ hanja, index, total, progress, onToggleMemorized, onPrev, onNext, autoShowMeaning, revealed, setRevealed }) {
  if (!hanja) return null
  const memorized = progress[hanja.id]?.memorized
  const showContent = autoShowMeaning || revealed
  const gc = gradeColor(hanja.category)

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, maxWidth:500, margin:'0 auto' }}>
      {/* 진행 표시 */}
      <div style={{ color:'var(--ink-3)', fontSize:13 }}>{index+1} / {total}</div>

      {/* 카드 */}
      <div
        onClick={() => { if (!autoShowMeaning) setRevealed(v => !v) }}
        style={{
          width:'100%',
          background:'white', borderRadius:20,
          boxShadow: memorized ? '0 4px 24px rgba(45,106,79,0.18)' : 'var(--shadow-lg)',
          border: memorized ? '2px solid var(--green)' : '2px solid var(--parchment-3)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          cursor: autoShowMeaning ? 'default' : 'pointer',
          userSelect:'none', transition:'all 0.3s',
          padding: '28px 24px 32px',
          position:'relative',
          minHeight: 220
        }}
      >
        {/* 번호 & 카테고리 */}
        <div style={{ position:'absolute', top:14, left:16, display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ fontSize:11, color:'var(--ink-3)', fontWeight:500 }}>#{hanja.id}</span>
          {hanja.category && (
            <span style={{ fontSize:10, background:gc.bg, color:gc.color, padding:'2px 7px', borderRadius:20, fontWeight:600 }}>
              {hanja.category}
            </span>
          )}
        </div>

        {/* 외움 뱃지 */}
        {memorized && (
          <div style={{ position:'absolute', top:14, right:14 }}>
            <span style={{ fontSize:10, background:'var(--green-light)', color:'var(--green)', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>
              ✓ 외움
            </span>
          </div>
        )}

        {/* 한자 */}
        <div className="hanja-char"
          style={{ fontSize: 'clamp(72px, 20vw, 100px)', lineHeight:1, color:'var(--ink)', marginBottom: showContent ? 16 : 0, transition:'margin 0.2s' }}>
          {hanja.char}
        </div>

        {/* 뜻+음 */}
        {showContent ? (
          <div style={{ textAlign:'center', animation:'fadeIn 0.2s ease' }}>
            <div style={{ fontSize:'clamp(20px, 5vw, 26px)', fontWeight:700, color:'var(--ink)', marginBottom:4 }}>
              {hanja.meaning}
            </div>
            <div style={{ fontSize:'clamp(16px, 4vw, 20px)', color:'var(--ink-3)' }}>{hanja.reading}</div>
          </div>
        ) : (
          <div style={{
            fontSize:12, color:'var(--stone)', marginTop:12,
            background:'var(--parchment-2)', padding:'5px 14px', borderRadius:20
          }}>
            터치하여 뜻+음 보기
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div style={{ display:'flex', gap:12, alignItems:'center', width:'100%', justifyContent:'center' }}>
        <button onClick={onPrev} disabled={index===0}
          style={{ ...navBtn, opacity: index===0 ? 0.3 : 1, flexShrink:0 }}>
          <ChevronLeft size={20}/>
        </button>

        <button
          onClick={() => onToggleMemorized(hanja.id, memorized)}
          style={{
            display:'flex', alignItems:'center', gap:6,
            padding:'10px 0', borderRadius:12, fontWeight:600, fontSize:14,
            flex:1, maxWidth:200, justifyContent:'center',
            background: memorized ? 'var(--green)' : 'var(--parchment-2)',
            color: memorized ? 'white' : 'var(--ink-2)',
            boxShadow: memorized ? '0 2px 12px rgba(45,106,79,0.25)' : 'none'
          }}>
          {memorized ? <><Check size={15}/> 외웠어요</> : <><X size={15}/> 아직 몰라요</>}
        </button>

        <button onClick={onNext} disabled={index===total-1}
          style={{ ...navBtn, opacity: index===total-1 ? 0.3 : 1, flexShrink:0 }}>
          <ChevronRight size={20}/>
        </button>
      </div>
    </div>
  )
}

const navBtn = {
  display:'flex', alignItems:'center', justifyContent:'center',
  width:44, height:44, borderRadius:12,
  background:'white', border:'1.5px solid var(--parchment-3)',
  color:'var(--ink-2)', cursor:'pointer'
}

// ── 리스트 뷰 ─────────────────────────────────────────────────
function ListView({ list, progress, onToggleMemorized, showMeaning }) {
  const [page, setPage] = useState(0)
  const [revealedItems, setRevealedItems] = useState(new Set())
  const perPage = 10
  const totalPages = Math.ceil(list.length / perPage)
  const pageItems = list.slice(page * perPage, (page+1) * perPage)

  const toggleReveal = (id) => {
    setRevealedItems(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const showItem = (id) => showMeaning || revealedItems.has(id)

  return (
    <div style={{ maxWidth:700, margin:'0 auto' }}>
      {/* 페이지 컨트롤 */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:12, color:'var(--ink-3)' }}>
          {page*perPage+1}–{Math.min((page+1)*perPage, list.length)} / {list.length}개
        </span>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <button onClick={() => setPage(p=>Math.max(0,p-1))} disabled={page===0}
            style={{ ...navBtn, width:32, height:32, opacity: page===0?0.3:1 }}>
            <ChevronLeft size={14}/>
          </button>
          <span style={{ fontSize:12, color:'var(--ink-3)', minWidth:50, textAlign:'center' }}>
            {page+1} / {totalPages}
          </span>
          <button onClick={() => setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1}
            style={{ ...navBtn, width:32, height:32, opacity: page===totalPages-1?0.3:1 }}>
            <ChevronRight size={14}/>
          </button>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {pageItems.map((hanja, i) => {
          const memorized = progress[hanja.id]?.memorized
          const revealed = showItem(hanja.id)
          return (
            <div key={hanja.docId}
              style={{
                display:'flex', alignItems:'center', gap:10,
                background:'white', borderRadius:12, padding:'10px 12px',
                border: memorized ? '1.5px solid var(--green)' : '1.5px solid var(--parchment-3)',
                boxShadow: 'var(--shadow)'
              }}>
              <span style={{ fontSize:10, color:'var(--stone)', minWidth:28, flexShrink:0 }}>#{hanja.id}</span>
              <span className="hanja-char" style={{ fontSize:30, color:'var(--ink)', minWidth:40, textAlign:'center', flexShrink:0 }}>
                {hanja.char}
              </span>
              <div style={{ flex:1, minWidth:0 }}>
                {revealed ? (
                  <span style={{ fontWeight:600, color:'var(--ink)', fontSize:13 }}>
                    {hanja.meaning} <span style={{ color:'var(--ink-3)', fontWeight:400 }}>{hanja.reading}</span>
                  </span>
                ) : (
                  <button onClick={() => toggleReveal(hanja.id)}
                    style={{ fontSize:11, color:'var(--stone)', background:'var(--parchment-2)', border:'none', borderRadius:8, padding:'3px 10px', cursor:'pointer' }}>
                    뜻+음 보기
                  </button>
                )}
              </div>
              <button onClick={() => onToggleMemorized(hanja.id, memorized)}
                style={{
                  display:'flex', alignItems:'center', gap:3, flexShrink:0,
                  padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600,
                  background: memorized ? 'var(--green)' : 'var(--parchment-2)',
                  color: memorized ? 'white' : 'var(--ink-3)'
                }}>
                {memorized ? <><Check size={11}/>외움</> : '미암기'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
