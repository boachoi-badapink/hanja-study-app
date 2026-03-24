// src/pages/TestPage.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { getDocs, collection, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase.js'
import { saveTest, getTests, deleteTest } from '../hooks/useHanja.js'
import { Play, Save, Trash2, ChevronLeft, ChevronRight, Check, X, RotateCcw, Trophy } from 'lucide-react'

export default function TestPage() {
  const [screen, setScreen] = useState('home') // home | testing | result | history
  const [allHanja, setAllHanja] = useState([])
  const [testCount, setTestCount] = useState(20)
  const [currentTest, setCurrentTest] = useState(null) // { items, answers, current }
  const [savedTests, setSavedTests] = useState([])
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(() => {
    getDocs(query(collection(db, 'hanja'), orderBy('id'))).then(snap => {
      setAllHanja(snap.docs.map(d => ({ docId: d.id, ...d.data() })))
    })
    loadTests()
  }, [])

  const loadTests = async () => {
    const tests = await getTests()
    setSavedTests(tests)
  }

  // 테스트 시작
  const startTest = useCallback(() => {
    if (allHanja.length === 0) return
    const shuffled = [...allHanja].sort(() => Math.random() - 0.5)
    const items = shuffled.slice(0, Math.min(testCount, allHanja.length))
    setCurrentTest({
      items,
      answers: new Array(items.length).fill(null), // true | false | null
      current: 0,
      startedAt: new Date().toISOString(),
      docId: null
    })
    setScreen('testing')
    setShowAnswer(false)
  }, [allHanja, testCount])

  // 이전 테스트 이어하기
  const continueTest = (test) => {
    setCurrentTest(test)
    setScreen('testing')
    setShowAnswer(false)
  }

  // 답변 체크
  const markAnswer = async (correct) => {
    const updated = { ...currentTest }
    updated.answers[updated.current] = correct
    updated.current = updated.current + 1
    setCurrentTest(updated)
    setShowAnswer(false)
    if (updated.current >= updated.items.length) {
      // 테스트 완료
      const score = updated.answers.filter(a => a === true).length
      const result = { ...updated, score, total: updated.items.length, completedAt: new Date().toISOString() }
      await saveTest(result)
      setCurrentTest(result)
      setScreen('result')
      loadTests()
    }
  }

  // 중간 저장
  const saveProgress = async () => {
    const saved = await saveTest({ ...currentTest, savedAt: new Date().toISOString() })
    if (!currentTest.docId && saved?.id) {
      setCurrentTest(t => ({ ...t, docId: saved.id }))
    }
    alert('저장되었습니다!')
  }

  // 이전/다음
  const goTo = (dir) => {
    setCurrentTest(t => ({ ...t, current: Math.max(0, Math.min(t.items.length-1, t.current+dir)) }))
    setShowAnswer(false)
  }

  if (screen === 'home') return (
    <HomeScreen
      testCount={testCount} setTestCount={setTestCount}
      onStart={startTest} total={allHanja.length}
      savedTests={savedTests} onContinue={continueTest}
      onDelete={async (id) => { await deleteTest(id); loadTests() }}
      onHistory={() => setScreen('history')}
    />
  )

  if (screen === 'testing' && currentTest) return (
    <TestingScreen
      test={currentTest}
      showAnswer={showAnswer} setShowAnswer={setShowAnswer}
      onMark={markAnswer} onSave={saveProgress}
      onGoTo={goTo} onExit={() => setScreen('home')}
    />
  )

  if (screen === 'result' && currentTest) return (
    <ResultScreen
      test={currentTest}
      onNew={() => setScreen('home')}
      onHistory={() => setScreen('history')}
    />
  )

  if (screen === 'history') return (
    <HistoryScreen
      tests={savedTests.filter(t => t.completedAt)}
      onBack={() => setScreen('home')}
      onDelete={async (id) => { await deleteTest(id); loadTests() }}
    />
  )
}

