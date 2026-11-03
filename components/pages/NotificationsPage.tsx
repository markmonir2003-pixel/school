'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  Bell,
  CheckCheck,
  Settings,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  Award,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  SlidersHorizontal,
  Mail,
  Smartphone,
  MessageCircle,
  Volume2,
  Moon,
  ArrowUpRight,
  Check,
  RefreshCw,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/shared/Badge'
import { cn } from '@/lib/utils'
import { useSchool } from '@/lib/school/store'
import { ROLE_LABELS, relativeTime, visibleNotifications } from '@/lib/school/engine'
import type { NotificationCategory } from '@/lib/school/types'

export type NotificationType =
  | 'attendance-alert'
  | 'grade-update'
  | 'system'
  | 'parent-message'
  | 'ai-insight'

export interface NotificationItem {
  id: string
  type: NotificationType
  titleEn: string
  titleAr: string
  descEn: string
  descAr: string
  timeEn: string
  timeAr: string
  read: boolean
  urgent?: boolean
  actionUrl?: string
  actionLabelEn?: string
  actionLabelAr?: string
  meta?: string
}

export function NotificationsPage({ arabic = false }: { arabic?: boolean }) {
  const { data, user, markNotificationRead, markAllNotificationsRead, deleteNotification, addNotification } = useSchool()
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'academic' | 'attendance' | 'system'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [composeTitle, setComposeTitle] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [visibleLimit, setVisibleLimit] = useState(12)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Notification Preferences State
  const [prefs, setPrefs] = useState({
    attendanceEmail: true,
    attendanceSms: true,
    attendancePush: true,
    gradesEmail: true,
    gradesSms: false,
    gradesPush: true,
    systemEmail: true,
    systemSms: false,
    systemPush: true,
    parentEmail: true,
    parentSms: false,
    parentPush: true,
    aiEmail: false,
    aiSms: false,
    aiPush: true,
    soundEnabled: true,
    quietHours: true,
  })

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('smart-school-360:notification-prefs:v1')
      if (raw) setPrefs(prev => ({ ...prev, ...(JSON.parse(raw) as Partial<typeof prev>) }))
    } catch {
      // Keep the defaults when stored preferences cannot be read.
    }
  }, [])

  const typeForCategory = (category: NotificationCategory): NotificationType => {
    if (category === 'attendance') return 'attendance-alert'
    if (category === 'academic' || category === 'homework') return 'grade-update'
    if (category === 'ai') return 'ai-insight'
    if (category === 'message' || category === 'announcement') return 'parent-message'
    return 'system'
  }

  const notifications = useMemo<NotificationItem[]>(() => {
    return visibleNotifications(data, user)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(notification => {
        const read = notification.read || (notification.readBy ?? []).includes(user?.id ?? '')
        const roleLabel = notification.recipientRole && notification.recipientRole !== 'all'
          ? ROLE_LABELS[notification.recipientRole][arabic ? 'ar' : 'en']
          : (arabic ? 'الجميع' : 'Everyone')
        return {
          id: notification.id,
          type: typeForCategory(notification.category),
          titleAr: notification.titleAr,
          titleEn: notification.titleEn,
          descAr: notification.bodyAr,
          descEn: notification.bodyEn,
          timeAr: relativeTime(notification.createdAt, 'ar'),
          timeEn: relativeTime(notification.createdAt, 'en'),
          read,
          urgent: notification.category === 'attendance' || notification.category === 'ai',
          actionUrl: notification.link,
          actionLabelAr: notification.link ? 'فتح الصفحة المرتبطة' : undefined,
          actionLabelEn: notification.link ? 'Open linked page' : undefined,
          meta: roleLabel,
        }
      })
  }, [arabic, data, user])

  const unreadCount = useMemo(() => notifications.filter(item => !item.read).length, [notifications])

  const markRead = (id: string) => {
    markNotificationRead(id)
  }

  const publishAnnouncement = () => {
    if (!composeTitle.trim() || !composeBody.trim()) {
      triggerToast(arabic ? 'أدخل عنوان الإعلان ونصه.' : 'Enter both a title and a message.')
      return
    }
    addNotification({
      category: 'announcement',
      titleAr: composeTitle,
      titleEn: composeTitle,
      bodyAr: composeBody,
      bodyEn: composeBody,
      recipientRole: 'all',
      link: 'notifications',
    })
    setComposeTitle('')
    setComposeBody('')
    setShowCompose(false)
    triggerToast(arabic ? 'تم نشر الإعلان لجميع المستخدمين.' : 'Announcement published to all users.')
  }

  // Filtered Notifications based on tab and search
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Tab filter
      if (activeTab === 'unread' && n.read) return false
      if (activeTab === 'academic' && n.type !== 'grade-update') return false
      if (activeTab === 'attendance' && n.type !== 'attendance-alert') return false
      if (activeTab === 'system' && n.type !== 'system' && n.type !== 'ai-insight') return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const text = `${n.titleEn} ${n.titleAr} ${n.descEn} ${n.descAr} ${n.meta || ''}`.toLowerCase()
        if (!text.includes(q)) return false
      }

      return true
    })
  }, [notifications, activeTab, searchQuery])

  const shownNotifications = filteredNotifications.slice(0, visibleLimit)

  // Actions
  const handleMarkAllRead = () => {
    markAllNotificationsRead()
    triggerToast(arabic ? 'تم تحديد جميع الإشعارات كمقروءة' : 'All notifications marked as read')
  }

  const handleToggleRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    markRead(id)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteNotification(id)
    triggerToast(arabic ? 'تم حذف الإشعار' : 'Notification deleted')
  }

  const handleLoadMore = () => {
    setIsLoadingMore(true)
    setTimeout(() => {
      setVisibleLimit(limit => limit + 12)
      setIsLoadingMore(false)
      triggerToast(arabic ? 'تم عرض إشعارات إضافية.' : 'More notifications shown.')
    }, 300)
  }

  // Type styling helpers
  const getTypeConfig = (type: NotificationType) => {
    switch (type) {
      case 'attendance-alert':
        return {
          icon: Clock,
          color: '#ef4444',
          bgLight: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
          badgeVariant: 'danger' as const,
          labelEn: 'Attendance Alert',
          labelAr: 'إنذار حضور',
          dotColor: 'bg-red-500',
        }
      case 'grade-update':
        return {
          icon: Award,
          color: '#19a99a',
          bgLight: 'bg-[#19a99a]/10 text-[#0d9488] dark:text-[#2dd4bf] border-[#19a99a]/25',
          badgeVariant: 'teal' as const,
          labelEn: 'Grade Update',
          labelAr: 'تحديث الدرجات',
          dotColor: 'bg-[#19a99a]',
        }
      case 'system':
        return {
          icon: ShieldAlert,
          color: '#3b82f6',
          bgLight: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          badgeVariant: 'info' as const,
          labelEn: 'System Alert',
          labelAr: 'تنبيه النظام',
          dotColor: 'bg-blue-500',
        }
      case 'parent-message':
        return {
          icon: MessageSquare,
          color: '#6366f1',
          bgLight: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          badgeVariant: 'indigo' as const,
          labelEn: 'Parent Message',
          labelAr: 'رسالة ولي أمر',
          dotColor: 'bg-indigo-500',
        }
      case 'ai-insight':
        return {
          icon: Sparkles,
          color: '#8b5cf6',
          bgLight: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
          badgeVariant: 'violet' as const,
          labelEn: 'AI Insight',
          labelAr: 'رؤية ذكية',
          dotColor: 'bg-purple-500',
        }
    }
  }

  const ChevronIcon = arabic ? ChevronLeft : ChevronRight

  return (
    <div dir={arabic ? 'rtl' : 'ltr'} className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast message popup */}
      {toastMessage && (
        <div className="fixed bottom-6 end-6 z-50 animate-slide-in-right bg-[#182b52] text-white text-[13px] font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 border border-white/10">
          <Check className="size-4 text-[#2dd4bf]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title={arabic ? 'مركز الإشعارات والتنبيهات' : 'Notifications & Alerts Center'}
        subtitle={
          arabic
            ? 'متابعة شاملة لتنبيهات الحضور، اعتماد الدرجات، تحديثات النظام، ورسائل أولياء الأمور'
            : 'Track real-time attendance alerts, grade approvals, parent messages, and AI system notices'
        }
        icon={Bell}
        arabic={arabic}
        breadcrumb={[
          arabic ? 'الرئيسية' : 'Dashboard',
          arabic ? 'التواصل' : 'Communication',
          arabic ? 'الإشعارات' : 'Notifications',
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className={cn(
                'btn-secondary text-[12px] h-9',
                unreadCount === 0 && 'opacity-50 cursor-not-allowed'
              )}
            >
              <CheckCheck className="size-4 text-[#19a99a]" />
              <span>{arabic ? 'تحديد الكل كمقروء' : 'Mark All Read'}</span>
            </button>

            <button
              onClick={() => setShowCompose(!showCompose)}
              className="btn-teal text-[12px] h-9"
            >
              <MessageSquare className="size-4" />
              <span>{arabic ? 'إعلان جديد' : 'New Announcement'}</span>
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                'h-9 px-3.5 rounded-xl border text-[12px] font-semibold flex items-center gap-2 transition-all',
                showSettings
                  ? 'bg-[#19a99a] text-white border-[#19a99a] shadow-sm'
                  : 'bg-white dark:bg-white/[0.04] text-[#182b52] dark:text-white border-[#e2e8f0] dark:border-white/[0.1] hover:bg-[#f8fafc]'
              )}
            >
              <Settings className="size-4" />
              <span>{arabic ? 'تفضيلات الإشعارات' : 'Notification Settings'}</span>
            </button>
          </div>
        }
      />

      {showCompose && (
        <div className="card-base p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#182b52] dark:text-white">
              {arabic ? 'نشر إعلان عام' : 'Publish a school announcement'}
            </h3>
            <button onClick={() => setShowCompose(false)} className="btn-icon size-7 rounded-lg text-[#94a3b8]">
              <X className="size-4" />
            </button>
          </div>
          <input
            value={composeTitle}
            onChange={e => setComposeTitle(e.target.value)}
            placeholder={arabic ? 'عنوان الإعلان' : 'Announcement title'}
            className="ss-input text-xs"
          />
          <textarea
            value={composeBody}
            onChange={e => setComposeBody(e.target.value)}
            rows={3}
            placeholder={arabic ? 'نص الإعلان الذي سيصل إلى جميع المستخدمين' : 'Message delivered to every user'}
            className="ss-input text-xs h-auto py-2.5"
          />
          <button onClick={publishAnnouncement} className="btn-teal text-xs h-9 justify-center w-full">
            <span>{arabic ? 'إرسال الإعلان للجميع' : 'Send to everyone'}</span>
          </button>
        </div>
      )}

      {/* Top Quick Status Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="card-base p-4 flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-gradient-to-br from-[#19a99a]/15 to-[#0d9488]/20 flex items-center justify-center text-[#19a99a] shrink-0">
            <Bell className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'إجمالي الإشعارات' : 'Total Alerts'}
            </p>
            <h4 className="text-[18px] font-extrabold text-[#182b52] dark:text-white mt-0.5">
              {notifications.length}
            </h4>
          </div>
        </div>

        <div className="card-base p-4 flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-gradient-to-br from-red-500/15 to-red-600/20 flex items-center justify-center text-red-500 shrink-0">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'غير مقروءة' : 'Unread Alerts'}
            </p>
            <h4 className="text-[18px] font-extrabold text-red-500 mt-0.5">
              {unreadCount}
            </h4>
          </div>
        </div>

        <div className="card-base p-4 flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-500/15 to-indigo-600/20 flex items-center justify-center text-indigo-500 shrink-0">
            <MessageSquare className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'رسائل الأولياء' : 'Parent Chats'}
            </p>
            <h4 className="text-[18px] font-extrabold text-[#182b52] dark:text-white mt-0.5">
              {notifications.filter((n) => n.type === 'parent-message').length}
            </h4>
          </div>
        </div>

        <div className="card-base p-4 flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-gradient-to-br from-purple-500/15 to-purple-600/20 flex items-center justify-center text-purple-500 shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'توصيات الذكاء' : 'AI Insights'}
            </p>
            <h4 className="text-[18px] font-extrabold text-purple-500 mt-0.5">
              {notifications.filter((n) => n.type === 'ai-insight').length}
            </h4>
          </div>
        </div>
      </div>

      {/* Main Layout: Feed + Settings Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filter Tabs + Notification Feed (8 or 12 cols depending on settings toggle) */}
        <div className={cn('space-y-4 transition-all duration-300', showSettings ? 'lg:col-span-8' : 'lg:col-span-12')}>
          {/* Controls Bar: Tabs & Search */}
          <div className="card-base p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all shrink-0 flex items-center gap-1.5',
                  activeTab === 'all'
                    ? 'bg-[#182b52] dark:bg-[#19a99a] text-white shadow-sm'
                    : 'text-[#64748b] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-white/[0.05]'
                )}
              >
                <span>{arabic ? 'الكل' : 'All'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/15 dark:bg-white/20">
                  {notifications.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('unread')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all shrink-0 flex items-center gap-1.5',
                  activeTab === 'unread'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-[#64748b] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-white/[0.05]'
                )}
              >
                <span>{arabic ? 'غير المقروءة' : 'Unread'}</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/25">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('academic')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all shrink-0',
                  activeTab === 'academic'
                    ? 'bg-[#182b52] dark:bg-[#19a99a] text-white shadow-sm'
                    : 'text-[#64748b] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-white/[0.05]'
                )}
              >
                {arabic ? 'الدرجات والأكاديمي' : 'Academic'}
              </button>

              <button
                onClick={() => setActiveTab('attendance')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all shrink-0',
                  activeTab === 'attendance'
                    ? 'bg-[#182b52] dark:bg-[#19a99a] text-white shadow-sm'
                    : 'text-[#64748b] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-white/[0.05]'
                )}
              >
                {arabic ? 'الحضور والغياب' : 'Attendance'}
              </button>

              <button
                onClick={() => setActiveTab('system')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all shrink-0',
                  activeTab === 'system'
                    ? 'bg-[#182b52] dark:bg-[#19a99a] text-white shadow-sm'
                    : 'text-[#64748b] dark:text-[#94a3b8] hover:bg-[#f1f5f9] dark:hover:bg-white/[0.05]'
                )}
              >
                {arabic ? 'النظام والذكاء' : 'System & AI'}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] sm:max-w-[240px]">
              <Search
                className="absolute top-1/2 -translate-y-1/2 size-3.5 text-[#94a3b8] pointer-events-none"
                style={{ [arabic ? 'right' : 'left']: '12px' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={arabic ? 'بحث في الإشعارات...' : 'Search alerts...'}
                className="ss-input h-9 text-[12px] rounded-xl"
                style={{
                  paddingInlineStart: '34px',
                  paddingInlineEnd: searchQuery ? '30px' : '12px',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 -translate-y-1/2 size-4 text-[#94a3b8] hover:text-[#182b52]"
                  style={{ [arabic ? 'left' : 'right']: '10px' }}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Feed List */}
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="card-base p-12 text-center flex flex-col items-center justify-center">
                <div className="size-16 rounded-2xl bg-[#f1f5f9] dark:bg-white/[0.04] flex items-center justify-center text-[#94a3b8] mb-4">
                  <Bell className="size-8" />
                </div>
                <h3 className="text-[16px] font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'لا توجد إشعارات مطابقة' : 'No notifications found'}
                </h3>
                <p className="text-[13px] text-[#64748b] dark:text-[#94a3b8] mt-1 max-w-sm">
                  {arabic
                    ? 'جرب تغيير علامة التبويب أو استخدام كلمات بحث مختلفة للاطلاع على التنبيهات.'
                    : 'Try clearing your search query or switching to another category tab.'}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="btn-secondary mt-4 text-[12px] h-8"
                  >
                    {arabic ? 'مسح البحث' : 'Clear search'}
                  </button>
                )}
              </div>
            ) : (
              shownNotifications.map((notif) => {
                const config = getTypeConfig(notif.type)
                const Icon = config.icon

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleToggleRead(notif.id)}
                    className={cn(
                      'group relative card-base p-4 sm:p-5 cursor-pointer transition-all duration-200 border',
                      notif.read
                        ? 'bg-white dark:bg-[#0f1f3d] opacity-85 hover:opacity-100 hover:border-[#cbd5e1] dark:hover:border-white/20'
                        : 'bg-white dark:bg-[#0f1f3d] border-[#19a99a]/35 dark:border-[#19a99a]/45 shadow-[0_2px_12px_rgba(25,169,154,0.06)]'
                    )}
                  >
                    {/* Unread Accent Indicator bar */}
                    {!notif.read && (
                      <span
                        className="absolute top-0 bottom-0 w-1 rounded-s-2xl bg-[#19a99a]"
                        style={{ [arabic ? 'right' : 'left']: 0 }}
                      />
                    )}

                    <div className="flex items-start gap-3.5 sm:gap-4">
                      {/* Icon */}
                      <div
                        className={cn(
                          'size-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 shadow-sm',
                          config.bgLight
                        )}
                      >
                        <Icon className="size-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={config.badgeVariant} size="sm">
                              {arabic ? config.labelAr : config.labelEn}
                            </Badge>

                            {notif.meta && (
                              <span className="text-[11px] font-medium text-[#94a3b8] px-2 py-0.5 rounded-md bg-[#f1f5f9] dark:bg-white/[0.04]">
                                {notif.meta}
                              </span>
                            )}

                            {notif.urgent && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900/50">
                                <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                                {arabic ? 'عاجل' : 'Urgent'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-[#94a3b8] shrink-0">
                            <span>{arabic ? notif.timeAr : notif.timeEn}</span>
                            {!notif.read && (
                              <span
                                className={cn('size-2 rounded-full animate-pulse', config.dotColor)}
                                title={arabic ? 'غير مقروء' : 'Unread'}
                              />
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <h4
                          className={cn(
                            'text-[14px] sm:text-[15px] tracking-tight leading-snug',
                            notif.read
                              ? 'font-medium text-[#334155] dark:text-[#cbd5e1]'
                              : 'font-bold text-[#182b52] dark:text-white'
                          )}
                        >
                          {arabic ? notif.titleAr : notif.titleEn}
                        </h4>

                        {/* Description */}
                        <p className="text-[12.5px] text-[#64748b] dark:text-[#94a3b8] mt-1 leading-relaxed">
                          {arabic ? notif.descAr : notif.descEn}
                        </p>

                        {/* Bottom Row: Actions */}
                        <div className="mt-3.5 flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-[#f1f5f9] dark:border-white/[0.04]">
                          {notif.actionLabelEn ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                markRead(notif.id)
                                if (notif.actionUrl) {
                                  window.location.hash = notif.actionUrl
                                } else {
                                  triggerToast(arabic ? 'لا يوجد مسار مرتبط بهذا الإشعار.' : 'This notification has no linked page.')
                                }
                              }}
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#19a99a] dark:text-[#2dd4bf] hover:underline"
                            >
                              <span>{arabic ? notif.actionLabelAr : notif.actionLabelEn}</span>
                              <ChevronIcon className="size-3" />
                            </button>
                          ) : (
                            <span />
                          )}

                          <div className="flex items-center gap-1.5">
                            {!notif.read && (
                              <button
                                type="button"
                                onClick={(e) => handleToggleRead(notif.id, e)}
                                className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8] hover:text-[#182b52] dark:hover:text-white px-2 py-1 rounded-lg hover:bg-[#f1f5f9] dark:hover:bg-white/[0.05] transition-colors"
                              >
                                {arabic ? 'تحديد كمقروء' : 'Mark as read'}
                              </button>
                            )}

                            {/* Delete button (X) */}
                            <button
                              type="button"
                              onClick={(e) => handleDelete(notif.id, e)}
                              className="size-7 rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all opacity-70 group-hover:opacity-100"
                              title={arabic ? 'حذف الإشعار' : 'Delete notification'}
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Load More Button */}
          {filteredNotifications.length > visibleLimit && (
            <div className="text-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="btn-secondary h-10 px-6 text-[13px] rounded-xl mx-auto shadow-sm"
              >
                {isLoadingMore ? (
                  <>
                    <RefreshCw className="size-4 animate-spin text-[#19a99a]" />
                    <span>{arabic ? 'جاري التحميل...' : 'Loading alerts...'}</span>
                  </>
                ) : (
                  <>
                    <span>{arabic ? 'تحميل إشعارات أقدم' : 'Load More Alerts'}</span>
                    <ChevronDown className="size-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Notification Settings Panel */}
        {showSettings && (
          <aside className="lg:col-span-4 card-base p-5 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e8f0] dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-[#19a99a]" />
                <h3 className="text-[15px] font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'تفضيلات الإشعارات' : 'Notification Channels'}
                </h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="btn-icon size-7 rounded-lg text-[#94a3b8]"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-[12px] text-[#64748b] dark:text-[#94a3b8] leading-relaxed">
              {arabic
                ? 'خصص قنوات التسليم وطرق استلام التنبيهات حسب الأولوية ونوع الحدث.'
                : 'Select delivery channels (Email, SMS, Push) for each category to prevent alert fatigue.'}
            </p>

            {/* Channels Matrix */}
            <div className="space-y-4">
              {/* Category 1: Attendance */}
              <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#182b52] dark:text-white flex items-center gap-1.5">
                    <Clock className="size-3.5 text-red-500" />
                    {arabic ? 'تنبيهات الحضور والغياب' : 'Attendance Alerts'}
                  </span>
                  <Badge variant="danger" size="sm">
                    {arabic ? 'عالي الأهمية' : 'Critical'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.attendancePush}
                      onChange={(e) => setPrefs({ ...prefs, attendancePush: e.target.checked })}
                      className="rounded accent-[#19a99a]"
                    />
                    <span>Push</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.attendanceEmail}
                      onChange={(e) => setPrefs({ ...prefs, attendanceEmail: e.target.checked })}
                      className="rounded accent-[#19a99a]"
                    />
                    <span>Email</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.attendanceSms}
                      onChange={(e) => setPrefs({ ...prefs, attendanceSms: e.target.checked })}
                      className="rounded accent-[#19a99a]"
                    />
                    <span>SMS</span>
                  </label>
                </div>
              </div>

              {/* Category 2: Academic & Grades */}
              <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#182b52] dark:text-white flex items-center gap-1.5">
                    <Award className="size-3.5 text-[#19a99a]" />
                    {arabic ? 'اعتماد الدرجات والاختبارات' : 'Grades & Exams'}
                  </span>
                  <Badge variant="teal" size="sm">
                    {arabic ? 'أكاديمي' : 'Academic'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.gradesPush}
                      onChange={(e) => setPrefs({ ...prefs, gradesPush: e.target.checked })}
                      className="rounded accent-[#19a99a]"
                    />
                    <span>Push</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.gradesEmail}
                      onChange={(e) => setPrefs({ ...prefs, gradesEmail: e.target.checked })}
                      className="rounded accent-[#19a99a]"
                    />
                    <span>Email</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.gradesSms}
                      onChange={(e) => setPrefs({ ...prefs, gradesSms: e.target.checked })}
                      className="rounded accent-[#19a99a]"
                    />
                    <span>SMS</span>
                  </label>
                </div>
              </div>

              {/* Category 3: Parent Communications */}
              <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#182b52] dark:text-white flex items-center gap-1.5">
                    <MessageSquare className="size-3.5 text-indigo-500" />
                    {arabic ? 'رسائل أولياء الأمور' : 'Parent Communications'}
                  </span>
                  <Badge variant="indigo" size="sm">
                    {arabic ? 'مباشر' : 'Direct'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.parentPush}
                      onChange={(e) => setPrefs({ ...prefs, parentPush: e.target.checked })}
                      className="rounded accent-[#19a99a]"
                    />
                    <span>Push</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.parentEmail}
                      onChange={(e) => setPrefs({ ...prefs, parentEmail: e.target.checked })}
                      className="rounded accent-[#19a99a]"
                    />
                    <span>Email</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.parentSms}
                      onChange={(e) => setPrefs({ ...prefs, parentSms: e.target.checked })}
                      className="rounded accent-[#19a99a]"
                    />
                    <span>SMS</span>
                  </label>
                </div>
              </div>

              {/* Category 4: AI Insights */}
              <div className="p-3 rounded-xl bg-[#f8fafc] dark:bg-white/[0.02] border border-[#e2e8f0] dark:border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#182b52] dark:text-white flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-purple-500" />
                    {arabic ? 'توصيات الذكاء الاصطناعي' : 'AI Diagnostic Insights'}
                  </span>
                  <Badge variant="violet" size="sm">
                    {arabic ? 'ذكي' : 'AI'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.aiPush}
                      onChange={(e) => setPrefs({ ...prefs, aiPush: e.target.checked })}
                      className="rounded accent-[#19a99a]"
                    />
                    <span>Push</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.aiEmail}
                      onChange={(e) => setPrefs({ ...prefs, aiEmail: e.target.checked })}
                      className="rounded accent-[#19a99a]"
                    />
                    <span>Email</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.aiSms}
                      onChange={(e) => setPrefs({ ...prefs, aiSms: e.target.checked })}
                      className="rounded accent-[#19a99a]"
                    />
                    <span>SMS</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Quick General Toggles */}
            <div className="pt-2 border-t border-[#e2e8f0] dark:border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="size-4 text-[#64748b] dark:text-[#94a3b8]" />
                  <span className="text-[12px] font-medium text-[#182b52] dark:text-white">
                    {arabic ? 'أصوات التنبيه' : 'Alert Sounds'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.soundEnabled}
                  onChange={(e) => setPrefs({ ...prefs, soundEnabled: e.target.checked })}
                  className="rounded size-4 accent-[#19a99a]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="size-4 text-[#64748b] dark:text-[#94a3b8]" />
                  <span className="text-[12px] font-medium text-[#182b52] dark:text-white">
                    {arabic ? 'وضع الهدوء الليلي (١٠ م - ٦ ص)' : 'Quiet Hours (10 PM - 6 AM)'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.quietHours}
                  onChange={(e) => setPrefs({ ...prefs, quietHours: e.target.checked })}
                  className="rounded size-4 accent-[#19a99a]"
                />
              </div>
            </div>

            <button
              onClick={() => {
                try {
                  window.localStorage.setItem('smart-school-360:notification-prefs:v1', JSON.stringify(prefs))
                } catch {
                  // Preferences stay in memory when storage is unavailable.
                }
                setShowSettings(false)
                triggerToast(arabic ? 'تم حفظ التفضيلات بنجاح' : 'Preferences saved successfully')
              }}
              className="btn-teal w-full text-[12px] h-9 justify-center shadow-md"
            >
              <Check className="size-4" />
              <span>{arabic ? 'حفظ التفضيلات' : 'Save Preferences'}</span>
            </button>
          </aside>
        )}
      </div>
    </div>
  )
}
