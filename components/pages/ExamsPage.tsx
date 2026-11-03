'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import {
  BarChart3,
  Plus,
  Calendar,
  Clock,
  DoorOpen,
  User,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Upload,
  Save,
  Search,
  Filter,
  TrendingUp,
  Award,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Edit2,
  Eye,
  X,
  FileText
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge, type BadgeVariant } from '@/components/shared/Badge'
import { cn } from '@/lib/utils'
import { useSchool } from '@/lib/school/store'
import { childrenOf, className, subjectName, teacherClassIds } from '@/lib/school/engine'
import { exportRowsToXlsx, parseGradeWorkbook } from '@/lib/school/excel'

type ExamStatus = 'scheduled' | 'in-progress' | 'completed'

interface ExamCardItem {
  id: string
  titleAr: string
  titleEn: string
  subjectAr: string
  subjectEn: string
  classAr: string
  classEn: string
  date: string
  time: string
  durationMinutes: number
  roomAr: string
  roomEn: string
  teacherAr: string
  teacherEn: string
  maxMarks: number
  passingMarks: number
  published: boolean
  status: ExamStatus
}

interface StudentGrade {
  id: string
  rollNo: string
  nameAr: string
  nameEn: string
  marks: number // 0-100
  previousMarks: number
  notes?: string
  entered: boolean
}


