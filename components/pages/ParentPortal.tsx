'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  User,
  Award,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Send,
  Star,
  GraduationCap,
  Sparkles,
  Phone,
  Mail,
  Heart,
  TrendingUp,
  X,
  FileCheck,
} from 'lucide-react'
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { ParentLinkPanel } from '@/components/shared/ParentLinkPanel'
import { StatCard } from '@/components/shared/StatCard'
import { Badge } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { cn } from '@/lib/utils'
import { useSchool } from '@/lib/school/store'
import {
  attendanceForStudent,
  attendanceRate,
  averageBySubject,
  childrenOf,
  className,
  formatDate,
  gradeAverage,
  relativeTime,
  studentExamResults,
  teacherName,
} from '@/lib/school/engine'
import { htmlTable, printPdf } from '@/lib/school/excel'

interface ParentPortalProps {
  arabic?: boolean
}

interface ChildProfile {
  id: string
  nameAr: string
  nameEn: string
  gradeAr: string
  gradeEn: string
  overallGrade: number
  attendanceRate: number
  conductAr: string
  conductEn: string
  homeroomTeacherAr: string
  homeroomTeacherEn: string
  avatarColor: string
  initials: string
  subjects: {
    subjectAr: string
    subjectEn: string
    score: number
    classAvg: number
  }[]
  grades: {
    id: string
    subjectAr: string
    subjectEn: string
    titleAr: string
    titleEn: string
    score: string
    percentage: number
    dateAr: string
    dateEn: string
    typeAr: string
    typeEn: string
  }[]
}

