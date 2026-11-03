'use client'

import React, { useMemo, useState } from 'react'
import {
  BookOpen,
  Plus,
  LayoutGrid,
  List,
  Search,
  Filter,
  Users,
  GraduationCap,
  DoorOpen,
  Edit2,
  Trash2,
  MoreVertical,
  CheckCircle2,
  X,
  BookText,
  Calculator,
  FlaskConical,
  Languages,
  Laptop,
  Globe,
  Palette,
  Sparkles,
  ArrowUpRight
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge, type BadgeVariant } from '@/components/shared/Badge'
import { cn } from '@/lib/utils'
import { useSchool } from '@/lib/school/store'
import { classPerformance } from '@/lib/school/engine'

interface SubjectItem {
  id: string
  nameAr: string
  nameEn: string
  variant: BadgeVariant
}

interface ClassItem {
  id: string
  nameAr: string
  nameEn: string
  gradeAr: string
  gradeEn: string
  teacherAr: string
  teacherEn: string
  students: number
  capacity: number
  roomAr: string
  roomEn: string
  subjects: SubjectItem[]
  performanceAvg: number
}

interface SubjectCardData {
  id: string
  nameAr: string
  nameEn: string
  code: string
  icon: React.ComponentType<{ className?: string }>
  classesCount: number
  teachersCount: number
  weeklyHours: number
  leadTeacherAr: string
  leadTeacherEn: string
  color: string
}

