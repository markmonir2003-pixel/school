'use client'

import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Settings2,
  Shield,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users2,
  X,
} from 'lucide-react'
import { canAccess, ROLE_LABELS, type PageId } from '@/lib/school/engine'
import type { Role } from '@/lib/school/types'

interface NavItem {
  id: PageId
  labelAr: string
  labelEn: string
  icon: React.ComponentType<{ className?: string }>
  badge?: 'notifications' | 'ai'
}

interface NavSection {
  titleAr: string
  titleEn: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    titleAr: 'لوحات التحكم',
    titleEn: 'Dashboards',
    items: [
      { id: 'admin-dashboard', labelAr: 'صفحة الإدارة', labelEn: 'Administration', icon: LayoutDashboard },
      { id: 'teacher-dashboard', labelAr: 'لوحة المعلمين', labelEn: 'Teacher Workspace', icon: GraduationCap },
      { id: 'parent-portal', labelAr: 'بوابة الأولياء', labelEn: 'Parent Portal', icon: MessageSquare },
      { id: 'student-portal', labelAr: 'بوابة الطلاب', labelEn: 'Student Portal', icon: UserCheck },
    ],
  },
  {
    titleAr: 'الإدارة الأكاديمية',
    titleEn: 'Academics',
    items: [
      { id: 'students', labelAr: 'إدارة الطلاب', labelEn: 'Students', icon: Users2 },
      { id: 'classes', labelAr: 'الفصول والمواد', labelEn: 'Classes & Subjects', icon: BookOpen },
      { id: 'attendance', labelAr: 'الحضور والانصراف', labelEn: 'Attendance', icon: ClipboardCheck },
      { id: 'exams', labelAr: 'الاختبارات والدرجات', labelEn: 'Exams & Grades', icon: BarChart3 },
    ],
  },
  {
    titleAr: 'التحليلات والذكاء',
    titleEn: 'Analytics & AI',
    items: [
      { id: 'ai-center', labelAr: 'مركز الذكاء الاصطناعي', labelEn: 'AI Intelligence', icon: Sparkles, badge: 'ai' },
      { id: 'reports', labelAr: 'التقارير والتحليلات', labelEn: 'Reports', icon: TrendingUp },
      { id: 'notifications', labelAr: 'الإشعارات', labelEn: 'Notifications', icon: Bell, badge: 'notifications' },
    ],
  },
  {
    titleAr: 'النظام',
    titleEn: 'System',
    items: [
      { id: 'users', labelAr: 'المستخدمون والأدوار', labelEn: 'Users & Roles', icon: Shield },
      { id: 'import-export', labelAr: 'استيراد وتصدير', labelEn: 'Import & Export', icon: FileSpreadsheet },
      { id: 'settings', labelAr: 'الإعدادات', labelEn: 'Settings', icon: Settings2 },
    ],
  },
]

/** Role navigation overrides */
const roleNavOverride: Partial<Record<Role, PageId[]>> = {
  super_admin: ['admin-dashboard', 'users', 'students', 'classes', 'attendance', 'exams', 'reports', 'notifications', 'settings'],
  parent: ['parent-portal', 'notifications'],
  student: ['student-portal', 'notifications'],
  teacher: ['teacher-dashboard', 'exams', 'notifications'],
  principal: ['notifications'],
  librarian: ['notifications'],
  accountant: ['notifications'],
  staff: ['notifications'],
}

interface SidebarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  open: boolean
  collapsed: boolean
  onToggleCollapse: () => void
  arabic: boolean
  role: Role
  userName: string
  unreadNotifications: number
  openAlerts: number
  onProfile: () => void
}

