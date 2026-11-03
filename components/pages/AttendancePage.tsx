'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  ClipboardCheck,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock,
  FileCheck,
  Save,
  Send,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  UserCheck,
  UserX,
  UserMinus,
  Sparkles,
  PhoneCall
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/shared/Badge'
import { cn } from '@/lib/utils'
import { useSchool } from '@/lib/school/store'
import { attendanceRate, attendanceTrend, teacherClassIds, visibleStudents } from '@/lib/school/engine'

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

interface StudentAttendance {
  id: string
  rollNo: string
  nameAr: string
  nameEn: string
  avatar: string
  status: AttendanceStatus
  monthlyRate: number
  parentPhone: string
  notes?: string
}

// 30 Days trend data is derived from the shared store inside the component.
const trendData = [
  { day: '1', rate: 94.2 },
  { day: '2', rate: 95.1 },
  { day: '3', rate: 96.0 },
  { day: '4', rate: 93.8 },
  { day: '5', rate: 92.4 },
  { day: '7', rate: 95.5 },
  { day: '8', rate: 96.2 },
  { day: '9', rate: 94.8 },
  { day: '10', rate: 91.5 },
  { day: '11', rate: 93.0 },
  { day: '14', rate: 95.8 },
  { day: '15', rate: 96.5 },
  { day: '16', rate: 95.2 },
  { day: '17', rate: 94.1 },
  { day: '18', rate: 93.7 },
  { day: '21', rate: 96.0 },
  { day: '22', rate: 97.2 },
  { day: '23', rate: 96.8 },
  { day: '24', rate: 95.4 },
  { day: '25', rate: 94.9 },
  { day: '28', rate: 96.1 },
  { day: '29', rate: 95.7 },
  { day: '30', rate: 96.4 },
]

// 35 Calendar cells (5 weeks x 7 days)
const calendarDays = [
  { day: 28, isCurrentMonth: false, rate: 94 },
  { day: 29, isCurrentMonth: false, rate: 95 },
  { day: 30, isCurrentMonth: false, rate: 93 },
  { day: 1, isCurrentMonth: true, rate: 96 },
  { day: 2, isCurrentMonth: true, rate: 95 },
  { day: 3, isCurrentMonth: true, rate: 0, isWeekend: true },
  { day: 4, isCurrentMonth: true, rate: 0, isWeekend: true },
  { day: 5, isCurrentMonth: true, rate: 94 },
  { day: 6, isCurrentMonth: true, rate: 97 },
  { day: 7, isCurrentMonth: true, rate: 95 },
  { day: 8, isCurrentMonth: true, rate: 92 },
  { day: 9, isCurrentMonth: true, rate: 96 },
  { day: 10, isCurrentMonth: true, rate: 0, isWeekend: true },
  { day: 11, isCurrentMonth: true, rate: 0, isWeekend: true },
  { day: 12, isCurrentMonth: true, rate: 93 },
  { day: 13, isCurrentMonth: true, rate: 98 },
  { day: 14, isCurrentMonth: true, rate: 95 },
  { day: 15, isCurrentMonth: true, rate: 91 },
  { day: 16, isCurrentMonth: true, rate: 94 },
  { day: 17, isCurrentMonth: true, rate: 0, isWeekend: true },
  { day: 18, isCurrentMonth: true, rate: 0, isWeekend: true },
  { day: 19, isCurrentMonth: true, rate: 96 },
  { day: 20, isCurrentMonth: true, rate: 97 },
  { day: 21, isCurrentMonth: true, rate: 95 },
  { day: 22, isCurrentMonth: true, rate: 89 },
  { day: 23, isCurrentMonth: true, rate: 96 },
  { day: 24, isCurrentMonth: true, rate: 0, isWeekend: true },
  { day: 25, isCurrentMonth: true, rate: 0, isWeekend: true },
  { day: 26, isCurrentMonth: true, rate: 95 },
  { day: 27, isCurrentMonth: true, rate: 96 },
  { day: 28, isCurrentMonth: true, rate: 94 },
  { day: 29, isCurrentMonth: true, rate: 97 },
  { day: 30, isCurrentMonth: true, rate: 96, isToday: true },
  { day: 31, isCurrentMonth: true, rate: 0, isWeekend: true },
  { day: 1, isCurrentMonth: false, rate: 0, isWeekend: true },
]