// ── 홈 화면 ─────────────────────────────────────────────────────
function HomeScreen({ testCount, setTestCount, onStart, total, savedTests, onContinue, onDelete, onHistory }) {
  const inProgress = savedTests.filter(t => !t.completedAt)

  return (
    <div style={{ maxWidth:560, margin:'40px auto', padding:'0 24px' }}>
      <h2 style={{ fontFamily:'Noto Serif KR', fontSize:28, marginBottom:8, color:'var(--ink)' }}>테스트 모드</h2>
      <p style={{ color:'var(--ink-3)', marginBottom:32 }}>총 {total}개 중 랜덤으로 문제를 생성합니다</p>

      {/* 새 테스트 */}
      <div style={{ background:'white', borderRadius:16, padding:24, boxShadow:'var(--shadow)', marginBottom:20 }}>
        <div style={{ fontWeight:600, marginBottom:16, color:'var(--ink)' }}>새 테스트 시작</div>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <span style={{ color:'var(--ink-3)', fontSize:14 }}>문제 수</span>
          <input type="number" value={testCount} min={1} max={total}
            onChange={e => setTestCount(Math.min(total, Math.max(1, parseInt(e.target.value)||1)))}
            style={{ width:80, textAlign:'center', fontWeight:600, fontSize:16 }}
          />
          <span style={{ color:'var(--ink-3)', fontSize:14 }}>문제</span>
          {[10,20,50,100].map(n => (
            <button key={n} onClick={() => setTestCount(n)}
              style={{ padding:'4px 12px', borderRadius:20, border:'1px solid var(--parchment-3)',
                background: testCount===n ? 'var(--ink)' : 'var(--parchment-2)',
                color: testCount===n ? 'white' : 'var(--ink-3)', fontSize:12, cursor:'pointer' }}>
              {n}
            </button>
          ))}
        </div>
        <button onClick={onStart} style={{
          display:'flex', alignItems:'center', gap:8, width:'100%', justifyContent:'center',
          padding:'12px', borderRadius:12, background:'var(--ink)', color:'white',
          fontWeight:700, fontSize:16, cursor:'pointer'
        }}>
          <Play size={18}/> 시작하기
        </button>
      </div>

      {/* 이어하기 */}
      {inProgress.length > 0 && (
        <div style={{ background:'white', borderRadius:16, padding:24, boxShadow:'var(--shadow)', marginBottom:20 }}>
          <div style={{ fontWeight:600, marginBottom:12, color:'var(--ink)' }}>이어하기</div>
          {inProgress.map(t => (
            <div key={t.docId} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:500 }}>{t.items?.length}문제</div>
                <div style={{ fontSize:12, color:'var(--ink-3)' }}>
                  {t.current || 0}/{t.items?.length} 완료 · {new Date(t.savedAt||t.startedAt).toLocaleDateString()}
                </div>
              </div>
              <button onClick={() => onContinue(t)}
                style={{ padding:'6px 14px', borderRadius:8, background:'var(--gold)', color:'white', fontWeight:600, fontSize:13, cursor:'pointer' }}>
                이어하기
              </button>
              <button onClick={() => onDelete(t.docId)}
                style={{ padding:6, borderRadius:8, background:'var(--red-light)', color:'var(--red)', border:'none', cursor:'pointer' }}>
                <Trash2 size={14}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 기록 보기 버튼 */}
      <button onClick={onHistory}
        style={{ display:'flex', alignItems:'center', gap:8, width:'100%', justifyContent:'center',
          padding:12, borderRadius:12, background:'var(--parchment-2)', color:'var(--ink-2)',
          fontWeight:500, fontSize:14, cursor:'pointer' }}>
        <Trophy size={16}/> 테스트 기록 보기
      </button>
    </div>
  )
}

// ── 테스트 화면 ──────────────────────────────────────────────────
function TestingScreen({ test, showAnswer, setShowAnswer, onMark, onSave, onGoTo, onExit }) {
  const { items, answers, current } = test
  const hanja = items[current]
  const answered = answers[current]
  const progress = answers.filter(a => a !== null).length

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* 상단 바 */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 24px',
        background:'white', borderBottom:'1px solid var(--parchment-3)', flexShrink:0 }}>
        <button onClick={onExit} style={{ padding:'6px 12px', borderRadius:8, background:'var(--parchment-2)',
          color:'var(--ink-3)', fontWeight:500, fontSize:13, cursor:'pointer' }}>
          ← 나가기
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, color:'var(--ink-3)', marginBottom:4 }}>
            {progress} / {items.length} 답변 완료
          </div>
          <div style={{ height:6, background:'var(--parchment-3)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${(progress/items.length)*100}%`,
              background:'var(--gold)', borderRadius:3, transition:'width 0.3s' }}/>
          </div>
        </div>
        <button onClick={onSave}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8,
            background:'var(--parchment-2)', color:'var(--ink-3)', fontWeight:500, fontSize:13, cursor:'pointer' }}>
          <Save size={14}/> 저장
        </button>
      </div>

      {/* 문제 */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ maxWidth:480, width:'100%', textAlign:'center' }}>
          <div style={{ fontSize:13, color:'var(--ink-3)', marginBottom:20 }}>
            문제 {current+1} / {items.length}
          </div>

          {/* 한자 카드 */}
          <div style={{
            background:'white', borderRadius:20, padding:'40px 32px',
            boxShadow:'var(--shadow-lg)', marginBottom:28,
            border: answered===true ? '2px solid var(--green)' : answered===false ? '2px solid var(--red)' : '2px solid var(--parchment-3)'
          }}>
            <div style={{ fontSize:11, color:'var(--stone)', marginBottom:8 }}>
              #{hanja.id} {hanja.category && `· ${hanja.category}`}
            </div>
            <div className="hanja-char" style={{ fontSize:120, lineHeight:1, color:'var(--ink)', marginBottom:16 }}>
              {hanja.char}
            </div>

            {/* 정답 표시 */}
            {showAnswer ? (
              <div style={{ animation:'fadeIn 0.2s ease' }}>
                <div style={{ fontSize:28, fontWeight:700, color:'var(--ink)', marginBottom:4 }}>{hanja.meaning}</div>
                <div style={{ fontSize:22, color:'var(--ink-3)' }}>{hanja.reading}</div>
              </div>
            ) : (
              <button onClick={() => setShowAnswer(true)}
                style={{ padding:'10px 28px', borderRadius:12, background:'var(--gold)', color:'white',
                  fontWeight:600, fontSize:15, cursor:'pointer' }}>
                정답 보기
              </button>
            )}
          </div>

          {/* 정오 체크 버튼 */}
          {showAnswer && answered === null && (
            <div style={{ display:'flex', gap:16, justifyContent:'center', animation:'fadeIn 0.25s ease' }}>
              <button onClick={() => onMark(false)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 32px', borderRadius:12,
                  background:'var(--red-light)', color:'var(--red)', fontWeight:700, fontSize:16, cursor:'pointer',
                  border:'2px solid var(--red)' }}>
                <X size={20}/> 틀렸어요
              </button>
              <button onClick={() => onMark(true)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 32px', borderRadius:12,
                  background:'var(--green-light)', color:'var(--green)', fontWeight:700, fontSize:16, cursor:'pointer',
                  border:'2px solid var(--green)' }}>
                <Check size={20}/> 맞았어요
              </button>
            </div>
          )}

          {/* 이미 답변한 경우 */}
          {answered !== null && (
            <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
              <div style={{ padding:'8px 20px', borderRadius:12, fontWeight:600,
                background: answered ? 'var(--green-light)' : 'var(--red-light)',
                color: answered ? 'var(--green)' : 'var(--red)' }}>
                {answered ? '✓ 정답' : '✗ 오답'}
              </div>
              {current < items.length - 1 && (
                <button onClick={() => onMark === undefined ? null : { /* next handled in parent */ }}
                  style={{ display:'none' }}/>
              )}
            </div>
          )}

          {/* 이전 다음 */}
          <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:24 }}>
            <button onClick={() => onGoTo(-1)} disabled={current===0}
              style={{ display:'flex', alignItems:'center', gap:4, padding:'8px 16px', borderRadius:8,
                background:'var(--parchment-2)', color:'var(--ink-3)', fontSize:13, cursor:'pointer',
                opacity: current===0 ? 0.4 : 1 }}>
              <ChevronLeft size={16}/> 이전
            </button>
            <button onClick={() => onGoTo(1)} disabled={current===items.length-1}
              style={{ display:'flex', alignItems:'center', gap:4, padding:'8px 16px', borderRadius:8,
                background:'var(--parchment-2)', color:'var(--ink-3)', fontSize:13, cursor:'pointer',
                opacity: current===items.length-1 ? 0.4 : 1 }}>
              다음 <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 결과 화면 ─────────────────────────────────────────────────────