export function Sidebar({
  currentPage,
  onNavigate,
  open,
  collapsed,
  onToggleCollapse,
  arabic,
  role,
  userName,
  unreadNotifications,
  openAlerts,
  onProfile,
}: SidebarProps) {
  const dir = arabic ? 'rtl' : 'ltr'
  const allowed = roleNavOverride[role]

  const visibleSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item =>
        (allowed ? allowed.includes(item.id) : true) && canAccess(role, item.id),
      ),
    }))
    .filter(section => section.items.length > 0)

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onToggleCollapse}
          aria-hidden="true"
        />
      )}

      <aside
        dir={dir}
        className={`
          fixed inset-y-0 z-50 flex flex-col
          bg-[#0a1628] dark:bg-[#050b14]
          transition-all duration-300 ease-in-out
          lg:relative lg:z-auto
          ${arabic ? 'right-0 border-l border-white/[0.08]' : 'left-0 border-r border-white/[0.08]'}
          ${open
            ? 'translate-x-0 opacity-100'
            : arabic
              ? 'translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100'
              : '-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100'
          }
          ${collapsed ? 'w-[72px]' : 'w-[260px]'}
        `}
        aria-label={arabic ? 'القائمة الجانبية' : 'Sidebar navigation'}
      >
        {/* Brand Header */}
        <div className={`flex h-[68px] shrink-0 items-center border-b border-white/[0.08] px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <button
            onClick={() => onNavigate(role === 'parent' ? 'parent-portal' : role === 'student' ? 'student-portal' : role === 'teacher' ? 'teacher-dashboard' : 'admin-dashboard')}
            className="flex min-w-0 items-center gap-3 text-start group focus:outline-none"
          >
            <img src="/school-mark.svg" alt="" className="size-10 shrink-0 drop-shadow-[0_4px_12px_rgba(197,160,89,0.2)] transition-transform group-hover:scale-105" />
            {!collapsed && (
              <div className="min-w-0 animate-fade-in">
                <p className="text-[14px] font-black leading-tight tracking-tight text-white truncate">
                  {arabic ? 'مدرسة سان جورج' : 'ST. GEORGE SCHOOL'}
                </p>
                <p className="text-[10px] font-bold tracking-[0.14em] text-[#c5a059] uppercase">
                  {arabic ? 'الحرم الرقمي' : 'DIGITAL CAMPUS'}
                </p>
              </div>
            )}
          </button>

          <button
            onClick={onToggleCollapse}
            className="hidden size-7 shrink-0 items-center justify-center rounded-lg text-[#c5a059] transition-colors hover:bg-white/[0.08] hover:text-white lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? (arabic ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />)
              : (arabic ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />)
            }
          </button>
          <button
            onClick={onToggleCollapse}
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-none">
          {visibleSections.map((section, sIndex) => (
            <div key={sIndex}>
              {!collapsed && (
                <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {arabic ? section.titleAr : section.titleEn}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map(item => {
                  const active = currentPage === item.id
                  const Icon = item.icon
                  const badgeValue =
                    item.badge === 'notifications'
                      ? unreadNotifications
                      : item.badge === 'ai'
                        ? openAlerts
                        : 0

                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all
                        ${collapsed ? 'justify-center px-0' : ''}
                        ${active
                          ? 'bg-gradient-to-r from-[#c5a059] to-[#b38f45] text-[#071120] font-bold shadow-md shadow-[#c5a059]/20'
                          : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                        }
                      `}
                      title={collapsed ? (arabic ? item.labelAr : item.labelEn) : undefined}
                    >
                      <Icon className={`size-4 shrink-0 ${active ? 'text-[#071120]' : 'text-[#c5a059]'}`} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-start truncate">
                            {arabic ? item.labelAr : item.labelEn}
                          </span>
                          {badgeValue > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                              active
                                ? 'bg-[#071120] text-[#c5a059]'
                                : 'bg-[#c5a059] text-[#071120]'
                            }`}>
                              {badgeValue}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Card in Footer */}
        <div className="p-3 border-t border-white/[0.08]">
          <div
            onClick={onProfile}
            className={`flex items-center gap-3 p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer ${
              collapsed ? 'justify-center p-1.5' : ''
            }`}
          >
            <div className="size-8 rounded-lg bg-gradient-to-br from-[#c5a059] to-[#9a7836] text-[#071120] flex items-center justify-center font-bold text-xs shrink-0">
              {userName ? userName.slice(0, 1).toUpperCase() : 'U'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 text-start">
                <p className="text-xs font-bold text-white truncate">{userName}</p>
                <p className="text-[10px] text-[#c5a059] font-medium truncate">
                  {ROLE_LABELS[role]?.[arabic ? 'ar' : 'en'] || role}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