export function AttendancePage({ arabic = true }: { arabic?: boolean }) {
  const { data, user, saveAttendance } = useSchool()
  const initialClass = useMemo(() => {
    if (user?.role === 'teacher') return teacherClassIds(data, user)[0] ?? data.classes[0]?.id ?? ''
    return data.classes[0]?.id ?? ''
  }, [data, user])
  const [selectedClass, setSelectedClass] = useState(initialClass)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all')
  const [showSavedToast, setShowSavedToast] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [students, setStudents] = useState<StudentAttendance[]>([])

  useEffect(() => {
    const roster = visibleStudents(data, user).filter(s => s.classId === selectedClass && s.status === 'active')
    const records = data.attendance.filter(r => r.classId === selectedClass && r.date === selectedDate && r.session === 'morning')
    setStudents(roster.map(student => {
      const record = records.find(r => r.studentId === student.id)
      const parent = data.parents.find(p => p.studentIds.includes(student.id))
      return {
        id: student.id,
        rollNo: student.studentId.split('-').pop() ?? student.studentId,
        nameAr: student.nameAr,
        nameEn: student.nameEn,
        avatar: student.nameAr.slice(0, 1),
        status: (record?.status ?? 'present') as AttendanceStatus,
        monthlyRate: attendanceRate(data, student.id, 30),
        parentPhone: parent?.phone ?? '—',
        notes: record?.note,
      }
    }))
  }, [data, user, selectedClass, selectedDate])

  const trendData = useMemo(() => attendanceTrend(data, 20).map(point => ({ day: point.label, rate: point.rate })), [data])
  const classOptions = useMemo(() => {
    const allowed = user?.role === 'teacher' ? new Set(teacherClassIds(data, user)) : null
    return data.classes.filter(c => !allowed || allowed.has(c.id))
  }, [data, user])

  // Calculations based on current student statuses
  const counts = useMemo(() => {
    let present = 0
    let absent = 0
    let late = 0
    let excused = 0
    students.forEach((s) => {
      if (s.status === 'present') present++
      else if (s.status === 'absent') absent++
      else if (s.status === 'late') late++
      else if (s.status === 'excused') excused++
    })
    const total = students.length
    const attendancePercentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0
    return { present, absent, late, excused, total, attendancePercentage }
  }, [students])

  // Change single student status
  const handleSetStatus = (id: string, newStatus: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    )
  }

  // Bulk: Mark All Present
  const handleMarkAllPresent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: 'present' })))
  }

  // Save attendance
  const handleSaveAttendance = async () => {
    const result = await saveAttendance(
      selectedClass,
      selectedDate,
      'morning',
      students.map(s => ({ studentId: s.id, status: s.status, note: s.notes })),
    )
    setSavedCount(result.saved)
    setShowSavedToast(true)
    setTimeout(() => setShowSavedToast(false), 3500)
  }

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.includes(searchQuery)

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto relative" dir={arabic ? 'rtl' : 'ltr'}>
      {/* ── Toast Notification ────────────────────────────────── */}
      {showSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-toast-in bg-[#182b52] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-teal-500/40">
          <div className="size-8 rounded-lg bg-teal-500/20 text-[#2dd4bf] flex items-center justify-center">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold">
              {arabic ? 'تم حفظ سجل الحضور بنجاح' : 'Attendance Saved Successfully'}
            </p>
            <p className="text-xs text-[#94a3b8]">
              {arabic ? `تم حفظ ${savedCount} سجل — وأُرسلت إشعارات الغياب لأولياء الأمور` : `${savedCount} records saved — absence notices queued for parents`}
            </p>
          </div>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────── */}
      <PageHeader
        arabic={arabic}
        title={arabic ? 'الحضور والانصراف اليومي' : 'Attendance Management'}
        subtitle={
          arabic
            ? 'رصد الحضور الفعلي، متابعة حالات الغياب والتأخر، وتحليل المؤشرات الزمنية'
            : 'Track daily attendance, absences, tardiness, and long-term trends'
        }
        icon={ClipboardCheck}
        breadcrumb={[
          arabic ? 'الرئيسية' : 'Home',
          arabic ? 'الإدارة الأكاديمية' : 'Academics',
          arabic ? 'الحضور والانصراف' : 'Attendance',
        ]}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Class Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-[#0f1f3d] px-3 py-1.5 rounded-xl border border-[#e2e8f0] dark:border-white/[0.08] shadow-sm">
              <span className="text-xs font-bold text-[#64748b] dark:text-[#94a3b8]">
                {arabic ? 'الفصل:' : 'Class:'}
              </span>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                aria-label={arabic ? 'اختيار الفصل' : 'Select Class'}
                className="bg-transparent text-xs font-bold text-[#182b52] dark:text-white focus:outline-none cursor-pointer"
              >
                {classOptions.map(cls => (
                  <option key={cls.id} value={cls.id} className="dark:bg-[#0f1f3d]">
                    {arabic ? cls.nameAr : cls.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-[#0f1f3d] px-3 py-1.5 rounded-xl border border-[#e2e8f0] dark:border-white/[0.08] shadow-sm">
              <CalendarIcon className="size-4 text-[#19a99a]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label={arabic ? 'تاريخ الحضور' : 'Attendance date'}
                className="bg-transparent text-xs font-bold text-[#182b52] dark:text-white focus:outline-none cursor-pointer"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveAttendance}
              className="btn-teal flex items-center gap-2 shadow-md shadow-teal-500/20"
            >
              <Save className="size-4" />
              <span>{arabic ? 'حفظ الحضور' : 'Save Attendance'}</span>
            </button>
          </div>
        }
      />

      {/* ── Summary Cards Row ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Present */}
        <div className="card-base p-5 border-l-4 border-l-emerald-500 dark:border-l-emerald-400">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'حضور' : 'Present'}
            </span>
            <div className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="size-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-extrabold text-[#182b52] dark:text-white">
              {counts.present}
            </h3>
            <span className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8]">
              / {counts.total} ({counts.attendancePercentage}%)
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
            {arabic ? 'نسبة حضور ممتازة اليوم' : 'Strong attendance rate today'}
          </p>
        </div>

        {/* Absent */}
        <div className="card-base p-5 border-l-4 border-l-rose-500 dark:border-l-rose-400">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'غياب' : 'Absent'}
            </span>
            <div className="size-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <UserX className="size-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
              {counts.absent}
            </h3>
            <span className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'طالب' : 'students'}
            </span>
          </div>
          <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-2 font-medium flex items-center gap-1">
            <AlertCircle className="size-3 text-rose-500" />
            <span>{arabic ? 'يتطلب إشعار أولياء الأمور' : 'Requires parent SMS'}</span>
          </p>
        </div>

        {/* Late */}
        <div className="card-base p-5 border-l-4 border-l-amber-500 dark:border-l-amber-400">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'تأخر' : 'Late'}
            </span>
            <div className="size-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="size-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {counts.late}
            </h3>
            <span className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'طلاب' : 'students'}
            </span>
          </div>
          <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-2 font-medium">
            {arabic ? 'متوسط التأخر: ١٢ دقيقة' : 'Avg tardiness: 12 min'}
          </p>
        </div>

        {/* Excused */}
        <div className="card-base p-5 border-l-4 border-l-blue-500 dark:border-l-blue-400">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'استئذان / عذر' : 'Excused'}
            </span>
            <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileCheck className="size-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
              {counts.excused}
            </h3>
            <span className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'حالة معتمدة' : 'approved'}
            </span>
          </div>
          <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-2 font-medium">
            {arabic ? 'تقارير طبية موثقة' : 'Documented medical excuse'}
          </p>
        </div>
      </div>

      {/* ── Main Two Column Layout: Table + Analytics ─────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* ── Left Column: Attendance Roster (Span 2) ──────────── */}
        <div className="xl:col-span-2 space-y-4">
          <div className="card-base p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className={cn("size-4 text-[#94a3b8] absolute top-1/2 -translate-y-1/2", arabic ? "right-3.5" : "left-3.5")} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={arabic ? 'البحث بالاسم أو الرقم...' : 'Search student by name or roll...'}
                className={cn("ss-input text-xs sm:text-sm", arabic ? "pr-10" : "pl-10")}
              />
            </div>

            {/* Quick Actions & Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-[#f1f5f9] dark:bg-white/[0.04] p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-[#0f1f3d] text-[#19a99a] shadow-sm font-bold'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  )}
                >
                  {arabic ? 'الكل' : 'All'}
                </button>
                <button
                  onClick={() => setStatusFilter('absent')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    statusFilter === 'absent'
                      ? 'bg-white dark:bg-[#0f1f3d] text-rose-600 shadow-sm font-bold'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  )}
                >
                  {arabic ? 'الغياب' : 'Absent'}
                </button>
                <button
                  onClick={() => setStatusFilter('late')}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-all',
                    statusFilter === 'late'
                      ? 'bg-white dark:bg-[#0f1f3d] text-amber-600 shadow-sm font-bold'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  )}
                >
                  {arabic ? 'المتأخرون' : 'Late'}
                </button>
              </div>

              <button
                onClick={handleMarkAllPresent}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Check className="size-3.5 text-emerald-600" />
                <span>{arabic ? 'الكل حاضر' : 'Mark All Present'}</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="card-base overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ss-table">
                <thead>
                  <tr>
                    <th className="w-12 text-center">#</th>
                    <th>{arabic ? 'بيانات الطالب' : 'Student Name'}</th>
                    <th>{arabic ? 'المعدل الشهري' : 'Monthly Rate'}</th>
                    <th className="text-center">{arabic ? 'تسجيل الحالة' : 'Status Toggle'}</th>
                    <th>{arabic ? 'ولي الأمر' : 'Parent Contact'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((st) => (
                    <tr key={st.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                      <td className="text-center font-mono text-xs text-[#94a3b8]">
                        {st.rollNo}
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-gradient-to-br from-[#182b52] to-[#19a99a] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                            {st.avatar}
                          </div>
                          <div>
                            <p className="font-bold text-[#182b52] dark:text-white text-sm">
                              {arabic ? st.nameAr : st.nameEn}
                            </p>
                            {st.notes && (
                              <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] italic">
                                {st.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-[#f1f5f9] dark:bg-white/[0.08] overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                st.monthlyRate >= 95
                                  ? "bg-emerald-500"
                                  : st.monthlyRate >= 85
                                  ? "bg-teal-500"
                                  : "bg-rose-500"
                              )}
                              style={{ width: `${st.monthlyRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-[#182b52] dark:text-white">
                            {st.monthlyRate}%
                          </span>
                        </div>
                      </td>

                      <td>
                        {/* 4-way Status Toggle Button Group */}
                        <div className="flex items-center justify-center gap-1 bg-[#f8fafc] dark:bg-white/[0.04] p-1 rounded-xl border border-[#e2e8f0] dark:border-white/[0.08]">
                          {/* Present */}
                          <button
                            onClick={() => handleSetStatus(st.id, 'present')}
                            title={arabic ? 'حاضر' : 'Present'}
                            className={cn(
                              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                              st.status === 'present'
                                ? 'bg-emerald-500 text-white shadow-sm scale-105'
                                : 'text-[#64748b] dark:text-[#94a3b8] hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                            )}
                          >
                            <Check className="size-3 stroke-[3]" />
                            <span className="hidden sm:inline">{arabic ? 'حاضر' : 'Present'}</span>
                          </button>

                          {/* Absent */}
                          <button
                            onClick={() => handleSetStatus(st.id, 'absent')}
                            title={arabic ? 'غائب' : 'Absent'}
                            className={cn(
                              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                              st.status === 'absent'
                                ? 'bg-rose-500 text-white shadow-sm scale-105'
                                : 'text-[#64748b] dark:text-[#94a3b8] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                            )}
                          >
                            <X className="size-3 stroke-[3]" />
                            <span className="hidden sm:inline">{arabic ? 'غائب' : 'Absent'}</span>
                          </button>

                          {/* Late */}
                          <button
                            onClick={() => handleSetStatus(st.id, 'late')}
                            title={arabic ? 'متأخر' : 'Late'}
                            className={cn(
                              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                              st.status === 'late'
                                ? 'bg-amber-500 text-white shadow-sm scale-105'
                                : 'text-[#64748b] dark:text-[#94a3b8] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                            )}
                          >
                            <Clock className="size-3 stroke-[2.5]" />
                            <span className="hidden sm:inline">{arabic ? 'متأخر' : 'Late'}</span>
                          </button>

                          {/* Excused */}
                          <button
                            onClick={() => handleSetStatus(st.id, 'excused')}
                            title={arabic ? 'مستأذن' : 'Excused'}
                            className={cn(
                              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                              st.status === 'excused'
                                ? 'bg-blue-500 text-white shadow-sm scale-105'
                                : 'text-[#64748b] dark:text-[#94a3b8] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10'
                            )}
                          >
                            <FileCheck className="size-3 stroke-[2.5]" />
                            <span className="hidden sm:inline">{arabic ? 'عذر' : 'Excused'}</span>
                          </button>
                        </div>
                      </td>

                      <td>
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${st.parentPhone}`}
                            className="size-7 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-[#19a99a] flex items-center justify-center hover:bg-[#19a99a] hover:text-white transition-colors"
                            title={st.parentPhone}
                          >
                            <PhoneCall className="size-3.5" />
                          </a>
                          <span className="text-xs font-mono text-[#64748b] dark:text-[#94a3b8]">
                            {st.parentPhone}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Right Column: Trends & Calendar (Span 1) ─────────── */}
        <div className="space-y-6">
          {/* Trend Chart */}
          <div className="card-base p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'معدل الحضور خلال ٣٠ يوماً' : '30-Day Attendance Trend'}
                </h4>
                <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                  {arabic ? 'متوسط نسبة الحضور ٩٥.٢٪' : 'Average rate: 95.2%'}
                </p>
              </div>
              <div className="size-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-[#19a99a] flex items-center justify-center">
                <TrendingUp className="size-4" />
              </div>
            </div>

            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#19a99a" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#19a99a" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                  />
                  <YAxis
                    domain={[85, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0f1f3d',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                    formatter={(val) => [`${val}%`, arabic ? 'نسبة الحضور' : 'Attendance']}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#19a99a"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#attendanceGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Heatmap Calendar */}
          <div className="card-base p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'خريطة الحضور الشهرية' : 'Monthly Attendance Heatmap'}
                </h4>
                <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                  {arabic ? 'تشرين الأول / أكتوبر ٢٠٢٦' : 'October 2026'}
                </p>
              </div>
              <CalendarIcon className="size-4 text-[#19a99a]" />
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-[#94a3b8]">
              <span>{arabic ? 'أحد' : 'Su'}</span>
              <span>{arabic ? 'إثنين' : 'Mo'}</span>
              <span>{arabic ? 'ثلاثاء' : 'Tu'}</span>
              <span>{arabic ? 'أربعاء' : 'We'}</span>
              <span>{arabic ? 'خميس' : 'Th'}</span>
              <span>{arabic ? 'جمعة' : 'Fr'}</span>
              <span>{arabic ? 'سبت' : 'Sa'}</span>
            </div>

            {/* 5x7 Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((cDay, idx) => {
                let bgClass = 'bg-[#f1f5f9] dark:bg-white/[0.04] text-[#94a3b8]'
                if (!cDay.isWeekend && cDay.rate > 0) {
                  if (cDay.rate >= 96) {
                    bgClass = 'bg-emerald-500 text-white font-bold'
                  } else if (cDay.rate >= 92) {
                    bgClass = 'bg-[#19a99a] text-white font-semibold'
                  } else if (cDay.rate >= 88) {
                    bgClass = 'bg-amber-400 text-slate-900 font-semibold'
                  } else {
                    bgClass = 'bg-rose-500 text-white font-bold'
                  }
                }

                return (
                  <div
                    key={idx}
                    title={
                      cDay.isWeekend
                        ? arabic ? 'عطلة نهاية الأسبوع' : 'Weekend'
                        : `${cDay.rate}% ${arabic ? 'نسبة الحضور' : 'attendance'}`
                    }
                    className={cn(
                      'aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-transform hover:scale-110 cursor-pointer relative',
                      bgClass,
                      !cDay.isCurrentMonth && 'opacity-30',
                      cDay.isToday && 'ring-2 ring-[#182b52] dark:ring-white ring-offset-1'
                    )}
                  >
                    <span>{cDay.day}</span>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="pt-2 border-t border-[#f1f5f9] dark:border-white/[0.05] flex items-center justify-between text-[10px] text-[#64748b] dark:text-[#94a3b8]">
              <div className="flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-emerald-500" />
                <span>&ge;96%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-[#19a99a]" />
                <span>92-95%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span>88-91%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-rose-500" />
                <span>&lt;88%</span>
              </div>
            </div>
          </div>

          {/* Quick Notification trigger */}
          <div className="card-base p-5 bg-gradient-to-br from-[#182b52] to-[#0f1f3d] text-white space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#2dd4bf]" />
              <h5 className="text-xs font-bold text-white">
                {arabic ? 'الإرسال التلقائي لأولياء الأمور' : 'Automated Parent Alerts'}
              </h5>
            </div>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              {arabic
                ? `هناك ${counts.absent} طلاب متغيبين اليوم لم يتم إشعار ذويهم بعد.`
                : `${counts.absent} absent students require SMS notification.`}
            </p>
            <button
              onClick={() => alert(arabic ? 'تم إرسال الرسائل النصية لأولياء أمور الغائبين' : 'SMS alerts dispatched')}
              className="w-full btn-teal text-xs flex items-center justify-center gap-2"
            >
              <Send className="size-3.5" />
              <span>{arabic ? 'إرسال رسائل الغياب (SMS)' : 'Dispatch Absentee SMS'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
