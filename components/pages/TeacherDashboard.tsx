'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Users,
  Award,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  FileText,
  Sparkles,
  ExternalLink,
  Send,
  Check,
  Search,
  BellRing,
  UserCheck,
  ArrowUpRight,
  X,
  Phone,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Badge } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { cn } from '@/lib/utils'
import { useSchool } from '@/lib/school/store'
import {
  className,
  classPerformance,
  currentTeacher,
  formatDate,
  gradeAverage,
  relativeTime,
  subjectName,
  teacherClassIds,
} from '@/lib/school/engine'

interface TeacherDashboardProps {
  arabic?: boolean
}

interface ClassScheduleItem {
  id: string
  period: string
  time: string
  subjectAr: string
  subjectEn: string
  classAr: string
  classEn: string
  room: string
  studentsCount: number
  status: 'completed' | 'current' | 'upcoming'
}

interface AssignmentItem {
  id: string
  titleAr: string
  titleEn: string
  classAr: string
  classEn: string
  dueDateAr: string
  dueDateEn: string
  submittedCount: number
  totalCount: number
  status: 'graded' | 'pending' | 'collecting'
}

interface StudentAlert {
  id: string
  studentId: string
  studentNameAr: string
  studentNameEn: string
  classAr: string
  classEn: string
  type: 'danger' | 'warning' | 'success'
  messageAr: string
  messageEn: string
  timeAr: string
  timeEn: string
  parentNameAr: string
  parentNameEn: string
  parentPhone: string
}

