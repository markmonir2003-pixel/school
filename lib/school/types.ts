/**
 * St. George School Digital Campus — Domain Model
 * الحرم الرقمي لمدرسة سان جورج
 *
 * Real, persistent database model for St. George School.
 * The workspace document is persisted in SQLite with atomic transactions.
 * Authentication credentials live in the secure auth_users table.
 */

export type Role =
  | 'super_admin'
  | 'school_admin'
  | 'principal'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'librarian'
  | 'accountant'
  | 'staff'

export type Language = 'ar' | 'en'
export type ThemeMode = 'light' | 'dark' | 'system'

export type StudentStatus = 'active' | 'inactive' | 'suspended' | 'graduated' | 'archived'
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'
export type ExamType = 'monthly' | 'weekly' | 'midterm' | 'final' | 'practical' | 'quiz' | 'custom'
export type ExamStatus = 'draft' | 'published' | 'closed'
export type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'essay'
export type ResourceType = 'book' | 'pdf' | 'document' | 'video' | 'audio' | 'link'
export type ProjectStatus = 'submitted' | 'under_review' | 'approved' | 'featured' | 'rejected'
export type ActivityType = 'club' | 'sports' | 'competition' | 'arts' | 'stem' | 'community'

export type NotificationCategory =
  | 'attendance'
  | 'academic'
  | 'homework'
  | 'exam'
  | 'announcement'
  | 'event'
  | 'message'
  | 'system'
  | 'ai'
  | 'library'

export type AlertSeverity = 'low' | 'medium' | 'high'
export type AlertStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed'
export type SubmissionStatus = 'pending' | 'submitted' | 'graded' | 'late' | 'missing'

export interface User {
  id: string
  nameAr: string
  nameEn: string
  email: string
  phone: string
  role: Role
  status: 'active' | 'inactive'
  avatarColor: string
  teacherId?: string
  studentId?: string
  childIds?: string[]
  department?: string
  title?: string
  password?: string
  lastLogin?: string
  createdAt: string
}

export interface AcademicYear {
  id: string
  nameAr: string
  nameEn: string
  startDate: string
  endDate: string
  active: boolean
}

export interface Term {
  id: string
  academicYearId: string
  nameAr: string
  nameEn: string
  startDate: string
  endDate: string
  active: boolean
}

export interface Subject {
  id: string
  code: string
  nameAr: string
  nameEn: string
  color: string
  credits?: number
  gradeLevels?: number[]
}

export interface ClassRoom {
  id: string
  nameAr: string
  nameEn: string
  gradeLevel: number
  section: string
  academicYearId: string
  homeroomTeacherId?: string
  capacity: number
  room: string
}

export interface Student {
  id: string
  studentId: string
  nameAr: string
  nameEn: string
  email: string
  phone?: string
  gender: 'male' | 'female'
  dob: string
  gradeLevel: number
  classId: string
  academicYearId: string
  status: StudentStatus
  enrolledAt: string
  parentIds: string[]
  address?: string
  notes?: string
  avatarColor: string
}

export interface Parent {
  id: string
  userId: string
  nameAr: string
  nameEn: string
  email: string
  phone: string
  relationship: 'father' | 'mother' | 'guardian'
  studentIds: string[]
}

export interface Teacher {
  id: string
  userId: string
  nameAr: string
  nameEn: string
  email: string
  phone: string
  employeeNo: string
  subjectIds: string[]
  classIds: string[]
  homeroomClassId?: string
  status: 'active' | 'inactive'
  joinedAt: string
  specialization?: string
  gradeLevels?: number[]
}

export interface TeacherAssignment {
  id: string
  teacherId: string
  classId: string
  subjectId: string
  academicYearId: string
}

export interface Course {
  id: string
  code: string
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  gradeLevel: number
  classIds: string[]
  subjectId: string
  teacherId: string
  coverImage?: string
  published: boolean
  createdAt: string
  updatedAt: string
}

export interface Lesson {
  id: string
  courseId: string
  titleAr: string
  titleEn: string
  contentAr: string
  contentEn: string
  order: number
  durationMin: number
  videoUrl?: string
  attachments: Array<{
    id: string
    name: string
    url: string
    type: 'pdf' | 'video' | 'image' | 'link'
    sizeBytes?: number
  }>
  published: boolean
  createdAt: string
}

export interface AttendanceRecord {
  id: string
  studentId: string
  classId: string
  date: string
  session: string
  status: AttendanceStatus
  recordedBy: string
  recordedAt: string
  updatedAt?: string
  updatedBy?: string
  note?: string
}

export interface Exam {
  id: string
  nameAr: string
  nameEn: string
  type: ExamType
  academicYearId: string
  gradeLevel: number
  classId?: string
  subjectId: string
  date: string
  startTime: string
  durationMin: number
  maxMarks: number
  passMarks: number
  status: ExamStatus
  createdBy: string
  instructionsAr?: string
  instructionsEn?: string
}

