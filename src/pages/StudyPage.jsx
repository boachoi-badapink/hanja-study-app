// src/pages/StudyPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useHanjaList, getProgress, setMemorized, getCategories } from '../hooks/useHanja.js'
import { Eye, EyeOff, ChevronLeft, ChevronRight, LayoutGrid, List, Check, X } from 'lucide-react'

const styles = {
  page: { display:'flex', flexDirection:'column', height:'100%', background:'var(--parchment)', overflow:'hidden' },
  toolbar: {
    display:'flex', alignItems:'center', gap:12, padding:'14px 24px',
    background:'white', borderBottom:'1px solid var(--parchment-3)',
    flexWrap:'wrap', flexShrink:0
  },
  tabs: { display:'flex', gap:4 },
  tab: (active) => ({
    padding:'6px 16px', borderRadius:8, border:'none', fontSize:13, fontWeight:500,
    cursor:'pointer', transition:'all 0.18s',
    background: active ? 'var(--ink)' : 'var(--parchment-2)',
    color: active ? 'white' : 'var(--ink-3)'
  }),
  iconBtn: (active) => ({
    display:'flex', alignItems:'center', justifyContent:'center',
    width:34, height:34, borderRadius:8, border:'none', cursor:'pointer',
    background: active ? 'var(--ink)' : 'var(--parchment-2)',
    color: active ? 'white' : 'var(--ink-3)',
    transition:'all 0.18s'
  }),
  select: { fontSize:13, padding:'6px 10px', borderRadius:8 },
  content: { flex:1, overflow:'auto', padding:24 },
}

