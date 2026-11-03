import { getAuthContext, hashPassword, passwordProblem } from '@/lib/server/auth'
import { mutateWorkspace, readWorkspace, createAuthUser, updateAuthEmail, updateAuthPassword, updateAuthStatus } from '@/lib/server/db'
import { addAudit, isValidEmail, newId, nextStudentNumber, nowIso } from '@/lib/server/domain'
import { fail, ok, readJson } from '@/lib/server/http'
import { isAdmin, scopeWorkspace } from '@/lib/server/scope'
import { buildAlerts } from '@/lib/school/engine'
import type {
  AttendanceRecord,
  ClassRoom,
  Course,
  Exam,
  Grade,
  Homework,
  Lesson,
  Notification,
  Role,
  SchoolData,
  Student,
  Subject,
  Submission,
  Teacher,
  User,
} from '@/lib/school/types'

export const dynamic = 'force-dynamic'

interface WorkspaceAction {
  action: string
  payload: any
}

export async function GET() {
  const stored = readWorkspace()
  if (!stored) return fail(409, 'setup_required')

  const auth = await getAuthContext()
  if (!auth) return fail(401, 'unauthorized')

  const user = stored.data.users.find(u => u.id === auth.auth.id)
  if (!user || user.status !== 'active') return fail(403, 'inactive_user')

  return ok({
    ok: true,
    workspace: scopeWorkspace(stored.data, { userId: user.id, role: auth.role }),
    rev: stored.rev,
  })
}

