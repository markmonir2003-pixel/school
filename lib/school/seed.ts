/**
 * DEVELOPMENT-ONLY SEEDER — ST. GEORGE SCHOOL
 *
 * NOTE: This seeder is strictly for offline testing and development sandboxing.
 * In accordance with St. George School security policy, it is NEVER run
 * automatically in production. The production database begins completely clean
 * and is initialized exclusively through the secure Admin Setup Wizard.
 */

import type {
  AcademicYear,
  AttendanceRecord,
  AttendanceStatus,
  ClassRoom,
  Conversation,
  Exam,
  Grade,
  Homework,
  Message,
  Notification,
  Parent,
  SchoolData,
  SchoolSettings,
  Student,
  Subject,
  Submission,
  Teacher,
  TeacherAssignment,
  User,
} from './types'

/* ── Deterministic pseudo-random generator ─────────────────────────────── */

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(3602026)
const pick = <T,>(items: T[]): T => items[Math.floor(rand() * items.length)]
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))

/* ── Calendar helpers ──────────────────────────────────────────────────── */

export const iso = (d: Date) => d.toISOString().slice(0, 10)

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** The most recent `count` weekdays, oldest first. */
export function recentSchoolDays(count: number, from = new Date()): string[] {
  const days: string[] = []
  let cursor = new Date(from)
  while (days.length < count) {
    const day = cursor.getDay()
    if (day !== 5 && day !== 6) days.unshift(iso(cursor))
    cursor = addDays(cursor, -1)
  }
  return days
}

/* ── Names ─────────────────────────────────────────────────────────────── */

const maleFirst = [
  ['أحمد', 'Ahmed'], ['محمد', 'Mohamed'], ['عمر', 'Omar'], ['خالد', 'Khaled'],
  ['يوسف', 'Yousef'], ['علي', 'Ali'], ['زياد', 'Ziad'], ['كريم', 'Karim'],
  ['مازن', 'Mazen'], ['سامي', 'Samy'], ['حسن', 'Hassan'], ['إبراهيم', 'Ibrahim'],
] as const

const femaleFirst = [
  ['سارة', 'Sarah'], ['نورة', 'Noura'], ['مريم', 'Mariam'], ['ليلى', 'Laila'],
  ['فاطمة', 'Fatima'], ['جنى', 'Jana'], ['هنا', 'Hana'], ['ريم', 'Reem'],
  ['سلمى', 'Salma'], ['دينا', 'Dina'], ['ياسمين', 'Yasmin'], ['أميرة', 'Amira'],
] as const

const families = [
  ['العبدلي', 'Al-Abdali'], ['الزهراني', 'Al-Zahrani'], ['الشهري', 'Al-Shehri'],
  ['الغامدي', 'Al-Ghamdi'], ['العتيبي', 'Al-Otaibi'], ['القحطاني', 'Al-Qahtani'],
  ['الدوسري', 'Al-Dosari'], ['الحربي', 'Al-Harbi'], ['المطيري', 'Al-Mutairi'],
  ['الرشيدي', 'Al-Rashidi'], ['الشمري', 'Al-Shammari'], ['السيد', 'El-Sayed'],
  ['منصور', 'Mansour'], ['حسن', 'Hassan'], ['عبد الرحمن', 'Abdelrahman'],
  ['النجار', 'Al-Najjar'], ['فؤاد', 'Fouad'], ['سليمان', 'Suleiman'],
] as const

const subjectsSrc: Array<Omit<Subject, 'id'>> = [
  { code: 'ARA', nameAr: 'اللغة العربية', nameEn: 'Arabic Language', color: '#19a99a' },
  { code: 'MATH', nameAr: 'الرياضيات', nameEn: 'Mathematics', color: '#6366f1' },
  { code: 'ENG', nameAr: 'اللغة الإنجليزية', nameEn: 'English Language', color: '#3b82f6' },
  { code: 'SCI', nameAr: 'العلوم', nameEn: 'Science', color: '#f59e0b' },
  { code: 'SOC', nameAr: 'الدراسات الاجتماعية', nameEn: 'Social Studies', color: '#ec4899' },
  { code: 'CS', nameAr: 'علوم الحاسب', nameEn: 'Computer Science', color: '#8b5cf6' },
]