function ResultScreen({ test, onNew, onHistory }) {
  const { items, answers, score, total } = test
  const pct = Math.round((score/total)*100)
  const grade = pct >= 90 ? '🏆 완벽해요!' : pct >= 70 ? '👏 잘했어요!' : pct >= 50 ? '📚 더 노력해요' : '💪 다시 도전!'

  return (
    <div style={{ maxWidth:560, margin:'40px auto', padding:'0 24px', textAlign:'center' }}>
      <div style={{ background:'white', borderRadius:20, padding:40, boxShadow:'var(--shadow-lg)', marginBottom:20 }}>
        <div style={{ fontSize:48, marginBottom:12 }}>
          {pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 50 ? '📖' : '💪'}
        </div>
        <div style={{ fontFamily:'Noto Serif KR', fontSize:32, fontWeight:700, color:'var(--ink)', marginBottom:4 }}>
          {pct}점
        </div>
        <div style={{ fontSize:18, color:'var(--ink-3)', marginBottom:24 }}>{grade}</div>

        <div style={{ display:'flex', gap:16, justifyContent:'center', marginBottom:32 }}>
          <div style={{ background:'var(--green-light)', borderRadius:12, padding:'12px 24px' }}>
            <div style={{ fontSize:24, fontWeight:700, color:'var(--green)' }}>{score}</div>
            <div style={{ fontSize:12, color:'var(--green)' }}>정답</div>
          </div>
          <div style={{ background:'var(--red-light)', borderRadius:12, padding:'12px 24px' }}>
            <div style={{ fontSize:24, fontWeight:700, color:'var(--red)' }}>{total-score}</div>
            <div style={{ fontSize:12, color:'var(--red)' }}>오답</div>
          </div>
          <div style={{ background:'var(--parchment-2)', borderRadius:12, padding:'12px 24px' }}>
            <div style={{ fontSize:24, fontWeight:700, color:'var(--ink)' }}>{total}</div>
            <div style={{ fontSize:12, color:'var(--ink-3)' }}>전체</div>
          </div>
        </div>

        {/* 오답 목록 */}
        {items.filter((_, i) => answers[i] === false).length > 0 && (
          <div style={{ textAlign:'left', marginBottom:24 }}>
            <div style={{ fontWeight:600, marginBottom:12, color:'var(--ink)' }}>오답 한자</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {items.filter((_, i) => answers[i] === false).map(h => (
                <div key={h.docId} style={{ background:'var(--red-light)', borderRadius:8, padding:'6px 12px', fontSize:13 }}>
                  <span className="hanja-char" style={{ fontSize:20, marginRight:6 }}>{h.char}</span>
                  <span style={{ color:'var(--ink-3)' }}>{h.meaning} {h.reading}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          <button onClick={onNew}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 28px', borderRadius:12,
              background:'var(--ink)', color:'white', fontWeight:700, fontSize:15, cursor:'pointer' }}>
            <RotateCcw size={16}/> 새 테스트
          </button>
          <button onClick={onHistory}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 28px', borderRadius:12,
              background:'var(--parchment-2)', color:'var(--ink-2)', fontWeight:600, fontSize:15, cursor:'pointer' }}>
            <Trophy size={16}/> 기록 보기
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 기록 화면 ─────────────────────────────────────────────────────
function HistoryScreen({ tests, onBack, onDelete }) {
  return (
    <div style={{ maxWidth:560, margin:'40px auto', padding:'0 24px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <button onClick={onBack}
          style={{ padding:'6px 12px', borderRadius:8, background:'var(--parchment-2)', color:'var(--ink-3)', fontSize:13, cursor:'pointer' }}>
          ← 돌아가기
        </button>
        <h2 style={{ fontFamily:'Noto Serif KR', fontSize:22, color:'var(--ink)' }}>테스트 기록</h2>
      </div>

      {tests.length === 0 ? (
        <div style={{ textAlign:'center', color:'var(--ink-3)', paddingTop:60 }}>
          아직 완료한 테스트가 없습니다
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {tests.map((t, i) => {
            const pct = Math.round((t.score/t.total)*100)
            return (
              <div key={t.docId} style={{ background:'white', borderRadius:12, padding:'16px 20px',
                boxShadow:'var(--shadow)', display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:48, height:48, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
                  background: pct>=80 ? 'var(--green-light)' : pct>=60 ? 'var(--gold-light)' : 'var(--red-light)',
                  color: pct>=80 ? 'var(--green)' : pct>=60 ? 'var(--gold)' : 'var(--red)',
                  fontWeight:700, fontSize:16 }}>
                  {pct}%
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, color:'var(--ink)', fontSize:15 }}>
                    {t.score} / {t.total} 정답
                  </div>
                  <div style={{ fontSize:12, color:'var(--ink-3)' }}>
                    {new Date(t.completedAt).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
                <button onClick={() => onDelete(t.docId)}
                  style={{ padding:8, borderRadius:8, background:'var(--parchment-2)', color:'var(--ink-3)', cursor:'pointer' }}>
                  <Trash2 size={14}/>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
