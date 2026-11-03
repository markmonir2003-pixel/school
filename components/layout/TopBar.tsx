'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bell,
  BookOpen,
  CheckCheck,
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings2,
  Sun,
  Users2,
  X,
} from 'lucide-react'
import type { PageId } from '@/lib/school/engine'
import { ROLE_LABELS, notificationUnread, relativeTime, visibleNotifications } from '@/lib/school/engine'
import { useSchool } from '@/lib/school/store'

interface TopBarProps {
  arabic: boolean
  darkMode: boolean
  currentPage: PageId
  onMenuToggle: () => void
  onToggleArabic: () => void
  onToggleDark: () => void
  onNavigate: (page: PageId) => void
}

const pageTitles: Record<PageId, { ar: string; en: string }> = {
  'admin-dashboard': { ar: 'نظرة عامة على المدرسة', en: 'School Overview' },
  'teacher-dashboard': { ar: 'لوحة تحكم المعلمين', en: 'Teacher Workspace' },
  'parent-portal': { ar: 'بوابة أولياء الأمور', en: 'Parent Portal' },
  'student-portal': { ar: 'بوابة الطلاب', en: 'Student Portal' },
  students: { ar: 'إدارة الطلاب', en: 'Student Management' },
  classes: { ar: 'الفصول والمواد الدراسية', en: 'Classes & Subjects' },
  attendance: { ar: 'الحضور والانصراف', en: 'Attendance' },
  exams: { ar: 'الاختبارات والدرجات', en: 'Exams & Grades' },
  'ai-center': { ar: 'مركز الذكاء الاصطناعي', en: 'AI Intelligence Center' },
  reports: { ar: 'التقارير والتحليلات', en: 'Reports & Analytics' },
  notifications: { ar: 'الإشعارات', en: 'Notifications' },
  users: { ar: 'المستخدمون والأدوار', en: 'Users & Roles' },
  'import-export': { ar: 'استيراد وتصدير البيانات', en: 'Import & Export' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
}

const resultIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  student: Users2,
  class: BookOpen,
  teacher: GraduationCap,
  exam: BookOpen,
  course: BookOpen,
  library: BookOpen,
}