export default function StudyPage() {
  const [tab, setTab] = useState('all')
  const [viewMode, setViewMode] = useState('card')
  const [showMeaning, setShowMeaning] = useState(true) // 리스트 전체 토글
  const [autoShowMeaning, setAutoShowMeaning] = useState(true) // 카드: 뜻+음 항상 보기 on/off
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState([])
  const [progress, setProgress] = useState({})
  const [cardIndex, setCardIndex] = useState(0)
  const [revealed, setRevealed] = useState(false) // 카드: 현재 뜻+음 보임 여부

  const { list, loading } = useHanjaList(categoryFilter || null)

  useEffect(() => {
    getCategories().then(setCategories)
    getProgress().then(setProgress)
  }, [])

  const filtered = list.filter(h => {
    if (tab === 'memorized') return progress[h.id]?.memorized
    if (tab === 'notMemorized') return !progress[h.id]?.memorized
    return true
  })

  const toggleMemorized = useCallback(async (hanjaId, current) => {
    await setMemorized(hanjaId, !current)
    setProgress(p => ({
      ...p,
      [hanjaId]: { ...(p[hanjaId] || {}), memorized: !current }
    }))
  }, [])

  // 카드 이동 시 revealed 상태 초기화
  const goCard = (dir) => {
    setCardIndex(i => {
      const next = Math.max(0, Math.min(filtered.length - 1, i + dir))
      return next
    })
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
    <div style={styles.page}>
      {/* 툴바 */}
      <div style={styles.toolbar}>
        <div style={styles.tabs}>
          {[
            { key:'all', label:`전체 (${stats.total})` },
            { key:'memorized', label:`외운 한자 (${stats.memorized})` },
            { key:'notMemorized', label:`못 외운 한자 (${stats.total - stats.memorized})` },
          ].map(({ key, label }) => (
            <button key={key} style={styles.tab(tab===key)}
              onClick={() => { setTab(key); setCardIndex(0); setRevealed(false) }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex:1 }} />

        <select style={styles.select} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="">전체 분류</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* 카드 모드: 뜻+음 자동표시 on/off */}
        {viewMode === 'card' && (
          <button
            style={{
              ...styles.iconBtn(autoShowMeaning),
              width: 'auto', padding: '0 12px', gap: 6,
              fontSize: 13, fontWeight: 500
            }}
            onClick={() => { setAutoShowMeaning(v => !v); setRevealed(false) }}
            title={autoShowMeaning ? '뜻+음 자동표시 끄기' : '뜻+음 자동표시 켜기'}
          >
            {autoShowMeaning ? <Eye size={15}/> : <EyeOff size={15}/>}
            뜻+음 {autoShowMeaning ? 'ON' : 'OFF'}
          </button>
        )}

        {/* 리스트 모드: 전체 뜻+음 토글 */}
        {viewMode === 'list' && (
          <button style={styles.iconBtn(showMeaning)} onClick={() => setShowMeaning(v=>!v)}
            title={showMeaning ? '뜻+음 숨기기' : '뜻+음 보기'}>
            {showMeaning ? <Eye size={16}/> : <EyeOff size={16}/>}
          </button>
        )}

        <button style={styles.iconBtn(viewMode==='card')} onClick={() => setViewMode('card')} title="카드 보기">
          <LayoutGrid size={16}/>
        </button>
        <button style={styles.iconBtn(viewMode==='list')} onClick={() => setViewMode('list')} title="리스트 보기">
          <List size={16}/>
        </button>
      </div>

      {/* 콘텐츠 */}
      <div style={styles.content}>
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

// ── 카드 뷰 ────────────────────────────────────────────────────
function CardView({ hanja, index, total, progress, onToggleMemorized, onPrev, onNext, autoShowMeaning, revealed, setRevealed }) {
  if (!hanja) return null
  const memorized = progress[hanja.id]?.memorized

  // autoShowMeaning ON → 항상 보임 / OFF → revealed 상태에 따라
  const showContent = autoShowMeaning || revealed

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:24, maxWidth:600, margin:'0 auto' }}>
      {/* 진행 표시 */}
      <div style={{ color:'var(--ink-3)', fontSize:14 }}>{index+1} / {total}</div>

      {/* 카드 */}
      <div
        onClick={() => {
          // OFF 모드일 때만 터치로 뜻+음 토글
          if (!autoShowMeaning) setRevealed(v => !v)
        }}
        style={{
          width:'100%', maxWidth:480, aspectRatio:'3/2',
          background:'white', borderRadius:20,
          boxShadow: memorized ? '0 4px 32px rgba(45,106,79,0.18)' : 'var(--shadow-lg)',
          border: memorized ? '2px solid var(--green)' : '2px solid var(--parchment-3)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          cursor: autoShowMeaning ? 'default' : 'pointer',
          userSelect:'none', transition:'all 0.3s', padding:32,
          position:'relative'
        }}
      >
        {/* 번호 & 카테고리 */}
        <div style={{ position:'absolute', top:16, left:20, display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:12, color:'var(--ink-3)', fontWeight:500 }}>#{hanja.id}</span>
          {hanja.category && (
            <span style={{ fontSize:11, background:'var(--gold-light)', color:'var(--gold)', padding:'2px 8px', borderRadius:20, fontWeight:500 }}>
              {hanja.category}
            </span>
          )}
        </div>

        {/* 외움 뱃지 */}
        {memorized && (
          <div style={{ position:'absolute', top:16, right:16 }}>
            <span style={{ fontSize:11, background:'var(--green-light)', color:'var(--green)', padding:'3px 10px', borderRadius:20, fontWeight:600 }}>
              ✓ 외움
            </span>
          </div>
        )}

        {/* 한자 */}
        <div className="hanja-char"
          style={{ fontSize:100, lineHeight:1, color:'var(--ink)', marginBottom: showContent ? 16 : 0, transition:'margin 0.2s' }}>
          {hanja.char}
        </div>

        {/* 뜻+음 표시 영역 */}
        {showContent ? (
          <div style={{ textAlign:'center', animation:'fadeIn 0.2s ease' }}>
            <div style={{ fontSize:28, fontWeight:700, color:'var(--ink)', marginBottom:4 }}>
              {hanja.meaning}
            </div>
            <div style={{ fontSize:22, color:'var(--ink-3)' }}>{hanja.reading}</div>
          </div>
        ) : (
          // OFF 모드 + 아직 안 눌렀을 때 안내 문구
          <div style={{
            fontSize:13, color:'var(--stone)', marginTop:8,
            background:'var(--parchment-2)', padding:'6px 16px', borderRadius:20
          }}>
            터치하여 뜻+음 보기
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div style={{ display:'flex', gap:16, alignItems:'center' }}>
        <button onClick={onPrev} disabled={index===0}
          style={{ ...navBtn, opacity: index===0 ? 0.3 : 1 }}>
          <ChevronLeft size={20}/>
        </button>

        <button
          onClick={() => onToggleMemorized(hanja.id, memorized)}
          style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'10px 28px', borderRadius:12, fontWeight:600, fontSize:15,
            background: memorized ? 'var(--green)' : 'var(--parchment-2)',
            color: memorized ? 'white' : 'var(--ink-2)',
            boxShadow: memorized ? '0 2px 12px rgba(45,106,79,0.25)' : 'none'
          }}>
          {memorized ? <><Check size={16}/> 외웠어요</> : <><X size={16}/> 아직 몰라요</>}
        </button>

        <button onClick={onNext} disabled={index===total-1}
          style={{ ...navBtn, opacity: index===total-1 ? 0.3 : 1 }}>
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

// ── 리스트 뷰 (10개씩) ─────────────────────────────────────────
function ListView({ list, progress, onToggleMemorized, showMeaning }) {
  const [page, setPage] = useState(0)
  const [revealedItems, setRevealedItems] = useState(new Set())
  const perPage = 10
  const totalPages = Math.ceil(list.length / perPage)
  const pageItems = list.slice(page * perPage, (page+1) * perPage)

  const toggleReveal = (id) => {
    setRevealedItems(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const showItem = (id) => showMeaning || revealedItems.has(id)

  return (
    <div style={{ maxWidth:700, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <span style={{ fontSize:13, color:'var(--ink-3)' }}>
          {page*perPage+1}–{Math.min((page+1)*perPage, list.length)} / {list.length}개
        </span>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setPage(p=>Math.max(0,p-1))} disabled={page===0}
            style={{ ...navBtn, width:36, height:36, opacity: page===0?0.3:1 }}>
            <ChevronLeft size={16}/>
          </button>
          <span style={{ fontSize:13, color:'var(--ink-3)', lineHeight:'36px', minWidth:60, textAlign:'center' }}>
            {page+1} / {totalPages}
          </span>
          <button onClick={() => setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1}
            style={{ ...navBtn, width:36, height:36, opacity: page===totalPages-1?0.3:1 }}>
            <ChevronRight size={16}/>
          </button>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {pageItems.map((hanja, i) => {
          const memorized = progress[hanja.id]?.memorized
          const revealed = showItem(hanja.id)
          return (
            <div key={hanja.docId}
              style={{
                display:'flex', alignItems:'center', gap:16,
                background:'white', borderRadius:12, padding:'12px 16px',
                border: memorized ? '1.5px solid var(--green)' : '1.5px solid var(--parchment-3)',
                boxShadow: 'var(--shadow)', animation: `fadeIn 0.2s ease ${i*0.03}s both`
              }}>
              <span style={{ fontSize:11, color:'var(--stone)', minWidth:32 }}>#{hanja.id}</span>
              <span className="hanja-char" style={{ fontSize:36, color:'var(--ink)', minWidth:48, textAlign:'center' }}>
                {hanja.char}
              </span>
              {hanja.category && (
                <span style={{ fontSize:11, background:'var(--gold-light)', color:'var(--gold)', padding:'2px 8px', borderRadius:20, fontWeight:500, flexShrink:0 }}>
                  {hanja.category}
                </span>
              )}
              <div style={{ flex:1 }}>
                {revealed ? (
                  <span style={{ fontWeight:600, color:'var(--ink)' }}>
                    {hanja.meaning} <span style={{ color:'var(--ink-3)', fontWeight:400 }}>{hanja.reading}</span>
                  </span>
                ) : (
                  <button onClick={() => toggleReveal(hanja.id)}
                    style={{ fontSize:12, color:'var(--stone)', background:'var(--parchment-2)', border:'none', borderRadius:8, padding:'4px 12px', cursor:'pointer' }}>
                    뜻+음 보기
                  </button>
                )}
              </div>
              {revealed && !showMeaning && (
                <button onClick={() => toggleReveal(hanja.id)}
                  style={{ padding:'4px 8px', borderRadius:8, background:'none', border:'1px solid var(--parchment-3)', color:'var(--stone)', fontSize:11, cursor:'pointer' }}>
                  <EyeOff size={13}/>
                </button>
              )}
              <button onClick={() => onToggleMemorized(hanja.id, memorized)}
                style={{
                  display:'flex', alignItems:'center', gap:4,
                  padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:600,
                  background: memorized ? 'var(--green)' : 'var(--parchment-2)',
                  color: memorized ? 'white' : 'var(--ink-3)',
                  flexShrink:0
                }}>
                {memorized ? <><Check size={12}/>외움</> : '미암기'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
