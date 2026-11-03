'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPlaceholderWorkspace } from './empty'
import type {
  AcademicYear,
  AnnouncementInput,
  AssignmentInput,
  AttendanceInput,
  ClassRoom,
  CourseInput,
  Exam,
  ExamInput,
  ImportRowError,
  Language,
  LibraryResourceInput,
  Notification,
  NotificationInput,
  ParsedStudentRow,
  Role,
  SchoolData,
  SchoolSettings,
  Session,
  Student,
  StudentInput,
  ThemeMode,
  User,
} from './types'
import { canAccess, homePageFor, type PageId } from './engine'

const PREF_KEY = 'st-george:prefs:v1'

export interface ImportResult {
  ok: boolean
  imported: number
  errors: ImportRowError[]
}

interface SchoolContextValue {
  data: SchoolData
  ready: boolean
  setupRequired: boolean
  user: User | null
  session: Session | null
  lang: Language
  theme: ThemeMode
  setLang: (lang: Language) => void
  setTheme: (theme: ThemeMode) => void
  login: (email: string, password: string, role: Role) => Promise<{ ok: boolean; error?: string; home?: PageId }>
  logout: () => Promise<void>
  refreshWorkspace: () => Promise<void>
  can: (page: PageId) => boolean

  // CRUD Mutations — synced with SQLite backend
  addStudent: (input: StudentInput) => Promise<{ ok: boolean; error?: string; student?: Student }>
  updateStudent: (id: string, patch: Partial<Student>) => Promise<void>
  addClass: (input: Partial<ClassRoom> & { gradeLevel: number; section: string }) => Promise<{ ok: boolean; error?: string; cls?: ClassRoom }>
  addSubject: (input: { code: string; nameAr: string; nameEn: string; color: string }) => Promise<{ ok: boolean; error?: string }>
  saveAttendance: (classId: string, date: string, session: string, records: AttendanceInput[]) => Promise<{ ok: boolean; saved: number }>
  createExam: (input: ExamInput) => Promise<{ ok: boolean; error?: string; exam?: Exam }>
  saveGrades: (examId: string, entries: Array<{ studentId: string; score: number; comment?: string }>) => Promise<{ ok: boolean; error?: string; saved: number }>
  addCourse: (input: CourseInput) => Promise<{ ok: boolean; error?: string }>
  addLesson: (input: any) => Promise<{ ok: boolean; error?: string }>
  createHomework: (input: AssignmentInput) => Promise<{ ok: boolean; error?: string }>
  submitHomework: (homeworkId: string, studentId: string, fileName: string, fileUrl?: string) => Promise<void>
  createAnnouncement: (input: AnnouncementInput) => Promise<{ ok: boolean; error?: string }>
  createEvent: (input: any) => Promise<{ ok: boolean; error?: string }>
  addLibraryResource: (input: LibraryResourceInput) => Promise<{ ok: boolean; error?: string }>
  addUser: (input: { nameAr: string; nameEn: string; email: string; phone: string; role: Role; password: string; department?: string; title?: string; classId?: string; subjectIds?: string[] }) => Promise<{ ok: boolean; error?: string }>
  toggleUserStatus: (id: string) => Promise<{ ok: boolean; error?: string }>
  resetUserPassword: (id: string, newPass: string) => Promise<{ ok: boolean; error?: string }>
  updateSettings: (patch: Partial<SchoolSettings>) => Promise<void>
  updateCMS: (patch: any) => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  addNotification: (input: NotificationInput) => Promise<{ ok: boolean; error?: string }>
  search: (query: string) => Array<{ type: 'student' | 'class' | 'teacher' | 'exam' | 'course' | 'library'; id: string; labelAr: string; labelEn: string; metaAr: string; metaEn: string }>

