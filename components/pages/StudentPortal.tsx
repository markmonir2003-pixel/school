'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  GraduationCap,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
  FileText,
  AlertCircle,
  ExternalLink,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Upload,
  Library,
  Video,
  Download,
  Flame,
  ArrowUpRight,
  Check,
  Send,
  HelpCircle,
  FileCode,
  Laptop,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ParentLinkPanel } from '@/components/shared/ParentLinkPanel'
import { StatCard } from '@/components/shared/StatCard'
import { Badge } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { cn } from '@/lib/utils'
import { useSchool } from '@/lib/school/store'
import {
  attendanceRate,
  className,
  currentStudent,
  formatDate,
  gradeAverage,
  gradeGpa,
  relativeTime,
  studentExamResults,
  subjectName,
  teacherName,
} from '@/lib/school/engine'

interface StudentPortalProps {
  arabic?: boolean
}

interface CourseItem {
  id: string
  code: string
  titleAr: string
  titleEn: string
  teacherAr: string
  teacherEn: string
  grade: number
  gradeLetter: string
  credits: number
  nextClassTime: string
  roomAr: string
  roomEn: string
  color: string
}

interface StudentAssignment {
  id: string
  titleAr: string
  titleEn: string
  subjectAr: string
  subjectEn: string
  dueDateAr: string
  dueDateEn: string
  points: number
  status: 'overdue' | 'due_soon' | 'upcoming' | 'submitted'
  earnedScore?: string
}

interface GradeTimelineEvent {
  id: string
  subjectAr: string
  subjectEn: string
  assessmentAr: string
  assessmentEn: string
  score: string
  percentage: number
  dateAr: string
  dateEn: string
  noteAr: string
  noteEn: string
}

interface SchedulePeriod {
  periodNum: number
  periodNameAr: string
  periodNameEn: string
  time: string
  subjectAr: string
  subjectEn: string
  roomAr: string
  roomEn: string
  teacherAr: string
  teacherEn: string
  status: 'past' | 'current' | 'next' | 'upcoming'
}

