'use client'

import React, { useState, useMemo, useRef } from 'react'
import {
  Users2,
  UserPlus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  CheckSquare,
  Square,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
  Phone,
  Mail,
  GraduationCap,
  Calendar,
  ShieldCheck,
  X,
  Check,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Badge, type BadgeVariant } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { cn } from '@/lib/utils'
import { useSchool } from '@/lib/school/store'
import {
  attendanceRate,
  formatDate,
  gradeAverage,
  gradeGpa,
  visibleStudents,
} from '@/lib/school/engine'
import type { ImportRowError, ParsedStudentRow } from '@/lib/school/types'
import {
  downloadStudentTemplate,
  exportRowsToCsv,
  exportRowsToXlsx,
  parseStudentWorkbook,
  printPdf,
  htmlTable,
} from '@/lib/school/excel'

interface StudentsPageProps {
  arabic?: boolean
}

export interface StudentRecord {
  id: string
  studentId: string
  nameAr: string
  nameEn: string
  email: string
  avatarColor: string
  initials: string
  gradeClassAr: string
  gradeClassEn: string
  gradeLevel: string // '9' | '10' | '11' | '12'
  gpa: number
  attendance: number
  status: 'active' | 'inactive' | 'suspended'
  enrolledDateAr: string
  enrolledDateEn: string
  gender: 'male' | 'female'
  parentNameAr: string
  parentNameEn: string
  parentPhone: string
}

