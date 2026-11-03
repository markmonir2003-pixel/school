'use client'

import React, { useState } from 'react'
import {
  GraduationCap,
  BookOpen,
  Users,
  Calendar,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Award,
  ChevronRight,
  ChevronLeft,
  Search,
  ExternalLink,
  LogIn,
  Sun,
  Moon,
  Send,
  CheckCircle2,
  FileText,
  Star,
} from 'lucide-react'
import { useSchool } from '@/lib/school/store'

interface PublicWebsiteProps {
  onOpenLogin: () => void
}

type PublicSection =
  | 'home'
  | 'about'
  | 'admissions'
  | 'academics'
  | 'activities'
  | 'news'
  | 'library'
  | 'contact'

export function PublicWebsite({ onOpenLogin }: PublicWebsiteProps) {
  const { data, lang, setLang, theme, setTheme } = useSchool()
  const ar = lang === 'ar'
  const [activeSection, setActiveSection] = useState<PublicSection>('home')
  const [inquirySent, setInquirySent] = useState(false)
  const [inquiryName, setInquiryName] = useState('')
  const [inquiryEmail, setInquiryEmail] = useState('')
  const [inquiryMessage, setInquiryMessage] = useState('')
  const [libraryQuery, setLibraryQuery] = useState('')

  const cms = data?.cms
  const settings = data?.settings

  const navItems: Array<{ id: PublicSection; labelAr: string; labelEn: string }> = [
    { id: 'home', labelAr: 'الرئيسية', labelEn: 'Home' },
    { id: 'about', labelAr: 'عن المدرسة', labelEn: 'About Us' },
    { id: 'admissions', labelAr: 'القبول والتسجيل', labelEn: 'Admissions' },
    { id: 'academics', labelAr: 'البرامج الأكاديمية', labelEn: 'Academics' },
    { id: 'activities', labelAr: 'الأنشطة والمشاريع', labelEn: 'Activities & Projects' },
    { id: 'news', labelAr: 'الأخبار والفعاليات', labelEn: 'News & Events' },
    { id: 'library', labelAr: 'المكتبة الرقمية', labelEn: 'Digital Library' },
    { id: 'contact', labelAr: 'اتصل بنا', labelEn: 'Contact' },
  ]

  const handleInquiry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inquiryName.trim() || !inquiryEmail.trim()) return
    setInquirySent(true)
    setTimeout(() => {
      setInquirySent(false)
      setInquiryName('')
      setInquiryEmail('')
      setInquiryMessage('')
    }, 4000)
  }

  const publicAnnouncements = (data?.announcements || []).filter(a => a.published)
  const publicEvents = (data?.events || []).filter(e => e.published)
  const publicProjects = (data?.studentProjects || []).filter(p => p.status === 'approved' || p.featured)
  const publicLibrary = (data?.libraryResources || []).filter(r => {
    if (!libraryQuery.trim()) return r.isDigital
    const q = libraryQuery.toLowerCase()
    return r.titleAr.toLowerCase().includes(q) || r.titleEn.toLowerCase().includes(q) || r.author.toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 dark:bg-[#071120] dark:text-slate-100 transition-colors duration-300 font-sans" dir={ar ? 'rtl' : 'ltr'}>
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0f1f3d]/95 backdrop-blur-md border-b border-white/10 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & School Name */}
          <button
            onClick={() => setActiveSection('home')}
            className="flex items-center gap-3.5 group text-start focus:outline-none"
          >
            <img src="/school-mark.svg" alt="" className="size-12 shrink-0 drop-shadow-[0_5px_14px_rgba(197,160,89,0.24)] transition-transform group-hover:scale-105" />
            <div>
              <p className="text-base sm:text-lg font-black tracking-tight text-white leading-none">
                {ar ? (settings?.schoolNameAr || 'مدرسة سان جورج') : (settings?.schoolNameEn || 'St. George School')}
              </p>
              <p className="text-[11px] font-semibold text-[#c5a059] tracking-wider uppercase mt-1">
                {ar ? (settings?.platformNameAr || 'الحرم الرقمي لمدرسة سان جورج') : (settings?.platformNameEn || 'St. George Digital Campus')}
              </p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs xl:text-sm font-semibold transition-all ${
                  activeSection === item.id
                    ? 'bg-[#c5a059] text-[#071120] shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {ar ? item.labelAr : item.labelEn}
              </button>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language toggle */}
            <button
              onClick={() => setLang(ar ? 'en' : 'ar')}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
              title={ar ? 'تغيير اللغة' : 'Change Language'}
            >
              <Globe className="size-3.5 text-[#c5a059]" />
              <span>{ar ? 'EN' : 'عربي'}</span>
            </button>

            {/* Dark Mode toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors"
              title={ar ? 'الوضع الليلي' : 'Toggle Theme'}
            >
              {theme === 'dark' ? <Sun className="size-4 text-[#c5a059]" /> : <Moon className="size-4 text-slate-300" />}
            </button>

            {/* Login button */}
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#b38f45] text-[#071120] text-xs sm:text-sm font-extrabold shadow-md shadow-[#c5a059]/25 hover:brightness-110 active:scale-95 transition-all"
            >
              <LogIn className="size-4" />
              <span>{ar ? 'تسجيل الدخول' : 'Portal Login'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Submenu Bar */}
        <div className="lg:hidden border-t border-white/5 px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold ${
                activeSection === item.id
                  ? 'bg-[#c5a059] text-[#071120]'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {ar ? item.labelAr : item.labelEn}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <main>
        {/* SECTION: HOME */}
        {activeSection === 'home' && (
          <div>
            {/* Hero Banner */}
            <section className="relative overflow-hidden bg-gradient-to-b from-[#0f1f3d] via-[#14294f] to-[#071120] text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
              <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(#c5a059 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
              <div className="relative max-w-5xl mx-auto text-center space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c5a059]/15 border border-[#c5a059]/30 text-[#c5a059] text-xs sm:text-sm font-bold shadow-sm">
                  <Sparkles className="size-4" />
                  <span>{ar ? (settings?.mottoAr || 'التميز في التعليم وبناء الشخصية والقيم') : (settings?.mottoEn || 'Excellence in Education, Character, and Faith')}</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                  {ar ? (cms?.heroTitleAr || 'الحرم الرقمي لمدرسة سان جورج') : (cms?.heroTitleEn || 'St. George School Digital Campus')}
                </h1>

                <p className="text-sm sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
                  {ar ? (cms?.heroSubtitleAr || 'منظومة تعليمية متكاملة تواكب المستقبل وتغرس أرفع القيم الأكاديمية والتربوية.') : (cms?.heroSubtitleEn || 'An integrated digital learning environment combining academic excellence, character building, and future-ready innovation.')}
                </p>

                <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
                  <button
                    onClick={onOpenLogin}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#c5a059] to-[#b38f45] text-[#071120] font-extrabold text-sm shadow-xl shadow-[#c5a059]/25 hover:brightness-110 transition-all"
                  >
                    <span>{ar ? 'الدخول إلى البوابة الأكاديمية' : 'Access Digital Campus'}</span>
                    {ar ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
                  </button>
                  <button
                    onClick={() => setActiveSection('about')}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm transition-all"
                  >
                    <BookOpen className="size-4 text-[#c5a059]" />
                    <span>{ar ? 'التعرف على مدرسة سان جورج' : 'Discover St. George'}</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Quick Access Roles Hub */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { role: 'student', titleAr: 'بوابة الطلاب', titleEn: 'Student Portal', descAr: 'المقررات، الواجبات، الاختبارات والنتائج', descEn: 'Courses, assignments, exams & grades', icon: GraduationCap, color: 'from-[#0f1f3d] to-[#182b52]' },
                  { role: 'parent', titleAr: 'بوابة أولياء الأمور', titleEn: 'Parent Portal', descAr: 'متابعة التحصيل الأكاديمي، الحضور والتواصل', descEn: 'Track academic progress, attendance & contact', icon: Users, color: 'from-[#14294f] to-[#1e3a6a]' },
                  { role: 'teacher', titleAr: 'لوحة المعلمين', titleEn: 'Teacher Hub', descAr: 'رصد الحضور، الدرجات، والمحتوى التعليمي', descEn: 'Manage attendance, grading & learning media', icon: BookOpen, color: 'from-[#182b52] to-[#0f1f3d]' },
                  { role: 'admin', titleAr: 'الإدارة المدرسية', titleEn: 'School Admin', descAr: 'الإشراف الأكاديمي الشامل وسجلات المنظومة', descEn: 'Comprehensive school operations & audit logs', icon: ShieldCheck, color: 'from-[#0a1628] to-[#14294f]' },
                ].map(card => (
                  <div
                    key={card.role}
                    onClick={onOpenLogin}
                    className="p-6 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                  >
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-[#c5a059] to-[#9a7836] p-0.5 flex items-center justify-center mb-4 shadow-md shadow-[#c5a059]/20">
                      <div className="size-full rounded-[14px] bg-[#0f1f3d] flex items-center justify-center">
                        <card.icon className="size-6 text-[#c5a059]" />
                      </div>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-[#c5a059] transition-colors">
                      {ar ? card.titleAr : card.titleEn}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {ar ? card.descAr : card.descEn}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* School Pillars */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <p className="text-xs font-bold text-[#c5a059] tracking-widest uppercase">{ar ? 'ركائز التعليم في مدرسة سان جورج' : 'Core Educational Pillars'}</p>
                <h2 className="text-2xl sm:text-3xl font-black mt-2 text-slate-900 dark:text-white">
                  {ar ? 'بيئة أكاديمية متكاملة تبني المستقبل' : 'A Holistic Foundation for Future Leaders'}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { titleAr: 'الريادة الأكاديمية', titleEn: 'Academic Rigor', descAr: 'مناهج معتمدة دولياً ومحلياً تركز على التفكير النقدي والابتكار وتنمية المهارات.', descEn: 'Accredited curricula emphasizing critical thinking, innovation, and intellectual growth.', icon: Award },
                  { titleAr: 'القيم والأخلاق', titleEn: 'Character & Values', descAr: 'غرس مبادئ الانضباط والنزاهة والمسؤولية الأخلاقية والاجتماعية في نفوس أبنائنا.', descEn: 'Nurturing discipline, integrity, ethical responsibility, and community values.', icon: Star },
                  { titleAr: 'التحول الرقمي الذكي', titleEn: 'Digital Innovation', descAr: 'توظيف أحدث تقنيات التعليم الرقمي لتمكين الطلاب من أدوات العصر الحديث.', descEn: 'Empowering students with advanced educational technology and digital literacy.', icon: Sparkles },
                ].map((pillar, i) => (
                  <div key={i} className="p-8 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 shadow-sm text-center">
                    <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-[#c5a059]/15 text-[#c5a059] mb-4">
                      <pillar.icon className="size-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{ar ? pillar.titleAr : pillar.titleEn}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{ar ? pillar.descAr : pillar.descEn}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* SECTION: ABOUT */}
        {activeSection === 'about' && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 animate-fade-in">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-[#c5a059] uppercase tracking-wider">{ar ? 'عن الصرح التعليمي' : 'About St. George'}</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                {ar ? (settings?.schoolNameAr || 'مدرسة سان جورج') : (settings?.schoolNameEn || 'St. George School')}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
                {ar ? (cms?.aboutAr) : (cms?.aboutEn)}
              </p>
            </div>

            {/* Mission & Vision */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
                <div className="size-10 rounded-xl bg-[#c5a059]/15 flex items-center justify-center text-[#c5a059]">
                  <Award className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{ar ? 'رسالة المدرسة' : 'Our Mission'}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{ar ? cms?.missionAr : cms?.missionEn}</p>
              </div>

              <div className="p-8 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
                <div className="size-10 rounded-xl bg-[#c5a059]/15 flex items-center justify-center text-[#c5a059]">
                  <Sparkles className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{ar ? 'رؤية المدرسة' : 'Our Vision'}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{ar ? cms?.visionAr : cms?.visionEn}</p>
              </div>
            </div>

            {/* Principal's Message */}
            <div className="p-8 rounded-3xl bg-gradient-to-r from-[#0f1f3d] to-[#182b52] text-white shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-[#c5a059] text-[#071120] flex items-center justify-center font-black text-lg">
                  SG
                </div>
                <div>
                  <h4 className="font-bold text-base text-white">{ar ? (settings?.principalNameAr || 'إدارة مدرسة سان جورج') : (settings?.principalNameEn || 'St. George Leadership')}</h4>
                  <p className="text-xs text-[#c5a059]">{ar ? 'كلمة إدارة المدرسة' : 'Leadership Message'}</p>
                </div>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed italic">
                "{ar ? cms?.principalMessageAr : cms?.principalMessageEn}"
              </p>
            </div>
          </section>
        )}

        {/* SECTION: ADMISSIONS */}
        {activeSection === 'admissions' && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10 animate-fade-in">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-[#c5a059] uppercase tracking-wider">{ar ? 'القبول والتسجيل' : 'Admissions Portal'}</span>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {ar ? 'الالتحاق بمدرسة سان جورج' : 'Join St. George School'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
                {ar ? (cms?.admissionsGuideAr) : (cms?.admissionsGuideEn)}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { step: '01', titleAr: 'تقديم الطلب الإلكتروني', titleEn: 'Online Application', descAr: 'تعبئة استمارة بيانات الطالب وولي الأمر وإرفاق المستندات.', descEn: 'Fill student & guardian details and upload credentials.' },
                { step: '02', titleAr: 'المقابلة والتقييم', titleEn: 'Assessment & Interview', descAr: 'تحديد موعد للتقييم الأكاديمي والمقابلة الشخصية للطفل.', descEn: 'Schedule academic evaluation and student interview.' },
                { step: '03', titleAr: 'الاعتماد وقيد الطالب', titleEn: 'Enrollment & Welcome', descAr: 'استكمال إجراءات التسجيل وتسليم الحساب الرقمي الموحد.', descEn: 'Complete enrollment and receive official campus access.' },
              ].map(item => (
                <div key={item.step} className="p-6 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 shadow-sm relative">
                  <span className="text-3xl font-black text-[#c5a059]/30 absolute top-4 right-4">{item.step}</span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-4">{ar ? item.titleAr : item.titleEn}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{ar ? item.descAr : item.descEn}</p>
                </div>
              ))}
            </div>

            {/* Admission Inquiry Form */}
            <div className="p-8 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 shadow-md">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Mail className="size-5 text-[#c5a059]" />
                {ar ? 'طلب استفسار عن القبول' : 'Admission Inquiry Form'}
              </h3>
              {inquirySent ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="size-5" />
                  <span>{ar ? 'تم إرسال استفسارك بنجاح. سيتواصل معك قسم القبول والتسجيل قريباً.' : 'Inquiry sent successfully. Our admissions office will contact you soon.'}</span>
                </div>
              ) : (
                <form onSubmit={handleInquiry} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{ar ? 'اسم ولي الأمر' : 'Guardian Name'} *</label>
                    <input
                      type="text"
                      value={inquiryName}
                      onChange={e => setInquiryName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#c5a059]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{ar ? 'البريد الإلكتروني' : 'Email Address'} *</label>
                    <input
                      type="email"
                      value={inquiryEmail}
                      onChange={e => setInquiryEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#c5a059]"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{ar ? 'نص الاستفسار أو المرحلة الدراسية المطلوبة' : 'Inquiry Details or Grade Level'}</label>
                    <textarea
                      rows={3}
                      value={inquiryMessage}
                      onChange={e => setInquiryMessage(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#c5a059]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#b38f45] text-[#071120] text-sm font-bold shadow-md hover:brightness-110 transition-all flex items-center gap-2"
                    >
                      <Send className="size-4" />
                      <span>{ar ? 'إرسال الاستفسار' : 'Submit Inquiry'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}

        {/* SECTION: ACADEMICS */}
        {activeSection === 'academics' && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10 animate-fade-in">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-[#c5a059] uppercase tracking-wider">{ar ? 'البرامج الأكاديمية' : 'Academic Programs'}</span>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {ar ? 'المراحل الدراسية والمناهج المعتمدة' : 'Academic Stages & Curricula'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { titleAr: 'المرحلة الابتدائية', titleEn: 'Primary School (Grades 1-6)', descAr: 'بناء الأساس اللغوي والرياضي والعلمي مع التركيز على المهارات السلوكية والاجتماعية.', descEn: 'Foundational literacy, mathematics, sciences, and holistic behavioral development.' },
                { titleAr: 'المرحلة الإعدادية', titleEn: 'Middle School (Grades 7-9)', descAr: 'تطوير التفكير التحليلي والبحثي واكتشاف الميول العلمية والأدبية والتقنية.', descEn: 'Analytical reasoning, inquiry-based learning, and exploratory STEM/humanities.' },
                { titleAr: 'المرحلة الثانوية', titleEn: 'Secondary School (Grades 10-12)', descAr: 'إعداد أكاديمي مكثف يؤهل الطلاب للالتحاق بأرقى الجامعات محلياً وعالمياً.', descEn: 'Rigorous preparation for top national and international university matriculation.' },
              ].map((stage, i) => (
                <div key={i} className="p-6 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
                  <div className="size-10 rounded-xl bg-[#c5a059]/15 flex items-center justify-center text-[#c5a059]">
                    <GraduationCap className="size-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{ar ? stage.titleAr : stage.titleEn}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{ar ? stage.descAr : stage.descEn}</p>
                </div>
              ))}
            </div>

            {/* Current subjects in database */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">{ar ? 'المواد الدراسية المقررة بالمنظومة:' : 'Active Academic Disciplines:'}</h3>
              {(data?.subjects || []).length === 0 ? (
                <p className="text-xs text-slate-400">{ar ? 'لم يتم تسجيل مواد دراسية بعد.' : 'No academic disciplines configured yet.'}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.subjects.map(s => (
                    <span key={s.id} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {ar ? s.nameAr : s.nameEn} ({s.code})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION: NEWS & EVENTS */}
        {activeSection === 'news' && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12 animate-fade-in">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <FileText className="size-6 text-[#c5a059]" />
                {ar ? 'الإعلانات والتعميمات الرسمية' : 'Official Announcements'}
              </h2>
              {publicAnnouncements.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 text-center text-slate-400 text-sm">
                  {ar ? 'لم يتم نشر أي إعلانات عامة بعد.' : 'No public announcements published yet.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {publicAnnouncements.map(a => (
                    <div key={a.id} className="p-6 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 shadow-sm space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{new Date(a.publishedAt).toLocaleDateString(ar ? 'ar-EG' : 'en-US')}</span>
                        {a.pinned && <span className="text-[#c5a059] font-bold">{ar ? 'مثبّت' : 'Pinned'}</span>}
                      </div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">{ar ? a.titleAr : a.titleEn}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{ar ? a.contentAr : a.contentEn}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Calendar className="size-6 text-[#c5a059]" />
                {ar ? 'التقويم المدرسي والفعاليات القادمة' : 'School Calendar & Events'}
              </h2>
              {publicEvents.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 text-center text-slate-400 text-sm">
                  {ar ? 'لا توجد فعاليات مجدولة حالياً.' : 'No upcoming events scheduled at this time.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {publicEvents.map(e => (
                    <div key={e.id} className="p-6 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 shadow-sm space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#c5a059]">
                        <Clock className="size-3.5" />
                        <span>{e.startDate}</span>
                      </div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">{ar ? e.titleAr : e.titleEn}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{ar ? e.descriptionAr : e.descriptionEn}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION: ACTIVITIES & PROJECTS */}
        {activeSection === 'activities' && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10 animate-fade-in">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-[#c5a059] uppercase tracking-wider">{ar ? 'الحياة الطلابية' : 'Student Life & Creativity'}</span>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {ar ? 'الأنشطة المدرسية ومشاريع الطلاب' : 'Activities & Student Projects'}
              </h2>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{ar ? 'معرض مشاريع الطلاب المعتمدة:' : 'Approved Student Projects Showcase:'}</h3>
              {publicProjects.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 text-center text-slate-400 text-sm">
                  {ar ? 'لم يتم نشر مشاريع طلابية بعد.' : 'No student projects published yet.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {publicProjects.map(p => (
                    <div key={p.id} className="p-5 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 shadow-sm space-y-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#c5a059]/15 text-[#c5a059]">{p.category}</span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ar ? p.titleAr : p.titleEn}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? p.descriptionAr : p.descriptionEn}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION: DIGITAL LIBRARY */}
        {activeSection === 'library' && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-[#c5a059] uppercase tracking-wider">{ar ? 'المعرفة والمصادر' : 'Knowledge Repository'}</span>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {ar ? 'المكتبة الرقمية لمدرسة سان جورج' : 'St. George Digital Library'}
              </h2>
              <div className="max-w-md mx-auto pt-2">
                <div className="relative">
                  <Search className="size-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3" />
                  <input
                    type="text"
                    value={libraryQuery}
                    onChange={e => setLibraryQuery(e.target.value)}
                    placeholder={ar ? 'ابحث في المصادر والمراجع...' : 'Search books, documents & resources...'}
                    className="w-full bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
              </div>
            </div>

            {publicLibrary.length === 0 ? (
              <div className="p-12 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 text-center text-slate-400 text-sm">
                <BookOpen className="size-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <span>{ar ? 'لم تتم إضافة مراجع رقمية للمكتبة بعد.' : 'No digital resources added to the catalog yet.'}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {publicLibrary.map(r => (
                  <div key={r.id} className="p-6 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 shadow-sm space-y-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 uppercase">{r.type}</span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ar ? r.titleAr : r.titleEn}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{r.author}</p>
                    <p className="text-[11px] text-slate-400">{r.category}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SECTION: CONTACT */}
        {activeSection === 'contact' && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10 animate-fade-in">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-[#c5a059] uppercase tracking-wider">{ar ? 'قنوات التواصل' : 'Contact Channels'}</span>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {ar ? 'تواصل مع إدارة مدرسة سان جورج' : 'Connect with St. George School'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 shadow-sm space-y-2">
                <MapPin className="size-6 mx-auto text-[#c5a059]" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ar ? 'الموقع والعنوان' : 'Campus Location'}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{ar ? settings?.addressAr : settings?.addressEn}</p>
              </div>
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 shadow-sm space-y-2">
                <Phone className="size-6 mx-auto text-[#c5a059]" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ar ? 'الهاتف المباشر' : 'Telephone'}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 dir-ltr">{settings?.phone}</p>
              </div>
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0d1d38] border border-slate-200 dark:border-white/10 shadow-sm space-y-2">
                <Mail className="size-6 mx-auto text-[#c5a059]" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ar ? 'البريد الإلكتروني' : 'Official Email'}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{settings?.email}</p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#0f1f3d] text-white text-center space-y-1">
              <p className="text-xs text-[#c5a059] font-bold">{ar ? 'مواعيد العمل الرسمية' : 'Official Operating Hours'}</p>
              <p className="text-sm font-semibold">{ar ? cms?.workingHoursAr : cms?.workingHoursEn}</p>
            </div>
          </section>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#0b172d] text-slate-400 border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8 mt-16 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-start">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-[#c5a059] to-[#9a7836] p-0.5 flex items-center justify-center">
              <div className="size-full rounded-[10px] bg-[#0b172d] flex items-center justify-center">
                <GraduationCap className="size-4 text-[#c5a059]" />
              </div>
            </div>
            <div>
              <p className="font-bold text-white text-sm">{ar ? settings?.schoolNameAr : settings?.schoolNameEn}</p>
              <p className="text-[10px] text-[#c5a059]">{ar ? settings?.platformNameAr : settings?.platformNameEn}</p>
            </div>
          </div>

          <p className="text-slate-400">
            © {new Date().getFullYear()} {ar ? 'مدرسة سان جورج — جميع الحقوق محفوظة.' : 'St. George School — All rights reserved.'}
          </p>

          <button
            onClick={onOpenLogin}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold border border-white/10 transition-colors"
          >
            {ar ? 'بوابة الدخول الموحد' : 'Campus Portal Login'}
          </button>
        </div>
      </footer>
    </div>
  )
}