export async function POST(request: Request) {
  const stored = readWorkspace()
  if (!stored) return fail(409, 'setup_required')

  const auth = await getAuthContext()
  if (!auth) return fail(401, 'unauthorized')

  const user = stored.data.users.find(u => u.id === auth.auth.id)
  if (!user || user.status !== 'active') return fail(403, 'inactive_user')

  const body = await readJson<WorkspaceAction>(request)
  if (!body || !body.action) return fail(400, 'missing_action')

  const actor = { userId: user.id, nameAr: user.nameAr, nameEn: user.nameEn }
  const teacherProfile = auth.role === 'teacher'
    ? stored.data.teachers.find(entry => entry.userId === user.id || entry.id === user.teacherId)
    : undefined
  const teacherClassIds = new Set([
    ...(teacherProfile?.classIds ?? []),
    ...stored.data.teacherAssignments.filter(entry => entry.teacherId === teacherProfile?.id).map(entry => entry.classId),
  ])
  const requireTeacherClass = (classId?: string) => {
    if (auth.role === 'teacher' && (!classId || !teacherClassIds.has(classId))) throw new Error('forbidden')
  }
  const requireTeacherSubject = (subjectId?: string) => {
    if (auth.role === 'teacher' && (!subjectId || !teacherProfile?.subjectIds.includes(subjectId))) throw new Error('forbidden')
  }

  try {
    const { workspace, result } = mutateWorkspace(current => {
      let next: SchoolData = { ...current }
      let actionResult: any = { success: true }

      switch (body.action) {
        /* ── Students ────────────────────────────────────────────────────────── */
        case 'add_student': {
          if (!isAdmin(auth.role) && auth.role !== 'staff') {
            throw new Error('forbidden')
          }
          const p = body.payload
          const studentId = newId('stu')
          const year = new Date().getFullYear()
          const code = `SG-${year}-${String((current.students.length || 0) + 1).padStart(4, '0')}`
          const newStudent: Student = {
            id: studentId,
            studentId: code,
            nameAr: p.nameAr?.trim() || '',
            nameEn: p.nameEn?.trim() || '',
            email: p.email?.trim() || `${code.toLowerCase()}@stgeorgeschool.edu`,
            phone: p.phone?.trim() || '',
            gender: p.gender === 'female' ? 'female' : 'male',
            dob: p.dob || '2015-01-01',
            gradeLevel: Number(p.gradeLevel) || 1,
            classId: p.classId || '',
            academicYearId: current.settings.academicYearId || (current.academicYears[0]?.id ?? ''),
            status: 'active',
            enrolledAt: nowIso(),
            parentIds: [],
            address: p.address?.trim() || '',
            notes: p.notes?.trim() || '',
            avatarColor: 'from-[#0f1f3d] to-[#c5a059]',
          }

          // Optional parent creation
          if (p.parentNameAr || p.parentNameEn || p.parentPhone) {
            const parentId = newId('par')
            const parentUserId = newId('usr')
            const parentEmail = p.parentEmail?.trim().toLowerCase() || `parent.${code.toLowerCase()}@stgeorgeschool.edu`

            const parentUser: User = {
              id: parentUserId,
              nameAr: p.parentNameAr?.trim() || p.parentNameEn?.trim() || 'ولي أمر',
              nameEn: p.parentNameEn?.trim() || p.parentNameAr?.trim() || 'Parent',
              email: parentEmail,
              phone: p.parentPhone?.trim() || '',
              role: 'parent',
              status: 'active',
              avatarColor: 'from-[#19a99a] to-[#0f1f3d]',
              childIds: [studentId],
              createdAt: nowIso(),
            }

            next.users = [...next.users, parentUser]
            next.parents = [
              ...next.parents,
              {
                id: parentId,
                userId: parentUserId,
                nameAr: parentUser.nameAr,
                nameEn: parentUser.nameEn,
                email: parentEmail,
                phone: p.parentPhone?.trim() || '',
                relationship: 'guardian',
                studentIds: [studentId],
              },
            ]
            newStudent.parentIds = [parentId]

            try {
              createAuthUser({
                id: parentUserId,
                email: parentEmail,
                passwordHash: hashPassword(p.parentPassword || 'StGeorge@Parent2026'),
                role: 'parent',
              })
            } catch {
              // ignore duplicate auth user
            }
          }

          next.students = [newStudent, ...next.students]
          next = addAudit(next, actor, 'create_student', 'student', studentId, `${newStudent.nameEn} (${newStudent.studentId})`)
          actionResult = { student: newStudent }
          break
        }

        case 'update_student': {
          if (!isAdmin(auth.role) && auth.role !== 'teacher') throw new Error('forbidden')
          const { id, patch } = body.payload
          next.students = next.students.map(s => s.id === id ? { ...s, ...patch } : s)
          next = addAudit(next, actor, 'update_student', 'student', id, `Updated student profile`)
          break
        }

        /* ── Classes & Subjects ──────────────────────────────────────────────── */
        case 'add_class': {
          if (!isAdmin(auth.role)) throw new Error('forbidden')
          const p = body.payload
          const classId = newId('cls')
          const newClass: ClassRoom = {
            id: classId,
            nameAr: p.nameAr?.trim() || `فصل ${p.gradeLevel} - ${p.section}`,
            nameEn: p.nameEn?.trim() || `Grade ${p.gradeLevel} - Section ${p.section}`,
            gradeLevel: Number(p.gradeLevel) || 1,
            section: p.section?.trim() || 'A',
            academicYearId: current.settings.academicYearId || (current.academicYears[0]?.id ?? ''),
            homeroomTeacherId: p.homeroomTeacherId || undefined,
            capacity: Number(p.capacity) || 25,
            room: p.room?.trim() || '101',
          }
          next.classes = [...next.classes, newClass]
          next = addAudit(next, actor, 'create_class', 'class', classId, newClass.nameEn)
          actionResult = { class: newClass }
          break
        }

        case 'add_subject': {
          if (!isAdmin(auth.role)) throw new Error('forbidden')
          const p = body.payload
          const subjectId = newId('sbj')
          const newSubject: Subject = {
            id: subjectId,
            code: p.code?.trim().toUpperCase() || 'SUB',
            nameAr: p.nameAr?.trim() || '',
            nameEn: p.nameEn?.trim() || '',
            color: p.color || '#c5a059',
          }
          next.subjects = [...next.subjects, newSubject]
          next = addAudit(next, actor, 'create_subject', 'subject', subjectId, newSubject.nameEn)
          actionResult = { subject: newSubject }
          break
        }

        /* ── Attendance ──────────────────────────────────────────────────────── */
        case 'save_attendance': {
          if (!isAdmin(auth.role) && auth.role !== 'teacher') throw new Error('forbidden')
          const { classId, date, session, records } = body.payload
          requireTeacherClass(classId)
          if (auth.role === 'teacher' && (records || []).some((record: any) => !current.students.some(student => student.id === record.studentId && student.classId === classId))) {
            throw new Error('forbidden')
          }
          // remove existing for this class/date/session
          next.attendance = next.attendance.filter(r => !(r.classId === classId && r.date === date && r.session === (session || 'morning')))
          const additions: AttendanceRecord[] = (records || []).map((r: any) => ({
            id: newId('att'),
            studentId: r.studentId,
            classId,
            date,
            session: session || 'morning',
            status: r.status,
            recordedBy: actor.userId,
            recordedAt: nowIso(),
            note: r.note?.trim() || undefined,
          }))
          next.attendance = [...next.attendance, ...additions]
          next = addAudit(next, actor, 'record_attendance', 'attendance', classId, `Recorded ${additions.length} records for ${date}`)
          actionResult = { saved: additions.length }
          break
        }

        /* ── Exams & Grades ──────────────────────────────────────────────────── */
        case 'create_exam': {
          if (!isAdmin(auth.role) && auth.role !== 'teacher') throw new Error('forbidden')
          const p = body.payload
          requireTeacherClass(p.classId)
          requireTeacherSubject(p.subjectId)
          const maxMarks = Number(p.maxMarks)
          const passMarks = Number(p.passMarks)
          if (!Number.isFinite(maxMarks) || maxMarks <= 0 || maxMarks > 1000 || !Number.isFinite(passMarks) || passMarks < 0 || passMarks > maxMarks) throw new Error('invalid_exam_marks')
          const examId = newId('exm')
          const newExam: Exam = {
            id: examId,
            nameAr: p.nameAr?.trim() || '',
            nameEn: p.nameEn?.trim() || '',
            type: p.type || 'monthly',
            academicYearId: current.settings.academicYearId || (current.academicYears[0]?.id ?? ''),
            gradeLevel: Number(p.gradeLevel) || 1,
            classId: p.classId || undefined,
            subjectId: p.subjectId,
            date: p.date,
            startTime: p.startTime || '09:00',
            durationMin: Number(p.durationMin) || 60,
            maxMarks,
            passMarks,
            status: p.status === 'published' ? 'published' : 'draft',
            createdBy: actor.userId,
            instructionsAr: p.instructionsAr?.trim(),
            instructionsEn: p.instructionsEn?.trim(),
          }
          next.exams = [newExam, ...next.exams]
          next = addAudit(next, actor, 'create_exam', 'exam', examId, newExam.nameEn)
          actionResult = { exam: newExam }
          break
        }

        case 'save_grades': {
          if (!isAdmin(auth.role) && auth.role !== 'teacher') throw new Error('forbidden')
          const { examId, entries } = body.payload
          const targetExam = current.exams.find(exam => exam.id === examId)
          if (!targetExam) throw new Error('exam_not_found')
          requireTeacherClass(targetExam.classId)
          requireTeacherSubject(targetExam.subjectId)
          if (auth.role === 'teacher' && (entries || []).some((entry: any) => !current.students.some(student => student.id === entry.studentId && student.classId === targetExam.classId))) {
            throw new Error('forbidden')
          }
          if ((entries || []).some((entry: any) => !Number.isFinite(Number(entry.score)) || Number(entry.score) < 0 || Number(entry.score) > targetExam.maxMarks)) throw new Error('invalid_grade')
          const studentIds = new Set((entries || []).map((e: any) => e.studentId))
          next.grades = next.grades.filter(g => !(g.examId === examId && studentIds.has(g.studentId)))
          const additions: Grade[] = (entries || []).map((e: any) => ({
            id: newId('grd'),
            examId,
            studentId: e.studentId,
            score: Number(e.score) || 0,
            enteredBy: actor.userId,
            enteredAt: nowIso(),
            comment: e.comment?.trim(),
          }))
          next.grades = [...next.grades, ...additions]
          if (targetExam.status === 'published') {
            next.exams = next.exams.map(exam => exam.id === examId ? { ...exam, status: 'draft' } : exam)
          }
          next = addAudit(next, actor, 'enter_grades', 'exam', examId, `Saved ${additions.length} grades`)
          actionResult = { saved: additions.length }
          break
        }

        case 'publish_exam': {
          if (!isAdmin(auth.role) && auth.role !== 'teacher') throw new Error('forbidden')
          const { examId, published } = body.payload
          const exam = current.exams.find(entry => entry.id === examId)
          if (!exam) throw new Error('exam_not_found')
          requireTeacherClass(exam.classId)
          requireTeacherSubject(exam.subjectId)
          if (auth.role === 'teacher' && exam.createdBy !== user.id) throw new Error('forbidden')
          const status = published ? 'published' : 'draft'
          next.exams = current.exams.map(entry => entry.id === examId ? { ...entry, status } : entry)
          if (published && exam.status !== 'published') {
            const students = current.students.filter(student => student.status === 'active' && (!exam.classId || student.classId === exam.classId))
            const notices: Notification[] = students.flatMap(student => ([
              {
                id: newId('ntf'), recipientRole: 'student' as const, studentId: student.id, category: 'exam' as const,
                titleAr: 'نتيجة اختبار جديدة', titleEn: 'New exam results',
                bodyAr: `تم نشر نتيجة ${exam.nameAr}.`, bodyEn: `Results for ${exam.nameEn} are now available.`,
                createdAt: nowIso(), read: false, link: 'student-portal', delivery: 'in_app' as const, deliveryStatus: 'delivered' as const,
                dedupeKey: `exam-published:${exam.id}:${student.id}:student:${nowIso()}`,
              },
              {
                id: newId('ntf'), recipientRole: 'parent' as const, studentId: student.id, category: 'exam' as const,
                titleAr: 'نتيجة جديدة للطالب', titleEn: 'New student results',
                bodyAr: `تم نشر نتيجة ${exam.nameAr}.`, bodyEn: `Results for ${exam.nameEn} are now available.`,
                createdAt: nowIso(), read: false, link: 'parent-portal', delivery: 'in_app' as const, deliveryStatus: 'delivered' as const,
                dedupeKey: `exam-published:${exam.id}:${student.id}:parent:${nowIso()}`,
              },
            ]))
            next.notifications = [...notices.filter(notice => !current.notifications.some(existing => existing.dedupeKey === notice.dedupeKey)), ...(next.notifications || [])]
          }
          next = addAudit(next, actor, 'publish_exam', 'exam', examId, `Set result visibility to ${status}`)
          actionResult = { examId, status }
          break
        }

        /* ── Courses & Digital Learning ──────────────────────────────────────── */
        case 'add_course': {
          if (!isAdmin(auth.role) && auth.role !== 'teacher') throw new Error('forbidden')
          const p = body.payload
          const courseClassIds = Array.isArray(p.classIds) ? p.classIds : (p.classId ? [p.classId] : [])
          requireTeacherSubject(p.subjectId)
          if (auth.role === 'teacher' && (!courseClassIds.length || courseClassIds.some((classId: string) => !teacherClassIds.has(classId)))) throw new Error('forbidden')
          const courseId = newId('crs')
          const newCourse: Course = {
            id: courseId,
            code: p.code?.trim().toUpperCase() || 'CRS-01',
            titleAr: p.titleAr?.trim() || '',
            titleEn: p.titleEn?.trim() || '',
            descriptionAr: p.descriptionAr?.trim() || '',
            descriptionEn: p.descriptionEn?.trim() || '',
            gradeLevel: Number(p.gradeLevel) || 1,
            classIds: courseClassIds,
            subjectId: p.subjectId || '',
            teacherId: auth.role === 'teacher' ? actor.userId : (p.teacherId || actor.userId),
            coverImage: p.coverImage,
            published: p.published !== false,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          }
          next.courses = [newCourse, ...(next.courses || [])]
          next = addAudit(next, actor, 'create_course', 'course', courseId, newCourse.titleEn)
          actionResult = { course: newCourse }
          break
        }

        case 'add_lesson': {
          if (!isAdmin(auth.role) && auth.role !== 'teacher') throw new Error('forbidden')
          const p = body.payload
          if (auth.role === 'teacher') {
            const course = current.courses.find(item => item.id === p.courseId && item.teacherId === user.id)
            if (!course || !course.classIds.length || course.classIds.some(classId => !teacherClassIds.has(classId))) throw new Error('forbidden')
          }
          const lessonId = newId('lsn')
          const newLesson: Lesson = {
            id: lessonId,
            courseId: p.courseId,
            titleAr: p.titleAr?.trim() || '',
            titleEn: p.titleEn?.trim() || '',
            contentAr: p.contentAr?.trim() || '',
            contentEn: p.contentEn?.trim() || '',
            order: (next.lessons || []).filter(l => l.courseId === p.courseId).length + 1,
            durationMin: Number(p.durationMin) || 45,
            videoUrl: p.videoUrl?.trim(),
            attachments: Array.isArray(p.attachments) ? p.attachments : [],
            published: p.published !== false,
            createdAt: nowIso(),
          }
          next.lessons = [...(next.lessons || []), newLesson]
          next = addAudit(next, actor, 'create_lesson', 'lesson', lessonId, newLesson.titleEn)
          actionResult = { lesson: newLesson }
          break
        }

        /* ── Assignments & Submissions ───────────────────────────────────────── */
        case 'create_homework': {
          if (!isAdmin(auth.role) && auth.role !== 'teacher') throw new Error('forbidden')
          const p = body.payload
          requireTeacherClass(p.classId)
          requireTeacherSubject(p.subjectId)
          const dueDate = typeof p.dueDate === 'string' ? p.dueDate : ''
          const maxScore = Number(p.maxScore)
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 1000) throw new Error('invalid_homework_details')
          const homeworkId = newId('hwk')
          const newHw: Homework = {
            id: homeworkId,
            titleAr: p.titleAr?.trim() || '',
            titleEn: p.titleEn?.trim() || '',
            descriptionAr: p.descriptionAr?.trim() || '',
            descriptionEn: p.descriptionEn?.trim() || '',
            classId: p.classId,
            subjectId: p.subjectId,
            teacherId: actor.userId,
            dueDate,
            createdAt: nowIso(),
            maxScore,
            status: 'active',
            attachmentUrl: p.attachmentUrl,
          }
          next.homework = [newHw, ...(next.homework || [])]
          next = addAudit(next, actor, 'create_assignment', 'homework', homeworkId, newHw.titleEn)
          actionResult = { homework: newHw }
          break
        }

        case 'submit_homework': {
          if (auth.role !== 'student') throw new Error('forbidden')
          const { homeworkId, fileName, fileUrl } = body.payload
          const student = current.students.find(entry => entry.id === user.studentId || entry.email.toLowerCase() === user.email.toLowerCase())
          const homeworkItem = current.homework.find(entry => entry.id === homeworkId && entry.status === 'active')
          if (!student || !homeworkItem || homeworkItem.classId !== student.classId) throw new Error('forbidden')
          const studentId = student.id
          const existing = (next.submissions || []).find(s => s.homeworkId === homeworkId && s.studentId === studentId)
          if (existing) {
            next.submissions = next.submissions.map(s => s.id === existing.id ? {
              ...s,
              status: 'submitted',
              submittedAt: nowIso(),
              fileName: fileName || s.fileName,
              fileUrl: fileUrl || s.fileUrl,
            } : s)
          } else {
            const submissionId = newId('sub')
            const newSub: Submission = {
              id: submissionId,
              homeworkId,
              studentId,
              status: 'submitted',
              submittedAt: nowIso(),
              fileName,
              fileUrl,
            }
            next.submissions = [...(next.submissions || []), newSub]
          }
          next = addAudit(next, actor, 'submit_assignment', 'submission', homeworkId, `Student submitted work`)
          break
        }

        case 'grade_submission': {
          if (!isAdmin(auth.role) && auth.role !== 'teacher') throw new Error('forbidden')
          const { submissionId, score, feedback } = body.payload
          const submission = current.submissions.find(entry => entry.id === submissionId)
          const homework = submission && current.homework.find(entry => entry.id === submission.homeworkId)
          if (!submission || !homework) throw new Error('submission_not_found')
          requireTeacherClass(homework.classId)
          requireTeacherSubject(homework.subjectId)
          if (auth.role === 'teacher' && homework.teacherId !== user.id) throw new Error('forbidden')
          const grade = Number(score)
          if (!Number.isFinite(grade) || grade < 0 || grade > homework.maxScore) throw new Error('invalid_submission_score')
          next.submissions = (next.submissions || []).map(entry => entry.id === submission.id ? {
            ...entry, status: 'graded', score: grade, feedback: typeof feedback === 'string' ? feedback.trim() : '',
          } : entry)
          next = addAudit(next, actor, 'grade_submission', 'submission', submission.id, `Scored ${grade}/${homework.maxScore}`)
          actionResult = { submissionId, score: grade }
          break
        }

        case 'review_ai_alert': {
          if (!isAdmin(auth.role) && auth.role !== 'teacher') throw new Error('forbidden')
          const { alertId, note, status } = body.payload
          const alert = current.aiAlerts.find(entry => entry.id === alertId)
          const student = alert && current.students.find(entry => entry.id === alert.studentId)
          if (!alert || !student) throw new Error('alert_not_found')
          requireTeacherClass(student.classId)
          const reviewStatus = status === 'resolved' ? 'resolved' : 'reviewing'
          next.aiAlerts = next.aiAlerts.map(entry => entry.id === alertId ? {
            ...entry, status: reviewStatus, reviewNote: String(note || '').trim(), reviewedBy: user.id, reviewedAt: nowIso(), updatedAt: nowIso(),
          } : entry)
          next = addAudit(next, actor, 'review_student_alert', 'ai_alert', alertId, `${reviewStatus}: ${String(note || '').trim()}`)
          actionResult = { alertId, status: reviewStatus }
          break
        }

        case 'set_alert_status': {
          if (!isAdmin(auth.role) && auth.role !== 'teacher') throw new Error('forbidden')
          const { alertId, status } = body.payload
          if (!['open', 'reviewing', 'resolved', 'dismissed'].includes(status)) throw new Error('invalid_alert_status')
          const alert = current.aiAlerts.find(entry => entry.id === alertId)
          const student = alert && current.students.find(entry => entry.id === alert.studentId)
          if (!alert || !student) throw new Error('alert_not_found')
          requireTeacherClass(student.classId)
          next.aiAlerts = current.aiAlerts.map(entry => entry.id === alertId ? {
            ...entry, status, reviewedBy: user.id, reviewedAt: nowIso(), updatedAt: nowIso(),
          } : entry)
          next = addAudit(next, actor, 'set_alert_status', 'ai_alert', alertId, `Set alert to ${status}`)
          actionResult = { alertId, status }
          break
        }

        case 'run_ai_diagnostics': {
          if (!isAdmin(auth.role) && auth.role !== 'teacher') throw new Error('forbidden')
          const generated = buildAlerts(current)
          const scoped = auth.role === 'teacher' ? generated.filter(alert => {
            const student = current.students.find(entry => entry.id === alert.studentId)
            return !!student && teacherClassIds.has(student.classId)
          }) : generated
          const scopedIds = new Set(scoped.map(alert => alert.id))
          next.aiAlerts = [...current.aiAlerts.filter(alert => !scopedIds.has(alert.id)), ...scoped]
          next = addAudit(next, actor, 'run_ai_diagnostics', 'ai_alert', 'school', `Generated ${scoped.length} student alerts`)
          actionResult = { count: scoped.length }
          break
        }

        /* ── Announcements & Events ──────────────────────────────────────────── */
        case 'create_announcement': {
          if (!isAdmin(auth.role) && auth.role !== 'teacher') throw new Error('forbidden')
          const p = body.payload
          const announcementId = newId('anc')
          const newAnc = {
            id: announcementId,
            titleAr: p.titleAr?.trim() || '',
            titleEn: p.titleEn?.trim() || '',
            contentAr: p.contentAr?.trim() || '',
            contentEn: p.contentEn?.trim() || '',
            targetRoles: Array.isArray(p.targetRoles) ? p.targetRoles : ['all'],
            published: true,
            publishedAt: nowIso(),
            authorId: actor.userId,
            authorName: actor.nameEn || actor.nameAr,
            pinned: Boolean(p.pinned),
            category: p.category || 'general',
          }
          next.announcements = [newAnc, ...(next.announcements || [])]
          next = addAudit(next, actor, 'create_announcement', 'announcement', announcementId, newAnc.titleEn)
          actionResult = { announcement: newAnc }
          break
        }

        case 'create_event': {
          if (!isAdmin(auth.role)) throw new Error('forbidden')
          const p = body.payload
          const eventId = newId('evt')
          const newEvt = {
            id: eventId,
            titleAr: p.titleAr?.trim() || '',
            titleEn: p.titleEn?.trim() || '',
            descriptionAr: p.descriptionAr?.trim() || '',
            descriptionEn: p.descriptionEn?.trim() || '',
            startDate: p.startDate,
            endDate: p.endDate,
            locationAr: p.locationAr?.trim(),
            locationEn: p.locationEn?.trim(),
            category: p.category || 'academic',
            targetRoles: Array.isArray(p.targetRoles) ? p.targetRoles : ['all'],
            published: true,
          }
          next.events = [newEvt, ...(next.events || [])]
          next = addAudit(next, actor, 'create_event', 'event', eventId, newEvt.titleEn)
          actionResult = { event: newEvt }
          break
        }

        /* ── Digital Library ─────────────────────────────────────────────────── */
        case 'add_library_resource': {
          if (!isAdmin(auth.role) && auth.role !== 'librarian' && auth.role !== 'teacher') throw new Error('forbidden')
          const p = body.payload
          const resourceId = newId('lib')
          const newRes = {
            id: resourceId,
            titleAr: p.titleAr?.trim() || '',
            titleEn: p.titleEn?.trim() || '',
            author: p.author?.trim() || 'St. George Faculty',
            category: p.category?.trim() || 'General',
            subjectId: p.subjectId,
            gradeLevel: Number(p.gradeLevel) || undefined,
            type: p.type || 'book',
            fileUrl: p.fileUrl,
            coverUrl: p.coverUrl,
            isbn: p.isbn?.trim(),
            availableCopies: Number(p.totalCopies) || 1,
            totalCopies: Number(p.totalCopies) || 1,
            isDigital: Boolean(p.isDigital),
            downloadable: Boolean(p.downloadable),
            createdAt: nowIso(),
          }
          next.libraryResources = [newRes, ...(next.libraryResources || [])]
          next = addAudit(next, actor, 'add_library_resource', 'library', resourceId, newRes.titleEn)
          actionResult = { resource: newRes }
          break
        }

        /* ── Users & Roles ───────────────────────────────────────────────────── */
        case 'add_user': {
          if (auth.role !== 'super_admin') throw new Error('forbidden')
          const p = body.payload
          const accountRoles: Role[] = ['teacher', 'student', 'parent', 'staff', 'librarian', 'accountant']
          if (!accountRoles.includes(p.role)) throw new Error('administrator_account_is_protected')
          const email = p.email?.trim().toLowerCase()
          if (!isValidEmail(email)) throw new Error('invalid_email')
          const passwordIssue = passwordProblem(p.password)
          if (passwordIssue) throw new Error(passwordIssue)

          const userId = newId('usr')
          const newUser: User = {
            id: userId,
            nameAr: p.nameAr?.trim() || '',
            nameEn: p.nameEn?.trim() || '',
            email,
            phone: p.phone?.trim() || '',
            role: p.role as Role,
            status: 'active',
            avatarColor: 'from-[#0f1f3d] to-[#c5a059]',
            department: p.department?.trim(),
            title: p.title?.trim(),
            createdAt: nowIso(),
          }

          if (newUser.role === 'teacher') {
            const teacherId = newId('tch')
            const empNo = `TCH-${new Date().getFullYear()}-${String((next.teachers?.length || 0) + 1).padStart(3, '0')}`
            const teacherProfile: Teacher = {
              id: teacherId,
              userId,
              nameAr: newUser.nameAr,
              nameEn: newUser.nameEn,
              email,
              phone: newUser.phone,
              employeeNo: empNo,
              subjectIds: Array.isArray(p.subjectIds) ? p.subjectIds : [],
              classIds: Array.isArray(p.classIds) ? p.classIds : (p.classId ? [p.classId] : []),
              status: 'active',
              joinedAt: nowIso(),
              gradeLevels: Array.isArray(p.gradeLevels) ? p.gradeLevels.filter((grade: unknown) => Number.isInteger(grade)) : undefined,
              specialization: p.specialization?.trim() || undefined,
            }
            newUser.teacherId = teacherId
            next.teachers = [...(next.teachers || []), teacherProfile]
          }

          next.users = [...next.users, newUser]
          createAuthUser({
            id: userId,
            email,
            passwordHash: hashPassword(p.password),
            role: newUser.role,
          })
          next = addAudit(next, actor, 'create_user', 'user', userId, `${newUser.nameEn} (${newUser.role})`)
          actionResult = { user: newUser }
          break
        }

        case 'toggle_user_status': {
          if (auth.role !== 'super_admin') throw new Error('forbidden')
          const { id } = body.payload
          const target = next.users.find(u => u.id === id)
          if (!target) throw new Error('user_not_found')
          if (target.role === 'super_admin' || target.role === 'school_admin') throw new Error('administrator_account_cannot_be_deactivated')
          const newStatus = target.status === 'active' ? 'inactive' : 'active'
          if (target.role === 'student' && newStatus === 'active' && !target.studentId) throw new Error('student_profile_required')
          next.users = next.users.map(u => u.id === id ? { ...u, status: newStatus } : u)
          next.teachers = next.teachers.map(t => t.userId === id ? { ...t, status: newStatus } : t)
          updateAuthStatus(id, newStatus)
          next = addAudit(next, actor, 'toggle_user_status', 'user', id, `Set status to ${newStatus}`)
          break
        }

        case 'approve_student_registration': {
          if (auth.role !== 'super_admin') throw new Error('forbidden')
          const { id, classId, gender, dob, studentNumber } = body.payload
          const target = next.users.find(entry => entry.id === id && entry.role === 'student')
          if (!target || target.status !== 'inactive' || target.studentId) throw new Error('student_request_not_pending')
          const cls = next.classes.find(entry => entry.id === classId)
          if (!cls) throw new Error('class_not_found')
          if (gender !== 'male' && gender !== 'female') throw new Error('invalid_gender')
          if (typeof dob !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dob) || dob >= new Date().toISOString().slice(0, 10)) throw new Error('invalid_date_of_birth')
          const requestedNumber = typeof studentNumber === 'string' ? studentNumber.trim() : ''
          const assignedNumber = requestedNumber || nextStudentNumber(next)
          if (next.students.some(student => student.studentId.toLowerCase() === assignedNumber.toLowerCase())) throw new Error('student_number_taken')
          const studentId = newId('stu')
          const now = nowIso()
          const student: Student = {
            id: studentId,
            studentId: assignedNumber,
            nameAr: target.nameAr,
            nameEn: target.nameEn,
            email: target.email,
            phone: target.phone,
            gender,
            dob,
            gradeLevel: cls.gradeLevel,
            classId: cls.id,
            academicYearId: cls.academicYearId || current.settings.academicYearId || current.academicYears[0]?.id || '',
            status: 'active',
            enrolledAt: now,
            parentIds: [],
            address: '',
            notes: '',
            avatarColor: 'from-[#0f1f3d] to-[#c5a059]',
          }
          next.students = [student, ...next.students]
          next.users = next.users.map(entry => entry.id === target.id ? { ...entry, studentId, status: 'active', department: undefined } : entry)
          updateAuthStatus(target.id, 'active')
          next = addAudit(next, actor, 'approve_student_registration', 'student', studentId, `Approved account request for ${target.nameEn}`)
          actionResult = { student, userId: target.id }
          break
        }

        case 'update_teacher_classes': {
          if (auth.role !== 'teacher') throw new Error('forbidden')
          const teacher = next.teachers.find(t => t.userId === user.id && t.status === 'active')
          if (!teacher) throw new Error('teacher_profile_missing')
          const requestedClassIds: unknown[] = Array.isArray(body.payload.classIds) ? body.payload.classIds : []
          const classIds: string[] = Array.from(new Set<string>(requestedClassIds.filter((id): id is string => typeof id === 'string')))
          const gradeLevels = teacher.gradeLevels ?? next.classes.filter(cls => teacher.classIds.includes(cls.id)).map(cls => cls.gradeLevel)
          if (!classIds.length || classIds.some((classId: string) => !next.classes.some(cls => cls.id === classId && gradeLevels.includes(cls.gradeLevel)))) {
            throw new Error('invalid_teacher_classes')
          }
          const assignments = teacher.subjectIds.flatMap(subjectId => classIds.map((classId: string) => ({
            id: newId('tas'), teacherId: teacher.id, classId, subjectId,
            academicYearId: next.settings.academicYearId || next.academicYears[0]?.id || '',
          })))
          next.teachers = next.teachers.map(t => t.id === teacher.id ? { ...t, classIds } : t)
          next.teacherAssignments = [...next.teacherAssignments.filter(a => a.teacherId !== teacher.id), ...assignments]
          next = addAudit(next, actor, 'update_teacher_classes', 'teacher', teacher.id, `Assigned classes: ${classIds.join(', ')}`)
          actionResult = { classIds }
          break
        }

        case 'update_user': {
          if (auth.role !== 'super_admin') throw new Error('forbidden')
          const { id, patch } = body.payload
          const target = next.users.find(entry => entry.id === id)
          if (!target) throw new Error('user_not_found')
          if ((target.role === 'super_admin' || target.role === 'school_admin') && target.id !== user.id) throw new Error('administrator_account_is_protected')
          if (patch?.role && patch.role !== target.role) throw new Error('role_change_not_allowed')
          const email = typeof patch?.email === 'string' ? patch.email.trim().toLowerCase() : target.email
          if (!isValidEmail(email)) throw new Error('invalid_email')
          let studentId = target.studentId
          if (target.role === 'student' && typeof patch?.studentId === 'string') {
            studentId = patch.studentId || undefined
            if (studentId && !next.students.some(student => student.id === studentId && student.status === 'active')) throw new Error('student_profile_not_found')
            if (studentId && next.users.some(entry => entry.id !== id && entry.studentId === studentId)) throw new Error('student_profile_already_linked')
          }
          next.users = next.users.map(entry => entry.id === id ? {
            ...entry,
            nameAr: typeof patch.nameAr === 'string' ? patch.nameAr.trim() : entry.nameAr,
            nameEn: typeof patch.nameEn === 'string' ? patch.nameEn.trim() : entry.nameEn,
            email,
            phone: typeof patch.phone === 'string' ? patch.phone.trim() : entry.phone,
            studentId,
          } : entry)
          next.teachers = next.teachers.map(entry => entry.userId === id ? { ...entry, nameAr: patch.nameAr ?? entry.nameAr, nameEn: patch.nameEn ?? entry.nameEn, email, phone: patch.phone ?? entry.phone } : entry)
          next.parents = next.parents.map(entry => entry.userId === id ? { ...entry, nameAr: patch.nameAr ?? entry.nameAr, nameEn: patch.nameEn ?? entry.nameEn, email, phone: patch.phone ?? entry.phone } : entry)
          updateAuthEmail(id, email)
          if (patch?.password) updateAuthPassword(id, hashPassword(patch.password))
          next = addAudit(next, actor, 'update_user', 'user', id, 'Updated account profile')
          break
        }

        case 'reset_user_password': {
          if (!isAdmin(auth.role)) throw new Error('forbidden')
          const { id, newPassword } = body.payload
          if (!newPassword || newPassword.length < 6) throw new Error('weak_password')
          updateAuthPassword(id, hashPassword(newPassword))
          next = addAudit(next, actor, 'reset_password', 'user', id, 'Password was reset by administrator')
          break
        }

        /* ── Settings & CMS ──────────────────────────────────────────────────── */
        case 'update_settings': {
          if (!isAdmin(auth.role)) throw new Error('forbidden')
          next.settings = { ...next.settings, ...body.payload }
          next = addAudit(next, actor, 'update_settings', 'settings', 'school_profile', 'Updated school configuration')
          break
        }

        case 'update_cms': {
          if (!isAdmin(auth.role)) throw new Error('forbidden')
          next.cms = { ...next.cms, ...body.payload }
          next = addAudit(next, actor, 'update_cms', 'cms', 'public_website', 'Updated public website content')
          break
        }

        /* ── Notifications ───────────────────────────────────────────────────── */
        case 'mark_notification_read': {
          const { id } = body.payload
          next.notifications = (next.notifications || []).map(n => n.id === id ? {
            ...n,
            read: true,
            readBy: Array.from(new Set([...(n.readBy || []), user.id])),
          } : n)
          break
        }

        case 'create_notification': {
          const p = body.payload
          const student = p.studentId ? current.students.find(entry => entry.id === p.studentId) : undefined
          if (auth.role === 'teacher' && (!student || !teacherClassIds.has(student.classId))) throw new Error('forbidden')
          const validRoles: Array<Role | 'all'> = ['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent', 'librarian', 'accountant', 'staff', 'all']
          const recipientRole: Role | 'all' | undefined = validRoles.includes(p.recipientRole) ? p.recipientRole : undefined
          if (auth.role === 'teacher' && recipientRole !== 'student' && recipientRole !== 'parent') throw new Error('forbidden')
          if (auth.role === 'parent' && (recipientRole !== 'teacher' || !student || !(current.parents.some(parent => parent.userId === user.id && parent.studentIds.includes(student.id)) || user.childIds?.includes(student.id)))) throw new Error('forbidden')
          if (auth.role === 'student' && (recipientRole !== 'teacher' || !student || (user.studentId !== student.id && student.email.toLowerCase() !== user.email.toLowerCase()))) throw new Error('forbidden')
          const notification: Notification = {
            id: newId('ntf'),
            recipientRole,
            studentId: student?.id,
            category: p.category || 'general',
            titleAr: String(p.titleAr || '').trim(),
            titleEn: String(p.titleEn || '').trim(),
            bodyAr: String(p.bodyAr || '').trim(),
            bodyEn: String(p.bodyEn || '').trim(),
            createdAt: nowIso(),
            read: false,
            link: typeof p.link === 'string' ? p.link : undefined,
            delivery: 'in_app',
            deliveryStatus: 'delivered',
          }
          if (!notification.titleAr || !notification.titleEn || !notification.bodyAr || !notification.bodyEn) throw new Error('notification_content_required')
          if (p.dedupeKey && next.notifications.some(entry => entry.dedupeKey === p.dedupeKey)) {
            actionResult = { duplicate: true }
            break
          }
          notification.dedupeKey = typeof p.dedupeKey === 'string' ? p.dedupeKey : undefined
          next.notifications = [notification, ...(next.notifications || [])]
          if (auth.role === 'teacher' && recipientRole === 'student') {
            const manager = next.users.find(entry => entry.role === 'super_admin' && entry.status === 'active')
            const dedupeKey = `teacher-message:${user.id}:${new Date().toISOString().slice(0, 10)}:${notification.titleEn}`
            if (manager && !next.notifications.some(entry => entry.recipientId === manager.id && entry.dedupeKey === dedupeKey)) {
              next.notifications = [{
                id: newId('ntf'), recipientId: manager.id, recipientRole: 'super_admin', category: 'message',
                titleAr: 'رسالة أرسلها معلم', titleEn: 'Teacher sent a class message',
                bodyAr: `${actor.nameAr}: ${notification.titleAr}`, bodyEn: `${actor.nameEn}: ${notification.titleEn}`,
                createdAt: nowIso(), read: false, dedupeKey, link: 'notifications', delivery: 'in_app', deliveryStatus: 'delivered',
              }, ...next.notifications]
            }
          }
          actionResult = { notification }
          break
        }

        case 'mark_all_notifications_read': {
          next.notifications = (next.notifications || []).map(n => ({
            ...n,
            read: true,
            readBy: Array.from(new Set([...(n.readBy || []), user.id])),
          }))
          break
        }

        default:
          throw new Error(`unknown_action:${body.action}`)
      }

      if (auth.role === 'teacher' && body.action !== 'mark_notification_read' && body.action !== 'mark_all_notifications_read' && body.action !== 'create_notification') {
        const manager = next.users.find(entry => entry.role === 'super_admin' && entry.status === 'active')
        if (manager) {
          const actionTitle = body.action.replace(/_/g, ' ')
          const payload = body.payload ?? {}
          const classId = payload.classId || (payload.submissionId
            ? current.homework.find(item => item.id === current.submissions.find(submission => submission.id === payload.submissionId)?.homeworkId)?.classId
            : payload.alertId
              ? current.classes.find(cls => cls.id === current.students.find(student => student.id === current.aiAlerts.find(alert => alert.id === payload.alertId)?.studentId)?.classId)?.id
              : undefined)
          const classLabel = current.classes.find(cls => cls.id === classId)?.nameEn
          const subject = payload.nameEn || payload.titleEn || payload.titleAr || payload.note || ''
          const detail = [actionTitle, classLabel, subject, typeof payload.records?.length === 'number' ? `${payload.records.length} attendance records` : undefined].filter(Boolean).join(' · ')
          const managerNotice: Notification = {
            id: newId('ntf'), recipientId: manager.id, recipientRole: 'super_admin', category: 'system',
            titleAr: 'إجراء جديد من المعلم', titleEn: 'Teacher activity recorded',
            bodyAr: `${actor.nameAr}: ${detail}`, bodyEn: `${actor.nameEn}: ${detail}`,
            createdAt: nowIso(), read: false, link: 'notifications', delivery: 'in_app', deliveryStatus: 'delivered',
          }
          next.notifications = [managerNotice, ...(next.notifications || [])]
        }
      }

      return { data: next, result: actionResult }
    })

    return ok({
      ok: true,
      result,
      workspace: scopeWorkspace(workspace.data, { userId: user.id, role: auth.role }),
      rev: workspace.rev,
    })
  } catch (error: any) {
    console.error('workspace mutation error:', error)
    return fail(error?.message === 'forbidden' ? 403 : 400, error?.message || 'mutation_failed')
  }
}