export function TeacherDashboard({ arabic = false }: TeacherDashboardProps) {
  const { data, user, saveAttendance, createExam, saveGrades, publishExam, createHomework, addNotification, updateTeacherClasses, refreshWorkspace } = useSchool()
  const teacher = currentTeacher(data, user)
  const myClassIds = useMemo(() => teacherClassIds(data, user), [data, user])
  const myClasses = useMemo(() => data.classes.filter(c => myClassIds.includes(c.id)), [data, myClassIds])
  const myStudents = useMemo(
    () => data.students.filter(s => myClassIds.includes(s.classId) && s.status === 'active'),
    [data, myClassIds],
  )
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [selectedAlertStudent, setSelectedAlertStudent] = useState<StudentAlert | null>(null)
  const [attendanceClass, setAttendanceClass] = useState<string>('')
  const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent' | 'late'>>({})
  const [gradeClass, setGradeClass] = useState<string>('')
  const [gradeSubject, setGradeSubject] = useState<string>('')
  const [gradeTitle, setGradeTitle] = useState('')
  const [gradeMarks, setGradeMarks] = useState<Record<string, string>>({})
  const [homeworkTitle, setHomeworkTitle] = useState('')
  const [homeworkDescription, setHomeworkDescription] = useState('')
  const [homeworkClass, setHomeworkClass] = useState('')
  const [homeworkSubject, setHomeworkSubject] = useState('')
  const [homeworkDueDate, setHomeworkDueDate] = useState('')
  const [homeworkMaxScore, setHomeworkMaxScore] = useState('20')
  const [gradeMaxMarks, setGradeMaxMarks] = useState('15')
  const [gradeType, setGradeType] = useState<'quiz' | 'monthly' | 'midterm'>('quiz')
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<string | null>(null)
  const [submissionScores, setSubmissionScores] = useState<Record<string, string>>({})
  const [submissionFeedback, setSubmissionFeedback] = useState<Record<string, string>>({})
  const [alertNote, setAlertNote] = useState('')
  const [messageClass, setMessageClass] = useState<string>('')
  const [messageTitle, setMessageTitle] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [selectedTeachingClasses, setSelectedTeachingClasses] = useState<string[]>(teacher?.classIds ?? [])
  const [savingTeachingClasses, setSavingTeachingClasses] = useState(false)

  useEffect(() => {
    if (!attendanceClass && myClassIds.length > 0) setAttendanceClass(myClassIds[0])
    if (!gradeClass && myClassIds.length > 0) setGradeClass(myClassIds[0])
    if (!gradeSubject && teacher?.subjectIds.length) setGradeSubject(teacher.subjectIds[0])
    if (!messageClass && myClassIds.length > 0) setMessageClass(myClassIds[0])
    if (!homeworkClass && myClassIds.length > 0) setHomeworkClass(myClassIds[0])
    if (!homeworkSubject && teacher?.subjectIds.length) setHomeworkSubject(teacher.subjectIds[0])
  }, [attendanceClass, gradeClass, gradeSubject, homeworkClass, homeworkSubject, messageClass, myClassIds, teacher?.subjectIds])

  useEffect(() => {
    if (activeModal !== 'attendance' || !attendanceClass) return
    const today = new Date().toLocaleDateString('en-CA')
    const todayRecords = data.attendance.filter(record => record.classId === attendanceClass && record.date === today)
    setAttendanceState(Object.fromEntries(todayRecords.map(record => [record.studentId, record.status === 'late' || record.status === 'absent' ? record.status : 'present'])))
  }, [activeModal, attendanceClass, data.attendance])

  useEffect(() => {
    setSelectedTeachingClasses(teacher?.classIds ?? [])
  }, [teacher?.id, teacher?.classIds])

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // ── Class performance, live from the workspace store ────────
  const classPerformanceData = useMemo(() => {
    return classPerformance(data)
      .filter(row => myClassIds.includes(row.cls.id))
      .map(row => {
        const roster = data.students.filter(s => s.classId === row.cls.id && s.status === 'active')
        const passing = roster.filter(s => gradeAverage(data, s.id) >= data.settings.passingPercentage).length
        return {
          nameAr: row.cls.nameAr,
          nameEn: row.cls.nameEn,
          avgGrade: row.average,
          passRate: roster.length ? Math.round((passing / roster.length) * 100) : 0,
          students: row.students,
        }
      })
  }, [data, myClassIds])

  // ── Today's schedule, derived from the teacher's assigned classes ──
  const schedule = useMemo<ClassScheduleItem[]>(() => {
    return myClasses.map((cls, index) => ({
      id: cls.id,
      period: arabic ? `الفصل ${index + 1}` : `Class ${index + 1}`,
      time: '',
      subjectAr: subjectName(data, teacher?.subjectIds[index % Math.max(1, teacher.subjectIds.length)], 'ar'),
      subjectEn: subjectName(data, teacher?.subjectIds[index % Math.max(1, teacher.subjectIds.length)], 'en'),
      classAr: cls.nameAr,
      classEn: cls.nameEn,
      room: cls.room,
      studentsCount: data.students.filter(s => s.classId === cls.id && s.status === 'active').length,
      status: 'upcoming',
    }))
  }, [arabic, data, myClasses, teacher])

  // ── Assignment tracker, derived from homework ────────────────
  const assignments = useMemo<AssignmentItem[]>(() => {
    return data.homework
      .filter(h => myClassIds.includes(h.classId))
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
      .slice(0, 5)
      .map(homework => {
        const roster = data.students.filter(s => s.classId === homework.classId && s.status === 'active')
        const submissions = data.submissions.filter(s => s.homeworkId === homework.id)
        const submitted = submissions.filter(s => s.status === 'submitted' || s.status === 'graded' || s.status === 'late').length
        return {
          id: homework.id,
          titleAr: homework.titleAr,
          titleEn: homework.titleEn,
          classAr: className(data, homework.classId, 'ar'),
          classEn: className(data, homework.classId, 'en'),
          dueDateAr: formatDate(homework.dueDate, 'ar'),
          dueDateEn: formatDate(homework.dueDate, 'en'),
          submittedCount: submitted,
          totalCount: roster.length,
          status: submissions.some(s => s.status === 'graded') ? 'graded' : submitted < roster.length ? 'collecting' : 'pending',
        }
      })
  }, [data, myClassIds])

  // ── Student alerts, derived from the explainable AI engine ───
  const studentAlerts = useMemo<StudentAlert[]>(() => {
    return data.aiAlerts
      .filter(alert => alert.status === 'open' || alert.status === 'reviewing')
      .filter(alert => {
        const student = data.students.find(s => s.id === alert.studentId)
        return !!student && myClassIds.includes(student.classId)
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 4)
      .map(alert => {
        const student = data.students.find(s => s.id === alert.studentId)!
        const parent = data.parents.find(p => p.studentIds.includes(student.id))
        return {
          id: alert.id,
          studentId: student.id,
          studentNameAr: student.nameAr,
          studentNameEn: student.nameEn,
          classAr: className(data, student.classId, 'ar'),
          classEn: className(data, student.classId, 'en'),
          type: alert.severity === 'high' ? 'danger' : alert.severity === 'medium' ? 'warning' : 'success',
          messageAr: alert.reasons.map(reason => reason.replace(/_/g, ' ')).join(' · '),
          messageEn: alert.reasons.map(reason => reason.replace(/_/g, ' ')).join(' · '),
          timeAr: relativeTime(alert.updatedAt, 'ar'),
          timeEn: relativeTime(alert.updatedAt, 'en'),
          parentNameAr: parent?.nameAr ?? '—',
          parentNameEn: parent?.nameEn ?? '—',
          parentPhone: parent?.phone ?? '—',
        }
      })
  }, [data, myClassIds])

  const attendanceRoster = useMemo(() => {
    return data.students
      .filter(s => s.classId === attendanceClass && s.status === 'active')
      .map(student => ({
        id: student.id,
        nameAr: student.nameAr,
        nameEn: student.nameEn,
        idNum: student.studentId,
      }))
  }, [attendanceClass, data])

  const gradeRoster = useMemo(() => {
    return data.students
      .filter(s => s.classId === gradeClass && s.status === 'active')
      .map(student => ({
        id: student.id,
        nameAr: student.nameAr,
        nameEn: student.nameEn,
        idNum: student.studentId,
      }))
  }, [data, gradeClass])

  const myAverage = useMemo(() => {
    const averages = myStudents.map(s => gradeAverage(data, s.id)).filter(value => value > 0)
    return averages.length ? Math.round((averages.reduce((sum, value) => sum + value, 0) / averages.length) * 10) / 10 : 0
  }, [data, myStudents])

  const saveQuickAttendance = async () => {
    if (!attendanceClass) return
    const result = await saveAttendance(
      attendanceClass,
      new Date().toLocaleDateString('en-CA'),
      'morning',
      attendanceRoster.map(student => ({
        studentId: student.id,
        status: attendanceState[student.id] ?? 'present',
      })),
    )
    if (!result.ok) {
      triggerToast(arabic ? 'تعذر حفظ الحضور. حاول مرة أخرى.' : 'Attendance could not be saved. Try again.')
      return
    }
    const absentStudents = attendanceRoster.filter(student => attendanceState[student.id] === 'absent')
    for (const student of absentStudents) {
      const notice = await addNotification({
        category: 'attendance', titleAr: 'تسجيل غياب الطالب', titleEn: 'Student marked absent',
        bodyAr: `تم تسجيل غياب ${student.nameAr} اليوم.`, bodyEn: `${student.nameEn} was marked absent today.`,
        recipientRole: 'parent', studentId: student.id, link: 'parent-portal', dedupeKey: `attendance-absence:${attendanceClass}:${student.id}:${new Date().toLocaleDateString('en-CA')}`,
      })
      if (!notice.ok) {
        setActiveModal(null)
        triggerToast(arabic ? 'تم حفظ الحضور، لكن تعذر إرسال بعض إشعارات الغياب.' : 'Attendance was saved, but some absence notices could not be sent.')
        return
      }
    }
    setActiveModal(null)
    triggerToast(
      arabic
        ? `تم حفظ حضور ${result.saved} طالباً وإرسال ${absentStudents.length} إشعار غياب لولي الأمر.`
        : `Saved attendance for ${result.saved} students and sent ${absentStudents.length} absence notices.`,
    )
  }

  const submitQuickGrades = async () => {
    if (!gradeClass || !gradeTitle.trim()) {
      triggerToast(arabic ? 'أدخل عنوان التقييم أولاً.' : 'Enter an assessment title first.')
      return
    }
    const entries = gradeRoster
      .map(student => ({ studentId: student.id, score: Number(gradeMarks[student.id]) }))
      .filter(entry => Number.isFinite(entry.score) && gradeMarks[entry.studentId] !== '' && gradeMarks[entry.studentId] !== undefined)
    if (entries.some(entry => entry.score < 0 || entry.score > Number(gradeMaxMarks))) {
      triggerToast(arabic ? `الدرجات يجب أن تكون بين 0 و${gradeMaxMarks}.` : `Scores must be between 0 and ${gradeMaxMarks}.`)
      return
    }
    if (entries.length === 0) {
      triggerToast(arabic ? 'أدخل درجة واحدة على الأقل.' : 'Enter at least one mark.')
      return
    }
    const cls = data.classes.find(c => c.id === gradeClass)
    const examResult = await createExam({
      nameAr: gradeTitle,
      nameEn: gradeTitle,
      gradeLevel: cls?.gradeLevel ?? 9,
      classId: gradeClass,
      subjectId: gradeSubject,
      date: new Date().toLocaleDateString('en-CA'),
      startTime: '09:00',
      durationMin: 45,
      type: gradeType,
      maxMarks: Number(gradeMaxMarks),
      passMarks: Math.round(Number(gradeMaxMarks) * data.settings.passingPercentage / 100),
    })
    if (!examResult.ok || !examResult.exam) {
      triggerToast(arabic ? 'تعذر إنشاء التقييم.' : 'Could not create the assessment.')
      return
    }
    const saved = await saveGrades(examResult.exam.id, entries)
    if (!saved.ok) {
      triggerToast(arabic ? 'تم إنشاء التقييم لكن تعذر حفظ الدرجات. افتح الاختبارات لإكمال الرصد.' : 'Assessment created, but grades could not be saved. Open Exams to finish grade entry.')
      return
    }
    const published = await publishExam(examResult.exam.id, true)
    if (!published.ok) {
      triggerToast(arabic ? 'تم حفظ الدرجات كمسودة؛ افتح الاختبارات وانشرها ليشاهدها الطالب.' : 'Grades are saved as a draft. Publish them from Exams to make them visible.')
      setActiveModal(null)
      return
    }
    setActiveModal(null)
    setGradeMarks({})
    setGradeTitle('')
    triggerToast(
      arabic ? `تم حفظ ونشر ${saved.saved} درجة. ستظهر في بوابة الطالب وولي الأمر.` : `${saved.saved} grades saved and published. Students and parents can now see them.`,
    )
  }

  const sendClassMessage = async () => {
    if (!messageTitle.trim() || !messageBody.trim()) {
      triggerToast(arabic ? 'أدخل عنوان الرسالة ونصها.' : 'Enter both a subject and a message.')
      return
    }
    const recipients = data.students.filter(s => s.classId === messageClass && s.status === 'active')
    try {
      for (const student of recipients) {
        const studentNotice = await addNotification({
        category: 'message',
        titleAr: messageTitle,
        titleEn: messageTitle,
        bodyAr: messageBody,
        bodyEn: messageBody,
        recipientRole: 'student',
        studentId: student.id,
        link: 'student-portal',
      })
        const parentNotice = await addNotification({
        category: 'message',
        titleAr: messageTitle,
        titleEn: messageTitle,
        bodyAr: messageBody,
        bodyEn: messageBody,
        recipientRole: 'parent',
        studentId: student.id,
        link: 'parent-portal',
      })
        if (!studentNotice.ok || !parentNotice.ok) throw new Error('notification_delivery_failed')
      }
    } catch {
      triggerToast(arabic ? 'تعذر إرسال بعض الإشعارات.' : 'Some notifications could not be sent.')
      return
    }
    setActiveModal(null)
    triggerToast(arabic ? `تم إرسال الرسالة إلى ${recipients.length} طالباً وأولياء أمورهم.` : `Message sent to ${recipients.length} students and their guardians.`)
  }

  const submitHomework = async () => {
    if (!homeworkTitle.trim() || !homeworkClass || !homeworkSubject || !homeworkDueDate || Number(homeworkMaxScore) <= 0) {
      triggerToast(arabic ? 'أكمل عنوان الواجب والفصل والمادة والموعد والدرجة النهائية.' : 'Complete the title, class, subject, due date, and maximum score.')
      return
    }
    const result = await createHomework({
      titleAr: homeworkTitle.trim(), titleEn: homeworkTitle.trim(),
      descriptionAr: homeworkDescription.trim(), descriptionEn: homeworkDescription.trim(),
      classId: homeworkClass, subjectId: homeworkSubject, teacherId: user?.id || '',
      dueDate: homeworkDueDate, maxScore: Number(homeworkMaxScore),
    })
    if (!result.ok) {
      triggerToast(arabic ? 'تعذر إنشاء الواجب.' : 'Could not create the assignment.')
      return
    }
    setActiveModal(null)
    setHomeworkTitle('')
    setHomeworkDescription('')
    triggerToast(arabic ? 'تم نشر الواجب للفصل المحدد.' : 'Assignment published to the selected class.')
  }

  const gradeSubmission = async (submissionId: string, maxScore: number) => {
    const score = Number(submissionScores[submissionId])
    if (!Number.isFinite(score) || score < 0 || score > maxScore) {
      triggerToast(arabic ? `أدخل درجة من 0 إلى ${maxScore}.` : `Enter a score from 0 to ${maxScore}.`)
      return
    }
    const response = await fetch('/api/workspace', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'grade_submission', payload: { submissionId, score, feedback: submissionFeedback[submissionId] || '' } }),
    })
    const result = await response.json()
    if (!response.ok || !result.ok) {
      triggerToast(arabic ? `تعذر حفظ التصحيح: ${result.error || response.status}` : `Could not save grade: ${result.error || response.status}`)
      return
    }
    await refreshWorkspace()
    triggerToast(arabic ? 'تم حفظ الدرجة والملاحظات.' : 'Grade and feedback saved.')
  }

  const saveAlertIntervention = async () => {
    if (!selectedAlertStudent || !alertNote.trim()) {
      triggerToast(arabic ? 'اكتب ملاحظة فعلية عن الإجراء المتخذ.' : 'Write a note describing the action taken.')
      return
    }
    const response = await fetch('/api/workspace', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'review_ai_alert', payload: { alertId: selectedAlertStudent.id, note: alertNote, status: 'reviewing' } }),
    })
    const result = await response.json()
    if (!response.ok || !result.ok) {
      triggerToast(arabic ? `تعذر حفظ المتابعة: ${result.error || response.status}` : `Could not save follow-up: ${result.error || response.status}`)
      return
    }
    const parentNotice = await addNotification({
      category: 'ai', titleAr: 'متابعة دعم الطالب', titleEn: 'Student support follow-up',
      bodyAr: `تمت مراجعة تنبيه ${selectedAlertStudent.studentNameAr}: ${alertNote.trim()}`,
      bodyEn: `Alert reviewed for ${selectedAlertStudent.studentNameEn}: ${alertNote.trim()}`,
      recipientRole: 'parent', studentId: selectedAlertStudent.studentId, link: 'parent-portal',
    })
    await refreshWorkspace()
    setSelectedAlertStudent(null)
    setAlertNote('')
    triggerToast(parentNotice.ok
      ? (arabic ? 'تم حفظ المتابعة وإرسال إشعار داخل النظام لولي الأمر.' : 'Follow-up saved and an in-app parent notice sent.')
      : (arabic ? 'تم حفظ المتابعة، لكن تعذر إرسال الإشعار لولي الأمر.' : 'Follow-up saved, but the parent notice could not be sent.'))
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
        title={arabic ? 'لوحة تحكم المعلم' : 'Teacher Dashboard'}
        subtitle={
          arabic
            ? `مرحباً ${teacher?.nameAr ?? ''} — إليك ملخص فصولك والجدول الدراسي والمهام اليومية.`
            : `Welcome, ${teacher?.nameEn ?? 'teacher'} — overview of your classes, schedule and student alerts.`
        }
        icon={BookOpen}
        breadcrumb={[
          arabic ? 'الرئيسية' : 'Home',
          arabic ? 'المعلمون' : 'Teachers',
          arabic ? 'لوحة التحكم' : 'Dashboard',
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveModal('attendance')}
              className="btn-teal text-xs sm:text-sm font-semibold flex items-center gap-1.5"
            >
              <UserCheck className="size-4" />
              <span>{arabic ? 'تسجيل الحضور السريع' : 'Quick Attendance'}</span>
            </button>
            <button
              onClick={() => setActiveModal('gradeEntry')}
              className="btn-primary text-xs sm:text-sm font-semibold flex items-center gap-1.5"
            >
              <ClipboardList className="size-4" />
              <span>{arabic ? 'رصد الدرجات' : 'Grade Entry'}</span>
            </button>
          </div>
        }
      />

      {teacher && <section className="card-base p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-[#182b52] dark:text-white">{arabic ? 'الفصول التي تدرّسها' : 'Classes you teach'}</h2>
            <p className="mt-1 text-xs text-[#64748b] dark:text-[#94a3b8]">{arabic ? 'يمكنك اختيار فصول أخرى داخل مرحلتك الدراسية المعتمدة.' : 'Choose other classes within your approved school stage.'}</p>
          </div>
          <button
            type="button"
            disabled={savingTeachingClasses || selectedTeachingClasses.length === 0}
            onClick={async () => {
              setSavingTeachingClasses(true)
              const result = await updateTeacherClasses(selectedTeachingClasses)
              setSavingTeachingClasses(false)
              triggerToast(result.ok
                ? (arabic ? 'تم تحديث الفصول المسندة إليك.' : 'Your teaching classes have been updated.')
                : (arabic ? 'تعذر تحديث الفصول المختارة.' : 'Could not update the selected classes.'))
            }}
            className="btn-primary text-xs font-bold disabled:opacity-50"
          >{savingTeachingClasses ? (arabic ? 'جاري الحفظ...' : 'Saving...') : (arabic ? 'حفظ الفصول' : 'Save classes')}</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.classes
            .filter(cls => (teacher.gradeLevels?.length ? teacher.gradeLevels : data.classes.filter(item => teacher.classIds.includes(item.id)).map(item => item.gradeLevel).filter((grade, index, all) => all.indexOf(grade) === index)).includes(cls.gradeLevel))
            .map(cls => <label key={cls.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e8f0] px-3 py-2 text-xs dark:border-white/[0.08]">
              <input
                type="checkbox"
                checked={selectedTeachingClasses.includes(cls.id)}
                onChange={event => setSelectedTeachingClasses(current => event.target.checked ? [...new Set([...current, cls.id])] : current.filter(id => id !== cls.id))}
                className="accent-[#19a99a]"
              />
              <span className="text-[#334155] dark:text-[#cbd5e1]">{arabic ? cls.nameAr : cls.nameEn}</span>
            </label>)}
          {data.classes.filter(cls => (teacher.gradeLevels ?? []).includes(cls.gradeLevel)).length === 0 && <p className="text-xs text-slate-500">{arabic ? 'لا توجد فصول متاحة لهذه المرحلة حالياً.' : 'No classes are currently available for this stage.'}</p>}
        </div>
      </section>}

      {/* ── Top Stat Row (3 Cards) ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          label={arabic ? 'فصولي الدراسية' : 'My Classes'}
          value={String(myClasses.length)}
          caption={arabic ? 'الفصول المسندة إليك' : 'Classes assigned to you'}
          change={arabic ? 'مباشر' : 'live'}
          trend="up"
          icon={BookOpen}
          iconBg="#182b52"
          iconColor="#ffffff"
          delay={1}
        />
        <StatCard
          label={arabic ? 'إجمالي طلابي' : 'My Students'}
          value={String(myStudents.length)}
          caption={arabic ? `عبر ${myClasses.length} فصلاً` : `Across ${myClasses.length} sections`}
          change={arabic ? 'نشط' : 'active'}
          trend="up"
          icon={Users}
          iconBg="rgba(25,169,154,0.15)"
          iconColor="#19a99a"
          delay={2}
        />
        <StatCard
          label={arabic ? 'متوسط درجات الفصول' : 'Average Grade'}
          value={`${myAverage}%`}
          caption={arabic ? 'متوسط درجات طلابك' : 'average across your students'}
          change={`${myStudents.length} ${arabic ? 'طالب' : 'students'}`}
          trend="up"
          icon={Award}
          iconBg="rgba(99,102,241,0.15)"
          iconColor="#6366f1"
          delay={3}
        />
      </div>

      {/* ── Quick Actions Bar ────────────────────────────────── */}
      <div className="card-base p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-[#19a99a]/15 text-[#19a99a] flex items-center justify-center font-bold">
              ⚡
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#182b52] dark:text-white">
                {arabic ? 'إجراءات سريعة للمعلم' : 'Teacher Quick Actions'}
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                {arabic ? 'وصول فوري للمهام التعليمية الأكثر تكراراً' : 'Instant access to your frequent classroom duties'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveModal('gradeEntry')}
              className="btn-secondary text-xs font-semibold py-2 justify-center"
            >
              <ClipboardList className="size-4 text-[#19a99a]" />
              <span>{arabic ? 'إدخال الدرجات' : 'Grade Entry'}</span>
            </button>
            <button
              onClick={() => setActiveModal('attendance')}
              className="btn-secondary text-xs font-semibold py-2 justify-center"
            >
              <UserCheck className="size-4 text-[#182b52] dark:text-white" />
              <span>{arabic ? 'تسجيل الحضور' : 'Take Attendance'}</span>
            </button>
            <button
              onClick={() => setActiveModal('newAssignment')}
              className="btn-secondary text-xs font-semibold py-2 justify-center"
            >
              <FileText className="size-4 text-[#6366f1]" />
              <span>{arabic ? 'إنشاء واجب' : 'Create Assignment'}</span>
            </button>
            <button
              onClick={() => setActiveModal('message')}
              className="btn-teal text-xs font-semibold py-2 justify-center"
            >
              <MessageSquare className="size-4" />
              <span>{arabic ? 'مراسلة الطلاب' : 'Message Students'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Middle Row: Today's Schedule & Class Performance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Assigned class groups */}
        <div className="lg:col-span-7 card-base p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#e2e8f0] dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#182b52]/10 dark:bg-white/[0.06] text-[#182b52] dark:text-white flex items-center justify-center">
                  <Clock className="size-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                    {arabic ? 'الفصول المسندة إليك' : 'Your Assigned Classes'}
                  </h3>
                  <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                    {arabic ? `${schedule.length} فصلًا مسندًا إليك` : `${schedule.length} assigned classes`}
                  </p>
                </div>
              </div>
              <Badge variant="teal" size="sm">
                {new Intl.DateTimeFormat(arabic ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date())}
              </Badge>
            </div>

            {/* Class list */}
            <div className="space-y-3">
              {schedule.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-[#e2e8f0] dark:border-white/[0.06] bg-white dark:bg-[#0f1f3d] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="size-10 rounded-xl bg-[#f1f5f9] dark:bg-white/[0.06] text-[#64748b] dark:text-[#94a3b8] flex items-center justify-center font-bold text-xs shrink-0">
                        <BookOpen className="size-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-[13px] font-bold text-[#182b52] dark:text-white truncate">
                            {arabic ? item.subjectAr : item.subjectEn}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                          <span className="font-semibold text-[#182b52] dark:text-white/90">
                            {arabic ? item.classAr : item.classEn}
                          </span>
                          <span>•</span>
                          <span>{item.room}</span>
                          <span>•</span>
                          <span>
                            {item.studentsCount} {arabic ? 'طالب' : 'students'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#e2e8f0]/60 dark:border-white/[0.05]">
                      <button onClick={() => { setAttendanceClass(item.id); setActiveModal('attendance') }} className="btn-teal text-[11px] font-semibold py-1 px-3 h-7 rounded-lg">
                        {arabic ? 'تسجيل الحضور' : 'Take attendance'}
                      </button>
                    </div>
                  </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-3 border-t border-[#f1f5f9] dark:border-white/[0.04] flex items-center justify-between text-xs text-[#64748b]">
            <span>{arabic ? 'اختر فصلًا لتسجيل حضوره.' : 'Choose a class to record attendance.'}</span>
          </div>
        </div>

        {/* Class Performance Chart (5 cols) */}
        <div className="lg:col-span-5 card-base p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#e2e8f0] dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#19a99a]/10 text-[#19a99a] flex items-center justify-center">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                    {arabic ? 'أداء الفصول الخمسة' : 'Class Performance'}
                  </h3>
                  <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                    {arabic ? 'متوسط الدرجات المئوية لكل فصل' : 'Average grade % by classroom'}
                  </p>
                </div>
              </div>
              <Badge variant="indigo" size="sm">
                84.2% {arabic ? 'المتوسط' : 'Avg'}
              </Badge>
            </div>

            {/* Recharts BarChart */}
            <div className="w-full pt-2">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={classPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                  <XAxis
                    dataKey={arabic ? 'nameAr' : 'nameEn'}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                  />
                  <YAxis
                    domain={[60, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0f1f3d',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                    formatter={(val: any) => [`${val}%`, arabic ? 'متوسط الدرجات' : 'Average Grade']}
                  />
                  <Bar dataKey="avgGrade" radius={[6, 6, 0, 0]}>
                    {classPerformanceData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.avgGrade >= 85 ? '#19a99a' : entry.avgGrade >= 80 ? '#6366f1' : '#f59e0b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Metrics Footer */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[#f1f5f9] dark:border-white/[0.04] text-center">
            <div className="p-2 rounded-xl bg-[#f8fafc] dark:bg-white/[0.02]">
              <span className="block text-[10px] text-[#94a3b8]">{arabic ? 'الأعلى أداءً' : 'Top Class'}</span>
              <span className="text-xs font-bold text-[#182b52] dark:text-white">{classPerformanceData[0] ? `${arabic ? classPerformanceData[0].nameAr : classPerformanceData[0].nameEn} (${classPerformanceData[0].avgGrade}%)` : '—'}</span>
            </div>
            <div className="p-2 rounded-xl bg-[#f8fafc] dark:bg-white/[0.02]">
              <span className="block text-[10px] text-[#94a3b8]">{arabic ? 'نسبة النجاح' : 'Pass Rate'}</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{classPerformanceData.length ? `${Math.round(classPerformanceData.reduce((sum, item) => sum + item.passRate, 0) / classPerformanceData.length)}%` : '—'}</span>
            </div>
            <div className="p-2 rounded-xl bg-[#f8fafc] dark:bg-white/[0.02]">
              <span className="block text-[10px] text-[#94a3b8]">{arabic ? 'يحتاج دعم' : 'Needs Focus'}</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{classPerformanceData.slice().sort((a, b) => a.avgGrade - b.avgGrade)[0] ? (arabic ? classPerformanceData.slice().sort((a, b) => a.avgGrade - b.avgGrade)[0].nameAr : classPerformanceData.slice().sort((a, b) => a.avgGrade - b.avgGrade)[0].nameEn) : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Assignment Tracker & Student Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Assignment Tracker (7 cols) */}
        <div className="lg:col-span-7 card-base p-5">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#e2e8f0] dark:border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-[#6366f1]/10 text-[#6366f1] flex items-center justify-center">
                <FileText className="size-4" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'متابعة الواجبات والمهام' : 'Assignment Tracker'}
                </h3>
                <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                  {arabic ? 'معدلات تسليم الواجبات الحديثة ونسب الإنجاز' : 'Recent assignment submissions & completion rates'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveModal('newAssignment')}
              className="btn-secondary text-xs font-semibold py-1.5 px-3 h-8 flex items-center gap-1.5"
            >
              <span>+</span>
              <span>{arabic ? 'واجب جديد' : 'New Task'}</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="ss-table">
              <thead>
                <tr>
                  <th>{arabic ? 'الواجب والمادة' : 'Assignment'}</th>
                  <th>{arabic ? 'الفصل' : 'Class'}</th>
                  <th>{arabic ? 'الموعد' : 'Due Date'}</th>
                  <th>{arabic ? 'نسبة التسليم' : 'Submissions'}</th>
                  <th>{arabic ? 'الحالة' : 'Status'}</th>
                  <th className="text-center">{arabic ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((asg) => {
                  const rate = asg.totalCount ? Math.round((asg.submittedCount / asg.totalCount) * 100) : 0
                  return (
                    <tr key={asg.id}>
                      <td className="font-semibold text-[#182b52] dark:text-white">
                        <div className="max-w-[200px] truncate" title={arabic ? asg.titleAr : asg.titleEn}>
                          {arabic ? asg.titleAr : asg.titleEn}
                        </div>
                      </td>
                      <td className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                        {arabic ? asg.classAr : asg.classEn}
                      </td>
                      <td className="text-xs whitespace-nowrap text-[#64748b] dark:text-[#94a3b8]">
                        {arabic ? asg.dueDateAr : asg.dueDateEn}
                      </td>
                      <td className="min-w-[140px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-[#182b52] dark:text-white">
                            <span>
                              {asg.submittedCount}/{asg.totalCount}
                            </span>
                            <span className="font-bold">{rate}%</span>
                          </div>
                          <div className="progress-track h-1.5">
                            <div
                              className={cn(
                                'progress-fill',
                                rate >= 90
                                  ? 'bg-[#19a99a]'
                                  : rate >= 70
                                  ? 'bg-[#6366f1]'
                                  : 'bg-[#f59e0b]'
                              )}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        {asg.status === 'graded' && (
                          <Badge variant="success" size="sm" dot>
                            {arabic ? 'تم التصحيح' : 'Graded'}
                          </Badge>
                        )}
                        {asg.status === 'pending' && (
                          <Badge variant="warning" size="sm" dot>
                            {arabic ? 'قيد المراجعة' : 'Pending'}
                          </Badge>
                        )}
                        {asg.status === 'collecting' && (
                          <Badge variant="info" size="sm" dot>
                            {arabic ? 'جار الاستلام' : 'Collecting'}
                          </Badge>
                        )}
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => setSelectedHomeworkId(asg.id)}
                          className="btn-icon size-7 rounded-lg mx-auto"
                          title={arabic ? 'مراجعة' : 'Review'}
                        >
                          <ExternalLink className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {assignments.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-xs text-slate-500">{arabic ? 'لا توجد واجبات لفصولك بعد. أنشئ واجباً جديداً ليظهر هنا.' : 'No assignments for your classes yet. Create one to start tracking submissions.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Student Alerts (5 cols) */}
        <div className="lg:col-span-5 card-base p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#e2e8f0] dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-[#ef4444]/10 text-[#ef4444] flex items-center justify-center">
                  <BellRing className="size-4" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                    {arabic ? 'تنبيهات الطلاب في فصولي' : 'Student Alerts'}
                  </h3>
                  <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                    {arabic ? `${studentAlerts.length} حالة مفتوحة تتطلب المتابعة` : `${studentAlerts.length} open alerts need follow-up`}
                  </p>
                </div>
              </div>
              <Badge variant="danger" size="sm">
                {arabic ? `${studentAlerts.length} تنبيه` : `${studentAlerts.length} alerts`}
              </Badge>
            </div>

            {/* Alert Cards */}
            <div className="space-y-3">
              {studentAlerts.map((alt) => (
                <div
                  key={alt.id}
                  className={cn(
                    'p-3.5 rounded-xl border transition-all text-xs',
                    alt.type === 'danger'
                      ? 'border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/[0.06]'
                      : alt.type === 'warning'
                      ? 'border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/[0.06]'
                      : 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/[0.06]'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#182b52] dark:text-white">
                        {arabic ? alt.studentNameAr : alt.studentNameEn}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/70 dark:bg-white/[0.08] font-semibold text-[#64748b] dark:text-[#94a3b8]">
                        {arabic ? alt.classAr : alt.classEn}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#94a3b8] shrink-0">
                      {arabic ? alt.timeAr : alt.timeEn}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#334155] dark:text-[#cbd5e1] leading-relaxed mb-2.5">
                    {arabic ? alt.messageAr : alt.messageEn}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                    <span className="text-[10px] text-[#64748b] dark:text-[#94a3b8]">
                      {arabic ? `ولي الأمر: ${alt.parentNameAr}` : `Parent: ${alt.parentNameEn}`}
                    </span>
                    <button
                      onClick={() => setSelectedAlertStudent(alt)}
                      className={cn(
                        'font-bold text-[11px] hover:underline flex items-center gap-1',
                        alt.type === 'danger'
                          ? 'text-red-600 dark:text-red-400'
                          : alt.type === 'warning'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      )}
                    >
                      <span>{arabic ? 'متابعة الحالة' : 'Take Action'}</span>
                      <ArrowUpRight className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 text-center">
            <button
              onClick={() => studentAlerts[0] ? setSelectedAlertStudent(studentAlerts[0]) : triggerToast(arabic ? 'لا توجد تنبيهات مفتوحة.' : 'There are no open alerts.')}
              className="text-xs text-[#19a99a] font-semibold hover:underline"
            >
              {arabic ? 'عرض التنبيهات المفتوحة' : 'Open alerts'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal: Quick Attendance ──────────────────────────── */}
      <Modal
        open={activeModal === 'attendance'}
        onClose={() => setActiveModal(null)}
        title={arabic ? `تسجيل الحضور: ${className(data, attendanceClass, 'ar')}` : `Quick Attendance: ${className(data, attendanceClass, 'en')}`}
        size="md"
        arabic={arabic}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              onClick={() => setActiveModal(null)}
              className="btn-secondary text-xs font-semibold px-4 py-2"
            >
              {arabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={saveQuickAttendance}
              className="btn-teal text-xs font-semibold px-4 py-2"
            >
              {arabic ? 'حفظ الحضور' : 'Save Attendance'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <select
            value={attendanceClass}
            onChange={e => setAttendanceClass(e.target.value)}
            className="ss-input text-xs"
            aria-label={arabic ? 'اختيار الفصل' : 'Select class'}
          >
            {myClasses.map(cls => (
              <option key={cls.id} value={cls.id}>{arabic ? cls.nameAr : cls.nameEn}</option>
            ))}
          </select>
          <p className="text-xs text-[#64748b]">
            {arabic
              ? 'حدد حالة كل طالب للحصة الحالية. انقر لتغيير الحالة بين حاضر، متأخر، أو غائب.'
              : 'Mark student status for the ongoing period. Tap status pill to toggle.'}
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {attendanceRoster.map((stu) => {
              const currentStatus = attendanceState[stu.id] || 'present'
              return (
                <div
                  key={stu.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[#e2e8f0] dark:border-white/[0.06] bg-[#f8fafc]/50 dark:bg-white/[0.02]"
                >
                  <div>
                    <p className="text-xs font-bold text-[#182b52] dark:text-white">
                      {arabic ? stu.nameAr : stu.nameEn}
                    </p>
                    <span className="text-[10px] text-[#94a3b8]">{stu.idNum}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setAttendanceState({ ...attendanceState, [stu.id]: 'present' })}
                      className={cn(
                        'text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all',
                        currentStatus === 'present'
                          ? 'bg-[#dcfce7] text-[#15803d] border-emerald-300 font-bold'
                          : 'bg-white dark:bg-white/[0.04] text-[#64748b] border-[#e2e8f0] dark:border-white/[0.08]'
                      )}
                    >
                      {arabic ? 'حاضر' : 'Present'}
                    </button>
                    <button
                      onClick={() => setAttendanceState({ ...attendanceState, [stu.id]: 'late' })}
                      className={cn(
                        'text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all',
                        currentStatus === 'late'
                          ? 'bg-[#fef3c7] text-[#b45309] border-amber-300 font-bold'
                          : 'bg-white dark:bg-white/[0.04] text-[#64748b] border-[#e2e8f0] dark:border-white/[0.08]'
                      )}
                    >
                      {arabic ? 'متأخر' : 'Late'}
                    </button>
                    <button
                      onClick={() => setAttendanceState({ ...attendanceState, [stu.id]: 'absent' })}
                      className={cn(
                        'text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all',
                        currentStatus === 'absent'
                          ? 'bg-[#fee2e2] text-[#b91c1c] border-red-300 font-bold'
                          : 'bg-white dark:bg-white/[0.04] text-[#64748b] border-[#e2e8f0] dark:border-white/[0.08]'
                      )}
                    >
                      {arabic ? 'غائب' : 'Absent'}
                    </button>
                  </div>
                </div>
              )
            })}
            {attendanceRoster.length === 0 && <p className="py-5 text-center text-xs text-slate-500">{arabic ? 'لا يوجد طلاب نشطون في هذا الفصل.' : 'There are no active students in this class.'}</p>}
          </div>
        </div>
      </Modal>

      {/* ── Modal: Grade Entry ───────────────────────────────── */}
      <Modal
        open={activeModal === 'gradeEntry'}
        onClose={() => setActiveModal(null)}
        title={arabic ? 'رصد درجات اختبار جديد' : 'Enter Grades for Assessment'}
        size="md"
        arabic={arabic}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button onClick={() => setActiveModal(null)} className="btn-secondary text-xs px-4 py-2">
              {arabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={submitQuickGrades}
              className="btn-primary text-xs px-4 py-2"
            >
              {arabic ? 'اعتماد الدرجات' : 'Submit Grades'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'الفصل الدراسي' : 'Class'}
              </label>
              <select
                value={gradeClass}
                onChange={e => setGradeClass(e.target.value)}
                className="ss-input text-xs"
              >
                {myClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>{arabic ? cls.nameAr : cls.nameEn}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'نوع التقييم' : 'Assessment Type'}
              </label>
              <select value={gradeType} onChange={event => { const type = event.target.value as 'quiz' | 'monthly' | 'midterm'; setGradeType(type); setGradeMaxMarks(type === 'quiz' ? '15' : type === 'midterm' ? '50' : '20') }} className="ss-input text-xs">
                <option value="quiz">{arabic ? 'اختبار قصير' : 'Quiz'}</option>
                <option value="monthly">{arabic ? 'تقييم شهري' : 'Monthly assessment'}</option>
                <option value="midterm">{arabic ? 'اختبار نصفي' : 'Midterm exam'}</option>
              </select>
            </div>
          </div>
          <label className="block text-xs font-bold text-[#182b52] dark:text-white">{arabic ? 'المادة' : 'Subject'}<select value={gradeSubject} onChange={event => setGradeSubject(event.target.value)} className="ss-input mt-1 text-xs">{(teacher?.subjectIds ?? []).map(id => <option key={id} value={id}>{subjectName(data, id, arabic ? 'ar' : 'en')}</option>)}</select></label>
          <div>
            <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">{arabic ? 'الدرجة النهائية' : 'Maximum score'}</label>
            <input type="number" min={1} value={gradeMaxMarks} onChange={event => setGradeMaxMarks(event.target.value)} className="ss-input text-xs" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
              {arabic ? 'عنوان الاختبار / الواجب' : 'Assessment Title'}
            </label>
            <input
              type="text"
              value={gradeTitle}
              onChange={e => setGradeTitle(e.target.value)}
              placeholder={arabic ? 'مثال: اختبار المصفوفات القصير' : 'e.g. Chapter 4 Quiz'}
              className="ss-input text-xs"
            />
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-[#e2e8f0] p-3 dark:border-white/[0.06]">
            {gradeRoster.map(student => (
              <div key={student.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#182b52] dark:text-white">{arabic ? student.nameAr : student.nameEn}</p>
                  <span className="text-[10px] text-[#94a3b8]">{student.idNum}</span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={Number(gradeMaxMarks)}
                  value={gradeMarks[student.id] ?? ''}
                  onChange={e => setGradeMarks(prev => ({ ...prev, [student.id]: e.target.value }))}
                  placeholder="—"
                  className="ss-input h-8 w-20 text-center text-xs"
                  aria-label={arabic ? 'درجة الطالب' : 'Student score'}
                />
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* ── Modal: Create Assignment ─────────────────────────── */}
      <Modal
        open={activeModal === 'newAssignment'}
        onClose={() => setActiveModal(null)}
        title={arabic ? 'إنشاء واجب للفصل' : 'Create class assignment'}
        size="md"
        arabic={arabic}
        footer={<div className="flex justify-end gap-2"><button onClick={() => setActiveModal(null)} className="btn-secondary text-xs px-4 py-2">{arabic ? 'إلغاء' : 'Cancel'}</button><button onClick={() => void submitHomework()} className="btn-primary text-xs px-4 py-2">{arabic ? 'نشر الواجب' : 'Publish assignment'}</button></div>}
      >
        <div className="space-y-3">
          <label className="block text-xs font-bold">{arabic ? 'عنوان الواجب' : 'Assignment title'}<input value={homeworkTitle} onChange={event => setHomeworkTitle(event.target.value)} className="ss-input mt-1 text-xs" /></label>
          <label className="block text-xs font-bold">{arabic ? 'الفصل' : 'Class'}<select value={homeworkClass} onChange={event => setHomeworkClass(event.target.value)} className="ss-input mt-1 text-xs">{myClasses.map(cls => <option key={cls.id} value={cls.id}>{arabic ? cls.nameAr : cls.nameEn}</option>)}</select></label>
          <label className="block text-xs font-bold">{arabic ? 'المادة' : 'Subject'}<select value={homeworkSubject} onChange={event => setHomeworkSubject(event.target.value)} className="ss-input mt-1 text-xs">{(teacher?.subjectIds ?? []).map(id => <option key={id} value={id}>{subjectName(data, id, arabic ? 'ar' : 'en')}</option>)}</select></label>
          <label className="block text-xs font-bold">{arabic ? 'التعليمات' : 'Instructions'}<textarea rows={3} value={homeworkDescription} onChange={event => setHomeworkDescription(event.target.value)} className="ss-input mt-1 h-auto text-xs" /></label>
          <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold">{arabic ? 'موعد التسليم' : 'Due date'}<input type="date" min={new Date().toLocaleDateString('en-CA')} value={homeworkDueDate} onChange={event => setHomeworkDueDate(event.target.value)} className="ss-input mt-1 text-xs" /></label><label className="block text-xs font-bold">{arabic ? 'الدرجة النهائية' : 'Maximum score'}<input type="number" min={1} value={homeworkMaxScore} onChange={event => setHomeworkMaxScore(event.target.value)} className="ss-input mt-1 text-xs" /></label></div>
        </div>
      </Modal>

      {/* ── Modal: Message Students ──────────────────────────── */}
      <Modal
        open={activeModal === 'message'}
        onClose={() => setActiveModal(null)}
        title={arabic ? 'إرسال رسالة أو إشعار للطلاب' : 'Broadcast Message to Class'}
        size="md"
        arabic={arabic}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button onClick={() => setActiveModal(null)} className="btn-secondary text-xs px-4 py-2">
              {arabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={sendClassMessage}
              className="btn-teal text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <Send className="size-3.5" />
              <span>{arabic ? 'إرسال فوري' : 'Send Broadcast'}</span>
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
              {arabic ? 'إلى الفصل' : 'Recipient Class'}
            </label>
            <select
              value={messageClass}
              onChange={e => setMessageClass(e.target.value)}
              className="ss-input text-xs"
            >
              {myClasses.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {arabic ? `${cls.nameAr} (${data.students.filter(s => s.classId === cls.id && s.status === 'active').length} طالب)` : `${cls.nameEn} (${data.students.filter(s => s.classId === cls.id && s.status === 'active').length} students)`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
              {arabic ? 'عنوان الرسالة' : 'Subject'}
            </label>
            <input
              type="text"
              value={messageTitle}
              onChange={e => setMessageTitle(e.target.value)}
              placeholder={arabic ? 'تذكير بموعد تسليم الواجب...' : 'Homework reminder...'}
              className="ss-input text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
              {arabic ? 'نص الرسالة' : 'Message Body'}
            </label>
            <textarea
              rows={4}
              value={messageBody}
              onChange={e => setMessageBody(e.target.value)}
              placeholder={arabic ? 'اكتب رسالتك للطلاب هنا...' : 'Type your announcement here...'}
              className="ss-input text-xs h-auto py-2.5"
            />
          </div>
        </div>
      </Modal>

      {/* ── Modal: Review Student Submissions ───────────────── */}
      {selectedHomeworkId && (() => {
        const homework = data.homework.find(item => item.id === selectedHomeworkId)
        if (!homework) return null
        const submissions = data.submissions.filter(item => item.homeworkId === homework.id && item.status !== 'pending' && item.status !== 'missing')
        return <Modal open onClose={() => setSelectedHomeworkId(null)} title={arabic ? `مراجعة: ${homework.titleAr}` : `Review: ${homework.titleEn}`} size="md" arabic={arabic}>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto">
            {!submissions.length && <p className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500">{arabic ? 'لا توجد تسليمات لمراجعتها حتى الآن.' : 'There are no submissions to review yet.'}</p>}
            {submissions.map(submission => {
              const student = data.students.find(item => item.id === submission.studentId)
              return <div key={submission.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold">{arabic ? student?.nameAr : student?.nameEn}</span>{submission.fileUrl && <a href={submission.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-teal-600 underline">{submission.fileName || (arabic ? 'فتح الملف' : 'Open submission')}</a>}</div>
                {submission.status === 'graded' ? <p className="mt-2 text-xs text-slate-500">{arabic ? `الدرجة: ${submission.score}/${homework.maxScore}` : `Score: ${submission.score}/${homework.maxScore}`} {submission.feedback ? `· ${submission.feedback}` : ''}</p> : <div className="mt-2 grid grid-cols-[90px_1fr_auto] gap-2"><input type="number" min={0} max={homework.maxScore} value={submissionScores[submission.id] ?? ''} onChange={event => setSubmissionScores(prev => ({ ...prev, [submission.id]: event.target.value }))} placeholder={`0-${homework.maxScore}`} className="ss-input h-8 text-xs" aria-label={arabic ? 'الدرجة' : 'Score'} /><input value={submissionFeedback[submission.id] ?? ''} onChange={event => setSubmissionFeedback(prev => ({ ...prev, [submission.id]: event.target.value }))} placeholder={arabic ? 'ملاحظة للطالب' : 'Feedback'} className="ss-input h-8 text-xs" /><button onClick={() => void gradeSubmission(submission.id, homework.maxScore)} className="btn-teal h-8 px-2 text-[11px]">{arabic ? 'حفظ' : 'Save'}</button></div>}
              </div>
            })}
          </div>
        </Modal>
      })()}

      {/* ── Modal: Alert Detail Action ───────────────────────── */}
      {selectedAlertStudent && (
        <Modal
          open={!!selectedAlertStudent}
          onClose={() => setSelectedAlertStudent(null)}
          title={arabic ? 'متابعة حالة الطالب والتواصل' : 'Student Alert & Parent Contact'}
          size="md"
          arabic={arabic}
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <button
                onClick={() => setSelectedAlertStudent(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                {arabic ? 'إغلاق' : 'Close'}
              </button>
              <button
                onClick={() => void saveAlertIntervention()}
                className="btn-teal text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <Phone className="size-3.5" />
                <span>{arabic ? 'حفظ المتابعة وإشعار ولي الأمر' : 'Save follow-up & notify parent'}</span>
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03] border border-[#e2e8f0] dark:border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#182b52] dark:text-white">
                  {arabic ? selectedAlertStudent.studentNameAr : selectedAlertStudent.studentNameEn}
                </span>
                <span className="badge-neutral text-[10px] px-2 py-0.5 rounded-full font-semibold">
                  {arabic ? selectedAlertStudent.classAr : selectedAlertStudent.classEn}
                </span>
              </div>
              <p className="text-xs text-[#334155] dark:text-[#cbd5e1] leading-relaxed">
                {arabic ? selectedAlertStudent.messageAr : selectedAlertStudent.messageEn}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#e2e8f0] dark:border-white/[0.06]">
                <span className="text-[#64748b]">{arabic ? 'ولي الأمر المسؤول:' : 'Parent/Guardian:'}</span>
                <span className="font-semibold text-[#182b52] dark:text-white">
                  {arabic ? selectedAlertStudent.parentNameAr : selectedAlertStudent.parentNameEn}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#e2e8f0] dark:border-white/[0.06]">
                <span className="text-[#64748b]">{arabic ? 'رقم الهاتف المسجل:' : 'Phone Number:'}</span>
                <span className="font-semibold text-[#182b52] dark:text-white dir-ltr">
                  {selectedAlertStudent.parentPhone}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'ملاحظة المعلم للإجراء المتخذ:' : 'Teacher Intervention Note:'}
              </label>
              <textarea
                rows={3}
                placeholder={arabic ? 'أضف ملاحظة توثيقية لهذا التنبيه...' : 'Document your intervention note...'}
                className="ss-input text-xs h-auto py-2"
                value={alertNote}
                onChange={event => setAlertNote(event.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