export function ParentPortal({ arabic = false }: ParentPortalProps) {
  const { data, user, addNotification } = useSchool()
  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const [chartView, setChartView] = useState<'radar' | 'bar'>('radar')
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [selectedTeacherMessage, setSelectedTeacherMessage] = useState<any | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const myChildren = useMemo(() => childrenOf(data, user), [data, user])

  useEffect(() => {
    if (!selectedChildId && myChildren.length > 0) setSelectedChildId(myChildren[0].id)
  }, [myChildren, selectedChildId])

  // ── Children and academic records, live from the store ──────
  const childrenData: ChildProfile[] = useMemo(() => {
    return myChildren.map(student => {
      const cls = data.classes.find(c => c.id === student.classId)
      const results = studentExamResults(data, student.id)
      const subjects = data.subjects.map(subject => {
        const examIds = new Set(
          data.exams
            .filter(exam => exam.subjectId === subject.id && exam.classId === student.classId)
            .map(exam => exam.id),
        )
        const grades = data.grades.filter(grade => grade.studentId === student.id && examIds.has(grade.examId))
        if (grades.length === 0) return null
        const average = grades.reduce((sum, grade) => {
          const exam = data.exams.find(e => e.id === grade.examId)
          return sum + (exam ? (grade.score / exam.maxMarks) * 100 : 0)
        }, 0) / grades.length
        return {
          subjectAr: subject.nameAr,
          subjectEn: subject.nameEn,
          score: Math.round(average),
          classAvg: Math.round(averageBySubject(data, student.classId, subject.id)),
        }
      }).filter(Boolean) as ChildProfile['subjects']

      const concern = data.observations.some(o => o.studentId === student.id && o.category === 'concern')
      const average = gradeAverage(data, student.id)

      return {
        id: student.id,
        nameAr: student.nameAr,
        nameEn: student.nameEn,
        gradeAr: cls?.nameAr ?? '—',
        gradeEn: cls?.nameEn ?? '—',
        overallGrade: average,
        attendanceRate: attendanceRate(data, student.id, 60),
        conductAr: concern ? 'توجد ملاحظة تحتاج متابعة' : 'لا توجد ملاحظات سلوكية مسجلة',
        conductEn: concern ? 'A behavior note needs follow-up' : 'No behavior notes recorded',
        homeroomTeacherAr: teacherName(data, cls?.homeroomTeacherId, 'ar'),
        homeroomTeacherEn: teacherName(data, cls?.homeroomTeacherId, 'en'),
        avatarColor: 'from-[#182b52] to-[#19a99a]',
        initials: student.nameAr.slice(0, 1),
        subjects,
        grades: results.slice(0, 6).map(result => ({
          id: result.grade.id,
          subjectAr: data.subjects.find(s => s.id === result.exam.subjectId)?.nameAr ?? '—',
          subjectEn: data.subjects.find(s => s.id === result.exam.subjectId)?.nameEn ?? '—',
          titleAr: result.exam.nameAr,
          titleEn: result.exam.nameEn,
          score: `${result.grade.score} / ${result.exam.maxMarks}`,
          percentage: Math.round(result.percentage),
          dateAr: formatDate(result.exam.date, 'ar'),
          dateEn: formatDate(result.exam.date, 'en'),
          typeAr: result.exam.type,
          typeEn: result.exam.type,
        })),
      }
    })
  }, [data, myChildren])

  const currentChild = childrenData.find(c => c.id === selectedChildId) || childrenData[0]

  // ── Teacher messages, derived from observations ─────────────
  const teacherMessages = useMemo(() => {
    if (!currentChild) return []
    return data.observations
      .filter(observation => observation.studentId === currentChild.id && observation.visibleToParent)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4)
      .map(observation => {
        const teacher = data.teachers.find(t => t.id === observation.teacherId)
        return {
          id: observation.id,
          teacherAr: teacher?.nameAr ?? '—',
          teacherEn: teacher?.nameEn ?? '—',
          roleAr: 'ملاحظة من معلم المادة',
          roleEn: 'Subject teacher observation',
          dateAr: formatDate(observation.date, 'ar'),
          dateEn: formatDate(observation.date, 'en'),
          unread: false,
          textAr: observation.noteAr,
          textEn: observation.noteEn,
          avatarInit: (teacher?.nameAr ?? 'م').slice(0, 1),
        }
      })
  }, [currentChild, data])

  // ── Upcoming events, derived from homework and exams ────────
  const upcomingEvents = useMemo(() => {
    if (!currentChild) return []
    const today = new Date().toISOString().slice(0, 10)
    const items = [
      ...data.homework
        .filter(homework => homework.classId === myChildren.find(c => c.id === currentChild.id)?.classId && homework.dueDate >= today)
        .map(homework => ({
          id: homework.id,
          titleAr: homework.titleAr,
          titleEn: homework.titleEn,
          date: homework.dueDate,
          categoryAr: 'واجب',
          categoryEn: 'Homework',
          type: 'warning',
        })),
      ...data.exams
        .filter(exam => exam.classId === myChildren.find(c => c.id === currentChild.id)?.classId && exam.date >= today)
        .map(exam => ({
          id: exam.id,
          titleAr: exam.nameAr,
          titleEn: exam.nameEn,
          date: exam.date,
          categoryAr: 'اختبار',
          categoryEn: 'Exam',
          type: 'danger',
        })),
    ]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4)
    return items.map(item => {
      const days = Math.max(0, Math.round((new Date(item.date).getTime() - new Date(today).getTime()) / 86400000))
      return {
        id: item.id,
        titleAr: item.titleAr,
        titleEn: item.titleEn,
        dateAr: formatDate(item.date, 'ar'),
        dateEn: formatDate(item.date, 'en'),
        badgeAr: days === 0 ? 'اليوم' : `بعد ${days} أيام`,
        badgeEn: days === 0 ? 'Today' : `In ${days} days`,
        type: item.type,
        categoryAr: item.categoryAr,
        categoryEn: item.categoryEn,
      }
    })
  }, [currentChild, data, myChildren])

  // ── Attendance calendar for the current month ────────────────
  const attendanceCalendarDays = useMemo(() => {
    if (!currentChild) return []
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const records = attendanceForStudent(data, currentChild.id, 45)
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1
      const date = new Date(year, month, day)
      const dateKey = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
      const record = records.find(entry => entry.date === dateKey)
      const isWeekend = date.getDay() === 5 || date.getDay() === 6
      return {
        day,
        status: record ? record.status : isWeekend ? 'weekend' : 'none',
      }
    })
  }, [currentChild, data])

  const weekDaysAr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
  const weekDaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (childrenData.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto" dir={arabic ? 'rtl' : 'ltr'}>
        <PageHeader
          arabic={arabic}
          title={arabic ? 'بوابة أولياء الأمور' : 'Parent Portal'}
          subtitle={
            arabic
              ? 'متابعة الأبناء أكاديمياً وسلوكياً وحضورياً من حساب ولي الأمر.'
              : "Track your children's academic progress, conduct and attendance."
          }
          icon={User}
          breadcrumb={[arabic ? 'الرئيسية' : 'Home', arabic ? 'بوابة أولياء الأمور' : 'Parent Portal']}
        />

        <ParentLinkPanel role="parent" arabic={arabic} />

        <div className="card-base p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="size-16 rounded-2xl bg-[#19a99a]/10 text-[#19a99a] flex items-center justify-center mx-auto">
            <User className="size-8" />
          </div>
          <h2 className="text-[18px] font-extrabold text-[#182b52] dark:text-white">
            {arabic ? 'لا يوجد أبناء مرتبطون بهذا الحساب' : 'No linked children on this account'}
          </h2>
          <p className="text-[13px] text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
            {arabic
              ? 'بوابة أولياء الأمور مخصصة للحسابات المعتمدة المرتبطة بأبنائهم في مدرسة سان جورج. يرجى التواصل مع إدارة المدرسة لربط ملفات الطلاب بحسابك.'
              : 'The parent portal is dedicated to authorized guardian accounts linked to students at St. George School. Please contact the administration office to link your student records.'}
          </p>
        </div>
      </div>
    )
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
        title={
          arabic
            ? `أهلاً ولي أمر ${currentChild.nameAr.split(' ')[0]} 👋`
            : `Welcome, ${currentChild.nameEn.split(' ')[0]}'s Parent 👋`
        }
        subtitle={
          arabic
            ? 'بوابة متابعة الأبناء الأكاديمية والسلوكية والحضور والانصراف المباشر.'
            : 'Track academic progress, real-time attendance, and teacher communications.'
        }
        icon={User}
        breadcrumb={[
          arabic ? 'الرئيسية' : 'Home',
          arabic ? 'أولياء الأمور' : 'Parents',
          arabic ? 'الملف الأكاديمي' : 'Child Portfolio',
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveModal('contactSchool')}
              className="btn-teal text-xs sm:text-sm font-semibold flex items-center gap-1.5"
            >
              <MessageSquare className="size-4" />
              <span>{arabic ? 'مراسلة إدارة المدرسة' : 'Contact School'}</span>
            </button>
          </div>
        }
      />

      <ParentLinkPanel role="parent" arabic={arabic} />

      {/* ── Child Selector Cards ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#64748b] dark:text-[#94a3b8]">
            {arabic ? 'اختر الابن للمتابعة:' : 'Select Child to View:'}
          </span>
          <span className="text-xs text-[#19a99a] font-semibold">
            {childrenData.length} {arabic ? 'أبناء مسجلين' : 'Children Enrolled'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {childrenData.map((child) => {
            const isSelected = child.id === selectedChildId
            return (
              <div
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={cn(
                  'cursor-pointer card-base p-4 transition-all duration-200 border-2',
                  isSelected
                    ? 'border-[#19a99a] bg-gradient-to-r from-[#19a99a]/[0.05] to-transparent shadow-md ring-2 ring-[#19a99a]/20'
                    : 'border-transparent hover:border-[#cbd5e1] dark:hover:border-white/[0.15]'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'size-12 rounded-2xl flex items-center justify-center font-extrabold text-white text-lg shrink-0 shadow-sm bg-gradient-to-br',
                        child.avatarColor
                      )}
                    >
                      {child.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#182b52] dark:text-white truncate">
                          {arabic ? child.nameAr : child.nameEn}
                        </h4>
                        {isSelected && (
                          <span className="badge-teal text-[10px] px-2 py-0.2 rounded-full font-bold">
                            {arabic ? 'المحدد' : 'Active'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                        {arabic ? child.gradeAr : child.gradeEn}
                      </p>
                    </div>
                  </div>

                  <div className="text-end shrink-0">
                    <span className="text-xs text-[#94a3b8] block">{arabic ? 'المعدل' : 'Grade'}</span>
                    <span className="text-lg font-extrabold text-[#19a99a] leading-none">
                      {child.overallGrade}%
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Child Overview Banner & Stats ────────────────────── */}
      <div className="card-base p-5 sm:p-6 bg-gradient-to-br from-white via-white to-[#f0fdfa]/50 dark:from-[#0f1f3d] dark:via-[#0f1f3d] dark:to-[#19a99a]/10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'size-16 sm:size-20 rounded-2xl flex items-center justify-center font-black text-white text-2xl sm:text-3xl shrink-0 shadow-lg bg-gradient-to-br',
                currentChild.avatarColor
              )}
            >
              {currentChild.initials}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-[#182b52] dark:text-white">
                  {arabic ? currentChild.nameAr : currentChild.nameEn}
                </h2>
                <Badge variant="teal" size="sm">
                  {arabic ? currentChild.gradeAr : currentChild.gradeEn}
                </Badge>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 text-xs text-[#64748b] dark:text-[#94a3b8] mt-1.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <GraduationCap className="size-4 text-[#19a99a]" />
                  <span>
                    {arabic ? 'رائد الفصل:' : 'Homeroom:'}{' '}
                    <strong className="text-[#182b52] dark:text-white">
                      {arabic ? currentChild.homeroomTeacherAr : currentChild.homeroomTeacherEn}
                    </strong>
                  </span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 text-amber-500 fill-amber-500" />
                  <span>{arabic ? currentChild.conductAr : currentChild.conductEn}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stat Badges */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-[#e2e8f0] dark:border-white/[0.08]">
            <div className="p-3 rounded-xl bg-white dark:bg-white/[0.04] border border-[#e2e8f0] dark:border-white/[0.06] text-center min-w-[100px] shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">
                {arabic ? 'المعدل العام' : 'Overall Grade'}
              </span>
              <span className="text-2xl font-black text-[#182b52] dark:text-white">
                {currentChild.overallGrade}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-white/[0.04] border border-[#e2e8f0] dark:border-white/[0.06] text-center min-w-[100px] shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#94a3b8] block">
                {arabic ? 'نسبة الحضور' : 'Attendance'}
              </span>
              <span className="text-2xl font-black text-[#19a99a]">
                {currentChild.attendanceRate}%
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* ── Middle Row: Academic Performance Chart & Attendance Calendar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Academic Performance (6 cols) */}
        <div className="lg:col-span-6 card-base p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e2e8f0] dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#6366f1]/10 text-[#6366f1] flex items-center justify-center">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                    {arabic ? 'الأداء الأكاديمي حسب المادة' : 'Academic Subject Mastery'}
                  </h3>
                  <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                    {arabic ? 'مقارنة درجة الابن مع متوسط الفصل' : 'Student score vs class average'}
                  </p>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-[#f1f5f9] dark:bg-white/[0.06] p-0.5 rounded-lg">
                <button
                  onClick={() => setChartView('radar')}
                  className={cn(
                    'text-[10px] font-bold px-2.5 py-1 rounded-md transition-all',
                    chartView === 'radar'
                      ? 'bg-white dark:bg-[#0f1f3d] text-[#19a99a] shadow-xs'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  )}
                >
                  {arabic ? 'راداري' : 'Radar'}
                </button>
                <button
                  onClick={() => setChartView('bar')}
                  className={cn(
                    'text-[10px] font-bold px-2.5 py-1 rounded-md transition-all',
                    chartView === 'bar'
                      ? 'bg-white dark:bg-[#0f1f3d] text-[#19a99a] shadow-xs'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  )}
                >
                  {arabic ? 'أعمدة' : 'Bar'}
                </button>
              </div>
            </div>

            {/* Chart Area */}
            <div className="w-full pt-1">
              {chartView === 'radar' ? (
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="75%"
                    data={currentChild.subjects.map((s) => ({
                      subject: arabic ? s.subjectAr : s.subjectEn,
                      score: s.score,
                      classAvg: s.classAvg,
                    }))}
                  >
                    <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[50, 100]} stroke="transparent" />
                    <Tooltip
                      contentStyle={{
                        background: '#0f1f3d',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        color: '#e2e8f0',
                        fontSize: 12,
                      }}
                    />
                    <Radar
                      name={arabic ? 'درجة الابن' : 'Student'}
                      dataKey="score"
                      stroke="#19a99a"
                      fill="#19a99a"
                      fillOpacity={0.45}
                    />
                    <Radar
                      name={arabic ? 'متوسط الفصل' : 'Class Avg'}
                      dataKey="classAvg"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.15}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={currentChild.subjects}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                    <XAxis
                      dataKey={arabic ? 'subjectAr' : 'subjectEn'}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                    />
                    <YAxis
                      domain={[60, 100]}
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
                    />
                    <Bar dataKey="score" name={arabic ? 'الدرجة' : 'Score'} fill="#19a99a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="classAvg" name={arabic ? 'متوسط الفصل' : 'Class Avg'} fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-6 pt-3 border-t border-[#f1f5f9] dark:border-white/[0.04] text-xs">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#19a99a]" />
              <span className="text-[#182b52] dark:text-white font-medium">
                {arabic ? 'درجة الابن' : 'Student Score'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#6366f1]" />
              <span className="text-[#64748b] dark:text-[#94a3b8]">
                {arabic ? 'متوسط الفصل الدراسي' : 'Class Average'}
              </span>
            </div>
          </div>
        </div>

        {/* Attendance Calendar (6 cols) */}
        <div className="lg:col-span-6 card-base p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e2e8f0] dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#19a99a]/10 text-[#19a99a] flex items-center justify-center">
                  <CalendarIcon className="size-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                    {arabic ? 'سجل الحضور الشهري' : 'Monthly Attendance Grid'}
                  </h3>
                  <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                    {arabic ? 'أكتوبر ٢٠٢٦ • خريطة الالتزام اليومي' : 'October 2026 • Daily attendance map'}
                  </p>
                </div>
              </div>
              <Badge variant="success" size="sm">
                {currentChild.attendanceRate}% {arabic ? 'حضور' : 'Rate'}
              </Badge>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
              {(arabic ? weekDaysAr : weekDaysEn).map((day, idx) => (
                <div key={idx} className="text-[10px] font-bold text-[#94a3b8] py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Tiles (31 days) */}
            <div className="grid grid-cols-7 gap-1.5">
              {attendanceCalendarDays.map((item) => {
                const isPresent = item.status === 'present'
                const isAbsent = item.status === 'absent'
                const isLate = item.status === 'late'
                const isWeekend = item.status === 'weekend'

                return (
                  <div
                    key={item.day}
                    title={
                      arabic
                        ? `اليوم ${item.day}: ${isPresent ? 'حاضر' : isAbsent ? 'غائب' : isLate ? 'متأخر' : 'عطلة أسبوعية'}`
                        : `Day ${item.day}: ${item.status}`
                    }
                    className={cn(
                      'h-9 rounded-lg flex flex-col items-center justify-center text-xs font-semibold transition-all cursor-pointer select-none',
                      isPresent &&
                        'bg-teal-50 dark:bg-[#19a99a]/15 text-[#0f766e] dark:text-[#2dd4bf] border border-[#19a99a]/25 hover:scale-105',
                      isAbsent &&
                        'bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/30 animate-pulse hover:scale-105',
                      isLate &&
                        'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 hover:scale-105',
                      isWeekend &&
                        'bg-slate-100/60 dark:bg-white/[0.03] text-slate-400 dark:text-slate-600 border border-slate-200/50 dark:border-white/[0.03]'
                    )}
                  >
                    <span>{item.day}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Calendar Legend & Summary */}
          <div className="pt-3 mt-3 border-t border-[#f1f5f9] dark:border-white/[0.04]">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-[#19a99a]" />
                <span className="text-[#64748b] dark:text-[#94a3b8]">
                  {arabic ? 'حاضر (٢١)' : 'Present (21)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-red-500" />
                <span className="text-[#64748b] dark:text-[#94a3b8]">
                  {arabic ? 'غائب (١)' : 'Absent (1)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-amber-500" />
                <span className="text-[#64748b] dark:text-[#94a3b8]">
                  {arabic ? 'متأخر (١)' : 'Late (1)'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-slate-300 dark:bg-slate-700" />
                <span className="text-[#64748b] dark:text-[#94a3b8]">
                  {arabic ? 'عطلة (٨)' : 'Weekend (8)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Grades Table ──────────────────────────────── */}
      <div className="card-base p-5">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#e2e8f0] dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-[#182b52]/10 dark:bg-white/[0.06] text-[#182b52] dark:text-white flex items-center justify-center">
              <FileCheck className="size-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                {arabic ? 'سجل الدرجات والتقييمات الأخيرة' : 'Recent Grades & Assessment Log'}
              </h3>
              <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                {arabic ? 'تفاصيل آخر الاختبارات والواجبات المنجزة' : 'Latest quizzes, tests, and homework entries'}
              </p>
            </div>
          </div>

          <button
            onClick={() => triggerToast(arabic ? 'جاري تصدير بطاقة الدرجات...' : 'Exporting report card...')}
            className="btn-secondary text-xs font-semibold py-1.5 px-3 h-8"
          >
            {arabic ? 'طباعة التقرير الشامل' : 'Export Full Report'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="ss-table">
            <thead>
              <tr>
                <th>{arabic ? 'المادة الدراسية' : 'Subject'}</th>
                <th>{arabic ? 'عنوان التقييم' : 'Assessment'}</th>
                <th>{arabic ? 'النوع' : 'Type'}</th>
                <th>{arabic ? 'الدرجة المحققة' : 'Score'}</th>
                <th>{arabic ? 'النسبة والتقدير' : 'Percentage'}</th>
                <th>{arabic ? 'تاريخ الرصد' : 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {currentChild.grades.map((gr) => (
                <tr key={gr.id}>
                  <td className="font-bold text-[#182b52] dark:text-white">
                    {arabic ? gr.subjectAr : gr.subjectEn}
                  </td>
                  <td className="text-xs text-[#334155] dark:text-[#cbd5e1]">
                    {arabic ? gr.titleAr : gr.titleEn}
                  </td>
                  <td>
                    <Badge variant="neutral" size="sm">
                      {arabic ? gr.typeAr : gr.typeEn}
                    </Badge>
                  </td>
                  <td className="font-extrabold text-sm text-[#182b52] dark:text-white">
                    {gr.score}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 progress-track h-1.5">
                        <div
                          className={cn(
                            'progress-fill',
                            gr.percentage >= 90
                              ? 'bg-[#19a99a]'
                              : gr.percentage >= 75
                              ? 'bg-[#6366f1]'
                              : 'bg-amber-500'
                          )}
                          style={{ width: `${gr.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[#182b52] dark:text-white">
                        {gr.percentage}%
                      </span>
                    </div>
                  </td>
                  <td className="text-xs text-[#64748b] dark:text-[#94a3b8] whitespace-nowrap">
                    {arabic ? gr.dateAr : gr.dateEn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom Row: Messages from Teachers & Upcoming Events ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Messages from Teachers (7 cols) */}
        <div className="lg:col-span-7 card-base p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e2e8f0] dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#19a99a]/10 text-[#19a99a] flex items-center justify-center">
                  <MessageSquare className="size-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                    {arabic ? 'رسائل المعلمين والإدارة' : 'Teacher Messages'}
                  </h3>
                  <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                    {arabic ? 'تواصل مباشر مع الهيئة التعليمية' : 'Direct communication with teaching staff'}
                  </p>
                </div>
              </div>

              <span className="badge-teal text-[10px] font-bold px-2 py-0.5 rounded-full">
                {teacherMessages.length} {arabic ? 'رسائل' : 'Messages'}
              </span>
            </div>

            <div className="space-y-3">
              {teacherMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'p-3.5 rounded-xl border transition-all text-xs',
                    msg.unread
                      ? 'border-[#19a99a]/30 bg-[#19a99a]/[0.05] dark:bg-[#19a99a]/10'
                      : 'border-[#e2e8f0] dark:border-white/[0.06] bg-[#f8fafc]/50 dark:bg-white/[0.02]'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-gradient-to-br from-[#182b52] to-[#19a99a] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {msg.avatarInit}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#182b52] dark:text-white text-xs">
                            {arabic ? msg.teacherAr : msg.teacherEn}
                          </span>
                          {msg.unread && (
                            <span className="size-2 rounded-full bg-[#19a99a]" />
                          )}
                        </div>
                        <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                          {arabic ? msg.roleAr : msg.roleEn}
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] text-[#94a3b8] shrink-0">
                      {arabic ? msg.dateAr : msg.dateEn}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#334155] dark:text-[#cbd5e1] leading-relaxed mb-3">
                    {arabic ? msg.textAr : msg.textEn}
                  </p>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                    <button
                      onClick={() => setSelectedTeacherMessage(msg)}
                      className="text-xs font-semibold text-[#19a99a] hover:underline flex items-center gap-1"
                    >
                      <Send className="size-3" />
                      <span>{arabic ? 'رد على المعلم' : 'Reply to Teacher'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 text-center">
            <button
              onClick={() => setActiveModal('contactSchool')}
              className="text-xs text-[#19a99a] font-semibold hover:underline"
            >
              {arabic ? 'إرسال استفسار جديد لإدارة المدرسة' : 'Inquire with School Administration'}
            </button>
          </div>
        </div>

        {/* Upcoming Events (5 cols) */}
        <div className="lg:col-span-5 card-base p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e2e8f0] dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b] flex items-center justify-center">
                  <CalendarIcon className="size-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                    {arabic ? 'الفعاليات المدرسية القادمة' : 'Upcoming School Events'}
                  </h3>
                  <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                    {arabic ? 'مواعيد مهمة في التقويم الأكاديمي' : 'Important academic milestone dates'}
                  </p>
                </div>
              </div>
              <Badge variant="warning" size="sm">
                {upcomingEvents.length} {arabic ? 'مواعيد' : 'Events'}
              </Badge>
            </div>

            <div className="space-y-3">
              {upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl border border-[#e2e8f0] dark:border-white/[0.06] bg-white dark:bg-[#0f1f3d] hover:border-[#cbd5e1] transition-all flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] text-[#94a3b8] block mb-0.5">
                      {arabic ? ev.categoryAr : ev.categoryEn}
                    </span>
                    <h4 className="text-xs font-bold text-[#182b52] dark:text-white truncate">
                      {arabic ? ev.titleAr : ev.titleEn}
                    </h4>
                    <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8] flex items-center gap-1 mt-1">
                      <Clock className="size-3 text-[#19a99a]" />
                      {arabic ? ev.dateAr : ev.dateEn}
                    </span>
                  </div>

                  <span
                    className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0',
                      ev.type === 'danger' && 'badge-danger',
                      ev.type === 'warning' && 'badge-warning',
                      ev.type === 'teal' && 'badge-teal',
                      ev.type === 'info' && 'badge-info'
                    )}
                  >
                    {arabic ? ev.badgeAr : ev.badgeEn}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-[#f1f5f9] dark:border-white/[0.04] text-center">
            <button
              onClick={() => triggerToast(arabic ? 'جاري تنزيل التقويم الأكاديمي السنوي' : 'Downloading academic calendar')}
              className="text-xs text-[#64748b] hover:text-[#19a99a] font-semibold"
            >
              {arabic ? 'تحميل التقويم الأكاديمي السنوي (PDF)' : 'Download Annual Academic Calendar (PDF)'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal: Reply to Teacher ──────────────────────────── */}
      {selectedTeacherMessage && (
        <Modal
          open={!!selectedTeacherMessage}
          onClose={() => setSelectedTeacherMessage(null)}
          title={arabic ? `رد على: ${selectedTeacherMessage.teacherAr}` : `Reply to: ${selectedTeacherMessage.teacherEn}`}
          size="md"
          arabic={arabic}
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <button
                onClick={() => setSelectedTeacherMessage(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                {arabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  addNotification({
                    category: 'message',
                    titleAr: `رد ولي الأمر — ${selectedTeacherMessage.teacherAr}`,
                    titleEn: `Parent reply — ${selectedTeacherMessage.teacherEn}`,
                    bodyAr: `تم إرسال رد من ولي أمر الطالب ${currentChild?.nameAr ?? ''} بخصوص: ${selectedTeacherMessage.textAr}`,
                    bodyEn: `A guardian of ${currentChild?.nameEn ?? 'a student'} replied regarding: ${selectedTeacherMessage.textEn}`,
                    recipientRole: 'teacher',
                    studentId: currentChild?.id,
                    link: 'teacher-dashboard',
                  })
                  setSelectedTeacherMessage(null)
                  triggerToast(
                    arabic
                      ? `تم إرسال ردك إلى ${selectedTeacherMessage.teacherAr} بنجاح`
                      : `Message dispatched to ${selectedTeacherMessage.teacherEn}`
                  )
                }}
                className="btn-teal text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <Send className="size-3.5" />
                <span>{arabic ? 'إرسال الرد' : 'Send Reply'}</span>
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03] border border-[#e2e8f0] dark:border-white/[0.06] text-xs">
              <span className="font-bold text-[#182b52] dark:text-white block mb-1">
                {arabic ? 'الرسالة الواردة:' : 'Original Message:'}
              </span>
              <p className="text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
                {arabic ? selectedTeacherMessage.textAr : selectedTeacherMessage.textEn}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'رد ولي الأمر:' : 'Your Response:'}
              </label>
              <textarea
                rows={4}
                placeholder={arabic ? 'اكتب رسالتك أو استفسارك هنا...' : 'Write your message to the teacher...'}
                className="ss-input text-xs h-auto py-2.5"
                defaultValue={
                  arabic
                    ? 'شكراً جزيلاً أستاذنا الفاضل على اهتمامكم ومتابعتكم المستمرة.'
                    : 'Thank you very much for your feedback and encouragement!'
                }
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Contact School Admin ──────────────────────── */}
      <Modal
        open={activeModal === 'contactSchool'}
        onClose={() => setActiveModal(null)}
        title={arabic ? 'مراسلة إدارة المدرسة' : 'Inquire with Administration'}
        size="md"
        arabic={arabic}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button onClick={() => setActiveModal(null)} className="btn-secondary text-xs px-4 py-2">
              {arabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={() => {
                addNotification({
                  category: 'message',
                  titleAr: 'استفسار من ولي أمر',
                  titleEn: 'Guardian inquiry',
                  bodyAr: `قدّم ولي أمر الطالب ${currentChild?.nameAr ?? ''} استفساراً للإدارة. يرجى المتابعة.`,
                  bodyEn: `The guardian of ${currentChild?.nameEn ?? 'a student'} submitted an inquiry. Please follow up.`,
                  recipientRole: 'school_admin',
                  studentId: currentChild?.id,
                  link: 'notifications',
                })
                setActiveModal(null)
                triggerToast(arabic ? 'تم تقديم طلبك بنجاح وسيتواصل معك المشرف قريباً' : 'Inquiry submitted successfully')
              }}
              className="btn-teal text-xs px-4 py-2"
            >
              {arabic ? 'إرسال الاستفسار' : 'Submit Ticket'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
              {arabic ? 'الابن المعني' : 'Subject Student'}
            </label>
            <select className="ss-input text-xs">
              <option>{arabic ? 'أحمد طارق الرشيدي (الصف ٥-أ)' : 'Ahmed Tariq Al-Rashidi (Grade 5-A)'}</option>
              <option>{arabic ? 'سارة طارق الرشيدي (الصف ٣-ب)' : 'Sarah Tariq Al-Rashidi (Grade 3-B)'}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
              {arabic ? 'نوع الاستفسار' : 'Inquiry Department'}
            </label>
            <select className="ss-input text-xs">
              <option>{arabic ? 'الشؤون الأكاديمية والدرجات' : 'Academic & Grades'}</option>
              <option>{arabic ? 'الغياب والأعذار الطبية' : 'Attendance & Medical Excuse'}</option>
              <option>{arabic ? 'النقل المدرسي والباصات' : 'School Transportation'}</option>
              <option>{arabic ? 'الرسوم والمحاسبة' : 'Tuition & Billing'}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
              {arabic ? 'تفاصيل الطلب' : 'Message Details'}
            </label>
            <textarea
              rows={4}
              placeholder={arabic ? 'يرجى توضيح استفسارك بالتفصيل...' : 'Please specify your inquiry in detail...'}
              className="ss-input text-xs h-auto py-2.5"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
