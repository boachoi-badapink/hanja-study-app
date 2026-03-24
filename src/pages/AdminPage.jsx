// src/pages/AdminPage.jsx
import React, { useState, useEffect, useRef } from 'react'
import { getDocs, collection, query, orderBy, doc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase.js'
import { addHanja, addHanjaBatch, updateHanja, deleteHanja, getCategories } from '../hooks/useHanja.js'
import { Plus, Upload, Trash2, Edit2, Check, X, RefreshCw } from 'lucide-react'

export default function AdminPage() {
  const [list, setList] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('list')
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ char:'', meaning:'', reading:'', category:'' })
  const [uploadStatus, setUploadStatus] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const fileRef = useRef()

  const load = async () => {
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'hanja'), orderBy('id')))
    setList(snap.docs.map(d => ({ docId: d.id, ...d.data() })))
    setCategories(await getCategories())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.char || !form.meaning || !form.reading) return alert('한자, 뜻, 음은 필수입니다')
    await addHanja(form)
    setForm({ char:'', meaning:'', reading:'', category:'' })
    await load()
    alert('등록 완료!')
  }

  const handleUpdate = async (item) => {
    await updateHanja(item.docId, { char: item.char, meaning: item.meaning, reading: item.reading, category: item.category })
    setEditId(null)
    await load()
  }

  const handleDelete = async (docId) => {
    if (!window.confirm('삭제하시겠습니까?')) return
    await deleteHanja(docId)
    await load()
  }

  // ── 넘버링 재정렬 ──────────────────────────────────────────────
  const handleRenumber = async () => {
    if (!window.confirm(`전체 ${list.length}개 한자 번호를 1번부터 다시 정렬할까요?`)) return
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'hanja'), orderBy('id')))
    const batch = writeBatch(db)
    snap.docs.forEach((d, i) => {
      batch.update(doc(db, 'hanja', d.id), { id: i + 1 })
    })
    await batch.commit()
    await load()
    alert('넘버링 재정렬 완료!')
  }

  const handleCSV = async (text) => {
    const lines = text.split('\n').filter(l => l.trim())
    const items = []
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim())
      if (parts.length < 3) continue
      // 헤더 줄 건너뛰기
      if (parts[0] === '한자' || parts[0] === 'char') continue
      items.push({ char: parts[0], meaning: parts[1], reading: parts[2], category: parts[3] || '' })
    }
    if (items.length === 0) return setUploadStatus('❌ 파싱 가능한 데이터가 없습니다')
    setUploadStatus(`📤 ${items.length}개 업로드 중...`)
    await addHanjaBatch(items)
    await load()
    setUploadStatus(`✅ ${items.length}개 등록 완료!`)
  }

  const handlePDF = async (file) => {
    setUploadStatus('📄 PDF 읽는 중...')
    try {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        fullText += content.items.map(item => item.str).join(' ') + '\n'
      }
      setUploadStatus(`📄 텍스트 추출 완료. CSV 형식으로 변환 후 업로드하세요.\n\n추출 텍스트 (앞부분):\n${fullText.substring(0, 500)}...`)
    } catch (e) {
      setUploadStatus('❌ PDF 파싱 실패: ' + e.message)
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      const text = await file.text()
      await handleCSV(text)
    } else if (file.name.endsWith('.pdf')) {
      await handlePDF(file)
    } else {
      setUploadStatus('❌ CSV 또는 PDF 파일만 지원합니다')
    }
  }

  const filtered = list.filter(h =>
    !searchTerm || h.char?.includes(searchTerm) || h.meaning?.includes(searchTerm) || h.reading?.includes(searchTerm)
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* 탭 */}
      <div style={{ display:'flex', gap:4, padding:'14px 24px', background:'white', borderBottom:'1px solid var(--parchment-3)', flexShrink:0 }}>
        {[
          { key:'list', label:`한자 목록 (${list.length})` },
          { key:'add', label:'개별 등록' },
          { key:'upload', label:'일괄 업로드' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding:'6px 16px', borderRadius:8, border:'none', fontSize:13, fontWeight:500, cursor:'pointer',
              background: tab===key ? 'var(--ink)' : 'var(--parchment-2)',
              color: tab===key ? 'white' : 'var(--ink-3)' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflow:'auto', padding:24 }}>

        {/* ── 목록 탭 ── */}
        {tab === 'list' && (
          <div style={{ maxWidth:800, margin:'0 auto' }}>
            <div style={{ display:'flex', gap:12, marginBottom:16 }}>
              <input placeholder="한자/뜻/음 검색..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ flex:1 }}/>
              <select onChange={e => setSearchTerm(e.target.value)} style={{ fontSize:13 }}>
                <option value="">전체 분류</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {/* 넘버링 재정렬 버튼 */}
              <button onClick={handleRenumber}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8,
                  background:'var(--gold-light)', color:'var(--gold)', border:'1px solid var(--gold)',
                  fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                <RefreshCw size={14}/> 번호 재정렬
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign:'center', color:'var(--ink-3)', paddingTop:60 }}>불러오는 중...</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {filtered.map(item => (
                  <HanjaRow key={item.docId} item={item} editId={editId}
                    onEdit={() => setEditId(item.docId)}
                    onCancel={() => setEditId(null)}
                    onSave={handleUpdate}
                    onDelete={() => handleDelete(item.docId)}
                    categories={categories}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 개별 등록 탭 ── */}
        {tab === 'add' && (
          <div style={{ maxWidth:480, margin:'0 auto' }}>
            <div style={{ background:'white', borderRadius:16, padding:28, boxShadow:'var(--shadow)' }}>
              <h3 style={{ fontFamily:'Noto Serif KR', fontSize:20, marginBottom:20, color:'var(--ink)' }}>한자 개별 등록</h3>
              {[
                { label:'한자 *', key:'char', placeholder:'例: 山', large:true },
                { label:'뜻 *', key:'meaning', placeholder:'例: 산' },
                { label:'음 *', key:'reading', placeholder:'例: 산' },
                { label:'분류', key:'category', placeholder:'例: 자연, 동물, 인체...' },
              ].map(({ label, key, placeholder, large }) => (
                <div key={key} style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--ink-2)', marginBottom:6 }}>{label}</label>
                  {large ? (
                    <input value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
                      placeholder={placeholder}
                      style={{ width:'100%', fontSize:48, textAlign:'center', fontFamily:'Noto Serif KR', padding:'12px', height:90 }}/>
                  ) : (
                    <input value={form[key]} onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
                      placeholder={placeholder} style={{ width:'100%' }}/>
                  )}
                </div>
              ))}
              <button onClick={handleAdd}
                style={{ width:'100%', padding:14, borderRadius:12, background:'var(--ink)', color:'white',
                  fontWeight:700, fontSize:16, cursor:'pointer', marginTop:8, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <Plus size={18}/> 등록하기
              </button>
            </div>
          </div>
        )}

        {/* ── 일괄 업로드 탭 ── */}
        {tab === 'upload' && (
          <div style={{ maxWidth:600, margin:'0 auto' }}>
            <div style={{ background:'white', borderRadius:16, padding:28, boxShadow:'var(--shadow)', marginBottom:20 }}>
              <h3 style={{ fontFamily:'Noto Serif KR', fontSize:20, marginBottom:8, color:'var(--ink)' }}>일괄 업로드</h3>
              <div style={{ background:'var(--parchment-2)', borderRadius:12, padding:16, marginBottom:20, fontSize:13 }}>
                <div style={{ fontWeight:600, marginBottom:8, color:'var(--ink)' }}>📋 CSV 파일 형식</div>
                <div style={{ fontFamily:'monospace', color:'var(--ink-3)', lineHeight:1.8 }}>
                  한자,뜻,음,분류<br/>
                  山,산,산,자연<br/>
                  水,물,수,자연
                </div>
                <div style={{ color:'var(--ink-3)', marginTop:8 }}>• 첫 줄 헤더는 자동으로 건너뜁니다<br/>• 분류는 비워도 됩니다</div>
              </div>
              <input type="file" accept=".csv,.txt,.pdf" ref={fileRef} onChange={handleFile} style={{ display:'none' }}/>
              <button onClick={() => fileRef.current.click()}
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  padding:14, borderRadius:12, background:'var(--ink)', color:'white', fontWeight:600, fontSize:15, cursor:'pointer' }}>
                <Upload size={18}/> CSV / PDF 파일 선택
              </button>
              {uploadStatus && (
                <div style={{ marginTop:16, padding:16, borderRadius:12, background:'var(--parchment-2)',
                  fontSize:13, color:'var(--ink-2)', whiteSpace:'pre-wrap', fontFamily:'monospace', maxHeight:200, overflow:'auto' }}>
                  {uploadStatus}
                </div>
              )}
            </div>
            <div style={{ background:'white', borderRadius:16, padding:28, boxShadow:'var(--shadow)' }}>
              <h3 style={{ fontSize:16, fontWeight:600, marginBottom:12, color:'var(--ink)' }}>텍스트 직접 붙여넣기</h3>
              <PasteUpload onUpload={handleCSV}/>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function HanjaRow({ item, editId, onEdit, onCancel, onSave, onDelete }) {
  const [editable, setEditable] = useState({ ...item })
  const isEditing = editId === item.docId

  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, background:'white', borderRadius:10, padding:'10px 16px', boxShadow:'var(--shadow)' }}>
      <span style={{ fontSize:11, color:'var(--stone)', minWidth:36 }}>#{item.id}</span>
      {isEditing ? (
        <>
          <input value={editable.char} onChange={e => setEditable(p=>({...p,char:e.target.value}))}
            style={{ width:60, fontSize:28, textAlign:'center', fontFamily:'Noto Serif KR', padding:4 }}/>
          <input value={editable.meaning} onChange={e => setEditable(p=>({...p,meaning:e.target.value}))}
            style={{ flex:1, fontSize:14 }} placeholder="뜻"/>
          <input value={editable.reading} onChange={e => setEditable(p=>({...p,reading:e.target.value}))}
            style={{ width:80, fontSize:14 }} placeholder="음"/>
          <input value={editable.category} onChange={e => setEditable(p=>({...p,category:e.target.value}))}
            style={{ width:100, fontSize:13 }} placeholder="분류"/>
          <button onClick={() => onSave(editable)}
            style={{ padding:6, borderRadius:8, background:'var(--green-light)', color:'var(--green)', cursor:'pointer' }}>
            <Check size={15}/>
          </button>
          <button onClick={onCancel}
            style={{ padding:6, borderRadius:8, background:'var(--parchment-2)', color:'var(--ink-3)', cursor:'pointer' }}>
            <X size={15}/>
          </button>
        </>
      ) : (
        <>
          <span className="hanja-char" style={{ fontSize:28, color:'var(--ink)', minWidth:40, textAlign:'center' }}>{item.char}</span>
          <span style={{ flex:1, fontWeight:500, color:'var(--ink)' }}>{item.meaning}</span>
          <span style={{ color:'var(--ink-3)', minWidth:60 }}>{item.reading}</span>
          {item.category && (
            <span style={{ fontSize:11, background:'var(--gold-light)', color:'var(--gold)', padding:'2px 8px', borderRadius:20, fontWeight:500, minWidth:60, textAlign:'center' }}>
              {item.category}
            </span>
          )}
          <button onClick={onEdit}
            style={{ padding:6, borderRadius:8, background:'var(--parchment-2)', color:'var(--ink-3)', cursor:'pointer' }}>
            <Edit2 size={14}/>
          </button>
          <button onClick={onDelete}
            style={{ padding:6, borderRadius:8, background:'var(--red-light)', color:'var(--red)', cursor:'pointer' }}>
            <Trash2 size={14}/>
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
        style={{ width:'100%', height:120, borderRadius:8, border:'1.5px solid var(--parchment-3)',
          padding:12, fontSize:13, fontFamily:'monospace', resize:'vertical' }}/>
      <button onClick={() => { onUpload(text); setText('') }}
        style={{ marginTop:10, width:'100%', padding:12, borderRadius:10, background:'var(--gold)', color:'white',
          fontWeight:600, fontSize:14, cursor:'pointer' }}>
        업로드
      </button>
    </div>
  )
}