export function StudentsPage({ arabic = false }: StudentsPageProps) {
  // ── States ────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [gpaFilter, setGpaFilter] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPageNum, setCurrentPageNum] = useState<number>(1)
  const [activeModal, setActiveModal] = useState<'add' | 'import' | 'export' | null>(null)
  const [viewingStudent, setViewingStudent] = useState<StudentRecord | null>(null)
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // ── New Student Form State ────────────────────────────────────
  const [newStudent, setNewStudent] = useState({
    nameAr: '',
    nameEn: '',
    studentId: '',
    email: '',
    gradeLevel: '10',
    section: 'A',
    gender: 'male',
    parentNameAr: '',
    parentNameEn: '',
    parentPhone: '',
    dob: '2009-04-15',
  })

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }
  const { data, user, addStudent, updateStudent, archiveStudent, importStudents, updateUser, addNotification } = useSchool()
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importRows, setImportRows] = useState<ParsedStudentRow[]>([])
  const [importErrors, setImportErrors] = useState<ImportRowError[]>([])
  const [importBusy, setImportBusy] = useState(false)
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'pdf'>('xlsx')
  const [confirmArchive, setConfirmArchive] = useState<StudentRecord | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pageSize = 10

  // Live students from the shared workspace store
  const students = useMemo<StudentRecord[]>(() => {
    return visibleStudents(data, user).map((student) => {
      const cls = data.classes.find((c) => c.id === student.classId)
      const parent = data.parents.find((p) => p.studentIds.includes(student.id))
      const average = gradeAverage(data, student.id)
      const mappedStatus: StudentRecord['status'] =
        student.status === 'suspended' ? 'suspended'
          : student.status === 'active' ? 'active' : 'inactive'
      return {
        id: student.id,
        studentId: student.studentId,
        nameAr: student.nameAr,
        nameEn: student.nameEn,
        email: student.email,
        avatarColor: student.avatarColor,
        initials: student.nameAr.slice(0, 1),
        gradeClassAr: cls?.nameAr ?? '—',
        gradeClassEn: cls?.nameEn ?? '—',
        gradeLevel: String(student.gradeLevel),
        gpa: gradeGpa(average),
        attendance: attendanceRate(data, student.id),
        status: mappedStatus,
        enrolledDateAr: formatDate(student.enrolledAt, 'ar'),
        enrolledDateEn: formatDate(student.enrolledAt, 'en'),
        gender: student.gender,
        parentNameAr: parent?.nameAr ?? '—',
        parentNameEn: parent?.nameEn ?? '—',
        parentPhone: parent?.phone ?? '—',
      }
    })
  }, [data, user])

  const totalPages = Math.max(1, Math.ceil(students.length / pageSize))
  const [pageIndex, setPageIndex] = useState(0)
  const safePage = Math.min(pageIndex, totalPages - 1)


  // ── Filtered Students Logic ──────────────────────────────────
  const filteredStudents = useMemo(() => {
    return students.filter((stu) => {
      if (stu.status === 'inactive' && statusFilter === 'all') {
        // Archived records stay searchable but do not clutter the default list.
        if (!searchQuery.trim()) return false
      }
      // Search matching name, studentId, or email
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchesName =
          stu.nameAr.toLowerCase().includes(query) ||
          stu.nameEn.toLowerCase().includes(query)
        const matchesId = stu.studentId.toLowerCase().includes(query)
        const matchesEmail = stu.email.toLowerCase().includes(query)
        if (!matchesName && !matchesId && !matchesEmail) return false
      }

      // Class/Grade filter
      if (classFilter !== 'all' && stu.gradeLevel !== classFilter) {
        return false
      }

      // Status filter
      if (statusFilter !== 'all' && stu.status !== statusFilter) {
        return false
      }

      // GPA filter
      if (gpaFilter === 'high' && stu.gpa < 3.5) return false
      if (gpaFilter === 'mid' && (stu.gpa < 3.0 || stu.gpa >= 3.5)) return false
      if (gpaFilter === 'low' && stu.gpa >= 3.0) return false

      return true
    })
  }, [students, searchQuery, classFilter, statusFilter, gpaFilter])

  // ── Selection Handlers ───────────────────────────────────────
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredStudents.map((s) => s.id))
    }
  }

  const handleToggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // ── GPA Helper ───────────────────────────────────────────────
  const getGpaColorClass = (gpa: number) => {
    if (gpa >= 3.5) return 'text-emerald-600 dark:text-emerald-400 font-extrabold'
    if (gpa >= 3.0) return 'text-[#19a99a] font-bold'
    if (gpa >= 2.5) return 'text-amber-600 dark:text-amber-400 font-bold'
    return 'text-red-600 dark:text-red-400 font-bold'
  }

  // ── Add Student Submit Handler ───────────────────────────────
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const gradeLevel = Number(newStudent.gradeLevel)
    const cls = data.classes.find(c => c.gradeLevel === gradeLevel && c.section === newStudent.section)
    const result = await addStudent({
      nameAr: newStudent.nameAr,
      nameEn: newStudent.nameEn,
      email: newStudent.email || undefined,
      gender: newStudent.gender as 'male' | 'female',
      dob: newStudent.dob,
      gradeLevel,
      classId: cls?.id ?? '',
      parentNameAr: newStudent.parentNameAr,
      parentNameEn: newStudent.parentNameEn,
      parentPhone: newStudent.parentPhone,
    })
    if (!result.ok) {
      const errors: Record<string, string> = {
        names_required: arabic ? 'الاسم بالعربية والإنجليزية مطلوبان.' : 'Both Arabic and English names are required.',
        duplicate_student: arabic ? 'يوجد طالب مسجل بنفس الاسم وتاريخ الميلاد.' : 'A student with the same name and date of birth exists.',
        duplicate_email: arabic ? 'البريد الإلكتروني مستخدم بالفعل.' : 'That email is already in use.',
      }
      triggerToast(errors[result.error ?? ''] ?? (arabic ? 'تعذر حفظ الطالب.' : 'Unable to save student.'))
      return
    }
    setActiveModal(null)
    setPageIndex(0)
    setNewStudent({
      nameAr: '', nameEn: '', studentId: '', email: '', gradeLevel: '10', section: 'A',
      gender: 'male', parentNameAr: '', parentNameEn: '', parentPhone: '', dob: '2009-04-15',
    })
    triggerToast(
      arabic
        ? `تمت إضافة الطالب ${result.student?.nameAr} برقم ${result.student?.studentId}`
        : `Student ${result.student?.nameEn} created as ${result.student?.studentId}`,
    )
  }

  const paginatedStudents = filteredStudents.slice(safePage * pageSize, safePage * pageSize + pageSize)

  const exportStudentList = (list: StudentRecord[], format: 'xlsx' | 'csv' | 'pdf') => {
    const rows = list.map(stu => ({
      studentId: stu.studentId,
      nameAr: stu.nameAr,
      nameEn: stu.nameEn,
      class: arabic ? stu.gradeClassAr : stu.gradeClassEn,
      gpa: stu.gpa,
      attendance: `${stu.attendance}%`,
      status: stu.status,
      parent: arabic ? stu.parentNameAr : stu.parentNameEn,
      phone: stu.parentPhone,
    }))
    const date = new Date().toISOString().slice(0, 10)
    if (format === 'csv') {
      exportRowsToCsv(rows, `students-${date}.csv`, {
        studentId: arabic ? 'الرقم الأكاديمي' : 'Student ID',
        nameAr: arabic ? 'الاسم بالعربية' : 'Arabic name',
        nameEn: arabic ? 'الاسم بالإنجليزية' : 'English name',
        class: arabic ? 'الفصل' : 'Class',
        gpa: 'GPA',
        attendance: arabic ? 'الحضور' : 'Attendance',
        status: arabic ? 'الحالة' : 'Status',
        parent: arabic ? 'ولي الأمر' : 'Parent',
        phone: arabic ? 'الهاتف' : 'Phone',
      })
    } else if (format === 'xlsx') {
      exportRowsToXlsx(rows, `students-${date}.xlsx`, arabic ? 'الطلاب' : 'Students', {
        studentId: arabic ? 'الرقم الأكاديمي' : 'Student ID',
        nameAr: arabic ? 'الاسم بالعربية' : 'Arabic name',
        nameEn: arabic ? 'الاسم بالإنجليزية' : 'English name',
        class: arabic ? 'الفصل' : 'Class',
        gpa: 'GPA',
        attendance: arabic ? 'الحضور' : 'Attendance',
        status: arabic ? 'الحالة' : 'Status',
        parent: arabic ? 'ولي الأمر' : 'Parent',
        phone: arabic ? 'الهاتف' : 'Phone',
      })
    } else {
      printPdf({
        title: arabic ? 'سجل الطلاب' : 'Student Register',
        subtitle: arabic ? `${list.length} طالب — ${date}` : `${list.length} students — ${date}`,
        lang: arabic ? 'ar' : 'en',
        bodyHtml: htmlTable(
          arabic
            ? ['الرقم', 'الاسم', 'الفصل', 'GPA', 'الحضور', 'ولي الأمر']
            : ['ID', 'Name', 'Class', 'GPA', 'Attendance', 'Parent'],
          rows.map(row => [row.studentId, arabic ? row.nameAr : row.nameEn, row.class, String(row.gpa), row.attendance, row.parent]),
        ),
      })
    }
    triggerToast(arabic ? `تم تصدير ${list.length} سجل.` : `Exported ${list.length} records.`)
  }

  const handleImportFile = async (file: File) => {
    setImportFile(file)
    setImportErrors([])
    setImportBusy(true)
    try {
      const rows = await parseStudentWorkbook(file)
      if (rows.length === 0) {
        setImportErrors([{ row: 0, field: 'file', messageAr: 'الملف لا يحتوي على صفوف قابلة للقراءة.', messageEn: 'The file has no readable rows.' }])
        setImportRows([])
      } else {
        setImportRows(rows)
      }
    } catch {
      setImportErrors([{ row: 0, field: 'file', messageAr: 'تعذر قراءة الملف. تأكد من أنه Excel أو CSV صالح.', messageEn: 'Could not read the file. Use a valid Excel or CSV file.' }])
      setImportRows([])
    } finally {
      setImportBusy(false)
    }
  }

  const runImport = async () => {
    if (!importRows.length) {
      triggerToast(arabic ? 'اختر ملفاً للاستيراد أولاً.' : 'Choose a file first.')
      return
    }
    const result = await importStudents(importRows)
    if (!result.ok) {
      setImportErrors(result.errors)
      triggerToast(arabic ? 'تم إيقاف الاستيراد بسبب أخطاء في البيانات.' : 'Import stopped because of validation errors.')
      return
    }
    setActiveModal(null)
    setImportRows([])
    setImportFile(null)
    setImportErrors([])
    triggerToast(arabic ? `تم استيراد ${result.imported} طالب بنجاح.` : `${result.imported} students imported successfully.`)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto" dir={arabic ? 'rtl' : 'ltr'}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-toast-in bg-[#182b52] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-[#19a99a]/40 text-sm">
          <div className="size-2 rounded-full bg-[#19a99a] animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Page Header ──────────────────────────────────────── */}
      <PageHeader
        arabic={arabic}
        title={arabic ? 'إدارة شؤون الطلاب' : 'Student Management'}
        subtitle={
          arabic
            ? 'سجلات الطلاب الأكاديمية والشخصية، متابعة الحضور والدرجات، وإجراءات القيد.'
            : 'Comprehensive student directory, academic portfolios, enrollment status, and records.'
        }
        icon={Users2}
        breadcrumb={[
          arabic ? 'الرئيسية' : 'Home',
          arabic ? 'الشؤون الأكاديمية' : 'Academics',
          arabic ? 'قائمة الطلاب' : 'Student Directory',
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveModal('import')}
              className="btn-secondary text-xs sm:text-sm font-semibold flex items-center gap-1.5"
            >
              <FileSpreadsheet className="size-4 text-[#19a99a]" />
              <span>{arabic ? 'استيراد إكسل' : 'Import Excel'}</span>
            </button>
            <button
              onClick={() => setActiveModal('export')}
              className="btn-secondary text-xs sm:text-sm font-semibold flex items-center gap-1.5"
            >
              <Download className="size-4 text-[#64748b]" />
              <span>{arabic ? 'تصدير البيانات' : 'Export'}</span>
            </button>
            <button
              onClick={() => setActiveModal('add')}
              className="btn-teal text-xs sm:text-sm font-semibold flex items-center gap-1.5"
            >
              <UserPlus className="size-4" />
              <span>{arabic ? 'إضافة طالب جديد' : 'Add Student'}</span>
            </button>
          </div>
        }
      />

      {/* ── Summary Stats Row (4 Cards) ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          label={arabic ? 'إجمالي الطلاب المقيدين' : 'Total Students'}
          value={students.length.toLocaleString('en-US')}
          caption={arabic ? `موزعون على ${data.classes.length} فصلاً دراسياً` : `Across ${data.classes.length} class sections`}
          change={arabic ? 'مباشر' : 'Live'}
          trend="up"
          icon={Users2}
          iconBg="#182b52"
          iconColor="#ffffff"
          delay={1}
        />
        <StatCard
          label={arabic ? 'الطلاب المنتظمون (نشط)' : 'Active Students'}
          value={students.filter(s => s.status === 'active').length.toLocaleString('en-US')}
          caption={arabic ? `${Math.round((students.filter(s => s.status === 'active').length / Math.max(1, students.length)) * 100)}% نسبة الانتظام العام` : `${Math.round((students.filter(s => s.status === 'active').length / Math.max(1, students.length)) * 100)}% enrollment rate`}
          change={`${Math.round((students.filter(s => s.status === 'active').length / Math.max(1, students.length)) * 100)}%`}
          trend="up"
          icon={UserCheck}
          iconBg="rgba(25,169,154,0.15)"
          iconColor="#19a99a"
          delay={2}
        />
        <StatCard
          label={arabic ? 'الطلاب غير النشطين' : 'Inactive / Leave'}
          value={students.filter(s => s.status !== 'active').length.toLocaleString('en-US')}
          caption={arabic ? 'إجازات مرضية أو نقل مؤقت' : 'Leaves or transfer pending'}
          change={arabic ? 'متابعة' : 'Review'}
          trend="down"
          icon={UserX}
          iconBg="rgba(245,158,11,0.15)"
          iconColor="#f59e0b"
          delay={3}
        />
        <StatCard
          label={arabic ? 'مستجدون هذا الشهر' : 'New This Month'}
          value={data.students.filter(s => s.enrolledAt.slice(0, 7) === new Date().toISOString().slice(0, 7)).length.toLocaleString('en-US')}
          caption={arabic ? 'تحويلات وقيد جديد' : 'Transfers & new admits'}
          change={arabic ? 'هذا الشهر' : 'This month'}
          trend="up"
          icon={Sparkles}
          iconBg="rgba(99,102,241,0.15)"
          iconColor="#6366f1"
          delay={4}
        />
      </div>

      {/* ── Filter Bar ───────────────────────────────────────── */}
      <div className="card-base p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute top-1/2 -translate-y-1/2 size-4 text-[#94a3b8] pointer-events-none"
              style={{ [arabic ? 'right' : 'left']: '14px' }}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                arabic
                  ? 'ابحث بالاسم، الرقم الأكاديمي، أو البريد الإلكتروني...'
                  : 'Search by student name, ID, or email...'
              }
              className="ss-input text-xs"
              style={{
                paddingInlineStart: '40px',
                paddingInlineEnd: '14px',
              }}
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5">
            {/* Grade Level Filter */}
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="ss-input text-xs w-auto min-w-[130px]"
            >
              <option value="all">{arabic ? 'جميع المراحل' : 'All Grades'}</option>
              <option value="9">{arabic ? 'الصف التاسع' : 'Grade 9'}</option>
              <option value="10">{arabic ? 'الصف العاشر' : 'Grade 10'}</option>
              <option value="11">{arabic ? 'الصف الحادي عشر' : 'Grade 11'}</option>
              <option value="12">{arabic ? 'الصف الثاني عشر' : 'Grade 12'}</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="ss-input text-xs w-auto min-w-[130px]"
            >
              <option value="all">{arabic ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="active">{arabic ? 'منتظم (Active)' : 'Active'}</option>
              <option value="inactive">{arabic ? 'غير نشط (Inactive)' : 'Inactive'}</option>
              <option value="suspended">{arabic ? 'موقوف (Suspended)' : 'Suspended'}</option>
            </select>

            {/* GPA Filter */}
            <select
              value={gpaFilter}
              onChange={(e) => setGpaFilter(e.target.value)}
              className="ss-input text-xs w-auto min-w-[130px]"
            >
              <option value="all">{arabic ? 'جميع المعدلات (GPA)' : 'All GPAs'}</option>
              <option value="high">{arabic ? 'ممتاز (٣.٥ فما فوق)' : 'GPA ≥ 3.5'}</option>
              <option value="mid">{arabic ? 'جيد جداً (٣.٠ - ٣.٥)' : 'GPA 3.0 - 3.49'}</option>
              <option value="low">{arabic ? 'يحتاج متابعة (< ٣.٠)' : 'GPA < 3.0'}</option>
            </select>

            {(searchQuery || classFilter !== 'all' || statusFilter !== 'all' || gpaFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setClassFilter('all')
                  setStatusFilter('all')
                  setGpaFilter('all')
                }}
                className="btn-secondary text-xs px-3 py-2 text-[#64748b] whitespace-nowrap"
              >
                {arabic ? 'إعادة ضبط' : 'Reset'}
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Banner when rows selected */}
        {selectedIds.length > 0 && (
          <div className="mt-3.5 p-3 rounded-xl bg-[#19a99a]/10 border border-[#19a99a]/25 flex items-center justify-between flex-wrap gap-2 animate-fade-in">
            <span className="text-xs font-bold text-[#182b52] dark:text-white">
              {arabic
                ? `تم تحديد ${selectedIds.length} طالب من القائمة`
                : `${selectedIds.length} student(s) selected`}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  addNotification({
                    category: 'announcement',
                    titleAr: 'رسالة من إدارة المدرسة',
                    titleEn: 'Message from the school',
                    bodyAr: `تم إرسال تنبيه إداري يخص ${selectedIds.length} طالباً محدداً. يرجى مراجعة بوابة ولي الأمر.`,
                    bodyEn: `An administrative notice concerns ${selectedIds.length} selected students. Please review the parent portal.`,
                    recipientRole: 'parent',
                  })
                  triggerToast(arabic ? 'تم إرسال الإشعار لأولياء الأمور.' : 'Notification sent to parents.')
                }}
                className="btn-teal text-xs py-1 px-3 h-7 rounded-lg"
              >
                {arabic ? 'إرسال إشعار جماعي' : 'Send Message'}
              </button>
              <button
                onClick={() => exportStudentList(students.filter(s => selectedIds.includes(s.id)), 'xlsx')}
                className="btn-secondary text-xs py-1 px-3 h-7 rounded-lg"
              >
                {arabic ? 'تصدير المحدد' : 'Export Selected'}
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-[#64748b] hover:underline"
              >
                {arabic ? 'إلغاء التحديد' : 'Deselect All'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Students Table ───────────────────────────────────── */}
      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ss-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }} className="text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredStudents.length > 0 &&
                      selectedIds.length === filteredStudents.length
                    }
                    onChange={handleToggleSelectAll}
                    className="rounded cursor-pointer accent-[#19a99a]"
                    aria-label="Select all students"
                  />
                </th>
                <th>{arabic ? 'الطالب' : 'Student'}</th>
                <th>{arabic ? 'الصف / الفصل' : 'Grade / Class'}</th>
                <th>{arabic ? 'المعدل (GPA)' : 'GPA'}</th>
                <th>{arabic ? 'نسبة الحضور' : 'Attendance'}</th>
                <th>{arabic ? 'الحالة' : 'Status'}</th>
                <th>{arabic ? 'تاريخ القيد' : 'Enrolled Date'}</th>
                <th className="text-center">{arabic ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#94a3b8]">
                    {arabic ? 'لا توجد نتائج مطابقة لخيارات البحث.' : 'No students found matching your criteria.'}
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((stu) => {
                  const isSelected = selectedIds.includes(stu.id)
                  return (
                    <tr
                      key={stu.id}
                      className={cn(
                        'transition-colors',
                        isSelected && 'bg-[#19a99a]/[0.04] dark:bg-[#19a99a]/10'
                      )}
                    >
                      {/* Checkbox */}
                      <td className="text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(stu.id)}
                          className="rounded cursor-pointer accent-[#19a99a]"
                          aria-label={`Select ${stu.nameEn}`}
                        />
                      </td>

                      {/* Student info */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'size-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs bg-gradient-to-br',
                              stu.avatarColor
                            )}
                          >
                            {stu.initials}
                          </div>
                          <div className="min-w-0">
                            <span
                              onClick={() => setViewingStudent(stu)}
                              className="font-bold text-xs text-[#182b52] dark:text-white truncate block hover:text-[#19a99a] cursor-pointer"
                            >
                              {arabic ? stu.nameAr : stu.nameEn}
                            </span>
                            <span className="text-[11px] text-[#94a3b8] block">
                              {stu.studentId} • {stu.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Grade Class */}
                      <td className="text-xs font-semibold text-[#182b52] dark:text-white whitespace-nowrap">
                        {arabic ? stu.gradeClassAr : stu.gradeClassEn}
                      </td>

                      {/* GPA */}
                      <td className="whitespace-nowrap">
                        <span className={cn('text-xs', getGpaColorClass(stu.gpa))}>
                          {stu.gpa.toFixed(2)}
                        </span>
                      </td>

                      {/* Attendance % */}
                      <td className="min-w-[130px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-semibold text-[#182b52] dark:text-white">
                            <span>{stu.attendance}%</span>
                          </div>
                          <div className="progress-track h-1.5">
                            <div
                              className={cn(
                                'progress-fill',
                                stu.attendance >= 95
                                  ? 'bg-[#19a99a]'
                                  : stu.attendance >= 85
                                  ? 'bg-[#6366f1]'
                                  : 'bg-red-500'
                              )}
                              style={{ width: `${stu.attendance}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        {stu.status === 'active' && (
                          <Badge variant="success" size="sm" dot>
                            {arabic ? 'منتظم' : 'Active'}
                          </Badge>
                        )}
                        {stu.status === 'inactive' && (
                          <Badge variant="warning" size="sm" dot>
                            {arabic ? 'غير نشط' : 'Inactive'}
                          </Badge>
                        )}
                        {stu.status === 'suspended' && (
                          <Badge variant="danger" size="sm" dot>
                            {arabic ? 'موقوف' : 'Suspended'}
                          </Badge>
                        )}
                      </td>

                      {/* Enrolled Date */}
                      <td className="text-xs text-[#64748b] dark:text-[#94a3b8] whitespace-nowrap">
                        {arabic ? stu.enrolledDateAr : stu.enrolledDateEn}
                      </td>

                      {/* Actions */}
                      <td className="text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingStudent(stu)}
                            className="btn-icon size-7 rounded-lg"
                            title={arabic ? 'عرض الملف' : 'View Profile'}
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingStudent(stu)}
                            className="btn-icon size-7 rounded-lg"
                            title={arabic ? 'تعديل البيانات' : 'Edit'}
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmArchive(stu)}
                            className="btn-icon size-7 rounded-lg"
                            title={arabic ? 'المزيد' : 'More'}
                          >
                            <MoreVertical className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Controls ────────────────────────────── */}
        <div className="p-4 border-t border-[#e2e8f0] dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
            {arabic
              ? `عرض ${filteredStudents.length === 0 ? 0 : safePage * pageSize + 1}–${Math.min((safePage + 1) * pageSize, filteredStudents.length)} من أصل ${filteredStudents.length} نتيجة (${students.length} طالب مسجل)`
              : `Showing ${filteredStudents.length === 0 ? 0 : safePage * pageSize + 1}–${Math.min((safePage + 1) * pageSize, filteredStudents.length)} of ${filteredStudents.length} results (${students.length} enrolled)`}
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPageIndex(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="btn-icon size-8 rounded-lg disabled:opacity-40"
              aria-label="Previous page"
            >
              {arabic ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(0, Math.min(safePage - 2, totalPages - 5))
              const page = start + i
              return (
                <button
                  key={page}
                  onClick={() => setPageIndex(page)}
                  className={cn(
                    'size-8 rounded-lg text-xs font-bold transition-all',
                    safePage === page ? 'bg-[#182b52] text-white dark:bg-[#19a99a]' : 'btn-icon',
                  )}
                >
                  {page + 1}
                </button>
              )
            })}
            <button
              onClick={() => setPageIndex(p => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="btn-icon size-8 rounded-lg disabled:opacity-40"
              aria-label="Next page"
            >
              {arabic ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal: Add Student ───────────────────────────────── */}
      <Modal
        open={activeModal === 'add'}
        onClose={() => setActiveModal(null)}
        title={arabic ? 'إضافة طالب جديد إلى المنظومة' : 'Add New Student Record'}
        size="lg"
        arabic={arabic}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="btn-secondary text-xs px-4 py-2"
            >
              {arabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleAddStudentSubmit}
              className="btn-teal text-xs px-5 py-2 flex items-center gap-1.5"
            >
              <UserPlus className="size-4" />
              <span>{arabic ? 'تسجيل الطالب' : 'Register Student'}</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddStudentSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'الاسم الكامل بالعربية *' : 'Full Name (Arabic) *'}
              </label>
              <input
                type="text"
                required
                value={newStudent.nameAr}
                onChange={(e) => setNewStudent({ ...newStudent, nameAr: e.target.value })}
                placeholder={arabic ? 'مثال: فيصل خالد السبيعي' : 'e.g. Faisal Khalid Al-Subaie'}
                className="ss-input text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'الاسم الكامل بالإنجليزية *' : 'Full Name (English) *'}
              </label>
              <input
                type="text"
                required
                value={newStudent.nameEn}
                onChange={(e) => setNewStudent({ ...newStudent, nameEn: e.target.value })}
                placeholder="e.g. Faisal Khalid Al-Subaie"
                className="ss-input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'الرقم الأكاديمي' : 'Student ID'}
              </label>
              <input
                type="text"
                value={arabic ? 'يُنشأ تلقائياً عند الحفظ' : 'Generated automatically on save'}
                readOnly
                className="ss-input text-xs bg-slate-50 dark:bg-white/[0.04]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'المرحلة الدراسية' : 'Grade Level'}
              </label>
              <select
                value={newStudent.gradeLevel}
                onChange={(e) => setNewStudent({ ...newStudent, gradeLevel: e.target.value })}
                className="ss-input text-xs"
              >
                <option value="9">{arabic ? 'الصف التاسع' : 'Grade 9'}</option>
                <option value="10">{arabic ? 'الصف العاشر' : 'Grade 10'}</option>
                <option value="11">{arabic ? 'الصف الحادي عشر' : 'Grade 11'}</option>
                <option value="12">{arabic ? 'الصف الثاني عشر' : 'Grade 12'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'الشعبة' : 'Section'}
              </label>
              <select
                value={newStudent.section}
                onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value })}
                className="ss-input text-xs"
              >
                <option value="A">{arabic ? 'الشعبة أ' : 'Section A'}</option>
                <option value="B">{arabic ? 'الشعبة ب' : 'Section B'}</option>
                <option value="C">{arabic ? 'الشعبة ج' : 'Section C'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'الجنس' : 'Gender'}
              </label>
              <select
                value={newStudent.gender}
                onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                className="ss-input text-xs"
              >
                <option value="male">{arabic ? 'ذكر' : 'Male'}</option>
                <option value="female">{arabic ? 'أنثى' : 'Female'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'تاريخ الميلاد' : 'Date of Birth'}
              </label>
              <input
                type="date"
                value={newStudent.dob}
                onChange={(e) => setNewStudent({ ...newStudent, dob: e.target.value })}
                className="ss-input text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'البريد الإلكتروني' : 'Student Email'}
              </label>
              <input
                type="email"
                value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                placeholder="student@stgeorgeschool.edu"
                className="ss-input text-xs"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#e2e8f0] dark:border-white/[0.08]">
            <h4 className="text-xs font-bold text-[#19a99a] mb-3 uppercase tracking-wide">
              {arabic ? 'بيانات ولي الأمر والتواصل' : 'Parent & Guardian Information'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                  {arabic ? 'اسم ولي الأمر' : 'Parent Name'}
                </label>
                <input
                  type="text"
                  value={newStudent.parentNameAr}
                  onChange={(e) => setNewStudent({ ...newStudent, parentNameAr: e.target.value })}
                  placeholder={arabic ? 'اسم ولي الأمر الثلاثي' : 'Guardian Full Name'}
                  className="ss-input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                  {arabic ? 'رقم هاتف ولي الأمر' : 'Parent Mobile Number'}
                </label>
                <input
                  type="tel"
                  value={newStudent.parentPhone}
                  onChange={(e) => setNewStudent({ ...newStudent, parentPhone: e.target.value })}
                  placeholder="+966 50 000 0000"
                  className="ss-input text-xs dir-ltr text-right"
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Modal: View Student Profile ──────────────────────── */}
      {viewingStudent && (
        <Modal
          open={!!viewingStudent}
          onClose={() => setViewingStudent(null)}
          title={arabic ? 'الملف الأكاديمي الشامل للطالب' : 'Student Academic Portfolio'}
          size="md"
          arabic={arabic}
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-[#94a3b8]">{viewingStudent.studentId}</span>
              <button
                onClick={() => setViewingStudent(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                {arabic ? 'إغلاق' : 'Close'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-gradient-to-br from-[#182b52]/10 to-[#19a99a]/15 border border-[#19a99a]/20">
              <div
                className={cn(
                  'size-14 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-md bg-gradient-to-br',
                  viewingStudent.avatarColor
                )}
              >
                {viewingStudent.initials}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#182b52] dark:text-white">
                  {arabic ? viewingStudent.nameAr : viewingStudent.nameEn}
                </h3>
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                  {arabic ? viewingStudent.gradeClassAr : viewingStudent.gradeClassEn} • {viewingStudent.email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03] border border-[#e2e8f0] dark:border-white/[0.06]">
                <span className="text-[#94a3b8] block">{arabic ? 'المعدل التراكمي' : 'Cumulative GPA'}</span>
                <span className="text-xl font-black text-[#19a99a]">{viewingStudent.gpa} / 4.0</span>
              </div>
              <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03] border border-[#e2e8f0] dark:border-white/[0.06]">
                <span className="text-[#94a3b8] block">{arabic ? 'نسبة الحضور' : 'Attendance Rate'}</span>
                <span className="text-xl font-black text-[#182b52] dark:text-white">{viewingStudent.attendance}%</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#e2e8f0] dark:border-white/[0.06]">
                <span className="text-[#64748b]">{arabic ? 'ولي الأمر المسؤول:' : 'Parent Guardian:'}</span>
                <span className="font-semibold text-[#182b52] dark:text-white">
                  {arabic ? viewingStudent.parentNameAr : viewingStudent.parentNameEn}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#e2e8f0] dark:border-white/[0.06]">
                <span className="text-[#64748b]">{arabic ? 'هاتف ولي الأمر:' : 'Parent Phone:'}</span>
                <span className="font-semibold text-[#182b52] dark:text-white dir-ltr">
                  {viewingStudent.parentPhone}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#e2e8f0] dark:border-white/[0.06]">
                <span className="text-[#64748b]">{arabic ? 'تاريخ الالتحاق بالمدرسة:' : 'Enrolled Date:'}</span>
                <span className="font-semibold text-[#182b52] dark:text-white">
                  {arabic ? viewingStudent.enrolledDateAr : viewingStudent.enrolledDateEn}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Edit Student ──────────────────────────────── */}
      {editingStudent && (
        <Modal
          open={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          title={arabic ? `تعديل بيانات: ${editingStudent.nameAr}` : `Edit Student: ${editingStudent.nameEn}`}
          size="md"
          arabic={arabic}
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <button
                onClick={() => setEditingStudent(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                {arabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  const parent = data.parents.find(p => p.studentIds.includes(editingStudent.id))
                  updateStudent(editingStudent.id, {
                    nameAr: editingStudent.nameAr,
                    nameEn: editingStudent.nameEn,
                    status: editingStudent.status === 'suspended' ? 'suspended' : editingStudent.status === 'active' ? 'active' : 'inactive',
                  })
                  if (parent) {
                    const parentUser = data.users.find(u => u.id === parent.userId)
                    if (parentUser) updateUser(parentUser.id, { phone: editingStudent.parentPhone })
                  }
                  setEditingStudent(null)
                  triggerToast(arabic ? 'تم تحديث بيانات الطالب بنجاح!' : 'Student updated successfully!')
                }}
                className="btn-teal text-xs px-4 py-2"
              >
                {arabic ? 'حفظ التعديلات' : 'Save Changes'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'الاسم الكامل بالعربية' : 'Name in Arabic'}
              </label>
              <input
                type="text"
                value={editingStudent.nameAr}
                onChange={e => setEditingStudent({ ...editingStudent, nameAr: e.target.value })}
                className="ss-input text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'الاسم الكامل بالإنجليزية' : 'Name in English'}
              </label>
              <input
                type="text"
                value={editingStudent.nameEn}
                onChange={e => setEditingStudent({ ...editingStudent, nameEn: e.target.value })}
                className="ss-input text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'حالة القيد الأكاديمي' : 'Enrollment Status'}
              </label>
              <select
                value={editingStudent.status}
                onChange={e => setEditingStudent({ ...editingStudent, status: e.target.value as StudentRecord['status'] })}
                className="ss-input text-xs"
              >
                <option value="active">{arabic ? 'منتظم (Active)' : 'Active'}</option>
                <option value="inactive">{arabic ? 'غير نشط (Inactive)' : 'Inactive'}</option>
                <option value="suspended">{arabic ? 'موقوف (Suspended)' : 'Suspended'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'رقم هاتف ولي الأمر' : 'Parent Phone'}
              </label>
              <input
                type="tel"
                value={editingStudent.parentPhone}
                onChange={e => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                className="ss-input text-xs dir-ltr text-right"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Import Excel ──────────────────────────────── */}
      <Modal
        open={activeModal === 'import'}
        onClose={() => setActiveModal(null)}
        title={arabic ? 'استيراد بيانات الطلاب من ملف Excel / CSV' : 'Import Students from Excel / CSV'}
        size="md"
        arabic={arabic}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button onClick={() => setActiveModal(null)} className="btn-secondary text-xs px-4 py-2">
              {arabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={runImport}
              disabled={importBusy || importRows.length === 0 || importErrors.length > 0}
              className="btn-teal text-xs px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {importBusy
                ? (arabic ? 'جارٍ قراءة الملف...' : 'Reading file...')
                : (arabic ? `استيراد ${importRows.length || ''} طالب` : `Import ${importRows.length || ''} students`)}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) void handleImportFile(file)
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              const file = e.dataTransfer.files?.[0]
              if (file) void handleImportFile(file)
            }}
            className="w-full border-2 border-dashed border-[#cbd5e1] dark:border-white/[0.1] rounded-2xl p-6 text-center hover:border-[#19a99a] transition-all bg-[#f8fafc]/50 dark:bg-white/[0.02]"
          >
            <FileSpreadsheet className="size-8 text-[#19a99a] mx-auto mb-2" />
            <p className="text-xs font-bold text-[#182b52] dark:text-white mb-1">
              {importFile ? importFile.name : (arabic ? 'اضغط أو اسحب ملف .xlsx أو .csv هنا' : 'Click or drop an .xlsx / .csv file')}
            </p>
            <p className="text-[10px] text-[#94a3b8]">
              {importRows.length > 0
                ? (arabic ? `${importRows.length} صف تمت قراءته — جاهز للمراجعة` : `${importRows.length} rows parsed — ready to import`)
                : (arabic ? 'يدعم القوالب العربية والإنجليزية وأعمدة Excel المعتادة' : 'Supports Arabic and English column headers')}
            </p>
          </button>

          {importErrors.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/20 dark:bg-red-500/10">
              <p className="mb-2 text-[11px] font-bold text-red-700 dark:text-red-300">
                {arabic ? `${importErrors.length} خطأ — لم يتم استيراد أي صف` : `${importErrors.length} errors — nothing imported`}
              </p>
              <ul className="space-y-1">
                {importErrors.slice(0, 8).map((error, i) => (
                  <li key={i} className="text-[10px] leading-relaxed text-red-600 dark:text-red-300">
                    {error.row > 0 ? `${arabic ? 'صف' : 'Row'} ${error.row}: ` : ''}
                    {arabic ? error.messageAr : error.messageEn}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {importRows.length > 0 && importErrors.length === 0 && (
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0] dark:border-white/[0.06]">
              <table className="w-full text-[10px]">
                <thead className="bg-[#f8fafc] text-[#64748b] dark:bg-white/[0.03]">
                  <tr>
                    <th className="p-2 text-start">{arabic ? 'الاسم' : 'Name'}</th>
                    <th className="p-2 text-start">{arabic ? 'الصف' : 'Grade'}</th>
                    <th className="p-2 text-start">{arabic ? 'ولي الأمر' : 'Parent'}</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.slice(0, 5).map(row => (
                    <tr key={row.row} className="border-t border-[#f1f5f9] dark:border-white/[0.04]">
                      <td className="p-2 font-semibold text-[#182b52] dark:text-white">{arabic ? row.nameAr : row.nameEn}</td>
                      <td className="p-2 text-[#64748b]">{row.gradeLevel} · {row.className}</td>
                      <td className="p-2 text-[#64748b]">{arabic ? row.parentNameAr : row.parentNameEn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f8fafc] p-3 text-xs text-[#64748b] dark:bg-white/[0.03]">
            <button
              onClick={() => downloadStudentTemplate(arabic ? 'ar' : 'en')}
              className="font-semibold text-[#19a99a] hover:underline"
            >
              {arabic ? '📥 تحميل نموذج إكسل الفارغ المعتمد' : '📥 Download the Excel template'}
            </button>
            <span className="text-[10px] text-[#94a3b8]">
              {arabic ? 'الاستيراد يتحقق من التكرار وبيانات الفصل قبل الحفظ' : 'Duplicates and class data are validated before saving'}
            </span>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Export ────────────────────────────────────── */}
      <Modal
        open={activeModal === 'export'}
        onClose={() => setActiveModal(null)}
        title={arabic ? 'تصدير سجلات الطلاب' : 'Export Student Records'}
        size="sm"
        arabic={arabic}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button onClick={() => setActiveModal(null)} className="btn-secondary text-xs px-4 py-2">
              {arabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={() => {
                exportStudentList(selectedIds.length > 0 ? students.filter(s => selectedIds.includes(s.id)) : filteredStudents, exportFormat)
                setActiveModal(null)
              }}
              className="btn-teal text-xs px-4 py-2"
            >
              {arabic ? 'تصدير وتحميل' : 'Export & Download'}
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-[#64748b]">
            {arabic
              ? `سيتم تصدير ${selectedIds.length > 0 ? selectedIds.length : filteredStudents.length} سجل حسب الفلاتر الحالية.`
              : `${selectedIds.length > 0 ? selectedIds.length : filteredStudents.length} records will be exported using the current filters.`}
          </p>
          <div className="space-y-2">
            {([
              ['xlsx', 'Excel Spreadsheet (.xlsx)'],
              ['pdf', 'PDF Official Report (.pdf)'],
              ['csv', 'CSV Data File (.csv)'],
            ] as const).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-[#e2e8f0] dark:border-white/[0.06] cursor-pointer hover:bg-[#f8fafc] dark:hover:bg-white/[0.02]">
                <input
                  type="radio"
                  name="exportFmt"
                  checked={exportFormat === value}
                  onChange={() => setExportFormat(value)}
                  className="accent-[#19a99a]"
                />
                <span className="font-semibold text-[#182b52] dark:text-white">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* ── Confirmation: Archive student ───────────────────── */}
      <Modal
        open={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        title={arabic ? 'أرشفة سجل الطالب' : 'Archive student record'}
        size="sm"
        arabic={arabic}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button onClick={() => setConfirmArchive(null)} className="btn-secondary text-xs px-4 py-2">
              {arabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={() => {
                if (confirmArchive) {
                  archiveStudent(confirmArchive.id)
                  triggerToast(arabic ? 'تمت أرشفة سجل الطالب مع الاحتفاظ ببياناته.' : 'Student archived; records retained.')
                }
                setConfirmArchive(null)
              }}
              className="btn-danger text-xs px-4 py-2"
            >
              {arabic ? 'أرشفة' : 'Archive'}
            </button>
          </div>
        }
      >
        <p className="text-xs leading-relaxed text-[#475569] dark:text-[#cbd5e1]">
          {arabic
            ? `سيتم إخفاء ${confirmArchive?.nameAr ?? ''} من القوائم النشطة، مع الاحتفاظ بكل سجلات الحضور والدرجات والتقارير. يمكن استعادته لاحقاً.`
            : `${confirmArchive?.nameEn ?? ''} will be hidden from active lists. Attendance, grades and reports are retained and the record can be restored later.`}
        </p>
      </Modal>
    </div>
  )
}
