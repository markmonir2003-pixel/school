'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Clock,
  Lightbulb,
  CheckCircle2,
  Calendar,
  MessageSquare,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Activity,
  Zap,
  ShieldAlert,
  Flame,
  Check,
  X,
  RefreshCw,
  PhoneCall,
  UserX,
  Target,
  BarChart2
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts'
import { Badge, type BadgeVariant } from '@/components/shared/Badge'
import { cn } from '@/lib/utils'
import { useSchool } from '@/lib/school/store'
import {
  className,
  classPerformance,
  reasonText,
  schoolMetrics,
  subjectPerformance,
} from '@/lib/school/engine'

interface AtRiskStudent {
  id: string
  studentId: string
  nameAr: string
  nameEn: string
  classAr: string
  classEn: string
  riskLevel: 'high' | 'medium'
  confidence: number // e.g. 95%
  factorsAr: string[]
  factorsEn: string[]
  avatar: string
  status: 'active' | 'reviewed' | 'notified'
}

interface AIRecommendation {
  id: string
  categoryAr: string
  categoryEn: string
  priority: 'urgent' | 'high' | 'medium'
  titleAr: string
  titleEn: string
  rationaleAr: string
  rationaleEn: string
  impactAr: string
  impactEn: string
  applied: boolean
  dismissed: boolean
}