export function TopBar({ arabic, darkMode, currentPage, onMenuToggle, onToggleArabic, onToggleDark, onNavigate }: TopBarProps) {
  const { data, user, logout, markNotificationRead, markAllNotificationsRead, search } = useSchool()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileSearch, setMobileSearch] = useState(false)
  const searchWrap = useRef<HTMLDivElement>(null)
  const mobileSearchWrap = useRef<HTMLDivElement>(null)

  const title = pageTitles[currentPage]
  const notifications = visibleNotifications(data, user)
  const unread = notificationUnread(data, user)
  const results = useMemo(() => search(searchQuery).slice(0, 8), [search, searchQuery])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (!searchWrap.current?.contains(target) && !mobileSearchWrap.current?.contains(target)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const greeting = (() => {
    const hour = new Date().getHours()
    if (arabic) return hour < 12 ? 'صباح الخير' : 'مساء الخير'
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  })()

  const date = new Date().toLocaleDateString(arabic ? 'ar-EG' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const goToResult = (type: string) => {
    const page: PageId = type === 'student' ? 'students' : type === 'class' ? 'classes' : type === 'teacher' ? 'users' : 'exams'
    onNavigate(page)
    setSearchOpen(false)
    setSearchQuery('')
    setMobileSearch(false)
  }

  const openNotification = (id: string, link?: string) => {
    markNotificationRead(id)
    if (link) onNavigate(link as PageId)
    setNotifOpen(false)
  }

  const searchBox = (
    <div className="relative w-full">
      <Search
        className="pointer-events-none absolute top-1/2 size-3.5 -translate-y-1/2 text-[#94a3b8]"
        style={{ [arabic ? 'right' : 'left']: 12 }}
      />
      <input
        type="search"
        value={searchQuery}
        onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
        onFocus={() => setSearchOpen(true)}
        placeholder={arabic ? 'ابحث عن طالب، فصل، معلم...' : 'Search students, classes, teachers...'}
        className="h-9 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[13px] text-[#1a2540] outline-none transition placeholder:text-[#94a3b8] focus:border-[#19a99a]/50 focus:bg-white focus:ring-2 focus:ring-[#19a99a]/10 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:focus:bg-white/[0.06]"
        style={{ paddingInlineStart: 36, paddingInlineEnd: 14 }}
      />
      {searchOpen && searchQuery.trim() && (
        <div className="absolute top-full z-50 mt-2 w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#0f1f3d]" style={{ [arabic ? 'right' : 'left']: 0 }}>
          <div className="flex items-center justify-between border-b border-[#f1f5f9] px-3 py-2 dark:border-white/[0.06]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
              {arabic ? 'نتائج البحث' : 'Search results'}
            </span>
            <span className="text-[10px] text-[#94a3b8]">{results.length}</span>
          </div>
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px] text-[#94a3b8]">
              {arabic ? 'لا توجد نتائج مطابقة' : 'No matching results'}
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map(result => {
                const Icon = resultIcon[result.type]
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      onClick={() => goToResult(result.type)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-start transition hover:bg-[#f8fafc] dark:hover:bg-white/[0.04]"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#f0fdfa] text-[#0d9488] dark:bg-[#19a99a]/10 dark:text-[#2dd4bf]">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-[#1a2540] dark:text-white">
                          {arabic ? result.labelAr : result.labelEn}
                        </span>
                        <span className="block truncate text-[10px] text-[#94a3b8]">
                          {arabic ? result.metaAr : result.metaEn}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )

  return (
    <header className="topbar-shell relative z-30 shrink-0 border-b border-slate-200/80 bg-white/90 shadow-[0_4px_20px_rgba(15,31,61,.035)] backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#0b1930]/95">
      <div className="mx-auto flex min-h-[78px] w-full items-center gap-3 px-3 sm:px-5 xl:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
          <button
            onClick={onMenuToggle}
            className="topbar-icon shrink-0 lg:hidden"
            aria-label={arabic ? 'فتح القائمة' : 'Open menu'}
          >
            <Menu className="size-[18px]" />
          </button>
          <div className="hidden size-11 shrink-0 items-center justify-center rounded-2xl bg-[#f1f5f9] text-[#183456] ring-1 ring-slate-200/70 dark:bg-white/[0.06] dark:text-[#d9c08c] dark:ring-white/[0.08] sm:flex">
            <GraduationCap className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="hidden truncate text-[10px] font-bold uppercase tracking-[.16em] text-[#ad8745] sm:block">
              {arabic ? title.ar : title.en}
            </p>
            <h1 className="truncate text-[14px] font-bold leading-tight text-[#172b4d] dark:text-white sm:mt-1 sm:text-[15px]">
              <span className="hidden sm:inline">{greeting}، {user ? (arabic ? user.nameAr.split(' ')[0] : user.nameEn.split(' ')[0]) : ''} 👋</span>
              <span className="sm:hidden">{arabic ? title.ar : title.en}</span>
            </h1>
            <p className="mt-1 hidden truncate text-[11px] text-slate-500 dark:text-slate-400 sm:block">{date}</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400 sm:hidden">{user ? ROLE_LABELS[user.role][arabic ? 'ar' : 'en'] : ''}</p>
          </div>
        </div>

        <div ref={searchWrap} className="hidden w-full max-w-[390px] flex-1 lg:block">
          {searchBox}
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/75 p-1 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.035] sm:gap-1.5 sm:p-1.5">
          <button
            onClick={() => setMobileSearch(v => !v)}
            className={`topbar-icon lg:hidden ${mobileSearch ? 'text-[#0d9488] dark:text-[#2dd4bf]' : ''}`}
            aria-label={arabic ? 'بحث' : 'Search'}
            aria-expanded={mobileSearch}
          >
            {mobileSearch ? <X className="size-4" /> : <Search className="size-4" />}
          </button>

          <button onClick={onToggleArabic} className="topbar-icon w-auto min-w-9 px-2 text-[11px] font-bold" aria-label="Switch language">
            {arabic ? 'EN' : 'عربي'}
          </button>
          <span className="hidden h-6 w-px bg-slate-200 dark:bg-white/10 sm:block" />
          <button onClick={onToggleDark} className="topbar-icon" aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
            {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <span className="hidden h-6 w-px bg-slate-200 dark:bg-white/10 sm:block" />

          <div className="relative">
            <button
              onClick={() => { setNotifOpen(v => !v); setProfileOpen(false) }}
              className={`topbar-icon relative ${notifOpen ? 'bg-[#f0fdfa] text-[#0d9488] dark:bg-[#19a99a]/10 dark:text-[#2dd4bf]' : ''}`}
              aria-label={arabic ? 'الإشعارات' : 'Notifications'}
              aria-expanded={notifOpen}
            >
              <Bell className="size-4" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-0.5 text-[9px] font-bold text-white dark:border-[#13223a]">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} aria-hidden />
                <div className="absolute top-full z-50 mt-3 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,31,61,.18)] animate-slide-down dark:border-white/[0.08] dark:bg-[#0f1f3d]" style={{ [arabic ? 'left' : 'right']: 0 }}>
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/[0.06]">
                    <div>
                      <h3 className="text-sm font-bold text-[#1a2540] dark:text-white">{arabic ? 'الإشعارات' : 'Notifications'}</h3>
                      <p className="mt-0.5 text-[10px] text-slate-400">{unread} {arabic ? 'غير مقروء' : 'unread'}</p>
                    </div>
                    {unread > 0 && (
                      <button onClick={markAllNotificationsRead} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-[#0d9488] hover:bg-[#f0fdfa] dark:text-[#2dd4bf] dark:hover:bg-[#19a99a]/10">
                        <CheckCheck className="size-3.5" />
                        {arabic ? 'تحديد الكل كمقروء' : 'Mark all read'}
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-white/[0.05]">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-[12px] text-slate-400">{arabic ? 'لا توجد إشعارات بعد' : 'No notifications yet'}</p>
                    ) : notifications.slice(0, 6).map(notification => (
                      <button key={notification.id} onClick={() => openNotification(notification.id, notification.link)} className={`flex w-full gap-3 px-4 py-3 text-start transition hover:bg-slate-50 dark:hover:bg-white/[0.03] ${notification.read ? 'opacity-65' : ''}`}>
                        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.category === 'attendance' ? 'bg-amber-400' : notification.category === 'ai' ? 'bg-red-400' : notification.category === 'academic' ? 'bg-blue-400' : 'bg-teal-400'}`} />
                        <span className="min-w-0">
                          <span className="block text-[12px] font-semibold text-[#334155] dark:text-[#e2e8f0]">{arabic ? notification.titleAr : notification.titleEn}</span>
                          <span className="mt-0.5 line-clamp-2 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{arabic ? notification.bodyAr : notification.bodyEn}</span>
                          <span className="mt-1 block text-[10px] text-slate-400">{relativeTime(notification.createdAt, arabic ? 'ar' : 'en')}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 p-2 dark:border-white/[0.06]">
                    <button onClick={() => { setNotifOpen(false); onNavigate('notifications') }} className="w-full rounded-xl py-2 text-[11px] font-bold text-[#0d9488] transition hover:bg-[#f0fdfa] dark:text-[#2dd4bf] dark:hover:bg-[#19a99a]/10">
                      {arabic ? 'عرض كل الإشعارات' : 'View all notifications'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => { setProfileOpen(v => !v); setNotifOpen(false) }}
              className={`flex min-h-9 items-center gap-2 rounded-xl px-1.5 transition hover:bg-slate-50 dark:hover:bg-white/[0.06] sm:pl-1 ${profileOpen ? 'bg-slate-50 dark:bg-white/[0.06]' : ''}`}
              aria-label={arabic ? 'قائمة الحساب' : 'Account menu'}
              aria-expanded={profileOpen}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#183456] to-[#267c7c] text-xs font-bold text-white shadow-sm ring-2 ring-white dark:ring-[#13223a]">
                {user?.nameAr.slice(0, 1) ?? 'م'}
              </span>
              <span className="hidden max-w-28 text-start lg:block">
                <span className="block truncate text-[11px] font-bold leading-tight text-slate-700 dark:text-slate-100">{user && (arabic ? user.nameAr : user.nameEn)}</span>
                <span className="mt-0.5 block truncate text-[9px] text-slate-400">{user ? ROLE_LABELS[user.role][arabic ? 'ar' : 'en'] : ''}</span>
              </span>
              <ChevronDown className={`hidden size-3.5 text-slate-400 transition-transform lg:block ${profileOpen ? 'rotate-180' : ''}`} />
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} aria-hidden />
                <div className="absolute top-full z-50 mt-3 w-[min(280px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,31,61,.18)] animate-slide-down dark:border-white/[0.08] dark:bg-[#0f1f3d]" style={{ [arabic ? 'left' : 'right']: 0 }}>
                  <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 dark:border-white/[0.06] dark:bg-white/[0.025]">
                    <p className="truncate text-[13px] font-bold text-[#1a2540] dark:text-white">{user && (arabic ? user.nameAr : user.nameEn)}</p>
                    <p className="mt-1 truncate text-[10px] text-slate-500 dark:text-slate-400">{user?.email}</p>
                    <span className="mt-2 inline-flex rounded-full bg-[#f0fdfa] px-2.5 py-1 text-[9px] font-bold text-[#0d9488] dark:bg-[#19a99a]/10 dark:text-[#2dd4bf]">{user ? ROLE_LABELS[user.role][arabic ? 'ar' : 'en'] : ''}</span>
                  </div>
                  <div className="space-y-0.5 p-2">
                    <button onClick={() => { setProfileOpen(false); onNavigate('settings') }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-[12px] text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.04]">
                      <Settings2 className="size-4 text-slate-400" /> {arabic ? 'إعدادات الحساب' : 'Account settings'}
                    </button>
                    <button onClick={() => { setProfileOpen(false); onNavigate('notifications') }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-[12px] text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.04]">
                      <Bell className="size-4 text-slate-400" /> {arabic ? 'الإشعارات' : 'Notifications'}
                    </button>
                    <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-[12px] font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
                      <LogOut className="size-4" /> {arabic ? 'تسجيل الخروج' : 'Sign out'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {mobileSearch && (
        <div ref={mobileSearchWrap} className="border-t border-slate-100 bg-white/80 px-3 py-3 dark:border-white/[0.06] dark:bg-[#0b1930]/90 sm:px-5 lg:hidden">
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 px-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
            {searchBox}
          </div>
        </div>
      )}
    </header>
  )
}
