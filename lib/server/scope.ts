import type {
  AIAlert,
  ClassRoom,
  Notification,
  Role,
  SchoolData,
  Student,
  Teacher,
} from '@/lib/school/types'
import { WORKSPACE_VERSION } from '@/lib/school/empty'

export interface Actor {
  userId: string
  role: Role
}

export function isAdmin(role: Role): boolean {
  return role === 'super_admin'
}

/**
 * Visible slice for a teacher. Classes come from the teacher profile and from
 * teacher assignments, so onboarding choices immediately drive visibility.
 */
export function teacherScope(data: SchoolData, userId: string) {
  const user = data.users.find(entry => entry.id === userId)
  const teacher = data.teachers.find(entry => entry.userId === userId || entry.id === user?.teacherId)
  const classIds = new Set<string>(teacher?.classIds ?? [])
  for (const assignment of data.teacherAssignments ?? []) {
    if (assignment.teacherId === teacher?.id) classIds.add(assignment.classId)
  }
  const students = data.students.filter(student => classIds.has(student.classId))
  const studentIds = new Set(students.map(student => student.id))
  const classes = data.classes.filter(cls => classIds.has(cls.id))
  const parentIds = new Set(students.flatMap(student => student.parentIds))
  const parents = data.parents.filter(parent => parentIds.has(parent.id))
  const parentUserIds = new Set(parents.map(parent => parent.userId).filter(Boolean))
  const studentUserIds = new Set(
    data.users.filter(entry => entry.role === 'student' && entry.studentId && studentIds.has(entry.studentId)).map(entry => entry.id),
  )
  const homeroomIds = new Set(classes.map(cls => cls.homeroomTeacherId).filter(Boolean) as string[])
  const teachers = data.teachers.filter(entry =>
    entry.userId === userId || entry.id === teacher?.id || homeroomIds.has(entry.id),
  )
  const exams = data.exams.filter(exam => !exam.classId || classIds.has(exam.classId))
  const examIds = new Set(exams.map(exam => exam.id))
  const homework = data.homework.filter(item => classIds.has(item.classId))
  const homeworkIds = new Set(homework.map(item => item.id))
  const conversationIds = new Set(
    (data.conversations ?? []).filter(conversation => conversation.participantIds.includes(userId)).map(conversation => conversation.id),
  )
  const users = data.users.filter(entry =>
    entry.id === userId || parentUserIds.has(entry.id) || studentUserIds.has(entry.id),
  )
  const visibleUserIds = new Set(users.map(entry => entry.id))

  return {
    user,
    teacher,
    classIds,
    students,
    studentIds,
    classes,
    parents,
    parentIds,
    users,
    visibleUserIds,
    teachers,
    examIds,
    exams,
    homework,
    homeworkIds,
    conversationIds,
  }
}

export function parentScope(data: SchoolData, userId: string) {
  const user = data.users.find(entry => entry.id === userId)
  const parent = data.parents.find(entry => entry.userId === userId)
  const childIds = new Set<string>([...(parent?.studentIds ?? []), ...(user?.childIds ?? [])])
  const students = data.students.filter(student => childIds.has(student.id))
  const studentIds = new Set(students.map(student => student.id))
  const classIds = new Set(students.map(student => student.classId))
  const classes = data.classes.filter(cls => classIds.has(cls.id))
  const teachers = data.teachers.filter(entry => entry.classIds.some(classId => classIds.has(classId)))
  const exams = data.exams.filter(exam => exam.status === 'published' && (!exam.classId || classIds.has(exam.classId)))
  const examIds = new Set(exams.map(exam => exam.id))
  const homework = data.homework.filter(item => classIds.has(item.classId))
  const homeworkIds = new Set(homework.map(item => item.id))
  const conversationIds = new Set(
    (data.conversations ?? []).filter(conversation => conversation.participantIds.includes(userId)).map(conversation => conversation.id),
  )
  return {
    user,
    parent,
    childIds,
    students,
    studentIds,
    classIds,
    classes,
    teachers,
    exams,
    examIds,
    homework,
    homeworkIds,
    conversationIds,
  }
}