export function StudentPortal({ arabic = false }: StudentPortalProps) {
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'overdue' | 'due_soon' | 'submitted'>('all')
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignment | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const { data, user, submitHomework, addNotification } = useSchool()
  const student = useMemo(() => currentStudent(data, user), [data, user])
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null)
  const [selectedResource, setSelectedResource] = useState<{ titleAr: string; titleEn: string; descAr: string; descEn: string; bodyAr: string; bodyEn: string } | null>(null)
  const [aiSubject, setAiSubject] = useState('')
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [submissionNote, setSubmissionNote] = useState('')
  const [assignmentFile, setAssignmentFile] = useState('')
  const assignmentFileRef = useRef<HTMLInputElement>(null)

  const myClass = useMemo(() => data.classes.find(c => c.id === student?.classId), [data, student])
  const classMates = useMemo(
    () => data.students.filter(s => s.classId === student?.classId && s.status === 'active'),
    [data, student],
  )

  const enrolledSubjects = useMemo(() => {
    if (!student) return []
    const related = [
      ...data.exams.filter(exam => exam.classId === student.classId).map(exam => exam.subjectId),
      ...data.homework.filter(homework => homework.classId === student.classId).map(homework => homework.subjectId),
      ...data.teachers.filter(t => t.classIds.includes(student.classId)).flatMap(t => t.subjectIds),
    ]
    const unique = Array.from(new Set(related))
    const subjects = data.subjects.filter(subject => unique.includes(subject.id))
    return subjects.slice(0, 6)
  }, [data, student])

  const subjectAverage = (subjectId: string) => {
    if (!student) return 0
    const examIds = new Set(
      data.exams
        .filter(exam => exam.subjectId === subjectId && exam.classId === student.classId)
        .map(exam => exam.id),
    )
    const grades = data.grades.filter(grade => grade.studentId === student.id && examIds.has(grade.examId))
    if (grades.length === 0) return 0
    const total = grades.reduce((sum, grade) => {
      const exam = data.exams.find(e => e.id === grade.examId)
      return sum + (exam ? (grade.score / exam.maxMarks) * 100 : 0)
    }, 0)
    return Math.round(total / grades.length)
  }

  const letterFor = (value: number) => {
    if (value >= 95) return 'A+'
    if (value >= 90) return 'A'
    if (value >= 85) return 'B+'
    if (value >= 80) return 'B'
    if (value >= 70) return 'C'
    if (value >= 60) return 'D'
    return 'F'
  }

  const periodTimes = ['08:00 - 08:45', '09:00 - 09:45', '10:15 - 11:00', '11:15 - 12:00', '13:00 - 13:45']

  // ── Today's schedule, built from the student's enrolled subjects ──
  const todaySchedule = useMemo<SchedulePeriod[]>(() => {
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    let nextAssigned = false
    return enrolledSubjects.slice(0, 5).map((subject, index) => {
      const teacher = data.teachers.find(t => t.subjectIds.includes(subject.id) && t.classIds.includes(student?.classId ?? ''))
        ?? data.teachers.find(t => t.subjectIds.includes(subject.id))
      const [startText, endText] = periodTimes[index].split(' - ')
      const toMinutes = (value: string) => {
        const [hours, minutes] = value.split(':').map(Number)
        return hours * 60 + minutes
      }
      const startMinute = toMinutes(startText)
      const endMinute = toMinutes(endText)
      let status: SchedulePeriod['status'] = 'upcoming'
      if (nowMinutes > endMinute) status = 'past'
      else if (nowMinutes >= startMinute) status = 'current'
      else if (!nextAssigned) {
        status = 'next'
        nextAssigned = true
      }
      return {
        periodNum: index + 1,
        periodNameAr: `الحصة ${index + 1}`,
        periodNameEn: `Period ${index + 1}`,
        time: periodTimes[index],
        subjectAr: subject.nameAr,
        subjectEn: subject.nameEn,
        roomAr: myClass?.room ?? '—',
        roomEn: myClass?.room ?? '—',
        teacherAr: teacher?.nameAr ?? '—',
        teacherEn: teacher?.nameEn ?? '—',
        status,
      }
    })
  }, [data, enrolledSubjects, myClass, student])

  // ── My Courses, live from the grade registry ─────────────────
  const courses: CourseItem[] = useMemo(() => {
    const palette = [
      'from-[#19a99a] to-[#0d9488]',
      'from-[#6366f1] to-[#4f46e5]',
      'from-[#f59e0b] to-[#d97706]',
      'from-[#3b82f6] to-[#2563eb]',
      'from-[#14b8a6] to-[#0f766e]',
      'from-[#8b5cf6] to-[#7c3aed]',
    ]
    return enrolledSubjects.map((subject, index) => {
      const teacher = data.teachers.find(t => t.subjectIds.includes(subject.id) && t.classIds.includes(student?.classId ?? ''))
        ?? data.teachers.find(t => t.subjectIds.includes(subject.id))
      const period = todaySchedule.find(entry => entry.subjectEn === subject.nameEn)
      const average = subjectAverage(subject.id)
      return {
        id: subject.id,
        code: subject.code,
        titleAr: subject.nameAr,
        titleEn: subject.nameEn,
        teacherAr: teacher?.nameAr ?? '—',
        teacherEn: teacher?.nameEn ?? '—',
        grade: average,
        gradeLetter: average > 0 ? letterFor(average) : '—',
        credits: 3,
        nextClassTime: period ? period.time.split(' - ')[0] : '—',
        roomAr: myClass?.room ?? '—',
        roomEn: myClass?.room ?? '—',
        color: palette[index % palette.length],
      }
    })
  }, [data, enrolledSubjects, myClass, student, todaySchedule])

  // ── Assignment tracker, built from homework + submissions ────
  const assignments: StudentAssignment[] = useMemo(() => {
    if (!student) return []
    const today = new Date().toISOString().slice(0, 10)
    return data.homework
      .filter(homework => homework.classId === student.classId)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 8)
      .map(homework => {
        const submission = data.submissions.find(s => s.homeworkId === homework.id && s.studentId === student.id)
        const submitted = !!submission && submission.status !== 'pending' && submission.status !== 'missing'
        const dueSoon = homework.dueDate <= new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
        const status: StudentAssignment['status'] = submitted
          ? 'submitted'
          : homework.dueDate < today
            ? 'overdue'
        : dueSoon
              ? 'due_soon'
              : 'upcoming'
        return {
          id: homework.id,
          titleAr: homework.titleAr,
          titleEn: homework.titleEn,
          subjectAr: subjectName(data, homework.subjectId, 'ar'),
          subjectEn: subjectName(data, homework.subjectId, 'en'),
          dueDateAr: formatDate(homework.dueDate, 'ar'),
          dueDateEn: formatDate(homework.dueDate, 'en'),
          points: homework.maxScore,
          status,
          earnedScore: submission?.score !== undefined ? `${submission.score} / ${homework.maxScore}` : undefined,
        }
      })
  }, [data, student])

  const assignmentCounts = useMemo(() => ({
    all: assignments.length,
    overdue: assignments.filter(a => a.status === 'overdue').length,
    due_soon: assignments.filter(a => a.status === 'due_soon').length,
    submitted: assignments.filter(a => a.status === 'submitted').length,
  }), [assignments])

  const filteredAssignments = assignments.filter((a) => {
    if (assignmentFilter === 'all') return true
    return a.status === assignmentFilter
  })

  // ── Grades timeline from published exam results ─────────────
  const gradeTimeline: GradeTimelineEvent[] = useMemo(() => {
    if (!student) return []
    return studentExamResults(data, student.id)
      .slice(0, 6)
      .map(result => ({
        id: result.grade.id,
        subjectAr: subjectName(data, result.exam.subjectId, 'ar'),
        subjectEn: subjectName(data, result.exam.subjectId, 'en'),
        assessmentAr: result.exam.nameAr,
        assessmentEn: result.exam.nameEn,
        score: `${result.grade.score} / ${result.exam.maxMarks}`,
        percentage: Math.round(result.percentage),
        dateAr: formatDate(result.exam.date, 'ar'),
        dateEn: formatDate(result.exam.date, 'en'),
        noteAr: result.grade.comment || (result.passed ? 'نتيجة معتمدة من معلم المادة.' : 'يرجى مراجعة المعلم لخطة الدعم.'),
        noteEn: result.grade.comment || (result.passed ? 'Result approved by the subject teacher.' : 'Please see the teacher for a support plan.'),
      }))
  }, [data, student])

  // ── Study resources ───────────────────────────────────────────
  const studyResources = [
    {
      id: 'res-1',
      titleAr: 'المكتبة الرقمية والمراجع',
      titleEn: 'Digital Library & Texts',
      descAr: 'أكثر من ٥٠٠ كتاب ومجلد مدرسي رقمي',
      descEn: '500+ textbooks and reference papers',
      icon: Library,
      color: 'text-[#19a99a] bg-[#19a99a]/10',
      bodyAr: `تتيح المكتبة الرقمية في ${data.settings.schoolNameAr} الوصول إلى الكتب المقررة والمراجع الإثرية لكل صف. يمكنك طلب نسخة رقمية من أمين المكتبة عبر الإدارة.`,
      bodyEn: `The ${data.settings.schoolNameEn} digital library gives access to prescribed textbooks and enrichment references for every grade. Request a digital copy from the librarian through the administration.`,
    },
    {
      id: 'res-2',
      titleAr: 'نماذج الاختبارات السابقة',
      titleEn: 'Past Exam Papers Archive',
      descAr: 'أسئلة محلولة ونماذج الإجابة لآخر ٥ سنوات',
      descEn: 'Solved sample exams for past 5 years',
      icon: FileCode,
      color: 'text-[#6366f1] bg-[#6366f1]/10',
      bodyAr: 'أرشيف نماذج الاختبارات متاح لطلاب الصفوف من ٩ إلى ١٢. استخدم صفحة الاختبارات لمراجعة نتائجك السابقة، واطلب النماذج من معلم المادة.',
      bodyEn: 'The past-paper archive is available to grades 9–12. Use the Exams page to review your previous results, and request sample papers from your subject teacher.',
    },
    {
      id: 'res-3',
      titleAr: 'المحاضرات المسجلة والفيديو',
      titleEn: 'Video Lecture Vault',
      descAr: 'شروحات مفصلة لكل درس بجودة عالية',
      descEn: 'Full HD topic-by-topic video lectures',
      icon: Video,
      color: 'text-[#f59e0b] bg-[#f59e0b]/10',
      bodyAr: 'تسجيلات الحصص متاحة للطلاب المسجلين. تواصل مع معلم المادة للحصول على رابط المحاضرة المسجلة عند الغياب.',
      bodyEn: 'Recorded lessons are available to enrolled students. Contact your subject teacher for the recording link when you are absent.',
    },
    {
      id: 'res-4',
      titleAr: 'المساعد الذكي للدروس (AI Tutor)',
      titleEn: '24/7 AI Tutor Assistant',
      descAr: 'اطرح أي سؤال في الرياضيات أو العلوم وتلقى شرحاً فورياً',
      descEn: 'Ask any STEM question for step-by-step guidance',
      icon: Sparkles,
      color: 'text-[#2dd4bf] bg-[#2dd4bf]/10',
      bodyAr: 'مساعد تعليمي محلي يقدم خطوات منهجية، ويحوّل سؤالك إلى المعلم عند الحاجة لمراجعة بشرية.',
      bodyEn: 'A local study assistant that suggests a method and forwards your question to the teacher when human review is needed.',
    },
  ]

  useEffect(() => {
    if (!aiSubject && enrolledSubjects.length > 0) setAiSubject(arabic ? enrolledSubjects[0].nameAr : enrolledSubjects[0].nameEn)
  }, [aiSubject, enrolledSubjects, arabic])

  const askTutor = () => {
    if (!aiQuestion.trim()) {
      triggerToast(arabic ? 'اكتب سؤالك أولاً.' : 'Please type your question first.')
      return
    }
    const subject = enrolledSubjects.find(s => s.nameAr === aiSubject || s.nameEn === aiSubject)
    const steps = arabic
      ? [
          '١. اقرأ المسألة وحدد المعطيات والمطلوب.',
          '٢. اكتب القانون أو القاعدة المناسبة من المنهج.',
          '٣. طبّق الخطوات مع الوحدات، وتحقق من الإشارات.',
          '٤. قارن الناتج بتقدير تقريبي وتأكد من منطقيته.',
          '٥. راجع الحل مع معلم المادة قبل الاعتماد عليه.',
        ]
      : [
          '1. Read the problem and list the given values and the unknown.',
          '2. Write the relevant formula or rule from the curriculum.',
          '3. Apply the steps with units and check signs carefully.',
          '4. Compare the result with a quick estimate to test plausibility.',
          '5. Review the solution with your subject teacher before relying on it.',
        ]
    setAiAnswer(
      (arabic
        ? `خطة حل مقترحة لمادة ${subject?.nameAr ?? aiSubject}:`
        : `Suggested method for ${subject?.nameEn ?? aiSubject}:`) + '\n' + steps.join('\n'),
    )
    addNotification({
      category: 'message',
      titleAr: 'سؤال من طالب عبر المعلم الذكي',
      titleEn: 'Student question from the AI tutor',
      bodyAr: `الطالب ${student?.nameAr ?? ''} يسأل في ${subject?.nameAr ?? aiSubject}: ${aiQuestion}`,
      bodyEn: `Student ${student?.nameEn ?? ''} asks in ${subject?.nameEn ?? aiSubject}: ${aiQuestion}`,
      recipientRole: 'teacher',
      studentId: student?.id,
      link: 'teacher-dashboard',
    })
  }

  const confirmSubmission = () => {
    if (!selectedAssignment || !student) return
    submitHomework(selectedAssignment.id, student.id, assignmentFile || (arabic ? 'ملف-الطالب.pdf' : 'student-submission.pdf'))
    addNotification({
      category: 'academic',
      titleAr: 'تسليم واجب جديد',
      titleEn: 'New homework submission',
      bodyAr: `سلّم الطالب ${student.nameAr} واجب «${selectedAssignment.titleAr}».${submissionNote ? ` ملاحظة: ${submissionNote}` : ''}`,
      bodyEn: `${student.nameEn} submitted “${selectedAssignment.titleEn}”.${submissionNote ? ` Note: ${submissionNote}` : ''}`,
      recipientRole: 'teacher',
      studentId: student.id,
      link: 'teacher-dashboard',
    })
    setSelectedAssignment(null)
    setSubmissionNote('')
    setAssignmentFile('')
    triggerToast(arabic ? 'تم تسليم الواجب وإشعار المعلم.' : 'Assignment submitted and teacher notified.')
  }

  const greetingName = student ? (arabic ? student.nameAr : student.nameEn) : (arabic ? 'الطالب' : 'Student')
  const average = student ? gradeAverage(data, student.id) : 0

  if (!student) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto" dir={arabic ? 'rtl' : 'ltr'}>
        <PageHeader
          arabic={arabic}
          title={arabic ? 'بوابة الطالب' : 'Student Portal'}
          subtitle={
            arabic
              ? 'مساحتك الشخصية للمواد والواجبات والدرجات والجدول الدراسي.'
              : 'Your personal space for courses, assignments, grades and schedule.'
          }
          icon={GraduationCap}
          breadcrumb={[arabic ? 'الرئيسية' : 'Home', arabic ? 'بوابة الطالب' : 'Student Portal']}
        />

        <div className="card-base p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-4">
          <div className="size-16 rounded-2xl bg-[#19a99a]/10 text-[#19a99a] flex items-center justify-center mx-auto">
            <GraduationCap className="size-8" />
          </div>
          <h2 className="text-[18px] font-extrabold text-[#182b52] dark:text-white">
            {arabic ? 'لا يوجد سجل طالب مرتبط بهذا الحساب' : 'No linked student record on this account'}
          </h2>
          <p className="text-[13px] text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
            {arabic
              ? 'بوابة الطالب مخصصة للطلاب المقيدين في مدرسة سان جورج. إذا كنت طالباً مسجلاً ولم يتم ربط حسابك برقم القيد الأكاديمي، يرجى مراجعة شؤون الطلاب بالمدرسة.'
              : 'The student portal is dedicated to registered students at St. George School. If your account is not linked to your student ID, please visit the student affairs office.'}
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
        title={arabic ? `مرحباً، ${greetingName} 🚀` : `Welcome back, ${greetingName}! 🚀`}
        subtitle={
          arabic
            ? `${myClass?.nameAr ?? '—'} • الرقم الأكاديمي: ${student?.studentId ?? '—'}`
            : `${myClass?.nameEn ?? '—'} • Student ID: ${student?.studentId ?? '—'}`
        }
        icon={GraduationCap}
        breadcrumb={[
          arabic ? 'الرئيسية' : 'Home',
          arabic ? 'الطلاب' : 'Students',
          arabic ? 'بوابتي' : 'My Portal',
        ]}
        actions={
          <div className="flex items-center gap-2">
            <span className="badge-teal text-xs font-bold px-3 py-1.5 rounded-xl">
              {arabic ? 'الفصل الدراسي الأول ٢٠٢٦' : 'Term 1 • 2026'}
            </span>
            <button
              onClick={() => setActiveModal('aiTutor')}
              className="btn-primary text-xs sm:text-sm font-semibold flex items-center gap-1.5"
            >
              <Sparkles className="size-4 text-[#2dd4bf]" />
              <span>{arabic ? 'اسأل المعلم الذكي' : 'Ask AI Tutor'}</span>
            </button>
          </div>
        }
      />

      <ParentLinkPanel role="student" arabic={arabic} />

      {/* ── 4 Top Stat Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          label={arabic ? 'المعدل التراكمي (GPA)' : 'Cumulative GPA'}
          value={gradeGpa(average).toFixed(2)}
          caption={arabic ? `المعدل ${average}٪ • من أصل ٤.٠` : `${average}% average • out of 4.0`}
          change={average >= 90 ? (arabic ? 'ممتاز' : 'Excellent') : (arabic ? 'جيد' : 'Good')}
          trend="up"
          icon={Award}
          iconBg="#182b52"
          iconColor="#ffffff"
          delay={1}
        />
        <StatCard
          label={arabic ? 'تقييمات منشورة' : 'Published Assessments'}
          value={student ? studentExamResults(data, student.id).length : 0}
          caption={arabic ? 'نتائج متاحة لك ولولي أمرك' : 'Visible to you and your guardian'}
          change={arabic ? 'من سجل الدرجات' : 'From gradebook'}
          trend="neutral"
          icon={FileText}
          iconBg="rgba(245,158,11,0.15)"
          iconColor="#f59e0b"
          delay={2}
        />
        <StatCard
          label={arabic ? 'نسبة الحضور والالتزام' : 'Attendance Rate'}
          value={`${student ? attendanceRate(data, student.id, 60) : 0}%`}
          caption={arabic ? 'آخر ٦٠ يوماً دراسياً' : 'Last 60 school days'}
          change={student && attendanceRate(data, student.id, 60) >= data.settings.attendanceThreshold ? (arabic ? 'فوق الحد' : 'Above threshold') : (arabic ? 'تحت الحد' : 'Below threshold')}
          trend="up"
          icon={CheckCircle2}
          iconBg="rgba(25,169,154,0.15)"
          iconColor="#19a99a"
          delay={3}
        />
        <StatCard
          label={arabic ? 'الساعات المكتسبة' : 'Earned Credits'}
          value={`${courses.filter(c => c.grade > 0).length * 3} / ${Math.max(1, courses.length) * 3}`}
          caption={arabic ? 'ساعات المقررات المرصودة' : 'credits with recorded grades'}
          change={`${courses.length} ${arabic ? 'مقررات' : 'courses'}`}
          trend="neutral"
          icon={BookOpen}
          iconBg="rgba(99,102,241,0.15)"
          iconColor="#6366f1"
          delay={4}
        />
      </div>

      {/* ── My Courses Grid (6 Subjects) ─────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-[#182b52]/10 dark:bg-white/[0.06] text-[#182b52] dark:text-white flex items-center justify-center font-bold text-xs">
              <BookOpen className="size-3.5" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#182b52] dark:text-white">
                {arabic ? 'مقرراتي الدراسية الحالية' : 'My Enrolled Courses'}
              </h3>
              <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                {arabic ? `${courses.length} مقررات في الترم الحالي` : `${courses.length} active courses this term`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('curriculum')}
            className="text-xs text-[#19a99a] font-semibold hover:underline flex items-center gap-1"
          >
            <span>{arabic ? 'الخطة الدراسية الكاملة' : 'Full Curriculum'}</span>
            <ArrowUpRight className="size-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {courses.map((course) => (
            <div
              key={course.id}
              className="card-base p-5 hover:translate-y-[-2px] transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Course Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#94a3b8] block">
                      {course.code} • {course.credits} {arabic ? 'ساعات' : 'Credits'}
                    </span>
                    <h4 className="text-sm font-bold text-[#182b52] dark:text-white truncate mt-0.5" title={arabic ? course.titleAr : course.titleEn}>
                      {arabic ? course.titleAr : course.titleEn}
                    </h4>
                  </div>
                  <div className="text-end shrink-0">
                    <span className="badge-teal text-xs font-black px-2 py-0.5 rounded-lg">
                      {course.gradeLetter}
                    </span>
                  </div>
                </div>

                {/* Teacher & Next Class */}
                <div className="space-y-1.5 text-xs text-[#64748b] dark:text-[#94a3b8] mb-4">
                  <p className="truncate">
                    {arabic ? 'المعلم:' : 'Teacher:'}{' '}
                    <span className="text-[#182b52] dark:text-white font-medium">
                      {arabic ? course.teacherAr : course.teacherEn}
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5 text-[11px]">
                    <Clock className="size-3 text-[#19a99a]" />
                    <span>
                      {arabic ? course.roomAr : course.roomEn} • {course.nextClassTime}
                    </span>
                  </p>
                </div>
              </div>

              {/* Progress & Actions */}
              <div className="pt-3 border-t border-[#f1f5f9] dark:border-white/[0.04]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#94a3b8]">{arabic ? 'الدرجة المحققة' : 'Current Grade'}</span>
                  <span className="font-extrabold text-[#182b52] dark:text-white">{course.grade}%</span>
                </div>
                <div className="progress-track h-2 mb-3">
                  <div
                    className={cn(
                      'progress-fill',
                      course.grade >= 90
                        ? 'bg-[#19a99a]'
                        : course.grade >= 80
                        ? 'bg-[#6366f1]'
                        : 'bg-[#f59e0b]'
                    )}
                    style={{ width: `${course.grade}%` }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => { setSelectedCourse(course); setActiveModal('course') }}
                    className="btn-secondary text-[11px] font-semibold py-1 px-3 h-7 rounded-lg flex-1 justify-center"
                  >
                    {arabic ? 'محتوى المادة' : 'Syllabus'}
                  </button>
                  <button
                    onClick={() => setActiveModal('aiTutor')}
                    className="btn-icon size-7 rounded-lg text-[#19a99a]"
                    title={arabic ? 'مساعدة الذكاء الاصطناعي' : 'AI Help'}
                  >
                    <Sparkles className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Middle Row: Assignment Tracker & Schedule Today ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Assignment Tracker (7 cols) */}
        <div className="lg:col-span-7 card-base p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#e2e8f0] dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#ef4444]/10 text-[#ef4444] flex items-center justify-center">
                  <FileText className="size-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                    {arabic ? 'متابعة الواجبات والتسليمات' : 'My Assignments & Tasks'}
                  </h3>
                  <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                    {arabic ? 'مواعيد الاستحقاق وحالة كل واجب' : 'Upcoming deadlines & submissions status'}
                  </p>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-[#f1f5f9] dark:bg-white/[0.04] p-1 rounded-xl overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setAssignmentFilter('all')}
                  className={cn(
                    'text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all whitespace-nowrap',
                    assignmentFilter === 'all'
                      ? 'bg-white dark:bg-[#0f1f3d] text-[#182b52] dark:text-white shadow-xs'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  )}
                >
                  {arabic ? `الكل (${assignmentCounts.all})` : `All (${assignmentCounts.all})`}
                </button>
                <button
                  onClick={() => setAssignmentFilter('overdue')}
                  className={cn(
                    'text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all whitespace-nowrap',
                    assignmentFilter === 'overdue'
                      ? 'bg-white dark:bg-[#0f1f3d] text-red-600 shadow-xs'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  )}
                >
                  {arabic ? `متأخر (${assignmentCounts.overdue})` : `Overdue (${assignmentCounts.overdue})`}
                </button>
                <button
                  onClick={() => setAssignmentFilter('due_soon')}
                  className={cn(
                    'text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all whitespace-nowrap',
                    assignmentFilter === 'due_soon'
                      ? 'bg-white dark:bg-[#0f1f3d] text-amber-600 shadow-xs'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  )}
                >
                  {arabic ? `قريباً (${assignmentCounts.due_soon})` : `Due Soon (${assignmentCounts.due_soon})`}
                </button>
                <button
                  onClick={() => setAssignmentFilter('submitted')}
                  className={cn(
                    'text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all whitespace-nowrap',
                    assignmentFilter === 'submitted'
                      ? 'bg-white dark:bg-[#0f1f3d] text-[#19a99a] shadow-xs'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  )}
                >
                  {arabic ? `مكتمل (${assignmentCounts.submitted})` : `Submitted (${assignmentCounts.submitted})`}
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {filteredAssignments.map((asg) => (
                <div
                  key={asg.id}
                  className={cn(
                    'p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                    asg.status === 'overdue' &&
                      'border-red-200 dark:border-red-500/20 bg-red-50/40 dark:bg-red-500/[0.04]',
                    asg.status === 'due_soon' &&
                      'border-amber-200 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/[0.04]',
                    asg.status === 'submitted' &&
                      'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/[0.04]'
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge-neutral text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {arabic ? asg.subjectAr : asg.subjectEn}
                      </span>
                      {asg.status === 'overdue' && (
                        <Badge variant="danger" size="sm" dot>
                          {arabic ? 'متأخر' : 'Overdue'}
                        </Badge>
                      )}
                      {asg.status === 'due_soon' && (
                        <Badge variant="warning" size="sm" dot>
                          {arabic ? 'مستحق قريباً' : 'Due Soon'}
                        </Badge>
                      )}
                      {asg.status === 'submitted' && (
                        <Badge variant="success" size="sm" dot>
                          {arabic ? 'تم التسليم' : 'Submitted'}
                        </Badge>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-[#182b52] dark:text-white truncate">
                      {arabic ? asg.titleAr : asg.titleEn}
                    </h4>

                    <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5 flex items-center gap-1.5">
                      <Clock className="size-3 text-[#94a3b8]" />
                      <span>{arabic ? asg.dueDateAr : asg.dueDateEn}</span>
                      <span>•</span>
                      <span>
                        {asg.points} {arabic ? 'نقطة' : 'Points'}
                      </span>
                      {asg.earnedScore && (
                        <>
                          <span>•</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {asg.earnedScore}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center justify-end">
                    {asg.status === 'submitted' ? (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" />
                        <span>{arabic ? 'تم التقييم' : 'Graded'}</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedAssignment(asg)}
                        className="btn-teal text-xs font-semibold py-1.5 px-3 h-8 flex items-center gap-1.5"
                      >
                        <Upload className="size-3" />
                        <span>{arabic ? 'تسليم الواجب' : 'Submit Work'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-[#f1f5f9] dark:border-white/[0.04] text-center">
            <span className="text-xs text-[#94a3b8]">
              {arabic
                ? '💡 تسليم الواجبات قبل الموعد يمنحك نقاط تميز إضافية في التقييم التراكمي.'
                : '💡 Early submissions earn extra milestone bonus points.'}
            </span>
          </div>
        </div>

        {/* Schedule Today (5 cols) */}
        <div className="lg:col-span-5 card-base p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e2e8f0] dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#182b52]/10 dark:bg-white/[0.06] text-[#182b52] dark:text-white flex items-center justify-center">
                  <Calendar className="size-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                    {arabic ? 'جدول حصص اليوم' : "Today's Schedule"}
                  </h3>
                  <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                    {arabic ? `${new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(new Date())} • ${todaySchedule.length} حصص مبرمجة` : `${new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())} • ${todaySchedule.length} scheduled periods`}
                  </p>
                </div>
              </div>
              <Badge variant="teal" size="sm">
                {arabic ? 'اليوم' : 'Today'}
              </Badge>
            </div>

            <div className="space-y-2.5">
              {todaySchedule.map((prd) => {
                const isCurrent = prd.status === 'current'
                const isPast = prd.status === 'past'

                return (
                  <div
                    key={prd.periodNum}
                    className={cn(
                      'p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs',
                      isCurrent
                        ? 'border-[#19a99a] bg-[#19a99a]/[0.08] dark:bg-[#19a99a]/15 shadow-sm'
                        : isPast
                        ? 'border-[#e2e8f0] dark:border-white/[0.04] bg-[#f8fafc]/60 dark:bg-white/[0.02] opacity-70'
                        : 'border-[#e2e8f0] dark:border-white/[0.06] bg-white dark:bg-[#0f1f3d]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'size-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                          isCurrent
                            ? 'bg-[#19a99a] text-white'
                            : isPast
                            ? 'bg-[#dcfce7] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-[#f1f5f9] dark:bg-white/[0.06] text-[#64748b]'
                        )}
                      >
                        {isPast ? <Check className="size-3.5 stroke-[3]" /> : prd.periodNum}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-[#182b52] dark:text-white">
                            {arabic ? prd.subjectAr : prd.subjectEn}
                          </h4>
                          {isCurrent && (
                            <span className="badge-teal text-[9px] px-1.5 py-0.2 rounded-full">
                              {arabic ? 'الآن' : 'Now'}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                          {arabic ? prd.roomAr : prd.roomEn} • {arabic ? prd.teacherAr : prd.teacherEn}
                        </p>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-[#182b52] dark:text-[#cbd5e1] whitespace-nowrap">
                      {prd.time.split(' - ')[0]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-[#f1f5f9] dark:border-white/[0.04] flex items-center justify-between text-xs text-[#64748b]">
            <span>{arabic ? 'فترة الاستراحة: ١٢:٠٠ - ٠١:٠٠ م' : 'Lunch break: 12:00 - 01:00 PM'}</span>
            <button
              onClick={() => setActiveModal('schedule')}
              className="text-[#19a99a] font-semibold hover:underline"
            >
              {arabic ? 'الجدول الكامل' : 'All Week'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Grades Timeline & Study Resources ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Grades Timeline (7 cols) */}
        <div className="lg:col-span-7 card-base p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#e2e8f0] dark:border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-[#19a99a]/10 text-[#19a99a] flex items-center justify-center">
                <Award className="size-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'خط سير الدرجات والتقييمات الأخيرة' : 'Recent Grades & Milestone Events'}
                </h3>
                <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                  {arabic ? 'آخر النتائج المرصودة وملاحظات المعلمين' : 'Latest graded assessments with feedback'}
                </p>
              </div>
            </div>

            <span className="badge-teal text-[10px] font-bold px-2 py-0.5 rounded-full">
              {arabic ? 'محدث اليوم' : 'Updated Today'}
            </span>
          </div>

          <div className="space-y-4">
            {gradeTimeline.map((item, idx) => (
              <div key={item.id} className="relative flex items-start gap-3.5 text-xs">
                {/* Timeline connector dot */}
                <div className="size-7 rounded-full bg-[#19a99a]/15 text-[#19a99a] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  {idx + 1}
                </div>

                <div className="flex-1 p-3 rounded-xl border border-[#e2e8f0] dark:border-white/[0.06] bg-[#f8fafc]/50 dark:bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <span className="text-[10px] text-[#94a3b8] block">
                        {arabic ? item.subjectAr : item.subjectEn}
                      </span>
                      <h4 className="text-xs font-bold text-[#182b52] dark:text-white">
                        {arabic ? item.assessmentAr : item.assessmentEn}
                      </h4>
                    </div>

                    <div className="text-end shrink-0">
                      <span className="text-sm font-black text-[#19a99a] block leading-none">
                        {item.score}
                      </span>
                      <span className="text-[10px] text-[#94a3b8]">{item.percentage}%</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] italic mt-1 bg-white dark:bg-white/[0.04] p-2 rounded-lg border border-[#e2e8f0]/60 dark:border-white/[0.04]">
                    &quot;{arabic ? item.noteAr : item.noteEn}&quot;
                  </p>

                  <div className="text-[10px] text-[#94a3b8] mt-2 flex justify-end">
                    {arabic ? item.dateAr : item.dateEn}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Study Resources & Quick Links (5 cols) */}
        <div className="lg:col-span-5 card-base p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e2e8f0] dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#6366f1]/10 text-[#6366f1] flex items-center justify-center">
                  <Library className="size-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                    {arabic ? 'مصادر المذاكرة والتعلم' : 'Study Resources & Hub'}
                  </h3>
                  <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                    {arabic ? 'وصول سريع للمكتبات والأدوات المساندة' : 'Quick access to digital learning tools'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {studyResources.map((res) => {
                const ResIcon = res.icon
                return (
                  <div
                    key={res.id}
                    onClick={() => {
                      if (res.id === 'res-4') {
                        setActiveModal('aiTutor')
                      } else {
                        setSelectedResource({
                          titleAr: res.titleAr,
                          titleEn: res.titleEn,
                          descAr: res.descAr,
                          descEn: res.descEn,
                          bodyAr: (res as { bodyAr: string }).bodyAr,
                          bodyEn: (res as { bodyEn: string }).bodyEn,
                        })
                        setActiveModal('resource')
                      }
                    }}
                    className="p-3 rounded-xl border border-[#e2e8f0] dark:border-white/[0.06] bg-white dark:bg-[#0f1f3d] hover:border-[#19a99a]/50 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', res.color)}>
                        <ResIcon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#182b52] dark:text-white truncate">
                          {arabic ? res.titleAr : res.titleEn}
                        </h4>
                        <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] truncate mt-0.5">
                          {arabic ? res.descAr : res.descEn}
                        </p>
                      </div>
                    </div>

                    <button className="btn-icon size-7 rounded-lg shrink-0">
                      {arabic ? <ChevronLeft className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-[#19a99a]/15 to-[#6366f1]/15 border border-[#19a99a]/20 mt-4 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="size-4 text-[#19a99a]" />
              <span className="font-bold text-[#182b52] dark:text-white">
                {arabic ? 'مساعد الذكاء الاصطناعي متاح ٢٤/٧' : 'Smart AI Tutor Available 24/7'}
              </span>
            </div>
            <p className="text-[11px] text-[#334155] dark:text-[#cbd5e1] leading-relaxed mb-2.5">
              {arabic
                ? 'هل تواجه صعوبة في مسألة تفاضل أو قانون فيزيائي؟ المساعد الذكي جاهز لشرح الخطوات فوراً.'
                : 'Need instant help with an integral formula or circuit problem? Ask AI Tutor anytime.'}
            </p>
            <button
              onClick={() => setActiveModal('aiTutor')}
              className="btn-teal text-xs py-1.5 px-3 w-full justify-center"
            >
              {arabic ? 'بدء محادثة مع المعلم الذكي' : 'Start Session with AI Tutor'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal: Submit Assignment ──────────────────────────── */}
      {selectedAssignment && (
        <Modal
          open={!!selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
          title={arabic ? `تسليم: ${selectedAssignment.titleAr}` : `Submit: ${selectedAssignment.titleEn}`}
          size="md"
          arabic={arabic}
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <button
                onClick={() => setSelectedAssignment(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                {arabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirmSubmission}
                className="btn-teal text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <Upload className="size-3.5" />
                <span>{arabic ? 'تأكيد التسليم' : 'Submit Final Work'}</span>
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03] border border-[#e2e8f0] dark:border-white/[0.06] text-xs">
              <div className="flex justify-between mb-1">
                <span className="font-bold text-[#182b52] dark:text-white">
                  {arabic ? selectedAssignment.subjectAr : selectedAssignment.subjectEn}
                </span>
                <span className="text-[#19a99a] font-bold">
                  {selectedAssignment.points} {arabic ? 'نقطة' : 'pts'}
                </span>
              </div>
              <p className="text-[#64748b] dark:text-[#94a3b8]">
                {arabic ? `الموعد النهائي: ${selectedAssignment.dueDateAr}` : `Due: ${selectedAssignment.dueDateEn}`}
              </p>
            </div>

            {/* File Upload Drop Area */}
            <input
              ref={assignmentFileRef}
              type="file"
              className="hidden"
              onChange={e => setAssignmentFile(e.target.files?.[0]?.name ?? '')}
            />
            <button
              type="button"
              onClick={() => assignmentFileRef.current?.click()}
              className="w-full border-2 border-dashed border-[#cbd5e1] dark:border-white/[0.1] rounded-2xl p-6 text-center hover:border-[#19a99a] transition-all bg-[#f8fafc]/50 dark:bg-white/[0.02]"
            >
              <Upload className="size-8 text-[#94a3b8] mx-auto mb-2" />
              <p className="text-xs font-bold text-[#182b52] dark:text-white mb-1">
                {assignmentFile || (arabic ? 'اسحب الملف هنا أو انقر للتصفح' : 'Drag your file here or browse')}
              </p>
              <p className="text-[10px] text-[#94a3b8]">
                PDF, DOCX, ZIP, PY (Max 25 MB)
              </p>
            </button>

            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'ملاحظة أو تعليق للمعلم (اختياري):' : 'Note to Teacher (Optional):'}
              </label>
              <textarea
                rows={3}
                value={submissionNote}
                onChange={e => setSubmissionNote(e.target.value)}
                placeholder={arabic ? 'أضف أي توضيح بخصوص طريقة حلك...' : 'Add any comments about your solution...'}
                className="ss-input text-xs h-auto py-2"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: AI Tutor Assistant ────────────────────────── */}
      <Modal
        open={activeModal === 'aiTutor'}
        onClose={() => setActiveModal(null)}
        title={arabic ? 'المعلم الذكي الفوري (AI Tutor)' : 'Smart AI Tutor Session'}
        size="md"
        arabic={arabic}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button onClick={() => setActiveModal(null)} className="btn-secondary text-xs px-4 py-2">
              {arabic ? 'إغلاق' : 'Close'}
            </button>
            <button
              onClick={askTutor}
              className="btn-teal text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <Sparkles className="size-3.5" />
              <span>{arabic ? 'طلب الشرح خطوة بخطوة' : 'Solve Step-by-Step'}</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-gradient-to-r from-[#19a99a]/10 to-[#6366f1]/10 border border-[#19a99a]/20 text-xs">
            <p className="text-[#182b52] dark:text-white font-semibold leading-relaxed">
              {arabic
                ? `مرحباً ${greetingName}! أنا مساعدك الدراسي لصف ${myClass?.nameAr ?? ''}. اكتب مسألتك وسأقترح خطوات الحل، وسيُحوَّل السؤال إلى معلمك.`
                : `Hello ${greetingName}! I am your study assistant for ${myClass?.nameEn ?? 'your class'}. Type your question for a suggested method; it is also forwarded to your teacher.`}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
              {arabic ? 'المادة الدراسية' : 'Subject'}
            </label>
            <select className="ss-input text-xs">
              <option>{arabic ? 'الرياضيات المتقدمة (تفاضل وتكامل)' : 'Advanced Calculus'}</option>
              <option>{arabic ? 'الفيزياء (كهرومغناطيسية)' : 'Electromagnetism Physics'}</option>
              <option>{arabic ? 'الكيمياء العضوية' : 'Organic Chemistry'}</option>
              <option>{arabic ? 'علوم الحاسب والذكاء الاصطناعي' : 'Computer Science & AI'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
              {arabic ? 'سؤالك أو نص المسألة:' : 'Your Question or Problem:'}
            </label>
            <textarea
              rows={4}
              value={aiQuestion}
              onChange={e => setAiQuestion(e.target.value)}
              placeholder={arabic ? 'مثال: كيف أوجد مشتقة الدالة المركبة باستخدام قاعدة السلسلة؟' : 'e.g. How do I solve for equivalent capacitance in combined circuits?'}
              className="ss-input text-xs h-auto py-2.5"
            />
          </div>

          {aiAnswer && (
            <div className="rounded-xl border border-[#19a99a]/30 bg-[#19a99a]/[0.06] p-3 text-xs whitespace-pre-line text-[#182b52] dark:text-white">
              {aiAnswer}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Modal: Course syllabus ───────────────────────────── */}
      <Modal
        open={activeModal === 'course' && !!selectedCourse}
        onClose={() => setActiveModal(null)}
        title={arabic ? (selectedCourse?.titleAr ?? '') : (selectedCourse?.titleEn ?? '')}
        size="md"
        arabic={arabic}
      >
        {selectedCourse && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl bg-[#f8fafc] p-3 dark:bg-white/[0.03]">
              <p className="font-bold text-[#182b52] dark:text-white">{selectedCourse.code} • {selectedCourse.credits} {arabic ? 'ساعات' : 'credits'}</p>
              <p className="mt-1 text-[#64748b] dark:text-[#94a3b8]">
                {arabic ? 'المعلم:' : 'Teacher:'} {arabic ? selectedCourse.teacherAr : selectedCourse.teacherEn}
              </p>
              <p className="text-[#64748b] dark:text-[#94a3b8]">
                {arabic ? 'القاعة:' : 'Room:'} {arabic ? selectedCourse.roomAr : selectedCourse.roomEn}
              </p>
            </div>
            <div>
              <p className="mb-2 font-bold text-[#182b52] dark:text-white">{arabic ? 'نتائج التقييمات' : 'Assessment results'}</p>
              <div className="space-y-2">
                {gradeTimeline.filter(item => item.subjectEn === selectedCourse.titleEn).map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-[#e2e8f0] p-2 dark:border-white/[0.06]">
                    <span className="truncate">{arabic ? item.assessmentAr : item.assessmentEn}</span>
                    <span className="font-bold text-[#19a99a]">{item.score}</span>
                  </div>
                ))}
                {gradeTimeline.filter(item => item.subjectEn === selectedCourse.titleEn).length === 0 && (
                  <p className="text-[#94a3b8]">{arabic ? 'لا توجد درجات مرصودة بعد لهذه المادة.' : 'No grades recorded for this subject yet.'}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Full curriculum ───────────────────────────── */}
      <Modal
        open={activeModal === 'curriculum'}
        onClose={() => setActiveModal(null)}
        title={arabic ? 'الخطة الدراسية الكاملة' : 'Full Curriculum'}
        size="md"
        arabic={arabic}
      >
        <div className="space-y-2 text-xs">
          {courses.map(course => (
            <div key={course.id} className="flex items-center justify-between rounded-xl border border-[#e2e8f0] p-3 dark:border-white/[0.06]">
              <div>
                <p className="font-bold text-[#182b52] dark:text-white">{arabic ? course.titleAr : course.titleEn}</p>
                <p className="text-[11px] text-[#94a3b8]">{course.code} • {arabic ? course.teacherAr : course.teacherEn}</p>
              </div>
              <span className="font-black text-[#19a99a]">{course.grade > 0 ? `${course.grade}%` : '—'}</span>
            </div>
          ))}
        </div>
      </Modal>

      {/* ── Modal: Weekly schedule ───────────────────────────── */}
      <Modal
        open={activeModal === 'schedule'}
        onClose={() => setActiveModal(null)}
        title={arabic ? 'جدول الحصص' : 'Class Schedule'}
        size="md"
        arabic={arabic}
      >
        <div className="space-y-2 text-xs">
          {todaySchedule.map(period => (
            <div key={period.periodNum} className="flex items-center justify-between rounded-xl border border-[#e2e8f0] p-3 dark:border-white/[0.06]">
              <div>
                <p className="font-bold text-[#182b52] dark:text-white">{arabic ? period.subjectAr : period.subjectEn}</p>
                <p className="text-[11px] text-[#94a3b8]">{arabic ? period.teacherAr : period.teacherEn} • {arabic ? period.roomAr : period.roomEn}</p>
              </div>
              <span className="font-semibold">{period.time}</span>
            </div>
          ))}
        </div>
      </Modal>

      {/* ── Modal: Study resource ───────────────────────────── */}
      <Modal
        open={activeModal === 'resource' && !!selectedResource}
        onClose={() => setActiveModal(null)}
        title={arabic ? (selectedResource?.titleAr ?? '') : (selectedResource?.titleEn ?? '')}
        size="md"
        arabic={arabic}
      >
        {selectedResource && (
          <div className="space-y-3 text-xs">
            <p className="font-bold text-[#182b52] dark:text-white">{arabic ? selectedResource.descAr : selectedResource.descEn}</p>
            <p className="leading-relaxed text-[#475569] dark:text-[#cbd5e1]">{arabic ? selectedResource.bodyAr : selectedResource.bodyEn}</p>
            <button
              onClick={() => {
                addNotification({
                  category: 'message',
                  titleAr: `طلب من الطالب: ${selectedResource.titleAr}`,
                  titleEn: `Student request: ${selectedResource.titleEn}`,
                  bodyAr: `طلب الطالب ${student?.nameAr ?? ''} الوصول إلى ${selectedResource.titleAr}.`,
                  bodyEn: `${student?.nameEn ?? 'A student'} requested access to ${selectedResource.titleEn}.`,
                  recipientRole: 'teacher',
                  studentId: student?.id,
                  link: 'notifications',
                })
                triggerToast(arabic ? 'تم إرسال طلبك إلى المعلم.' : 'Your request was sent to the teacher.')
              }}
              className="btn-teal w-full justify-center text-xs py-2"
            >
              {arabic ? 'طلب الوصول من المعلم' : 'Request access from teacher'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