  // Legacy / compatibility methods expected by page components
  updateClass: (id: string, patch: Partial<ClassRoom>) => Promise<{ ok: boolean; error?: string }>
  removeClass: (id: string) => Promise<{ ok: boolean; error?: string }>
  addTeacher: (input: { nameAr: string; nameEn: string; email: string; phone: string; subjectIds?: string[]; classIds?: string[] }) => Promise<{ ok: boolean; error?: string }>
  updateTeacherClasses: (classIds: string[]) => Promise<{ ok: boolean; error?: string }>
  publishExam: (examId: string, published: boolean) => Promise<{ ok: boolean; error?: string }>
  deleteExam: (examId: string) => Promise<{ ok: boolean; error?: string }>
  updateExam: (examId: string, patch: Partial<Exam>) => Promise<{ ok: boolean; error?: string }>
  archiveStudent: (studentId: string) => Promise<{ ok: boolean; error?: string }>
  restoreStudent: (studentId: string) => Promise<{ ok: boolean; error?: string }>
  transferStudent: (studentId: string, newClassId: string) => Promise<{ ok: boolean; error?: string }>
  importStudents: (rows: ParsedStudentRow[]) => Promise<{ ok: boolean; imported: number; errors: ImportRowError[] }>
  resolveClassName: (nameEn: string) => ClassRoom | undefined
  setAlertStatus: (alertId: string, status: string) => Promise<{ ok: boolean }>
  runAiDiagnostics: () => Promise<{ ok: boolean }>
  updateAcademicYear: (id: string, patch: Partial<AcademicYear>) => Promise<void>
  updateUser: (id: string, patch: Partial<User>) => Promise<{ ok: boolean; error?: string }>
  deleteNotification: (id: string) => Promise<void>
  resetDemoData: () => Promise<void>
}

