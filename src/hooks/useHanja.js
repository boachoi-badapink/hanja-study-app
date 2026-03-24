// src/hooks/useHanja.js
import { useState, useEffect, useCallback } from 'react'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, where, writeBatch, serverTimestamp, getDoc
} from 'firebase/firestore'
import { db } from '../firebase.js'

const COLLECTION = 'hanja'
const PROGRESS_COLLECTION = 'progress'

// ── 한자 목록 불러오기 ──────────────────────────────────────
export function useHanjaList(categoryFilter = null) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      let q = query(collection(db, COLLECTION), orderBy('id'))
      if (categoryFilter) {
        q = query(collection(db, COLLECTION), where('category', '==', categoryFilter), orderBy('id'))
      }
      const snap = await getDocs(q)
      setList(snap.docs.map(d => ({ docId: d.id, ...d.data() })))
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [categoryFilter])

  useEffect(() => { fetch() }, [fetch])

  return { list, loading, refetch: fetch }
}

// ── 한자 추가 ────────────────────────────────────────────────
export async function addHanja(data) {
  // id 자동 채번: 기존 최대 id + 1
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('id', 'desc')))
  const maxId = snap.empty ? 0 : snap.docs[0].data().id
  return addDoc(collection(db, COLLECTION), {
    ...data,
    id: maxId + 1,
    createdAt: serverTimestamp()
  })
}

// ── 한자 대량 추가 (배치) ────────────────────────────────────
export async function addHanjaBatch(items) {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('id', 'desc')))
  const maxId = snap.empty ? 0 : snap.docs[0].data().id
  const batch = writeBatch(db)
  items.forEach((item, i) => {
    const ref = doc(collection(db, COLLECTION))
    batch.set(ref, { ...item, id: maxId + i + 1, createdAt: serverTimestamp() })
  })
  return batch.commit()
}

// ── 한자 수정 ────────────────────────────────────────────────
export async function updateHanja(docId, data) {
  return updateDoc(doc(db, COLLECTION, docId), data)
}

// ── 한자 삭제 ────────────────────────────────────────────────
export async function deleteHanja(docId) {
  return deleteDoc(doc(db, COLLECTION, docId))
}

// ── 카테고리 목록 ─────────────────────────────────────────────
export async function getCategories() {
  const snap = await getDocs(collection(db, COLLECTION))
  const cats = new Set()
  snap.docs.forEach(d => { if (d.data().category) cats.add(d.data().category) })
  return [...cats].sort()
}

// ── 학습 진도 (외웠는지 여부) ─────────────────────────────────
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
  const snap = await getDocs(query(collection(db, TESTS_COLLECTION), orderBy('createdAt', 'desc')))
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