export function ExamsPage({ arabic = true }: { arabic?: boolean }) {
  const { data, user, createExam, saveGrades, publishExam, addNotification } = useSchool()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'entry' | 'analytics'>('upcoming')
  const [selectedExamId, setSelectedExamId] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [showSavedToast, setShowSavedToast] = useState(false)
  const [savedLabel, setSavedLabel] = useState('')
  const [examSearch, setExamSearch] = useState('')
  const gradeFileRef = useRef<HTMLInputElement>(null)

  const exams = useMemo<ExamCardItem[]>(() => {
    const classScope = user?.role === 'teacher'
      ? new Set(teacherClassIds(data, user))
      : user?.role === 'student'
        ? new Set([data.students.find(s => s.id === user.studentId)?.classId ?? ''])
        : user?.role === 'parent'
          ? new Set(childrenOf(data, user).map(s => s.classId))
          : null
    return data.exams
      .filter(exam => !classScope || (exam.classId && classScope.has(exam.classId)))
      .filter(exam => !examSearch.trim() || exam.nameAr.includes(examSearch) || exam.nameEn.toLowerCase().includes(examSearch.toLowerCase()) || className(data, exam.classId, 'en').toLowerCase().includes(examSearch.toLowerCase()))
      .slice(0, 80)
      .map(exam => {
        const today = new Date().toISOString().slice(0, 10)
        const status: ExamStatus = exam.date === today ? 'in-progress' : exam.date < today || exam.status === 'closed' ? 'completed' : 'scheduled'
        const cls = data.classes.find(c => c.id === exam.classId)
        const teacher = data.teachers.find(t => t.classIds.includes(exam.classId ?? ''))
        return {
          id: exam.id,
          titleAr: exam.nameAr,
          titleEn: exam.nameEn,
          subjectAr: subjectName(data, exam.subjectId, 'ar'),
          subjectEn: subjectName(data, exam.subjectId, 'en'),
          classAr: className(data, exam.classId, 'ar'),
          classEn: className(data, exam.classId, 'en'),
          date: exam.date,
          time: exam.startTime,
          durationMinutes: exam.durationMin,
          roomAr: cls?.room ?? '—',
          roomEn: cls?.room ?? '—',
          teacherAr: teacher?.nameAr ?? '—',
          teacherEn: teacher?.nameEn ?? '—',
          maxMarks: exam.maxMarks,
          passingMarks: exam.passMarks,
          published: exam.status === 'published',
          status,
        }
      })
  }, [data, user, examSearch])

  const selectedExam = exams.find(e => e.id === selectedExamId)
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([])

  useEffect(() => {
    if (exams.length === 0) { setSelectedExamId(''); return }
    if (!exams.some(e => e.id === selectedExamId)) setSelectedExamId(exams[0].id)
  }, [exams, selectedExamId])

  useEffect(() => {
    if (!selectedExamId) { setStudentGrades([]); return }
    const exam = data.exams.find(e => e.id === selectedExamId)
    if (!exam) { setStudentGrades([]); return }
    const roster = data.students.filter(s => s.classId === exam.classId && s.status === 'active')
    const previousExams = data.exams
      .filter(e => e.classId === exam.classId && e.subjectId === exam.subjectId && e.date < exam.date)
      .sort((a, b) => b.date.localeCompare(a.date))
    const previousExam = previousExams[0]
    setStudentGrades(roster.map(student => {
      const grade = data.grades.find(g => g.examId === exam.id && g.studentId === student.id)
      const previous = previousExam ? data.grades.find(g => g.examId === previousExam.id && g.studentId === student.id) : undefined
      return {
        id: student.id,
        rollNo: student.studentId.split('-').pop() ?? student.studentId,
        nameAr: student.nameAr,
        nameEn: student.nameEn,
        marks: grade?.score ?? 0,
        entered: !!grade,
        previousMarks: previous?.score ?? 0,
        notes: grade?.comment,
      }
    }))
  }, [selectedExamId, data])

  // New Exam Form
  const [newExam, setNewExam] = useState({
    titleAr: '',
    titleEn: '',
    subjectAr: 'الرياضيات',
    subjectEn: 'Mathematics',
    classAr: 'الصف الأول - أ',
    classEn: 'Grade 1-A',
    date: '2026-11-12',
    time: '09:00 ص',
    durationMinutes: 60,
    roomEn: 'Room 201',
    roomAr: 'قاعة ٢٠١',
    teacherEn: 'Mr. Khalid Al-Rasheed',
    teacherAr: 'أ. خالد الرشيد',
    maxMarks: 100,
    passingMarks: 60,
  })

  // Dynamic Grade Calculations
  const stats = useMemo(() => {
    const marksArr = studentGrades.filter(s => s.entered).map((s) => s.marks)
    if (marksArr.length === 0) return { min: 0, max: 0, avg: 0, passRate: 0, passCount: 0 }
    const min = Math.min(...marksArr)
    const max = Math.max(...marksArr)
    const sum = marksArr.reduce((a, b) => a + b, 0)
    const avg = Math.round(sum / marksArr.length)
    const passMark = selectedExam?.passingMarks ?? 60
    const passCount = marksArr.filter((m) => m >= passMark).length
    const passRate = Math.round((passCount / marksArr.length) * 100)
    return { min, max, avg, passRate, passCount }
  }, [studentGrades, selectedExam])

  // Grade Distribution for Chart
  const gradeDistribution = useMemo(() => {
    let countA = 0 // 90-100
    let countB = 0 // 80-89
    let countC = 0 // 70-79
    let countD = 0 // 60-69
    let countF = 0 // < 60

    studentGrades.filter(s => s.entered).forEach((s) => {
      const percent = selectedExam ? (s.marks / selectedExam.maxMarks) * 100 : s.marks
      if (percent >= 90) countA++
      else if (percent >= 80) countB++
      else if (percent >= 70) countC++
      else if (percent >= 60) countD++
      else countF++
    })

    return [
      { grade: 'A (90-100)', count: countA, color: '#19a99a' },
      { grade: 'B (80-89)', count: countB, color: '#3b82f6' },
      { grade: 'C (70-79)', count: countC, color: '#6366f1' },
      { grade: 'D (60-69)', count: countD, color: '#f59e0b' },
      { grade: 'F (<60)', count: countF, color: '#ef4444' },
    ]
  }, [studentGrades, selectedExam])

  const gradedRows = studentGrades.filter(grade => grade.entered)
  const topScorer = gradedRows.slice().sort((a, b) => b.marks - a.marks)[0]
  const lowestScorer = gradedRows.slice().sort((a, b) => a.marks - b.marks)[0]
  const scorePercent = (score: number) => selectedExam ? Math.round((score / selectedExam.maxMarks) * 100) : score

  // Handle Mark Change
  const handleMarkChange = (id: string, val: string) => {
    const num = Math.min(selectedExam?.maxMarks ?? 100, Math.max(0, Number(val) || 0))
    setStudentGrades((prev) =>
      prev.map((s) => (s.id === id ? { ...s, marks: num, entered: val !== '' } : s))
    )
  }

  // Handle Add Exam
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    const cls = data.classes.find(c => c.nameEn === newExam.classEn || c.nameAr === newExam.classAr) ?? data.classes[0]
    const subject = data.subjects.find(s => s.nameEn === newExam.subjectEn || s.nameAr === newExam.subjectAr) ?? data.subjects[0]
    const result = await createExam({
      nameAr: newExam.titleAr || 'اختبار جديد',
      nameEn: newExam.titleEn || 'New Exam Assessment',
      type: 'monthly',
      gradeLevel: cls?.gradeLevel ?? 9,
      classId: cls?.id,
      subjectId: subject?.id ?? data.subjects[0].id,
      date: newExam.date,
      startTime: newExam.time.replace(/\s*(ص|م|AM|PM)/gi, '') || '09:00',
      durationMin: Number(newExam.durationMinutes),
      maxMarks: Number(newExam.maxMarks),
      passMarks: Number(newExam.passingMarks),
    })
    if (!result.ok) return
    setSelectedExamId(result.exam?.id ?? '')
    setIsAddModalOpen(false)
    setSavedLabel(arabic ? 'تم إنشاء الاختبار وإضافته للجدول.' : 'Exam created and added to the schedule.')
    setShowSavedToast(true)
    setTimeout(() => setShowSavedToast(false), 3000)
  }

  const handleSaveGrades = async () => {
    if (!selectedExamId) return
    const enteredGrades = studentGrades.filter(s => s.entered)
    if (!enteredGrades.length) {
      setSavedLabel(arabic ? 'أدخل درجة واحدة على الأقل قبل الحفظ.' : 'Enter at least one score before saving.')
      setShowSavedToast(true)
      return
    }
    const result = await saveGrades(selectedExamId, enteredGrades.map(s => ({ studentId: s.id, score: s.marks, comment: s.notes })))
    setSavedLabel(
      result.ok
        ? (selectedExam?.published
          ? (arabic ? `تم حفظ ${result.saved} درجة كمسودة. أعد نشر النتائج بعد المراجعة ليشاهدها الطلاب.` : `${result.saved} grades saved as a draft. Review and republish them for students.`)
          : (arabic ? `تم حفظ ${result.saved} درجة كمسودة. انشر النتائج بعد مراجعتها.` : `${result.saved} grades saved as a draft. Publish after review.`))
        : (arabic ? 'تعذر حفظ الدرجات — تحقق من القيم.' : 'Could not save grades — check the values.'),
    )
    setShowSavedToast(true)
    setTimeout(() => setShowSavedToast(false), 3000)
  }

  const notify = (message: string) => {
    setSavedLabel(message)
    setShowSavedToast(true)
    setTimeout(() => setShowSavedToast(false), 3500)
  }

  const exportGradesTemplate = () => {
    if (!selectedExam) return
    const rows = studentGrades.map(grade => {
      const student = data.students.find(s => s.id === grade.id)
      return {
        studentId: student?.studentId ?? grade.rollNo,
        name: arabic ? grade.nameAr : grade.nameEn,
        score: grade.marks,
        comment: grade.notes ?? '',
      }
    })
    exportRowsToXlsx(rows, `grades-${selectedExam.id}.xlsx`, arabic ? 'الدرجات' : 'Grades', {
      studentId: arabic ? 'الرقم الأكاديمي' : 'Student ID',
      name: arabic ? 'اسم الطالب' : 'Student name',
      score: arabic ? 'الدرجة' : 'Score',
      comment: arabic ? 'ملاحظة' : 'Comment',
    })
    notify(arabic ? 'تم تنزيل نموذج الدرجات بصيغة Excel.' : 'Grades template downloaded as Excel.')
  }

  const importGrades = async (file: File) => {
    try {
      const rows = await parseGradeWorkbook(file)
      if (rows.length === 0) {
        notify(arabic ? 'الملف لا يحتوي على صفوف درجات صالحة.' : 'No valid grade rows found in the file.')
        return
      }
      let matched = 0
      setStudentGrades(prev => prev.map(grade => {
        const student = data.students.find(s => s.id === grade.id)
        const row = rows.find(r =>
          r.studentId === student?.studentId ||
          r.studentId === grade.rollNo ||
          r.studentId.toLowerCase() === student?.nameEn.toLowerCase(),
        )
        if (!row || !Number.isFinite(row.score)) return grade
        matched++
        return {
          ...grade,
          marks: Math.min(selectedExam?.maxMarks ?? 100, Math.max(0, Math.round(row.score))),
          notes: row.comment ?? grade.notes,
          entered: true,
        }
      }))
      notify(
        arabic
          ? `تمت مطابقة ${matched} درجة من الملف. راجعها ثم اضغط حفظ.`
          : `${matched} grades matched from the file. Review, then save.`,
      )
    } catch {
      notify(arabic ? 'تعذر قراءة ملف الدرجات. استخدم قالب Excel.' : 'Could not read the grades file. Use the Excel template.')
    }
  }

  const publishCurrentExam = async () => {
    if (!selectedExamId || !selectedExam) return
    const savedCount = data.grades.filter(grade => grade.examId === selectedExamId).length
    if (savedCount === 0) {
      notify(arabic ? 'احفظ درجات طالب واحد على الأقل قبل نشر النتائج.' : 'Save at least one student grade before publishing.')
      return
    }
    const result = await publishExam(selectedExamId, true)
    notify(result.ok
      ? (arabic ? `تم نشر ${savedCount} نتيجة وإشعار الطلاب وأولياء الأمور.` : `${savedCount} results published; students and parents were notified.`)
      : (arabic ? 'تعذر نشر النتائج. تحقق من صلاحياتك.' : 'Could not publish these results. Check your permissions.'))
  }

  const generateInterventionPlan = () => {
    if (!selectedExam || studentGrades.length === 0) {
      notify(arabic ? 'اختر اختباراً يحتوي على درجات أولاً.' : 'Select an exam with grades first.')
      return
    }
    const failing = studentGrades.filter(g => g.marks < selectedExam.passingMarks)
    failing.forEach(grade => {
      addNotification({
        category: 'academic',
        titleAr: 'خطة دعم أكاديمي مقترحة',
        titleEn: 'Suggested academic support plan',
        bodyAr: `نتيجة الطالب في ${selectedExam.titleAr} أقل من حد النجاح. تم إعداد خطة مراجعة علاجية، ويرجى التنسيق مع معلم المادة.`,
        bodyEn: `The student scored below the pass mark in ${selectedExam.titleEn}. A review plan is ready; please coordinate with the subject teacher.`,
        recipientRole: 'parent',
        studentId: grade.id,
        link: 'parent-portal',
        dedupeKey: `intervention:${selectedExamId}:${grade.id}`,
      })
    })
    notify(
      arabic
        ? `تم إعداد خطة دعم لـ ${failing.length} طالباً وإشعار أولياء الأمور.`
        : `Intervention plan created for ${failing.length} students and parents notified.`,
    )
  }

  const getStatusBadge = (status: ExamStatus) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="info">{arabic ? 'مجدول' : 'Scheduled'}</Badge>
      case 'in-progress':
        return <Badge variant="warning">{arabic ? 'جارٍ الآن' : 'In Progress'}</Badge>
      case 'completed':
        return <Badge variant="success">{arabic ? 'مكتمل' : 'Completed'}</Badge>
    }
  }

  const getGradeLetter = (marks: number) => {
    if (marks >= 90) return { letter: 'A', variant: 'teal' as BadgeVariant }
    if (marks >= 80) return { letter: 'B', variant: 'info' as BadgeVariant }
    if (marks >= 70) return { letter: 'C', variant: 'indigo' as BadgeVariant }
    if (marks >= 60) return { letter: 'D', variant: 'warning' as BadgeVariant }
    return { letter: 'F', variant: 'danger' as BadgeVariant }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto" dir={arabic ? 'rtl' : 'ltr'}>
      {/* ── Toast ──────────────────────────────────────────────── */}
      {showSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-toast-in bg-[#182b52] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-teal-500/40">
          <CheckCircle2 className="size-5 text-[#2dd4bf]" />
          <div>
            <p className="text-sm font-bold">{savedLabel || (arabic ? 'تم اعتماد وحفظ الدرجات بنجاح' : 'Grades Saved Successfully')}</p>
            <p className="text-xs text-[#94a3b8]">{arabic ? 'تم تحديث سجل الدرجات والتحليلات' : 'Grade registry and analytics updated'}</p>
          </div>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────── */}
      <PageHeader
        arabic={arabic}
        title={arabic ? 'الاختبارات والدرجات الأكاديمية' : 'Exams & Grades'}
        subtitle={
          arabic
            ? 'جدولة الاختبارات، رصد الدرجات، وتحليل الأداء الإحصائي للطلاب'
            : 'Schedule exams, enter grades, and review student performance analytics'
        }
        icon={BarChart3}
        breadcrumb={[
          arabic ? 'الرئيسية' : 'Home',
          arabic ? 'الإدارة الأكاديمية' : 'Academics',
          arabic ? 'الاختبارات والدرجات' : 'Exams & Grades',
        ]}
        actions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-teal flex items-center gap-2 shadow-md shadow-teal-500/20"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>{arabic ? 'إنشاء اختبار جديد' : 'Add Exam'}</span>
          </button>
        }
      />

      {/* ── Tab Switcher ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[#e2e8f0] dark:border-white/[0.08] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative',
            activeTab === 'upcoming'
              ? 'text-[#19a99a] bg-teal-50/60 dark:bg-teal-500/10'
              : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#182b52] dark:hover:text-white'
          )}
        >
          <Calendar className="size-4" />
          <span>{arabic ? 'جدول الاختبارات' : 'Upcoming Exams'}</span>
          <span className="size-5 rounded-full bg-[#19a99a]/15 text-[#19a99a] text-[10px] flex items-center justify-center font-bold">
            {exams.length}
          </span>
          {activeTab === 'upcoming' && (
            <span className="absolute bottom-[-5px] inset-x-3 h-0.5 bg-[#19a99a] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('entry')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative',
            activeTab === 'entry'
              ? 'text-[#19a99a] bg-teal-50/60 dark:bg-teal-500/10'
              : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#182b52] dark:hover:text-white'
          )}
        >
          <Edit2 className="size-4" />
          <span>{arabic ? 'رصد الدرجات' : 'Grade Entry'}</span>
          {activeTab === 'entry' && (
            <span className="absolute bottom-[-5px] inset-x-3 h-0.5 bg-[#19a99a] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative',
            activeTab === 'analytics'
              ? 'text-[#19a99a] bg-teal-50/60 dark:bg-teal-500/10'
              : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#182b52] dark:hover:text-white'
          )}
        >
          <TrendingUp className="size-4" />
          <span>{arabic ? 'تحليلات الأداء' : 'Grade Analytics'}</span>
          {activeTab === 'analytics' && (
            <span className="absolute bottom-[-5px] inset-x-3 h-0.5 bg-[#19a99a] rounded-full" />
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: Upcoming Exams
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'upcoming' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="card-base p-5 flex flex-col justify-between group hover:border-[#19a99a]/40 transition-all duration-300"
              >
                <div>
                  {/* Top: Status & Subject */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-extrabold text-[#19a99a] tracking-wide uppercase">
                      {arabic ? exam.subjectAr : exam.subjectEn}
                    </span>
                    {getStatusBadge(exam.status)}
                  </div>

                  {/* Title & Class */}
                  <h4 className="text-base font-extrabold text-[#182b52] dark:text-white mb-1 group-hover:text-[#19a99a] transition-colors">
                    {arabic ? exam.titleAr : exam.titleEn}
                  </h4>
                  <p className="text-xs text-[#64748b] dark:text-[#94a3b8] font-semibold mb-4">
                    {arabic ? exam.classAr : exam.classEn}
                  </p>

                  {/* Details Grid */}
                  <div className="space-y-2 p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03] border border-[#e2e8f0]/80 dark:border-white/[0.04] text-xs">
                    <div className="flex items-center justify-between text-[#64748b] dark:text-[#94a3b8]">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-[#19a99a]" />
                        <span>{arabic ? 'التاريخ والوقت:' : 'Date & Time:'}</span>
                      </span>
                      <span className="font-bold text-[#182b52] dark:text-white">
                        {exam.date} • {exam.time}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#64748b] dark:text-[#94a3b8]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-[#19a99a]" />
                        <span>{arabic ? 'المدة:' : 'Duration:'}</span>
                      </span>
                      <span className="font-bold text-[#182b52] dark:text-white">
                        {exam.durationMinutes} {arabic ? 'دقيقة' : 'min'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#64748b] dark:text-[#94a3b8]">
                      <span className="flex items-center gap-1.5">
                        <DoorOpen className="size-3.5 text-[#19a99a]" />
                        <span>{arabic ? 'القاعة:' : 'Room:'}</span>
                      </span>
                      <span className="font-bold text-[#182b52] dark:text-white">
                        {arabic ? exam.roomAr : exam.roomEn}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[#64748b] dark:text-[#94a3b8]">
                      <span className="flex items-center gap-1.5">
                        <User className="size-3.5 text-[#19a99a]" />
                        <span>{arabic ? 'المشرف:' : 'Teacher:'}</span>
                      </span>
                      <span className="font-bold text-[#182b52] dark:text-white">
                        {arabic ? exam.teacherAr : exam.teacherEn}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Marks & Actions */}
                <div className="pt-4 mt-4 border-t border-[#f1f5f9] dark:border-white/[0.05] flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[#94a3b8]">{arabic ? 'الدرجة العظمى:' : 'Max:'} </span>
                    <span className="font-extrabold text-[#182b52] dark:text-white">{exam.maxMarks}</span>
                    <span className="text-[#94a3b8] mx-1">/</span>
                    <span className="text-[#94a3b8]">{arabic ? 'النجاح:' : 'Pass:'} </span>
                    <span className="font-extrabold text-emerald-600">{exam.passingMarks}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedExamId(exam.id)
                        setActiveTab('entry')
                      }}
                      className="btn-secondary text-xs px-2.5 py-1"
                    >
                      {arabic ? 'رصد الدرجات' : 'Grades'}
                    </button>
                    <button className="btn-icon size-7">
                      <Eye className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: Grade Entry
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'entry' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="card-base p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Exam selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#64748b] dark:text-[#94a3b8] shrink-0">
                {arabic ? 'اختر الاختبار:' : 'Select Exam:'}
              </span>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                aria-label={arabic ? 'اختر الاختبار لرصد الدرجات' : 'Select exam for grade entry'}
                className="ss-input text-xs sm:text-sm font-bold min-w-[260px] h-9"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id} className="dark:bg-[#0f1f3d]">
                    {arabic ? `${ex.titleAr} (${ex.classAr})` : `${ex.titleEn} (${ex.classEn})`}
                  </option>
                ))}
              </select>
            </div>

            <span className={selectedExam?.published ? 'badge-teal text-xs px-2.5 py-1 rounded-lg' : 'badge-warning text-xs px-2.5 py-1 rounded-lg'}>
              {selectedExam?.published ? (arabic ? 'النتائج منشورة' : 'Published') : (arabic ? 'مسودة — لا يراها الطلاب' : 'Draft — hidden from students')}
            </span>

            {/* Bulk Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={gradeFileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) void importGrades(file)
                  e.target.value = ''
                }}
              />
              <button
                onClick={() => gradeFileRef.current?.click()}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Upload className="size-3.5" />
                <span>{arabic ? 'استيراد الدرجات' : 'Import Grades'}</span>
              </button>

              <button
                onClick={exportGradesTemplate}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Download className="size-3.5" />
                <span>{arabic ? 'تصدير النموذج' : 'Export Template'}</span>
              </button>

              <button
                onClick={publishCurrentExam}
                disabled={selectedExam?.published || studentGrades.filter(grade => grade.entered).length === 0}
                className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="size-3.5" />
                <span>{arabic ? 'نشر النتائج' : 'Publish Results'}</span>
              </button>

              <button
                onClick={handleSaveGrades}
                className="btn-teal text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20"
              >
                <Save className="size-3.5" />
                <span>{arabic ? 'حفظ الدرجات' : 'Save Grades'}</span>
              </button>
            </div>
          </div>

          {/* Realtime Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card-base p-4 text-center">
              <p className="text-[11px] font-bold text-[#94a3b8] uppercase">{arabic ? 'متوسط الدرجات' : 'Class Average'}</p>
              <p className="text-2xl font-extrabold text-[#19a99a] mt-1">{gradedRows.length ? `${stats.avg}/${selectedExam?.maxMarks ?? 100} (${scorePercent(stats.avg)}%)` : '—'}</p>
            </div>
            <div className="card-base p-4 text-center">
              <p className="text-[11px] font-bold text-[#94a3b8] uppercase">{arabic ? 'نسبة النجاح' : 'Pass Rate'}</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">{gradedRows.length ? `${stats.passRate}%` : '—'}</p>
            </div>
            <div className="card-base p-4 text-center">
              <p className="text-[11px] font-bold text-[#94a3b8] uppercase">{arabic ? 'أعلى درجة' : 'Highest Mark'}</p>
              <p className="text-2xl font-extrabold text-[#182b52] dark:text-white mt-1">{gradedRows.length ? `${stats.max}/${selectedExam?.maxMarks ?? 100}` : '—'}</p>
            </div>
            <div className="card-base p-4 text-center">
              <p className="text-[11px] font-bold text-[#94a3b8] uppercase">{arabic ? 'أدنى درجة' : 'Lowest Mark'}</p>
              <p className="text-2xl font-extrabold text-rose-500 mt-1">{gradedRows.length ? `${stats.min}/${selectedExam?.maxMarks ?? 100}` : '—'}</p>
            </div>
          </div>

          {/* Grades Entry Table */}
          <div className="card-base overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ss-table">
                <thead>
                  <tr>
                    <th className="w-12 text-center">#</th>
                    <th>{arabic ? 'اسم الطالب' : 'Student Name'}</th>
                    <th>{arabic ? 'الدرجة السابقة' : 'Prev Mark'}</th>
                    <th className="w-40 text-center">{arabic ? `الدرجة المرصودة (من ${selectedExam?.maxMarks ?? 100})` : `Current Mark (/${selectedExam?.maxMarks ?? 100})`}</th>
                    <th className="text-center">{arabic ? 'التقدير' : 'Grade'}</th>
                    <th className="text-center">{arabic ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {studentGrades.map((st) => {
                    const percentage = selectedExam ? (st.marks / selectedExam.maxMarks) * 100 : st.marks
                    const gradeInfo = getGradeLetter(percentage)
                    const isPassed = st.entered && st.marks >= (selectedExam?.passingMarks ?? 60)

                    return (
                      <tr key={st.id}>
                        <td className="text-center font-mono text-xs text-[#94a3b8]">
                          {st.rollNo}
                        </td>
                        <td className="font-bold text-[#182b52] dark:text-white text-sm">
                          {arabic ? st.nameAr : st.nameEn}
                        </td>
                        <td className="font-mono text-xs text-[#64748b]">
                          {st.previousMarks}%
                        </td>
                        <td className="text-center">
                          <input
                            type="number"
                            min="0"
                            max={selectedExam?.maxMarks ?? 100}
                            value={st.entered ? st.marks : ''}
                            onChange={(e) => handleMarkChange(st.id, e.target.value)}
                            aria-label={arabic ? `درجة الطالب ${st.nameAr}` : `Mark for ${st.nameEn}`}
                            className="w-24 text-center font-bold text-sm h-8 rounded-lg border border-[#e2e8f0] dark:border-white/[0.1] bg-white dark:bg-[#0f1f3d] text-[#182b52] dark:text-white focus:outline-none focus:border-[#19a99a]"
                          />
                        </td>
                        <td className="text-center">
                          <Badge variant={gradeInfo.variant}>
                            {st.entered ? gradeInfo.letter : '—'}
                          </Badge>
                        </td>
                        <td className="text-center">
                          <span
                            className={cn(
                              'text-xs font-bold px-2 py-0.5 rounded-full',
                              isPassed
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'
                                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600'
                            )}
                          >
                            {!st.entered ? (arabic ? 'لم تُرصد' : 'Not entered') : isPassed ? (arabic ? 'ناجح' : 'Passed') : (arabic ? 'يحتاج دعم' : 'Needs Support')}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: Grade Analytics
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-base p-5 border-l-4 border-l-emerald-500">
              <p className="text-xs font-bold text-[#64748b] dark:text-[#94a3b8] uppercase">{arabic ? 'نسبة النجاح الإجمالية' : 'Pass Rate'}</p>
              <h3 className="text-3xl font-extrabold text-[#182b52] dark:text-white mt-1">{gradedRows.length ? `${stats.passRate}%` : '—'}</h3>
              <p className="text-xs text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                <ArrowUpRight className="size-3.5" />
                <span>{arabic ? `${stats.passCount} من ${gradedRows.length} طالباً اجتازوا حد النجاح` : `${stats.passCount} of ${gradedRows.length} students passed`}</span>
              </p>
            </div>

            <div className="card-base p-5 border-l-4 border-l-[#19a99a]">
              <p className="text-xs font-bold text-[#64748b] dark:text-[#94a3b8] uppercase">{arabic ? 'متوسط درجات الفصل' : 'Class Average'}</p>
              <h3 className="text-3xl font-extrabold text-[#19a99a] mt-1">{gradedRows.length ? `${scorePercent(stats.avg)}%` : '—'}</h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1 font-medium">
                {arabic ? 'متوسط التقييم المختار' : 'Average for selected assessment'}
              </p>
            </div>

            <div className="card-base p-5 border-l-4 border-l-blue-500">
              <p className="text-xs font-bold text-[#64748b] dark:text-[#94a3b8] uppercase">{arabic ? 'أعلى علامة محققة' : 'Highest Score'}</p>
              <h3 className="text-3xl font-extrabold text-blue-600 mt-1">{topScorer ? `${topScorer.marks}/${selectedExam?.maxMarks ?? 100}` : '—'}</h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1 font-medium">
                {topScorer ? (arabic ? topScorer.nameAr : topScorer.nameEn) : (arabic ? 'لا توجد درجات' : 'No grades recorded')}
              </p>
            </div>

            <div className="card-base p-5 border-l-4 border-l-rose-500">
              <p className="text-xs font-bold text-[#64748b] dark:text-[#94a3b8] uppercase">{arabic ? 'أدنى علامة مسجلة' : 'Lowest Score'}</p>
              <h3 className="text-3xl font-extrabold text-rose-500 mt-1">{lowestScorer ? `${lowestScorer.marks}/${selectedExam?.maxMarks ?? 100}` : '—'}</h3>
              <p className="text-xs text-rose-600 mt-1 font-medium">
                {lowestScorer ? (arabic ? lowestScorer.nameAr : lowestScorer.nameEn) : (arabic ? 'لا توجد درجات' : 'No grades recorded')}
              </p>
            </div>
          </div>

          {/* Chart & Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card-base p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-[#182b52] dark:text-white">
                    {arabic ? 'توزيع التقديرات والدرجات' : 'Grade Distribution'}
                  </h4>
                  <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                    {arabic ? 'عدد الطلاب في كل فئة تقدير (A, B, C, D, F)' : 'Count of students per letter grade'}
                  </p>
                </div>
                <Award className="size-5 text-[#19a99a]" />
              </div>

              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeDistribution} barSize={38}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis
                      dataKey="grade"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0f1f3d',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        color: '#e2e8f0',
                        fontSize: 12,
                      }}
                      formatter={(val) => [val, arabic ? 'عدد الطلاب' : 'Students']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {gradeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Insights Card */}
            <div className="card-base p-5 flex flex-col justify-between bg-gradient-to-br from-white to-slate-50 dark:from-[#0f1f3d] dark:to-[#0a1628]">
              <div>
                <h4 className="text-sm font-bold text-[#182b52] dark:text-white mb-2">
                  {arabic ? 'ملخص تحليلات الذكاء الاصطناعي' : 'AI Performance Summary'}
                </h4>
                <div className="space-y-3 text-xs text-[#64748b] dark:text-[#94a3b8]">
                  <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-500/10 border border-teal-500/20 text-[#182b52] dark:text-white">
                    <p className="font-bold text-[#19a99a] mb-0.5">{arabic ? 'أداء متفوق' : 'Excellence'}</p>
                    <p>{arabic
                      ? `${Math.round((studentGrades.filter(s => s.marks >= 90).length / Math.max(1, studentGrades.length)) * 100)}٪ من طلاب الشعبة أحرزوا تقدير ممتاز (A).`
                      : `${Math.round((studentGrades.filter(s => s.marks >= 90).length / Math.max(1, studentGrades.length)) * 100)}% of the class achieved an A grade.`}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-500/20 text-[#182b52] dark:text-white">
                    <p className="font-bold text-amber-600 mb-0.5">{arabic ? 'فجوة تعليمية محتملة' : 'Concept Gap'}</p>
                    <p>{arabic ? 'سؤال الهندسة الفراغية سجل أقل معدل إجابة صحيحة (٥٤٪).' : 'Spatial geometry question had lowest correct rate (54%).'}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={generateInterventionPlan}
                className="w-full btn-teal text-xs mt-4"
              >
                {arabic ? 'توليد خطة دعم علاجي' : 'Generate Intervention Plan'}
              </button>
            </div>
          </div>

          {/* Performance Comparison Table */}
          <div className="card-base overflow-hidden">
            <div className="p-4 border-b border-[#e2e8f0] dark:border-white/[0.08]">
              <h4 className="text-sm font-bold text-[#182b52] dark:text-white">
                {arabic ? 'ترتيب الطلاب ومقارنة التقدم' : 'Student Performance Comparison'}
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="ss-table">
                <thead>
                  <tr>
                    <th className="w-12 text-center">{arabic ? 'الترتيب' : 'Rank'}</th>
                    <th>{arabic ? 'اسم الطالب' : 'Student Name'}</th>
                    <th>{arabic ? 'الدرجة الحالية' : 'Current Mark'}</th>
                    <th className="text-center">{arabic ? 'التقدير' : 'Grade'}</th>
                    <th>{arabic ? 'مقارنة بالفصل السابق' : 'vs Previous'}</th>
                    <th className="text-center">{arabic ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...studentGrades]
                    .sort((a, b) => b.marks - a.marks)
                    .map((st, idx) => {
                      const gradeInfo = getGradeLetter(st.marks)
                      const diff = st.marks - st.previousMarks

                      return (
                        <tr key={st.id}>
                          <td className="text-center font-bold text-xs">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </td>
                          <td className="font-bold text-sm text-[#182b52] dark:text-white">
                            {arabic ? st.nameAr : st.nameEn}
                          </td>
                          <td className="font-extrabold font-mono text-sm text-[#19a99a]">
                            {st.marks}%
                          </td>
                          <td className="text-center">
                            <Badge variant={gradeInfo.variant}>{gradeInfo.letter}</Badge>
                          </td>
                          <td>
                            <div className="flex items-center gap-1 text-xs font-bold">
                              {diff > 0 ? (
                                <span className="text-emerald-600 flex items-center">
                                  <ArrowUpRight className="size-3.5" /> +{diff}%
                                </span>
                              ) : diff < 0 ? (
                                <span className="text-rose-500 flex items-center">
                                  <ArrowDownRight className="size-3.5" /> {diff}%
                                </span>
                              ) : (
                                <span className="text-[#94a3b8] flex items-center">
                                  <Minus className="size-3" /> 0%
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-center">
                            <span
                              className={cn(
                                'text-[11px] font-bold px-2 py-0.5 rounded-full',
                                st.marks >= 60
                                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'
                                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600'
                              )}
                            >
                              {st.marks >= 60 ? (arabic ? 'مستوفٍ' : 'Qualified') : (arabic ? 'متعثر' : 'At Risk')}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Add Exam ────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box p-6 space-y-5" dir={arabic ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b border-[#e2e8f0] dark:border-white/[0.08] pb-3">
              <h3 className="text-lg font-bold text-[#182b52] dark:text-white">
                {arabic ? 'جدولة اختبار جديد' : 'Schedule New Exam'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="btn-icon size-7"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                  {arabic ? 'عنوان الاختبار' : 'Exam Title'}
                </label>
                <input
                  type="text"
                  required
                  value={newExam.titleAr}
                  onChange={(e) =>
                    setNewExam({ ...newExam, titleAr: e.target.value, titleEn: e.target.value })
                  }
                  placeholder={arabic ? 'مثال: اختبار منتصف الفصل الدراسي الأول' : 'e.g. Midterm Assessment'}
                  className="ss-input text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                    {arabic ? 'المادة الدراسية' : 'Subject'}
                  </label>
                  <select
                    value={newExam.subjectAr}
                    onChange={(e) =>
                      setNewExam({
                        ...newExam,
                        subjectAr: e.target.value,
                        subjectEn: e.target.value,
                      })
                    }
                    className="ss-input text-xs sm:text-sm font-semibold"
                  >
                    <option value="الرياضيات">الرياضيات / Math</option>
                    <option value="العلوم العامة">العلوم / Science</option>
                    <option value="اللغة العربية">اللغة العربية / Arabic</option>
                    <option value="اللغة الإنجليزية">اللغة الإنجليزية / English</option>
                    <option value="علوم الحاسب">علوم الحاسب / CS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                    {arabic ? 'الفصل المستهدف' : 'Target Class'}
                  </label>
                  <select
                    value={newExam.classAr}
                    onChange={(e) =>
                      setNewExam({
                        ...newExam,
                        classAr: e.target.value,
                        classEn: e.target.value,
                      })
                    }
                    className="ss-input text-xs sm:text-sm font-semibold"
                  >
                    <option value="الصف الأول - أ">الصف الأول - أ (Grade 1-A)</option>
                    <option value="الصف الثاني - أ">الصف الثاني - أ (Grade 2-A)</option>
                    <option value="الصف الثالث - ب">الصف الثالث - ب (Grade 3-B)</option>
                    <option value="الصف الرابع - أ">الصف الرابع - أ (Grade 4-A)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                    {arabic ? 'التاريخ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    required
                    value={newExam.date}
                    onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
                    className="ss-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                    {arabic ? 'الوقت' : 'Time'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newExam.time}
                    onChange={(e) => setNewExam({ ...newExam, time: e.target.value })}
                    className="ss-input text-sm"
                    placeholder="09:00 ص"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                    {arabic ? 'المدة (دقيقة)' : 'Duration (min)'}
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    required
                    value={newExam.durationMinutes}
                    onChange={(e) =>
                      setNewExam({ ...newExam, durationMinutes: Number(e.target.value) })
                    }
                    className="ss-input text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                    {arabic ? 'الدرجة العظمى' : 'Max Marks'}
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="200"
                    required
                    value={newExam.maxMarks}
                    onChange={(e) =>
                      setNewExam({ ...newExam, maxMarks: Number(e.target.value) })
                    }
                    className="ss-input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                    {arabic ? 'درجة النجاح' : 'Pass Marks'}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max={newExam.maxMarks}
                    required
                    value={newExam.passingMarks}
                    onChange={(e) =>
                      setNewExam({ ...newExam, passingMarks: Number(e.target.value) })
                    }
                    className="ss-input text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#e2e8f0] dark:border-white/[0.08] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  {arabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn-teal text-xs">
                  {arabic ? 'تأكيد الجدولة' : 'Schedule Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