const teacherSpecs: Array<[string, string, string]> = [
  ['إبراهيم', 'خليل', 'Ibrahim Khalil'],
  ['منال', 'العمري', 'Manal Al-Omari'],
  ['ديفيد', 'رايت', 'David Wright'],
  ['عادل', 'الشريف', 'Adel Al-Sharif'],
  ['طارق', 'مسعود', 'Tariq Masoud'],
  ['هالة', 'سليم', 'Hala Selim'],
  ['نادية', 'فهمي', 'Nadia Fahmy'],
  ['محمود', 'عزت', 'Mahmoud Ezzat'],
  ['رشا', 'كمال', 'Rasha Kamal'],
  ['عمر', 'فاروق', 'Omar Farouk'],
  ['سلمى', 'نبيل', 'Salma Nabil'],
  ['حسام', 'الدين', 'Hossam El-Din'],
  ['ماجدة', 'شعبان', 'Magda Shabaan'],
  ['أمين', 'رزق', 'Amin Rizk'],
  ['لينا', 'حداد', 'Lina Haddad'],
  ['فادي', 'جرجس', 'Fady Girgis'],
]

const avatarPalette = [
  'from-[#19a99a] to-[#0d9488]',
  'from-[#6366f1] to-[#8b5cf6]',
  'from-[#3b82f6] to-[#0284c7]',
  'from-[#ec4899] to-[#f43f5e]',
  'from-[#f59e0b] to-[#b45309]',
  'from-[#10b981] to-[#059669]',
]

const NOTE_POSITIVE_AR = [
  'مشاركة فعالة وملحوظة في الحصة، واجتهاد مستمر.',
  'تحسن واضح في المهارات التحليلية خلال الفترة الأخيرة.',
  'طالب متعاون يساعد زملاءه ويحافظ على نظام الفصل.',
]
const NOTE_POSITIVE_EN = [
  'Active participation in class with consistent effort.',
  'Clear improvement in analytical skills recently.',
  'Cooperative student who supports classmates and classroom order.',
]
const NOTE_CONCERN_AR = [
  'يحتاج إلى متابعة إضافية في الواجبات المنزلية.',
  'انخفاض ملحوظ في التركيز خلال الحصص الأخيرة.',
  'تأخر متكرر في تسليم المهام الأسبوعية.',
]
const NOTE_CONCERN_EN = [
  'Needs additional follow-up on homework completion.',
  'Noticeable drop in focus during recent classes.',
  'Repeated late submission of weekly tasks.',
]

/* ── Seed builder ──────────────────────────────────────────────────────── */