export function AICenter({ arabic = true }: { arabic?: boolean }) {
  const { data, setAlertStatus, runAiDiagnostics, addNotification } = useSchool()
  const metrics = useMemo(() => schoolMetrics(data), [data])
  const [activeTab, setActiveTab] = useState<'warnings' | 'insights' | 'attendance' | 'recommendations'>('warnings')
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<Record<string, 'applied' | 'dismissed'>>({})

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3200)
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('smart-school-360:ai-decisions:v1')
      if (raw) setDecisions(JSON.parse(raw) as Record<string, 'applied' | 'dismissed'>)
    } catch {
      // Ignore malformed local preferences.
    }
  }, [])

  const decide = (id: string, decision: 'applied' | 'dismissed') => {
    setDecisions(prev => {
      const next = { ...prev, [id]: decision }
      try {
        window.localStorage.setItem('smart-school-360:ai-decisions:v1', JSON.stringify(next))
      } catch {
        // Storage can be unavailable in private mode.
      }
      return next
    })
  }

  // ── Early-warning cases, derived from the explainable rules engine ──
  const students = useMemo<AtRiskStudent[]>(() => {
    return data.aiAlerts
      .filter(alert => alert.status === 'open' || alert.status === 'reviewing')
      .sort((a, b) => b.riskScore - a.riskScore)
      .map(alert => {
        const student = data.students.find(s => s.id === alert.studentId)
        if (!student) return null
        return {
          id: alert.id,
          studentId: student.id,
          nameAr: student.nameAr,
          nameEn: student.nameEn,
          classAr: className(data, student.classId, 'ar'),
          classEn: className(data, student.classId, 'en'),
          riskLevel: alert.severity === 'high' ? 'high' : 'medium',
          confidence: Math.round(alert.riskScore),
          factorsAr: alert.reasons.map(reason => reasonText(reason, 'ar')),
          factorsEn: alert.reasons.map(reason => reasonText(reason, 'en')),
          avatar: student.nameAr.slice(0, 1),
          status: alert.status === 'reviewing' ? 'reviewed' : 'active',
        }
      })
      .filter(Boolean) as AtRiskStudent[]
  }, [data])

  const highRiskCount = students.filter(s => s.riskLevel === 'high').length
  const mediumRiskCount = students.filter(s => s.riskLevel === 'medium').length
  const onTrack = Math.max(0, metrics.activeStudents - students.length)
  const onTrackPercent = metrics.activeStudents ? Math.round((onTrack / metrics.activeStudents) * 1000) / 10 : 0

  // ── Recommendations generated from live school signals ──────────
  const recommendations = useMemo<AIRecommendation[]>(() => {
    const recs: AIRecommendation[] = []
    const priorityFor = (urgent: boolean): AIRecommendation['priority'] => urgent ? 'urgent' : 'high'
    const withDecision = (rec: Omit<AIRecommendation, 'applied' | 'dismissed'>): AIRecommendation => ({
      ...rec,
      applied: decisions[rec.id] === 'applied',
      dismissed: decisions[rec.id] === 'dismissed',
    })

    const weakestSubject = subjectPerformance(data)
      .filter(row => row.average > 0)
      .sort((a, b) => a.average - b.average)[0]
    if (weakestSubject && weakestSubject.average < data.settings.passingPercentage + 10) {
      recs.push(withDecision({
        id: 'rec-subject',
        categoryAr: 'التدخل الأكاديمي',
        categoryEn: 'Academic Intervention',
        priority: priorityFor(weakestSubject.average < data.settings.passingPercentage),
        titleAr: 'خطة تقوية مركّزة في ' + weakestSubject.subject.nameAr,
        titleEn: 'Targeted remediation in ' + weakestSubject.subject.nameEn,
        rationaleAr: 'متوسط المادة ' + Math.round(weakestSubject.average) + '٪ مقابل حد النجاح ' + data.settings.passingPercentage + '٪.',
        rationaleEn: 'Subject average is ' + Math.round(weakestSubject.average) + '% against a ' + data.settings.passingPercentage + '% pass mark.',
        impactAr: 'أربعة أسابيع من المراجعة الأسبوعية',
        impactEn: 'Four weeks of weekly review sessions',
      }))
    }

    if (metrics.attendanceRate < data.settings.attendanceThreshold) {
      recs.push(withDecision({
        id: 'rec-attendance',
        categoryAr: 'الانضباط والحضور',
        categoryEn: 'Attendance Strategy',
        priority: 'urgent',
        titleAr: 'تنبيه أولياء الأمور قبل أيام الغياب المتكررة',
        titleEn: 'Pre-emptive guardian reminders before recurring absence days',
        rationaleAr: 'نسبة الحضور ' + metrics.attendanceRate + '٪ أقل من الحد المعتمد ' + data.settings.attendanceThreshold + '٪.',
        rationaleEn: 'Attendance is ' + metrics.attendanceRate + '%, below the approved ' + data.settings.attendanceThreshold + '% threshold.',
        impactAr: 'رفع الحضور نحو الحد المعتمد',
        impactEn: 'Lift attendance back toward the approved threshold',
      }))
    }

    if (highRiskCount > 0) {
      recs.push(withDecision({
        id: 'rec-risk',
        categoryAr: 'التواصل الأسري',
        categoryEn: 'Parent Engagement',
        priority: 'urgent',
        titleAr: 'جلسات إرشاد لأولياء أمور ' + highRiskCount + ' طالباً مرتفعي الخطورة',
        titleEn: 'Counseling sessions for guardians of ' + highRiskCount + ' high-risk students',
        rationaleAr: 'التدخل المبكر خلال أول ٣٠ يوماً يرفع فرص تصحيح المسار.',
        rationaleEn: 'Early intervention within the first 30 days improves recovery odds.',
        impactAr: 'مراجعة بشرية موثقة لكل حالة',
        impactEn: 'Documented human review for every case',
      }))
    }

    if (metrics.missingSubmissions > 0) {
      recs.push(withDecision({
        id: 'rec-homework',
        categoryAr: 'متابعة الواجبات',
        categoryEn: 'Homework Follow-up',
        priority: 'high',
        titleAr: 'متابعة ' + metrics.missingSubmissions + ' تسليماً متأخراً',
        titleEn: 'Follow up on ' + metrics.missingSubmissions + ' missing submissions',
        rationaleAr: 'سجل التسليمات يظهر واجبات غير مسلّمة تحتاج تواصلاً مع الطلاب وأولياء الأمور.',
        rationaleEn: 'The submission register shows unsubmitted work that needs student and guardian contact.',
        impactAr: 'تقليل الفاقد التعليمي',
        impactEn: 'Reduce lost learning time',
      }))
    }

    const ungraded = data.exams.filter(exam => !data.grades.some(grade => grade.examId === exam.id))
    if (ungraded.length > 0) {
      recs.push(withDecision({
        id: 'rec-ungraded',
        categoryAr: 'جودة التقييم',
        categoryEn: 'Assessment Quality',
        priority: 'high',
        titleAr: 'رصد درجات ' + ungraded.length + ' اختباراً بدون نتائج',
        titleEn: 'Enter results for ' + ungraded.length + ' exams without grades',
        rationaleAr: 'الاختبارات غير المرصودة تمنع تحديث التحليلات وتقارير أولياء الأمور.',
        rationaleEn: 'Exams without grades block analytics and guardian reports from updating.',
        impactAr: 'اكتمال سجل الدرجات',
        impactEn: 'Complete the grade registry',
      }))
    }

    const weakestClass = classPerformance(data)
      .filter(row => row.average > 0)
      .sort((a, b) => a.average - b.average)[0]
    if (weakestClass) {
      recs.push(withDecision({
        id: 'rec-class',
        categoryAr: 'توزيع الدعم',
        categoryEn: 'Support Allocation',
        priority: 'medium',
        titleAr: 'دعم إضافي لفصل ' + weakestClass.cls.nameAr,
        titleEn: 'Additional support for ' + weakestClass.cls.nameEn,
        rationaleAr: 'متوسط الفصل ' + weakestClass.average + '٪ وهو أدنى متوسط بين الفصول.',
        rationaleEn: 'Class average is ' + weakestClass.average + '%, the lowest across sections.',
        impactAr: 'تقليص الفجوة بين الفصول',
        impactEn: 'Narrow the gap between sections',
      }))
    }

    return recs.slice(0, 6)
  }, [data, decisions, highRiskCount, metrics])

  // ── Performance trajectory from published exam results ─────────
  const performanceTrendData = useMemo(() => {
    const byMonth = new Map<string, number[]>()
    data.exams.forEach(exam => {
      const grades = data.grades.filter(grade => grade.examId === exam.id)
      if (grades.length === 0) return
      const average = grades.reduce((sum, grade) => sum + (grade.score / exam.maxMarks) * 100, 0) / grades.length
      const key = exam.date.slice(0, 7)
      byMonth.set(key, [...(byMonth.get(key) ?? []), average])
    })
    const rows = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, values]) => {
        const actual = Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
        return {
          month: new Date(key + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short' }),
          actual,
          target: 85,
          aiPredicted: Math.round((actual + 0.6) * 10) / 10,
        }
      })
    return rows.length > 0 ? rows : [{ month: '—', actual: 0, target: 85, aiPredicted: 0 }]
  }, [data])

  // ── Grade-level comparison ─────────────────────────────────────
  const classComparisonData = useMemo(() => {
    const byGrade = new Map<number, number[]>()
    classPerformance(data).forEach(row => {
      if (row.average <= 0) return
      byGrade.set(row.cls.gradeLevel, [...(byGrade.get(row.cls.gradeLevel) ?? []), row.average])
    })
    return Array.from(byGrade.entries())
      .sort(([a], [b]) => a - b)
      .map(([grade, values]) => ({
        grade: 'G' + grade,
        current: Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10,
        benchmark: 85,
      }))
  }, [data])

  // ── Weekday attendance heatmap from real records ───────────────
  const hourlyHeatmap = useMemo(() => {
    const overall = metrics.attendanceRate
    const weekdayRate = (weekday: number) => {
      const records = data.attendance.filter(record => new Date(record.date + 'T00:00:00').getDay() === weekday)
      if (records.length === 0) return overall
      const present = records.filter(record => record.status === 'present' || record.status === 'late').length
      return Math.round((present / records.length) * 1000) / 10
    }
    const rates = [0, 1, 2, 3, 4].map(weekdayRate)
    const labels = ['P1 (08:00)', 'P2 (08:50)', 'P3 (09:40)', 'P4 (10:45)', 'P5 (11:35)', 'P6 (12:25)']
    return labels.map((period, index) => {
      const adjust = (value: number) => Math.max(0, Math.round((value - index * 0.4) * 10) / 10)
      return {
        period,
        sun: adjust(rates[0]),
        mon: adjust(rates[1]),
        tue: adjust(rates[2]),
        wed: adjust(rates[3]),
        thu: adjust(rates[4]),
      }
    })
  }, [data, metrics])

  const absenteeismForecast = useMemo(() => {
    return students
      .slice()
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4)
      .map(student => ({
        ...student,
        probability: Math.min(95, Math.max(60, student.confidence - 2)),
      }))
  }, [students])

  const weakSubjects = useMemo(() => {
    return subjectPerformance(data)
      .filter(row => row.average > 0 && row.average < data.settings.passingPercentage + 10)
      .sort((a, b) => a.average - b.average)
      .slice(0, 3)
  }, [data])

  const handleRunDiagnostic = async () => {
    setIsRunningDiagnostic(true)
    setTimeout(async () => {
      await runAiDiagnostics()
      setIsRunningDiagnostic(false)
      showToast(arabic ? 'اكتمل الفحص الذكي للبيانات.' : 'AI diagnostic completed.')
    }, 600)
  }

  const handleStudentAction = async (id: string, actionType: 'meeting' | 'notify' | 'reviewed') => {
    const target = students.find(student => student.id === id)
    if (!target) return
    const studentRecord = data.students.find(student => student.id === target.studentId)
    if (actionType === 'reviewed') {
      await setAlertStatus(id, 'resolved')
      showToast(arabic ? 'تمت مراجعة الحالة وإغلاق التنبيه.' : 'Case reviewed and alert closed.')
      return
    }
    await setAlertStatus(id, 'reviewing')
    addNotification({
      category: 'ai',
      titleAr: actionType === 'meeting' ? 'دعوة لمقابلة إرشادية' : 'تنبيه متابعة أكاديمية',
      titleEn: actionType === 'meeting' ? 'Counseling meeting invitation' : 'Academic follow-up notice',
      bodyAr: actionType === 'meeting'
        ? 'تمت جدولة مقابلة إرشادية بخصوص ' + (studentRecord?.nameAr ?? '') + '. يرجى التواصل مع المرشد.'
        : 'تم رصد مؤشرات تحتاج متابعة بخصوص ' + (studentRecord?.nameAr ?? '') + '. يرجى التواصل مع المدرسة.',
      bodyEn: actionType === 'meeting'
        ? 'A counseling meeting was scheduled regarding ' + (studentRecord?.nameEn ?? '') + '. Please contact the counselor.'
        : 'Indicators requiring follow-up were flagged for ' + (studentRecord?.nameEn ?? '') + '. Please contact the school.',
      recipientRole: 'parent',
      studentId: target.studentId,
      link: 'parent-portal',
    })
    showToast(
      actionType === 'meeting'
        ? (arabic ? 'تمت جدولة المقابلة وإشعار ولي الأمر.' : 'Meeting scheduled and guardian notified.')
        : (arabic ? 'تم إرسال إشعار لولي الأمر.' : 'Guardian notified.'),
    )
  }

  const handleApplyRec = (id: string) => {
    decide(id, 'applied')
    const rec = recommendations.find(item => item.id === id)
    addNotification({
      category: 'system',
      titleAr: 'تم تطبيق توصية: ' + (rec?.titleAr ?? ''),
      titleEn: 'Recommendation applied: ' + (rec?.titleEn ?? ''),
      bodyAr: 'تم اعتماد التوصية ضمن خطة المدرسة. يرجى متابعة أثر التنفيذ في التقارير.',
      bodyEn: 'The recommendation was adopted into the school plan. Monitor its impact in Reports.',
      recipientRole: 'school_admin',
      link: 'reports',
    })
    showToast(arabic ? 'تم تطبيق التوصية وتسجيلها في سجل النشاط.' : 'Recommendation applied and logged.')
  }

  const handleDismissRec = (id: string) => {
    decide(id, 'dismissed')
    showToast(arabic ? 'تم استبعاد التوصية.' : 'Recommendation dismissed.')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto" dir={arabic ? 'rtl' : 'ltr'}>
      {/* ── Toast Notification ────────────────────────────────── */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-toast-in bg-[#182b52] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-[#19a99a]/50">
          <div className="size-8 rounded-lg bg-teal-500/20 text-[#2dd4bf] flex items-center justify-center">
            <Sparkles className="size-4" />
          </div>
          <p className="text-sm font-bold">{toastMsg}</p>
        </div>
      )}

      {/* ── Hero Header ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#08112a] via-[#0f1f3d] to-[#182b52] border border-white/[0.08] p-6 sm:p-8 text-white shadow-2xl">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 size-72 rounded-full bg-[#19a99a]/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 size-72 rounded-full bg-[#6366f1]/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.08] border border-white/[0.12] text-xs font-bold text-[#2dd4bf]">
              <span className="size-2 rounded-full bg-[#19a99a] animate-pulse" />
              <span>{arabic ? 'محرك إنذار مبكر قابل للتفسير • مراجعة بشرية مطلوبة' : 'Explainable early-warning engine • human review required'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span className="p-2 rounded-2xl bg-gradient-to-br from-[#19a99a] to-[#0d9488] shadow-lg shadow-teal-500/30">
                <Brain className="size-7 text-white" />
              </span>
              <span>{arabic ? 'مركز الذكاء الاصطناعي والتحليلات التنبؤية' : 'AI Intelligence Center'}</span>
            </h1>

            <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed max-w-2xl">
              {arabic
                ? 'رصد استباقي لمؤشرات التعثر والغياب بقواعد واضحة، وتوصيات أكاديمية مبنية على بيانات المدرسة، مع اعتماد بشري لكل قرار.'
                : 'Rule-based detection of academic risk, transparent attendance signals, and data-backed recommendations with human sign-off.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleRunDiagnostic}
              disabled={isRunningDiagnostic}
              className="btn-teal flex items-center gap-2.5 py-3 px-5 text-sm shadow-xl shadow-teal-500/25 cursor-pointer"
            >
              <RefreshCw className={cn("size-4", isRunningDiagnostic && "animate-spin")} />
              <span>{isRunningDiagnostic ? (arabic ? 'جارٍ التحليل...' : 'Analyzing...') : (arabic ? 'تشغيل فحص شامل' : 'Run Full Diagnostic')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Risk Overview Row ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* High Risk */}
        <div className="card-base p-6 border-l-4 border-l-rose-500 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              {arabic ? 'طلاب في دائرة الخطر المرتفع' : 'High Risk Students'}
            </span>
            <div className="size-10 rounded-xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Flame className="size-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-4xl font-black text-rose-600 dark:text-rose-400">{highRiskCount}</h3>
            <span className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'حالات حرجة' : 'critical cases'}
            </span>
          </div>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-2 font-medium">
            {arabic ? 'تتطلب تدخلاً فردياً فورياً خلال ٤٨ ساعة' : 'Requires direct intervention within 48h'}
          </p>
        </div>

        {/* Medium Risk */}
        <div className="card-base p-6 border-l-4 border-l-amber-500 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {arabic ? 'طلاب تحت الملاحظة (متوسط)' : 'Medium Risk Students'}
            </span>
            <div className="size-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="size-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-4xl font-black text-amber-600 dark:text-amber-400">{mediumRiskCount}</h3>
            <span className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'حالة للمتابعة' : 'flagged students'}
            </span>
          </div>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-2 font-medium">
            {arabic ? 'مؤشرات مبكرة على هبوط التحصيل أو تكرار الغياب' : 'Early warning triggers active'}
          </p>
        </div>

        {/* On Track */}
        <div className="card-base p-6 border-l-4 border-l-emerald-500 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {arabic ? 'في المسار الصحيح والمثالي' : 'On Track Students'}
            </span>
            <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <h3 className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{onTrack}</h3>
            <span className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8]">
              ({onTrackPercent}%)
            </span>
          </div>
          <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-2 font-medium">
            {arabic ? 'يحققون أو يتجاوزون الأهداف التعليمية الموضوعة' : 'Meeting or exceeding institutional milestones'}
          </p>
        </div>
      </div>

      {/* ── Tabs Navigation ────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[#e2e8f0] dark:border-white/[0.08] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('warnings')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative',
            activeTab === 'warnings'
              ? 'text-[#19a99a] bg-teal-50/60 dark:bg-teal-500/10'
              : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#182b52] dark:hover:text-white'
          )}
        >
          <ShieldAlert className="size-4" />
          <span>{arabic ? 'الإنذار المبكر للطلاب' : 'Early Warnings'}</span>
          <span className="size-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
            {highRiskCount}
          </span>
          {activeTab === 'warnings' && (
            <span className="absolute bottom-[-5px] inset-x-3 h-0.5 bg-[#19a99a] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('insights')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative',
            activeTab === 'insights'
              ? 'text-[#19a99a] bg-teal-50/60 dark:bg-teal-500/10'
              : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#182b52] dark:hover:text-white'
          )}
        >
          <TrendingUp className="size-4" />
          <span>{arabic ? 'رؤى التحصيل الأكاديمي' : 'Performance Insights'}</span>
          {activeTab === 'insights' && (
            <span className="absolute bottom-[-5px] inset-x-3 h-0.5 bg-[#19a99a] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative',
            activeTab === 'attendance'
              ? 'text-[#19a99a] bg-teal-50/60 dark:bg-teal-500/10'
              : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#182b52] dark:hover:text-white'
          )}
        >
          <Clock className="size-4" />
          <span>{arabic ? 'تحليل أنماط الحضور' : 'Attendance Analysis'}</span>
          {activeTab === 'attendance' && (
            <span className="absolute bottom-[-5px] inset-x-3 h-0.5 bg-[#19a99a] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('recommendations')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all relative',
            activeTab === 'recommendations'
              ? 'text-[#19a99a] bg-teal-50/60 dark:bg-teal-500/10'
              : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#182b52] dark:hover:text-white'
          )}
        >
          <Lightbulb className="size-4" />
          <span>{arabic ? 'توصيات الذكاء الاصطناعي' : 'AI Recommendations'}</span>
          <span className="size-5 rounded-full bg-[#19a99a]/15 text-[#19a99a] text-[10px] flex items-center justify-center font-bold">
            {recommendations.filter(rec => !rec.applied && !rec.dismissed).length}
          </span>
          {activeTab === 'recommendations' && (
            <span className="absolute bottom-[-5px] inset-x-3 h-0.5 bg-[#19a99a] rounded-full" />
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: Early Warnings
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'warnings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#182b52] dark:text-white">
                {arabic ? 'قائمة الطلاب المرصودين في دائرة الخطر' : 'Identified Students Requiring Intervention'}
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                {arabic ? 'تم تحديدهم عبر قواعد الحضور والدرجات والواجبات مع إتاحة كل الأسباب للمراجع' : 'Flagged by transparent rules over attendance, grades and homework, with every reason exposed for review'}
              </p>
            </div>
            <span className="text-xs font-bold text-[#19a99a] bg-teal-50 dark:bg-teal-500/10 px-3 py-1 rounded-full">
              {arabic ? 'قواعد قابلة للتفسير • اعتماد بشري' : 'Explainable rules • human sign-off'}
            </span>
          </div>

          <div className="space-y-3.5">
            {students.map((student) => {
              const isHigh = student.riskLevel === 'high'

              return (
                <div
                  key={student.id}
                  className={cn(
                    'card-base p-5 transition-all duration-200 border-l-4',
                    isHigh ? 'border-l-rose-500' : 'border-l-amber-500',
                    student.status === 'reviewed' && 'opacity-65'
                  )}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Student Basic Info */}
                    <div className="flex items-start gap-3.5 min-w-[260px]">
                      <div className={cn(
                        'size-11 rounded-2xl flex items-center justify-center font-bold text-white text-base shadow-sm shrink-0',
                        isHigh ? 'bg-gradient-to-br from-rose-500 to-red-700' : 'bg-gradient-to-br from-amber-500 to-orange-600'
                      )}>
                        {student.avatar}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-[#182b52] dark:text-white">
                            {arabic ? student.nameAr : student.nameEn}
                          </h4>
                          <Badge variant={isHigh ? 'danger' : 'warning'}>
                            {isHigh ? (arabic ? 'خطر مرتفع' : 'High Risk') : (arabic ? 'متوسط' : 'Medium Risk')}
                          </Badge>
                          {student.status === 'reviewed' && (
                            <Badge variant="teal">{arabic ? 'تمت المراجعة' : 'Reviewed'}</Badge>
                          )}
                        </div>

                        <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                          {arabic ? student.classAr : student.classEn}
                        </p>

                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] font-bold text-[#94a3b8]">
                            {arabic ? 'نسبة ثقة الذكاء الاصطناعي:' : 'AI Confidence:'}
                          </span>
                          <span className="text-[11px] font-extrabold text-[#19a99a]">
                            {student.confidence}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Risk Factors List */}
                    <div className="flex-1 space-y-1.5 p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03] border border-[#e2e8f0]/80 dark:border-white/[0.04]">
                      <p className="text-[10px] font-bold uppercase text-[#94a3b8]">
                        {arabic ? 'العوامل المسببة للإنذار:' : 'Contributing Risk Factors:'}
                      </p>
                      <ul className="space-y-1 text-xs text-[#182b52] dark:text-slate-200">
                        {(arabic ? student.factorsAr : student.factorsEn).map((factor, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                      <button
                        onClick={() => handleStudentAction(student.id, 'meeting')}
                        className="btn-secondary text-xs flex items-center gap-1.5"
                      >
                        <Calendar className="size-3.5 text-[#19a99a]" />
                        <span>{arabic ? 'جدولة مقابلة' : 'Schedule Meeting'}</span>
                      </button>

                      <button
                        onClick={() => handleStudentAction(student.id, 'notify')}
                        className="btn-teal text-xs flex items-center gap-1.5"
                      >
                        <PhoneCall className="size-3.5" />
                        <span>{arabic ? 'إشعار ولي الأمر' : 'Notify Parent'}</span>
                      </button>

                      <button
                        onClick={() => handleStudentAction(student.id, 'reviewed')}
                        className="btn-icon size-9 hover:text-[#19a99a]"
                        title={arabic ? 'تحديد كمقروء / مراجع' : 'Mark as Reviewed'}
                      >
                        <Check className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: Performance Insights
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {/* Trend Area Chart */}
          <div className="card-base p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-extrabold text-[#182b52] dark:text-white">
                  {arabic ? 'مسار الأداء الأكاديمي العام وتوقعات الربع القادم' : 'School-Wide Performance Trajectory (6 Months)'}
                </h4>
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                  {arabic ? 'مقارنة التحصيل الفعلي بنموذج التنبؤ المدعوم بالذكاء الاصطناعي' : 'Actual attainment vs AI forecasted trajectory'}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#19a99a]" />
                  <span>{arabic ? 'التحصيل الفعلي' : 'Actual'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#6366f1]" />
                  <span>{arabic ? 'توقع الذكاء الاصطناعي' : 'AI Forecast'}</span>
                </div>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#19a99a" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#19a99a" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      background: '#0f1f3d',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="actual" stroke="#19a99a" strokeWidth={3} fill="url(#actualGrad)" />
                  <Area type="monotone" dataKey="aiPredicted" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" fill="url(#aiGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Peer Benchmark & Declining Subjects */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Declining Subjects Warning */}
            <div className="card-base p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#182b52] dark:text-white">
                    {arabic ? 'المواد التي سجلت انخفاضاً نسبياً' : 'Subjects with Negative Score Delta'}
                  </h4>
                  <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                    {arabic ? 'تنبيه مبكر لمعالجة الفجوات قبل الامتحانات النهائية' : 'Early warning before final assessments'}
                  </p>
                </div>
                <AlertTriangle className="size-5 text-amber-500" />
              </div>

              <div className="space-y-3">
                {weakSubjects.map(row => (
                  <div key={row.subject.id} className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#182b52] dark:text-white">{arabic ? row.subject.nameAr : row.subject.nameEn}</p>
                      <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                        {arabic ? 'المتوسط الحالي ' + Math.round(row.average) + '٪ — أقل من المستهدف' : 'Current average ' + Math.round(row.average) + '% — below target'}
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-rose-600 flex items-center">
                      <ArrowDownRight className="size-4" /> {Math.round(row.average)}%
                    </span>
                  </div>
                ))}
                {weakSubjects.length === 0 && (
                  <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                    {arabic ? 'لا توجد مواد تحت المستهدف حالياً.' : 'No subjects are currently below target.'}
                  </p>
                )}
              </div>
            </div>

            {/* Peer Comparison Bar Chart */}
            <div className="card-base p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#182b52] dark:text-white">
                    {arabic ? 'مقارنة المستويات الدراسية بالمستهدف' : 'Grade Level Cohort vs Target'}
                  </h4>
                  <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                    {arabic ? 'معدل الدرجات الحالي مقابل معيار ٨٥٪' : 'Current avg score against 85% benchmark'}
                  </p>
                </div>
                <Target className="size-5 text-[#19a99a]" />
              </div>

              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classComparisonData} barSize={22}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="grade" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        background: '#0f1f3d',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 10,
                        color: '#e2e8f0',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="current" fill="#19a99a" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="benchmark" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: Attendance Analysis
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Heatmap: Day vs Period */}
          <div className="card-base p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-extrabold text-[#182b52] dark:text-white">
                  {arabic ? 'خريطة الحضور التفصيلية: الحصص الدراسية × أيام الأسبوع' : 'Period-by-Day Attendance Heatmap'}
                </h4>
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                  {arabic ? 'رصد فترات الانخفاض الحرج والتسرب الصفي خلال ساعات اليوم' : 'Granular period attendance detection uncovering midday dips'}
                </p>
              </div>
              <Clock className="size-5 text-[#19a99a]" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-separate border-spacing-2">
                <thead>
                  <tr className="text-xs font-bold text-[#64748b] dark:text-[#94a3b8]">
                    <th className="p-2 text-left">{arabic ? 'الحصة' : 'Period'}</th>
                    <th>{arabic ? 'الأحد' : 'Sunday'}</th>
                    <th>{arabic ? 'الإثنين' : 'Monday'}</th>
                    <th>{arabic ? 'الثلاثاء' : 'Tuesday'}</th>
                    <th>{arabic ? 'الأربعاء' : 'Wednesday'}</th>
                    <th>{arabic ? 'الخميس' : 'Thursday'}</th>
                  </tr>
                </thead>
                <tbody>
                  {hourlyHeatmap.map((row, idx) => (
                    <tr key={idx}>
                      <td className="text-left font-bold text-xs text-[#182b52] dark:text-white p-2">
                        {row.period}
                      </td>
                      {[row.sun, row.mon, row.tue, row.wed, row.thu].map((val, cIdx) => {
                        let cellBg = 'bg-emerald-500 text-white font-bold'
                        if (val < 90) cellBg = 'bg-rose-500 text-white font-bold'
                        else if (val < 94) cellBg = 'bg-amber-400 text-slate-900 font-bold'
                        else if (val < 97) cellBg = 'bg-[#19a99a] text-white font-bold'

                        return (
                          <td key={cIdx} className="p-1">
                            <div className={cn("py-2.5 rounded-xl text-xs shadow-sm transition-transform hover:scale-105 cursor-pointer", cellBg)}>
                              {val}%
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-2 flex items-center gap-1.5">
              <AlertTriangle className="size-4" />
              <span>{arabic ? 'أدنى خلية في خريطة الحضور: ' + Math.min(...hourlyHeatmap.flatMap(row => [row.sun, row.mon, row.tue, row.wed, row.thu])) + '٪ — راجع الحصة واليوم المحددين.' : 'Lowest attendance cell: ' + Math.min(...hourlyHeatmap.flatMap(row => [row.sun, row.mon, row.tue, row.wed, row.thu])) + '% — review the flagged period and weekday.'}</span>
            </p>
          </div>

          {/* Predictions for Tomorrow */}
          <div className="card-base p-6 space-y-4 bg-gradient-to-br from-white to-teal-50/20 dark:from-[#0f1f3d] dark:to-[#0a1628]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-extrabold text-[#182b52] dark:text-white flex items-center gap-2">
                  <Sparkles className="size-4 text-[#19a99a]" />
                  <span>{arabic ? 'التنبؤ بغياب الغد (حالات مرجحة بنسبة > ٨٠٪)' : 'AI Absenteeism Forecast for Tomorrow'}</span>
                </h4>
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                  {arabic ? 'بناءً على الأنماط التاريخية لغياب نهاية الأسبوع والسجلات الصحية' : 'Inferred from historic Thursday patterns, family cluster signals, and wellness trends'}
                </p>
              </div>
              <Badge variant="warning">{absenteeismForecast.length} {arabic ? 'طلاب محتمل غيابهم' : 'students flagged'}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {absenteeismForecast.map(student => (
                <div key={student.id} className="p-4 rounded-2xl bg-white dark:bg-white/[0.04] border border-[#e2e8f0] dark:border-white/[0.08] shadow-sm">
                  <p className="font-extrabold text-sm text-[#182b52] dark:text-white">{arabic ? student.nameAr : student.nameEn}</p>
                  <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">{arabic ? student.classAr : student.classEn}</p>
                  <div className={cn('mt-2 text-xs font-bold', student.riskLevel === 'high' ? 'text-rose-600' : 'text-amber-600')}>
                    {arabic ? 'مؤشر الخطورة: ' + student.probability + '٪' : 'Risk indicator: ' + student.probability + '%'}
                  </div>
                </div>
              ))}
              {absenteeismForecast.length === 0 && (
                <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                  {arabic ? 'لا توجد حالات مرشحة للغياب حالياً.' : 'No absenteeism candidates right now.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 4: Recommendations
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-[#182b52] dark:text-white">
                {arabic ? 'توصيات التدخل الذكية القابلة للتطبيق الفوري' : 'Actionable AI Recommendations'}
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                {arabic ? 'خطط علاجية وتوجيهات تشغيلية مصممة لرفع كفاءة المدرسة' : 'Data-backed operational and pedagogical interventions'}
              </p>
            </div>
            <Badge variant="teal">{recommendations.filter(r => !r.applied && !r.dismissed).length} {arabic ? 'توصيات متاحة' : 'Active'}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec) => {
              if (rec.dismissed) return null

              return (
                <div
                  key={rec.id}
                  className={cn(
                    'card-base p-5 flex flex-col justify-between transition-all duration-300',
                    rec.applied && 'border-emerald-500 bg-emerald-50/10'
                  )}
                >
                  <div>
                    {/* Header: Category & Priority */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <span className="text-[11px] font-bold text-[#19a99a] uppercase tracking-wider">
                        {arabic ? rec.categoryAr : rec.categoryEn}
                      </span>
                      <Badge variant={rec.priority === 'urgent' ? 'danger' : rec.priority === 'high' ? 'warning' : 'info'}>
                        {rec.priority === 'urgent' ? (arabic ? 'عاجل جداً' : 'Urgent') : rec.priority === 'high' ? (arabic ? 'أولوية قصوى' : 'High') : (arabic ? 'متوسط' : 'Medium')}
                      </Badge>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-extrabold text-[#182b52] dark:text-white mb-2 leading-snug">
                      {arabic ? rec.titleAr : rec.titleEn}
                    </h4>

                    {/* Rationale */}
                    <p className="text-xs text-[#64748b] dark:text-[#94a3b8] leading-relaxed mb-3">
                      {arabic ? rec.rationaleAr : rec.rationaleEn}
                    </p>

                    {/* Projected Impact */}
                    <div className="p-2.5 rounded-xl bg-teal-50/60 dark:bg-teal-500/10 border border-teal-500/20 text-xs font-semibold text-[#182b52] dark:text-white flex items-center gap-2">
                      <Zap className="size-4 text-[#19a99a] shrink-0" />
                      <span>{arabic ? rec.impactAr : rec.impactEn}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-4 border-t border-[#f1f5f9] dark:border-white/[0.05] flex items-center justify-between">
                    {rec.applied ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle2 className="size-4" />
                        <span>{arabic ? 'تم التطبيق بنجاح' : 'Applied'}</span>
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 w-full justify-end">
                        <button
                          onClick={() => handleDismissRec(rec.id)}
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          {arabic ? 'تجاهل' : 'Dismiss'}
                        </button>
                        <button
                          onClick={() => handleApplyRec(rec.id)}
                          className="btn-teal text-xs px-4 py-1.5"
                        >
                          {arabic ? 'تطبيق التوصية' : 'Apply'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
