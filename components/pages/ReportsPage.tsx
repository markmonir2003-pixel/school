'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Calendar,
  Filter,
  BarChart3,
  Users,
  DollarSign,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Eye,
  RefreshCw,
  Search
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge, type BadgeVariant } from '@/components/shared/Badge'
import { cn } from '@/lib/utils'
import { useSchool } from '@/lib/school/store'
import {
  attendanceRate,
  attendanceTrend,
  gradeAverage,
  reasonText,
  schoolMetrics,
  subjectPerformance,
  summarizeAttendance,
} from '@/lib/school/engine'
import { exportRowsToXlsx, htmlTable, printPdf } from '@/lib/school/excel'

type ReportType =
  | 'academic'
  | 'attendance'
  | 'financial'
  | 'teacher'
  | 'progress'
  | 'ai_insights'

interface ReportTypeMeta {
  id: ReportType
  titleAr: string
  titleEn: string
  descAr: string
  descEn: string
  icon: React.ComponentType<{ className?: string }>
  badgeTextAr: string
  badgeTextEn: string
  color: string
}

const reportTypes: ReportTypeMeta[] = [
  {
    id: 'academic',
    titleAr: 'الأداء الأكاديمي والتحصيل',
    titleEn: 'Academic Performance',
    descAr: 'تحليل درجات الاختبارات، نسب النجاح والرسوب، ومقارنة المواد',
    descEn: 'Exam scores, pass/fail thresholds, and curriculum subject benchmarks',
    icon: BarChart3,
    badgeTextAr: 'الأكثر طلباً',
    badgeTextEn: 'Popular',
    color: '#19a99a',
  },
  {
    id: 'attendance',
    titleAr: 'الحضور والغياب والالتزام',
    titleEn: 'Attendance & Punctuality',
    descAr: 'سجلات الحضور اليومي، معدلات الغياب المزمن، والتأخير',
    descEn: 'Daily attendance rosters, chronic absenteeism, and tardiness analysis',
    icon: Clock,
    badgeTextAr: 'أسبوعي',
    badgeTextEn: 'Weekly',
    color: '#3b82f6',
  },
  {
    id: 'financial',
    titleAr: 'التقرير المالي والمصروفات',
    titleEn: 'Financial & Tuition',
    descAr: 'تحصيل الرسوم المدرسية، المتأخرات، وموازنة الأقسام',
    descEn: 'Tuition collections, outstanding dues, and departmental budgets',
    icon: DollarSign,
    badgeTextAr: 'شهري',
    badgeTextEn: 'Monthly',
    color: '#22c55e',
  },
  {
    id: 'teacher',
    titleAr: 'تقييم أداء المعلمين',
    titleEn: 'Teacher Evaluation',
    descAr: 'مؤشرات كفاءة التدريس، استطلاعات الطلاب، وتقييم الإدارة',
    descEn: 'Teaching efficacy indices, student surveys, and management reviews',
    icon: GraduationCap,
    badgeTextAr: 'فصلي',
    badgeTextEn: 'Termly',
    color: '#6366f1',
  },
  {
    id: 'progress',
    titleAr: 'تطور الطلاب الفردي',
    titleEn: 'Student Progress Tracking',
    descAr: 'المسار التعليمي التراكمي، المهارات المكتسبة، وتقارير أولياء الأمور',
    descEn: 'Cumulative learning curves, competency mastery, and parent dossiers',
    icon: Users,
    badgeTextAr: 'تراكمي',
    badgeTextEn: 'Cumulative',
    color: '#f59e0b',
  },
  {
    id: 'ai_insights',
    titleAr: 'تحليلات الذكاء الاصطناعي والتنبؤ',
    titleEn: 'AI Predictive Insights',
    descAr: 'تنبؤات التعثر المبكر، توصيات التحسين، وتحليلات المخاطر',
    descEn: 'Early failure forecasts, automated interventions, and risk clustering',
    icon: Sparkles,
    badgeTextAr: 'ذكاء متقدم',
    badgeTextEn: 'AI Engine',
    color: '#8b5cf6',
  },
]

// Mock preview data
type ReportRow = Record<string, string | number>

interface ReportPayload {
  titleAr: string
  titleEn: string
  headers: Record<string, string>
  rows: ReportRow[]
}