const SchoolContext = createContext<SchoolContextValue | null>(null)

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SchoolData>(createPlaceholderWorkspace())
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [setupRequired, setSetupRequired] = useState(false)
  const [lang, setLangState] = useState<Language>('ar')
  const [theme, setThemeState] = useState<ThemeMode>('light')

  // Read stored language and theme preferences
  useEffect(() => {
    try {
      const rawPrefs = localStorage.getItem(PREF_KEY)
      if (rawPrefs) {
        const prefs = JSON.parse(rawPrefs) as { lang?: Language; theme?: ThemeMode }
        if (prefs.lang) setLangState(prefs.lang)
        if (prefs.theme) setThemeState(prefs.theme)
      }
    } catch {
      // ignore
    }
  }, [])

  const setLang = useCallback((nextLang: Language) => {
    setLangState(nextLang)
    try {
      const existing = JSON.parse(localStorage.getItem(PREF_KEY) || '{}')
      localStorage.setItem(PREF_KEY, JSON.stringify({ ...existing, lang: nextLang }))
    } catch {
      // ignore
    }
    document.documentElement.setAttribute('lang', nextLang)
    document.documentElement.setAttribute('dir', nextLang === 'ar' ? 'rtl' : 'ltr')
  }, [])

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme)
    try {
      const existing = JSON.parse(localStorage.getItem(PREF_KEY) || '{}')
      localStorage.setItem(PREF_KEY, JSON.stringify({ ...existing, theme: nextTheme }))
    } catch {
      // ignore
    }
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Sync session on mount from real SQLite backend
  const refreshWorkspace = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' })
      const json = await res.json()
      if (json.setupRequired) {
        setSetupRequired(true)
        setUser(null)
        setData(createPlaceholderWorkspace())
      } else if (json.authenticated && json.workspace) {
        setSetupRequired(false)
        setUser(json.user)
        setData(json.workspace)
        setSession({ userId: json.user.id, loggedInAt: new Date().toISOString() })
      } else {
        setSetupRequired(false)
        setUser(null)
        setSession(null)
        if (json.school) {
          setData(prev => ({
            ...prev,
            settings: {
              ...prev.settings,
              schoolNameAr: json.school.nameAr || prev.settings.schoolNameAr,
              schoolNameEn: json.school.nameEn || prev.settings.schoolNameEn,
            },
          }))
        }
      }
    } catch (e) {
      console.error('Failed to load session from server:', e)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    refreshWorkspace()
  }, [refreshWorkspace])

  // Login handler connected to /api/auth/login
  const login = useCallback(async (email: string, password: string, role: Role) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error || 'login_failed' }
      }
      setUser(json.user)
      setData(json.workspace)
      setSession({ userId: json.user.id, loggedInAt: new Date().toISOString() })
      setSetupRequired(false)
      return { ok: true, home: json.home }
    } catch {
      return { ok: false, error: 'network_error' }
    }
  }, [])

  // Logout handler connected to /api/auth/logout
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    setUser(null)
    setSession(null)
    window.location.hash = ''
  }, [])

  // Generic mutation runner calling /api/workspace
  const mutate = useCallback(async (action: string, payload: any) => {
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      })
      const json = await res.json()
      if (res.ok && json.ok && json.workspace) {
        setData(json.workspace)
        return { ok: true, ...json.result }
      }
      return { ok: false, error: json.error || 'mutation_failed' }
    } catch {
      return { ok: false, error: 'network_error' }
    }
  }, [])

  const can = useCallback((page: PageId) => {
    return user ? canAccess(user.role, page) : false
  }, [user])

  /* ── Mutation wrappers ─────────────────────────────────────────────── */

  const addStudent = useCallback(async (input: StudentInput) => {
    const res = await mutate('add_student', input)
    return { ok: res.ok, error: res.error, student: res.student }
  }, [mutate])

  const updateStudent = useCallback(async (id: string, patch: Partial<Student>) => {
    await mutate('update_student', { id, patch })
  }, [mutate])

  const addClass = useCallback(async (input: Partial<ClassRoom> & { gradeLevel: number; section: string }) => {
    const res = await mutate('add_class', input)
    return { ok: res.ok, error: res.error, cls: res.class }
  }, [mutate])

  const addSubject = useCallback(async (input: { code: string; nameAr: string; nameEn: string; color: string }) => {
    const res = await mutate('add_subject', input)
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const saveAttendance = useCallback(async (classId: string, date: string, session: string, records: AttendanceInput[]) => {
    const res = await mutate('save_attendance', { classId, date, session, records })
    return { ok: res.ok, saved: res.saved || 0 }
  }, [mutate])

  const createExam = useCallback(async (input: ExamInput) => {
    const res = await mutate('create_exam', input)
    return { ok: res.ok, error: res.error, exam: res.exam }
  }, [mutate])

  const saveGrades = useCallback(async (examId: string, entries: Array<{ studentId: string; score: number; comment?: string }>) => {
    const res = await mutate('save_grades', { examId, entries })
    return { ok: res.ok, error: res.error, saved: res.saved || 0 }
  }, [mutate])

  const addCourse = useCallback(async (input: CourseInput) => {
    const res = await mutate('add_course', input)
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const addLesson = useCallback(async (input: any) => {
    const res = await mutate('add_lesson', input)
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const createHomework = useCallback(async (input: AssignmentInput) => {
    const res = await mutate('create_homework', input)
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const submitHomework = useCallback(async (homeworkId: string, studentId: string, fileName: string, fileUrl?: string) => {
    await mutate('submit_homework', { homeworkId, studentId, fileName, fileUrl })
  }, [mutate])

  const createAnnouncement = useCallback(async (input: AnnouncementInput) => {
    const res = await mutate('create_announcement', input)
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const createEvent = useCallback(async (input: any) => {
    const res = await mutate('create_event', input)
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const addLibraryResource = useCallback(async (input: LibraryResourceInput) => {
    const res = await mutate('add_library_resource', input)
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const addUser = useCallback(async (input: { nameAr: string; nameEn: string; email: string; phone: string; role: Role; password: string; department?: string; title?: string; classId?: string; subjectIds?: string[] }) => {
    const res = await mutate('add_user', input)
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const toggleUserStatus = useCallback(async (id: string) => {
    const res = await mutate('toggle_user_status', { id })
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const resetUserPassword = useCallback(async (id: string, newPass: string) => {
    const res = await mutate('reset_user_password', { id, newPassword: newPass })
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const updateSettings = useCallback(async (patch: Partial<SchoolSettings>) => {
    await mutate('update_settings', patch)
  }, [mutate])

  const updateCMS = useCallback(async (patch: any) => {
    await mutate('update_cms', patch)
  }, [mutate])

  const markNotificationRead = useCallback(async (id: string) => {
    await mutate('mark_notification_read', { id })
  }, [mutate])

  const markAllNotificationsRead = useCallback(async () => {
    await mutate('mark_all_notifications_read', {})
  }, [mutate])

  const addNotification = useCallback(async (input: NotificationInput) => {
    const res = await mutate('create_notification', input)
    return { ok: res.ok, error: res.error }
  }, [mutate])

  /* ── Additional Mutations ──────────────────────────────────────────── */

  const updateClass = useCallback(async (id: string, patch: Partial<ClassRoom>) => {
    const res = await mutate('update_class', { id, patch })
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const removeClass = useCallback(async (id: string) => {
    const res = await mutate('remove_class', { id })
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const addTeacher = useCallback(async (input: { nameAr: string; nameEn: string; email: string; phone: string; subjectIds?: string[]; classIds?: string[] }) => {
    const res = await mutate('add_teacher', input)
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const updateTeacherClasses = useCallback(async (classIds: string[]) => {
    const res = await mutate('update_teacher_classes', { classIds })
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const publishExam = useCallback(async (examId: string, published: boolean) => {
    const res = await mutate('publish_exam', { examId, published })
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const deleteExam = useCallback(async (examId: string) => {
    const res = await mutate('delete_exam', { examId })
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const updateExam = useCallback(async (examId: string, patch: Partial<Exam>) => {
    const res = await mutate('update_exam', { examId, patch })
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const archiveStudent = useCallback(async (studentId: string) => {
    const res = await mutate('archive_student', { studentId })
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const restoreStudent = useCallback(async (studentId: string) => {
    const res = await mutate('restore_student', { studentId })
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const transferStudent = useCallback(async (studentId: string, newClassId: string) => {
    const res = await mutate('transfer_student', { studentId, newClassId })
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const importStudents = useCallback(async (rows: ParsedStudentRow[]) => {
    const res = await mutate('import_students', { rows })
    return { ok: res.ok, imported: res.imported ?? 0, errors: res.errors ?? [] }
  }, [mutate])

  const resolveClassName = useCallback((nameEn: string): ClassRoom | undefined => {
    return data.classes.find(c =>
      c.nameEn.toLowerCase().trim() === nameEn.toLowerCase().trim() ||
      c.nameAr.trim() === nameEn.trim()
    )
  }, [data.classes])

  const setAlertStatus = useCallback(async (alertId: string, status: string) => {
    const res = await mutate('set_alert_status', { alertId, status })
    return { ok: res.ok }
  }, [mutate])

  const runAiDiagnostics = useCallback(async () => {
    const res = await mutate('run_ai_diagnostics', {})
    return { ok: res.ok }
  }, [mutate])

  const updateAcademicYear = useCallback(async (id: string, patch: Partial<AcademicYear>) => {
    await mutate('update_academic_year', { id, patch })
  }, [mutate])

  const updateUser = useCallback(async (id: string, patch: Partial<User>) => {
    const res = await mutate('update_user', { id, patch })
    return { ok: res.ok, error: res.error }
  }, [mutate])

  const deleteNotification = useCallback(async (id: string) => {
    await mutate('delete_notification', { id })
  }, [mutate])

  const resetDemoData = useCallback(async () => {
    // No-op in production — demo data reset is not permitted
    console.warn('resetDemoData called — this is disabled in production')
  }, [])

  const search = useCallback((query: string) => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const results: Array<{ type: 'student' | 'class' | 'teacher' | 'exam' | 'course' | 'library'; id: string; labelAr: string; labelEn: string; metaAr: string; metaEn: string }> = []

    for (const s of data.students || []) {
      if (s.nameAr.toLowerCase().includes(q) || s.nameEn.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q)) {
        results.push({ type: 'student', id: s.id, labelAr: s.nameAr, labelEn: s.nameEn, metaAr: `طالب (${s.studentId})`, metaEn: `Student (${s.studentId})` })
      }
    }
    for (const c of data.classes || []) {
      if (c.nameAr.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.room.toLowerCase().includes(q)) {
        results.push({ type: 'class', id: c.id, labelAr: c.nameAr, labelEn: c.nameEn, metaAr: `فصل - قاعة ${c.room}`, metaEn: `Class - Room ${c.room}` })
      }
    }
    for (const t of data.teachers || []) {
      if (t.nameAr.toLowerCase().includes(q) || t.nameEn.toLowerCase().includes(q) || t.employeeNo.toLowerCase().includes(q)) {
        results.push({ type: 'teacher', id: t.id, labelAr: t.nameAr, labelEn: t.nameEn, metaAr: `معلم (${t.employeeNo})`, metaEn: `Teacher (${t.employeeNo})` })
      }
    }
    for (const crs of data.courses || []) {
      if (crs.titleAr.toLowerCase().includes(q) || crs.titleEn.toLowerCase().includes(q) || crs.code.toLowerCase().includes(q)) {
        results.push({ type: 'course', id: crs.id, labelAr: crs.titleAr, labelEn: crs.titleEn, metaAr: `مقرر (${crs.code})`, metaEn: `Course (${crs.code})` })
      }
    }
    for (const lib of data.libraryResources || []) {
      if (lib.titleAr.toLowerCase().includes(q) || lib.titleEn.toLowerCase().includes(q) || lib.author.toLowerCase().includes(q)) {
        results.push({ type: 'library', id: lib.id, labelAr: lib.titleAr, labelEn: lib.titleEn, metaAr: `مكتبة - ${lib.author}`, metaEn: `Library - ${lib.author}` })
      }
    }
    return results.slice(0, 10)
  }, [data])

  const contextValue = useMemo(() => ({
    data,
    ready,
    setupRequired,
    user,
    session,
    lang,
    theme,
    setLang,
    setTheme,
    login,
    logout,
    refreshWorkspace,
    can,
    addStudent,
    updateStudent,
    addClass,
    addSubject,
    saveAttendance,
    createExam,
    saveGrades,
    addCourse,
    addLesson,
    createHomework,
    submitHomework,
    createAnnouncement,
    createEvent,
    addLibraryResource,
    addUser,
    toggleUserStatus,
    resetUserPassword,
    updateSettings,
    updateCMS,
    markNotificationRead,
    markAllNotificationsRead,
    addNotification,
    search,
    updateClass,
    removeClass,
    addTeacher,
    updateTeacherClasses,
    publishExam,
    deleteExam,
    updateExam,
    archiveStudent,
    restoreStudent,
    transferStudent,
    importStudents,
    resolveClassName,
    setAlertStatus,
    runAiDiagnostics,
    updateAcademicYear,
    updateUser,
    deleteNotification,
    resetDemoData,
  }), [
    data,
    ready,
    setupRequired,
    user,
    session,
    lang,
    theme,
    setLang,
    setTheme,
    login,
    logout,
    refreshWorkspace,
    can,
    addStudent,
    updateStudent,
    addClass,
    addSubject,
    saveAttendance,
    createExam,
    saveGrades,
    addCourse,
    addLesson,
    createHomework,
    submitHomework,
    createAnnouncement,
    createEvent,
    addLibraryResource,
    addUser,
    toggleUserStatus,
    resetUserPassword,
    updateSettings,
    updateCMS,
    markNotificationRead,
    markAllNotificationsRead,
    addNotification,
    search,
    updateClass,
    removeClass,
    addTeacher,
    updateTeacherClasses,
    publishExam,
    deleteExam,
    updateExam,
    archiveStudent,
    restoreStudent,
    transferStudent,
    importStudents,
    resolveClassName,
    setAlertStatus,
    runAiDiagnostics,
    updateAcademicYear,
    updateUser,
    deleteNotification,
    resetDemoData,
  ])

  return (
    <SchoolContext.Provider value={contextValue}>
      {children}
    </SchoolContext.Provider>
  )
}

export function useSchool() {
  const ctx = useContext(SchoolContext)
  if (!ctx) throw new Error('useSchool must be used within a SchoolProvider')
  return ctx
}