export function ClassesPage({ arabic = true }: { arabic?: boolean }) {
  const { data, addClass, updateClass, removeClass } = useSchool()
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGrade, setSelectedGrade] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3200)
  }

  // New Class Form State
  const [formData, setFormData] = useState({
    nameEn: '',
    nameAr: '',
    gradeEn: 'Grade 9',
    gradeAr: 'الصف التاسع',
    teacherEn: '',
    teacherAr: '',
    roomEn: 'Room 105',
    roomAr: 'قاعة ١٠٥',
    capacity: 30,
    students: 0,
  })

  const classes = useMemo<ClassItem[]>(() => {
    const performance = classPerformance(data)
    const variants: BadgeVariant[] = ['teal', 'indigo', 'info', 'success', 'violet', 'warning']
    return data.classes.map(cls => {
      const roster = data.students.filter(student => student.classId === cls.id && student.status === 'active')
      const homeroom = data.teachers.find(teacher => teacher.id === cls.homeroomTeacherId)
      const subjectIds = Array.from(new Set(
        data.teachers.filter(teacher => teacher.classIds.includes(cls.id)).flatMap(teacher => teacher.subjectIds),
      ))
      return {
        id: cls.id,
        nameAr: cls.nameAr,
        nameEn: cls.nameEn,
        gradeAr: 'الصف ' + cls.gradeLevel,
        gradeEn: 'Grade ' + cls.gradeLevel,
        teacherAr: homeroom?.nameAr ?? '—',
        teacherEn: homeroom?.nameEn ?? '—',
        students: roster.length,
        capacity: cls.capacity,
        roomAr: cls.room,
        roomEn: cls.room,
        performanceAvg: Math.round(performance.find(row => row.cls.id === cls.id)?.average ?? 0),
        subjects: subjectIds.slice(0, 4).map((subjectId, index) => {
          const subject = data.subjects.find(item => item.id === subjectId)
          return {
            id: subjectId,
            nameAr: subject?.nameAr ?? '—',
            nameEn: subject?.nameEn ?? '—',
            variant: variants[index % variants.length],
          }
        }),
      }
    })
  }, [data])

  const subjectsData = useMemo<SubjectCardData[]>(() => {
    const icons = [Calculator, FlaskConical, BookText, Languages, Sparkles, Laptop, Globe, Palette]
    return data.subjects.map((subject, index) => {
      const teachers = data.teachers.filter(teacher => teacher.subjectIds.includes(subject.id))
      const classesCovered = data.classes.filter(cls =>
        data.exams.some(exam => exam.subjectId === subject.id && exam.classId === cls.id) ||
        data.homework.some(homework => homework.subjectId === subject.id && homework.classId === cls.id) ||
        teachers.some(teacher => teacher.classIds.includes(cls.id)),
      )
      const assessments = data.exams.filter(exam => exam.subjectId === subject.id).length
      const lead = teachers[0]
      return {
        id: subject.id,
        nameAr: subject.nameAr,
        nameEn: subject.nameEn,
        code: subject.code,
        icon: icons[index % icons.length],
        classesCount: classesCovered.length,
        teachersCount: teachers.length,
        weeklyHours: assessments,
        leadTeacherAr: lead?.nameAr ?? '—',
        leadTeacherEn: lead?.nameEn ?? '—',
        color: subject.color,
      }
    })
  }, [data])

  const gradeLevels = useMemo(
    () => Array.from(new Set(data.classes.map(cls => cls.gradeLevel))).sort((a, b) => a - b),
    [data],
  )

  // Filtered classes
  const filteredClasses = classes.filter((item) => {
    const matchesSearch =
      item.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.teacherAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.teacherEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.roomEn.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesGrade =
      selectedGrade === 'all' ||
      item.gradeEn.toLowerCase().includes(selectedGrade.toLowerCase())

    return matchesSearch && matchesGrade
  })

  // Calculations
  const totalStudents = classes.reduce((acc, c) => acc + c.students, 0)
  const totalCapacity = classes.reduce((acc, c) => acc + c.capacity, 0)
  const occupancyRate = totalCapacity ? Math.round((totalStudents / totalCapacity) * 100) : 0

  const handleOpenAdd = () => {
    const defaultLevel = gradeLevels[0] ?? 9
    setEditingClass(null)
    setFormData({
      nameEn: 'Grade ' + defaultLevel + '-C',
      nameAr: 'الصف ' + defaultLevel + ' - ج',
      gradeEn: 'Grade ' + defaultLevel,
      gradeAr: 'الصف ' + defaultLevel,
      teacherEn: data.teachers[0]?.nameEn ?? '',
      teacherAr: data.teachers[0]?.nameAr ?? '',
      roomEn: 'Room 105',
      roomAr: 'قاعة ١٠٥',
      capacity: 30,
      students: 0,
    })
    setIsAddModalOpen(true)
  }

  const handleOpenEdit = (item: ClassItem) => {
    const cls = data.classes.find(c => c.id === item.id)
    const homeroom = data.teachers.find(t => t.id === cls?.homeroomTeacherId)
    setEditingClass(item)
    setFormData({
      nameEn: item.nameEn,
      nameAr: item.nameAr,
      gradeEn: item.gradeEn,
      gradeAr: item.gradeAr,
      teacherEn: homeroom?.nameEn ?? '',
      teacherAr: homeroom?.nameAr ?? '',
      roomEn: item.roomEn,
      roomAr: item.roomAr,
      capacity: item.capacity,
      students: item.students,
    })
    setIsAddModalOpen(true)
  }

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault()
    const teacher = data.teachers.find(t => t.nameEn === formData.teacherEn || t.nameAr === formData.teacherAr)
    const patch = {
      nameAr: formData.nameAr,
      nameEn: formData.nameEn,
      capacity: Number(formData.capacity),
      room: formData.roomEn,
      homeroomTeacherId: teacher?.id,
    }
    if (editingClass) {
      updateClass(editingClass.id, patch)
      showToast(arabic ? 'تم تحديث بيانات الفصل.' : 'Class details updated.')
    } else {
      const gradeLevel = Number(formData.gradeEn.replace(/[^0-9]/g, '')) || gradeLevels[0] || 9
      const section = formData.nameEn.split('-').pop()?.trim().toUpperCase() || 'A'
      addClass({ ...patch, gradeLevel, section }).then(result => {
        if (!result.ok) {
          showToast(
            result.error === 'duplicate_class'
              ? (arabic ? 'يوجد فصل بنفس الصف والشعبة.' : 'A class with this grade and section already exists.')
              : (arabic ? 'تعذر إنشاء الفصل.' : 'Could not create the class.'),
          )
          return
        }
        showToast(arabic ? 'تم إنشاء الفصل وإضافته للقائمة.' : 'Class created and added to the list.')
      })
    }
    setIsAddModalOpen(false)
  }

  const handleDeleteClass = (id: string) => {
    const cls = data.classes.find(c => c.id === id)
    const roster = data.students.filter(student => student.classId === id)
    if (roster.length > 0) {
      showToast(
        arabic
          ? 'لا يمكن حذف فصل به ' + roster.length + ' طالباً. انقل الطلاب أولاً من صفحة الطلاب.'
          : 'Cannot delete a class with ' + roster.length + ' students. Transfer them from Students first.',
      )
      return
    }
    if (confirm(arabic ? 'هل أنت متأكد من حذف الفصل ' + (cls?.nameAr ?? '') + '؟' : 'Delete class ' + (cls?.nameEn ?? '') + '?')) {
      removeClass(id).then(result => {
        showToast(
          result.ok
            ? (arabic ? 'تم حذف الفصل.' : 'Class deleted.')
            : (arabic ? 'تعذر حذف الفصل.' : 'Could not delete the class.'),
        )
      })
    }
  }


  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto" dir={arabic ? 'rtl' : 'ltr'}>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-toast-in bg-[#182b52] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-[#19a99a]/40 text-sm">
          <div className="size-2 rounded-full bg-[#19a99a] animate-pulse" />
          <span>{toast}</span>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────── */}
      <PageHeader
        arabic={arabic}
        title={arabic ? 'الفصول والمواد الدراسية' : 'Classes & Subjects'}
        subtitle={
          arabic
            ? 'إدارة الشعب الدراسية، السعة الاستيعابية، توزيع المناهج وهيئة التدريس'
            : 'Manage class sections, capacity thresholds, subject allocations, and faculty'
        }
        icon={BookOpen}
        breadcrumb={[
          arabic ? 'الرئيسية' : 'Home',
          arabic ? 'الإدارة الأكاديمية' : 'Academics',
          arabic ? 'الفصول والمواد' : 'Classes & Subjects',
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenAdd}
              className="btn-teal flex items-center gap-2 shadow-md shadow-teal-500/20"
            >
              <Plus className="size-4 stroke-[2.5]" />
              <span>{arabic ? 'إضافة فصل جديد' : 'Add Class'}</span>
            </button>
          </div>
        }
      />

      {/* ── Metric Highlights Banner ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-base p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">
              {arabic ? 'إجمالي الفصول' : 'Total Classes'}
            </p>
            <h3 className="text-2xl font-extrabold text-[#182b52] dark:text-white mt-1">
              {classes.length}
            </h3>
            <p className="text-xs text-[#19a99a] mt-1 font-medium">
              {arabic ? gradeLevels.length + ' مستويات دراسية' : gradeLevels.length + ' Grade levels'}
            </p>
          </div>
          <div className="size-11 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-[#19a99a] flex items-center justify-center">
            <BookOpen className="size-5" />
          </div>
        </div>

        <div className="card-base p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">
              {arabic ? 'الطلاب المسجلون' : 'Enrolled Students'}
            </p>
            <h3 className="text-2xl font-extrabold text-[#182b52] dark:text-white mt-1">
              {totalStudents} <span className="text-sm font-medium text-[#64748b] dark:text-[#94a3b8]">/ {totalCapacity}</span>
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{occupancyRate}%</span>
              <span className="text-xs text-[#64748b] dark:text-[#94a3b8]">{arabic ? 'نسبة الإشغال' : 'Occupancy'}</span>
            </div>
          </div>
          <div className="size-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Users className="size-5" />
          </div>
        </div>

        <div className="card-base p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">
              {arabic ? 'المواد الدراسية' : 'Curricula Subjects'}
            </p>
            <h3 className="text-2xl font-extrabold text-[#182b52] dark:text-white mt-1">
              {subjectsData.length}
            </h3>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
              {arabic ? '٣٤ حصة أسبوعية' : '34 Weekly periods'}
            </p>
          </div>
          <div className="size-11 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <BookText className="size-5" />
          </div>
        </div>

        <div className="card-base p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#64748b] dark:text-[#94a3b8] uppercase tracking-wider">
              {arabic ? 'متوسط الأداء العام' : 'School Performance'}
            </p>
            <h3 className="text-2xl font-extrabold text-[#182b52] dark:text-white mt-1">
              87.4%
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
              <ArrowUpRight className="size-3.5" />
              <span>{arabic ? '+2.4% عن الشهر السابق' : '+2.4% vs last month'}</span>
            </p>
          </div>
          <div className="size-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Sparkles className="size-5" />
          </div>
        </div>
      </div>

      {/* ── Controls & Filter Bar ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 card-base p-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className={cn("size-4 text-[#94a3b8] absolute top-1/2 -translate-y-1/2", arabic ? "right-3.5" : "left-3.5")} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={arabic ? 'البحث عن فصل، معلم، أو قاعة...' : 'Search class, teacher, or room...'}
            className={cn("ss-input text-xs sm:text-sm", arabic ? "pr-10" : "pl-10")}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Grade filter */}
          <div className="flex items-center gap-1.5 bg-[#f8fafc] dark:bg-white/[0.04] p-1 rounded-xl border border-[#e2e8f0] dark:border-white/[0.08]">
            <Filter className="size-3.5 text-[#64748b] dark:text-[#94a3b8] mx-1.5" />
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              aria-label={arabic ? 'تصفية حسب الصف' : 'Filter by grade'}
              className="bg-transparent text-xs font-semibold text-[#182b52] dark:text-white focus:outline-none cursor-pointer py-1 px-1"
            >
              <option value="all" className="dark:bg-[#0f1f3d]">{arabic ? 'جميع الصفوف' : 'All Grades'}</option>
              {gradeLevels.map(level => (
                <option key={level} value={'Grade ' + level} className="dark:bg-[#0f1f3d]">
                  {arabic ? 'الصف ' + level : 'Grade ' + level}
                </option>
              ))}
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-[#f1f5f9] dark:bg-white/[0.06] p-1 rounded-xl border border-[#e2e8f0] dark:border-white/[0.08]">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#0f1f3d] text-[#19a99a] shadow-sm'
                  : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#182b52]'
              )}
            >
              <LayoutGrid className="size-3.5" />
              <span>{arabic ? 'شبكة' : 'Grid'}</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'table'
                  ? 'bg-white dark:bg-[#0f1f3d] text-[#19a99a] shadow-sm'
                  : 'text-[#64748b] dark:text-[#94a3b8] hover:text-[#182b52]'
              )}
            >
              <List className="size-3.5" />
              <span>{arabic ? 'جدول' : 'Table'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── View: Grid View ───────────────────────────────────── */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredClasses.map((cls) => {
            const fillPct = Math.round((cls.students / cls.capacity) * 100)
            const isFull = fillPct >= 100

            return (
              <div
                key={cls.id}
                className="card-base p-5 flex flex-col justify-between group hover:border-[#19a99a]/40 transition-all duration-300"
              >
                <div>
                  {/* Top Bar: Title & Edit Button */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-extrabold text-[#182b52] dark:text-white tracking-tight">
                          {arabic ? cls.nameAr : cls.nameEn}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-[#f1f5f9] dark:bg-white/[0.08] text-[#64748b] dark:text-[#94a3b8]">
                          {cls.performanceAvg}%
                        </span>
                      </div>
                      <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5 flex items-center gap-1.5">
                        <DoorOpen className="size-3 text-[#19a99a]" />
                        <span>{arabic ? cls.roomAr : cls.roomEn}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(cls)}
                        title={arabic ? 'تعديل الفصل' : 'Edit class'}
                        className="btn-icon size-8 hover:bg-teal-50 dark:hover:bg-teal-500/10 hover:text-[#19a99a] hover:border-[#19a99a]/30"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls.id)}
                        title={arabic ? 'حذف الفصل' : 'Delete class'}
                        className="btn-icon size-8 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 hover:border-red-300"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Homeroom Teacher */}
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#f8fafc] dark:bg-white/[0.03] border border-[#e2e8f0]/80 dark:border-white/[0.04] mb-3.5">
                    <div className="size-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <GraduationCap className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-[#94a3b8]">
                        {arabic ? 'رائد الفصل' : 'Homeroom Teacher'}
                      </p>
                      <p className="text-xs font-bold text-[#182b52] dark:text-white truncate">
                        {arabic ? cls.teacherAr : cls.teacherEn}
                      </p>
                    </div>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#64748b] dark:text-[#94a3b8] flex items-center gap-1">
                        <Users className="size-3.5" />
                        <span>{arabic ? 'الطلاب المقيدون' : 'Enrolled'}</span>
                      </span>
                      <span className={cn(isFull ? "text-amber-600 dark:text-amber-400" : "text-[#182b52] dark:text-white")}>
                        {cls.students} / {cls.capacity}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#f1f5f9] dark:bg-white/[0.08] overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isFull
                            ? "bg-amber-500"
                            : fillPct > 85
                            ? "bg-[#19a99a]"
                            : "bg-[#3b82f6]"
                        )}
                        style={{ width: `${Math.min(fillPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Subject Badges */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase font-bold text-[#94a3b8] tracking-wider">
                      {arabic ? 'المواد المقررة' : 'Subjects'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {cls.subjects.map((sub) => (
                        <Badge key={sub.id} variant={sub.variant} size="sm">
                          {arabic ? sub.nameAr : sub.nameEn}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3.5 mt-3.5 border-t border-[#f1f5f9] dark:border-white/[0.05] flex items-center justify-between text-[11px] text-[#64748b] dark:text-[#94a3b8]">
                  <span>{arabic ? 'المستوى الأساسي' : 'Primary Track'}</span>
                  <button
                    onClick={() => handleOpenEdit(cls)}
                    className="font-bold text-[#19a99a] hover:underline"
                  >
                    {arabic ? 'عرض الجدول ←' : 'View Schedule →'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── View: Table View ─────────────────────────────────── */
        <div className="card-base overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ss-table">
              <thead>
                <tr>
                  <th>{arabic ? 'اسم الفصل / الشعبة' : 'Class / Section'}</th>
                  <th>{arabic ? 'المستوى' : 'Grade'}</th>
                  <th>{arabic ? 'رائد الفصل' : 'Homeroom Teacher'}</th>
                  <th>{arabic ? 'القاعة' : 'Room'}</th>
                  <th>{arabic ? 'الاستيعاب والطلاب' : 'Capacity'}</th>
                  <th>{arabic ? 'المواد' : 'Subjects'}</th>
                  <th>{arabic ? 'متوسط الأداء' : 'Avg Score'}</th>
                  <th className="text-center">{arabic ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((cls) => {
                  const fillPct = Math.round((cls.students / cls.capacity) * 100)
                  return (
                    <tr key={cls.id}>
                      <td className="font-bold text-[#182b52] dark:text-white">
                        {arabic ? cls.nameAr : cls.nameEn}
                      </td>
                      <td className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                        {arabic ? cls.gradeAr : cls.gradeEn}
                      </td>
                      <td className="font-medium">
                        {arabic ? cls.teacherAr : cls.teacherEn}
                      </td>
                      <td>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#f1f5f9] dark:bg-white/[0.06]">
                          {arabic ? cls.roomAr : cls.roomEn}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 min-w-[130px]">
                          <div className="flex-1 h-2 rounded-full bg-[#f1f5f9] dark:bg-white/[0.08] overflow-hidden">
                            <div
                              className="h-full bg-[#19a99a] rounded-full"
                              style={{ width: `${Math.min(fillPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold">
                            {cls.students}/{cls.capacity}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {cls.subjects.slice(0, 3).map((sub) => (
                            <Badge key={sub.id} variant={sub.variant} size="sm">
                              {arabic ? sub.nameAr : sub.nameEn}
                            </Badge>
                          ))}
                          {cls.subjects.length > 3 && (
                            <span className="text-[10px] font-bold text-[#64748b]">
                              +{cls.subjects.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-500/10 text-[#19a99a]">
                          {cls.performanceAvg}%
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(cls)}
                            className="btn-icon size-7 hover:text-[#19a99a]"
                            title={arabic ? 'تعديل' : 'Edit'}
                          >
                            <Edit2 className="size-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteClass(cls.id)}
                            className="btn-icon size-7 hover:text-red-600"
                            title={arabic ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Subjects Section Below ────────────────────────────── */}
      <div className="space-y-4 pt-4 border-t border-[#e2e8f0] dark:border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-extrabold text-[#182b52] dark:text-white tracking-tight flex items-center gap-2.5">
              <BookText className="size-5 text-[#19a99a]" />
              <span>{arabic ? 'المناهج والمواد التعليمية المعتمدة' : 'Curricula & Subjects'}</span>
            </h3>
            <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-0.5">
              {arabic
                ? 'نظرة شاملة على المواد، نصاب الحصص الأسبوعية، والمعلمين المخصصين'
                : 'Comprehensive overview of subjects, weekly periods, and assigned faculty'}
            </p>
          </div>
          <span className="badge-teal self-start sm:self-auto text-xs font-bold px-3 py-1.5 rounded-xl">
            {subjectsData.length} {arabic ? 'مواد معتمدة' : 'subjects'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjectsData.map((subj) => {
            const SubjIcon = subj.icon
            return (
              <div
                key={subj.id}
                className="card-base p-5 hover:border-[#19a99a]/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className="size-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                      style={{ backgroundColor: `${subj.color}18`, color: subj.color }}
                    >
                      <SubjIcon className="size-5" />
                    </div>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#f1f5f9] dark:bg-white/[0.08] text-[#64748b] dark:text-[#94a3b8]">
                      {subj.code}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-[#182b52] dark:text-white">
                    {arabic ? subj.nameAr : subj.nameEn}
                  </h4>
                  <p className="text-xs text-[#64748b] dark:text-[#94a3b8] mt-1 font-medium">
                    {arabic ? `رئيس المادة: ${subj.leadTeacherAr}` : `Head: ${subj.leadTeacherEn}`}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#f1f5f9] dark:border-white/[0.05] grid grid-cols-3 gap-2 text-center">
                  <div className="p-1.5 rounded-lg bg-[#f8fafc] dark:bg-white/[0.03]">
                    <p className="text-[10px] text-[#94a3b8] font-bold">{arabic ? 'الفصول' : 'Classes'}</p>
                    <p className="text-xs font-extrabold text-[#182b52] dark:text-white mt-0.5">{subj.classesCount}</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-[#f8fafc] dark:bg-white/[0.03]">
                    <p className="text-[10px] text-[#94a3b8] font-bold">{arabic ? 'المعلمون' : 'Teachers'}</p>
                    <p className="text-xs font-extrabold text-[#182b52] dark:text-white mt-0.5">{subj.teachersCount}</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-[#f8fafc] dark:bg-white/[0.03]">
                    <p className="text-[10px] text-[#94a3b8] font-bold">{arabic ? 'اختبارات' : 'Assessments'}</p>
                    <p className="text-xs font-extrabold text-[#19a99a] mt-0.5">{subj.weeklyHours}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Modal: Add / Edit Class ───────────────────────────── */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-box p-6 space-y-5" dir={arabic ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between border-b border-[#e2e8f0] dark:border-white/[0.08] pb-3">
              <h3 className="text-lg font-bold text-[#182b52] dark:text-white">
                {editingClass
                  ? arabic ? 'تعديل بيانات الفصل' : 'Edit Class Details'
                  : arabic ? 'إضافة فصل دراسي جديد' : 'Add New Class Section'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="btn-icon size-7"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                    {arabic ? 'اسم الفصل (عربي)' : 'Class Name (Arabic)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    className="ss-input text-sm"
                    placeholder="الصف الأول - ج"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                    {arabic ? 'اسم الفصل (إنجليزي)' : 'Class Name (English)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    className="ss-input text-sm"
                    placeholder="Grade 1-C"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                    {arabic ? 'رائد الفصل' : 'Homeroom Teacher'}
                  </label>
                  <select
                    value={formData.teacherEn}
                    onChange={(e) => {
                      const teacher = data.teachers.find(t => t.nameEn === e.target.value)
                      setFormData({ ...formData, teacherEn: teacher?.nameEn ?? '', teacherAr: teacher?.nameAr ?? '' })
                    }}
                    className="ss-input text-sm"
                  >
                    {data.teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.nameEn}>{arabic ? teacher.nameAr : teacher.nameEn}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                    {arabic ? 'رقم القاعة' : 'Room Number'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.roomEn}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        roomEn: e.target.value,
                        roomAr: `قاعة ${e.target.value.replace(/[^0-9]/g, '')}`,
                      })
                    }
                    className="ss-input text-sm"
                    placeholder="Room 105"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#64748b] dark:text-[#94a3b8] mb-1">
                    {arabic ? 'السعة الكلية' : 'Max Capacity'}
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="45"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="ss-input text-sm"
                  />
                </div>

              </div>

              <div className="pt-3 border-t border-[#e2e8f0] dark:border-white/[0.08] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  {arabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" className="btn-teal text-xs">
                  {editingClass
                    ? arabic ? 'تحديث البيانات' : 'Update Class'
                    : arabic ? 'حفظ الفصل' : 'Save Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
