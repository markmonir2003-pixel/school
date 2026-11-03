'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  FileUp,
  FileDown,
  History,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Filter,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Users,
  Award,
  Calendar,
  BookOpen,
  GraduationCap,
  Sparkles,
  HelpCircle,
  Eye,
  RefreshCw,
  Info,
  CalendarDays,
  SlidersHorizontal,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { cn } from '@/lib/utils'
import { useSchool } from '@/lib/school/store'
import {
  attendanceRate,
  className as classLabel,
  formatDate,
  gradeAverage,
  gradeGpa,
  subjectName,
  teacherName,
  userName,
} from '@/lib/school/engine'
import type { ImportRowError, ParsedStudentRow } from '@/lib/school/types'
import {
  downloadStudentTemplate,
  exportRowsToCsv,
  exportRowsToXlsx,
  parseAttendanceWorkbook,
  parseGradeWorkbook,
  parseStudentWorkbook,
  parseTeacherWorkbook,
  printPdf,
  htmlTable,
  escapeHtml,
  type ParsedAttendanceRow,
  type ParsedGradeRow,
  type ParsedTeacherRow,
} from '@/lib/school/excel'

export type DataType = 'students' | 'grades' | 'attendance' | 'teachers' | 'schedule'

export interface HistoryItem {
  id: string
  type: 'import' | 'export'
  dataType: DataType
  fileName: string
  recordsCount: number
  at: string
  status: 'success' | 'partial' | 'failed' | 'processing'
  userEn: string
  userAr: string
  format?: 'xlsx' | 'csv' | 'pdf'
  errors?: string[]
}

interface ExportField {
  key: string
  labelAr: string
  labelEn: string
}

const EXPORT_SCHEMAS: Record<DataType, ExportField[]> = {
  students: [
    { key: 'studentId', labelAr: 'الرقم الأكاديمي', labelEn: 'Student ID' },
    { key: 'nameAr', labelAr: 'الاسم بالعربية', labelEn: 'Arabic Name' },
    { key: 'nameEn', labelAr: 'الاسم بالإنجليزية', labelEn: 'English Name' },
    { key: 'gender', labelAr: 'الجنس', labelEn: 'Gender' },
    { key: 'dob', labelAr: 'تاريخ الميلاد', labelEn: 'Date of Birth' },
    { key: 'gradeLevel', labelAr: 'الصف', labelEn: 'Grade' },
    { key: 'className', labelAr: 'الفصل', labelEn: 'Class' },
    { key: 'guardian', labelAr: 'ولي الأمر', labelEn: 'Guardian' },
    { key: 'phone', labelAr: 'هاتف ولي الأمر', labelEn: 'Guardian Phone' },
    { key: 'email', labelAr: 'البريد الإلكتروني', labelEn: 'Email' },
    { key: 'gpa', labelAr: 'المعدل', labelEn: 'GPA' },
    { key: 'attendanceRate', labelAr: 'نسبة الحضور', labelEn: 'Attendance' },
    { key: 'status', labelAr: 'الحالة', labelEn: 'Status' },
    { key: 'enrolledAt', labelAr: 'تاريخ التسجيل', labelEn: 'Enrolled At' },
  ],
  grades: [
    { key: 'studentId', labelAr: 'الرقم الأكاديمي', labelEn: 'Student ID' },
    { key: 'studentName', labelAr: 'اسم الطالب', labelEn: 'Student Name' },
    { key: 'exam', labelAr: 'الاختبار', labelEn: 'Exam' },
    { key: 'subject', labelAr: 'المادة', labelEn: 'Subject' },
    { key: 'className', labelAr: 'الفصل', labelEn: 'Class' },
    { key: 'score', labelAr: 'الدرجة', labelEn: 'Score' },
    { key: 'maxMarks', labelAr: 'الدرجة العظمى', labelEn: 'Max Marks' },
    { key: 'percentage', labelAr: 'النسبة', labelEn: 'Percentage' },
    { key: 'date', labelAr: 'التاريخ', labelEn: 'Date' },
    { key: 'comment', labelAr: 'ملاحظة', labelEn: 'Comment' },
  ],
  attendance: [
    { key: 'date', labelAr: 'التاريخ', labelEn: 'Date' },
    { key: 'studentId', labelAr: 'الرقم الأكاديمي', labelEn: 'Student ID' },
    { key: 'studentName', labelAr: 'اسم الطالب', labelEn: 'Student Name' },
    { key: 'className', labelAr: 'الفصل', labelEn: 'Class' },
    { key: 'session', labelAr: 'الحصة', labelEn: 'Session' },
    { key: 'status', labelAr: 'الحالة', labelEn: 'Status' },
    { key: 'note', labelAr: 'ملاحظة', labelEn: 'Note' },
    { key: 'recordedBy', labelAr: 'سجّلها', labelEn: 'Recorded By' },
  ],
  teachers: [
    { key: 'employeeNo', labelAr: 'الرقم الوظيفي', labelEn: 'Employee No' },
    { key: 'nameAr', labelAr: 'الاسم بالعربية', labelEn: 'Arabic Name' },
    { key: 'nameEn', labelAr: 'الاسم بالإنجليزية', labelEn: 'English Name' },
    { key: 'email', labelAr: 'البريد الإلكتروني', labelEn: 'Email' },
    { key: 'phone', labelAr: 'الهاتف', labelEn: 'Phone' },
    { key: 'subjects', labelAr: 'المواد', labelEn: 'Subjects' },
    { key: 'classes', labelAr: 'الفصول', labelEn: 'Classes' },
    { key: 'status', labelAr: 'الحالة', labelEn: 'Status' },
  ],
  schedule: [
    { key: 'className', labelAr: 'الفصل', labelEn: 'Class' },
    { key: 'gradeLevel', labelAr: 'الصف', labelEn: 'Grade' },
    { key: 'subject', labelAr: 'المادة', labelEn: 'Subject' },
    { key: 'teacher', labelAr: 'المعلم', labelEn: 'Teacher' },
    { key: 'homeroomTeacher', labelAr: 'رائد الفصل', labelEn: 'Homeroom Teacher' },
    { key: 'studentCount', labelAr: 'عدد الطلاب', labelEn: 'Students' },
  ],
}

const HISTORY_KEY = 'smart-school-360:import-export-history:v1'

function allFields(type: DataType): Record<string, boolean> {
  return Object.fromEntries(EXPORT_SCHEMAS[type].map(field => [field.key, true]))
}

function readHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function ImportExportPage({ arabic = false }: { arabic?: boolean }) {
  const { data, user, lang, importStudents, saveGrades, saveAttendance, addTeacher } = useSchool()
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'history'>('import')
  const [selectedDataType, setSelectedDataType] = useState<DataType>('students')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string; file: File } | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(readHistory)
  const [errorModalItem, setErrorModalItem] = useState<HistoryItem | null>(null)
  const [instructionsOpen, setInstructionsOpen] = useState(true)

  // Parsed batches, one per dataset.
  const [studentRows, setStudentRows] = useState<ParsedStudentRow[]>([])
  const [gradeRows, setGradeRows] = useState<ParsedGradeRow[]>([])
  const [attendanceRows, setAttendanceRows] = useState<ParsedAttendanceRow[]>([])
  const [teacherRows, setTeacherRows] = useState<ParsedTeacherRow[]>([])
  const [parseError, setParseError] = useState<ImportRowError | null>(null)
  const [importExamId, setImportExamId] = useState('')

  // Export state.
  const [exportDataType, setExportDataType] = useState<DataType>('students')
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'pdf'>('xlsx')
  const [exportDateRange, setExportDateRange] = useState('current-term')
  const [exportGradeLevel, setExportGradeLevel] = useState('all')
  const [exportStatus, setExportStatus] = useState('active')
  const [exportFields, setExportFields] = useState<Record<string, boolean>>(() => allFields('students'))

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HISTORY_KEY)
      if (raw) setHistoryItems(JSON.parse(raw) as HistoryItem[])
    } catch {
      // Keep the in-memory history when storage is unavailable.
    }
  }, [])

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3200)
  }

  const persistHistory = (items: HistoryItem[]) => {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 200)))
    } catch {
      // History remains available for the current session.
    }
  }

  const appendHistory = (item: Omit<HistoryItem, 'id' | 'at' | 'userEn' | 'userAr'>) => {
    const entry: HistoryItem = {
      ...item,
      id: 'hist-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      at: new Date().toISOString(),
      userEn: user?.nameEn ?? 'Workspace user',
      userAr: user?.nameAr ?? 'مستخدم مساحة العمل',
    }
    setHistoryItems(prev => {
      const next = [entry, ...prev].slice(0, 200)
      persistHistory(next)
      return next
    })
  }

  const examForImport = useMemo(
    () => data.exams.find(exam => exam.id === importExamId) ?? data.exams[0],
    [data.exams, importExamId],
  )

  const importIssues = useMemo<ImportRowError[]>(() => {
    const issues: ImportRowError[] = []
    const push = (row: number, field: string, messageAr: string, messageEn: string, value?: string) => {
      issues.push({ row, field, messageAr, messageEn, value })
    }

    if (selectedDataType === 'students') {
      const classNames = new Set(data.classes.map(cls => cls.nameEn.trim().toLowerCase()))
      const seen = new Set<string>()
      studentRows.forEach((row, index) => {
        const rowNumber = row.row || index + 2
        if (!row.nameAr) push(rowNumber, 'nameAr', 'اسم الطالب بالعربية مطلوب', 'Arabic name is required')
        if (!row.nameEn) push(rowNumber, 'nameEn', 'اسم الطالب بالإنجليزية مطلوب', 'English name is required')
        if (![9, 10, 11, 12].includes(row.gradeLevel)) push(rowNumber, 'gradeLevel', 'الصف يجب أن يكون بين ٩ و١٢', 'Grade must be between 9 and 12', String(row.gradeLevel))
        if (row.className && !classNames.has(row.className.trim().toLowerCase())) push(rowNumber, 'className', 'الفصل غير موجود', 'Class does not exist', row.className)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(row.dob)) push(rowNumber, 'dob', 'تاريخ ميلاد غير صالح', 'Invalid date of birth', row.dob)
        const key = row.nameEn.toLowerCase() + '|' + row.dob
        if (seen.has(key)) push(rowNumber, 'nameEn', 'صف مكرر داخل الملف', 'Duplicate row in this file')
        seen.add(key)
        if (row.parentPhone && !/^[+\d\s()-]{7,}$/.test(row.parentPhone)) push(rowNumber, 'parentPhone', 'رقم هاتف غير صالح', 'Invalid phone number', row.parentPhone)
      })
    }

    if (selectedDataType === 'grades') {
      if (!examForImport) push(0, 'exam', 'اختر اختباراً لاستيراد الدرجات', 'Select an exam before importing grades')
      gradeRows.forEach((row, index) => {
        const rowNumber = row.row || index + 2
        const student = data.students.find(s => s.studentId.toLowerCase() === row.studentId.toLowerCase() || s.id === row.studentId)
        if (!student) push(rowNumber, 'studentId', 'الرقم الأكاديمي غير موجود', 'Student ID not found', row.studentId)
        if (!Number.isFinite(row.score)) push(rowNumber, 'score', 'الدرجة غير صالحة', 'Score is not a number', String(row.score))
        else if (examForImport && (row.score < 0 || row.score > examForImport.maxMarks)) {
          push(rowNumber, 'score', 'الدرجة يجب أن تكون بين ٠ و' + examForImport.maxMarks, 'Score must be between 0 and ' + examForImport.maxMarks, String(row.score))
        }
      })
    }

    if (selectedDataType === 'attendance') {
      attendanceRows.forEach((row, index) => {
        const rowNumber = row.row || index + 2
        if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) push(rowNumber, 'date', 'تاريخ غير صالح', 'Invalid date', row.date)
        const cls = data.classes.find(c => c.nameEn.toLowerCase() === row.className.toLowerCase() || c.nameAr === row.className)
        if (!cls) push(rowNumber, 'className', 'الفصل غير موجود', 'Class does not exist', row.className)
        const student = data.students.find(s => s.studentId.toLowerCase() === row.studentId.toLowerCase() || s.id === row.studentId)
        if (!student) push(rowNumber, 'studentId', 'الرقم الأكاديمي غير موجود', 'Student ID not found', row.studentId)
        else if (cls && student.classId !== cls.id) push(rowNumber, 'studentId', 'الطالب ليس في هذا الفصل', 'Student is not enrolled in this class', row.studentId)
      })
    }

    if (selectedDataType === 'teachers') {
      const seen = new Set<string>()
      teacherRows.forEach((row, index) => {
        const rowNumber = row.row || index + 2
        if (!row.nameAr) push(rowNumber, 'nameAr', 'اسم المعلم بالعربية مطلوب', 'Arabic name is required')
        if (!row.nameEn) push(rowNumber, 'nameEn', 'اسم المعلم بالإنجليزية مطلوب', 'English name is required')
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email)) push(rowNumber, 'email', 'بريد إلكتروني غير صالح', 'Invalid email address', row.email)
        else if (data.users.some(account => account.email.toLowerCase() === row.email.toLowerCase()) || seen.has(row.email.toLowerCase())) {
          push(rowNumber, 'email', 'البريد مستخدم بالفعل', 'Email already in use', row.email)
        }
        seen.add(row.email.toLowerCase())
      })
    }

    if (selectedDataType === 'schedule') {
      push(0, 'file', 'استيراد الجداول يتم من صفحة الفصول والمعلمين في هذه النسخة.', 'Timetable imports are managed from Classes and Teachers in this build.')
    }

    return issues
  }, [selectedDataType, studentRows, gradeRows, attendanceRows, teacherRows, examForImport, data])

  const parsedCount = selectedDataType === 'students'
    ? studentRows.length
    : selectedDataType === 'grades'
      ? gradeRows.length
      : selectedDataType === 'attendance'
        ? attendanceRows.length
        : selectedDataType === 'teachers'
          ? teacherRows.length
          : 0

  const resetBatch = () => {
    setStudentRows([])
    setGradeRows([])
    setAttendanceRows([])
    setTeacherRows([])
    setParseError(null)
  }

  const parseFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      triggerToast(arabic ? 'الحد الأقصى لحجم الملف ١٠ ميجابايت.' : 'The maximum file size is 10 MB.')
      return
    }
    setSelectedFile({ name: file.name, size: (file.size / (1024 * 1024)).toFixed(2) + ' MB', file })
    resetBatch()
    setIsParsing(true)
    try {
      if (selectedDataType === 'students') {
        const rows = await parseStudentWorkbook(file)
        setStudentRows(rows)
        if (!rows.length) setParseError({ row: 0, field: 'file', messageAr: 'لا توجد صفوف قابلة للقراءة في الملف.', messageEn: 'No readable rows found in this file.' })
      } else if (selectedDataType === 'grades') {
        const rows = await parseGradeWorkbook(file)
        setGradeRows(rows)
        if (!rows.length) setParseError({ row: 0, field: 'file', messageAr: 'لا توجد درجات قابلة للقراءة في الملف.', messageEn: 'No readable grade rows found in this file.' })
      } else if (selectedDataType === 'attendance') {
        const rows = await parseAttendanceWorkbook(file)
        setAttendanceRows(rows)
        if (!rows.length) setParseError({ row: 0, field: 'file', messageAr: 'لا توجد سجلات حضور قابلة للقراءة.', messageEn: 'No readable attendance rows found.' })
      } else if (selectedDataType === 'teachers') {
        const rows = await parseTeacherWorkbook(file)
        setTeacherRows(rows)
        if (!rows.length) setParseError({ row: 0, field: 'file', messageAr: 'لا توجد بيانات معلمين قابلة للقراءة.', messageEn: 'No readable teacher rows found.' })
      } else {
        setParseError({ row: 0, field: 'file', messageAr: 'هذا النوع لا يدعم الاستيراد الجماعي في مساحة العمل المحلية.', messageEn: 'This dataset does not support bulk import in the local workspace.' })
      }
    } catch {
      setParseError({ row: 0, field: 'file', messageAr: 'تعذر قراءة الملف. تأكد أنه ملف Excel أو CSV صالح.', messageEn: 'Could not read the file. Use a valid Excel or CSV file.' })
    } finally {
      setIsParsing(false)
    }
  }

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void parseFile(file)
    event.target.value = ''
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void parseFile(file)
  }

  const handleCommitImport = async () => {
    if (!selectedFile) return
    if (importIssues.length > 0) {
      triggerToast(arabic ? 'صحّح أخطاء التحقق قبل الاستيراد.' : 'Fix the validation errors before importing.')
      return
    }

    setIsImporting(true)
    let imported = 0
    const errors: ImportRowError[] = []
    try {
      if (selectedDataType === 'students' && studentRows.length) {
        const result = await importStudents(studentRows)
        imported = result.imported
        errors.push(...result.errors)
      } else if (selectedDataType === 'grades' && gradeRows.length && examForImport) {
        const entries = gradeRows.flatMap(row => {
          const student = data.students.find(s => s.studentId.toLowerCase() === row.studentId.toLowerCase() || s.id === row.studentId)
          return student ? [{ studentId: student.id, score: row.score, comment: row.comment }] : []
        })
        const result = await saveGrades(examForImport.id, entries)
        imported = result.saved
        if (!result.ok) errors.push({ row: 0, field: 'grade', messageAr: 'تعذر حفظ الدرجات.', messageEn: 'Could not save the grades.' })
      } else if (selectedDataType === 'attendance' && attendanceRows.length) {
        const groups = new Map<string, { classId: string; date: string; session: string; records: Array<{ studentId: string; status: ParsedAttendanceRow['status']; note?: string }> }>()
        attendanceRows.forEach(row => {
          const cls = data.classes.find(c => c.nameEn.toLowerCase() === row.className.toLowerCase() || c.nameAr === row.className)
          const student = data.students.find(s => s.studentId.toLowerCase() === row.studentId.toLowerCase() || s.id === row.studentId)
          if (!cls || !student) return
          const key = cls.id + '|' + row.date + '|' + row.session
          const group = groups.get(key) ?? { classId: cls.id, date: row.date, session: row.session, records: [] }
          group.records.push({ studentId: student.id, status: row.status, note: row.note })
          groups.set(key, group)
        })
        for (const group of groups.values()) {
          const result = await saveAttendance(group.classId, group.date, group.session, group.records)
          imported += result.saved
        }
      } else if (selectedDataType === 'teachers' && teacherRows.length) {
        for (const row of teacherRows) {
          const subjectIds = row.subjects
            .map(name => data.subjects.find(subject => subject.nameEn.toLowerCase() === name.toLowerCase() || subject.nameAr === name))
            .filter((subject): subject is NonNullable<typeof subject> => Boolean(subject))
            .map(subject => subject.id)
          const classIds = row.classes
            .map(name => data.classes.find(cls => cls.nameEn.toLowerCase() === name.toLowerCase() || cls.nameAr === name))
            .filter((cls): cls is NonNullable<typeof cls> => Boolean(cls))
            .map(cls => cls.id)
          const result = await addTeacher({ nameAr: row.nameAr, nameEn: row.nameEn, email: row.email, phone: row.phone, subjectIds, classIds })
          if (result.ok) imported += 1
          else errors.push({
            row: row.row,
            field: 'email',
            messageAr: 'تعذر إضافة المعلم.',
            messageEn: result.error === 'duplicate_email' ? 'Email already exists' : 'Could not add the teacher',
            value: row.email,
          })
        }
      }
    } finally {
      setIsImporting(false)
    }

    const status: HistoryItem['status'] = errors.length === 0 ? 'success' : imported > 0 ? 'partial' : 'failed'
    appendHistory({
      type: 'import',
      dataType: selectedDataType,
      fileName: selectedFile.name,
      recordsCount: imported,
      status,
      errors: errors.map(error => (arabic ? error.messageAr : error.messageEn) + (error.row ? ' (row ' + error.row + ')' : '')),
    })

    if (imported > 0) {
      triggerToast(
        arabic
          ? 'تم استيراد ' + imported + ' سجلاً إلى مساحة العمل.'
          : imported + ' records imported into the workspace.',
      )
      setSelectedFile(null)
      resetBatch()
    } else {
      triggerToast(arabic ? 'لم يتم استيراد أي سجل. راجع الأخطاء.' : 'No records were imported. Review the errors.')
    }
  }

  const withinRange = (date: string) => {
    if (!date) return true
    if (exportDateRange === 'last-30') {
      const since = new Date()
      since.setDate(since.getDate() - 30)
      return new Date(date) >= since
    }
    return true
  }

  const exportGradeMatch = (gradeLevel: number) =>
    exportGradeLevel === 'all' || String(gradeLevel) === exportGradeLevel

  const buildExport = (type: DataType): Array<Record<string, unknown>> => {
    if (type === 'students') {
      return data.students
        .filter(student => exportGradeMatch(student.gradeLevel))
        .filter(student => exportStatus === 'all' || student.status === 'active')
        .map(student => {
          const cls = data.classes.find(c => c.id === student.classId)
          const parent = data.parents.find(p => student.parentIds.includes(p.id))
          return {
            studentId: student.studentId,
            nameAr: student.nameAr,
            nameEn: student.nameEn,
            gender: student.gender === 'female' ? (arabic ? 'أنثى' : 'Female') : (arabic ? 'ذكر' : 'Male'),
            dob: student.dob,
            gradeLevel: student.gradeLevel,
            className: cls ? classLabel(data, cls.id, lang) : '',
            guardian: parent ? (arabic ? parent.nameAr : parent.nameEn) : '',
            phone: parent?.phone ?? '',
            email: student.email,
            gpa: gradeGpa(gradeAverage(data, student.id)).toFixed(2),
            attendanceRate: attendanceRate(data, student.id) + '%',
            status: student.status,
            enrolledAt: student.enrolledAt.slice(0, 10),
          }
        })
    }

    if (type === 'grades') {
      return data.grades.flatMap(grade => {
          const exam = data.exams.find(e => e.id === grade.examId)
          const student = data.students.find(s => s.id === grade.studentId)
          if (!exam || !student) return []
          if (!exportGradeMatch(exam.gradeLevel) || !withinRange(exam.date)) return []
          return [{
            studentId: student.studentId,
            studentName: arabic ? student.nameAr : student.nameEn,
            exam: arabic ? exam.nameAr : exam.nameEn,
            subject: subjectName(data, exam.subjectId, lang),
            className: classLabel(data, student.classId, lang),
            score: grade.score,
            maxMarks: exam.maxMarks,
            percentage: Math.round((grade.score / exam.maxMarks) * 100) + '%',
            date: exam.date,
            comment: grade.comment ?? '',
          }]
        })
    }

    if (type === 'attendance') {
      return data.attendance.flatMap(record => {
          const student = data.students.find(s => s.id === record.studentId)
          const cls = data.classes.find(c => c.id === record.classId)
          if (!student || !cls) return []
          if (!exportGradeMatch(cls.gradeLevel) || !withinRange(record.date)) return []
          return [{
            date: record.date,
            studentId: student.studentId,
            studentName: arabic ? student.nameAr : student.nameEn,
            className: classLabel(data, cls.id, lang),
            session: record.session,
            status: record.status,
            note: record.note ?? '',
            recordedBy: userName(data.users.find(account => account.id === record.recordedBy), lang),
          }]
        })
    }

    if (type === 'teachers') {
      return data.teachers
        .filter(teacher => exportStatus === 'all' || teacher.status === 'active')
        .map(teacher => ({
          employeeNo: teacher.employeeNo,
          nameAr: teacher.nameAr,
          nameEn: teacher.nameEn,
          email: teacher.email,
          phone: teacher.phone,
          subjects: teacher.subjectIds.map(id => subjectName(data, id, lang)).join(' | '),
          classes: teacher.classIds.map(id => classLabel(data, id, lang)).join(' | '),
          status: teacher.status,
        }))
    }

    return data.teacherAssignments
      .filter(assignment => {
        const cls = data.classes.find(c => c.id === assignment.classId)
        return cls ? exportGradeMatch(cls.gradeLevel) : true
      })
      .map(assignment => {
        const cls = data.classes.find(c => c.id === assignment.classId)
        return {
          className: cls ? classLabel(data, cls.id, lang) : '',
          gradeLevel: cls?.gradeLevel ?? '',
          subject: subjectName(data, assignment.subjectId, lang),
          teacher: teacherName(data, assignment.teacherId, lang),
          homeroomTeacher: cls?.homeroomTeacherId ? teacherName(data, cls.homeroomTeacherId, lang) : '',
          studentCount: data.students.filter(student => student.classId === assignment.classId).length,
        }
      })
  }

  const exportRows = useMemo(
    () => buildExport(exportDataType),
    // Rebuild when any export input changes.
    [data, exportDataType, exportGradeLevel, exportStatus, exportDateRange, lang, arabic],
  )

  const runExport = (
    type: DataType,
    format: 'xlsx' | 'csv' | 'pdf',
    record = true,
    fieldsOverride?: Record<string, boolean>,
  ) => {
    const schema = EXPORT_SCHEMAS[type]
    const activeFields = fieldsOverride ?? (type === exportDataType ? exportFields : allFields(type))
    const selected = schema.filter(field => activeFields[field.key] !== false)
    if (selected.length === 0) {
      triggerToast(arabic ? 'اختر عموداً واحداً على الأقل.' : 'Select at least one column.')
      return
    }
    const rows = buildExport(type)
    if (rows.length === 0) {
      triggerToast(arabic ? 'لا توجد سجلات مطابقة للمعايير المحددة.' : 'No records match the selected scope.')
      return
    }

    const fileName = type + '-export-' + new Date().toISOString().slice(0, 10) + '.' + format
    const headers = Object.fromEntries(selected.map(field => [field.key, arabic ? field.labelAr : field.labelEn]))
    const picked = rows.map(row => Object.fromEntries(selected.map(field => [field.key, row[field.key] ?? ''])))
    const sheetName = selectedDataType === 'schedule' ? 'Assignments' : type

    setIsExporting(true)
    try {
      if (format === 'xlsx') {
        exportRowsToXlsx(picked, fileName, sheetName, headers)
      } else if (format === 'csv') {
        exportRowsToCsv(picked, fileName, headers)
      } else {
        const printed = printPdf({
          title: arabic ? 'تقرير ' + EXPORT_SCHEMAS[type].length + ' حقول' : 'Data export report',
          subtitle: type + ' • ' + rows.length + (arabic ? ' سجل' : ' records'),
          lang: arabic ? 'ar' : 'en',
          bodyHtml: htmlTable(
            Object.values(headers),
            picked.map(row => selected.map(field => escapeHtml(row[field.key]))),
          ),
          footer: data.settings.schoolNameEn,
        })
        if (!printed) {
          triggerToast(arabic ? 'اسمح بالنوافذ المنبثقة لإنشاء ملف PDF.' : 'Allow pop-ups to generate the PDF.')
          return
        }
      }

      if (record) {
        appendHistory({
          type: 'export',
          dataType: type,
          fileName,
          recordsCount: rows.length,
          status: 'success',
          format,
        })
      }
      triggerToast(
        arabic
          ? 'تم تصدير ' + rows.length + ' سجلاً بصيغة ' + format.toUpperCase() + '.'
          : rows.length + ' records exported as ' + format.toUpperCase() + '.',
      )
    } catch {
      triggerToast(arabic ? 'تعذر إنشاء ملف التصدير.' : 'Could not generate the export file.')
    } finally {
      setIsExporting(false)
    }
  }

  const downloadTemplate = (type: DataType) => {
    if (type === 'students') {
      downloadStudentTemplate(lang)
      triggerToast(arabic ? 'تم تنزيل قالب استيراد الطلاب.' : 'Student import template downloaded.')
      return
    }
    const sampleStudent = data.students[0]
    const sampleClass = data.classes.find(cls => cls.id === sampleStudent?.classId) ?? data.classes[0]
    const sampleSubject = data.subjects[0]
    const sampleTeacher = data.teachers[0]

    let rows: Array<Record<string, unknown>> = []
    let headers: Record<string, string> = {}
    let fileName = ''
    let sheet = ''

    if (type === 'grades') {
      const exam = examForImport
      const roster = exam?.classId
        ? data.students.filter(student => student.classId === exam.classId).slice(0, 5)
        : data.students.slice(0, 5)
      headers = { studentId: arabic ? 'الرقم الأكاديمي' : 'studentId', score: arabic ? 'الدرجة' : 'score', comment: arabic ? 'ملاحظة' : 'comment' }
      rows = roster.map(student => ({ studentId: student.studentId, score: '', comment: '' }))
      fileName = 'grades-import-template.xlsx'
      sheet = 'Grades'
    } else if (type === 'attendance') {
      headers = {
        date: arabic ? 'التاريخ' : 'date',
        className: arabic ? 'الفصل' : 'className',
        studentId: arabic ? 'الرقم الأكاديمي' : 'studentId',
        session: arabic ? 'الحصة' : 'session',
        status: arabic ? 'الحالة' : 'status',
        note: arabic ? 'ملاحظة' : 'note',
      }
      rows = [{
        date: new Date().toISOString().slice(0, 10),
        className: sampleClass?.nameEn ?? '',
        studentId: sampleStudent?.studentId ?? '',
        session: 'Morning',
        status: 'present',
        note: '',
      }]
      fileName = 'attendance-import-template.xlsx'
      sheet = 'Attendance'
    } else if (type === 'teachers') {
      headers = {
        nameAr: arabic ? 'الاسم بالعربية' : 'nameAr',
        nameEn: arabic ? 'الاسم بالإنجليزية' : 'nameEn',
        email: arabic ? 'البريد الإلكتروني' : 'email',
        phone: arabic ? 'الهاتف' : 'phone',
        subjects: arabic ? 'المواد (مفصولة بفاصلة منقوطة)' : 'subjects (semicolon separated)',
        classes: arabic ? 'الفصول (مفصولة بفاصلة منقوطة)' : 'classes (semicolon separated)',
      }
      rows = [{
        nameAr: 'اسم المعلم',
        nameEn: 'Teacher name',
        email: 'teacher@example.com',
        phone: '+20 100 000 0000',
        subjects: sampleSubject?.nameEn ?? '',
        classes: sampleClass?.nameEn ?? '',
      }]
      fileName = 'teacher-import-template.xlsx'
      sheet = 'Teachers'
    } else {
      headers = {
        className: arabic ? 'الفصل' : 'className',
        subject: arabic ? 'المادة' : 'subject',
        teacher: arabic ? 'المعلم' : 'teacher',
        homeroomTeacher: arabic ? 'رائد الفصل' : 'homeroomTeacher',
      }
      rows = [{
        className: sampleClass?.nameEn ?? '',
        subject: sampleSubject?.nameEn ?? '',
        teacher: sampleTeacher?.nameEn ?? '',
        homeroomTeacher: sampleTeacher?.nameEn ?? '',
      }]
      fileName = 'teaching-assignments-template.xlsx'
      sheet = 'Assignments'
    }

    exportRowsToXlsx(rows, fileName, sheet, headers)
    triggerToast(arabic ? 'تم تنزيل القالب بصيغة Excel.' : 'Template downloaded as Excel.')
  }

  const downloadHistoryItem = (item: HistoryItem) => {
    runExport(item.dataType, item.format ?? 'xlsx', false, allFields(item.dataType))
  }

  const handleExportDatasetChange = (type: DataType) => {
    setExportDataType(type)
    setExportFields(allFields(type))
  }

  const issuesToShow = parseError ? [parseError, ...importIssues] : importIssues

  const historyStats = useMemo(() => {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const thisMonth = historyItems.filter(item => new Date(item.at) >= monthStart).length
    const completed = historyItems.filter(item => item.status !== 'failed').length
    return {
      total: historyItems.length,
      thisMonth,
      successRate: historyItems.length ? Math.round((completed / historyItems.length) * 100) : 0,
      records: historyItems.reduce((sum, item) => sum + item.recordsCount, 0),
    }
  }, [historyItems])

  // Data Types Configuration
  const dataTypesList = [
    {
      id: 'students' as DataType,
      nameEn: 'Students Directory',
      nameAr: 'شؤون وسجلات الطلاب',
      descEn: 'Profiles, national IDs, guardians, and enrolled classes',
      descAr: 'الملفات الشخصية، الهويات، أولياء الأمور، والشعب الدراسية',
      icon: Users,
      badgeText: '48 Columns',
    },
    {
      id: 'grades' as DataType,
      nameEn: 'Grades & Assessments',
      nameAr: 'الدرجات والتقييمات',
      descEn: 'Midterms, quizzes, finals, GPA rankings, and teacher feedback',
      descAr: 'الاختبارات النصفية والنهائية، الواجبات، والمعدلات التراكمية',
      icon: Award,
      badgeText: 'Gradebook',
    },
    {
      id: 'attendance' as DataType,
      nameEn: 'Attendance Records',
      nameAr: 'سجلات الحضور والغياب',
      descEn: 'Daily check-ins, tardiness, excused & unexcused absences',
      descAr: 'تسجيل الحضور اليومي، التأخير الصباحي، والأعذار المعتمدة',
      icon: Clock,
      badgeText: 'Daily Log',
    },
    {
      id: 'teachers' as DataType,
      nameEn: 'Faculty & Teachers',
      nameAr: 'الكادر الأكاديمي والمعلمون',
      descEn: 'Staff IDs, departments, teaching qualifications, and schedules',
      descAr: 'بيانات المعلمين، التخصصات، المؤهلات العلمية، وتوزيع الحصص',
      icon: BookOpen,
      badgeText: 'Faculty',
    },
    {
      id: 'schedule' as DataType,
      nameEn: 'Teaching Assignments',
      nameAr: 'التعيينات والجداول الأكاديمية',
      descEn: 'Class, subject and teacher coverage derived from the live registry',
      descAr: 'توزيع الفصول والمواد والمعلمين المستخرج من السجلات الفعلية',
      icon: Calendar,
      badgeText: 'Assignments',
    },
  ]

  const ChevronIcon = arabic ? ChevronLeft : ChevronRight

  return (
    <div dir={arabic ? 'rtl' : 'ltr'} className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 end-6 z-50 animate-slide-in-right bg-[#182b52] text-white text-[13px] font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 border border-white/10">
          <CheckCircle2 className="size-4 text-[#2dd4bf]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title={arabic ? 'استيراد وتصدير البيانات المدرسية' : 'Data Import & Export Center'}
        subtitle={
          arabic
            ? 'ترحيل وتنزيل سجلات الطلاب، كشوف الدرجات، تقارير الحضور، وجداول الحصص بصيغ Excel و CSV و PDF'
            : 'Bulk import and export student profiles, gradebooks, attendance logs, and timetables securely'
        }
        icon={FileSpreadsheet}
        arabic={arabic}
        breadcrumb={[
          arabic ? 'الرئيسية' : 'Dashboard',
          arabic ? 'البيانات' : 'Data Management',
          arabic ? 'استيراد وتصدير' : 'Import & Export',
        ]}
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e2e8f0] dark:border-white/[0.08] pb-1">
        <button
          onClick={() => setActiveTab('import')}
          className={cn(
            'px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 border-b-2 -mb-1',
            activeTab === 'import'
              ? 'border-[#19a99a] text-[#19a99a] dark:text-[#2dd4bf] bg-[#19a99a]/5'
              : 'border-transparent text-[#64748b] dark:text-[#94a3b8] hover:text-[#182b52] dark:hover:text-white'
          )}
        >
          <FileUp className="size-4" />
          <span>{arabic ? 'استيراد البيانات (Import)' : 'Import Data'}</span>
        </button>

        <button
          onClick={() => setActiveTab('export')}
          className={cn(
            'px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 border-b-2 -mb-1',
            activeTab === 'export'
              ? 'border-[#19a99a] text-[#19a99a] dark:text-[#2dd4bf] bg-[#19a99a]/5'
              : 'border-transparent text-[#64748b] dark:text-[#94a3b8] hover:text-[#182b52] dark:hover:text-white'
          )}
        >
          <FileDown className="size-4" />
          <span>{arabic ? 'تصدير البيانات (Export)' : 'Export Data'}</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            'px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 border-b-2 -mb-1',
            activeTab === 'history'
              ? 'border-[#19a99a] text-[#19a99a] dark:text-[#2dd4bf] bg-[#19a99a]/5'
              : 'border-transparent text-[#64748b] dark:text-[#94a3b8] hover:text-[#182b52] dark:hover:text-white'
          )}
        >
          <History className="size-4" />
          <span>{arabic ? 'سجل العمليات السابقة' : 'Operation History'}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f1f5f9] dark:bg-white/[0.06] text-[#64748b] dark:text-[#94a3b8]">
            {historyItems.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: IMPORT DATA ────────────────────────────────────────────── */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Data Type Selector (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="card-base p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0] dark:border-white/[0.08]">
                  <h3 className="text-[14px] font-bold text-[#182b52] dark:text-white">
                    {arabic ? '١. حدد نوع البيانات المراد استيرادها' : '1. Select Dataset to Import'}
                  </h3>
                  <Badge variant="teal" size="sm">
                    {dataTypesList.length} {arabic ? 'أنواع' : 'Datasets'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {dataTypesList.map((dt) => {
                    const Icon = dt.icon
                    const isSelected = selectedDataType === dt.id

                    return (
                      <div
                        key={dt.id}
                        onClick={() => {
                          setSelectedDataType(dt.id)
                          setSelectedFile(null)
                          resetBatch()
                          setParseError(null)
                        }}
                        className={cn(
                          'p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-3',
                          isSelected
                            ? 'border-[#19a99a] bg-[#19a99a]/5 shadow-sm'
                            : 'border-[#e2e8f0] dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              'size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                              isSelected
                                ? 'bg-[#19a99a] text-white shadow-sm'
                                : 'bg-[#f1f5f9] dark:bg-white/[0.04] text-[#64748b] dark:text-[#94a3b8]'
                            )}
                          >
                            <Icon className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[13px] font-bold text-[#182b52] dark:text-white leading-tight">
                              {arabic ? dt.nameAr : dt.nameEn}
                            </h4>
                            <p className="text-[11.5px] text-[#64748b] dark:text-[#94a3b8] mt-0.5 truncate">
                              {arabic ? dt.descAr : dt.descEn}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <Badge variant={isSelected ? 'teal' : 'neutral'} size="sm">
                            {dt.badgeText}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Download Official Templates Card */}
              <div className="card-base p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0] dark:border-white/[0.08]">
                  <h4 className="text-[13px] font-bold text-[#182b52] dark:text-white flex items-center gap-2">
                    <Download className="size-4 text-[#19a99a]" />
                    <span>{arabic ? 'نماذج الاستيراد الجاهزة (Templates)' : 'Download Standard Templates'}</span>
                  </h4>
                </div>
                <p className="text-[12px] text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
                  {arabic
                    ? 'حمّل القالب المعتمد المنسق بعناوين الأعمدة الإلزامية لتجنب أي أخطاء في التحقق.'
                    : 'Download our pre-structured Excel templates containing exact schema columns and validation rules.'}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => downloadTemplate('students')}
                    className="btn-secondary h-8 text-[11px] px-2.5 justify-start truncate"
                  >
                    <FileSpreadsheet className="size-3.5 text-[#19a99a] shrink-0" />
                    <span className="truncate">{arabic ? 'قالب الطلاب (.xlsx)' : 'Students (.xlsx)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadTemplate('grades')}
                    className="btn-secondary h-8 text-[11px] px-2.5 justify-start truncate"
                  >
                    <FileSpreadsheet className="size-3.5 text-[#19a99a] shrink-0" />
                    <span className="truncate">{arabic ? 'قالب الدرجات (.xlsx)' : 'Grades (.xlsx)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadTemplate('attendance')}
                    className="btn-secondary h-8 text-[11px] px-2.5 justify-start truncate"
                  >
                    <FileSpreadsheet className="size-3.5 text-[#19a99a] shrink-0" />
                    <span className="truncate">{arabic ? 'قالب الحضور (.xlsx)' : 'Attendance (.xlsx)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadTemplate('schedule')}
                    className="btn-secondary h-8 text-[11px] px-2.5 justify-start truncate"
                  >
                    <FileSpreadsheet className="size-3.5 text-[#19a99a] shrink-0" />
                    <span className="truncate">{arabic ? 'قالب الجداول (.xlsx)' : 'Timetables (.xlsx)'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Upload Zone + Preview (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="card-base p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0] dark:border-white/[0.08]">
                  <div>
                    <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                      {arabic ? '٢. رفع الملف والتحقق الذكي' : '2. Upload & Validation Engine'}
                    </h3>
                    <p className="text-[12px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                      {arabic
                        ? `القسم النشط: ${dataTypesList.find((d) => d.id === selectedDataType)?.nameAr}`
                        : `Target schema: ${dataTypesList.find((d) => d.id === selectedDataType)?.nameEn}`}
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.csv"
                    className="hidden"
                    onChange={handleFileInput}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary h-8 px-3 text-[12px]"
                  >
                    <Upload className="size-3.5 text-[#19a99a]" />
                    <span>{arabic ? 'تصفح جهازك' : 'Browse Files'}</span>
                  </button>
                </div>

                {/* Drag & Drop Box */}
                <div
                  onDragOver={(event) => {
                    event.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault()
                    setIsDragging(false)
                  }}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'p-8 sm:p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center',
                    isDragging
                      ? 'border-[#19a99a] bg-[#19a99a]/10 scale-[1.01]'
                      : 'border-[#cbd5e1] dark:border-white/20 hover:border-[#19a99a] bg-[#f8fafc]/50 dark:bg-white/[0.02]'
                  )}
                >
                  <div className="size-14 rounded-2xl bg-gradient-to-br from-[#19a99a]/15 to-[#0d9488]/25 text-[#19a99a] flex items-center justify-center mb-3 shadow-xs">
                    {isParsing ? <RefreshCw className="size-7 animate-spin" /> : <FileUp className="size-7" />}
                  </div>
                  <h4 className="text-[14.5px] font-bold text-[#182b52] dark:text-white">
                    {isParsing
                      ? (arabic ? 'جارٍ قراءة الملف والتحقق من الأعمدة...' : 'Reading file and validating columns...')
                      : (arabic ? 'اسحب ملف البيانات وأفلته هنا' : 'Drag & drop your spreadsheet file here')}
                  </h4>
                  <p className="text-[12px] text-[#64748b] dark:text-[#94a3b8] mt-1 max-w-sm">
                    {arabic
                      ? 'أو اضغط للتصفح من حاسوبك. الصيغ المدعومة: .xlsx (Excel) و .csv بحد أقصى ١٠ ميجابايت.'
                      : 'or click to browse your desktop. Supported extensions: .xlsx, .csv (Max 10MB)'}
                  </p>

                  <div className="flex items-center gap-2 mt-4">
                    <span className="badge-teal text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                      .XLSX Excel
                    </span>
                    <span className="badge-info text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                      .CSV Comma Separated
                    </span>
                  </div>
                </div>

                {!selectedFile && !isParsing && (
                  <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.06] flex items-center justify-between gap-3 text-[12px] flex-wrap">
                    <span className="text-[#64748b] dark:text-[#94a3b8] flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-[#19a99a]" />
                      {arabic ? 'لا تملك ملفاً جاهزاً؟ ابدأ من القالب المعتمد:' : 'No file yet? Start from the official template:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => downloadTemplate(selectedDataType)}
                      className="text-[#19a99a] font-bold hover:underline"
                    >
                      {arabic ? 'تنزيل قالب ' + (dataTypesList.find(type => type.id === selectedDataType)?.nameAr ?? '') : 'Download ' + (dataTypesList.find(type => type.id === selectedDataType)?.nameEn ?? '') + ' template'}
                    </button>
                  </div>
                )}

                {/* Parsed file & validation summary */}
                {selectedFile && (
                  <div className="space-y-4 animate-scale-in">
                    {/* File Attachment Ribbon */}
                    <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0f1f3d] border border-[#19a99a]/40 shadow-sm flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-10 rounded-xl bg-[#19a99a]/15 text-[#19a99a] flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-[13px] font-bold text-[#182b52] dark:text-white truncate">
                            {selectedFile.name}
                          </h5>
                          <p className="text-[11px] text-[#94a3b8]">
                            {selectedFile.size} • {isParsing
                              ? (arabic ? 'جارٍ التحقق...' : 'Validating...')
                              : arabic
                                ? parsedCount + ' صفاً مقروءاً'
                                : parsedCount + ' rows parsed'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null)
                          resetBatch()
                          setParseError(null)
                        }}
                        className="btn-icon size-8 rounded-lg text-[#94a3b8] hover:text-red-500"
                        title={arabic ? 'إلغاء الملف' : 'Remove file'}
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    {/* Grades need an exam target */}
                    {!isParsing && selectedDataType === 'grades' && parsedCount > 0 && (
                      <div className="p-3.5 rounded-2xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.06]">
                        <label className="block text-[11.5px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                          {arabic ? 'الاختبار الذي ستُسند إليه الدرجات *' : 'Target exam for these grades *'}
                        </label>
                        <select
                          value={importExamId}
                          onChange={(event) => setImportExamId(event.target.value)}
                          className="ss-input text-[12.5px] h-9"
                        >
                          <option value="">{arabic ? 'اختر الاختبار' : 'Select an exam'}</option>
                          {data.exams.map(exam => (
                            <option key={exam.id} value={exam.id}>
                              {arabic ? exam.nameAr : exam.nameEn} • {exam.date} • {exam.maxMarks}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!isParsing && issuesToShow.length === 0 && parsedCount > 0 && (
                      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
                        <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-[13px] font-bold text-emerald-800 dark:text-emerald-300">
                            {arabic
                              ? 'اكتمل التحقق: ' + parsedCount + ' سجلاً جاهزاً للاستيراد'
                              : 'Validation passed: ' + parsedCount + ' records ready to import'}
                          </h5>
                          <p className="text-[12px] text-emerald-700 dark:text-emerald-400/90 mt-0.5 leading-relaxed">
                            {arabic
                              ? 'طابقت جميع الصفوف مخطط البيانات الحالي. لن يُكتب أي سجل حتى تضغط زر الاستيراد.'
                              : 'Every row matches the current data schema. Nothing is written until you press Import.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {!isParsing && issuesToShow.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 space-y-2">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <h5 className="text-[13px] font-bold text-red-800 dark:text-red-300">
                              {arabic
                                ? issuesToShow.length + ' مشكلة تحقق تمنع الاستيراد'
                                : issuesToShow.length + ' validation issue(s) block this import'}
                            </h5>
                            <p className="text-[12px] text-red-700 dark:text-red-300/90 mt-0.5">
                              {arabic
                                ? 'صحّح الصفوف التالية داخل الملف ثم أعد رفعه. لم يتم تعديل أي بيانات.'
                                : 'Correct the rows below in the file and upload it again. No data has been changed.'}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1.5 max-h-44 overflow-y-auto">
                          {issuesToShow.slice(0, 8).map((issue, index) => (
                            <div
                              key={index}
                              className="p-2.5 rounded-xl bg-white/70 dark:bg-white/[0.04] border border-red-500/15 text-[11.5px] text-red-700 dark:text-red-300 flex items-start gap-2"
                            >
                              <XCircle className="size-3.5 shrink-0 mt-0.5" />
                              <span>
                                {issue.row > 0 ? (arabic ? 'الصف ' + issue.row + ': ' : 'Row ' + issue.row + ': ') : ''}
                                {arabic ? issue.messageAr : issue.messageEn}
                                {issue.value ? ' (' + issue.value + ')' : ''}
                              </span>
                            </div>
                          ))}
                          {issuesToShow.length > 8 && (
                            <p className="text-[11px] text-red-600 dark:text-red-400 px-1">
                              {arabic
                                ? 'و' + (issuesToShow.length - 8) + ' مشكلة أخرى...'
                                : 'and ' + (issuesToShow.length - 8) + ' more...'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Parsed preview */}
                    {!isParsing && parsedCount > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h5 className="text-[12px] font-bold text-[#182b52] dark:text-white flex items-center gap-1.5">
                            <Eye className="size-3.5 text-[#19a99a]" />
                            <span>{arabic ? 'معاينة الصفوف المقروءة (أول ٥):' : 'Parsed row preview (first 5):'}</span>
                          </h5>
                          <span className="text-[11px] text-[#94a3b8]">
                            {arabic ? 'إجمالي:' : 'Total:'} {parsedCount}
                          </span>
                        </div>

                        <div className="overflow-x-auto border border-[#e2e8f0] dark:border-white/[0.08] rounded-xl">
                          {selectedDataType === 'students' && (
                            <table className="ss-table text-[11.5px]">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>{arabic ? 'الاسم بالعربية' : 'Arabic Name'}</th>
                                  <th>{arabic ? 'الاسم بالإنجليزية' : 'English Name'}</th>
                                  <th>{arabic ? 'الصف' : 'Grade'}</th>
                                  <th>{arabic ? 'الفصل' : 'Class'}</th>
                                  <th>{arabic ? 'ولي الأمر' : 'Guardian'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {studentRows.slice(0, 5).map((row) => (
                                  <tr key={row.row}>
                                    <td className="text-[#94a3b8]">{row.row}</td>
                                    <td className="font-semibold text-[#182b52] dark:text-white">{row.nameAr || '—'}</td>
                                    <td>{row.nameEn || '—'}</td>
                                    <td>{row.gradeLevel || '—'}</td>
                                    <td><Badge variant="teal" size="sm">{row.className || '—'}</Badge></td>
                                    <td>{row.parentNameAr || row.parentNameEn || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                          {selectedDataType === 'grades' && (
                            <table className="ss-table text-[11.5px]">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>{arabic ? 'الرقم الأكاديمي' : 'Student ID'}</th>
                                  <th>{arabic ? 'الدرجة' : 'Score'}</th>
                                  <th>{arabic ? 'ملاحظة' : 'Comment'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {gradeRows.slice(0, 5).map((row) => (
                                  <tr key={row.row}>
                                    <td className="text-[#94a3b8]">{row.row}</td>
                                    <td className="font-mono">{row.studentId || '—'}</td>
                                    <td className="font-bold text-[#182b52] dark:text-white">{Number.isFinite(row.score) ? row.score : '—'}</td>
                                    <td>{row.comment || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                          {selectedDataType === 'attendance' && (
                            <table className="ss-table text-[11.5px]">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>{arabic ? 'التاريخ' : 'Date'}</th>
                                  <th>{arabic ? 'الفصل' : 'Class'}</th>
                                  <th>{arabic ? 'الرقم الأكاديمي' : 'Student ID'}</th>
                                  <th>{arabic ? 'الحصة' : 'Session'}</th>
                                  <th>{arabic ? 'الحالة' : 'Status'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {attendanceRows.slice(0, 5).map((row) => (
                                  <tr key={row.row}>
                                    <td className="text-[#94a3b8]">{row.row}</td>
                                    <td className="font-mono">{row.date || '—'}</td>
                                    <td>{row.className || '—'}</td>
                                    <td className="font-mono">{row.studentId || '—'}</td>
                                    <td>{row.session}</td>
                                    <td>
                                      <Badge variant={row.status === 'present' ? 'success' : row.status === 'absent' ? 'danger' : 'warning'} size="sm">
                                        {row.status}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                          {selectedDataType === 'teachers' && (
                            <table className="ss-table text-[11.5px]">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>{arabic ? 'الاسم' : 'Name'}</th>
                                  <th>{arabic ? 'البريد الإلكتروني' : 'Email'}</th>
                                  <th>{arabic ? 'الهاتف' : 'Phone'}</th>
                                  <th>{arabic ? 'المواد' : 'Subjects'}</th>
                                  <th>{arabic ? 'الفصول' : 'Classes'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {teacherRows.slice(0, 5).map((row) => (
                                  <tr key={row.row}>
                                    <td className="text-[#94a3b8]">{row.row}</td>
                                    <td className="font-semibold text-[#182b52] dark:text-white">{row.nameAr || row.nameEn || '—'}</td>
                                    <td className="font-mono text-[11px]">{row.email || '—'}</td>
                                    <td>{row.phone || '—'}</td>
                                    <td>{row.subjects.join(', ') || '—'}</td>
                                    <td>{row.classes.join(', ') || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Commit */}
                    {!isParsing && parsedCount > 0 && (
                      <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-[11.5px] text-[#64748b] dark:text-[#94a3b8]">
                          {arabic
                            ? 'سيتم حفظ السجلات في مساحة العمل المحلية وإضافة عملية إلى السجل.'
                            : 'Records will be saved to the local workspace and logged in history.'}
                        </p>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null)
                              resetBatch()
                              setParseError(null)
                            }}
                            className="btn-secondary h-9 text-[12px]"
                          >
                            {arabic ? 'إلغاء' : 'Cancel'}
                          </button>
                          <button
                            type="button"
                            disabled={isImporting || importIssues.length > 0}
                            onClick={handleCommitImport}
                            className="btn-teal h-9 px-6 text-[12px] shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isImporting ? (
                              <>
                                <RefreshCw className="size-4 animate-spin" />
                                <span>{arabic ? 'جارٍ الاستيراد...' : 'Importing...'}</span>
                              </>
                            ) : (
                              <>
                                <Check className="size-4" />
                                <span>
                                  {arabic
                                    ? 'اعتماد واستيراد (' + parsedCount + ' سجلاً)'
                                    : 'Commit import (' + parsedCount + ' records)'}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible Instructions Accordion */}
          <div className="card-base p-4 sm:p-5">
            <button
              onClick={() => setInstructionsOpen(!instructionsOpen)}
              className="w-full flex items-center justify-between text-start"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="size-4 text-[#19a99a]" />
                <h4 className="text-[14px] font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'تعليمات وإرشادات الاستيراد الناجح بدون أخطاء' : 'Import Best Practices & Formatting Guidelines'}
                </h4>
              </div>
              {instructionsOpen ? <ChevronUp className="size-4 text-[#94a3b8]" /> : <ChevronDown className="size-4 text-[#94a3b8]" />}
            </button>

            {instructionsOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[#e2e8f0] dark:border-white/[0.08] text-[12px] text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
                <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.06]">
                  <span className="font-bold text-[#182b52] dark:text-white block mb-1">
                    ١. رؤوس الأعمدة الإلزامية
                  </span>
                  تأكد من عدم تغيير أسماء الأعمدة في السطر الأول من ملف الإكسل حتى يتعرف المحرك عليها بدقة.
                </div>
                <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.06]">
                  <span className="font-bold text-[#182b52] dark:text-white block mb-1">
                    ٢. صيغ التواريخ الموحدة
                  </span>
                  يجب كتابة التواريخ دائماً بصيغة المعيار الدولي YYYY-MM-DD (مثال: 2025-09-01) لتفادي الخلط.
                </div>
                <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.06]">
                  <span className="font-bold text-[#182b52] dark:text-white block mb-1">
                    ٣. الأرقام الوطنية الفريدة
                  </span>
                  رقم الهوية الوطنية أو الإقامة يجب أن يكون فريداً لكل طالب ولا يجوز تكراره في أي سجل آخر.
                </div>
                <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.06]">
                  <span className="font-bold text-[#182b52] dark:text-white block mb-1">
                    ٤. الحجم والترميز
                  </span>
                  الملفات بصيغة CSV يجب أن تحفظ بترميز UTF-8 لدعم الحروف العربية وعلامات التشكيل بالكامل.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: EXPORT DATA ────────────────────────────────────────────── */}
      {activeTab === 'export' && (
        <div className="card-base p-5 sm:p-7 space-y-6 animate-fade-in">
          <div className="border-b border-[#e2e8f0] dark:border-white/[0.08] pb-4">
            <h3 className="text-[17px] font-bold text-[#182b52] dark:text-white">
              {arabic ? 'تصدير التقارير وسجلات النظام' : 'Export Data & Custom Reports'}
            </h3>
            <p className="text-[12.5px] text-[#64748b] dark:text-[#94a3b8] mt-1">
              {arabic
                ? 'حدد نوع البيانات، صفي المعايير المطلوبة، واختر الأعمدة وصيغة التحميل المرغوبة.'
                : 'Select entity dataset, apply custom filters, choose fields to include, and generate output.'}
            </p>
          </div>

          {/* 1. Dataset Selection Grid */}
          <div>
            <label className="block text-[13px] font-bold text-[#182b52] dark:text-white mb-2.5">
              {arabic ? '١. نوع البيانات المراد تصديرها' : '1. Choose Dataset to Export'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {dataTypesList.map((dt) => {
                const Icon = dt.icon
                const isSelected = exportDataType === dt.id
                return (
                  <div
                    key={dt.id}
                    onClick={() => handleExportDatasetChange(dt.id)}
                    className={cn(
                      'p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center gap-2',
                      isSelected
                        ? 'border-[#19a99a] bg-[#19a99a]/5 shadow-sm'
                        : 'border-[#e2e8f0] dark:border-white/[0.08] hover:border-slate-300'
                    )}
                  >
                    <div
                      className={cn(
                        'size-10 rounded-xl flex items-center justify-center',
                        isSelected ? 'bg-[#19a99a] text-white' : 'bg-[#f1f5f9] dark:bg-white/[0.04] text-[#64748b]'
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                    <span className="text-[12.5px] font-bold text-[#182b52] dark:text-white leading-tight">
                      {arabic ? dt.nameAr : dt.nameEn}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 2. Filters Grid */}
          <div>
            <label className="block text-[13px] font-bold text-[#182b52] dark:text-white mb-2.5">
              {arabic ? '٢. تصفيات ومعايير الاستخراج' : '2. Scope & Target Filters'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11.5px] font-semibold text-[#64748b] dark:text-[#94a3b8] mb-1">
                  {arabic ? 'النطاق الزمني' : 'Date Range'}
                </label>
                <select
                  value={exportDateRange}
                  onChange={(e) => setExportDateRange(e.target.value)}
                  className="ss-input text-[12.5px] h-9"
                >
                  <option value="current-term">{arabic ? 'الفصل الدراسي الحالي' : 'Current academic term'}</option>
                  <option value="last-30">{arabic ? 'آخر ٣٠ يوماً' : 'Last 30 Days'}</option>
                  <option value="full-year">{arabic ? 'العام الأكاديمي بالكامل' : 'Full academic year'}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#64748b] dark:text-[#94a3b8] mb-1">
                  {arabic ? 'المرحلة والصف' : 'Grade Level'}
                </label>
                <select
                  value={exportGradeLevel}
                  onChange={(e) => setExportGradeLevel(e.target.value)}
                  className="ss-input text-[12.5px] h-9"
                >
                  <option value="all">{arabic ? 'جميع المراحل والصفوف' : 'All Grades & Divisions'}</option>
                  {[9, 10, 11, 12].map(level => (
                    <option key={level} value={String(level)}>
                      {arabic ? 'الصف ' + level : 'Grade ' + level}
                    </option>
                  ))}
                                </select>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#64748b] dark:text-[#94a3b8] mb-1">
                  {arabic ? 'حالة السجلات' : 'Record Status'}
                </label>
                <select
                  value={exportStatus}
                  onChange={(e) => setExportStatus(e.target.value)}
                  className="ss-input text-[12.5px] h-9"
                >
                  <option value="active">{arabic ? 'النشطة والمسجلة حالياً فقط' : 'Active records only'}</option>
                  <option value="all">{arabic ? 'كل السجلات (بما في ذلك المؤرشفة)' : 'All records (including archived)'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Export Format Cards */}
          <div>
            <label className="block text-[13px] font-bold text-[#182b52] dark:text-white mb-2.5">
              {arabic ? '٣. صيغة تصدير الملف' : '3. Output Format'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl">
              {/* Excel */}
              <div
                onClick={() => setExportFormat('xlsx')}
                className={cn(
                  'p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3',
                  exportFormat === 'xlsx'
                    ? 'border-[#19a99a] bg-[#19a99a]/5 shadow-sm'
                    : 'border-[#e2e8f0] dark:border-white/[0.08]'
                )}
              >
                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="size-5" />
                </div>
                <div>
                  <h5 className="text-[13px] font-bold text-[#182b52] dark:text-white">Excel Workbook</h5>
                  <p className="text-[11px] text-[#94a3b8]">.xlsx • Rich styling</p>
                </div>
              </div>

              {/* CSV */}
              <div
                onClick={() => setExportFormat('csv')}
                className={cn(
                  'p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3',
                  exportFormat === 'csv'
                    ? 'border-[#19a99a] bg-[#19a99a]/5 shadow-sm'
                    : 'border-[#e2e8f0] dark:border-white/[0.08]'
                )}
              >
                <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText className="size-5" />
                </div>
                <div>
                  <h5 className="text-[13px] font-bold text-[#182b52] dark:text-white">CSV Archive</h5>
                  <p className="text-[11px] text-[#94a3b8]">.csv • Standard UTF-8</p>
                </div>
              </div>

              {/* PDF */}
              <div
                onClick={() => setExportFormat('pdf')}
                className={cn(
                  'p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3',
                  exportFormat === 'pdf'
                    ? 'border-[#19a99a] bg-[#19a99a]/5 shadow-sm'
                    : 'border-[#e2e8f0] dark:border-white/[0.08]'
                )}
              >
                <div className="size-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                  <FileText className="size-5" />
                </div>
                <div>
                  <h5 className="text-[13px] font-bold text-[#182b52] dark:text-white">PDF Document</h5>
                  <p className="text-[11px] text-[#94a3b8]">.pdf • Print-ready</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Column Selection Checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-[13px] font-bold text-[#182b52] dark:text-white">
                {arabic ? '٤. اختيار وتحديد الأعمدة المضمنة في التقرير' : '4. Select Fields to Include'}
              </label>
              <div className="flex items-center gap-2 text-[11.5px]">
                <button
                  type="button"
                  onClick={() => {
                    const allTrue = Object.keys(exportFields).reduce((acc, k) => ({ ...acc, [k]: true }), {})
                    setExportFields(allTrue)
                  }}
                  className="text-[#19a99a] font-semibold hover:underline"
                >
                  {arabic ? 'تحديد الكل' : 'Select All'}
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => {
                    const allFalse = Object.keys(exportFields).reduce((acc, k) => ({ ...acc, [k]: false }), {})
                    setExportFields(allFalse)
                  }}
                  className="text-[#94a3b8] font-semibold hover:underline"
                >
                  {arabic ? 'إلغاء التحديد' : 'Deselect All'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 rounded-2xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.06]">
              {EXPORT_SCHEMAS[exportDataType].map((field) => (
                <label key={field.key} className="flex items-center gap-2 cursor-pointer text-[12px] text-[#334155] dark:text-[#cbd5e1]">
                  <input
                    type="checkbox"
                    checked={exportFields[field.key] !== false}
                    onChange={(e) => setExportFields({ ...exportFields, [field.key]: e.target.checked })}
                    className="size-4 rounded accent-[#19a99a]"
                  />
                  <span>{arabic ? field.labelAr : field.labelEn}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="pt-4 border-t border-[#e2e8f0] dark:border-white/[0.08] flex items-center justify-end gap-3 flex-wrap">
            <span className="text-[11.5px] text-[#64748b] dark:text-[#94a3b8] me-auto">
              {arabic
                ? exportRows.length + ' سجلاً مطابقاً للتصدير'
                : exportRows.length + ' matching records'}
            </span>

            <button
              type="button"
              onClick={() => {
                try {
                  window.localStorage.setItem('smart-school-360:export-preset:v1', JSON.stringify({
                    dataType: exportDataType,
                    format: exportFormat,
                    dateRange: exportDateRange,
                    gradeLevel: exportGradeLevel,
                    status: exportStatus,
                    fields: exportFields,
                    savedAt: new Date().toISOString(),
                  }))
                  triggerToast(arabic ? 'تم حفظ إعدادات التصدير على هذا الجهاز.' : 'Export preset saved on this device.')
                } catch {
                  triggerToast(arabic ? 'تعذر حفظ الإعدادات.' : 'Could not save the preset.')
                }
              }}
              className="btn-secondary h-10 px-4 text-[12.5px] flex items-center gap-2"
            >
              <Clock className="size-4 text-[#64748b]" />
              <span>{arabic ? 'حفظ إعدادات التصدير' : 'Save export preset'}</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => runExport(exportDataType, exportFormat)}
              className="btn-teal h-10 px-6 text-[12.5px] shadow-sm flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>{arabic ? 'جاري تجهيز التقرير...' : 'Generating Archive...'}</span>
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  <span>{arabic ? 'تصدير وتنزيل الآن' : 'Export & Download Now'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 3: OPERATION HISTORY ──────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Live workspace stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="card-base p-4">
              <p className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
                {arabic ? 'عمليات هذا الشهر' : 'Operations This Month'}
              </p>
              <h4 className="text-[18px] font-extrabold text-[#182b52] dark:text-white mt-0.5">
                {historyStats.thisMonth}
              </h4>
            </div>

            <div className="card-base p-4">
              <p className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
                {arabic ? 'نسبة نجاح المعالجة' : 'Validation Success Rate'}
              </p>
              <h4 className="text-[18px] font-extrabold text-[#19a99a] mt-0.5">
                {historyStats.successRate}%
              </h4>
            </div>

            <div className="card-base p-4">
              <p className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
                {arabic ? 'إجمالي السجلات المعالجة' : 'Total Records Processed'}
              </p>
              <h4 className="text-[18px] font-extrabold text-[#182b52] dark:text-white mt-0.5">
                {historyStats.records.toLocaleString()}
              </h4>
            </div>

            <div className="card-base p-4">
              <p className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
                {arabic ? 'إجمالي العمليات المسجلة' : 'Logged Operations'}
              </p>
              <h4 className="text-[18px] font-extrabold text-indigo-500 mt-0.5">
                {historyStats.total}
              </h4>
            </div>
          </div>

          {/* History Table */}
          <div className="card-base overflow-hidden border">
            <div className="p-4 border-b border-[#e2e8f0] dark:border-white/[0.08] flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'سجل عمليات الاستيراد والتصدير' : 'Activity Audit & Execution History'}
                </h3>
                <p className="text-[12px] text-[#64748b] dark:text-[#94a3b8]">
                  {arabic
                    ? 'سجل مفصل بجميع عمليات نقل البيانات مع إمكانية إعادة التحميل ومراجعة الأخطاء'
                    : 'Track completed data jobs, download archives, and inspect parsing failures'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setHistoryItems(readHistory())
                  triggerToast(arabic ? 'تم تحديث السجل من مساحة العمل.' : 'History reloaded from the workspace.')
                }}
                className="btn-icon size-8 rounded-lg"
                title="Refresh"
              >
                <RefreshCw className="size-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="ss-table">
                <thead>
                  <tr>
                    <th>{arabic ? 'النوع والبيانات' : 'Type & Dataset'}</th>
                    <th>{arabic ? 'اسم الملف' : 'File Name'}</th>
                    <th>{arabic ? 'عدد السجلات' : 'Records'}</th>
                    <th>{arabic ? 'التاريخ والوقت' : 'Date'}</th>
                    <th>{arabic ? 'المستخدم المسؤول' : 'Initiator'}</th>
                    <th>{arabic ? 'الحالة' : 'Status'}</th>
                    <th className="text-end">{arabic ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {historyItems.map((item) => (
                    <tr key={item.id} className="transition-colors group">
                      {/* Type & Dataset */}
                      <td>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'size-7 rounded-lg flex items-center justify-center shrink-0',
                              item.type === 'import'
                                ? 'bg-[#19a99a]/15 text-[#19a99a]'
                                : 'bg-indigo-500/15 text-indigo-500'
                            )}
                          >
                            {item.type === 'import' ? <FileUp className="size-3.5" /> : <FileDown className="size-3.5" />}
                          </span>
                          <div>
                            <span className="font-bold text-[12.5px] text-[#182b52] dark:text-white block">
                              {item.type === 'import'
                                ? arabic
                                  ? 'استيراد'
                                  : 'Import'
                                : arabic
                                ? 'تصدير'
                                : 'Export'}
                            </span>
                            <span className="text-[10.5px] text-[#94a3b8]">
                              {dataTypesList.find(type => type.id === item.dataType)?.[arabic ? 'nameAr' : 'nameEn'] ?? item.dataType}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* File Name */}
                      <td className="font-mono text-[12px] font-medium text-[#334155] dark:text-[#cbd5e1]">
                        {item.fileName}
                      </td>

                      {/* Records */}
                      <td>
                        <span className="font-extrabold text-[12.5px] text-[#182b52] dark:text-white">
                          {item.recordsCount.toLocaleString()}
                        </span>{' '}
                        <span className="text-[11px] text-[#94a3b8]">{arabic ? 'سجل' : 'rows'}</span>
                      </td>

                      {/* Date */}
                      <td>
                        <span className="text-[12px] text-[#64748b] dark:text-[#94a3b8]">
                          {formatDate(item.at, arabic ? 'ar' : 'en', true)}
                        </span>
                      </td>

                      {/* Initiator */}
                      <td>
                        <span className="text-[12px] text-[#334155] dark:text-[#cbd5e1]">
                          {arabic ? item.userAr : item.userEn}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <Badge
                          variant={
                            item.status === 'success'
                              ? 'success'
                              : item.status === 'failed'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {item.status === 'success'
                            ? arabic
                              ? 'ناجح'
                              : 'Success'
                            : item.status === 'failed'
                            ? arabic
                              ? 'فشل'
                              : 'Failed'
                            : item.status === 'partial'
                            ? arabic
                              ? 'جزئي'
                              : 'Partial'
                            : arabic
                            ? 'معالجة'
                            : 'Processing'}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="text-end">
                        {item.status === 'failed' && item.errors ? (
                          <button
                            type="button"
                            onClick={() => setErrorModalItem(item)}
                            className="text-[11.5px] font-bold text-red-600 dark:text-red-400 hover:underline flex items-center justify-end gap-1 ms-auto"
                          >
                            <AlertTriangle className="size-3.5" />
                            <span>{arabic ? 'عرض الأخطاء' : 'View Errors'}</span>
                          </button>
                        ) : item.type === 'export' ? (
                          <button
                            type="button"
                            onClick={() => downloadHistoryItem(item)}
                            className="text-[11.5px] font-bold text-[#19a99a] dark:text-[#2dd4bf] hover:underline flex items-center justify-end gap-1 ms-auto"
                          >
                            <Download className="size-3.5" />
                            <span>{arabic ? 'تحميل الملف' : 'Download'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#94a3b8] flex items-center justify-end gap-1 ms-auto">
                            <CheckCircle2 className="size-3.5 text-[#19a99a]" />
                            {arabic ? 'تمت المعالجة' : 'Processed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW ERRORS MODAL ─────────────────────────────────────── */}
      {errorModalItem && (
        <Modal
          open={!!errorModalItem}
          onClose={() => setErrorModalItem(null)}
          title={arabic ? 'تقرير تفاصيل أخطاء الاستيراد' : 'Import Validation Error Report'}
          arabic={arabic}
          size="md"
          footer={
            <button
              type="button"
              onClick={() => setErrorModalItem(null)}
              className="btn-secondary text-[12px] h-9 px-4"
            >
              {arabic ? 'إغلاق' : 'Close'}
            </button>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-[12.5px]">
              <div className="font-bold mb-0.5">
                {arabic ? 'الملف المتعثر:' : 'Failed Job File:'} {errorModalItem.fileName}
              </div>
              <p className="text-[11.5px] text-red-600/90 dark:text-red-300">
                {arabic
                  ? 'تم إيقاف عملية الإدخال لحماية قاعدة البيانات من التعارضات. يرجى تصحيح الصفوف المذكورة أدناه وإعادة الرفع.'
                  : 'Batch import was safely halted to prevent corruption. Review and correct the invalid rows below.'}
              </p>
            </div>

            <div className="space-y-2">
              <h5 className="text-[12px] font-bold text-[#182b52] dark:text-white">
                {arabic ? 'قائمة الأخطاء المكتشفة:' : 'Specific Validation Logs:'}
              </h5>
              <div className="space-y-2">
                {errorModalItem.errors?.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03] border border-[#e2e8f0] dark:border-white/[0.06] font-mono text-[11.5px] text-red-600 dark:text-red-400 flex items-start gap-2"
                  >
                    <XCircle className="size-4 shrink-0 mt-0.5" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