export function studentScope(data: SchoolData, userId: string) {
  const user = data.users.find(entry => entry.id === userId)
  const student = data.students.find(entry => entry.id === user?.studentId || entry.email === user?.email)
  const classId = student?.classId
  const cls = data.classes.find(entry => entry.id === classId)
  const classes = cls ? [cls] : []
  const teachers = data.teachers.filter(entry => classId && entry.classIds.includes(classId))
  const exams = data.exams.filter(exam => exam.status === 'published' && (!exam.classId || exam.classId === classId))
  const examIds = new Set(exams.map(exam => exam.id))
  const homework = data.homework.filter(item => item.classId === classId)
  const homeworkIds = new Set(homework.map(item => item.id))
  const studentIds = new Set(student ? [student.id] : [])
  const conversationIds = new Set(
    (data.conversations ?? []).filter(conversation => conversation.participantIds.includes(userId)).map(conversation => conversation.id),
  )
  return {
    user,
    student,
    studentIds,
    classId,
    classes,
    teachers,
    exams,
    examIds,
    homework,
    homeworkIds,
    conversationIds,
  }
}

/**
 * Filter the shared workspace down to what the given actor is permitted to see.
 * Super Admins, School Admins, and Principals see the complete document.
 */
export function scopeWorkspace(data: SchoolData, actor: Actor): SchoolData {
  if (isAdmin(actor.role)) return data

  if (actor.role === 'librarian') {
    return {
      ...data,
      users: data.users.filter(u => u.status === 'active'),
      courses: data.courses ?? [],
      lessons: data.lessons ?? [],
      libraryResources: data.libraryResources ?? [],
      announcements: data.announcements ?? [],
      events: data.events ?? [],
      auditLogs: (data.auditLogs ?? []).filter(log => log.actorId === actor.userId),
    }
  }

  if (actor.role === 'accountant') {
    return {
      ...data,
      students: data.students ?? [],
      classes: data.classes ?? [],
      attendance: data.attendance ?? [],
      announcements: data.announcements ?? [],
      events: data.events ?? [],
      auditLogs: (data.auditLogs ?? []).filter(log => log.actorId === actor.userId),
    }
  }

  if (actor.role === 'staff') {
    return {
      ...data,
      announcements: data.announcements ?? [],
      events: data.events ?? [],
      libraryResources: data.libraryResources ?? [],
      schoolActivities: data.schoolActivities ?? [],
      auditLogs: (data.auditLogs ?? []).filter(log => log.actorId === actor.userId),
    }
  }

  if (actor.role === 'teacher') {
    const scope = teacherScope(data, actor.userId)
    return {
      ...data,
      users: scope.users,
      teachers: scope.teachers,
      classes: scope.classes,
      students: scope.students,
      parents: scope.parents,
      teacherAssignments: (data.teacherAssignments ?? []).filter(assignment =>
        assignment.teacherId === scope.teacher?.id || scope.classIds.has(assignment.classId),
      ),
      courses: (data.courses ?? []).filter(c => c.teacherId === scope.teacher?.id || c.classIds.some(id => scope.classIds.has(id))),
      lessons: (data.lessons ?? []).filter(l => {
        const course = (data.courses ?? []).find(c => c.id === l.courseId)
        return course && (course.teacherId === scope.teacher?.id || course.classIds.some(id => scope.classIds.has(id)))
      }),
      attendance: (data.attendance ?? []).filter(record => scope.studentIds.has(record.studentId)),
      exams: scope.exams,
      questions: (data.questions ?? []).filter(q => scope.examIds.has(q.examId)),
      examAttempts: (data.examAttempts ?? []).filter(a => scope.examIds.has(a.examId)),
      grades: (data.grades ?? []).filter(grade => scope.examIds.has(grade.examId) || scope.studentIds.has(grade.studentId)),
      homework: scope.homework,
      submissions: (data.submissions ?? []).filter(submission => scope.homeworkIds.has(submission.homeworkId)),
      announcements: (data.announcements ?? []).filter(a => a.published),
      events: (data.events ?? []).filter(e => e.published),
      libraryResources: data.libraryResources ?? [],
      studentProjects: data.studentProjects ?? [],
      schoolActivities: data.schoolActivities ?? [],
      observations: (data.observations ?? []).filter(observation => scope.studentIds.has(observation.studentId)),
      conversations: (data.conversations ?? []).filter(conversation => scope.conversationIds.has(conversation.id)),
      messages: (data.messages ?? []).filter(message => scope.conversationIds.has(message.conversationId)),
      notifications: (data.notifications ?? []).filter(notification =>
        notification.recipientId === actor.userId ||
        notification.recipientRole === 'teacher' && (!notification.studentId || scope.studentIds.has(notification.studentId)) ||
        notification.recipientRole === 'all',
      ),
      aiAlerts: (data.aiAlerts ?? []).filter(alert => scope.studentIds.has(alert.studentId)),
      aiAnalyses: (data.aiAnalyses ?? []).filter(analysis => scope.studentIds.has(analysis.studentId)),
      auditLogs: (data.auditLogs ?? []).filter(log => log.actorId === actor.userId),
      importJobs: (data.importJobs ?? []).filter(job => job.actorId === actor.userId),
    }
  }

  if (actor.role === 'parent') {
    const scope = parentScope(data, actor.userId)
    return {
      ...data,
      users: (data.users ?? []).filter(u => u.id === actor.userId),
      teachers: scope.teachers,
      classes: scope.classes,
      students: scope.students,
      parents: scope.parent ? [scope.parent] : [],
      teacherAssignments: [],
      courses: (data.courses ?? []).filter(c => c.classIds.some(id => scope.classIds.has(id))),
      lessons: (data.lessons ?? []).filter(l => l.published),
      attendance: (data.attendance ?? []).filter(record => scope.studentIds.has(record.studentId)),
      exams: scope.exams,
      questions: [],
      examAttempts: (data.examAttempts ?? []).filter(a => scope.studentIds.has(a.studentId)),
      grades: (data.grades ?? []).filter(grade => scope.studentIds.has(grade.studentId)),
      homework: scope.homework,
      submissions: (data.submissions ?? []).filter(submission => scope.studentIds.has(submission.studentId)),
      announcements: (data.announcements ?? []).filter(a => a.published && (a.targetRoles.includes('all') || a.targetRoles.includes('parent'))),
      events: (data.events ?? []).filter(e => e.published && (e.targetRoles.includes('all') || e.targetRoles.includes('parent'))),
      libraryResources: (data.libraryResources ?? []).filter(r => r.isDigital),
      studentProjects: (data.studentProjects ?? []).filter(p => p.status === 'approved' || p.featured),
      schoolActivities: (data.schoolActivities ?? []).filter(a => a.active),
      observations: (data.observations ?? []).filter(observation => scope.studentIds.has(observation.studentId) && observation.visibleToParent),
      conversations: (data.conversations ?? []).filter(conversation => scope.conversationIds.has(conversation.id)),
      messages: (data.messages ?? []).filter(message => scope.conversationIds.has(message.conversationId)),
      notifications: (data.notifications ?? []).filter(notification =>
        notification.recipientId === actor.userId ||
        notification.recipientRole === 'parent' && (!notification.studentId || scope.studentIds.has(notification.studentId)) ||
        notification.recipientRole === 'all',
      ),
      aiAlerts: [],
      aiAnalyses: [],
      auditLogs: [],
      importJobs: [],
    }
  }

  // Student scope
  const scope = studentScope(data, actor.userId)
  return {
    ...data,
    users: (data.users ?? []).filter(u => u.id === actor.userId),
    teachers: scope.teachers,
    classes: scope.classes,
    students: scope.student ? [scope.student] : [],
    parents: [],
    teacherAssignments: [],
    courses: (data.courses ?? []).filter(c => scope.classId && c.classIds.includes(scope.classId)),
    lessons: (data.lessons ?? []).filter(l => l.published),
    attendance: (data.attendance ?? []).filter(record => scope.studentIds.has(record.studentId)),
    exams: scope.exams,
    questions: (data.questions ?? []).filter(q => scope.examIds.has(q.examId)),
    examAttempts: (data.examAttempts ?? []).filter(a => scope.studentIds.has(a.studentId)),
    grades: (data.grades ?? []).filter(grade => scope.studentIds.has(grade.studentId)),
    homework: scope.homework,
    submissions: (data.submissions ?? []).filter(submission => scope.studentIds.has(submission.studentId)),
    announcements: (data.announcements ?? []).filter(a => a.published && (a.targetRoles.includes('all') || a.targetRoles.includes('student'))),
    events: (data.events ?? []).filter(e => e.published && (e.targetRoles.includes('all') || e.targetRoles.includes('student'))),
    libraryResources: (data.libraryResources ?? []).filter(r => r.isDigital),
    studentProjects: (data.studentProjects ?? []).filter(p => p.status === 'approved' || p.featured || (scope.student && p.studentIds.includes(scope.student.id))),
    schoolActivities: (data.schoolActivities ?? []).filter(a => a.active),
    observations: [],
    conversations: (data.conversations ?? []).filter(conversation => scope.conversationIds.has(conversation.id)),
    messages: (data.messages ?? []).filter(message => scope.conversationIds.has(message.conversationId)),
    notifications: (data.notifications ?? []).filter(notification =>
      notification.recipientId === actor.userId ||
      notification.recipientRole === 'student' && (!notification.studentId || notification.studentId === scope.student?.id) ||
      notification.recipientRole === 'all',
    ),
    aiAlerts: [],
    aiAnalyses: [],
    auditLogs: [],
    importJobs: [],
  }
}
