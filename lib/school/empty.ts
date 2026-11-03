import type { PublicCMS, SchoolData, SchoolSettings } from './types'

export const WORKSPACE_VERSION = 3

export function createDefaultCMS(): PublicCMS {
  return {
    heroTitleAr: 'الحرم الرقمي لمدرسة سان جورج',
    heroTitleEn: 'St. George School Digital Campus',
    heroSubtitleAr: 'منظومة تعليمية متكاملة تواكب المستقبل وتغرس أرفع القيم الأكاديمية والتربوية.',
    heroSubtitleEn: 'An integrated digital learning environment combining academic excellence, character building, and future-ready innovation.',
    aboutAr: 'تأسست مدرسة سان جورج لتقدم نموذجاً تعليمياً رائداً يجمع بين الأصالة الأكاديمية والتطور التكنولوجي، موفرة بيئة محفزة للطلاب والمعلمين وأولياء الأمور.',
    aboutEn: 'St. George School provides an exemplary academic foundation blending heritage, moral excellence, and modern educational technology for holistic student development.',
    missionAr: 'توفير تعليم متميز يغرس النزاهة وحب المعرفة ويعد أجيالاً قادرة على الريادة والإبداع في مجتمع سريع التطور.',
    missionEn: 'To deliver world-class holistic education that nurtures integrity, intellectual curiosity, and leadership in an ever-evolving world.',
    visionAr: 'أن نكون الصرح التعليمي الأبرز في صناعة قادة المستقبل وتمكينهم من إحداث أثر إيجابي محلياً وعالمياً.',
    visionEn: 'To be the preeminent educational institution shaping the leaders of tomorrow and empowering them to make a positive global impact.',
    valuesAr: ['النزاهة الأكاديمية', 'الانضباط والاحترام', 'الابتكار والتفكير النقدي', 'المسؤولية المجتمعية', 'التعلم المستمر'],
    valuesEn: ['Academic Integrity', 'Discipline & Respect', 'Innovation & Critical Thinking', 'Social Responsibility', 'Lifelong Learning'],
    principalMessageAr: 'أهلاً بكم في الحرم الرقمي لمدرسة سان جورج. نضع بين أيديكم هذه المنصة لتكون جسر التواصل الأمثل ومساحة التعلم الذكي التي تجمع أسرتنا المدرسية.',
    principalMessageEn: 'Welcome to St. George School Digital Campus. This platform empowers our entire school community with seamless communication, rigorous academics, and modern learning tools.',
    admissionsGuideAr: 'تستقبل مدرسة سان جورج طلبات الالتحاق لجميع المراحل الدراسية وفق معايير قبول واضحة تضمن التميز والتكافؤ.',
    admissionsGuideEn: 'St. George School welcomes admission applications across all grade levels based on clear standards that ensure excellence and equal opportunity.',
    workingHoursAr: 'الأحد – الخميس: ٧:٣٠ صباحاً – ٣:٣٠ مساءً',
    workingHoursEn: 'Sunday – Thursday: 7:30 AM – 3:30 PM',
    socialLinks: {
      facebook: 'https://facebook.com/stgeorgeschool',
      twitter: 'https://twitter.com/stgeorgeschool',
      instagram: 'https://instagram.com/stgeorgeschool',
      youtube: 'https://youtube.com/stgeorgeschool',
    },
  }
}

export function createDefaultSettings(): SchoolSettings {
  return {
    schoolNameAr: 'مدرسة سان جورج',
    schoolNameEn: 'St. George School',
    platformNameAr: 'الحرم الرقمي لمدرسة سان جورج',
    platformNameEn: 'St. George School Digital Campus',
    schoolNameShort: 'St. George',
    email: 'info@stgeorgeschool.edu',
    phone: '+20 2 24500000',
    addressAr: 'مجمع سان جورج التعليمي، القاهرة، مصر',
    addressEn: 'St. George Campus, Cairo, Egypt',
    website: 'https://stgeorgeschool.edu',
    academicYearId: '',
    language: 'ar',
    theme: 'light',
    attendanceThreshold: 90,
    absenceNotification: true,
    lateNotification: true,
    weeklyDigest: false,
    aiAutoRun: false,
    aiRequiresReview: true,
    passingPercentage: 50,
    gradeScale: 'percentage',
    timezone: 'Africa/Cairo',
    currency: 'EGP',
    logoText: 'SG',
    mottoAr: 'التميز في التعليم وبناء الشخصية والقيم',
    mottoEn: 'Excellence in Education, Character, and Faith',
    principalNameAr: 'إدارة مدرسة سان جورج',
    principalNameEn: 'St. George School Administration',
    twoFactorEnabled: false,
  }
}

/**
 * Clean, empty workspace for St. George School.
 * Absolutely NO fake students, demo accounts, or simulated records.
 * All collections start empty and are populated through real actions.
 */
export function createEmptyWorkspace(settings: Partial<SchoolSettings> = {}): SchoolData {
  return {
    version: WORKSPACE_VERSION,
    users: [],
    academicYears: [],
    terms: [],
    subjects: [],
    classes: [],
    students: [],
    parents: [],
    teachers: [],
    teacherAssignments: [],
    courses: [],
    lessons: [],
    attendance: [],
    exams: [],
    questions: [],
    examAttempts: [],
    grades: [],
    homework: [],
    submissions: [],
    announcements: [],
    events: [],
    libraryResources: [],
    studentProjects: [],
    schoolActivities: [],
    observations: [],
    conversations: [],
    messages: [],
    notifications: [],
    aiAlerts: [],
    aiAnalyses: [],
    auditLogs: [],
    importJobs: [],
    cms: createDefaultCMS(),
    settings: { ...createDefaultSettings(), ...settings },
  }
}

export function createPlaceholderWorkspace(): SchoolData {
  return createEmptyWorkspace()
}