interface ReportHistoryEntry {
  id: string
  titleAr: string
  titleEn: string
  type: ReportType
  format: 'PDF' | 'Excel'
  size: string
  date: string
  generatedByAr: string
  generatedByEn: string
  status: string
  headers: Record<string, string>
  rows: ReportRow[]
}

export function ReportsPage({ arabic = true }: { arabic?: boolean }) {
  const { data, user } = useSchool()
  const [selectedType, setSelectedType] = useState<ReportType>('academic')
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().slice(0, 10)
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedGrade, setSelectedGrade] = useState('all')
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedAt, setGeneratedAt] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [history, setHistory] = useState<ReportHistoryEntry[]>([])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('smart-school-360:report-history:v1')
      if (raw) setHistory(JSON.parse(raw) as ReportHistoryEntry[])
    } catch {
      // Start with an empty archive if storage is unavailable.
    }
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const metrics = useMemo(() => schoolMetrics(data), [data])
  const activeMeta = reportTypes.find((r) => r.id === selectedType) || reportTypes[0]
  const gradeLevels = useMemo(() => Array.from(new Set(data.classes.map(c => c.gradeLevel))).sort((a, b) => a - b), [data])
  const scopedClasses = useMemo(
    () => data.classes.filter(c => selectedGrade === 'all' || c.gradeLevel === Number(selectedGrade)),
    [data, selectedGrade],
  )
  const scopedStudents = useMemo(() => {
    return data.students.filter(student =>
      student.status === 'active' &&
      (selectedGrade === 'all' || student.gradeLevel === Number(selectedGrade)) &&
      (selectedClass === 'all' || student.classId === selectedClass),
    )
  }, [data, selectedClass, selectedGrade])

  const averageForSubject = (studentId: string, subjectId: string) => {
    const examIds = new Set(data.exams.filter(exam => exam.subjectId === subjectId).map(exam => exam.id))
    const grades = data.grades.filter(grade => grade.studentId === studentId && examIds.has(grade.examId))
    if (grades.length === 0) return 0
    return Math.round(grades.reduce((sum, grade) => {
      const exam = data.exams.find(e => e.id === grade.examId)
      return sum + (exam ? (grade.score / exam.maxMarks) * 100 : 0)
    }, 0) / grades.length)
  }

  const passCount = scopedStudents.filter(student => gradeAverage(data, student.id) >= data.settings.passingPercentage).length
  const passRate = scopedStudents.length ? Math.round((passCount / scopedStudents.length) * 1000) / 10 : 0
  const honorCount = scopedStudents.filter(student => gradeAverage(data, student.id) >= 90).length
  const subjectRows = useMemo(() => subjectPerformance(data), [data])
  const topSubject = subjectRows.slice().sort((a, b) => b.average - a.average)[0]

  const scopedAttendance = useMemo(() => {
    const ids = new Set(scopedStudents.map(student => student.id))
    return data.attendance.filter(record => ids.has(record.studentId) && record.date >= dateFrom && record.date <= dateTo)
  }, [data, dateFrom, dateTo, scopedStudents])

  const attendanceSummary = useMemo(() => summarizeAttendance(scopedAttendance), [scopedAttendance])
  const unexcused = scopedAttendance.filter(record => record.status === 'absent').length
  const excused = scopedAttendance.filter(record => record.status === 'excused').length
  const attendanceTotal = Math.max(1, scopedAttendance.length)

  const bestAttendanceDay = useMemo(() => {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const rates = names.map((name, weekday) => {
      const records = scopedAttendance.filter(record => new Date(record.date + 'T00:00:00').getDay() === weekday)
      const present = records.filter(record => record.status === 'present' || record.status === 'late').length
      return { name, rate: records.length ? present / records.length : 0, total: records.length }
    })
    const best = rates.filter(row => row.total > 0).sort((a, b) => b.rate - a.rate)[0]
    return best?.name ?? '—'
  }, [scopedAttendance])

  const academicPreviewData = useMemo(() => {
    return subjectPerformance(data, selectedClass === 'all' ? undefined : selectedClass)
      .map(row => ({
        name: arabic ? row.subject.nameAr : row.subject.nameEn,
        score: Math.round(row.average),
        avg: data.settings.passingPercentage,
      }))
  }, [arabic, data, selectedClass])

  const attendancePreviewData = useMemo(() => {
    return attendanceTrend(data, 14).map(point => ({
      week: point.label,
      present: point.rate,
      target: data.settings.attendanceThreshold,
    }))
  }, [data])

  const buildReport = (type: ReportType): ReportPayload | null => {
    const headers: Record<string, string> = {}
    const rows: ReportRow[] = []
    const subjectFilter = selectedSubject === 'all' ? undefined : selectedSubject
    const classNameOf = (classId: string) => data.classes.find(c => c.id === classId)?.[arabic ? 'nameAr' : 'nameEn'] ?? '—'

    if (type === 'academic') {
      headers.studentId = arabic ? 'الرقم الأكاديمي' : 'Student ID'
      headers.name = arabic ? 'اسم الطالب' : 'Student name'
      headers.className = arabic ? 'الفصل' : 'Class'
      headers.average = subjectFilter ? (arabic ? 'متوسط المادة' : 'Subject average') : (arabic ? 'المعدل' : 'Average')
      headers.attendance = arabic ? 'نسبة الحضور' : 'Attendance %'
      scopedStudents.forEach(student => {
        rows.push({
          studentId: student.studentId,
          name: arabic ? student.nameAr : student.nameEn,
          className: classNameOf(student.classId),
          average: subjectFilter ? averageForSubject(student.id, subjectFilter) : gradeAverage(data, student.id),
          attendance: attendanceRate(data, student.id, 30),
        })
      })
    } else if (type === 'attendance') {
      headers.studentId = arabic ? 'الرقم الأكاديمي' : 'Student ID'
      headers.name = arabic ? 'اسم الطالب' : 'Student name'
      headers.present = arabic ? 'حاضر' : 'Present'
      headers.absent = arabic ? 'غائب' : 'Absent'
      headers.late = arabic ? 'متأخر' : 'Late'
      headers.excused = arabic ? 'بعذر' : 'Excused'
      headers.rate = arabic ? 'النسبة' : 'Rate %'
      scopedStudents.forEach(student => {
        const records = scopedAttendance.filter(record => record.studentId === student.id)
        const present = records.filter(record => record.status === 'present').length
        const absent = records.filter(record => record.status === 'absent').length
        const late = records.filter(record => record.status === 'late').length
        const excusedCount = records.filter(record => record.status === 'excused').length
        rows.push({
          studentId: student.studentId,
          name: arabic ? student.nameAr : student.nameEn,
          present,
          absent,
          late,
          excused: excusedCount,
          rate: records.length ? Math.round(((present + late) / records.length) * 1000) / 10 : 0,
        })
      })
    } else if (type === 'teacher') {
      headers.teacherId = arabic ? 'رقم المعلم' : 'Teacher ID'
      headers.name = arabic ? 'اسم المعلم' : 'Teacher name'
      headers.classes = arabic ? 'عدد الفصول' : 'Classes'
      headers.students = arabic ? 'عدد الطلاب' : 'Students'
      headers.average = arabic ? 'متوسط طلاب فصوله' : 'Class average'
      data.teachers.filter(teacher => teacher.status === 'active').forEach(teacher => {
        const roster = data.students.filter(student => student.status === 'active' && teacher.classIds.includes(student.classId))
        const averages = roster.map(student => gradeAverage(data, student.id)).filter(value => value > 0)
        rows.push({
          teacherId: teacher.id,
          name: arabic ? teacher.nameAr : teacher.nameEn,
          classes: teacher.classIds.length,
          students: roster.length,
          average: averages.length ? Math.round(averages.reduce((sum, value) => sum + value, 0) / averages.length) : 0,
        })
      })
    } else if (type === 'progress') {
      headers.subject = arabic ? 'المادة' : 'Subject'
      headers.average = arabic ? 'متوسط الدرجات' : 'Average'
      headers.passRate = arabic ? 'نسبة النجاح' : 'Pass rate %'
      headers.students = arabic ? 'عدد الطلاب' : 'Students'
      subjectRows.forEach(row => {
        const roster = scopedStudents.filter(student => averageForSubject(student.id, row.subject.id) > 0)
        const passing = roster.filter(student => averageForSubject(student.id, row.subject.id) >= data.settings.passingPercentage).length
        rows.push({
          subject: arabic ? row.subject.nameAr : row.subject.nameEn,
          average: Math.round(row.average),
          passRate: roster.length ? Math.round((passing / roster.length) * 1000) / 10 : 0,
          students: roster.length,
        })
      })
    } else if (type === 'ai_insights') {
      headers.student = arabic ? 'اسم الطالب' : 'Student'
      headers.className = arabic ? 'الفصل' : 'Class'
      headers.risk = arabic ? 'درجة الخطورة' : 'Risk score'
      headers.severity = arabic ? 'الشدة' : 'Severity'
      headers.reasons = arabic ? 'أسباب التنبيه' : 'Reasons'
      const ids = new Set(scopedStudents.map(student => student.id))
      data.aiAlerts
        .filter(alert => ids.has(alert.studentId) && (alert.status === 'open' || alert.status === 'reviewing'))
        .forEach(alert => {
          const student = data.students.find(s => s.id === alert.studentId)
          rows.push({
            student: student ? (arabic ? student.nameAr : student.nameEn) : '—',
            className: student ? classNameOf(student.classId) : '—',
            risk: alert.riskScore,
            severity: alert.severity,
            reasons: alert.reasons.map(reason => reasonText(reason, arabic ? 'ar' : 'en')).join(' | '),
          })
        })
    } else {
      return null
    }

    return {
      titleAr: activeMeta.titleAr,
      titleEn: activeMeta.titleEn,
      headers,
      rows,
    }
  }

  const recordHistory = (payload: ReportPayload, format: 'PDF' | 'Excel') => {
    const entry: ReportHistoryEntry = {
      id: 'REP-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(history.length + 1).padStart(2, '0'),
      titleAr: payload.titleAr,
      titleEn: payload.titleEn,
      type: selectedType,
      format,
      size: payload.rows.length + (arabic ? ' صفاً' : ' rows'),
      date: new Date().toISOString().slice(0, 10),
      generatedByAr: user ? user.nameAr : 'النظام',
      generatedByEn: user ? user.nameEn : 'System',
      status: 'Ready',
      headers: payload.headers,
      rows: payload.rows,
    }
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, 12)
      try {
        window.localStorage.setItem('smart-school-360:report-history:v1', JSON.stringify(next))
      } catch {
        // Keep the in-memory archive when storage is unavailable.
      }
      return next
    })
  }

  const exportReport = (format: 'PDF' | 'Excel') => {
    const payload = buildReport(selectedType)
    if (!payload) {
      showToast(arabic ? 'بيانات التقارير المالية غير متصلة بمساحة العمل هذه.' : 'Financial data is not connected to this workspace.')
      return
    }
    if (payload.rows.length === 0) {
      showToast(arabic ? 'لا توجد بيانات مطابقة للنطاق المحدد.' : 'No data matches the selected scope.')
      return
    }
    const fileBase = selectedType + '-' + dateFrom + '-' + dateTo
    if (format === 'Excel') {
      exportRowsToXlsx(payload.rows, fileBase + '.xlsx', arabic ? 'تقرير' : 'Report', payload.headers)
    } else {
      printPdf({
        title: arabic ? payload.titleAr : payload.titleEn,
        subtitle: dateFrom + ' → ' + dateTo,
        lang: arabic ? 'ar' : 'en',
        bodyHtml: htmlTable(
          Object.values(payload.headers),
          payload.rows.map(row => Object.keys(payload.headers).map(key => String(row[key] ?? ''))),
        ),
        footer: (arabic ? (data.settings.schoolNameAr + ' — الحرم الرقمي') : (data.settings.schoolNameEn + ' — Digital Campus')),
      })
    }
    recordHistory(payload, format)
    setGeneratedAt(new Date().toISOString())
    showToast(
      format === 'Excel'
        ? (arabic ? 'تم تنزيل ' + payload.rows.length + ' صفاً بصيغة Excel.' : 'Downloaded ' + payload.rows.length + ' rows as Excel.')
        : (arabic ? 'تم فتح معاينة الطباعة / PDF.' : 'Print / PDF preview opened.'),
    )
  }

  const downloadHistory = (entry: ReportHistoryEntry) => {
    if (entry.format === 'Excel') {
      exportRowsToXlsx(entry.rows, entry.id + '.xlsx', arabic ? 'تقرير' : 'Report', entry.headers)
    } else {
      printPdf({
        title: arabic ? entry.titleAr : entry.titleEn,
        subtitle: entry.date,
        lang: arabic ? 'ar' : 'en',
        bodyHtml: htmlTable(
          Object.values(entry.headers),
          entry.rows.map(row => Object.keys(entry.headers).map(key => String(row[key] ?? ''))),
        ),
      })
    }
    showToast(arabic ? 'تم فتح ' + entry.id : 'Opened ' + entry.id)
  }

  const handleGenerateReport = () => {
    if (!dateFrom || !dateTo || dateFrom > dateTo) {
      showToast(arabic ? 'تحقق من نطاق التاريخ: البداية يجب أن تسبق النهاية.' : 'Check the date range: the start must precede the end.')
      return
    }
    setIsGenerating(true)
    setTimeout(() => {
      const payload = buildReport(selectedType)
      setIsGenerating(false)
      if (!payload) {
        showToast(arabic ? 'التقرير المالي يحتاج مصدر بيانات مالياً.' : 'The financial report needs a finance data source.')
        return
      }
      setGeneratedAt(new Date().toISOString())
      showToast(
        arabic
          ? 'تم توليد التقرير: ' + payload.rows.length + ' صفاً ضمن النطاق المحدد.'
          : 'Report generated: ' + payload.rows.length + ' rows in the selected scope.',
      )
    }, 500)
  }


  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto" dir={arabic ? 'rtl' : 'ltr'}>
      {/* ── Toast ──────────────────────────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-toast-in bg-[#182b52] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-teal-500/40">
          <CheckCircle2 className="size-5 text-[#2dd4bf]" />
          <p className="text-sm font-bold">{toastMessage}</p>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────── */}
      <PageHeader
        arabic={arabic}
        title={arabic ? 'التقارير المتقدمة والتحليلات' : 'Reports & Analytics'}
        subtitle={
          arabic
            ? 'توليد وتصدير التقارير الأكاديمية والإدارية والمالية بدقة عالية وبصيغ متعددة'
            : 'Generate, preview, and export high-precision institutional and analytical reports'
        }
        icon={TrendingUp}
        breadcrumb={[
          arabic ? 'الرئيسية' : 'Home',
          arabic ? 'التحليلات والذكاء' : 'Analytics & AI',
          arabic ? 'التقارير' : 'Reports',
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportReport('PDF')}
              className="btn-icon size-9"
              title={arabic ? 'طباعة' : 'Print'}
            >
              <Printer className="size-4" />
            </button>
            <button
              onClick={() => exportReport('Excel')}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => exportReport('PDF')}
              className="btn-teal text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20"
            >
              <Download className="size-3.5" />
              <span>PDF</span>
            </button>
          </div>
        }
      />

      {/* ── Report Type Selector Grid ─────────────────────────── */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
            {arabic ? '١. اختر نوع التقرير المطلوب' : '1. Select Report Type'}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {reportTypes.map((rt) => {
            const Icon = rt.icon
            const isSelected = selectedType === rt.id

            return (
              <button
                key={rt.id}
                onClick={() => setSelectedType(rt.id)}
                className={cn(
                  'card-base p-4 text-left transition-all duration-200 flex flex-col justify-between group relative cursor-pointer',
                  arabic ? 'text-right' : 'text-left',
                  isSelected
                    ? 'border-2 border-[#19a99a] bg-teal-50/30 dark:bg-teal-500/10 shadow-md ring-2 ring-[#19a99a]/20'
                    : 'hover:border-[#19a99a]/40'
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className="size-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105"
                      style={{ backgroundColor: `${rt.color}18`, color: rt.color }}
                    >
                      <Icon className="size-5" />
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${rt.color}15`, color: rt.color }}
                    >
                      {arabic ? rt.badgeTextAr : rt.badgeTextEn}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-[#182b52] dark:text-white leading-tight">
                    {arabic ? rt.titleAr : rt.titleEn}
                  </h4>
                  <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-1 line-clamp-2 leading-relaxed">
                    {arabic ? rt.descAr : rt.descEn}
                  </p>
                </div>

                <div className="pt-2.5 mt-2.5 border-t border-[#f1f5f9] dark:border-white/[0.05] flex items-center justify-between text-[11px] font-bold">
                  <span className={isSelected ? 'text-[#19a99a]' : 'text-[#94a3b8]'}>
                    {isSelected ? (arabic ? 'محدد حالياً' : 'Selected') : (arabic ? 'اختيار' : 'Select')}
                  </span>
                  {isSelected && <CheckCircle2 className="size-3.5 text-[#19a99a]" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Filters & Generation Parameter Bar ────────────────── */}
      <div className="card-base p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
            {arabic ? '٢. معايير ونطاق التقرير' : '2. Scope & Filter Parameters'}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Date From */}
          <div>
            <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
              {arabic ? 'من تاريخ:' : 'Date From:'}
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="ss-input text-xs font-semibold"
              />
            </div>
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
              {arabic ? 'إلى تاريخ:' : 'Date To:'}
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="ss-input text-xs font-semibold"
              />
            </div>
          </div>

          {/* Grade Level */}
          <div>
            <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
              {arabic ? 'المستوى الدراسي:' : 'Grade Level:'}
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="ss-input text-xs font-semibold cursor-pointer"
            >
              <option value="all">{arabic ? 'جميع الصفوف' : 'All Grades'}</option>
              {gradeLevels.map(level => (
                <option key={level} value={level}>{arabic ? 'الصف ' + level : 'Grade ' + level}</option>
              ))}
            </select>
          </div>

          {/* Class Section */}
          <div>
            <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
              {arabic ? 'الشعبة / الفصل:' : 'Section / Class:'}
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="ss-input text-xs font-semibold cursor-pointer"
            >
              <option value="all">{arabic ? 'كافة الشعب' : 'All Sections'}</option>
              {scopedClasses.map(cls => (
                <option key={cls.id} value={cls.id}>{arabic ? cls.nameAr : cls.nameEn}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
              {arabic ? 'المادة الدراسية:' : 'Subject Area:'}
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="ss-input text-xs font-semibold cursor-pointer"
            >
              <option value="all">{arabic ? 'جميع المواد' : 'All Subjects'}</option>
              {data.subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{arabic ? subject.nameAr : subject.nameEn}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Generate Button Row */}
        <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
            {arabic
              ? `التقرير المحدد: ${activeMeta.titleAr} • ${scopedStudents.length} طالباً • ${dateFrom} إلى ${dateTo}` + (generatedAt ? ` • آخر توليد ${new Date(generatedAt).toLocaleTimeString('ar-EG')}` : '')
              : `Selected Report: ${activeMeta.titleEn} • ${scopedStudents.length} students • ${dateFrom} to ${dateTo}` + (generatedAt ? ` • generated ${new Date(generatedAt).toLocaleTimeString('en-US')}` : '')}
          </p>

          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="btn-teal flex items-center gap-2 shadow-md shadow-teal-500/20"
          >
            <RefreshCw className={cn("size-4", isGenerating && "animate-spin")} />
            <span>{isGenerating ? (arabic ? 'جارٍ المعالجة...' : 'Generating...') : (arabic ? 'توليد التقرير المباشر' : 'Generate Report')}</span>
          </button>
        </div>
      </div>

      {/* ── Dynamic Preview Panel ─────────────────────────────── */}
      <div className="card-base p-6 space-y-6 border-t-4 border-t-[#19a99a]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2e8f0] dark:border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div
              className="size-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: `${activeMeta.color}20`, color: activeMeta.color }}
            >
              <activeMeta.icon className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-[#182b52] dark:text-white">
                  {arabic ? `معاينة تقرير: ${activeMeta.titleAr}` : `Preview: ${activeMeta.titleEn}`}
                </h3>
                <Badge variant="teal">{arabic ? 'محدث للتو' : 'Live Preview'}</Badge>
              </div>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                {arabic ? 'مستخرج من قاعدة بيانات المدرسة المعتمدة للفصل الدراسي الحالي' : 'Extracted from institutional verified database'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportReport('PDF')}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Download className="size-3.5" />
              <span>{arabic ? 'تحميل كـ PDF' : 'Download PDF'}</span>
            </button>
            <button
              onClick={() => exportReport('Excel')}
              className="btn-teal text-xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="size-3.5" />
              <span>{arabic ? 'تحميل كـ Excel' : 'Download Excel'}</span>
            </button>
          </div>
        </div>

        {/* Preview Content based on selected type */}
        {selectedType === 'academic' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03] border border-[#e2e8f0] dark:border-white/[0.06]">
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8] font-bold">{arabic ? 'المعدل العام للمدرسة' : 'Overall School Avg'}</p>
                <p className="text-2xl font-extrabold text-[#19a99a] mt-1">{metrics.average}%</p>
                <p className="text-[11px] text-[#64748b] font-medium mt-1">{arabic ? 'مباشر من سجل الدرجات' : 'live from the grade registry'}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03] border border-[#e2e8f0] dark:border-white/[0.06]">
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8] font-bold">{arabic ? 'نسبة النجاح' : 'Pass Rate'}</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{passRate}%</p>
                <p className="text-[11px] text-[#64748b] font-medium mt-1">{passCount} / {scopedStudents.length} {arabic ? 'طالباً' : 'students'}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03] border border-[#e2e8f0] dark:border-white/[0.06]">
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8] font-bold">{arabic ? 'المادة الأعلى تحصيلاً' : 'Top Subject'}</p>
                <p className="text-2xl font-extrabold text-indigo-600 mt-1">{topSubject ? (arabic ? topSubject.subject.nameAr : topSubject.subject.nameEn) : '—'}</p>
                <p className="text-[11px] text-[#64748b] font-medium mt-1">{topSubject ? Math.round(topSubject.average) : 0}% {arabic ? 'متوسط' : 'average'}</p>
              </div>
              <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03] border border-[#e2e8f0] dark:border-white/[0.06]">
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8] font-bold">{arabic ? 'الطلاب المتفوقون (A)' : 'Honor Roll (A)'}</p>
                <p className="text-2xl font-extrabold text-[#182b52] dark:text-white mt-1">{honorCount}</p>
                <p className="text-[11px] text-[#64748b] font-medium mt-1">{scopedStudents.length ? Math.round((honorCount / scopedStudents.length) * 1000) / 10 : 0}% {arabic ? 'من الطلاب' : 'of students'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-[#182b52] dark:text-white">
                {arabic ? 'مقارنة متوسط تحصيل الطلاب بالمتوسط العام للمنهج' : 'Subject Average vs Benchmark Target'}
              </h4>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={academicPreviewData} barSize={24} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        background: '#0f1f3d',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        color: '#e2e8f0',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="score" name={arabic ? 'معدل الطلاب' : 'Class Score'} fill="#19a99a" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="avg" name={arabic ? 'المستهدف' : 'Benchmark'} fill="#94a3b8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {selectedType === 'attendance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03]">
                <p className="text-xs text-[#94a3b8] font-bold">{arabic ? 'متوسط الحضور' : 'Avg Attendance'}</p>
                <p className="text-2xl font-extrabold text-[#19a99a] mt-1">{attendanceSummary.rate}%</p>
              </div>
              <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03]">
                <p className="text-xs text-[#94a3b8] font-bold">{arabic ? 'الغياب بعذر' : 'Excused Absences'}</p>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">{Math.round((excused / attendanceTotal) * 1000) / 10}%</p>
              </div>
              <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03]">
                <p className="text-xs text-[#94a3b8] font-bold">{arabic ? 'الغياب غير المبرر' : 'Unexcused'}</p>
                <p className="text-2xl font-extrabold text-rose-500 mt-1">{Math.round((unexcused / attendanceTotal) * 1000) / 10}%</p>
              </div>
              <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03]">
                <p className="text-xs text-[#94a3b8] font-bold">{arabic ? 'أفضل يوم حضور' : 'Best Attendance Day'}</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{bestAttendanceDay}</p>
              </div>
            </div>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendancePreviewData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis domain={[90, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      background: '#0f1f3d',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="present" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="target" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {selectedType === 'financial' && (
          <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-500/20 text-center space-y-3">
            <div className="size-14 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
              <activeMeta.icon className="size-7" />
            </div>
            <h4 className="text-base font-extrabold text-[#182b52] dark:text-white">
              {arabic ? 'بيانات التقارير المالية غير متصلة' : 'Financial data source not connected'}
            </h4>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] max-w-lg mx-auto">
              {arabic
                ? 'هذه المساحة التجريبية لا تحتوي على سجلات رسوم أو مدفوعات، لذلك لن نخترع أرقاماً مالية. اربط نظام المحاسبة من صفحة الإعدادات لتفعيل هذا التقرير.'
                : 'This workspace has no tuition or payment records, so no financial figures are invented. Connect an accounting source from Settings to enable this report.'}
            </p>
            <button
              onClick={() => { window.location.hash = 'settings' }}
              className="btn-secondary text-xs mx-auto"
            >
              {arabic ? 'فتح الإعدادات' : 'Open Settings'}
            </button>
          </div>
        )}

        {(selectedType === 'teacher' || selectedType === 'progress' || selectedType === 'ai_insights') && (() => {
          const payload = buildReport(selectedType)
          if (!payload) return null
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#182b52] dark:text-white">
                  {arabic ? payload.titleAr : payload.titleEn}
                </h4>
                <Badge variant="teal">{payload.rows.length} {arabic ? 'صفاً' : 'rows'}</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="ss-table">
                  <thead>
                    <tr>
                      {Object.values(payload.headers).map(header => <th key={header}>{header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {payload.rows.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        {Object.keys(payload.headers).map(key => (
                          <td key={key} className="text-xs">{String(row[key] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {payload.rows.length === 0 && (
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">{arabic ? 'لا توجد صفوف مطابقة للنطاق.' : 'No rows match this scope.'}</p>
              )}
              <button onClick={() => exportReport('Excel')} className="btn-teal text-xs">
                {arabic ? 'تصدير التقرير الكامل' : 'Export Full Report'}
              </button>
            </div>
          )
        })()}
      </div>

      {/* ── Recent Reports Table ──────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-[#182b52] dark:text-white tracking-tight">
              {arabic ? 'التقارير التي تم إنشاؤها مؤخراً' : 'Recently Generated Reports'}
            </h3>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'سجل المحفوظات للتقارير الصادرة مع إمكانية إعادة التحميل الفوري' : 'Archive of exported dossiers available for instant re-download'}
            </p>
          </div>
          <span className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8]">
            {history.length} {arabic ? 'تقريراً محفوظاً' : 'archived reports'}
          </span>
        </div>

        <div className="card-base overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ss-table">
              <thead>
                <tr>
                  <th>{arabic ? 'رقم التقرير' : 'Report ID'}</th>
                  <th>{arabic ? 'عنوان التقرير' : 'Report Title'}</th>
                  <th>{arabic ? 'الصيغة' : 'Format'}</th>
                  <th>{arabic ? 'الحجم' : 'File Size'}</th>
                  <th>{arabic ? 'تاريخ الإنشاء' : 'Date Created'}</th>
                  <th>{arabic ? 'المُنشئ' : 'Author'}</th>
                  <th className="text-center">{arabic ? 'التحميل' : 'Download'}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((rep) => (
                  <tr key={rep.id}>
                    <td className="font-mono text-xs font-bold text-[#19a99a]">
                      {rep.id}
                    </td>
                    <td className="font-bold text-sm text-[#182b52] dark:text-white">
                      {arabic ? rep.titleAr : rep.titleEn}
                    </td>
                    <td>
                      <Badge variant={rep.format === 'PDF' ? 'danger' : 'success'}>
                        {rep.format}
                      </Badge>
                    </td>
                    <td className="font-mono text-xs text-[#64748b]">
                      {rep.size}
                    </td>
                    <td className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                      {rep.date}
                    </td>
                    <td className="text-xs font-semibold text-[#182b52] dark:text-white">
                      {arabic ? rep.generatedByAr : rep.generatedByEn}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => downloadHistory(rep)}
                        className="btn-icon size-8 hover:text-[#19a99a] hover:border-[#19a99a]/30"
                        title={arabic ? 'تحميل الملف' : 'Download File'}
                      >
                        <Download className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-xs text-[#64748b] dark:text-[#94a3b8] py-6">
                      {arabic ? 'لم تصدّر أي تقرير بعد. استخدم أزرار PDF أو Excel أعلاه.' : 'No reports exported yet. Use the PDF or Excel buttons above.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
