'use client'

import React, { useState } from 'react'
import {
  ShieldCheck,
  Building2,
  GraduationCap,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Calendar,
  Globe,
  Mail,
  Phone,
  MapPin,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { useSchool } from '@/lib/school/store'

export function SetupWizard() {
  const { lang, setLang, refreshWorkspace } = useSchool()
  const ar = lang === 'ar'

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: School Identity
  const [schoolNameAr, setSchoolNameAr] = useState('مدرسة سان جورج')
  const [schoolNameEn, setSchoolNameEn] = useState('St. George School')
  const [platformNameAr, setPlatformNameAr] = useState('الحرم الرقمي لمدرسة سان جورج')
  const [platformNameEn, setPlatformNameEn] = useState('St. George School Digital Campus')
  const [schoolEmail, setSchoolEmail] = useState('info@stgeorgeschool.edu')
  const [schoolPhone, setSchoolPhone] = useState('+20 2 24500000')
  const [addressAr, setAddressAr] = useState('مجمع سان جورج التعليمي، القاهرة، مصر')
  const [addressEn, setAddressEn] = useState('St. George Campus, Cairo, Egypt')
  const [mottoAr, setMottoAr] = useState('التميز في التعليم وبناء الشخصية والقيم')
  const [mottoEn, setMottoEn] = useState('Excellence in Education, Character, and Faith')

  // Step 2: Academic Setup
  const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-09-01`)
  const [endDate, setEndDate] = useState(`${new Date().getFullYear() + 1}-06-30`)
  const [yearNameAr, setYearNameAr] = useState(`العام الأكاديمي ${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`)
  const [yearNameEn, setYearNameEn] = useState(`Academic Year ${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`)
  const [initDefaultSubjects, setInitDefaultSubjects] = useState(true)
  const [initDefaultClasses, setInitDefaultClasses] = useState(true)

  // Step 3: Super Administrator Account
  const [adminNameAr, setAdminNameAr] = useState('')
  const [adminNameEn, setAdminNameEn] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('')

  // Step 4: Preferences
  const [defaultLanguage, setDefaultLanguage] = useState<'ar' | 'en'>('ar')
  const [timezone, setTimezone] = useState('Africa/Cairo')
  const [currency, setCurrency] = useState('EGP')

  const handleNext = () => {
    setError('')
    if (step === 1) {
      if (!schoolNameAr.trim() || !schoolNameEn.trim() || !schoolEmail.trim()) {
        setError(ar ? 'يرجى ملء جميع الحقول الإلزامية للمدرسة.' : 'Please fill all required school fields.')
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!startDate || !endDate || endDate <= startDate) {
        setError(ar ? 'يرجى التأكد من صحة تواريخ بداية ونهاية العام الأكاديمي.' : 'Please enter valid academic year dates.')
        return
      }
      setStep(3)
    } else if (step === 3) {
      if (!adminNameAr.trim() || !adminNameEn.trim() || !adminEmail.trim()) {
        setError(ar ? 'يرجى إدخال اسم البريد الإلكتروني والاسم باللغتين للمدير.' : 'Please provide administrator name and email.')
        return
      }
      if (!adminPassword || adminPassword.length < 8) {
        setError(ar ? 'يجب أن لا تقل كلمة المرور عن ٨ أحرف.' : 'Password must be at least 8 characters long.')
        return
      }
      if (adminPassword !== adminPasswordConfirm) {
        setError(ar ? 'كلمات المرور غير متطابقة.' : 'Passwords do not match.')
        return
      }
      setStep(4)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload = {
        schoolNameAr,
        schoolNameEn,
        platformNameAr,
        platformNameEn,
        schoolEmail,
        schoolPhone,
        addressAr,
        addressEn,
        mottoAr,
        mottoEn,
        startDate,
        endDate,
        yearNameAr,
        yearNameEn,
        initDefaultSubjects,
        initDefaultClasses,
        adminNameAr,
        adminNameEn,
        adminEmail,
        adminPassword,
        defaultLanguage,
        timezone,
        currency,
      }

      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setError(res.status >= 500
          ? (ar ? 'خادم المدرسة أو قاعدة البيانات غير متاحين الآن. لم يتم إنشاء الحساب. راجع إعداد قاعدة البيانات في الاستضافة.' : 'The school server or database is unavailable. The account was not created. Check the hosting database configuration.')
          : json?.error || (ar ? 'تعذر إتمام الإعداد الأولي، يرجى التحقق من البيانات.' : 'Setup failed. Please verify inputs.'))
        setLoading(false)
        return
      }

      // Success: refresh session and workspace from server
      await refreshWorkspace()
    } catch {
      setError(ar ? 'حدث خطأ في الاتصال بالخادم.' : 'A network error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-[#071120] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-8" dir={ar ? 'rtl' : 'ltr'}>
      {/* Background radial effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-[#c5a059]/15 to-transparent blur-3xl opacity-60" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-t from-[#182b52]/40 to-transparent blur-3xl" />
      </div>

      {/* Language Switcher in corner */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1">
        <Globe className="size-4 text-[#c5a059]" />
        <button
          onClick={() => setLang(ar ? 'en' : 'ar')}
          className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          {ar ? 'English' : 'العربية'}
        </button>
      </div>

      <div className="relative z-10 w-full max-w-3xl bg-[#0d1d38]/90 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#0f1f3d] via-[#182b52] to-[#0f1f3d] p-6 sm:p-8 border-b border-white/10 text-center relative">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c5a059] to-[#9a7836] shadow-lg shadow-[#c5a059]/20 mb-3">
            <GraduationCap className="size-8 text-[#071120]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {ar ? 'إعداد المنصة — مدرسة سان جورج' : 'Platform Setup — St. George School'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            {ar ? 'الحرم الرقمي لمدرسة سان جورج — التكوين الأولي للنظام وقاعدة البيانات الحقيقية' : 'St. George School Digital Campus — Initial system & persistent database configuration'}
          </p>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-[#c5a059] text-[#071120] ring-4 ring-[#c5a059]/30'
                    : step > s
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/10 text-slate-400'
                }`}>
                  {step > s ? <Check className="size-4" /> : s}
                </div>
                {s < 4 && <div className={`w-6 sm:w-12 h-0.5 ${step > s ? 'bg-emerald-500' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-10">
          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-rose-300 text-sm">
              <AlertCircle className="size-5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: School Identity */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-bold text-[#c5a059] flex items-center gap-2">
                <Building2 className="size-5" />
                {ar ? 'الخطوة ١: هوية وبيانات مدرسة سان جورج' : 'Step 1: St. George School Identity'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'اسم المدرسة (بالعربية)' : 'School Name (Arabic)'} *</label>
                  <input
                    type="text"
                    value={schoolNameAr}
                    onChange={e => setSchoolNameAr(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'اسم المدرسة (بالإنجليزية)' : 'School Name (English)'} *</label>
                  <input
                    type="text"
                    value={schoolNameEn}
                    onChange={e => setSchoolNameEn(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'اسم المنصة (بالعربية)' : 'Platform Name (Arabic)'}</label>
                  <input
                    type="text"
                    value={platformNameAr}
                    onChange={e => setPlatformNameAr(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'اسم المنصة (بالإنجليزية)' : 'Platform Name (English)'}</label>
                  <input
                    type="text"
                    value={platformNameEn}
                    onChange={e => setPlatformNameEn(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'البريد الإلكتروني الرسمي' : 'Official School Email'} *</label>
                  <input
                    type="email"
                    value={schoolEmail}
                    onChange={e => setSchoolEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'رقم الهاتف' : 'Contact Phone'}</label>
                  <input
                    type="text"
                    value={schoolPhone}
                    onChange={e => setSchoolPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'عنوان المدرسة' : 'Campus Address'}</label>
                  <input
                    type="text"
                    value={addressAr}
                    onChange={e => setAddressAr(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Academic Setup */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-bold text-[#c5a059] flex items-center gap-2">
                <Calendar className="size-5" />
                {ar ? 'الخطوة ٢: العام الأكاديمي والفصول والمواد' : 'Step 2: Academic Year & Structure'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'تاريخ بداية العام الدراسي' : 'Start Date'} *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'تاريخ نهاية العام الدراسي' : 'End Date'} *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'مسمى العام الأكاديمي' : 'Academic Year Name'}</label>
                  <input
                    type="text"
                    value={yearNameAr}
                    onChange={e => setYearNameAr(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
              </div>

              <div className="pt-4 space-y-3 border-t border-white/10">
                <label className="flex items-center gap-3 cursor-pointer bg-white/5 p-3 rounded-xl border border-white/10">
                  <input
                    type="checkbox"
                    checked={initDefaultSubjects}
                    onChange={e => setInitDefaultSubjects(e.target.checked)}
                    className="size-4 accent-[#c5a059] rounded"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{ar ? 'تجهيز المواد الدراسية الأساسية' : 'Initialize standard curriculum subjects'}</p>
                    <p className="text-xs text-slate-400">{ar ? 'اللغة العربية، الإنجليزية، الرياضيات، العلوم، الدراسات، الحاسب، التربية الدينية، الفنون' : 'Arabic, English, Mathematics, Science, Social Studies, ICT, Religion, Arts'}</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer bg-white/5 p-3 rounded-xl border border-white/10">
                  <input
                    type="checkbox"
                    checked={initDefaultClasses}
                    onChange={e => setInitDefaultClasses(e.target.checked)}
                    className="size-4 accent-[#c5a059] rounded"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{ar ? 'تجهيز قاعات وفصول المراحل الأولى' : 'Initialize standard class sections'}</p>
                    <p className="text-xs text-slate-400">{ar ? 'فصول دراسية فارغة وجاهزة لاستقبال وقيد الطلاب الحقيقيين' : 'Clean empty class sections ready for real student admissions'}</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Administrator Account */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-bold text-[#c5a059] flex items-center gap-2">
                <ShieldCheck className="size-5" />
                {ar ? 'الخطوة ٣: حساب الإدارة' : 'Step 3: Administration Account'}
              </h2>
              <p className="text-xs text-slate-400">
                {ar ? 'هذا الحساب مخصص لإدارة المدرسة ويملك صلاحياتها الكاملة. احفظ بيانات الدخول بأمان.' : 'This account is reserved for school administration and holds its full permissions. Store the credentials securely.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'اسم المدير (بالعربية)' : 'Admin Full Name (Arabic)'} *</label>
                  <input
                    type="text"
                    value={adminNameAr}
                    onChange={e => setAdminNameAr(e.target.value)}
                    placeholder="مثال: د. مايكل جرجس"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'اسم المدير (بالإنجليزية)' : 'Admin Full Name (English)'} *</label>
                  <input
                    type="text"
                    value={adminNameEn}
                    onChange={e => setAdminNameEn(e.target.value)}
                    placeholder="e.g. Dr. Michael Guirguis"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'البريد الإلكتروني لتسجيل الدخول' : 'Administrator Login Email'} *</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    placeholder="admin@stgeorgeschool.edu"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'كلمة المرور' : 'Password (min 8 chars)'} *</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'تأكيد كلمة المرور' : 'Confirm Password'} *</label>
                  <input
                    type="password"
                    value={adminPasswordConfirm}
                    onChange={e => setAdminPasswordConfirm(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Preferences */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-lg font-bold text-[#c5a059] flex items-center gap-2">
                <Globe className="size-5" />
                {ar ? 'الخطوة ٤: تفضيلات النظام والهوية البصرية' : 'Step 4: Regional & Branding Preferences'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'اللغة الافتراضية' : 'Default Language'}</label>
                  <select
                    value={defaultLanguage}
                    onChange={e => setDefaultLanguage(e.target.value as 'ar' | 'en')}
                    className="w-full bg-[#071120] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                  >
                    <option value="ar">العربية (Arabic - RTL)</option>
                    <option value="en">English (LTR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'المنطقة الزمنية' : 'Timezone'}</label>
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full bg-[#071120] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                  >
                    <option value="Africa/Cairo">Africa/Cairo (GMT+2 / +3)</option>
                    <option value="Asia/Riyadh">Asia/Riyadh (GMT+3)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'العملة الأكاديمية' : 'Currency'}</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]"
                  />
                </div>
              </div>

              {/* Summary Review Card */}
              <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs">
                <p className="font-bold text-[#c5a059]">{ar ? 'ملخص إعداد الحرم الرقمي لمدرسة سان جورج:' : 'Setup Summary for St. George School:'}</p>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <p><span className="text-slate-400">{ar ? 'المدرسة:' : 'School:'}</span> {schoolNameAr} / {schoolNameEn}</p>
                  <p><span className="text-slate-400">{ar ? 'المدير العام:' : 'Super Admin:'}</span> {adminNameEn} ({adminEmail})</p>
                  <p><span className="text-slate-400">{ar ? 'العام الأكاديمي:' : 'Academic Year:'}</span> {startDate} → {endDate}</p>
                  <p><span className="text-slate-400">{ar ? 'قاعدة البيانات:' : 'Database:'}</span> SQLite WAL (Persistent)</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => { setError(''); setStep(step - 1) }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition-colors"
              >
                {ar ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />}
                {ar ? 'السابق' : 'Previous'}
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#b38f45] text-[#071120] text-sm font-bold shadow-lg shadow-[#c5a059]/20 hover:brightness-110 transition-all"
              >
                {ar ? 'المتابعة' : 'Next'}
                {ar ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span>{ar ? 'جاري تهيئة قاعدة البيانات...' : 'Initializing Database...'}</span>
                ) : (
                  <>
                    <CheckCircle2 className="size-5" />
                    <span>{ar ? 'اعتماد التكوين وتفعيل النظام' : 'Confirm & Launch Platform'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
