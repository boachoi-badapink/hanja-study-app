// src/pages/AdminPage.jsx
import React, { useState, useEffect, useRef } from 'react'
import { db } from '../firebase.js'
import { useHanjaList, addHanja, addHanjaBatch, updateHanja, deleteHanja, deleteByCategory, renumberAll, getCategories } from '../hooks/useHanja.js'
import { Plus, Upload, Trash2, Edit2, Check, X, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'

// 급수 뱃지 색상
function gradeColor(cat) {
  if (!cat) return null
  if (cat.includes('1급')) return { bg:'#fff0f0', color:'#c0392b' }
  if (cat.includes('2급')) return { bg:'#fff4e6', color:'#c8622a' }
  if (cat.includes('3급')) return { bg:'#fffbe6', color:'#b8960a' }
  if (cat.includes('4급')) return { bg:'#f0fff4', color:'#2d6a4f' }
  if (cat.includes('5급')) return { bg:'#e8f4fd', color:'#1a6a9a' }
  if (cat.includes('6급')) return { bg:'#f0ecff', color:'#6c5ce7' }
  if (cat.includes('7급')) return { bg:'#fce8f3', color:'#a0522d' }
  if (cat.includes('8급')) return { bg:'#e8f8f8', color:'#2c8c7a' }
  return { bg:'#fdf7e8', color:'#c8a84b' }
}

export default function AdminPage() {
  const { list, loading, refetch } = useHanjaList()
  const [categories, setCategories] = useState([])
  const [tab, setTab] = useState('list')
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ char:'', meaning:'', reading:'', category:'' })
  const [uploadStatus, setUploadStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [confirmModal, setConfirmModal] = useState(null)
  const [page, setPage] = useState(0)
  const perPage = 50
  const fileRef = useRef()

  useEffect(() => {
    getCategories().then(cats => setCategories(cats))
  }, [list]) // list 바뀔 때마다 카테고리 갱신

  // ── 필터링 (클라이언트 사이드) ────────────────────────────────
  const filtered = list.filter(h => {
    const cat = (h.category || '').trim()
    const filterCat = categoryFilter.trim()
    const matchCat = !filterCat || cat === filterCat
    const matchSearch = !searchTerm ||
      (h.char || '').includes(searchTerm) ||
      (h.meaning || '').includes(searchTerm) ||
      (h.reading || '').includes(searchTerm)
    return matchCat && matchSearch
  })

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const safePage = Math.min(page, totalPages - 1)
  const pageItems = filtered.slice(safePage * perPage, (safePage + 1) * perPage)

  // 카테고리 바뀔 때 페이지 초기화
  useEffect(() => { setPage(0) }, [categoryFilter, searchTerm])

  // 분류별 카운트
  const catCounts = {}
  list.forEach(h => {
    const c = (h.category || '').trim()
    if (c) catCounts[c] = (catCounts[c] || 0) + 1
  })

  // ── 핸들러 ───────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!form.char || !form.meaning || !form.reading) return alert('한자, 뜻, 음은 필수입니다')
    await addHanja({ ...form, category: form.category.trim() })
    setForm({ char:'', meaning:'', reading:'', category:'' })
    await refetch()
    alert('등록 완료!')
  }

  const handleUpdate = async (item) => {
    await updateHanja(item.docId, {
      char: item.char, meaning: item.meaning,
      reading: item.reading, category: (item.category || '').trim()
    })
    setEditId(null)
    await refetch()
  }

  const confirm = (label, danger, onConfirm) => setConfirmModal({ label, danger, onConfirm })

  const handleDelete = (docId, char) => {
    confirm(`'${char}' 한자를 삭제할까요?`, false, async () => {
      await deleteHanja(docId)
      setConfirmModal(null)
      await refetch()
    })
  }

  const handleDeleteByCategory = (cat) => {
    const count = catCounts[cat] || 0
    confirm(`'${cat}' 분류 한자 ${count}개를 모두 삭제할까요?`, true, async () => {
      setConfirmModal(null)
      await deleteByCategory(cat)
      setCategoryFilter('')
      await refetch()
    })
  }

  const handleDeleteAll = () => {
    confirm(`전체 한자 ${list.length}개를 모두 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`, true, async () => {
      setConfirmModal(null)
      await deleteByCategory(null)
      setCategoryFilter('')
      await refetch()
    })
  }

  const handleRenumber = () => {
    confirm(`전체 ${list.length}개 한자 번호를 1번부터 다시 정렬할까요?`, false, async () => {
      setConfirmModal(null)
      await renumberAll()
      await refetch()
    })
  }

  const handleCSV = async (text) => {
    const lines = text.split('\n').filter(l => l.trim())
    const items = []
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim())
      if (parts.length < 3) continue
      if (parts[0] === '한자' || parts[0] === 'char') continue
      if (!parts[0]) continue
      items.push({ char: parts[0], meaning: parts[1], reading: parts[2], category: parts[3] || '' })
    }
    if (items.length === 0) return setUploadStatus('❌ 파싱 가능한 데이터가 없습니다')
    setUploadStatus(`📤 ${items.length}개 업로드 중...`)
    try {
      await addHanjaBatch(items)
      await refetch()
      setUploadStatus(`✅ ${items.length}개 등록 완료!`)
    } catch (e) {
      setUploadStatus(`❌ 오류: ${e.message}`)
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      await handleCSV(await file.text())
    } else {
      setUploadStatus('❌ CSV 파일만 지원합니다')
    }
    e.target.value = ''
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

      {/* 확인 모달 */}
      {confirmModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.55)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20
        }}>
          <div style={{ background:'white', borderRadius:16, padding:24, maxWidth:380, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ display:'flex', gap:10, marginBottom:20, alignItems:'flex-start' }}>
              <AlertTriangle size={20} color={confirmModal.danger ? '#c0392b' : '#c8a84b'} style={{ flexShrink:0, marginTop:2 }}/>
              <div style={{ fontSize:14, color:'#1a1209', lineHeight:1.7, whiteSpace:'pre-line' }}>{confirmModal.label}</div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setConfirmModal(null)}
                style={{ padding:'8px 18px', borderRadius:8, background:'#ede7d9', color:'#7a6a50', fontWeight:500, fontSize:13, cursor:'pointer' }}>
                취소
              </button>
              <button onClick={confirmModal.onConfirm}
                style={{ padding:'8px 18px', borderRadius:8,
                  background: confirmModal.danger ? '#c0392b' : '#1a1209',
                  color:'white', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 탭 */}
      <div style={{ display:'flex', gap:4, padding:'10px 12px', background:'white', borderBottom:'1px solid #e3dbc8', flexShrink:0, overflowX:'auto' }}>
        {[
          { key:'list', label:`목록 (${list.length})` },
          { key:'add', label:'개별 등록' },
          { key:'upload', label:'일괄 업로드' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding:'6px 14px', borderRadius:8, border:'none', fontSize:12, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap',
              background: tab===key ? '#1a1209' : '#ede7d9',
              color: tab===key ? 'white' : '#7a6a50' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflow:'auto', padding:'14px 12px' }}>

        {/* ── 목록 탭 ── */}
        {tab === 'list' && (
          <div style={{ maxWidth:800, margin:'0 auto' }}>

            {/* 검색 & 분류 필터 */}
            <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
              <input placeholder="한자/뜻/음 검색..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ flex:1, minWidth:120, fontSize:13, padding:'7px 10px' }}/>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                style={{ fontSize:12, padding:'7px 8px', borderRadius:8, border:'1.5px solid #e3dbc8', background:'white' }}>
                <option value="">전체 분류 ({list.length})</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c} ({catCounts[c] || 0}개)</option>
                ))}
              </select>
            </div>

            {/* 액션 버튼 */}
            <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
              <button onClick={handleRenumber}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8,
                  background:'#fdf7e8', color:'#c8a84b', border:'1px solid #c8a84b',
                  fontSize:12, fontWeight:600, cursor:'pointer' }}>
                <RefreshCw size={12}/> 번호 재정렬
              </button>

              {categoryFilter && (
                <button onClick={() => handleDeleteByCategory(categoryFilter)}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8,
                    background:'#fdf0ee', color:'#c0392b', border:'1px solid #c0392b',
                    fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  <Trash2 size={12}/> '{categoryFilter}' 삭제 ({catCounts[categoryFilter]||0}개)
                </button>
              )}

              <button onClick={handleDeleteAll}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8,
                  background:'#c0392b', color:'white', border:'none',
                  fontSize:12, fontWeight:600, cursor:'pointer', marginLeft:'auto' }}>
                <Trash2 size={12}/> 전체 삭제
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign:'center', color:'#7a6a50', paddingTop:60 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>漢</div>
                불러오는 중...
              </div>
            ) : (
              <>
                {/* 필터 결과 & 페이지 */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:12, color:'#7a6a50' }}>
                    {filtered.length}개 {categoryFilter && `(${categoryFilter})`}
                  </span>
                  {totalPages > 1 && (
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={safePage===0}
                        style={{ width:28, height:28, borderRadius:6, border:'1px solid #e3dbc8', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: safePage===0?0.3:1 }}>
                        <ChevronLeft size={13}/>
                      </button>
                      <span style={{ fontSize:12, color:'#7a6a50' }}>{safePage+1} / {totalPages}</span>
                      <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={safePage===totalPages-1}
                        style={{ width:28, height:28, borderRadius:6, border:'1px solid #e3dbc8', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: safePage===totalPages-1?0.3:1 }}>
                        <ChevronRight size={13}/>
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {pageItems.length === 0 ? (
                    <div style={{ textAlign:'center', color:'#7a6a50', paddingTop:40 }}>
                      {categoryFilter ? `'${categoryFilter}' 분류에 해당하는 한자가 없습니다` : '검색 결과가 없습니다'}
                    </div>
                  ) : pageItems.map(item => (
                    <HanjaRow key={item.docId} item={item} editId={editId}
                      onEdit={() => setEditId(item.docId)}
                      onCancel={() => setEditId(null)}
                      onSave={handleUpdate}
                      onDelete={() => handleDelete(item.docId, item.char)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── 개별 등록 탭 ── */}
        {tab === 'add' && (
          <div style={{ maxWidth:440, margin:'0 auto' }}>
            <div style={{ background:'white', borderRadius:16, padding:22, boxShadow:'0 2px 12px rgba(26,18,9,0.08)' }}>
              <h3 style={{ fontFamily:'Noto Serif KR', fontSize:17, marginBottom:18, color:'#1a1209' }}>한자 개별 등록</h3>
              {[
                { label:'한자 *', key:'char', placeholder:'例: 山', large:true },
                { label:'뜻 *', key:'meaning', placeholder:'例: 산' },
                { label:'음 *', key:'reading', placeholder:'例: 산' },
                { label:'분류/급수', key:'category', placeholder:'例: 1급, 2급, 자연...' },
              ].map(({ label, key, placeholder, large }) => (
                <div key={key} style={{ marginBottom:13 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#3d3020', marginBottom:5 }}>{label}</label>
                  {large ? (
                    <input value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
                      placeholder={placeholder}
                      style={{ width:'100%', fontSize:44, textAlign:'center', fontFamily:'Noto Serif KR', padding:'8px', height:74, borderRadius:8, border:'1.5px solid #e3dbc8' }}/>
                  ) : (
                    <input value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
                      placeholder={placeholder} style={{ width:'100%', fontSize:14, padding:'8px 10px', borderRadius:8, border:'1.5px solid #e3dbc8' }}/>
                  )}
                </div>
              ))}
              <button onClick={handleAdd}
                style={{ width:'100%', padding:12, borderRadius:10, background:'#1a1209', color:'white',
                  fontWeight:700, fontSize:14, cursor:'pointer', marginTop:6, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <Plus size={15}/> 등록하기
              </button>
            </div>
          </div>
        )}

        {/* ── 일괄 업로드 탭 ── */}
        {tab === 'upload' && (
          <div style={{ maxWidth:560, margin:'0 auto' }}>
            <div style={{ background:'white', borderRadius:16, padding:22, boxShadow:'0 2px 12px rgba(26,18,9,0.08)', marginBottom:14 }}>
              <h3 style={{ fontFamily:'Noto Serif KR', fontSize:17, marginBottom:10, color:'#1a1209' }}>CSV 업로드</h3>
              <div style={{ background:'#f5f0e8', borderRadius:10, padding:12, marginBottom:14, fontSize:12, lineHeight:1.8 }}>
                <div style={{ fontWeight:600, marginBottom:4, color:'#1a1209' }}>📋 형식 (쉼표로 구분)</div>
                <div style={{ fontFamily:'monospace', color:'#7a6a50' }}>
                  한자,뜻,음,분류<br/>
                  山,산,산,1급<br/>
                  水,물,수,2급
                </div>
                <div style={{ color:'#7a6a50', marginTop:6 }}>
                  • 첫 줄 헤더는 자동 건너뜀<br/>
                  • 분류칸에 급수(1급~8급) 입력 시 색상 구분됨
                </div>
              </div>
              <input type="file" accept=".csv,.txt" ref={fileRef} onChange={handleFile} style={{ display:'none' }}/>
              <button onClick={() => fileRef.current.click()}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  padding:11, borderRadius:10, background:'#1a1209', color:'white', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                <Upload size={15}/> CSV 파일 선택
              </button>
              {uploadStatus && (
                <div style={{ marginTop:12, padding:12, borderRadius:10, background:'#f5f0e8',
                  fontSize:12, color:'#3d3020', whiteSpace:'pre-wrap', fontFamily:'monospace', maxHeight:160, overflow:'auto' }}>
                  {uploadStatus}
                </div>
              )}
            </div>
            <div style={{ background:'white', borderRadius:16, padding:22, boxShadow:'0 2px 12px rgba(26,18,9,0.08)' }}>
              <h3 style={{ fontSize:14, fontWeight:600, marginBottom:10, color:'#1a1209' }}>텍스트 직접 붙여넣기</h3>
              <PasteUpload onUpload={handleCSV}/>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 행 컴포넌트 ──────────────────────────────────────────────────
function HanjaRow({ item, editId, onEdit, onCancel, onSave, onDelete }) {
  const [editable, setEditable] = useState({ ...item })
  const isEditing = editId === item.docId
  const gc = gradeColor(item.category)

  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, background:'white', borderRadius:9, padding:'8px 10px', boxShadow:'0 1px 6px rgba(26,18,9,0.07)' }}>
      <span style={{ fontSize:10, color:'#b5a48a', minWidth:28, flexShrink:0 }}>#{item.id}</span>

      {isEditing ? (
        <>
          <input value={editable.char} onChange={e => setEditable(p=>({...p,char:e.target.value}))}
            style={{ width:48, fontSize:24, textAlign:'center', fontFamily:'Noto Serif KR', padding:2, borderRadius:6, border:'1.5px solid #e3dbc8' }}/>
          <input value={editable.meaning} onChange={e => setEditable(p=>({...p,meaning:e.target.value}))}
            style={{ flex:1, fontSize:13, minWidth:50, padding:'4px 7px', borderRadius:6, border:'1.5px solid #e3dbc8' }} placeholder="뜻"/>
          <input value={editable.reading} onChange={e => setEditable(p=>({...p,reading:e.target.value}))}
            style={{ width:56, fontSize:13, padding:'4px 7px', borderRadius:6, border:'1.5px solid #e3dbc8' }} placeholder="음"/>
          <input value={editable.category} onChange={e => setEditable(p=>({...p,category:e.target.value}))}
            style={{ width:64, fontSize:12, padding:'4px 7px', borderRadius:6, border:'1.5px solid #e3dbc8' }} placeholder="급수"/>
          <button onClick={() => onSave(editable)}
            style={{ padding:5, borderRadius:6, background:'#eaf4ef', color:'#2d6a4f', cursor:'pointer', flexShrink:0 }}>
            <Check size={13}/>
          </button>
          <button onClick={onCancel}
            style={{ padding:5, borderRadius:6, background:'#ede7d9', color:'#7a6a50', cursor:'pointer', flexShrink:0 }}>
            <X size={13}/>
          </button>
        </>
      ) : (
        <>
          <span className="hanja-char" style={{ fontSize:24, color:'#1a1209', minWidth:32, textAlign:'center', flexShrink:0 }}>
            {item.char}
          </span>
          <span style={{ flex:1, color:'#1a1209', fontSize:13, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            <span style={{ fontWeight:500 }}>{item.meaning}</span>
            <span style={{ color:'#7a6a50', marginLeft:5, fontSize:12 }}>{item.reading}</span>
          </span>
          {item.category && gc && (
            <span style={{ fontSize:10, background:gc.bg, color:gc.color, padding:'2px 7px', borderRadius:20, fontWeight:600, flexShrink:0, whiteSpace:'nowrap' }}>
              {item.category}
            </span>
          )}
          <button onClick={onEdit}
            style={{ padding:5, borderRadius:6, background:'#ede7d9', color:'#7a6a50', cursor:'pointer', flexShrink:0 }}>
            <Edit2 size={12}/>
          </button>
          <button onClick={onDelete}
            style={{ padding:5, borderRadius:6, background:'#fdf0ee', color:'#c0392b', cursor:'pointer', flexShrink:0 }}>
            <Trash2 size={12}/>
          </button>
        </>
      )}
    </div>
  )
}

function PasteUpload({ onUpload }) {
  const [text, setText] = useState('')
  return (
    <div>
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="한자,뜻,음,분류 형식으로 붙여넣기..."
        style={{ width:'100%', height:100, borderRadius:8, border:'1.5px solid #e3dbc8',
          padding:10, fontSize:12, fontFamily:'monospace', resize:'vertical', background:'white' }}/>
      <button onClick={() => { onUpload(text); setText('') }}
        style={{ marginTop:8, width:'100%', padding:10, borderRadius:9, background:'#c8a84b', color:'white',
          fontWeight:600, fontSize:13, cursor:'pointer' }}>
        업로드
      </button>
    </div>
  )
}
