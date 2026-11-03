'use client'

import { useCallback, useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { LoginScreen } from '@/components/app/LoginScreen'
import { SetupWizard } from '@/components/setup/SetupWizard'
import { PublicWebsite } from '@/components/public/PublicWebsite'
import { useSchool } from '@/lib/school/store'
import { canAccess, homePageFor, notificationUnread, type PageId } from '@/lib/school/engine'

import { AdminDashboard } from '@/components/pages/AdminDashboard'
import { TeacherDashboard } from '@/components/pages/TeacherDashboard'
import { ParentPortal } from '@/components/pages/ParentPortal'
import { StudentPortal } from '@/components/pages/StudentPortal'
import { StudentsPage } from '@/components/pages/StudentsPage'
import { ClassesPage } from '@/components/pages/ClassesPage'
import { AttendancePage } from '@/components/pages/AttendancePage'
import { ExamsPage } from '@/components/pages/ExamsPage'
import { AICenter } from '@/components/pages/AICenter'
import { ReportsPage } from '@/components/pages/ReportsPage'
import { NotificationsPage } from '@/components/pages/NotificationsPage'
import { UsersPage } from '@/components/pages/UsersPage'
import { SettingsPage } from '@/components/pages/SettingsPage'
import { ImportExportPage } from '@/components/pages/ImportExportPage'

type PageComponent = React.ComponentType<{ arabic?: boolean }>

const pageMap: Record<PageId, PageComponent> = {
  'admin-dashboard': AdminDashboard,
  'teacher-dashboard': TeacherDashboard,
  'parent-portal': ParentPortal,
  'student-portal': StudentPortal,
  students: StudentsPage,
  classes: ClassesPage,
  attendance: AttendancePage,
  exams: ExamsPage,
  'ai-center': AICenter,
  reports: ReportsPage,
  notifications: NotificationsPage,
  users: UsersPage,
  settings: SettingsPage,
  'import-export': ImportExportPage,
}

export function AppRoot() {
  const { data, user, ready, setupRequired, lang, theme, setLang, setTheme, logout, refreshWorkspace } = useSchool()
  const [currentPage, setCurrentPage] = useState<PageId>('admin-dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  /* Set the landing page when a user signs in. */
  useEffect(() => {
    if (!user) return
    const hash = window.location.hash.replace('#', '') as PageId
    const next = hash && canAccess(user.role, hash) ? hash : homePageFor(user.role)
    setCurrentPage(next)
  }, [user])

  useEffect(() => {
    if (!user) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshWorkspace()
    }, 15000)
    return () => window.clearInterval(timer)
  }, [user?.id, refreshWorkspace])

  /* Hash based navigation keeps pages linkable and browser-back friendly. */
  useEffect(() => {
    if (!user) {
      if (window.location.hash === '#login') {
        setShowLogin(true)
      }
      return
    }
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '') as PageId
      if (hash && canAccess(user.role, hash)) {
        setCurrentPage(hash)
        setSidebarOpen(false)
      }
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [user])

  const navigate = useCallback((page: PageId) => {
    if (!user || !canAccess(user.role, page)) return
    setCurrentPage(page)
    setSidebarOpen(false)
    if (window.location.hash !== `#${page}`) {
      window.location.hash = page
    }
    const main = document.querySelector('main')
    main?.scrollTo({ top: 0 })
  }, [user])

  // While checking database state, show clean loader
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071120] text-slate-200">
        <div className="text-center space-y-3">
          <img src="/school-mark.svg" alt="" className="mx-auto size-12 animate-pulse" />
          <p className="text-xs font-semibold text-slate-400">St. George School Digital Campus</p>
        </div>
      </div>
    )
  }

  // First-run: Setup Wizard
  if (setupRequired) {
    return <SetupWizard />
  }

  // Visitor: Not logged in
  if (!user) {
    if (showLogin) {
      return <LoginScreen onBackToPublic={() => setShowLogin(false)} />
    }
    return <PublicWebsite onOpenLogin={() => setShowLogin(true)} />
  }

  // Authenticated Portal
  const CurrentPage = pageMap[currentPage] ?? AdminDashboard
  const unread = notificationUnread(data, user)
  const openAlerts = (data?.aiAlerts || []).filter(a => a.status === 'open').length
  const displayName = lang === 'ar' ? user.nameAr : user.nameEn

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-[#f4f6fa] transition-colors duration-300 dark:bg-[#071120]">
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => {
          if (window.innerWidth < 1024) {
            setSidebarOpen(false)
          } else {
            setSidebarCollapsed(v => !v)
          }
        }}
        arabic={lang === 'ar'}
        role={user.role}
        userName={displayName}
        unreadNotifications={unread}
        openAlerts={openAlerts}
        onProfile={() => navigate('settings')}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          arabic={lang === 'ar'}
          darkMode={theme === 'dark'}
          currentPage={currentPage}
          onMenuToggle={() => setSidebarOpen(v => !v)}
          onToggleArabic={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          onToggleDark={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onNavigate={navigate}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="page-enter min-h-full">
            <CurrentPage arabic={lang === 'ar'} />
          </div>
        </main>
      </div>
    </div>
  )
}
