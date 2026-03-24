// src/hooks/useHanja.js
import { useState, useEffect, useCallback } from 'react'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, where, writeBatch, serverTimestamp
} from 'firebase/firestore'
import { db } from '../firebase.js'

const COLLECTION = 'hanja'
const PROGRESS_COLLECTION = 'progress'

// ── 한자 전체 목록 (항상 전체를 불러와서 클라이언트에서 필터) ──────
export function useHanjaList() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, COLLECTION), orderBy('id')))
      setList(snap.docs.map(d => ({ docId: d.id, ...d.data() })))
    } catch (e) {
      console.error('useHanjaList error:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { list, loading, refetch: fetchAll }
}

// ── 한자 추가 ────────────────────────────────────────────────
export async function addHanja(data) {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('id', 'desc')))
  const maxId = snap.empty ? 0 : snap.docs[0].data().id
  return addDoc(collection(db, COLLECTION), {
    ...data,
    id: maxId + 1,
    createdAt: serverTimestamp()
  })
}

// ── 한자 대량 추가 (배치, 500개씩 나눠서) ───────────────────
export async function addHanjaBatch(items) {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('id', 'desc')))
  const maxId = snap.empty ? 0 : snap.docs[0].data().id

  // 500개씩 청크로 나눠서 처리
  for (let chunkStart = 0; chunkStart < items.length; chunkStart += 490) {
    const chunk = items.slice(chunkStart, chunkStart + 490)
    const batch = writeBatch(db)
    chunk.forEach((item, i) => {
      const ref = doc(collection(db, COLLECTION))
      batch.set(ref, {
        char: item.char || '',
        meaning: item.meaning || '',
        reading: item.reading || '',
        category: item.category || '',
        id: maxId + chunkStart + i + 1,
        createdAt: serverTimestamp()
      })
    })
    await batch.commit()
  }
}

// ── 한자 수정 ────────────────────────────────────────────────
export async function updateHanja(docId, data) {
  return updateDoc(doc(db, COLLECTION, docId), data)
}

// ── 한자 개별 삭제 ───────────────────────────────────────────
export async function deleteHanja(docId) {
  return deleteDoc(doc(db, COLLECTION, docId))
}

// ── 분류별 삭제 (category=null이면 전체 삭제) ─────────────────
// where 쿼리 대신 전체 불러와서 클라이언트에서 필터 후 삭제
export async function deleteByCategory(category) {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('id')))
  const toDelete = category
    ? snap.docs.filter(d => d.data().category === category)
    : snap.docs

  if (toDelete.length === 0) return

  // 500개씩 배치 삭제
  for (let i = 0; i < toDelete.length; i += 490) {
    const chunk = toDelete.slice(i, i + 490)
    const batch = writeBatch(db)
    chunk.forEach(d => batch.delete(doc(db, COLLECTION, d.id)))
    await batch.commit()
  }
}

// ── 카테고리 목록 ─────────────────────────────────────────────
export async function getCategories() {
  const snap = await getDocs(collection(db, COLLECTION))
  const cats = new Set()
  snap.docs.forEach(d => {
    const cat = d.data().category?.trim()
    if (cat) cats.add(cat)
  })
  return [...cats].sort()
}

// ── 번호 재정렬 ───────────────────────────────────────────────
export async function renumberAll() {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('id')))
  for (let i = 0; i < snap.docs.length; i += 490) {
    const chunk = snap.docs.slice(i, i + 490)
    const batch = writeBatch(db)
    chunk.forEach((d, j) => batch.update(doc(db, COLLECTION, d.id), { id: i + j + 1 }))
    await batch.commit()
  }
}

// ── 학습 진도 ─────────────────────────────────────────────────
export async function getProgress() {
  const snap = await getDocs(collection(db, PROGRESS_COLLECTION))
  const map = {}
  snap.docs.forEach(d => { map[d.data().hanjaId] = { docId: d.id, ...d.data() } })
  return map
}

export async function setMemorized(hanjaId, memorized) {
  const snap = await getDocs(query(collection(db, PROGRESS_COLLECTION), where('hanjaId', '==', hanjaId)))
  if (snap.empty) {
    return addDoc(collection(db, PROGRESS_COLLECTION), { hanjaId, memorized })
  } else {
    return updateDoc(doc(db, PROGRESS_COLLECTION, snap.docs[0].id), { memorized })
  }
}

// ── 테스트 저장/불러오기 ──────────────────────────────────────
const TESTS_COLLECTION = 'tests'

export async function saveTest(testData) {
  if (!testData.docId) {
    return addDoc(collection(db, TESTS_COLLECTION), { ...testData, createdAt: serverTimestamp() })
  } else {
    return updateDoc(doc(db, TESTS_COLLECTION, testData.docId), { ...testData, updatedAt: serverTimestamp() })
  }
}

export async function getTests() {
  const snap = await getDocs(query(collection(db, TESTS_COLLECTION), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ docId: d.id, ...d.data() }))
}

export async function deleteTest(docId) {
  return deleteDoc(doc(db, TESTS_COLLECTION, docId))
}