export function createSeedData(): SchoolData {
  const now = new Date()
  const today = iso(now)
  const year: AcademicYear = {
    id: 'ay-2026',
    nameAr: 'العام الدراسي ٢٠٢٦ / ٢٠٢٧',
    nameEn: 'Academic Year 2026 / 2027',
    startDate: '2026-09-01',
    endDate: '2027-06-30',
    active: true,
  }

  const prevYear: AcademicYear = {
    id: 'ay-2025',
    nameAr: 'العام الدراسي ٢٠٢٥ / ٢٠٢٦',
    nameEn: 'Academic Year 2025 / 2026',
    startDate: '2025-09-01',
    endDate: '2026-06-30',
    active: false,
  }

  const subjects: Subject[] = subjectsSrc.map((s, i) => ({ ...s, id: `sub-${s.code.toLowerCase()}`, ...(i === 0 ? {} : {}) }))

  const classes: ClassRoom[] = []
  let classIndex = 0
  for (const grade of [9, 10, 11, 12]) {
    for (const section of ['A', 'B', 'C']) {
      classIndex++
      classes.push({
        id: `cls-${grade}${section.toLowerCase()}`,
        nameAr: `الصف ${grade} — ${section}`,
        nameEn: `Grade ${grade}-${section}`,
        gradeLevel: grade,
        section,
        academicYearId: year.id,
        capacity: 28,
        room: `R-${classIndex + 100}`,
      })
    }
  }

  const teachers: Teacher[] = []
  const teacherUsers: User[] = []
  teacherSpecs.forEach(([firstAr, lastAr, fullEn], i) => {
    const [firstEn, ...restEn] = fullEn.split(' ')
    const subject = subjects[i % subjects.length]
    const assignedClassIds = [classes[i % classes.length].id, classes[(i + 3) % classes.length].id]
    const teacher: Teacher = {
      id: `tch-${i + 1}`,
      userId: `usr-tch-${i + 1}`,
      nameAr: `${firstAr} ${lastAr}`,
      nameEn: fullEn,
      email: `teacher${i + 1}@school360.edu`,
      phone: `+20 100 555 ${String(1000 + i).slice(-4)}`,
      employeeNo: `TCH-2026-${String(i + 1).padStart(3, '0')}`,
      subjectIds: [subject.id, subjects[(i + 2) % subjects.length].id].filter((v, idx, arr) => arr.indexOf(v) === idx),
      classIds: assignedClassIds,
      homeroomClassId: i < classes.length ? classes[i].id : undefined,
      status: 'active',
      joinedAt: `20${18 + (i % 6)}-09-01`,
    }
    teachers.push(teacher)
    teacherUsers.push({
      id: teacher.userId,
      nameAr: teacher.nameAr,
      nameEn: teacher.nameEn,
      email: teacher.email,
      phone: teacher.phone,
      role: 'teacher',
      status: 'active',
      avatarColor: avatarPalette[i % avatarPalette.length],
      password: 'teacher123',
      teacherId: teacher.id,
      createdAt: teacher.joinedAt,
    })
  })

  classes.forEach((cls, i) => {
    cls.homeroomTeacherId = teachers[i % teachers.length].id
  })

  const teacherAssignments: TeacherAssignment[] = []
  teachers.forEach((t, ti) => {
    t.classIds.forEach((classId, ci) => {
      const cls = classes.find(c => c.id === classId)!
      const subject = subjects[(ti + ci) % subjects.length]
      teacherAssignments.push({
        id: `ta-${ti}-${ci}`,
        teacherId: t.id,
        classId,
        subjectId: subject.id,
        academicYearId: year.id,
      })
    })
  })

  /* Students */
  const students: Student[] = []
  const parents: Parent[] = []
  const parentUsers: User[] = []
  const studentUsers: User[] = []
  const TOTAL_STUDENTS = 240

  for (let i = 0; i < TOTAL_STUDENTS; i++) {
    const gender = i % 2 === 0 ? 'male' : 'female'
    const first = gender === 'male' ? maleFirst[i % maleFirst.length] : femaleFirst[i % femaleFirst.length]
    const family = families[(i * 7 + Math.floor(i / 19)) % families.length]
    const cls = classes[i % classes.length]
    const nameAr = `${first[0]} ${family[0]}`
    const nameEn = `${first[1]} ${family[1]}`
    const studentId = `SCH-2026-${String(i + 1).padStart(4, '0')}`
    const id = `stu-${i + 1}`
    const parentId = `par-${Math.floor(i / 2) + 1}`
    const parentFamily = family

    if (i % 2 === 0) {
      const parentUser: User = {
        id: `usr-par-${Math.floor(i / 2) + 1}`,
        nameAr: `${gender === 'male' ? 'السيد' : 'السيدة'} ${parentFamily[0]}`,
        nameEn: `${gender === 'male' ? 'Mr.' : 'Mrs.'} ${parentFamily[1]}`,
        email: `parent${Math.floor(i / 2) + 1}@school360.edu`,
        phone: `+20 101 777 ${String(2000 + i).slice(-4)}`,
        role: 'parent',
        status: 'active',
        avatarColor: avatarPalette[i % avatarPalette.length],
        password: 'parent123',
        childIds: [id, i + 1 < TOTAL_STUDENTS ? `stu-${i + 2}` : ''].filter(Boolean),
        createdAt: '2026-08-20',
      }
      parentUsers.push(parentUser)
      parents.push({
        id: parentId,
        userId: parentUser.id,
        nameAr: parentUser.nameAr,
        nameEn: parentUser.nameEn,
        email: parentUser.email,
        phone: parentUser.phone,
        relationship: gender === 'male' ? 'father' : 'mother',
        studentIds: parentUser.childIds!,
      })
    }

    const student: Student = {
      id,
      studentId,
      nameAr,
      nameEn,
      email: `student${i + 1}@school360.edu`,
      phone: `+20 102 888 ${String(3000 + i).slice(-4)}`,
      gender,
      dob: `${2026 - cls.gradeLevel - 6}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
      gradeLevel: cls.gradeLevel,
      classId: cls.id,
      academicYearId: year.id,
      status: i % 41 === 0 ? 'inactive' : i % 57 === 0 ? 'suspended' : 'active',
      enrolledAt: cls.gradeLevel === 9 ? '2026-09-01' : `202${4 + (12 - cls.gradeLevel)}-09-01`,
      parentIds: [parentId],
      address: `${between(1, 90)} شارع النيل، المعادي، القاهرة`,
      avatarColor: avatarPalette[(i * 3) % avatarPalette.length],
    }
    students.push(student)

    studentUsers.push({
      id: `usr-stu-${i + 1}`,
      nameAr,
      nameEn,
      email: student.email,
      phone: student.phone!,
      role: 'student',
      status: 'active',
      avatarColor: student.avatarColor,
      password: 'student123',
      studentId: student.id,
      createdAt: student.enrolledAt,
    })
  }

  /* Users */
  const users: User[] = [
    {
      id: 'usr-admin',
      nameAr: 'محمد عبدالله',
      nameEn: 'Mohammed Abdullah',
      email: 'admin@school360.edu',
      phone: '+20 100 000 0001',
      role: 'school_admin',
      status: 'active',
      avatarColor: 'from-[#182b52] to-[#6366f1]',
      password: 'admin123',
      lastLogin: new Date(now.getTime() - 32 * 60000).toISOString(),
      createdAt: '2025-08-01',
    },
    {
      id: 'usr-super',
      nameAr: 'سارة المالكي',
      nameEn: 'Sara Al-Malki',
      email: 'super@school360.edu',
      phone: '+20 100 000 0002',
      role: 'super_admin',
      status: 'active',
      avatarColor: 'from-[#19a99a] to-[#0d9488]',
      password: 'super123',
      lastLogin: new Date(now.getTime() - 3 * 3600000).toISOString(),
      createdAt: '2025-01-11',
    },
    ...teacherUsers,
    ...parentUsers,
    ...studentUsers,
  ]

  // Demo login accounts get friendly aliases on the first records.
  users.push({
    id: 'usr-demo-teacher',
    nameAr: teachers[0].nameAr,
    nameEn: teachers[0].nameEn,
    email: 'teacher@school360.edu',
    phone: teachers[0].phone,
    role: 'teacher',
    status: 'active',
    avatarColor: 'from-[#6366f1] to-[#8b5cf6]',
    password: 'teacher123',
    teacherId: teachers[0].id,
    createdAt: teachers[0].joinedAt,
  })
  teachers[0].userId = 'usr-demo-teacher'

  users.push({
    id: 'usr-demo-parent',
    nameAr: parents[0].nameAr,
    nameEn: parents[0].nameEn,
    email: 'parent@school360.edu',
    phone: parents[0].phone,
    role: 'parent',
    status: 'active',
    avatarColor: 'from-[#ec4899] to-[#f43f5e]',
    password: 'parent123',
    childIds: parents[0].studentIds,
    createdAt: parents[0].userId ? '2026-08-20' : '2026-08-20',
  })
  parents[0].userId = 'usr-demo-parent'

  users.push({
    id: 'usr-demo-student',
    nameAr: students[0].nameAr,
    nameEn: students[0].nameEn,
    email: 'student@school360.edu',
    phone: students[0].phone!,
    role: 'student',
    status: 'active',
    avatarColor: students[0].avatarColor,
    password: 'student123',
    studentId: students[0].id,
    createdAt: students[0].enrolledAt,
  })
  studentUsers[0].email = students[0].email = 'student@school360.edu'

  /* Attendance — 22 school days, weighted risk profiles */
  const days = recentSchoolDays(22, now)
  const attendance: AttendanceRecord[] = []
  let attSeq = 0
  for (const student of students) {
    const idx = Number(student.id.split('-')[1])
    const risk = idx % 17 === 0 ? 0.3 : idx % 13 === 0 ? 0.14 : 0.04
    let consecutiveAbsence = 0
    for (const date of days) {
      let status: AttendanceStatus = 'present'
      const roll = rand()
      if (roll < risk) status = 'absent'
      else if (roll < risk + 0.055) status = 'late'
      else if (roll < risk + 0.075) status = 'excused'
      if (risk > 0.2 && consecutiveAbsence >= 2) status = 'absent'
      consecutiveAbsence = status === 'absent' ? consecutiveAbsence + 1 : 0
      attendance.push({
        id: `att-${++attSeq}`,
        studentId: student.id,
        classId: student.classId,
        date,
        session: 'morning',
        status,
        recordedBy: teachers[idx % teachers.length].userId,
        recordedAt: `${date}T07:42:00.000Z`,
      })
    }
  }

  /* Exams + grades */
  const exams: Exam[] = []
  const grades: Grade[] = []
  const examTypes: Array<{ type: Exam['type']; ar: string; en: string; weight: string }> = [
    { type: 'monthly', ar: 'اختبار شهري', en: 'Monthly Assessment', weight: '1' },
    { type: 'midterm', ar: 'اختبار نصف الفصل', en: 'Midterm Exam', weight: '2' },
  ]
  let examSeq = 0
  for (const cls of classes) {
    for (const subject of subjects.slice(0, 4)) {
      for (const meta of examTypes) {
        examSeq++
        const examDate = iso(addDays(now, -between(4, 20)))
        const exam: Exam = {
          id: `exam-${examSeq}`,
          nameAr: `${meta.ar} — ${subject.nameAr}`,
          nameEn: `${meta.en} — ${subject.nameEn}`,
          type: meta.type,
          academicYearId: year.id,
          gradeLevel: cls.gradeLevel,
          classId: cls.id,
          subjectId: subject.id,
          date: examDate,
          startTime: '09:00',
          durationMin: meta.type === 'midterm' ? 90 : 45,
          maxMarks: 100,
          passMarks: 50,
          status: 'published',
          createdBy: teachers[subject.code === 'ARA' ? 0 : subject.code === 'MATH' ? 3 : subject.code === 'ENG' ? 2 : 1].userId,
        }
        exams.push(exam)
        const roster = students.filter(s => s.classId === cls.id)
        for (const student of roster) {
          const idx = Number(student.id.split('-')[1])
          const risk = idx % 17 === 0 ? 0.3 : idx % 13 === 0 ? 0.14 : 0.04
          const base = risk > 0.2 ? 46 : risk > 0.1 ? 66 : 78
          const score = Math.max(18, Math.min(100, Math.round(base + (rand() * 28 - 12) + (meta.type === 'midterm' ? -3 : 0))))
          grades.push({
            id: `grd-${exam.id}-${student.id}`,
            examId: exam.id,
            studentId: student.id,
            score,
            enteredBy: exam.createdBy,
            enteredAt: `${examDate}T13:20:00.000Z`,
          })
        }
      }
    }
  }

  /* Homework + submissions */
  const homework: Homework[] = []
  const submissions: Submission[] = []
  let hwSeq = 0
  classes.forEach((cls, ci) => {
    const subject = subjects[ci % 4]
    const teacher = teachers[ci % teachers.length]
    for (let n = 0; n < 2; n++) {
      hwSeq++
      const dueDate = iso(addDays(now, n === 0 ? 3 : -4))
      const item: Homework = {
        id: `hw-${hwSeq}`,
        titleAr: n === 0 ? `ورقة عمل — ${subject.nameAr}` : `مشروع الوحدة — ${subject.nameAr}`,
        titleEn: n === 0 ? `Worksheet — ${subject.nameEn}` : `Unit project — ${subject.nameEn}`,
        descriptionAr: 'يرجى حل التدريبات المرفقة ورفع الملف قبل الموعد النهائي.',
        descriptionEn: 'Complete the attached exercises and upload your file before the deadline.',
        classId: cls.id,
        subjectId: subject.id,
        teacherId: teacher.id,
        dueDate,
        createdAt: iso(addDays(now, n === 0 ? -4 : -12)),
        maxScore: 20,
        status: 'active',
      }
      homework.push(item)
      students.filter(s => s.classId === cls.id).forEach((student, si) => {
        const idx = Number(student.id.split('-')[1])
        const missed = idx % 17 === 0 && n === 0 ? true : idx % 11 === 0 && si % 3 === 0
        submissions.push({
          id: `sub-${item.id}-${student.id}`,
          homeworkId: item.id,
          studentId: student.id,
          status: missed ? 'missing' : n === 0 ? 'submitted' : 'graded',
          submittedAt: missed ? undefined : `${iso(addDays(now, -1))}T18:10:00.000Z`,
          score: !missed && n === 1 ? Math.max(8, Math.round(12 + rand() * 8)) : undefined,
          fileName: missed ? undefined : `homework-${student.studentId}.pdf`,
          feedback: !missed && n === 1 ? 'عمل جيد، انتبه للخطوات الأخيرة.' : undefined,
        })
      })
    }
  })

  /* Observations */
  const observations = students.slice(0, 36).map((student, i) => {
    const idx = Number(student.id.split('-')[1])
    const positive = idx % 4 !== 0
    return {
      id: `obs-${i + 1}`,
      studentId: student.id,
      teacherId: teachers[i % teachers.length].id,
      date: iso(addDays(now, -between(1, 18))),
      category: positive ? ('positive' as const) : ('concern' as const),
      noteAr: positive ? NOTE_POSITIVE_AR[i % 3] : NOTE_CONCERN_AR[i % 3],
      noteEn: positive ? NOTE_POSITIVE_EN[i % 3] : NOTE_CONCERN_EN[i % 3],
      visibleToParent: true,
    }
  })

  /* Conversations / messages */
  const conversations: Conversation[] = []
  const messages: Message[] = []
  const demoParentUser = users.find(u => u.id === 'usr-demo-parent')!
  const demoTeacherUser = users.find(u => u.id === 'usr-demo-teacher')!
  const conversationSeeds = [
    { subjectAr: 'متابعة أداء عمر في الرياضيات', subjectEn: "Omar's mathematics progress", studentId: students[0].id, teacher: teachers[3], body: 'أود مناقشة نتائج الاختبار الأخير وخطة الدعم المقترحة.', reply: 'شكراً لتواصلك. سنراجع مهارات حل المسائل مع عمر خلال الحصة القادمة.' },
    { subjectAr: 'استفسار عن واجب العلوم', subjectEn: 'Science homework question', studentId: students[1].id, teacher: teachers[1], body: 'هل يمكن توضيح المطلوب في مشروع الوحدة الثانية؟', reply: 'بالتأكيد، المطلوب صفحة واحدة مع رسم توضيحي، وسأرفع نموذجاً على المنصة.' },
  ]
  conversationSeeds.forEach((seed, i) => {
    const conv: Conversation = {
      id: `conv-${i + 1}`,
      subjectAr: seed.subjectAr,
      subjectEn: seed.subjectEn,
      participantIds: [demoParentUser.id, seed.teacher.userId],
      studentId: seed.studentId,
      updatedAt: new Date(now.getTime() - (i + 1) * 3600000).toISOString(),
    }
    conversations.push(conv)
    messages.push(
      {
        id: `msg-${i}-1`,
        conversationId: conv.id,
        senderId: demoParentUser.id,
        body: seed.body,
        sentAt: new Date(now.getTime() - (i + 2) * 3600000).toISOString(),
        readBy: [demoParentUser.id, seed.teacher.userId],
      },
      {
        id: `msg-${i}-2`,
        conversationId: conv.id,
        senderId: seed.teacher.userId,
        body: seed.reply,
        sentAt: new Date(now.getTime() - (i + 1) * 3600000).toISOString(),
        readBy: [seed.teacher.userId],
      },
    )
  })

  /* Notifications */
  const notifications: Notification[] = [
    {
      id: 'ntf-1',
      category: 'attendance',
      titleAr: 'غياب مسجّل',
      titleEn: 'Absence recorded',
      bodyAr: `تم تسجيل غياب ${students[0].nameAr} في الحصة الصباحية اليوم.`,
      bodyEn: `${students[0].nameEn} was marked absent in today's morning session.`,
      recipientRole: 'parent',
      recipientId: 'usr-demo-parent',
      studentId: students[0].id,
      createdAt: new Date(now.getTime() - 42 * 60000).toISOString(),
      read: false,
      delivery: 'in_app',
      deliveryStatus: 'delivered',
      link: 'parent-portal',
    },
    {
      id: 'ntf-2',
      category: 'academic',
      titleAr: 'نشر نتائج الاختبار الشهري',
      titleEn: 'Monthly results published',
      bodyAr: 'تم نشر نتائج اختبار الرياضيات الشهري. يمكنك الاطلاع عليها من بوابة الطالب.',
      bodyEn: 'Monthly mathematics results are now available in the student portal.',
      recipientRole: 'all',
      createdAt: new Date(now.getTime() - 3 * 3600000).toISOString(),
      read: false,
      delivery: 'in_app',
      deliveryStatus: 'delivered',
      link: 'exams',
    },
    {
      id: 'ntf-3',
      category: 'ai',
      titleAr: 'تنبيه دعم طلابي يحتاج مراجعة',
      titleEn: 'Student support alert needs review',
      bodyAr: 'تم رصد نمط attendance ودرجات يستدعي مراجعة بشرية من فريق الإرشاد.',
      bodyEn: 'Attendance and grade patterns require human review by the support team.',
      recipientRole: 'school_admin',
      createdAt: new Date(now.getTime() - 5 * 3600000).toISOString(),
      read: false,
      delivery: 'in_app',
      deliveryStatus: 'delivered',
      link: 'ai-center',
    },
    {
      id: 'ntf-4',
      category: 'announcement',
      titleAr: 'اجتماع أولياء الأمور',
      titleEn: 'Parent meeting',
      bodyAr: 'يسر إدارة المدرسة دعوة أولياء الأمور لاجتماع يوم السبت القادم الساعة ١٠ صباحاً.',
      bodyEn: 'Parents are invited to the school meeting next Saturday at 10 AM.',
      recipientRole: 'all',
      createdAt: new Date(now.getTime() - 26 * 3600000).toISOString(),
      read: true,
      delivery: 'in_app',
      deliveryStatus: 'delivered',
      link: 'notifications',
    },
    {
      id: 'ntf-5',
      category: 'homework',
      titleAr: 'واجب مستحق خلال ٢٤ ساعة',
      titleEn: 'Homework due within 24 hours',
      bodyAr: 'لدى الطالب واجب علوم لم يتم تسليمه بعد.',
      bodyEn: 'A science assignment has not been submitted yet.',
      recipientRole: 'student',
      recipientId: 'usr-demo-student',
      createdAt: new Date(now.getTime() - 30 * 60000).toISOString(),
      read: false,
      delivery: 'in_app',
      deliveryStatus: 'delivered',
      link: 'student-portal',
    },
  ]

  const settings: SchoolSettings = {
    schoolNameAr: 'مدرسة سان جورج',
    schoolNameEn: 'St. George School',
    platformNameAr: 'الحرم الرقمي لمدرسة سان جورج',
    platformNameEn: 'St. George School Digital Campus',
    schoolNameShort: 'SGS',
    email: 'info@stgeorgeschool.edu',
    phone: '+20 2 2345 6789',
    addressAr: 'القاهرة، مصر',
    addressEn: 'Cairo, Egypt',
    website: 'https://stgeorgeschool.edu',
    academicYearId: year.id,
    language: 'ar',
    theme: 'light',
    attendanceThreshold: 90,
    absenceNotification: true,
    lateNotification: true,
    weeklyDigest: true,
    aiAutoRun: true,
    aiRequiresReview: true,
    passingPercentage: 50,
    gradeScale: 'percentage',
    timezone: 'Africa/Cairo',
    currency: 'EGP',
    logoText: 'SGS',
  }

  return {
    version: 3,
    users,
    academicYears: [year, prevYear],
    terms: [],
    subjects,
    classes,
    students,
    parents,
    teachers,
    teacherAssignments,
    courses: [],
    lessons: [],
    attendance,
    exams,
    questions: [],
    examAttempts: [],
    grades,
    homework,
    submissions,
    announcements: [],
    events: [],
    libraryResources: [],
    studentProjects: [],
    schoolActivities: [],
    observations,
    conversations,
    messages,
    notifications,
    aiAlerts: [],
    aiAnalyses: [],
    auditLogs: [
      {
        id: 'aud-1',
        actorId: 'usr-admin',
        actorName: 'محمد عبدالله',
        action: 'seeded_academic_year',
        entity: 'academic_year',
        entityId: year.id,
        at: new Date(now.getTime() - 26 * 3600000).toISOString(),
        details: 'Initial academic year and class structure created.',
      },
    ],
    importJobs: [],
    cms: {
      heroTitleAr: 'مدرسة سان جورج',
      heroTitleEn: 'St. George School',
      heroSubtitleAr: 'الحرم الرقمي لمدرسة سان جورج',
      heroSubtitleEn: 'St. George School Digital Campus',
      aboutAr: '',
      aboutEn: '',
      missionAr: '',
      missionEn: '',
      visionAr: '',
      visionEn: '',
      valuesAr: [],
      valuesEn: [],
      principalMessageAr: '',
      principalMessageEn: '',
      admissionsGuideAr: '',
      admissionsGuideEn: '',
      workingHoursAr: '',
      workingHoursEn: '',
      socialLinks: {},
    },
    settings,
  }
}
