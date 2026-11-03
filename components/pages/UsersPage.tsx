'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Search,
  Filter,
  Check,
  X,
  MoreVertical,
  Edit2,
  Lock,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Info,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { ParentLinkPanel } from '@/components/shared/ParentLinkPanel'
import { cn } from '@/lib/utils'
import { useSchool } from '@/lib/school/store'
import { ROLE_LABELS, relativeTime } from '@/lib/school/engine'
import type { Role } from '@/lib/school/types'

export type UserRole = 'admin' | 'teacher' | 'parent' | 'student' | 'principal' | 'librarian' | 'accountant' | 'staff'

export interface UserItem {
  id: string
  nameEn: string
  nameAr: string
  email: string
  phone: string
  role: UserRole
  roleTitleEn: string
  roleTitleAr: string
  departmentEn: string
  departmentAr: string
  lastLoginEn: string
  lastLoginAr: string
  active: boolean
  avatarColor: string
  storeRole: Role
  classId?: string
  studentId?: string
}

// Permissions Matrix Definition
interface PermissionFeature {
  id: string
  nameEn: string
  nameAr: string
  descEn: string
  descAr: string
  categoryEn: string
  categoryAr: string
  roles: {
    admin: boolean
    teacher: boolean
    parent: boolean
    student: boolean
  }
}

const defaultPermissions: PermissionFeature[] = [
  {
    id: 'view_dashboard',
    nameEn: 'View Dashboard',
    nameAr: 'عرض لوحة التحكم الرئيسية',
    descEn: 'Access high-level analytics, attendance metrics and announcements',
    descAr: 'الاطلاع على المؤشرات الإحصائية ونسب الحضور والإعلانات المدرسية',
    categoryEn: 'Core Access',
    categoryAr: 'الوصول الأساسي',
    roles: { admin: true, teacher: true, parent: true, student: true },
  },
  {
    id: 'manage_students',
    nameEn: 'Manage Students',
    nameAr: 'إدارة شؤون الطلاب والملفات',
    descEn: 'Create student profiles, assign sections, edit emergency contact info',
    descAr: 'إضافة ملفات الطلاب، تعيين الشعب، وتعديل بيانات الاتصال في الطوارئ',
    categoryEn: 'Student Records',
    categoryAr: 'سجلات الطلاب',
    roles: { admin: true, teacher: true, parent: false, student: false },
  },
  {
    id: 'enter_grades',
    nameEn: 'Enter Grades',
    nameAr: 'رصد واعتماد الدرجات',
    descEn: 'Input assignment marks, midterm scores, and semester final exams',
    descAr: 'إدخال درجات الواجبات، الاختبارات النصفية، واختبارات نهاية الفصل',
    categoryEn: 'Academics',
    categoryAr: 'الشؤون الأكاديمية',
    roles: { admin: true, teacher: true, parent: false, student: false },
  },
  {
    id: 'view_reports',
    nameEn: 'View Reports',
    nameAr: 'عرض التقارير والشهادات',
    descEn: 'Generate and review performance transcripts, attendance records, KPIs',
    descAr: 'استخراج ومراجعة كشوف الدرجات وسجلات الغياب والتقارير التحليلية',
    categoryEn: 'Analytics',
    categoryAr: 'التحليلات والتقارير',
    roles: { admin: true, teacher: true, parent: true, student: true },
  },
  {
    id: 'manage_users',
    nameEn: 'Manage Users',
    nameAr: 'إدارة المستخدمين والصلاحيات',
    descEn: 'Create accounts, assign roles, reset credentials and enforce 2FA',
    descAr: 'إنشاء الحسابات، تعيين الأدوار، إعادة تعيين كلمات المرور، وإدارة الأمان',
    categoryEn: 'Administration',
    categoryAr: 'الإدارة والأمان',
    roles: { admin: true, teacher: false, parent: false, student: false },
  },
  {
    id: 'system_settings',
    nameEn: 'System Settings',
    nameAr: 'تهيئة إعدادات النظام',
    descEn: 'Configure academic years, grading schemes, SMS gateways and integrations',
    descAr: 'ضبط العام الدراسي، سلالم الدرجات، بوابات الرسائل والربط السحابي',
    categoryEn: 'Administration',
    categoryAr: 'الإدارة والأمان',
    roles: { admin: true, teacher: false, parent: false, student: false },
  },
  {
    id: 'export_data',
    nameEn: 'Export Data',
    nameAr: 'تصدير واستيراد البيانات',
    descEn: 'Bulk import and download student archives, gradebooks and logs',
    descAr: 'استيراد وتنزيل أرشيف الطلاب، كشوف الدرجات، وسجلات النظام الكاملة',
    categoryEn: 'Data Management',
    categoryAr: 'إدارة البيانات',
    roles: { admin: true, teacher: true, parent: false, student: false },
  },
  {
    id: 'ai_center',
    nameEn: 'AI Center',
    nameAr: 'مركز الذكاء الاصطناعي والتوصيات',
    descEn: 'Access early warning models, diagnostic interventions, smart curricula',
    descAr: 'الوصول لنماذج الإنذار المبكر الذكية، خطط الدعم، والتنبؤ بالأداء',
    categoryEn: 'AI & Insights',
    categoryAr: 'الذكاء الاصطناعي',
    roles: { admin: true, teacher: true, parent: false, student: false },
  },
]

