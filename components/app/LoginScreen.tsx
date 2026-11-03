'use client'

import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  Globe,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  UsersRound,
} from 'lucide-react'
import { useSchool } from '@/lib/school/store'
import { COMMON_SCHOOL_SUBJECTS } from '@/lib/school/subjects'

interface LoginScreenProps {
  onBackToPublic?: () => void
}

export function LoginScreen({ onBackToPublic }: LoginScreenProps) {
  const { login, lang, setLang, theme, setTheme, data } = useSchool()
  const ar = lang === 'ar'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'student' | 'parent' | 'teacher' | 'super_admin'>('student')
  const [registerOpen, setRegisterOpen] = useState(false)
  const [managerSetupMode, setManagerSetupMode] = useState<'create' | 'recover' | 'none' | 'unavailable' | null>(null)
  const [registerNameAr, setRegisterNameAr] = useState('')
  const [registerNameEn, setRegisterNameEn] = useState('')
  const [registerPhone, setRegisterPhone] = useState('')
  const [registerStudentNumber, setRegisterStudentNumber] = useState('')
  const [registerStage, setRegisterStage] = useState<'primary' | 'preparatory' | 'secondary'>('primary')
  const [registerSubject, setRegisterSubject] = useState('')
  const [registerSuccess, setRegisterSuccess] = useState('')

  // Forgot password modal
  const [forgotOpen, setForgotOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newResetPassword, setNewResetPassword] = useState('')
  const [confirmResetPassword, setConfirmResetPassword] = useState('')

  const settings = data?.settings
  const teacherSubjectOptions = [
    ...data.subjects.map(subject => ({ value: subject.id, nameAr: subject.nameAr, nameEn: subject.nameEn })),
    ...COMMON_SCHOOL_SUBJECTS
      .filter(subject => !data.subjects.some(existing => existing.code.toLowerCase() === subject.code.toLowerCase()))
      .map(subject => ({ value: `catalog:${subject.code}`, nameAr: subject.nameAr, nameEn: subject.nameEn })),
  ]

  useEffect(() => {
    let active = true
    fetch('/api/auth/bootstrap-admin', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('manager_status_unavailable')
        return response.json()
      })
      .then(result => { if (active) setManagerSetupMode(result.allowed ? result.mode : 'none') })
      .catch(() => { if (active) setManagerSetupMode('unavailable') })
    return () => { active = false }
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !email.includes('@')) {
      setError(ar ? 'يرجى إدخال بريد إلكتروني صالح.' : 'Please enter a valid email address.')
      return
    }
    if (!password) {
      setError(ar ? 'يرجى إدخال كلمة المرور.' : 'Please enter your password.')
      return
    }

    setLoading(true)
    const result = await login(email.trim(), password, selectedRole)
    if (!result.ok) {
      setError(
        result.error === 'server_unavailable'
          ? (ar ? 'خدمة المدرسة أو قاعدة البيانات غير متاحة الآن. تعذر تسجيل الدخول.' : 'The school service or database is unavailable. Sign-in could not be completed.')
          : result.error === 'network_error'
            ? (ar ? 'تعذر الاتصال بخادم المدرسة. تحقق من الاتصال وحاول مرة أخرى.' : 'Could not reach the school server. Check your connection and try again.')
        : result.error === 'role_mismatch'
          ? (ar ? 'نوع الحساب المختار لا يطابق هذا البريد الإلكتروني.' : 'The selected account type does not match this email.')
          : result.error === 'inactive_user' || result.error === 'account_inactive'
          ? (ar ? 'هذا الحساب غير مفعّل. يرجى مراجعة إدارة مدرسة سان جورج.' : 'This account is inactive. Please contact St. George administration.')
          : result.error === 'too_many_attempts'
            ? (ar ? 'تم حظر المحاولات مؤقتاً بسبب تكرار المحاولات الخاطئة. انتظر ١٠ دقائق.' : 'Too many failed attempts. Please wait 10 minutes before retrying.')
            : (ar ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Invalid email or password.')
      )
      setLoading(false)
    }
  }

  const submitRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setRegisterSuccess('')
    if (selectedRole === 'teacher' && !registerSubject) {
      setError(ar ? 'اختر المادة التي تدرسها.' : 'Choose the subject you teach.')
      return
    }
    setLoading(true)
    try {
      const response = await fetch(selectedRole === 'super_admin' ? '/api/auth/bootstrap-admin' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: selectedRole,
          nameAr: registerNameAr,
          nameEn: registerNameEn,
          email: email.trim(),
          phone: registerPhone,
          password,
          studentNumber: selectedRole === 'student' ? registerStudentNumber.trim() : undefined,
          stage: selectedRole === 'teacher' ? registerStage : undefined,
          subjectIds: selectedRole === 'teacher' && !registerSubject.startsWith('catalog:') ? [registerSubject] : undefined,
          subjectCodes: selectedRole === 'teacher' && registerSubject.startsWith('catalog:') ? [registerSubject.slice('catalog:'.length)] : undefined,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result.ok) {
        if (response.status >= 500) {
          setError(ar ? 'خدمة المدرسة أو قاعدة البيانات غير متاحة الآن. لم يتم إنشاء الحساب.' : 'The school service or database is unavailable. The account was not created.')
          return
        }
        if (result.error === 'manager_account_exists') {
          setManagerSetupMode('none')
          setRegisterOpen(false)
          setError(ar ? 'تم إنشاء حساب المدير بالفعل. سجّل الدخول بالبريد الذي استُخدم عند الإعداد.' : 'A manager account already exists. Sign in with the email used during setup.')
          return
        }
        setError(result.error === 'student_profile_already_linked'
          ? (ar ? 'ملف الطالب مرتبط بحساب آخر بالفعل. تواصل مع مدير المدرسة.' : 'This student profile is already linked to another account. Contact the school administrator.')
          : result.error === 'email_taken'
            ? (ar ? 'هذا البريد مسجل بالفعل.' : 'This email is already registered.')
            : result.error === 'weak_password'
              ? (ar ? 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي على حرف ورقم.' : 'Password must be at least 8 characters and include a letter and a number.')
              : (ar ? 'تعذر إرسال طلب الحساب. راجع البيانات وحاول مرة أخرى.' : 'Could not submit the account request. Check your details and try again.'))
        return
      }
      if (selectedRole === 'super_admin') {
        setManagerSetupMode('none')
        setRegisterOpen(false)
        const signedIn = await login(email.trim(), password, 'super_admin')
        if (!signedIn.ok) {
          setError(ar ? 'تم إنشاء حساب المدير. سجّل الدخول بالبريد وكلمة المرور اللذين اخترتهما.' : 'The manager account was created. Sign in with the email and password you chose.')
        }
        return
      }
      setRegisterSuccess(ar ? 'وصل طلبك إلى مدير المدرسة للمراجعة. يمكنك تسجيل الدخول بعد الموافقة.' : 'Your request was sent to the school administrator. You can sign in after approval.')
      setRegisterOpen(false)
      setPassword('')
    } catch {
      setError(ar ? 'تعذر الاتصال بالخادم.' : 'Could not connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError('')
    setResetSuccess('')
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setResetError(ar ? 'يرجى إدخال بريد إلكتروني صالح.' : 'Please enter a valid email address.')
      return
    }

    setResetLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      })
      const json = await res.json().catch(() => null)
      if (res.ok && json.ok) {
        if (json.resetToken) {
          setResetToken(json.resetToken)
          setResetSuccess(ar ? 'تم التحقق من الحساب. اختر كلمة مرور جديدة لإكمال الاستعادة.' : 'Account verified. Choose a new password to finish recovery.')
        } else {
          setResetSuccess(
            ar
              ? 'إذا كان البريد مسجلاً، فستصلك تعليمات الاستعادة عند إعداد خدمة البريد الإلكتروني.'
              : 'If the address is registered, reset instructions will arrive when email delivery is configured.'
          )
        }
      } else {
        setResetError(res.status >= 500
          ? (ar ? 'خدمة المدرسة أو قاعدة البيانات غير متاحة الآن. تعذرت استعادة كلمة المرور.' : 'The school service or database is unavailable. Password recovery failed.')
          : json?.error || (ar ? 'تعذر إرسال طلب إعادة التعيين.' : 'Failed to dispatch reset request.'))
      }
    } catch {
      setResetError(ar ? 'خطأ في الاتصال بالخادم.' : 'Server connection error.')
    } finally {
      setResetLoading(false)
    }
  }

  const completePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError('')
    if (newResetPassword !== confirmResetPassword) {
      setResetError(ar ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.')
      return
    }
    setResetLoading(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword: newResetPassword }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result.ok) {
        setResetError(response.status >= 500
          ? (ar ? 'خدمة المدرسة أو قاعدة البيانات غير متاحة الآن. لم تتغير كلمة المرور.' : 'The school service or database is unavailable. The password was not changed.')
          : result?.error === 'weak_password'
          ? (ar ? 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي على حرف ورقم.' : 'Password must be at least 8 characters and include a letter and a number.')
          : (ar ? 'انتهت صلاحية رابط الاستعادة أو تعذر استخدامه. ابدأ طلبًا جديدًا.' : 'The reset link expired or could not be used. Start a new request.'))
        return
      }
      setEmail(resetEmail.trim())
      setPassword(newResetPassword)
      setRegisterSuccess(ar ? 'تم تغيير كلمة المرور. استخدمها الآن لتسجيل الدخول.' : 'Password updated. Use it to sign in now.')
      setResetToken('')
      setNewResetPassword('')
      setConfirmResetPassword('')
      setForgotOpen(false)
    } catch {
      setResetError(ar ? 'تعذر الاتصال بالخادم.' : 'Could not connect to the server.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen bg-[#071120] text-slate-100" dir={ar ? 'rtl' : 'ltr'}>
      {/* ── Brand Panel (Desktop) ────────────────────────────────────────── */}
      <aside className="relative hidden w-[45%] overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#0f1f3d] to-[#14294f] lg:flex lg:flex-col lg:justify-between p-12 border-r border-white/10">
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(#c5a059 1px, transparent 1px)', backgroundSize: '36px 36px' }} />

        {/* Brand Crest */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <img src="/school-mark.svg" alt="" className="size-14 drop-shadow-[0_8px_22px_rgba(197,160,89,.24)]" />
            <div>
              <p className="text-xl font-black text-white tracking-tight">
                {ar ? (settings?.schoolNameAr || 'مدرسة سان جورج') : (settings?.schoolNameEn || 'St. George School')}
              </p>
              <p className="text-xs font-bold text-[#c5a059] uppercase tracking-wider mt-0.5">
                {ar ? (settings?.platformNameAr || 'الحرم الرقمي لمدرسة سان جورج') : (settings?.platformNameEn || 'Digital Campus Platform')}
              </p>
            </div>
          </div>
        </div>

        {/* Center Quote / Philosophy */}
        <div className="relative z-10 space-y-4 my-auto max-w-md">
          <div className="inline-flex size-10 items-center justify-center rounded-xl bg-[#c5a059]/15 text-[#c5a059]">
            <ShieldCheck className="size-6" />
          </div>
          <h2 className="text-3xl font-extrabold text-white leading-tight">
            {ar ? 'صرح تعليمي يبني الفكر ويغرس القيم النبيلة' : 'Inspiring Academic Rigor, Character & Integrity'}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {ar
              ? 'بوابة رقمية موحدة للطلاب، أولياء الأمور، المعلمين، والإدارة المدرسية لمتابعة التحصيل العلمي والأنشطة في بيئة آمنة ومتكاملة.'
              : 'A unified, secure digital ecosystem for students, parents, faculty, and administrators to cultivate knowledge and excellence.'}
          </p>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-400 space-y-1">
          <p>© {new Date().getFullYear()} {ar ? 'مدرسة سان جورج — الحرم الرقمي المعتمد' : 'St. George School — Official Digital Campus'}</p>
          <p className="text-[11px] text-slate-500">{ar ? 'نظام تشغيلي رسمي بقاعدة بيانات مشفرة ومحمية' : 'Production-grade authenticated enterprise school platform'}</p>
        </div>
      </aside>

      {/* ── Login Form Area ──────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col justify-between p-6 sm:p-12">
        {/* Top bar controls */}
        <div className="flex items-center justify-between">
          {onBackToPublic ? (
            <button
              onClick={onBackToPublic}
              className="flex items-center gap-2 text-xs font-bold text-[#c5a059] hover:text-white transition-colors"
            >
              {ar ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />}
              <span>{ar ? 'العودة إلى الموقع العام للمدرسة' : 'Back to Public School Site'}</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(ar ? 'en' : 'ar')}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Globe className="size-3.5 text-[#c5a059]" />
              <span>{ar ? 'English' : 'العربية'}</span>
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors"
            >
              {theme === 'dark' ? <Sun className="size-4 text-[#c5a059]" /> : <Moon className="size-4" />}
            </button>
          </div>
        </div>

        {/* Form Box */}
        <div className="mx-auto w-full max-w-md my-auto py-8">
          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <img src="/school-mark.svg" alt="" className="size-12" />
              <div>
                <p className="text-lg font-black text-white">{ar ? 'مدرسة سان جورج' : 'St. George School'}</p>
                <p className="text-xs text-[#c5a059] font-semibold">{ar ? 'الحرم الرقمي' : 'Digital Campus'}</p>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {registerOpen
                ? selectedRole === 'super_admin'
                  ? selectedRole === 'super_admin' && managerSetupMode === 'recover'
                    ? (ar ? 'تأكيد بيانات حساب المدير' : 'Set up the manager sign-in')
                    : (ar ? 'إنشاء حساب المدير الأول' : 'Create the first manager account')
                  : (ar ? 'طلب إنشاء حساب' : 'Request an account')
                : (ar ? 'تسجيل الدخول إلى البوابة' : 'Sign in to Digital Campus')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              {registerOpen
                ? selectedRole === 'super_admin'
                  ? selectedRole === 'super_admin' && managerSetupMode === 'recover'
                    ? (ar ? 'تم إعداد المدرسة لكن المدير لم يسجل دخوله بعد. اختر البريد وكلمة المرور اللذين سيستخدمهما المدير. بعد الدخول الأول يُغلق هذا الخيار.' : 'The school is set up, but the manager has not signed in yet. Set the manager email and password. This option closes after the first sign-in.')
                    : (ar ? 'أنشئ البريد وكلمة المرور الخاصة بك. الخيار متاح مرة واحدة فقط إذا لم يوجد حساب مدير.' : 'Choose your email and password. This one-time option appears only when no manager account exists.')
                  : (ar ? 'تُراجع الإدارة الطلبات قبل تفعيل الحساب.' : 'The administrator reviews requests before activating accounts.')
                : (ar ? 'اختر نوع الحساب ثم أدخل بيانات الدخول الخاصة به.' : 'Choose your account type, then enter its credentials.')}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2">
            {([
              { id: 'student', ar: 'طالب', en: 'Student', icon: GraduationCap },
              { id: 'parent', ar: 'ولي أمر', en: 'Parent', icon: UsersRound },
              { id: 'teacher', ar: 'معلم', en: 'Teacher', icon: KeyRound },
              { id: 'super_admin', ar: 'مدير المدرسة', en: 'School Manager', icon: ShieldCheck },
            ] as const).map(option => {
              const Icon = option.icon
              const selected = selectedRole === option.id
              return <button
                type="button"
                key={option.id}
                onClick={() => { setSelectedRole(option.id); setError(''); setRegisterSuccess(''); setRegisterOpen(false) }}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors ${selected ? 'border-[#c5a059] bg-[#c5a059]/10 text-white' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'}`}
              >
                <Icon className={`size-4 shrink-0 ${selected ? 'text-[#c5a059]' : 'text-slate-400'}`} />
                <span className="text-xs font-bold">{ar ? option.ar : option.en}</span>
              </button>
            })}
          </div>

          {selectedRole === 'super_admin' && !registerOpen && managerSetupMode && (
            <div className="mb-5 rounded-2xl border border-[#c5a059]/25 bg-[#c5a059]/[0.07] p-4">
              <p className="text-xs font-bold text-white">{managerSetupMode === 'recover' ? (ar ? 'تجهيز دخول المدير لأول مرة' : 'Finish first manager sign-in') : (ar ? 'أول مرة تستخدم النظام؟' : 'First time setting up the school?')}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                {managerSetupMode === 'recover'
                  ? (ar ? 'حساب المدير أُنشئ في الإعداد، لكن لم يحدث له دخول ناجح بعد. أكمل بيانات الدخول الآن.' : 'The manager record was created during setup, but has no successful sign-in yet. Finish its login details now.')
                  : (ar ? 'لا يوجد حساب مدير بعد. أنشئ الحساب الأول بالبريد وكلمة المرور الخاصين بك.' : 'No manager account exists yet. Create the first one with your own email and password.')}
              </p>
              <button type="button" onClick={() => { setRegisterOpen(true); setError('') }} className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#c5a059] to-[#9a7836] px-4 py-2.5 text-xs font-black text-[#071120] transition hover:brightness-110">
                {managerSetupMode === 'recover' ? (ar ? 'تجهيز حساب المدير' : 'Set up manager account') : (ar ? 'إنشاء حساب المدير الأول' : 'Create first manager account')}
              </button>
            </div>
          )}

          {selectedRole === 'super_admin' && !registerOpen && managerSetupMode === 'none' && (
            <div className="mb-5 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-3 text-[11px] leading-relaxed text-slate-400">
              {ar ? 'يوجد حساب مدير مسجل بالفعل. لو نسيت كلمة المرور اضغط «نسيت كلمة المرور؟» لاستعادتها، ولا تحتاج إلى إنشاء حساب مدير جديد.' : 'A manager account already exists. Use “Forgot password?” to recover access; you do not need to create another manager account.'}
            </div>
          )}

          {selectedRole === 'super_admin' && !registerOpen && managerSetupMode === 'unavailable' && (
            <div role="alert" className="mb-5 rounded-xl border border-rose-400/20 bg-rose-500/[0.08] px-3.5 py-3 text-[11px] leading-relaxed text-rose-200">
              {ar ? 'تعذر الاتصال بقاعدة بيانات المدرسة للتحقق من حساب المدير. لا يمكن إنشاء الحساب حتى تعود خدمة البيانات للعمل.' : 'The school database could not be reached to check the manager account. Account setup is unavailable until the data service is working.'}
            </div>
          )}

          {selectedRole === 'super_admin' && !registerOpen && managerSetupMode === null && (
            <div role="status" className="mb-5 rounded-xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-3 text-[11px] text-slate-400">
              {ar ? 'جاري التحقق من حالة حساب المدير…' : 'Checking manager account status…'}
            </div>
          )}

          {registerSuccess && <div role="status" className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-300">{registerSuccess}</div>}

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-rose-300 text-xs sm:text-sm">
              <AlertCircle className="size-5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {registerOpen ? <form onSubmit={submitRegistration} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input required value={registerNameEn} onChange={e => setRegisterNameEn(e.target.value)} placeholder={ar ? 'الاسم بالإنجليزية' : 'Full name'} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c5a059]" />
              <input value={registerNameAr} onChange={e => setRegisterNameAr(e.target.value)} placeholder={ar ? 'الاسم بالعربية' : 'Arabic name (optional)'} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c5a059]" />
            </div>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={ar ? 'البريد الإلكتروني' : 'Email address'} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c5a059]" />
            <input type="tel" value={registerPhone} onChange={e => setRegisterPhone(e.target.value)} placeholder={ar ? 'رقم الهاتف' : 'Phone number'} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c5a059]" />
            {selectedRole === 'student' && <input value={registerStudentNumber} onChange={e => setRegisterStudentNumber(e.target.value)} placeholder={ar ? 'رقم الطالب في المدرسة (إن وجد)' : 'School student ID (if available)'} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c5a059]" />}
            {selectedRole === 'teacher' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select value={registerStage} onChange={e => setRegisterStage(e.target.value as typeof registerStage)} className="w-full bg-[#0d1d38] border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-[#c5a059]">
                <option value="primary">{ar ? 'المرحلة الابتدائية' : 'Primary stage'}</option>
                <option value="preparatory">{ar ? 'المرحلة الإعدادية' : 'Preparatory stage'}</option>
                <option value="secondary">{ar ? 'المرحلة الثانوية' : 'Secondary stage'}</option>
              </select>
              <select required value={registerSubject} onChange={e => setRegisterSubject(e.target.value)} className="w-full bg-[#0d1d38] border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:border-[#c5a059]">
                <option value="">{ar ? 'اختر المادة' : 'Choose subject'}</option>
                {teacherSubjectOptions.map(subject => <option key={subject.value} value={subject.value}>{ar ? subject.nameAr : subject.nameEn}</option>)}
              </select>
            </div>}
            <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder={ar ? 'كلمة مرور (٨ أحرف على الأقل وحرف ورقم)' : 'Password (8+ characters, letter and number)'} className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c5a059]" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setRegisterOpen(false)} className="w-1/3 rounded-xl border border-white/10 py-3 text-xs font-bold text-slate-300">{ar ? 'رجوع' : 'Back'}</button>
              <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-gradient-to-r from-[#c5a059] to-[#9a7836] py-3 text-sm font-black text-[#071120] disabled:opacity-50">{loading ? (ar ? 'جاري الإرسال...' : 'Submitting...') : selectedRole === 'super_admin' ? (ar ? 'إنشاء الحساب والدخول' : 'Create account and sign in') : (ar ? 'إرسال طلب الحساب' : 'Submit account request')}</button>
            </div>
          </form> : <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {ar ? 'البريد الإلكتروني المسجل' : 'Official Email Address'}
              </label>
              <div className="relative">
                <Mail className="size-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@stgeorgeschool.edu"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059] transition-all"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  {ar ? 'كلمة المرور' : 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => { setResetEmail(email); setResetSuccess(''); setResetError(''); setResetToken(''); setForgotOpen(true) }}
                  className="text-xs font-semibold text-[#c5a059] hover:underline"
                >
                  {ar ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <Lock className="size-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059] transition-all"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 -translate-y-1/2 right-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#c5a059] via-[#b38f45] to-[#9a7836] text-[#071120] text-sm font-black shadow-lg shadow-[#c5a059]/20 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? (ar ? 'جاري التحقق من بيانات الاعتماد...' : 'Verifying credentials...') : (ar ? 'تسجيل الدخول' : 'Sign In')}
            </button>
            {selectedRole !== 'super_admin' && <button type="button" onClick={() => { setRegisterOpen(true); setError('') }} className="w-full pt-1 text-xs font-semibold text-[#c5a059] hover:underline">
              {ar ? 'ليس لديك حساب؟ اطلب إنشاء حساب' : 'Need an account? Request one'}
            </button>}
          </form>
          }

          <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-slate-400">
            <p>{ar ? 'منصة مدرسة سان جورج محمية ومشفرة. لا يتم استخدام أي بيانات وهمية.' : 'St. George School Platform is secured with server-side authentication.'}</p>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} St. George School. All Rights Reserved.</p>
        </div>
      </main>

      {/* ── Forgot Password Modal ────────────────────────────────────────── */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#0d1d38] border border-white/15 p-6 sm:p-8 shadow-2xl relative">
            <div className="size-12 rounded-2xl bg-[#c5a059]/15 text-[#c5a059] flex items-center justify-center mb-4">
              <KeyRound className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {ar ? 'استعادة كلمة المرور' : 'Reset Your Password'}
            </h3>
            <p className="text-xs text-slate-300 mt-1 mb-6">
              {resetToken
                ? (ar ? 'اختر كلمة مرور جديدة. يجب أن تكون ٨ أحرف على الأقل وتحتوي على حرف ورقم.' : 'Choose a new password. Use at least 8 characters with a letter and a number.')
                : (ar ? 'أدخل البريد الإلكتروني المسجل بالمدرسة لبدء استعادة كلمة المرور.' : 'Enter the registered school email to begin password recovery.')}
            </p>

            {resetSuccess && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            {resetError && (
              <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={resetToken ? completePasswordReset : handlePasswordReset} className="space-y-4">
              {!resetToken ? <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{ar ? 'البريد الإلكتروني' : 'Email Address'}</label>
                <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="name@stgeorgeschool.edu" className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]" required />
              </div> : <>
                <input type="password" minLength={8} value={newResetPassword} onChange={e => setNewResetPassword(e.target.value)} placeholder={ar ? 'كلمة المرور الجديدة' : 'New password'} className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]" required />
                <input type="password" minLength={8} value={confirmResetPassword} onChange={e => setConfirmResetPassword(e.target.value)} placeholder={ar ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'} className="w-full bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#c5a059]" required />
              </>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setForgotOpen(false); setResetSuccess(''); setResetError(''); setResetToken('') }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  {ar ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-5 py-2 rounded-xl bg-[#c5a059] text-[#071120] text-xs font-bold hover:brightness-110 disabled:opacity-50"
                >
                  {resetLoading
                    ? (ar ? 'جاري المعالجة...' : 'Processing...')
                    : resetToken
                      ? (ar ? 'حفظ كلمة المرور' : 'Save password')
                      : (ar ? 'متابعة' : 'Continue')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
