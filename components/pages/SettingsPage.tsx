'use client'

import React, { useState } from 'react'
import {
  Settings,
  Building2,
  Palette,
  Calendar,
  Bell,
  Layers,
  ShieldCheck,
  Database,
  Upload,
  Check,
  Save,
  Moon,
  Sun,
  Monitor,
  Globe,
  Key,
  Lock,
  Smartphone,
  Laptop,
  Tablet,
  LogOut,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Type,
  FileSpreadsheet,
  Download,
  Info,
  Clock,
  MapPin,
  QrCode,
  Shield,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/shared/Badge'
import { cn } from '@/lib/utils'
import { useSchool } from '@/lib/school/store'

type SettingsTab =
  | 'school-profile'
  | 'appearance'
  | 'academic-year'
  | 'notifications'
  | 'integrations'
  | 'security'
  | 'backup'

export function SettingsPage({ arabic = false }: { arabic?: boolean }) {
  const {
    data,
    user,
    lang,
    theme,
    setLang,
    setTheme,
    updateSettings,
    updateAcademicYear,
    updateUser,
    resetDemoData,
    logout,
  } = useSchool()
  const [activeTab, setActiveTab] = useState<SettingsTab>('school-profile')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // ── School Profile State ──
  const [schoolData, setSchoolData] = useState({
    nameEn: data.settings.schoolNameEn,
    nameAr: data.settings.schoolNameAr,
    accreditationId: data.settings.accreditationId ?? '',
    mottoEn: data.settings.mottoEn ?? '',
    mottoAr: data.settings.mottoAr ?? '',
    email: data.settings.email,
    phone: data.settings.phone,
    website: data.settings.website,
    addressEn: data.settings.addressEn,
    addressAr: data.settings.addressAr,
    principalName: data.settings.principalName ?? '',
    curriculumType: data.settings.curriculumType ?? '',
  })
  const [logoDataUrl, setLogoDataUrl] = useState(data.settings.logoDataUrl ?? '')
  const logoInputRef = React.useRef<HTMLInputElement>(null)

  // ── Appearance State (theme + language live in the shared store) ──
  const themeMode = theme
  const selectedLanguage = lang
  const [colorScheme, setColorScheme] = useState<'navy-teal' | 'indigo-blue' | 'emerald-mint' | 'amber-red'>(
    (data.settings.colorScheme as 'navy-teal' | 'indigo-blue' | 'emerald-mint' | 'amber-red' | undefined) ?? 'navy-teal',
  )
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>(
    (data.settings.fontSize as 'sm' | 'md' | 'lg' | undefined) ?? 'md',
  )

  const setThemeMode = (next: 'light' | 'dark' | 'system') => {
    setTheme(next)
    updateSettings({ theme: next })
  }

  const setSelectedLanguage = (next: 'ar' | 'en') => {
    setLang(next)
    updateSettings({ language: next })
  }

  // ── Academic Year State ──
  const activeYear = data.academicYears.find(year => year.id === data.settings.academicYearId)
    ?? data.academicYears.find(year => year.active)
    ?? data.academicYears[0]
  const [academicYear, setAcademicYear] = useState({
    currentYear: activeYear ? `${activeYear.startDate.slice(0, 4)} - ${activeYear.endDate.slice(0, 4)}` : '',
    activeTerm: activeYear?.active ? (arabic ? 'الفصل الدراسي النشط' : 'Active term') : (arabic ? 'غير نشط' : 'Inactive'),
    sem1Start: activeYear?.startDate ?? '',
    sem1End: activeYear ? new Date(new Date(activeYear.startDate).getTime() + 120 * 86400000).toISOString().slice(0, 10) : '',
    sem2Start: activeYear ? new Date(new Date(activeYear.startDate).getTime() + 130 * 86400000).toISOString().slice(0, 10) : '',
    sem2End: activeYear?.endDate ?? '',
    gradingScale: data.settings.gradeScale === 'percentage' ? 'percentage' : data.settings.gradeScale === 'ib7' ? 'custom-ib' : 'letter-af',
  })

  const [calendarEvents, setCalendarEvents] = useState<Array<{ id: number; titleEn: string; titleAr: string; date: string; type: 'exam' | 'holiday' | 'event' }>>(() => {
    const fallback = data.exams
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4)
      .map((exam, index) => ({
        id: index + 1,
        titleEn: exam.nameEn,
        titleAr: exam.nameAr,
        date: exam.date,
        type: 'exam' as const,
      }))
    try {
      const raw = window.localStorage.getItem('smart-school-360:calendar-events:v1')
      if (raw) return JSON.parse(raw) as typeof fallback
    } catch {
      // Fall back to exam milestones from the live registry.
    }
    return fallback
  })

  // ── Security State ──
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(data.settings.twoFactorEnabled ?? false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [activeSessions, setActiveSessions] = useState([
    {
      id: 'current-session',
      device: typeof navigator === 'undefined' ? 'This device' : (navigator.userAgent.includes('Windows') ? 'Windows workstation' : navigator.userAgent.includes('Mac') ? 'Mac workstation' : navigator.platform || 'This device'),
      browser: typeof navigator === 'undefined' ? 'Current browser' : navigator.userAgent.split(') ').pop()?.split(' ').slice(0, 2).join(' ') || 'Current browser',
      ip: '—',
      location: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lastActiveEn: 'Active now (current session)',
      lastActiveAr: 'نشط الآن (الجلسة الحالية)',
      current: true,
      icon: Laptop,
    },
  ])

  // ── Integrations & data sources ──
  const integrations = [
    {
      id: 'workspace',
      nameEn: 'Local workspace storage',
      nameAr: 'مساحة العمل المحلية',
      connected: true,
      descEn: 'All attendance, grades, students and settings are saved in this browser workspace.',
      descAr: 'تُحفظ الحضور والدرجات والطلاب والإعدادات في مساحة عمل المتصفح هذه.',
    },
    {
      id: 'supabase',
      nameEn: 'Supabase database & auth',
      nameAr: 'قاعدة بيانات ومصادقة Supabase',
      connected: false,
      descEn: 'Requires NEXT_PUBLIC_SUPABASE_URL and anon key plus the SQL schema; not configured here.',
      descAr: 'يتطلب متغيرات البيئة ومخطط SQL؛ غير مهيأ في هذه المساحة.',
    },
    {
      id: 'email',
      nameEn: 'Email / SMS delivery gateway',
      nameAr: 'بوابة البريد والرسائل النصية',
      connected: false,
      descEn: 'In-app notifications work; external delivery needs a provider key and server route.',
      descAr: 'الإشعارات داخل التطبيق تعمل؛ الإرسال الخارجي يحتاج مزوداً ومسار خادم.',
    },
    {
      id: 'classroom',
      nameEn: 'Google Classroom / Teams',
      nameAr: 'جوجل كلاس روم / تيمز',
      connected: false,
      descEn: 'Roster sync is not connected; no calendar or grade data is sent externally.',
      descAr: 'المزامنة غير متصلة؛ لا تُرسل بيانات خارجية.',
    },
  ]

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3200)
  }

  const persistCalendar = (events: typeof calendarEvents) => {
    try {
      window.localStorage.setItem('smart-school-360:calendar-events:v1', JSON.stringify(events))
    } catch {
      // Calendar stays in memory when storage is unavailable.
    }
  }

  const handleSave = (section: 'profile' | 'appearance' | 'academic') => {
    setIsSaving(true)
    if (section === 'profile') {
      updateSettings({
        schoolNameEn: schoolData.nameEn.trim(),
        schoolNameAr: schoolData.nameAr.trim(),
        email: schoolData.email.trim(),
        phone: schoolData.phone.trim(),
        website: schoolData.website.trim(),
        addressAr: schoolData.addressAr.trim(),
        addressEn: schoolData.addressEn.trim(),
        accreditationId: schoolData.accreditationId.trim(),
        mottoAr: schoolData.mottoAr.trim(),
        mottoEn: schoolData.mottoEn.trim(),
        principalName: schoolData.principalName.trim(),
        curriculumType: schoolData.curriculumType.trim(),
        logoDataUrl,
      })
    } else if (section === 'appearance') {
      updateSettings({ theme: themeMode, language: selectedLanguage, colorScheme, fontSize })
      try {
        window.localStorage.setItem('smart-school-360:appearance:v1', JSON.stringify({ colorScheme, fontSize }))
      } catch {
        // Appearance preference remains in memory.
      }
    } else {
      const gradeScale = academicYear.gradingScale === 'percentage'
        ? 'percentage'
        : academicYear.gradingScale === 'custom-ib'
          ? 'ib7'
          : 'letters'
      updateSettings({ gradeScale, language: selectedLanguage })
      if (activeYear) updateAcademicYear(activeYear.id, { startDate: academicYear.sem1Start, endDate: academicYear.sem2End })
      persistCalendar(calendarEvents)
    }
    setTimeout(() => {
      setIsSaving(false)
      triggerToast(
        arabic
          ? 'تم حفظ الإعدادات في مساحة العمل.'
          : 'Settings saved to the workspace.',
      )
    }, 300)
  }

  const handleChangePassword = () => {
    if (!user) return
    if (!passwordForm.currentPassword) {
      triggerToast(arabic ? 'أدخل كلمة المرور الحالية.' : 'Enter your current password.')
      return
    }
    if (user.password && user.password !== passwordForm.currentPassword) {
      triggerToast(arabic ? 'كلمة المرور الحالية غير صحيحة.' : 'The current password is incorrect.')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      triggerToast(arabic ? 'كلمة المرور الجديدة يجب أن تكون ٨ أحرف على الأقل.' : 'The new password must be at least 8 characters.')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      triggerToast(arabic ? 'كلمتا المرور غير متطابقتين.' : 'The passwords do not match.')
      return
    }
    updateUser(user.id, { password: passwordForm.newPassword })
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    triggerToast(arabic ? 'تم تحديث كلمة المرور لهذا الحساب.' : 'Your account password was updated.')
  }

  const handleRevokeSession = (sessionId: string) => {
    const target = activeSessions.find(session => session.id === sessionId)
    if (target?.current) {
      triggerToast(arabic ? 'هذه جلستك الحالية؛ استخدم تسجيل الخروج.' : 'This is your current session; use Sign out instead.')
      return
    }
    setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId))
    triggerToast(arabic ? 'تم إنهاء الجلسة المحددة' : 'Session revoked')
  }

  const handleRevokeAllOtherSessions = () => {
    const others = activeSessions.filter(session => !session.current)
    if (others.length === 0) {
      triggerToast(arabic ? 'لا توجد جلسات أخرى مسجلة في مساحة العمل.' : 'No other sessions are recorded in this workspace.')
      return
    }
    setActiveSessions((prev) => prev.filter((s) => s.current))
    triggerToast(arabic ? 'تم إنهاء الجلسات الأخرى.' : 'Other sessions revoked.')
  }

  const downloadWorkspaceBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'smart-school-360-backup-' + new Date().toISOString().slice(0, 10) + '.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    triggerToast(arabic ? 'تم تنزيل نسخة JSON كاملة من مساحة العمل.' : 'Full workspace JSON backup downloaded.')
  }

  const handleResetWorkspace = () => {
    if (!confirm(arabic ? 'سيتم حذف كل التعديلات وإعادة البيانات التجريبية. هل تريد المتابعة؟' : 'This deletes every change and restores the demo dataset. Continue?')) return
    resetDemoData()
    triggerToast(arabic ? 'تمت إعادة تعيين البيانات التجريبية وسيُطلب تسجيل الدخول.' : 'Demo data reset; you will be signed out.')
    setTimeout(() => logout(), 800)
  }

  const tabsConfig: { id: SettingsTab; labelEn: string; labelAr: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'school-profile', labelEn: 'School Profile', labelAr: 'الملف التعريفي للمدرسة', icon: Building2 },
    { id: 'appearance', labelEn: 'Appearance & Theme', labelAr: 'المظهر والتخصيص', icon: Palette },
    { id: 'academic-year', labelEn: 'Academic Year', labelAr: 'العام الأكاديمي والتقويم', icon: Calendar },
    { id: 'security', labelEn: 'Security & Access', labelAr: 'الأمان وحماية الحساب', icon: ShieldCheck },
    { id: 'integrations', labelEn: 'Integrations & APIs', labelAr: 'التكاملات والربط السحابي', icon: Layers },
    { id: 'backup', labelEn: 'Backup & Data Logs', labelAr: 'النسخ الاحتياطي والبيانات', icon: Database },
  ]

  const ChevronIcon = arabic ? ChevronLeft : ChevronRight

  return (
    <div dir={arabic ? 'rtl' : 'ltr'} className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 end-6 z-50 animate-slide-in-right bg-[#182b52] text-white text-[13px] font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 border border-white/10">
          <CheckCircle2 className="size-4 text-[#2dd4bf]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title={arabic ? 'إعدادات النظام والتهيئة' : 'System Settings & Preferences'}
        subtitle={
          arabic
            ? 'تخصيص هوية المدرسة، المظهر والألوان، التقويم الأكاديمي، خيارات الأمان وإدارة الجلسات'
            : 'Configure institution profile, branding, academic milestones, security policies, and backups'
        }
        icon={Settings}
        arabic={arabic}
        breadcrumb={[
          arabic ? 'الرئيسية' : 'Dashboard',
          arabic ? 'الإدارة' : 'Administration',
          arabic ? 'الإعدادات' : 'Settings',
        ]}
      />

      {/* Settings Layout: Left Navigation + Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar (Vertical Tabs) */}
        <aside className="lg:col-span-3 card-base p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
            {arabic ? 'أقسام الإعدادات' : 'Settings Navigation'}
          </div>

          {tabsConfig.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all text-start',
                  isActive
                    ? 'bg-[#182b52] dark:bg-[#19a99a] text-white shadow-sm'
                    : 'text-[#64748b] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-white/[0.04] hover:text-[#182b52] dark:hover:text-white'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={cn(
                      'size-4 shrink-0',
                      isActive ? 'text-white' : 'text-[#19a99a]'
                    )}
                  />
                  <span className="truncate">{arabic ? tab.labelAr : tab.labelEn}</span>
                </div>
                <ChevronIcon
                  className={cn(
                    'size-3.5 shrink-0 opacity-70',
                    isActive ? 'text-white' : 'text-[#94a3b8]'
                  )}
                />
              </button>
            )
          })}
        </aside>

        {/* Settings Panels Area */}
        <div className="lg:col-span-9 space-y-6">
          {/* ── 1. SCHOOL PROFILE PANEL ───────────────────────────────────── */}
          {activeTab === 'school-profile' && (
            <div className="card-base p-5 sm:p-7 space-y-6 animate-fade-in">
              <div className="border-b border-[#e2e8f0] dark:border-white/[0.08] pb-4">
                <h3 className="text-[17px] font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'الملف التعريفي وهوية المدرسة' : 'Institution & School Profile'}
                </h3>
                <p className="text-[12.5px] text-[#64748b] dark:text-[#94a3b8] mt-1">
                  {arabic
                    ? 'تظهر هذه المعلومات في الترويسات الرسمية، الشهادات، الفواتير، وتقارير الطلاب.'
                    : 'Information configured here appears on official transcripts, invoices, and certificates.'}
                </p>
              </div>

              {/* Logo Upload Zone */}
              <div>
                <label className="block text-[12px] font-semibold text-[#182b52] dark:text-white mb-2">
                  {arabic ? 'شعار المدرسة الرسمي (Logo)' : 'Official School Emblem / Logo'}
                </label>
                <div className="flex items-center gap-5 flex-wrap sm:flex-nowrap">
                  {logoDataUrl ? (
                    <img src={logoDataUrl} alt="School logo" className="size-20 rounded-2xl object-cover shadow-md shrink-0" />
                  ) : (
                    <img src="/school-mark.svg" alt="School logo" className="size-20 shrink-0 rounded-2xl bg-[#0f1f3d] p-2 shadow-md" />
                  )}
                  <div className="space-y-1.5 flex-1">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 300 * 1024) {
                          triggerToast(arabic ? 'حجم الشعار يجب ألا يتجاوز ٣٠٠ كيلوبايت لمساحة العمل.' : 'Logo must be under 300 KB for workspace storage.')
                          return
                        }
                        const reader = new FileReader()
                        reader.onload = () => {
                          setLogoDataUrl(String(reader.result))
                          triggerToast(arabic ? 'تم تحميل الشعار. اضغط حفظ لتثبيته.' : 'Logo loaded. Press Save to keep it.')
                        }
                        reader.readAsDataURL(file)
                      }}
                    />
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="btn-secondary h-8 text-[12px] px-3.5"
                      >
                        <Upload className="size-3.5" />
                        <span>{arabic ? 'رفع شعار جديد' : 'Upload New Logo'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLogoDataUrl('')
                          triggerToast(arabic ? 'تمت إزالة الشعار. اضغط حفظ لتثبيت الإزالة.' : 'Logo removed. Press Save to keep it.')
                        }}
                        className="btn-icon size-8 rounded-lg text-[#94a3b8] hover:text-red-500"
                        title={arabic ? 'إزالة الشعار' : 'Remove logo'}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#94a3b8]">
                      {arabic
                        ? 'الصيغ المعتمدة: PNG، SVG، JPG بجودة عالية. الحجم الأقصى: 2 ميجابايت.'
                        : 'Accepted formats: PNG, SVG, JPG. Recommended dimensions: 512x512px. Max: 2MB.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                    {arabic ? 'اسم المدرسة (باللغة الإنجليزية)' : 'School Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={schoolData.nameEn}
                    onChange={(e) => setSchoolData({ ...schoolData, nameEn: e.target.value })}
                    className="ss-input text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                    {arabic ? 'اسم المدرسة (باللغة العربية)' : 'School Name (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={schoolData.nameAr}
                    onChange={(e) => setSchoolData({ ...schoolData, nameAr: e.target.value })}
                    className="ss-input text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                    {arabic ? 'البريد الإلكتروني الرسمي' : 'Official Contact Email'}
                  </label>
                  <input
                    type="email"
                    value={schoolData.email}
                    onChange={(e) => setSchoolData({ ...schoolData, email: e.target.value })}
                    className="ss-input text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                    {arabic ? 'رقم الهاتف الموحد' : 'Central Telephone Line'}
                  </label>
                  <input
                    type="tel"
                    value={schoolData.phone}
                    onChange={(e) => setSchoolData({ ...schoolData, phone: e.target.value })}
                    className="ss-input text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                    {arabic ? 'الموقع الإلكتروني' : 'Official Portal URL'}
                  </label>
                  <input
                    type="url"
                    value={schoolData.website}
                    onChange={(e) => setSchoolData({ ...schoolData, website: e.target.value })}
                    className="ss-input text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                    {arabic ? 'رقم الترخيص والاعتماد الأكاديمي' : 'Accreditation License ID'}
                  </label>
                  <input
                    type="text"
                    value={schoolData.accreditationId}
                    onChange={(e) => setSchoolData({ ...schoolData, accreditationId: e.target.value })}
                    className="ss-input text-[13px]"
                  />
                </div>
              </div>

              {/* Mottos & Address */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                    {arabic ? 'شعار المدرسة التربوي (Motto)' : 'Institutional Motto / Vision Statement'}
                  </label>
                  <input
                    type="text"
                    value={arabic ? schoolData.mottoAr : schoolData.mottoEn}
                    onChange={(e) =>
                      setSchoolData({
                        ...schoolData,
                        [arabic ? 'mottoAr' : 'mottoEn']: e.target.value,
                      })
                    }
                    className="ss-input text-[13px]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                    {arabic ? 'العنوان الجغرافي والمقر الرئيسي' : 'Campus Physical Address'}
                  </label>
                  <input
                    type="text"
                    value={arabic ? schoolData.addressAr : schoolData.addressEn}
                    onChange={(e) =>
                      setSchoolData({
                        ...schoolData,
                        [arabic ? 'addressAr' : 'addressEn']: e.target.value,
                      })
                    }
                    className="ss-input text-[13px]"
                  />
                </div>
              </div>

              {/* Section Footer Actions */}
              <div className="pt-4 border-t border-[#e2e8f0] dark:border-white/[0.08] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSchoolData({
                      nameEn: data.settings.schoolNameEn,
                      nameAr: data.settings.schoolNameAr,
                      accreditationId: data.settings.accreditationId ?? '',
                      mottoEn: data.settings.mottoEn ?? '',
                      mottoAr: data.settings.mottoAr ?? '',
                      email: data.settings.email,
                      phone: data.settings.phone,
                      website: data.settings.website,
                      addressEn: data.settings.addressEn,
                      addressAr: data.settings.addressAr,
                      principalName: data.settings.principalName ?? '',
                      curriculumType: data.settings.curriculumType ?? '',
                    })
                    setLogoDataUrl(data.settings.logoDataUrl ?? '')
                    triggerToast(arabic ? 'تم التراجع عن التعديلات' : 'Changes discarded')
                  }}
                  className="btn-secondary h-9 text-[12px]"
                >
                  {arabic ? 'إلغاء' : 'Discard'}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSave('profile')}
                  className="btn-teal h-9 px-5 text-[12px] shadow-sm flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                  <span>{arabic ? 'حفظ التغييرات' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── 2. APPEARANCE PANEL ───────────────────────────────────────── */}
          {activeTab === 'appearance' && (
            <div className="card-base p-5 sm:p-7 space-y-6 animate-fade-in">
              <div className="border-b border-[#e2e8f0] dark:border-white/[0.08] pb-4">
                <h3 className="text-[17px] font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'تخصيص المظهر وواجهة المستخدم' : 'Theme & Interface Customization'}
                </h3>
                <p className="text-[12.5px] text-[#64748b] dark:text-[#94a3b8] mt-1">
                  {arabic
                    ? 'اختر النمط اللوني، حجم الخط، والوضع المظلم لتجربة استخدام مريحة وممتازة.'
                    : 'Personalize theme mode, primary accent schemes, and typographic scaling.'}
                </p>
              </div>

              {/* Theme Mode Selector */}
              <div>
                <label className="block text-[13px] font-bold text-[#182b52] dark:text-white mb-3">
                  {arabic ? 'وضع الإضاءة (Theme Mode)' : 'Display Theme'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Light */}
                  <div
                    onClick={() => setThemeMode('light')}
                    className={cn(
                      'p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2.5 text-center',
                      themeMode === 'light'
                        ? 'border-[#19a99a] bg-[#19a99a]/5 shadow-sm'
                        : 'border-[#e2e8f0] dark:border-white/[0.08] hover:border-slate-300'
                    )}
                  >
                    <div className="size-11 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Sun className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-[#182b52] dark:text-white">
                        {arabic ? 'الوضع النهاري' : 'Light Mode'}
                      </h4>
                      <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                        {arabic ? 'خلفية ناصعة مريحة للعمل' : 'Crisp high-contrast background'}
                      </p>
                    </div>
                  </div>

                  {/* Dark */}
                  <div
                    onClick={() => setThemeMode('dark')}
                    className={cn(
                      'p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2.5 text-center',
                      themeMode === 'dark'
                        ? 'border-[#19a99a] bg-[#19a99a]/5 shadow-sm'
                        : 'border-[#e2e8f0] dark:border-white/[0.08] hover:border-slate-300'
                    )}
                  >
                    <div className="size-11 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <Moon className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-[#182b52] dark:text-white">
                        {arabic ? 'الوضع الليلي' : 'Dark Mode'}
                      </h4>
                      <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                        {arabic ? 'أزرق كحلي داكن فاخر #0a1628' : 'Deep navy SaaS aesthetic'}
                      </p>
                    </div>
                  </div>

                  {/* System */}
                  <div
                    onClick={() => setThemeMode('system')}
                    className={cn(
                      'p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2.5 text-center',
                      themeMode === 'system'
                        ? 'border-[#19a99a] bg-[#19a99a]/5 shadow-sm'
                        : 'border-[#e2e8f0] dark:border-white/[0.08] hover:border-slate-300'
                    )}
                  >
                    <div className="size-11 rounded-full bg-slate-500/10 text-slate-500 flex items-center justify-center">
                      <Monitor className="size-5" />
                    </div>
                    <div>
                      <h4 className="text-[13px] font-bold text-[#182b52] dark:text-white">
                        {arabic ? 'تلقائي (تفضيل النظام)' : 'System Default'}
                      </h4>
                      <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                        {arabic ? 'يتغير بحسب إعدادات جهازك' : 'Syncs with device OS theme'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Scheme Palettes */}
              <div>
                <label className="block text-[13px] font-bold text-[#182b52] dark:text-white mb-3">
                  {arabic ? 'لوحة الألوان الأساسية (Color Palettes)' : 'Accent Color Scheme'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Palette 1: Navy + Teal */}
                  <div
                    onClick={() => setColorScheme('navy-teal')}
                    className={cn(
                      'p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3',
                      colorScheme === 'navy-teal'
                        ? 'border-[#19a99a] bg-[#19a99a]/5 shadow-sm'
                        : 'border-[#e2e8f0] dark:border-white/[0.08]'
                    )}
                  >
                    <div className="flex -space-x-1.5 rtl:space-x-reverse shrink-0">
                      <span className="size-7 rounded-full bg-[#182b52] border-2 border-white dark:border-[#0f1f3d]" />
                      <span className="size-7 rounded-full bg-[#19a99a] border-2 border-white dark:border-[#0f1f3d]" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-[12.5px] font-bold text-[#182b52] dark:text-white truncate">
                        {arabic ? 'كحلي وتيل' : 'Navy & Teal'}
                      </h5>
                      <span className="text-[10.5px] text-[#94a3b8]">
                        {arabic ? 'النمط الافتراضي' : 'Default Brand'}
                      </span>
                    </div>
                  </div>

                  {/* Palette 2: Purple + Blue */}
                  <div
                    onClick={() => setColorScheme('indigo-blue')}
                    className={cn(
                      'p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3',
                      colorScheme === 'indigo-blue'
                        ? 'border-indigo-500 bg-indigo-500/5 shadow-sm'
                        : 'border-[#e2e8f0] dark:border-white/[0.08]'
                    )}
                  >
                    <div className="flex -space-x-1.5 rtl:space-x-reverse shrink-0">
                      <span className="size-7 rounded-full bg-[#4338ca] border-2 border-white dark:border-[#0f1f3d]" />
                      <span className="size-7 rounded-full bg-[#3b82f6] border-2 border-white dark:border-[#0f1f3d]" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-[12.5px] font-bold text-[#182b52] dark:text-white truncate">
                        {arabic ? 'نيلي وأزرق' : 'Purple & Blue'}
                      </h5>
                      <span className="text-[10.5px] text-[#94a3b8]">Electric Modern</span>
                    </div>
                  </div>

                  {/* Palette 3: Green + Teal */}
                  <div
                    onClick={() => setColorScheme('emerald-mint')}
                    className={cn(
                      'p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3',
                      colorScheme === 'emerald-mint'
                        ? 'border-emerald-500 bg-emerald-500/5 shadow-sm'
                        : 'border-[#e2e8f0] dark:border-white/[0.08]'
                    )}
                  >
                    <div className="flex -space-x-1.5 rtl:space-x-reverse shrink-0">
                      <span className="size-7 rounded-full bg-[#065f46] border-2 border-white dark:border-[#0f1f3d]" />
                      <span className="size-7 rounded-full bg-[#10b981] border-2 border-white dark:border-[#0f1f3d]" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-[12.5px] font-bold text-[#182b52] dark:text-white truncate">
                        {arabic ? 'زمرد ونعناع' : 'Green & Teal'}
                      </h5>
                      <span className="text-[10.5px] text-[#94a3b8]">Eco Academy</span>
                    </div>
                  </div>

                  {/* Palette 4: Orange + Red */}
                  <div
                    onClick={() => setColorScheme('amber-red')}
                    className={cn(
                      'p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3',
                      colorScheme === 'amber-red'
                        ? 'border-amber-500 bg-amber-500/5 shadow-sm'
                        : 'border-[#e2e8f0] dark:border-white/[0.08]'
                    )}
                  >
                    <div className="flex -space-x-1.5 rtl:space-x-reverse shrink-0">
                      <span className="size-7 rounded-full bg-[#ea580c] border-2 border-white dark:border-[#0f1f3d]" />
                      <span className="size-7 rounded-full bg-[#ef4444] border-2 border-white dark:border-[#0f1f3d]" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-[12.5px] font-bold text-[#182b52] dark:text-white truncate">
                        {arabic ? 'برتقالي وأحمر' : 'Orange & Red'}
                      </h5>
                      <span className="text-[10.5px] text-[#94a3b8]">Vibrant Sun</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Font Sizing */}
              <div>
                <label className="block text-[13px] font-bold text-[#182b52] dark:text-white mb-2">
                  {arabic ? 'حجم الخط والقراءة (Typography Scaling)' : 'Font Size Scale'}
                </label>
                <div className="grid grid-cols-3 gap-3 max-w-md">
                  <button
                    type="button"
                    onClick={() => setFontSize('sm')}
                    className={cn(
                      'py-2.5 rounded-xl border-2 text-[12px] font-semibold transition-all',
                      fontSize === 'sm'
                        ? 'border-[#19a99a] bg-[#19a99a]/10 text-[#19a99a]'
                        : 'border-[#e2e8f0] dark:border-white/[0.08] text-[#64748b]'
                    )}
                  >
                    {arabic ? 'صغير (85%)' : 'Compact (Small)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('md')}
                    className={cn(
                      'py-2.5 rounded-xl border-2 text-[13px] font-bold transition-all',
                      fontSize === 'md'
                        ? 'border-[#19a99a] bg-[#19a99a]/10 text-[#19a99a]'
                        : 'border-[#e2e8f0] dark:border-white/[0.08] text-[#64748b]'
                    )}
                  >
                    {arabic ? 'افتراضي (100%)' : 'Default (Medium)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('lg')}
                    className={cn(
                      'py-2.5 rounded-xl border-2 text-[14px] font-extrabold transition-all',
                      fontSize === 'lg'
                        ? 'border-[#19a99a] bg-[#19a99a]/10 text-[#19a99a]'
                        : 'border-[#e2e8f0] dark:border-white/[0.08] text-[#64748b]'
                    )}
                  >
                    {arabic ? 'كبير (115%)' : 'Comfort (Large)'}
                  </button>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-[#19a99a]/15 text-[#19a99a] flex items-center justify-center font-bold">
                    Aa
                  </div>
                  <div>
                    <h5 className="text-[13px] font-bold text-[#182b52] dark:text-white">
                      {arabic ? 'معاينة تجربة القراءة والخط' : 'Live Typography & Theme Preview'}
                    </h5>
                    <p className="text-[11.5px] text-[#64748b] dark:text-[#94a3b8]">
                      {arabic
                        ? 'الحرم الرقمي لمدرسة سان جورج يقدم تجربة تعليمية متميزة تواكب المستقبل.'
                        : 'St. George School Digital Campus delivers excellence across all screens.'}
                    </p>
                  </div>
                </div>
                <Badge variant="teal" size="sm">
                  {arabic ? 'معتمد' : 'Verified'}
                </Badge>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-[#e2e8f0] dark:border-white/[0.08] flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSave('appearance')}
                  className="btn-teal h-9 px-5 text-[12px] shadow-sm flex items-center gap-2"
                >
                  <Save className="size-4" />
                  <span>{arabic ? 'تطبيق وحفظ المظهر' : 'Apply & Save Theme'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── 3. ACADEMIC YEAR PANEL ───────────────────────────────────── */}
          {activeTab === 'academic-year' && (
            <div className="card-base p-5 sm:p-7 space-y-6 animate-fade-in">
              <div className="border-b border-[#e2e8f0] dark:border-white/[0.08] pb-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-[17px] font-bold text-[#182b52] dark:text-white">
                    {arabic ? 'العام الأكاديمي والتقويم المدرسي' : 'Academic Year & Term Schedule'}
                  </h3>
                  <p className="text-[12.5px] text-[#64748b] dark:text-[#94a3b8] mt-1">
                    {arabic
                      ? 'ضبط تواريخ الفصول الدراسية وسلالم احتساب المعدل وجداول الاختبارات'
                      : 'Define semester boundaries, grading schemes, and school calendar milestones'}
                  </p>
                </div>
                <span className="badge-teal px-3 py-1 font-bold text-[12px] rounded-xl">
                  {academicYear.currentYear}
                </span>
              </div>

              {/* Semester Dates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Semester 1 */}
                <div className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13.5px] font-bold text-[#182b52] dark:text-white">
                      {arabic ? 'الفصل الدراسي الأول (Semester 1)' : 'Semester 1 (Fall)'}
                    </h4>
                    <Badge variant="neutral" size="sm">
                      {arabic ? 'مكتمل' : 'Completed'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8] mb-1">
                        {arabic ? 'تاريخ البداية' : 'Start Date'}
                      </label>
                      <input
                        type="date"
                        value={academicYear.sem1Start}
                        onChange={(e) => setAcademicYear({ ...academicYear, sem1Start: e.target.value })}
                        className="ss-input h-9 text-[12px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8] mb-1">
                        {arabic ? 'تاريخ النهاية' : 'End Date'}
                      </label>
                      <input
                        type="date"
                        value={academicYear.sem1End}
                        onChange={(e) => setAcademicYear({ ...academicYear, sem1End: e.target.value })}
                        className="ss-input h-9 text-[12px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Semester 2 */}
                <div className="p-4 rounded-2xl bg-[#19a99a]/5 border border-[#19a99a]/25 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13.5px] font-bold text-[#182b52] dark:text-white">
                      {arabic ? 'الفصل الدراسي الثاني (Semester 2)' : 'Semester 2 (Spring)'}
                    </h4>
                    <Badge variant="teal" size="sm">
                      {arabic ? 'جاري الآن' : 'Active Term'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8] mb-1">
                        {arabic ? 'تاريخ البداية' : 'Start Date'}
                      </label>
                      <input
                        type="date"
                        value={academicYear.sem2Start}
                        onChange={(e) => setAcademicYear({ ...academicYear, sem2Start: e.target.value })}
                        className="ss-input h-9 text-[12px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748b] dark:text-[#94a3b8] mb-1">
                        {arabic ? 'تاريخ النهاية' : 'End Date'}
                      </label>
                      <input
                        type="date"
                        value={academicYear.sem2End}
                        onChange={(e) => setAcademicYear({ ...academicYear, sem2End: e.target.value })}
                        className="ss-input h-9 text-[12px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grading Scheme Selector */}
              <div>
                <label className="block text-[13px] font-bold text-[#182b52] dark:text-white mb-2">
                  {arabic ? 'نظام تقدير وحساب الدرجات المعتمد' : 'Official Grading Scale Framework'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setAcademicYear({ ...academicYear, gradingScale: 'letter-af' })}
                    className={cn(
                      'p-3.5 rounded-2xl border-2 cursor-pointer transition-all',
                      academicYear.gradingScale === 'letter-af'
                        ? 'border-[#19a99a] bg-[#19a99a]/5 shadow-sm'
                        : 'border-[#e2e8f0] dark:border-white/[0.08]'
                    )}
                  >
                    <h5 className="text-[13px] font-bold text-[#182b52] dark:text-white">
                      {arabic ? 'نظام الحروف الأمريكي (A - F)' : 'Standard Letter (A - F / 4.0)'}
                    </h5>
                    <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-1">
                      A+ (97+), A (93+), B+ (87+), B (83+)...
                    </p>
                  </div>

                  <div
                    onClick={() => setAcademicYear({ ...academicYear, gradingScale: 'percentage' })}
                    className={cn(
                      'p-3.5 rounded-2xl border-2 cursor-pointer transition-all',
                      academicYear.gradingScale === 'percentage'
                        ? 'border-[#19a99a] bg-[#19a99a]/5 shadow-sm'
                        : 'border-[#e2e8f0] dark:border-white/[0.08]'
                    )}
                  >
                    <h5 className="text-[13px] font-bold text-[#182b52] dark:text-white">
                      {arabic ? 'النظام المئوي الرقمي (0 - 100%)' : 'Percentage (0 - 100%)'}
                    </h5>
                    <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-1">
                      {arabic ? 'درجات رقمية مباشرة دون تحويل' : 'Exact continuous scoring 0-100%'}
                    </p>
                  </div>

                  <div
                    onClick={() => setAcademicYear({ ...academicYear, gradingScale: 'custom-ib' })}
                    className={cn(
                      'p-3.5 rounded-2xl border-2 cursor-pointer transition-all',
                      academicYear.gradingScale === 'custom-ib'
                        ? 'border-[#19a99a] bg-[#19a99a]/5 shadow-sm'
                        : 'border-[#e2e8f0] dark:border-white/[0.08]'
                    )}
                  >
                    <h5 className="text-[13px] font-bold text-[#182b52] dark:text-white">
                      {arabic ? 'نظام البكالوريا الدولية (IB 1 - 7)' : 'Custom / IB Scale (1 - 7)'}
                    </h5>
                    <p className="text-[11px] text-[#64748b] dark:text-[#94a3b8] mt-1">
                      7 = High Distinction, 4 = Passing grade
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Calendar Milestones */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[13px] font-bold text-[#182b52] dark:text-white">
                    {arabic ? 'محطات التقويم المدرسي والعطل' : 'Upcoming Calendar Milestones'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = calendarEvents.length + 1
                      const next = [
                        ...calendarEvents,
                        {
                          id: newId,
                          titleEn: 'New school milestone',
                          titleAr: 'محطة مدرسية جديدة',
                          date: new Date().toISOString().slice(0, 10),
                          type: 'event' as const,
                        },
                      ]
                      setCalendarEvents(next)
                      persistCalendar(next)
                      triggerToast(arabic ? 'تمت إضافة الحدث إلى تقويم مساحة العمل' : 'Event added to the workspace calendar')
                    }}
                    className="text-[11px] font-semibold text-[#19a99a] hover:underline flex items-center gap-1"
                  >
                    <Plus className="size-3.5" />
                    <span>{arabic ? 'إضافة حدث' : 'Add Event'}</span>
                  </button>
                </div>

                <div className="divide-y divide-[#f1f5f9] dark:divide-white/[0.04] border border-[#e2e8f0] dark:border-white/[0.08] rounded-2xl overflow-hidden">
                  {calendarEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3.5 bg-white dark:bg-[#0f1f3d] flex items-center justify-between hover:bg-[#f8fafc] dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-[#f1f5f9] dark:bg-white/[0.05] text-[#19a99a] flex items-center justify-center">
                          <Calendar className="size-4" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[#182b52] dark:text-white">
                            {arabic ? evt.titleAr : evt.titleEn}
                          </p>
                          <p className="text-[11px] text-[#94a3b8]">{evt.date}</p>
                        </div>
                      </div>
                      <Badge
                        variant={evt.type === 'holiday' ? 'warning' : evt.type === 'exam' ? 'danger' : 'teal'}
                        size="sm"
                      >
                        {evt.type === 'holiday'
                          ? arabic
                            ? 'إجازة رسمية'
                            : 'Holiday'
                          : evt.type === 'exam'
                          ? arabic
                            ? 'اختبارات'
                            : 'Exams'
                          : arabic
                          ? 'فعالية'
                          : 'Milestone'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-[#e2e8f0] dark:border-white/[0.08] flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSave('academic')}
                  className="btn-teal h-9 px-5 text-[12px] shadow-sm flex items-center gap-2"
                >
                  <Save className="size-4" />
                  <span>{arabic ? 'حفظ إعدادات التقويم' : 'Save Calendar Settings'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── 4. SECURITY & ACCESS PANEL ────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="card-base p-5 sm:p-7 space-y-6 animate-fade-in">
              <div className="border-b border-[#e2e8f0] dark:border-white/[0.08] pb-4">
                <h3 className="text-[17px] font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'الأمان وحماية الحسابات والجلسات' : 'Security, Passwords & Sessions'}
                </h3>
                <p className="text-[12.5px] text-[#64748b] dark:text-[#94a3b8] mt-1">
                  {arabic
                    ? 'إدارة معايير كلمات المرور، تفعيل التحقق بخطوتين (2FA)، ومراقبة الجلسات النشطة.'
                    : 'Manage cryptographic credentials, multi-factor authentication, and concurrent active sessions.'}
                </p>
              </div>

              {/* Two-Factor Authentication (2FA) */}
              <div className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.06] flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="size-11 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[#182b52] dark:text-white">
                      {arabic ? 'التحقق بخطوتين (Two-Factor Authentication - 2FA)' : 'Two-Factor Authentication (2FA)'}
                    </h4>
                    <p className="text-[12px] text-[#64748b] dark:text-[#94a3b8] mt-1 leading-relaxed">
                      {arabic
                        ? 'حماية إضافية عبر تطبيق Google Authenticator أو SMS عند تسجيل الدخول من جهاز غير معروف.'
                        : 'Enforces one-time passcode verification on login using mobile authenticator apps.'}
                    </p>
                    {twoFactorEnabled && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#19a99a]">
                        <Check className="size-3.5" />
                        <span>{arabic ? 'تفضيل محفوظ في مساحة العمل — التنفيذ يتطلب مزود مصادقة.' : 'Preference saved in the workspace — enforcement requires an auth provider.'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={twoFactorEnabled}
                    onChange={(e) => {
                      setTwoFactorEnabled(e.target.checked)
                      updateSettings({ twoFactorEnabled: e.target.checked })
                      triggerToast(
                        e.target.checked
                          ? arabic
                            ? 'تم حفظ تفضيل التحقق بخطوتين (يتطلب مزود مصادقة للتنفيذ).'
                            : '2FA preference saved (requires an auth provider to enforce).'
                          : arabic
                          ? 'تم تعطيل تفضيل التحقق بخطوتين.'
                          : '2FA preference disabled.',
                      )
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#e2e8f0] dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#19a99a]" />
                </label>
              </div>

              {/* Password Change Form */}
              <div className="space-y-3.5 pt-2">
                <h4 className="text-[14px] font-bold text-[#182b52] dark:text-white flex items-center gap-2">
                  <Key className="size-4 text-[#19a99a]" />
                  <span>{arabic ? 'تغيير كلمة المرور' : 'Update Master Password'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#64748b] dark:text-[#94a3b8] mb-1">
                      {arabic ? 'كلمة المرور الحالية' : 'Current Password'}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="ss-input text-[13px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#64748b] dark:text-[#94a3b8] mb-1">
                      {arabic ? 'كلمة المرور الجديدة' : 'New Password'}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="ss-input text-[13px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#64748b] dark:text-[#94a3b8] mb-1">
                      {arabic ? 'تأكيد كلمة المرور' : 'Confirm Password'}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="ss-input text-[13px]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#64748b] dark:text-[#94a3b8] pt-1">
                  <span>
                    {arabic
                      ? 'يجب أن تحتوي على ٨ أحرف على الأقل، تتضمن رمزاً ورقماً وحرفاً كبيراً.'
                      : 'Must be at least 8 characters with 1 uppercase, 1 number, and 1 symbol.'}
                  </span>
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    className="btn-secondary h-8 text-[11px] px-3 font-semibold"
                  >
                    {arabic ? 'تحديث كلمة المرور' : 'Change Password'}
                  </button>
                </div>
              </div>

              {/* Active Sessions Management */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[14px] font-bold text-[#182b52] dark:text-white">
                      {arabic ? 'الأجهزة والجلسات النشطة حالياً' : 'Active Authenticated Sessions'}
                    </h4>
                    <p className="text-[11.5px] text-[#64748b] dark:text-[#94a3b8]">
                      {arabic
                        ? 'يمكنك إنهاء أي جلسة غير مرغوب فيها عن بُعد لحماية حسابك.'
                        : 'Review and revoke access from devices currently authenticated to your account.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRevokeAllOtherSessions}
                    className="btn-danger h-8 text-[11.5px] px-3 font-semibold"
                  >
                    <LogOut className="size-3.5" />
                    <span>{arabic ? 'تسجيل الخروج من باقي الأجهزة' : 'Logout All Others'}</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {activeSessions.map((session) => {
                    const DeviceIcon = session.icon
                    return (
                      <div
                        key={session.id}
                        className="p-3.5 rounded-2xl border border-[#e2e8f0] dark:border-white/[0.08] bg-white dark:bg-[#0f1f3d] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-10 rounded-xl bg-[#f1f5f9] dark:bg-white/[0.04] text-[#182b52] dark:text-white flex items-center justify-center shrink-0">
                            <DeviceIcon className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-[13px] font-bold text-[#182b52] dark:text-white truncate">
                                {session.device}
                              </h5>
                              {session.current && (
                                <Badge variant="teal" size="sm">
                                  {arabic ? 'هذا الجهاز' : 'Current'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11.5px] text-[#64748b] dark:text-[#94a3b8] mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{session.browser}</span>
                              <span>•</span>
                              <span>{session.ip}</span>
                              <span>•</span>
                              <span>{session.location}</span>
                            </p>
                          </div>
                        </div>

                        {!session.current && (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(session.id)}
                            className="btn-icon size-8 rounded-lg text-[#94a3b8] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                            title={arabic ? 'إنهاء الجلسة' : 'Revoke session'}
                          >
                            <LogOut className="size-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Login Audit Trail Table */}
              <div className="space-y-2 pt-3">
                <h4 className="text-[14px] font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'سجل محاولات الدخول الأخيرة (Audit Log)' : 'Recent Sign-in History'}
                </h4>
                <div className="overflow-x-auto border border-[#e2e8f0] dark:border-white/[0.08] rounded-2xl">
                  <table className="ss-table text-[12px]">
                    <thead>
                      <tr>
                        <th>{arabic ? 'الوقت والتاريخ' : 'Date & Time'}</th>
                        <th>{arabic ? 'الجهاز والمتصفح' : 'Client & OS'}</th>
                        <th>{arabic ? 'عنوان الـ IP' : 'IP Address'}</th>
                        <th>{arabic ? 'الموقع' : 'Location'}</th>
                        <th className="text-end">{arabic ? 'النتيجة' : 'Result'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{arabic ? 'اليوم، ٠٨:١٤ ص' : 'Today, 08:14 AM'}</td>
                        <td>Chrome 122 (macOS)</td>
                        <td>158.140.220.12</td>
                        <td>Riyadh, SA</td>
                        <td className="text-end">
                          <Badge variant="success" size="sm">
                            {arabic ? 'ناجح' : 'Success'}
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <td>{arabic ? 'أمس، ٠٩:٣٠ م' : 'Yesterday, 09:30 PM'}</td>
                        <td>Safari (iOS 17.3)</td>
                        <td>188.130.40.7</td>
                        <td>Riyadh, SA</td>
                        <td className="text-end">
                          <Badge variant="success" size="sm">
                            {arabic ? 'ناجح' : 'Success'}
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <td>{arabic ? '٢٧ أكتوبر، ٠٣:١٠ م' : 'Oct 27, 03:10 PM'}</td>
                        <td>Firefox 120 (Windows 11)</td>
                        <td>94.200.12.88</td>
                        <td>Dubai, UAE</td>
                        <td className="text-end">
                          <Badge variant="warning" size="sm">
                            {arabic ? 'محاولة محظورة' : 'MFA Required'}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── 5. INTEGRATIONS PANEL ─────────────────────────────────────── */}
          {activeTab === 'integrations' && (
            <div className="card-base p-5 sm:p-7 space-y-6 animate-fade-in">
              <div className="border-b border-[#e2e8f0] dark:border-white/[0.08] pb-4">
                <h3 className="text-[17px] font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'حالة التكاملات ومصادر البيانات' : 'Integrations & Data Sources'}
                </h3>
                <p className="text-[12.5px] text-[#64748b] dark:text-[#94a3b8] mt-1">
                  {arabic
                    ? 'نعرض هنا ما هو متصل فعلياً في مساحة العمل وما يحتاج إعداداً خارجياً. لا يتم إرسال أي بيانات إلى خدمات غير مهيأة.'
                    : 'This page reports what is actually connected and what needs external setup. No data is sent to unconfigured services.'}
                </p>
              </div>

              <div className="space-y-3.5">
                {integrations.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-[#e2e8f0] dark:border-white/[0.08] bg-white dark:bg-[#0f1f3d] flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={cn('size-11 rounded-2xl flex items-center justify-center shrink-0', item.connected ? 'bg-[#19a99a]/10 text-[#19a99a]' : 'bg-slate-500/10 text-slate-500')}>
                        <Layers className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-[14px] font-bold text-[#182b52] dark:text-white">
                            {arabic ? item.nameAr : item.nameEn}
                          </h4>
                          <Badge variant={item.connected ? 'teal' : 'neutral'} size="sm">
                            {item.connected
                              ? (arabic ? 'متصل ونشط' : 'Connected')
                              : (arabic ? 'يحتاج إعداداً' : 'Needs setup')}
                          </Badge>
                        </div>
                        <p className="text-[12px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                          {arabic ? item.descAr : item.descEn}
                        </p>
                      </div>
                    </div>

                    {!item.connected && (
                      <span className="text-[11px] font-semibold text-[#94a3b8] shrink-0">
                        {arabic ? 'غير مهيأ في هذه النسخة' : 'Not configured in this build'}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.06] text-[12px] text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
                {arabic
                  ? 'لربط قاعدة بيانات ومصادقة حقيقية، أضف متغيرات Supabase في ملف .env ثم شغّل مخطط SQL المرفق. لا تضع مفاتيح سرية في كود الواجهة.'
                  : 'To connect a real database and auth, add Supabase environment variables in .env and run the included SQL schema. Never place secret keys in client code.'}
              </div>
            </div>
          )}

          {/* ── 6. BACKUP & DATA LOGS PANEL ───────────────────────────────── */}
          {activeTab === 'backup' && (
            <div className="card-base p-5 sm:p-7 space-y-6 animate-fade-in">
              <div className="border-b border-[#e2e8f0] dark:border-white/[0.08] pb-4">
                <h3 className="text-[17px] font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'النسخ الاحتياطي وبيانات مساحة العمل' : 'Workspace Backup & Data'}
                </h3>
                <p className="text-[12.5px] text-[#64748b] dark:text-[#94a3b8] mt-1">
                  {arabic
                    ? 'تصدير كامل لبيانات مساحة العمل بصيغة JSON، أو إعادة تعيين البيانات التجريبية.'
                    : 'Export the complete workspace dataset as JSON, or reset the demo dataset.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#19a99a]/10 border border-[#19a99a]/25 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-2xl bg-[#19a99a] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Database className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-[#182b52] dark:text-white">
                      {arabic ? 'مساحة العمل المحلية نشطة' : 'Local workspace is active'}
                    </h4>
                    <p className="text-[12px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                      {data.students.length} {arabic ? 'طالباً' : 'students'} • {data.classes.length} {arabic ? 'فصلاً' : 'classes'} • {data.attendance.length} {arabic ? 'سجل حضور' : 'attendance records'} • {data.grades.length} {arabic ? 'درجة' : 'grades'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={downloadWorkspaceBackup}
                  className="btn-teal h-9 px-4 text-[12px] shadow-sm flex items-center gap-2"
                >
                  <Download className="size-4" />
                  <span>{arabic ? 'تنزيل نسخة JSON' : 'Download JSON backup'}</span>
                </button>
              </div>

              <div className="rounded-2xl border border-[#e2e8f0] dark:border-white/[0.08] p-4 space-y-3">
                <h4 className="text-[14px] font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'سجل النشاط والاستيراد' : 'Activity & import log'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03]">
                    <p className="text-[11px] text-[#94a3b8]">{arabic ? 'عمليات مسجلة' : 'Audit events'}</p>
                    <p className="text-lg font-extrabold text-[#182b52] dark:text-white">{data.auditLogs.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03]">
                    <p className="text-[11px] text-[#94a3b8]">{arabic ? 'عمليات استيراد' : 'Imports'}</p>
                    <p className="text-lg font-extrabold text-[#182b52] dark:text-white">{data.importJobs.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03]">
                    <p className="text-[11px] text-[#94a3b8]">{arabic ? 'إشعارات' : 'Notifications'}</p>
                    <p className="text-lg font-extrabold text-[#182b52] dark:text-white">{data.notifications.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03]">
                    <p className="text-[11px] text-[#94a3b8]">{arabic ? 'تنبيهات AI' : 'AI alerts'}</p>
                    <p className="text-lg font-extrabold text-[#182b52] dark:text-white">{data.aiAlerts.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="text-[13.5px] font-bold text-red-600 dark:text-red-400">
                    {arabic ? 'إعادة تعيين البيانات التجريبية' : 'Reset demo data'}
                  </h4>
                  <p className="text-[11.5px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                    {arabic ? 'يحذف كل التعديلات المحلية ويعيد البيانات الأصلية.' : 'Deletes every local change and restores the original dataset.'}
                  </p>
                </div>
                <button type="button" onClick={handleResetWorkspace} className="btn-secondary h-9 px-4 text-[12px] text-red-600 border-red-500/30">
                  <RefreshCw className="size-4" />
                  <span>{arabic ? 'إعادة تعيين' : 'Reset workspace'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
