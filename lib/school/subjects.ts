import type { Subject } from './types'

export const COMMON_SCHOOL_SUBJECTS: Omit<Subject, 'id'>[] = [
  { code: 'ARA', nameAr: 'اللغة العربية', nameEn: 'Arabic Language', color: '#19a99a' },
  { code: 'ENG', nameAr: 'اللغة الإنجليزية', nameEn: 'English Language', color: '#3b82f6' },
  { code: 'MTH', nameAr: 'الرياضيات', nameEn: 'Mathematics', color: '#c5a059' },
  { code: 'HIST', nameAr: 'التاريخ', nameEn: 'History', color: '#f59e0b' },
  { code: 'GEO', nameAr: 'الجغرافيا', nameEn: 'Geography', color: '#10b981' },
  { code: 'SCI', nameAr: 'العلوم العامة', nameEn: 'General Science', color: '#14b8a6' },
  { code: 'CHEM', nameAr: 'الكيمياء', nameEn: 'Chemistry', color: '#8b5cf6' },
  { code: 'PHYS', nameAr: 'الفيزياء', nameEn: 'Physics', color: '#6366f1' },
  { code: 'BIO', nameAr: 'الأحياء', nameEn: 'Biology', color: '#22c55e' },
  { code: 'PROG', nameAr: 'البرمجة', nameEn: 'Programming', color: '#0ea5e9' },
  { code: 'ICT', nameAr: 'تكنولوجيا المعلومات والحاسب', nameEn: 'Computer Science & ICT', color: '#06b6d4' },
  { code: 'REL', nameAr: 'التربية الدينية والقيم', nameEn: 'Religious & Moral Education', color: '#a855f7' },
  { code: 'FREN', nameAr: 'اللغة الفرنسية', nameEn: 'French Language', color: '#ec4899' },
  { code: 'GER', nameAr: 'اللغة الألمانية', nameEn: 'German Language', color: '#e87926' },
  { code: 'ECON', nameAr: 'الاقتصاد', nameEn: 'Economics', color: '#64748b' },
  { code: 'BUS', nameAr: 'إدارة الأعمال', nameEn: 'Business Studies', color: '#d946ef' },
  { code: 'ART', nameAr: 'التربية الفنية والموسيقى', nameEn: 'Arts & Music', color: '#f472b6' },
  { code: 'PE', nameAr: 'التربية الرياضية', nameEn: 'Physical Education', color: '#84cc16' },
]