export interface ExamQuestion {
  id: string
  examId: string
  type: QuestionType
  questionAr: string
  questionEn: string
  marks: number
  options?: Array<{ id: string; textAr: string; textEn: string }>
  correctAnswer?: string
  explanationAr?: string
  explanationEn?: string
}

export interface ExamAttempt {
  id: string
  examId: string
  studentId: string
  startedAt: string
  submittedAt?: string
  score?: number
  graded: boolean
  answers: Record<string, string>
  feedback?: string
}

export interface Grade {
  id: string
  examId: string
  studentId: string
  score: number
  enteredBy: string
  enteredAt: string
  updatedAt?: string
  comment?: string
}

export interface Homework {
  id: string
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  classId: string
  subjectId: string
  teacherId: string
  dueDate: string
  createdAt: string
  maxScore: number
  status: 'active' | 'closed'
  attachmentUrl?: string
}

export interface Submission {
  id: string
  homeworkId: string
  studentId: string
  status: SubmissionStatus
  submittedAt?: string
  score?: number
  feedback?: string
  fileName?: string
  fileUrl?: string
}

export interface Announcement {
  id: string
  titleAr: string
  titleEn: string
  contentAr: string
  contentEn: string
  targetRoles: Array<Role | 'all'>
  targetGradeLevels?: number[]
  targetClassIds?: string[]
  published: boolean
  publishedAt: string
  expiresAt?: string
  authorId: string
  authorName: string
  pinned: boolean
  category: 'general' | 'academic' | 'exam' | 'event' | 'urgent'
}

export interface SchoolEvent {
  id: string
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  startDate: string
  endDate?: string
  locationAr?: string
  locationEn?: string
  category: 'academic' | 'sports' | 'cultural' | 'holiday' | 'exam'
  targetRoles: Array<Role | 'all'>
  published: boolean
}

export interface LibraryResource {
  id: string
  titleAr: string
  titleEn: string
  author: string
  category: string
  subjectId?: string
  gradeLevel?: number
  type: ResourceType
  fileUrl?: string
  coverUrl?: string
  isbn?: string
  availableCopies: number
  totalCopies: number
  isDigital: boolean
  downloadable: boolean
  createdAt: string
}

export interface StudentProject {
  id: string
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  studentIds: string[]
  gradeLevel: number
  subjectId?: string
  category: string
  status: ProjectStatus
  featured: boolean
  images?: string[]
  projectUrl?: string
  submittedAt: string
  approvedBy?: string
}

export interface SchoolActivity {
  id: string
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  type: ActivityType
  supervisorId?: string
  memberCount: number
  meetingScheduleAr?: string
  meetingScheduleEn?: string
  active: boolean
}

export interface Observation {
  id: string
  studentId: string
  teacherId: string
  date: string
  category: 'positive' | 'concern' | 'academic' | 'behaviour'
  noteAr: string
  noteEn: string
  visibleToParent: boolean
}

export interface Conversation {
  id: string
  subjectAr: string
  subjectEn: string
  participantIds: string[]
  studentId?: string
  updatedAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  body: string
  sentAt: string
  readBy: string[]
}

export interface Notification {
  id: string
  recipientRole?: Role | 'all'
  recipientId?: string
  studentId?: string
  category: NotificationCategory
  titleAr: string
  titleEn: string
  bodyAr: string
  bodyEn: string
  createdAt: string
  read: boolean
  readBy?: string[]
  link?: string
  delivery: 'in_app' | 'email'
  deliveryStatus: 'delivered' | 'queued' | 'failed'
  dedupeKey?: string
}

export interface AIAlert {
  id: string
  studentId: string
  severity: AlertSeverity
  status: AlertStatus
  riskScore: number
  reasons: string[]
  facts: string[]
  recommendations: string[]
  createdAt: string
  updatedAt: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNote?: string
  source: 'rules' | 'ai'
}

export interface AIAnalysis {
  id: string
  studentId: string
  generatedAt: string
  riskScore: number
  summary: string
  facts: string[]
  recommendations: string[]
  source: 'rules' | 'ai'
}

export interface AuditLog {
  id: string
  actorId: string
  actorName: string
  action: string
  entity: string
  entityId: string
  at: string
  details?: string
  ipAddress?: string
}

export interface ImportRowError {
  row: number
  field: string
  messageAr: string
  messageEn: string
  value?: string
}

export interface ImportJob {
  id: string
  fileName: string
  dataType: 'students' | 'grades' | 'teachers'
  total: number
  imported: number
  failed: number
  status: 'completed' | 'partial' | 'failed'
  at: string
  actorId: string
  errors: ImportRowError[]
}