export function UsersPage({ arabic = false }: { arabic?: boolean }) {
  const { data, user, addUser, updateUser, toggleUserStatus, resolveClassName, refreshWorkspace } = useSchool()
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [resetPasswordUser, setResetPasswordUser] = useState<UserItem | null>(null)
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [approvalClassId, setApprovalClassId] = useState('')
  const [approvalStudentNumber, setApprovalStudentNumber] = useState('')
  const [approvalGender, setApprovalGender] = useState<'male' | 'female' | ''>('')
  const [approvalDob, setApprovalDob] = useState('')
  const [approvingStudent, setApprovingStudent] = useState(false)

  // Permissions state (persisted locally; server-side RBAC is enforced by PAGE_ACCESS)
  const [permissions, setPermissions] = useState<PermissionFeature[]>(defaultPermissions)

  // Add User Form State
  const [formData, setFormData] = useState({
    nameEn: '',
    nameAr: '',
    email: '',
    phone: '',
    role: 'teacher' as UserRole,
    departmentEn: '',
    departmentAr: '',
    classId: '',
    sendInvite: true,
  })

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('smart-school-360:permissions:v1')
      if (raw) setPermissions(JSON.parse(raw) as PermissionFeature[])
    } catch {
      // Fall back to the default matrix when storage is unavailable.
    }
  }, [])

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const roleForUi = (role: UserItem['storeRole']): UserRole =>
    role === 'super_admin' || role === 'school_admin' ? 'admin' : role

  const users = useMemo<UserItem[]>(() => {
    return data.users.map(account => {
      const teacher = data.teachers.find(t => t.id === account.teacherId || t.userId === account.id)
      const student = data.students.find(s => s.id === account.studentId)
      const children = account.childIds
        ? data.students.filter(s => account.childIds?.includes(s.id))
        : data.students.filter(s => s.parentIds.includes(account.id))
      const studentClass = student ? data.classes.find(c => c.id === student.classId) : undefined
      const teacherClasses = teacher
        ? teacher.classIds.map(id => data.classes.find(c => c.id === id)).filter(Boolean)
        : []
      const teacherStageAr = teacher?.specialization === 'primary'
        ? 'المرحلة الابتدائية'
        : teacher?.specialization === 'preparatory'
          ? 'المرحلة الإعدادية'
          : teacher?.specialization === 'secondary'
            ? 'المرحلة الثانوية'
            : ''
      const teacherStageEn = teacher?.specialization === 'primary'
        ? 'Primary stage'
        : teacher?.specialization === 'preparatory'
          ? 'Preparatory stage'
          : teacher?.specialization === 'secondary'
            ? 'Secondary stage'
            : ''
      const departmentAr = student
        ? studentClass?.nameAr ?? '—'
        : teacher
          ? ([teacherStageAr, teacher.subjectIds.map(id => data.subjects.find(s => s.id === id)?.nameAr).filter(Boolean).join(' • '), teacherClasses.map(c => c?.nameAr).join(' • ')].filter(Boolean).join(' — ') || '—')
          : children.length > 0
            ? 'ولي أمر ' + children.map(c => c.nameAr).join(' و')
            : account.role === 'student'
              ? account.department || 'ملف الطالب غير مرتبط'
            : account.role === 'super_admin'
              ? 'الإدارة العليا'
              : 'الإدارة المدرسية'
      const departmentEn = student
        ? studentClass?.nameEn ?? '—'
        : teacher
          ? ([teacherStageEn, teacher.subjectIds.map(id => data.subjects.find(s => s.id === id)?.nameEn).filter(Boolean).join(' • '), teacherClasses.map(c => c?.nameEn).join(' • ')].filter(Boolean).join(' — ') || '—')
          : children.length > 0
            ? 'Guardian of ' + children.map(c => c.nameEn).join(', ')
            : account.role === 'student'
              ? account.department || 'Student profile is not linked'
            : account.role === 'super_admin'
              ? 'Executive management'
              : 'School administration'
      return {
        id: account.id,
        nameEn: account.nameEn,
        nameAr: account.nameAr,
        email: account.email,
        phone: account.phone,
        role: roleForUi(account.role),
        storeRole: account.role,
        roleTitleEn: ROLE_LABELS[account.role].en,
        roleTitleAr: ROLE_LABELS[account.role].ar,
        departmentEn,
        departmentAr,
        lastLoginEn: account.lastLogin ? relativeTime(account.lastLogin, 'en') : 'Never logged in',
        lastLoginAr: account.lastLogin ? relativeTime(account.lastLogin, 'ar') : 'لم يسجل دخول بعد',
        active: account.status === 'active',
        avatarColor: account.avatarColor || 'from-[#182b52] to-[#6366f1]',
        classId: student?.classId,
        studentId: account.studentId,
      } as UserItem
    })
  }, [data])

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter === 'active' && !u.active) return false
      if (statusFilter === 'inactive' && u.active) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const text = `${u.nameEn} ${u.nameAr} ${u.email} ${u.departmentEn} ${u.departmentAr} ${u.phone}`.toLowerCase()
        if (!text.includes(q)) return false
      }

      return true
    })
  }, [users, roleFilter, statusFilter, searchQuery])

  // Toggle user active status
  const handleToggleStatus = async (id: string) => {
    const target = data.users.find(account => account.id === id)
    if (!target) return
    if (target.id === user?.id) {
      triggerToast(arabic ? 'لا يمكنك تعطيل حسابك الحالي.' : 'You cannot deactivate your own account.')
      return
    }
    const result = await toggleUserStatus(id)
    if (!result.ok) {
      triggerToast(result.error === 'student_profile_required'
        ? (arabic ? 'أنشئ ملف الطالب ووافق على الطلب من زر «مراجعة واعتماد» أولاً.' : 'Create the student profile and approve the request first.')
        : `${arabic ? 'تعذر تغيير حالة الحساب:' : 'Could not change account status:'} ${result.error || ''}`)
      return
    }
    await refreshWorkspace()
    triggerToast(
      target.status === 'active'
        ? (arabic ? `تم تعطيل حساب ${target.nameAr}` : `Account deactivated for ${target.nameEn}`)
        : (arabic ? `تم تنشيط حساب ${target.nameAr}` : `Account activated for ${target.nameEn}`),
    )
  }

  // Handle Add User Submit
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nameEn.trim() || !formData.nameAr.trim() || !formData.email.trim()) {
      triggerToast(arabic ? 'أكمل الاسم والبريد الإلكتروني.' : 'Complete the name and email fields.')
      return
    }
    const roleMap: Record<UserRole, 'school_admin' | 'teacher' | 'parent' | 'student' | 'principal' | 'librarian' | 'accountant' | 'staff'> = {
      admin: 'school_admin',
      teacher: 'teacher',
      parent: 'parent',
      student: 'student',
      principal: 'principal',
      librarian: 'librarian',
      accountant: 'accountant',
      staff: 'staff',
    }
    const studentClass = formData.role === 'student'
      ? resolveClassName(formData.departmentEn) ?? data.classes[0]
      : undefined
    if (formData.role === 'student' && !studentClass) {
      triggerToast(arabic ? 'أنشئ فصلاً أولاً قبل إضافة طالب.' : 'Create a class before adding a student.')
      return
    }
    const temporaryPassword = 'Ss360#' + Math.floor(1000 + Math.random() * 9000)
    const result = await addUser({
      nameAr: formData.nameAr.trim(),
      nameEn: formData.nameEn.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      role: roleMap[formData.role],
      password: temporaryPassword,
      classId: studentClass?.id,
    })
    if (!result.ok) {
      triggerToast(
        result.error === 'duplicate_email'
          ? (arabic ? 'البريد الإلكتروني مستخدم بالفعل.' : 'This email address is already in use.')
          : result.error === 'invalid_email'
            ? (arabic ? 'البريد الإلكتروني غير صالح.' : 'The email address is not valid.')
            : (arabic ? 'تعذر إنشاء الحساب. تحقق من البيانات.' : 'Could not create the account. Check the details.'),
      )
      return
    }
    setIsAddModalOpen(false)
    triggerToast(
      arabic
        ? `تم إنشاء الحساب. كلمة المرور المؤقتة: ${temporaryPassword}`
        : `Account created. Temporary password: ${temporaryPassword}`,
    )
    setFormData({
      nameEn: '',
      nameAr: '',
      email: '',
      phone: '',
      role: 'teacher',
      departmentEn: '',
      departmentAr: '',
      classId: '',
      sendInvite: true,
    })
  }

  // Handle Edit User Submit
  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    updateUser(editUser.id, {
      nameAr: editUser.nameAr.trim(),
      nameEn: editUser.nameEn.trim(),
      email: editUser.email.trim(),
      phone: editUser.phone.trim(),
      role: editUser.storeRole,
      studentId: editUser.studentId,
    })
    setEditUser(null)
    triggerToast(arabic ? 'تم تحديث بيانات المستخدم.' : 'User profile updated.')
  }

  const approveStudentRequest = async () => {
    if (!editUser) return
    if (!approvalClassId || !approvalGender || !approvalDob) {
      triggerToast(arabic ? 'اختر الفصل والنوع وتاريخ الميلاد أولاً.' : 'Choose a class, gender, and date of birth first.')
      return
    }
    setApprovingStudent(true)
    try {
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_student_registration',
          payload: { id: editUser.id, classId: approvalClassId, gender: approvalGender, dob: approvalDob, studentNumber: approvalStudentNumber },
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.ok) {
        const errors: Record<string, [string, string]> = {
          student_number_taken: ['رقم الطالب مستخدم بالفعل.', 'That student ID is already in use.'],
          student_request_not_pending: ['الطلب لم يعد بانتظار الموافقة. حدّث الصفحة.', 'This request is no longer pending. Refresh the page.'],
          class_not_found: ['الفصل المختار غير موجود. حدّث الصفحة واختر فصلاً آخر.', 'The selected class was not found. Refresh the page and choose another class.'],
          invalid_date_of_birth: ['تاريخ الميلاد غير صالح.', 'The date of birth is invalid.'],
          forbidden: ['يجب الدخول بحساب المدير العام للموافقة.', 'Sign in as the super administrator to approve requests.'],
        }
        triggerToast(errors[result.error]?.[arabic ? 0 : 1] || `${arabic ? 'تعذر تفعيل الطالب:' : 'Could not activate student:'} ${result.error || response.status}`)
        return
      }
      await refreshWorkspace()
      setEditUser(null)
      triggerToast(arabic ? 'تم إنشاء ملف الطالب والموافقة على الحساب.' : 'Student profile created and account approved.')
    } catch {
      triggerToast(arabic ? 'تعذر الاتصال بالخادم.' : 'Could not connect to the server.')
    } finally {
      setApprovingStudent(false)
    }
  }

  // Permission toggle handler
  const handleTogglePermission = (featureId: string, roleKey: keyof PermissionFeature['roles']) => {
    if (roleKey === 'admin') {
      triggerToast(arabic ? 'صلاحيات المشرف ثابتة وفق سياسة النظام.' : 'Administrator permissions are fixed by policy.')
      return
    }
    setPermissions((prev) => {
      const next = prev.map((item) => {
        if (item.id !== featureId) return item
        return {
          ...item,
          roles: {
            ...item.roles,
            [roleKey]: !item.roles[roleKey],
          },
        }
      })
      try {
        window.localStorage.setItem('smart-school-360:permissions:v1', JSON.stringify(next))
      } catch {
        // Matrix stays in memory when storage is unavailable.
      }
      return next
    })
  }


  // Role badge helper
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Badge variant="indigo">{arabic ? 'مشرف' : 'Admin'}</Badge>
      case 'teacher':
        return <Badge variant="teal">{arabic ? 'معلم' : 'Teacher'}</Badge>
      case 'parent':
        return <Badge variant="info">{arabic ? 'ولي أمر' : 'Parent'}</Badge>
      case 'student':
        return <Badge variant="neutral">{arabic ? 'طالب' : 'Student'}</Badge>
    }
  }

  // Role counts
  const roleCounts = useMemo(() => {
    return {
      admin: users.filter((u) => u.role === 'admin').length,
      teacher: users.filter((u) => u.role === 'teacher').length,
      parent: users.filter((u) => u.role === 'parent').length,
      student: users.filter((u) => u.role === 'student').length,
      active: users.filter((u) => u.active).length,
    }
  }, [users])

  return (
    <div dir={arabic ? 'rtl' : 'ltr'} className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 end-6 z-50 animate-slide-in-right bg-[#182b52] text-white text-[13px] font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 border border-white/10">
          <CheckCircle2 className="size-4 text-[#2dd4bf]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title={arabic ? 'إدارة المستخدمين والأدوار' : 'Users & Roles Management'}
        subtitle={
          arabic
            ? 'التحكم في حسابات المعلمين والإداريين وأولياء الأمور والطلاب وضبط مصفوفة الصلاحيات'
            : 'Manage authentication, security profiles, role access levels, and granular feature permissions'
        }
        icon={Users}
        arabic={arabic}
        breadcrumb={[
          arabic ? 'الرئيسية' : 'Dashboard',
          arabic ? 'الإدارة' : 'Administration',
          arabic ? 'المستخدمون والأدوار' : 'Users & Roles',
        ]}
        actions={
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-teal h-9 px-4 text-[12px] shadow-sm flex items-center gap-2"
          >
            <UserPlus className="size-4" />
            <span>{arabic ? 'إضافة مستخدم جديد' : 'Add New User'}</span>
          </button>
        }
      />

      {user?.role === 'super_admin' && <ParentLinkPanel role="admin" arabic={arabic} />}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="card-base p-4 flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-gradient-to-br from-[#182b52]/10 to-[#6366f1]/20 flex items-center justify-center text-[#182b52] dark:text-[#818cf8] shrink-0">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'إجمالي الحسابات' : 'Total Accounts'}
            </p>
            <h4 className="text-[18px] font-extrabold text-[#182b52] dark:text-white mt-0.5">
              {users.length}
            </h4>
          </div>
        </div>

        <div className="card-base p-4 flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-gradient-to-br from-[#19a99a]/15 to-[#0d9488]/25 flex items-center justify-center text-[#19a99a] shrink-0">
            <UserCheck className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'الحسابات النشطة' : 'Active Users'}
            </p>
            <h4 className="text-[18px] font-extrabold text-[#19a99a] mt-0.5">
              {roleCounts.active}
            </h4>
          </div>
        </div>

        <div className="card-base p-4 flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-500/15 to-indigo-600/25 flex items-center justify-center text-indigo-500 shrink-0">
            <Shield className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'الكادر التعليمي والإداري' : 'Faculty & Staff'}
            </p>
            <h4 className="text-[18px] font-extrabold text-[#182b52] dark:text-white mt-0.5">
              {roleCounts.admin + roleCounts.teacher}
            </h4>
          </div>
        </div>

        <div className="card-base p-4 flex items-center gap-3.5">
          <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/25 flex items-center justify-center text-blue-500 shrink-0">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8]">
              {arabic ? 'الطلاب وأولياء الأمور' : 'Students & Parents'}
            </p>
            <h4 className="text-[18px] font-extrabold text-[#182b52] dark:text-white mt-0.5">
              {roleCounts.parent + roleCounts.student}
            </h4>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e2e8f0] dark:border-white/[0.08] pb-1">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            'px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 border-b-2 -mb-1',
            activeTab === 'users'
              ? 'border-[#19a99a] text-[#19a99a] dark:text-[#2dd4bf] bg-[#19a99a]/5'
              : 'border-transparent text-[#64748b] dark:text-[#94a3b8] hover:text-[#182b52] dark:hover:text-white'
          )}
        >
          <Users className="size-4" />
          <span>{arabic ? 'سجل المستخدمين' : 'Users Directory'}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f1f5f9] dark:bg-white/[0.06] text-[#64748b] dark:text-[#94a3b8]">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={cn(
            'px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2 border-b-2 -mb-1',
            activeTab === 'roles'
              ? 'border-[#19a99a] text-[#19a99a] dark:text-[#2dd4bf] bg-[#19a99a]/5'
              : 'border-transparent text-[#64748b] dark:text-[#94a3b8] hover:text-[#182b52] dark:hover:text-white'
          )}
        >
          <Shield className="size-4" />
          <span>{arabic ? 'الأدوار ومصفوفة الصلاحيات' : 'Roles & Permissions Matrix'}</span>
          <span className="badge-indigo text-[10px] px-2 py-0.5 rounded-full">
            4 {arabic ? 'أدوار' : 'Roles'}
          </span>
        </button>
      </div>

      {/* ── TAB 1: USERS DIRECTORY ────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="card-base p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search
                className="absolute top-1/2 -translate-y-1/2 size-4 text-[#94a3b8] pointer-events-none"
                style={{ [arabic ? 'right' : 'left']: '12px' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={arabic ? 'بحث بالاسم، البريد، الشعبة...' : 'Search by name, email, department...'}
                className="ss-input h-10 text-[13px] rounded-xl"
                style={{
                  paddingInlineStart: '36px',
                  paddingInlineEnd: searchQuery ? '32px' : '12px',
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

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 bg-[#f1f5f9] dark:bg-white/[0.04] p-1 rounded-xl">
                <button
                  onClick={() => setRoleFilter('all')}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors',
                    roleFilter === 'all'
                      ? 'bg-white dark:bg-[#0f1f3d] text-[#182b52] dark:text-white shadow-xs'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  )}
                >
                  {arabic ? 'الكل' : 'All Roles'}
                </button>
                <button
                  onClick={() => setRoleFilter('admin')}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors',
                    roleFilter === 'admin'
                      ? 'bg-white dark:bg-[#0f1f3d] text-[#182b52] dark:text-white shadow-xs'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  )}
                >
                  {arabic ? 'مشرف' : 'Admins'}
                </button>
                <button
                  onClick={() => setRoleFilter('teacher')}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors',
                    roleFilter === 'teacher'
                      ? 'bg-white dark:bg-[#0f1f3d] text-[#182b52] dark:text-white shadow-xs'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  )}
                >
                  {arabic ? 'معلم' : 'Teachers'}
                </button>
                <button
                  onClick={() => setRoleFilter('parent')}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors',
                    roleFilter === 'parent'
                      ? 'bg-white dark:bg-[#0f1f3d] text-[#182b52] dark:text-white shadow-xs'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  )}
                >
                  {arabic ? 'ولي أمر' : 'Parents'}
                </button>
                <button
                  onClick={() => setRoleFilter('student')}
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors',
                    roleFilter === 'student'
                      ? 'bg-white dark:bg-[#0f1f3d] text-[#182b52] dark:text-white shadow-xs'
                      : 'text-[#64748b] dark:text-[#94a3b8]'
                  )}
                >
                  {arabic ? 'طالب' : 'Students'}
                </button>
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                aria-label={arabic ? 'تصفية الحالة' : 'Status filter'}
                className="h-9 px-3 rounded-xl border border-[#e2e8f0] dark:border-white/[0.08] bg-white dark:bg-[#0f1f3d] text-[12px] text-[#334155] dark:text-[#cbd5e1] font-medium"
              >
                <option value="all">{arabic ? 'جميع الحالات' : 'All Status'}</option>
                <option value="active">{arabic ? 'النشطون فقط' : 'Active Only'}</option>
                <option value="inactive">{arabic ? 'المعطلون فقط' : 'Inactive Only'}</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="card-base overflow-hidden border">
            <div className="overflow-x-auto">
              <table className="ss-table">
                <thead>
                  <tr>
                    <th>{arabic ? 'المستخدم' : 'User'}</th>
                    <th>{arabic ? 'الدور والصفة' : 'Role'}</th>
                    <th>{arabic ? 'الشعبة / القسم' : 'Class / Department'}</th>
                    <th>{arabic ? 'آخر تسجيل دخول' : 'Last Login'}</th>
                    <th className="text-center">{arabic ? 'الحالة' : 'Status'}</th>
                    <th className="text-end">{arabic ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-[#94a3b8]">
                        <UserX className="size-8 mx-auto mb-2 text-[#94a3b8]" />
                        <p className="text-[13px] font-semibold">
                          {arabic ? 'لا يوجد مستخدمون مطابقون لمعايير البحث' : 'No users match your criteria'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const initials = user.nameEn
                        .split(' ')
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join('')

                      return (
                        <tr key={user.id} className="transition-colors group">
                          {/* User Name & Avatar */}
                          <td>
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'size-10 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br shadow-sm shrink-0',
                                  user.avatarColor
                                )}
                              >
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-[13.5px] font-bold text-[#182b52] dark:text-white leading-tight">
                                  {arabic ? user.nameAr : user.nameEn}
                                </h4>
                                <p className="text-[11.5px] text-[#64748b] dark:text-[#94a3b8] mt-0.5 truncate">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td>
                            <div className="flex flex-col items-start gap-1">
                              {getRoleBadge(user.role)}
                              <span className="text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                                {arabic ? user.roleTitleAr : user.roleTitleEn}
                              </span>
                            </div>
                          </td>

                          {/* Class / Department */}
                          <td>
                            <span className="text-[12.5px] font-medium text-[#334155] dark:text-[#cbd5e1]">
                              {arabic ? user.departmentAr : user.departmentEn}
                            </span>
                            <p className="text-[11px] text-[#94a3b8] mt-0.5">{user.phone}</p>
                          </td>

                          {/* Last Login */}
                          <td>
                            <span className="text-[12px] text-[#64748b] dark:text-[#94a3b8]">
                              {arabic ? user.lastLoginAr : user.lastLoginEn}
                            </span>
                          </td>

                          {/* Status Toggle Switch */}
                          <td className="text-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={user.active}
                                onChange={() => handleToggleStatus(user.id)}
                                disabled={user.storeRole === 'super_admin' || user.storeRole === 'school_admin' || (user.storeRole === 'student' && !user.studentId)}
                                className="sr-only peer disabled:cursor-not-allowed"
                              />
                              <div className="w-9 h-5 bg-[#e2e8f0] dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#19a99a]" />
                            </label>
                            <span className="block text-[10px] font-bold mt-1 text-[#94a3b8]">
                              {user.active
                                ? arabic
                                  ? 'نشط'
                                  : 'Active'
                                : arabic
                                ? 'بانتظار التفعيل / غير نشط'
                                : 'Inactive / awaiting activation'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              {user.storeRole === 'student' && !user.active && !user.studentId && <button
                                type="button"
                                onClick={() => {
                                  setEditUser(user)
                                  setApprovalClassId(data.classes[0]?.id || '')
                                  setApprovalGender('')
                                  setApprovalDob('')
                                  setApprovalStudentNumber('')
                                }}
                                className="btn-primary h-8 px-2.5 text-[11px] font-bold"
                              >{arabic ? 'مراجعة واعتماد' : 'Review & approve'}</button>}
                              {/* Edit Button */}
                              <button
                                onClick={() => {
                                  setEditUser(user)
                                  setApprovalClassId(data.classes[0]?.id || '')
                                  setApprovalGender('')
                                  setApprovalDob('')
                                  const requestedId = users.find(entry => entry.id === user.id)?.departmentEn.match(/Student ID pending verification: (.+)$/)?.[1]
                                  setApprovalStudentNumber(requestedId || '')
                                }}
                                className="btn-icon size-8 rounded-lg text-[#64748b] hover:text-[#182b52] dark:hover:text-white"
                                title={arabic ? 'تعديل البيانات' : 'Edit profile'}
                              >
                                <Edit2 className="size-3.5" />
                              </button>

                              {/* Reset Password Button */}
                              <button
                                onClick={() => setResetPasswordUser(user)}
                                className="btn-icon size-8 rounded-lg text-[#64748b] hover:text-[#19a99a]"
                                title={arabic ? 'إعادة ضبط كلمة المرور' : 'Reset password'}
                              >
                                <Key className="size-3.5" />
                              </button>

                              {/* Deactivate/Activate Quick */}
                              <button
                                onClick={() => handleToggleStatus(user.id)}
                                disabled={user.storeRole === 'super_admin' || user.storeRole === 'school_admin' || (user.storeRole === 'student' && !user.studentId)}
                                className={cn(
                                  'btn-icon size-8 rounded-lg transition-colors',
                                  (user.storeRole === 'super_admin' || user.storeRole === 'school_admin' || (user.storeRole === 'student' && !user.studentId)) && 'cursor-not-allowed opacity-40',
                                  user.active
                                    ? 'text-[#64748b] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                                    : 'text-[#19a99a] hover:bg-[#19a99a]/10'
                                )}
                                title={
                                  user.active
                                    ? arabic
                                      ? 'تعطيل الحساب'
                                      : 'Deactivate'
                                    : arabic
                                    ? 'تنشيط الحساب'
                                    : 'Activate'
                                }
                              >
                                {user.active ? (
                                  <UserX className="size-3.5" />
                                ) : (
                                  <UserCheck className="size-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="p-4 border-t border-[#f1f5f9] dark:border-white/[0.04] flex items-center justify-between text-[12px] text-[#64748b] dark:text-[#94a3b8] flex-wrap gap-2">
              <span>
                {arabic
                  ? `عرض ${filteredUsers.length} من إجمالي ${users.length} مستخدم`
                  : `Showing ${filteredUsers.length} of ${users.length} total users`}
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#19a99a]" />
                  <span>{arabic ? 'مفعل' : 'Active'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                  <span>{arabic ? 'معطل' : 'Inactive'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ROLES & PERMISSIONS MATRIX ────────────────────────────── */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Role Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Admin Card */}
            <div className="card-base p-5 border-l-4 border-l-indigo-500 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="indigo" size="sm">
                    {arabic ? 'صلاحيات كاملة' : 'Full Access'}
                  </Badge>
                  <h4 className="text-[16px] font-bold text-[#182b52] dark:text-white mt-2">
                    {arabic ? 'المشرفون والإدارة' : 'Administrators'}
                  </h4>
                  <p className="text-[12px] text-[#64748b] dark:text-[#94a3b8] mt-1 leading-relaxed">
                    {arabic
                      ? 'إشراف شامل على المعلمين، شؤون الطلاب، الميزانيات، والتهيئة السحابية'
                      : 'System architects with complete oversight across users, academics, and audit logs'}
                  </p>
                </div>
                <div className="size-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Shield className="size-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#f1f5f9] dark:border-white/[0.04] flex items-center justify-between text-[12px]">
                <span className="text-[#64748b] dark:text-[#94a3b8]">{arabic ? 'المستخدمون' : 'Active Members'}</span>
                <span className="font-extrabold text-[#182b52] dark:text-white">2 {arabic ? 'مشرفين' : 'Users'}</span>
              </div>
            </div>

            {/* Teacher Card */}
            <div className="card-base p-5 border-l-4 border-l-[#19a99a] relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="teal" size="sm">
                    {arabic ? 'صلاحيات تدريس' : 'Academic Access'}
                  </Badge>
                  <h4 className="text-[16px] font-bold text-[#182b52] dark:text-white mt-2">
                    {arabic ? 'المعلمون والأكاديميون' : 'Teachers & Faculty'}
                  </h4>
                  <p className="text-[12px] text-[#64748b] dark:text-[#94a3b8] mt-1 leading-relaxed">
                    {arabic
                      ? 'رصد الدرجات، تسجيل الحضور، تقييم الواجبات، والتفاعل مع مركز الذكاء'
                      : 'Grade entry, student attendance marking, lesson planning, and AI insights'}
                  </p>
                </div>
                <div className="size-10 rounded-xl bg-[#19a99a]/10 flex items-center justify-center text-[#19a99a] shrink-0">
                  <BookOpen className="size-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#f1f5f9] dark:border-white/[0.04] flex items-center justify-between text-[12px]">
                <span className="text-[#64748b] dark:text-[#94a3b8]">{arabic ? 'المستخدمون' : 'Active Members'}</span>
                <span className="font-extrabold text-[#182b52] dark:text-white">4 {arabic ? 'معلمين' : 'Teachers'}</span>
              </div>
            </div>

            {/* Parent Card */}
            <div className="card-base p-5 border-l-4 border-l-blue-500 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="info" size="sm">
                    {arabic ? 'بوابة المتابعة' : 'Guardian Portal'}
                  </Badge>
                  <h4 className="text-[16px] font-bold text-[#182b52] dark:text-white mt-2">
                    {arabic ? 'أولياء الأمور' : 'Parents & Guardians'}
                  </h4>
                  <p className="text-[12px] text-[#64748b] dark:text-[#94a3b8] mt-1 leading-relaxed">
                    {arabic
                      ? 'متابعة تقارير الأبناء، الحضور والغياب، إشعارات الاختبارات والرسوم'
                      : 'View real-time student performance, attendance alerts, fee invoices and messaging'}
                  </p>
                </div>
                <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Users className="size-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#f1f5f9] dark:border-white/[0.04] flex items-center justify-between text-[12px]">
                <span className="text-[#64748b] dark:text-[#94a3b8]">{arabic ? 'المستخدمون' : 'Active Members'}</span>
                <span className="font-extrabold text-[#182b52] dark:text-white">2 {arabic ? 'أولياء أمور' : 'Parents'}</span>
              </div>
            </div>

            {/* Student Card */}
            <div className="card-base p-5 border-l-4 border-l-slate-400 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="neutral" size="sm">
                    {arabic ? 'بوابة التعلم' : 'Learner Access'}
                  </Badge>
                  <h4 className="text-[16px] font-bold text-[#182b52] dark:text-white mt-2">
                    {arabic ? 'الطلاب والدارسون' : 'Students'}
                  </h4>
                  <p className="text-[12px] text-[#64748b] dark:text-[#94a3b8] mt-1 leading-relaxed">
                    {arabic
                      ? 'تسليم الواجبات، الاطلاع على الجداول، مراجعة نتائج الاختبارات'
                      : 'Access study timetables, assignment submission, library resources and badges'}
                  </p>
                </div>
                <div className="size-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                  <GraduationCap className="size-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#f1f5f9] dark:border-white/[0.04] flex items-center justify-between text-[12px]">
                <span className="text-[#64748b] dark:text-[#94a3b8]">{arabic ? 'المستخدمون' : 'Active Members'}</span>
                <span className="font-extrabold text-[#182b52] dark:text-white">2 {arabic ? 'طلاب' : 'Students'}</span>
              </div>
            </div>
          </div>

          {/* Permissions Matrix Table */}
          <div className="card-base overflow-hidden border">
            <div className="p-4 sm:p-5 border-b border-[#e2e8f0] dark:border-white/[0.08] flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-[16px] font-bold text-[#182b52] dark:text-white">
                  {arabic ? 'مصفوفة صلاحيات النظام التفصيلية' : 'Granular Permissions Matrix'}
                </h3>
                <p className="text-[12px] text-[#64748b] dark:text-[#94a3b8] mt-0.5">
                  {arabic
                    ? 'صلاحيات مخصصة لكل دور وظيفي. دور المشرف (Admin) محمي بصلاحية كاملة دائمة.'
                    : 'Configured security permissions per role. Administrator role is locked with master authority.'}
                </p>
              </div>

              {/* Disabled Edit Permissions Button with Coming Soon */}
              <div className="relative group">
                <button
                  disabled
                  className="btn-secondary text-[12px] h-9 opacity-65 cursor-not-allowed flex items-center gap-2 border-dashed"
                >
                  <Lock className="size-3.5 text-[#94a3b8]" />
                  <span>{arabic ? 'تعديل الصلاحيات المخصصة' : 'Edit Custom Permissions'}</span>
                  <span className="badge-warning text-[10px] px-2 py-0.2 rounded-full">
                    {arabic ? 'قريباً' : 'Coming Soon'}
                  </span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="ss-table">
                <thead>
                  <tr>
                    <th className="min-w-[280px]">{arabic ? 'الخاصية / الوظيفة' : 'Feature / Permission'}</th>
                    <th className="text-center w-28">{arabic ? 'مشرف (Admin)' : 'Admin'}</th>
                    <th className="text-center w-28">{arabic ? 'معلم (Teacher)' : 'Teacher'}</th>
                    <th className="text-center w-28">{arabic ? 'ولي أمر (Parent)' : 'Parent'}</th>
                    <th className="text-center w-28">{arabic ? 'طالب (Student)' : 'Student'}</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm) => (
                    <tr key={perm.id}>
                      {/* Feature Details */}
                      <td>
                        <div className="min-w-0 py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13.5px] font-bold text-[#182b52] dark:text-white">
                              {arabic ? perm.nameAr : perm.nameEn}
                            </span>
                            <span className="text-[10px] font-medium text-[#64748b] dark:text-[#94a3b8] px-2 py-0.5 rounded bg-[#f1f5f9] dark:bg-white/[0.04]">
                              {arabic ? perm.categoryAr : perm.categoryEn}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-[#64748b] dark:text-[#94a3b8] mt-1">
                            {arabic ? perm.descAr : perm.descEn}
                          </p>
                        </div>
                      </td>

                      {/* Admin Checkbox (Locked) */}
                      <td className="text-center">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={perm.roles.admin}
                            disabled
                            aria-label={`${arabic ? perm.nameAr : perm.nameEn} - Admin`}
                            className="size-4.5 rounded accent-[#6366f1] cursor-not-allowed opacity-90"
                          />
                        </div>
                      </td>

                      {/* Teacher Checkbox */}
                      <td className="text-center">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={perm.roles.teacher}
                            onChange={() => handleTogglePermission(perm.id, 'teacher')}
                            aria-label={`${arabic ? perm.nameAr : perm.nameEn} - Teacher`}
                            className="size-4.5 rounded accent-[#19a99a] cursor-pointer"
                          />
                        </div>
                      </td>

                      {/* Parent Checkbox */}
                      <td className="text-center">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={perm.roles.parent}
                            onChange={() => handleTogglePermission(perm.id, 'parent')}
                            aria-label={`${arabic ? perm.nameAr : perm.nameEn} - Parent`}
                            className="size-4.5 rounded accent-[#3b82f6] cursor-pointer"
                          />
                        </div>
                      </td>

                      {/* Student Checkbox */}
                      <td className="text-center">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={perm.roles.student}
                            onChange={() => handleTogglePermission(perm.id, 'student')}
                            aria-label={`${arabic ? perm.nameAr : perm.nameEn} - Student`}
                            className="size-4.5 rounded accent-[#64748b] cursor-pointer"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-[#f1f5f9] dark:border-white/[0.04] bg-[#f8fafc]/50 dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-[#64748b] dark:text-[#94a3b8] flex-wrap gap-2">
              <span className="flex items-center gap-1.5">
                <Info className="size-3.5 text-[#19a99a]" />
                {arabic
                  ? 'تُحفظ المصفوفة في مساحة العمل هذه، ووصول الصفحات محكوم بالأدوار في محرك الصلاحيات.'
                  : 'This matrix is saved in the workspace; page access is enforced by the role engine.'}
              </span>
              <span>ST. GEORGE SCHOOL · {arabic ? 'مصفوفة صلاحيات' : 'RBAC matrix'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: ADD USER MODAL ───────────────────────────────────────── */}
      <Modal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={arabic ? 'إضافة مستخدم جديد للنظام' : 'Create New User Account'}
        arabic={arabic}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="btn-secondary text-[12px] h-9"
            >
              {arabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleAddUserSubmit}
              className="btn-teal text-[12px] h-9 px-5 shadow-sm"
            >
              <Check className="size-4" />
              <span>{arabic ? 'إنشاء الحساب' : 'Create Account'}</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddUserSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'الاسم بالإنجليزية *' : 'Full Name (English) *'}
              </label>
              <input
                type="text"
                required
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder="e.g. Dr. Hani Al-Khatib"
                className="ss-input text-[13px]"
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'الاسم بالعربية *' : 'Full Name (Arabic) *'}
              </label>
              <input
                type="text"
                required
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="مثال: د. هاني الخطيب"
                className="ss-input text-[13px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'البريد الإلكتروني المؤسسي *' : 'Institutional Email *'}
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@smartschool.edu"
                className="ss-input text-[13px]"
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'رقم الهاتف' : 'Phone Number'}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+966 50 000 0000"
                className="ss-input text-[13px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11.5px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'الدور الوظيفي والصلاحية *' : 'Assigned Role *'}
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="ss-input text-[13px]"
              >
                <option value="teacher">{arabic ? 'معلم / أكاديمي (Teacher)' : 'Teacher'}</option>
                <option value="parent">{arabic ? 'ولي أمر (Parent)' : 'Parent'}</option>
                <option value="student">{arabic ? 'طالب (Student)' : 'Student'}</option>
              </select>
            </div>

            {formData.role === 'student' ? (
              <div>
                <label className="block text-[11.5px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                  {arabic ? 'الفصل الدراسي *' : 'Class Section *'}
                </label>
                <select
                  value={formData.departmentEn}
                  onChange={(e) => setFormData({ ...formData, departmentEn: e.target.value })}
                  className="ss-input text-[13px]"
                  required
                >
                  <option value="">{arabic ? 'اختر الفصل' : 'Select a class'}</option>
                  {data.classes.map(cls => (
                    <option key={cls.id} value={cls.nameEn}>{arabic ? cls.nameAr : cls.nameEn}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11.5px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                  {arabic ? 'القسم / ملاحظة التعيين' : 'Department / Assignment note'}
                </label>
                <input
                  type="text"
                  value={formData.departmentEn}
                  onChange={(e) => setFormData({ ...formData, departmentEn: e.target.value })}
                  placeholder={arabic ? 'مثال: قسم الرياضيات' : 'e.g. Mathematics department'}
                  className="ss-input text-[13px]"
                />
              </div>
            )}
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-[12px] text-[#334155] dark:text-[#cbd5e1]">
              <input
                type="checkbox"
                checked={formData.sendInvite}
                onChange={(e) => setFormData({ ...formData, sendInvite: e.target.checked })}
                className="size-4 rounded accent-[#19a99a]"
              />
              <span>
                {arabic
                  ? 'إرسال رابط تفعيل الحساب وكلمة المرور المؤقتة عبر البريد الإلكتروني فوراً'
                  : 'Send welcome activation email with temporary password link immediately'}
              </span>
            </label>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 2: RESET PASSWORD CONFIRMATION ──────────────────────────── */}
      <Modal
        open={!!resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
        title={arabic ? 'إعادة ضبط كلمة المرور' : 'Reset User Password'}
        arabic={arabic}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setResetPasswordUser(null)}
              className="btn-secondary text-[12px] h-9"
            >
              {arabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!resetPasswordUser) return
                const temporaryPassword = 'Reset#' + Math.floor(1000 + Math.random() * 9000)
                updateUser(resetPasswordUser.id, { password: temporaryPassword })
                triggerToast(
                  arabic
                    ? `تم تعيين كلمة مرور مؤقتة لـ ${resetPasswordUser.nameAr}: ${temporaryPassword}`
                    : `Temporary password for ${resetPasswordUser.nameEn}: ${temporaryPassword}`
                )
                setResetPasswordUser(null)
              }}
              className="btn-teal text-[12px] h-9 shadow-sm"
            >
              <Key className="size-4" />
              <span>{arabic ? 'إرسال رابط التعيين' : 'Send Reset Link'}</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] text-[#334155] dark:text-[#cbd5e1] leading-relaxed">
            {arabic
              ? `هل أنت متأكد من رغبتك في إعادة تعيين كلمة المرور للمستخدم (${resetPasswordUser?.nameAr})؟`
              : `Are you sure you want to trigger a password reset for ${resetPasswordUser?.nameEn}?`}
          </p>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11.5px] leading-relaxed flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>
              {arabic
                ? 'سيتم إنهاء كافة الجلسات النشطة للمستخدم وإرسال رمز أمان لمرة واحدة إلى بريده المسجل.'
                : 'This will terminate all active user sessions and dispatch a secure one-time token to their email.'}
            </span>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 3: EDIT USER MODAL ─────────────────────────────────────── */}
      {editUser && (
        <Modal
          open={!!editUser}
          onClose={() => setEditUser(null)}
          title={arabic ? 'تعديل بيانات المستخدم' : 'Edit User Profile'}
          arabic={arabic}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="btn-secondary text-[12px] h-9"
              >
                {arabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleEditUserSubmit}
                className="btn-teal text-[12px] h-9 px-5 shadow-sm"
              >
                <Check className="size-4" />
                <span>{arabic ? 'حفظ التغييرات' : 'Save Changes'}</span>
              </button>
            </div>
          }
        >
          <form onSubmit={handleEditUserSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11.5px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                  {arabic ? 'الاسم بالإنجليزية' : 'Full Name (English)'}
                </label>
                <input
                  type="text"
                  value={editUser.nameEn}
                  onChange={(e) => setEditUser({ ...editUser, nameEn: e.target.value })}
                  className="ss-input text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                  {arabic ? 'الاسم بالعربية' : 'Full Name (Arabic)'}
                </label>
                <input
                  type="text"
                  value={editUser.nameAr}
                  onChange={(e) => setEditUser({ ...editUser, nameAr: e.target.value })}
                  className="ss-input text-[13px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11.5px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                  {arabic ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  className="ss-input text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                  {arabic ? 'رقم الهاتف' : 'Phone'}
                </label>
                <input
                  type="tel"
                  value={editUser.phone}
                  onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                  className="ss-input text-[13px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11.5px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                  {arabic ? 'الدور' : 'Role'}
                </label>
                <select
                  value={editUser.role}
                  onChange={(e) => {
                    const nextRole = e.target.value as UserRole
                    setEditUser({
                      ...editUser,
                      role: nextRole,
                      storeRole: nextRole === 'admin'
                        ? (editUser.storeRole === 'super_admin' ? 'super_admin' : 'school_admin')
                        : nextRole,
                    })
                  }}
                  className="ss-input text-[13px]"
                >
                  <option value="admin">{arabic ? 'مشرف' : 'Administrator'}</option>
                  <option value="teacher">{arabic ? 'معلم' : 'Teacher'}</option>
                  <option value="parent">{arabic ? 'ولي أمر' : 'Parent'}</option>
                  <option value="student">{arabic ? 'طالب' : 'Student'}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                  {arabic ? 'الشعبة / القسم' : 'Class / Department'}
                </label>
                <input
                  type="text"
                  value={editUser.departmentEn}
                  readOnly
                  className="ss-input text-[13px] opacity-70"
                  title={arabic ? 'يُدار التعيين من صفحة الفصول والطلاب' : 'Assignments are managed from Classes and Students'}
                />
              </div>
            </div>

            {editUser.storeRole === 'student' && <div>
              <label className="block text-[11.5px] font-semibold text-[#182b52] dark:text-white mb-1.5">
                {arabic ? 'ربط ملف الطالب قبل التفعيل' : 'Link student profile before activation'}
              </label>
              <select
                value={editUser.studentId || ''}
                onChange={event => setEditUser({ ...editUser, studentId: event.target.value || undefined })}
                className="ss-input text-[13px]"
              >
                <option value="">{arabic ? 'اختر ملف الطالب' : 'Select student profile'}</option>
                {data.students.filter(student =>
                  student.status === 'active' && (!data.users.some(account => account.id !== editUser.id && account.studentId === student.id)),
                ).map(student => <option key={student.id} value={student.id}>{student.studentId} — {arabic ? student.nameAr : student.nameEn}</option>)}
              </select>
            </div>}

            {editUser.storeRole === 'student' && !editUser.studentId && !editUser.active && <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4 space-y-3">
              <div>
                <p className="text-xs font-extrabold text-[#182b52] dark:text-white">{arabic ? 'لا يوجد ملف طالب مرتبط بهذا الطلب' : 'This request has no linked student profile'}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{arabic ? 'أدخل بيانات الملف واختر الفصل لإنشائه والموافقة على الحساب.' : 'Enter the profile details and choose a class to create the profile and approve the account.'}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#182b52] dark:text-white mb-1">{arabic ? 'رقم الطالب (اختياري)' : 'Student ID (optional)'}</label>
                  <input value={approvalStudentNumber} onChange={event => setApprovalStudentNumber(event.target.value)} className="ss-input text-[13px]" placeholder={arabic ? 'يُنشأ تلقائياً إذا تُرك فارغاً' : 'Generated automatically if blank'} />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#182b52] dark:text-white mb-1">{arabic ? 'الفصل الدراسي' : 'Class'}</label>
                  <select value={approvalClassId} onChange={event => setApprovalClassId(event.target.value)} className="ss-input text-[13px]">
                    <option value="">{arabic ? 'اختر الفصل' : 'Select class'}</option>
                    {data.classes.map(cls => <option key={cls.id} value={cls.id}>{arabic ? cls.nameAr : cls.nameEn}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#182b52] dark:text-white mb-1">{arabic ? 'النوع' : 'Gender'}</label>
                  <select value={approvalGender} onChange={event => setApprovalGender(event.target.value as 'male' | 'female' | '')} className="ss-input text-[13px]">
                    <option value="">{arabic ? 'اختر النوع' : 'Select gender'}</option>
                    <option value="male">{arabic ? 'ذكر' : 'Male'}</option>
                    <option value="female">{arabic ? 'أنثى' : 'Female'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#182b52] dark:text-white mb-1">{arabic ? 'تاريخ الميلاد' : 'Date of birth'}</label>
                  <input type="date" max={new Date().toISOString().slice(0, 10)} value={approvalDob} onChange={event => setApprovalDob(event.target.value)} className="ss-input text-[13px]" />
                </div>
              </div>
              <button type="button" disabled={approvingStudent || !data.classes.length} onClick={() => void approveStudentRequest()} className="btn-primary text-xs disabled:opacity-50">
                {approvingStudent ? (arabic ? 'جاري الإنشاء والموافقة...' : 'Creating and approving...') : (arabic ? 'إنشاء الملف والموافقة على الطالب' : 'Create profile and approve student')}
              </button>
            </div>}
          </form>
        </Modal>
      )}
    </div>
  )
}