export interface PublicCMS {
  heroTitleAr: string
  heroTitleEn: string
  heroSubtitleAr: string
  heroSubtitleEn: string
  aboutAr: string
  aboutEn: string
  missionAr: string
  missionEn: string
  visionAr: string
  visionEn: string
  valuesAr: string[]
  valuesEn: string[]
  principalMessageAr: string
  principalMessageEn: string
  admissionsGuideAr: string
  admissionsGuideEn: string
  workingHoursAr: string
  workingHoursEn: string
  socialLinks: {
    facebook?: string
    twitter?: string
    instagram?: string
    linkedin?: string
    youtube?: string
  }
}

export interface SchoolSettings {
  schoolNameAr: string
  schoolNameEn: string
  platformNameAr: string
  platformNameEn: string
  schoolNameShort: string
  email: string
  phone: string
  addressAr: string
  addressEn: string
  website: string
  academicYearId: string
  language: Language
  theme: ThemeMode
  attendanceThreshold: number
  absenceNotification: boolean
  lateNotification: boolean
  weeklyDigest: boolean
  aiAutoRun: boolean
  aiRequiresReview: boolean
  passingPercentage: number
  gradeScale: 'percentage' | 'gpa4' | 'letters' | 'ib7'
  timezone: string
  currency: string
  logoText: string
  accreditationId?: string
  mottoAr?: string
  mottoEn?: string
  principalNameAr?: string
  principalNameEn?: string
  principalName?: string
  curriculumType?: string
  twoFactorEnabled?: boolean
  logoDataUrl?: string
  colorScheme?: string
  fontSize?: string
}

export interface SchoolData {
  version: number
  users: User[]
  academicYears: AcademicYear[]
  terms: Term[]
  subjects: Subject[]
  classes: ClassRoom[]
  students: Student[]
  parents: Parent[]
  teachers: Teacher[]
  teacherAssignments: TeacherAssignment[]
  courses: Course[]
  lessons: Lesson[]
  attendance: AttendanceRecord[]
  exams: Exam[]
  questions: ExamQuestion[]
  examAttempts: ExamAttempt[]
  grades: Grade[]
  homework: Homework[]
  submissions: Submission[]
  announcements: Announcement[]
  events: SchoolEvent[]
  libraryResources: LibraryResource[]
  studentProjects: StudentProject[]
  schoolActivities: SchoolActivity[]
  observations: Observation[]
  conversations: Conversation[]
  messages: Message[]
  notifications: Notification[]
  aiAlerts: AIAlert[]
  aiAnalyses: AIAnalysis[]
  auditLogs: AuditLog[]
  importJobs: ImportJob[]
  cms: PublicCMS
  settings: SchoolSettings
}

export interface Session {
  userId: string
  loggedInAt: string
}

export interface StudentInput {
  nameAr: string
  nameEn: string
  email?: string
  gender: 'male' | 'female'
  dob: string
  gradeLevel: number
  classId: string
  status?: StudentStatus
  parentNameAr?: string
  parentNameEn?: string
  parentPhone?: string
  parentEmail?: string
  address?: string
}

export interface AttendanceInput {
  studentId: string
  status: AttendanceStatus
  note?: string
}

export interface ExamInput {
  nameAr: string
  nameEn: string
  type: ExamType
  gradeLevel: number
  classId?: string
  subjectId: string
  date: string
  startTime: string
  durationMin: number
  maxMarks: number
  passMarks: number
  instructionsAr?: string
  instructionsEn?: string
}

export interface CourseInput {
  code: string
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  gradeLevel: number
  classIds: string[]
  subjectId: string
  teacherId: string
  coverImage?: string
  published?: boolean
}

export interface AssignmentInput {
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  classId: string
  subjectId: string
  teacherId: string
  dueDate: string
  maxScore: number
}

export interface AnnouncementInput {
  titleAr: string
  titleEn: string
  contentAr: string
  contentEn: string
  targetRoles: Array<Role | 'all'>
  category: 'general' | 'academic' | 'exam' | 'event' | 'urgent'
  pinned?: boolean
}

export interface LibraryResourceInput {
  titleAr: string
  titleEn: string
  author: string
  category: string
  subjectId?: string
  gradeLevel?: number
  type: ResourceType
  fileUrl?: string
  isDigital?: boolean
  availableCopies?: number
  totalCopies?: number
}

export interface NotificationInput {
  category: NotificationCategory
  titleAr: string
  titleEn: string
  bodyAr: string
  bodyEn: string
  recipientRole?: Role | 'all'
  recipientId?: string
  studentId?: string
  link?: string
  dedupeKey?: string
  delivery?: 'in_app' | 'email'
}

export interface ParsedStudentRow {
  row: number
  nameAr: string
  nameEn: string
  gender: 'male' | 'female'
  dob: string
  gradeLevel: number
  className: string
  parentNameAr: string
  parentNameEn: string
  parentPhone: string
  parentEmail: string
  email?: string
}
