'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, Link2, LoaderCircle, RefreshCw, ShieldCheck, Unlink } from 'lucide-react'
import { useSchool } from '@/lib/school/store'

type LinkRow = {
  id: string
  status: 'pending' | 'approved' | 'rejected' | 'revoked'
  student_user_id: string
  parent_user_id: string
}

type Props = { role: 'student' | 'parent' | 'admin'; arabic: boolean }

export function ParentLinkPanel({ role, arabic }: Props) {
  const { data, refreshWorkspace } = useSchool()
  const [token, setToken] = useState('')
  const [code, setCode] = useState('')
  const [student, setStudent] = useState<{ nameAr: string; nameEn: string; gradeLevel: number; classAr?: string; classEn?: string } | null>(null)
  const [links, setLinks] = useState<LinkRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const t = (ar: string, en: string) => arabic ? ar : en
  const send = async (action: string, extra: Record<string, string> = {}) => {
    const response = await fetch('/api/parent-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const body = await response.json()
    if (!response.ok || !body.ok) throw new Error(body.error || 'request_failed')
    return body
  }

  const refreshLinks = async () => {
    const response = await fetch('/api/parent-links', { cache: 'no-store' })
    const body = await response.json()
    if (response.ok && body.ok) setLinks(body.links || [])
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    setNotice('')
    try { await fn() } catch (cause) {
      const code = cause instanceof Error ? cause.message : 'request_failed'
      setError(code === 'invalid_expired_or_used_token'
        ? t('الرمز غير صالح أو انتهت صلاحيته أو سبق استخدامه.', 'This code is invalid, expired, or already used.')
        : code === 'link_already_exists'
          ? t('يوجد طلب ربط سابق لهذا الطالب.', 'A link already exists for this student.')
          : t('تعذر إكمال الطلب. حاول مرة أخرى.', 'The request could not be completed. Please try again.'))
    } finally { setBusy(false) }
  }

  const hasPendingLink = links.some(link => link.status === 'pending')

  useEffect(() => {
    let stopped = false
    const refresh = async () => {
      const response = await fetch('/api/parent-links', { cache: 'no-store' })
      const body = await response.json()
      if (!stopped && response.ok && body.ok) {
        const nextLinks = body.links || []
        setLinks(nextLinks)
        if (role === 'parent' && nextLinks.some((link: LinkRow) => link.status === 'approved')) await refreshWorkspace()
      }
    }
    void refresh()
    const timer = role === 'parent' && hasPendingLink ? window.setInterval(() => void refresh(), 12000) : undefined
    return () => { stopped = true; if (timer) window.clearInterval(timer) }
  }, [role, refreshWorkspace, hasPendingLink])

  if (role === 'admin') {
    const pending = links.filter(link => link.status === 'pending')
    const respond = (action: 'approve' | 'reject', linkId: string) => run(async () => {
      await send(action, { linkId })
      await refreshLinks()
      await refreshWorkspace()
      setNotice(action === 'approve' ? t('تم ربط الحسابين. ستظهر بيانات الطالب لولي الأمر الآن.', 'Accounts linked. The parent can now see the student record.') : t('تم رفض طلب الربط.', 'Link request rejected.'))
    })
    return <section className="card-base p-5 sm:p-6 space-y-4" dir={arabic ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-extrabold text-[#182b52] dark:text-white">{t('طلبات ربط ولي الأمر بالطالب', 'Parent–student link requests')}</h2><p className="mt-1 text-xs text-slate-500">{t('لا تظهر درجات أو بيانات الطالب لولي الأمر إلا بعد الموافقة.', 'Parents see the student’s records only after approval.')}</p></div><span className="badge-teal px-2 py-1 text-xs">{pending.length}</span></div>
      {pending.length === 0 ? <p className="rounded-xl bg-slate-50 dark:bg-white/[0.03] p-4 text-xs text-slate-500">{t('لا توجد طلبات بانتظار المراجعة.', 'No link requests are waiting for review.')}</p> : pending.map(link => {
        const parent = data.users.find(item => item.id === link.parent_user_id)
        const studentAccount = data.users.find(item => item.id === link.student_user_id)
        const student = data.students.find(item => item.id === studentAccount?.studentId || item.email.toLowerCase() === studentAccount?.email.toLowerCase())
        return <div key={link.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 p-4">
          <div className="text-xs"><p className="font-bold text-[#182b52] dark:text-white">{parent?.nameAr || parent?.nameEn || '—'} <span className="font-normal text-slate-500">{t('يريد ربط حسابه بالطالب', 'requests access to')}</span> {student?.nameAr || student?.nameEn || studentAccount?.nameAr || '—'}</p><p className="mt-1 text-slate-500">{parent?.email} · {studentAccount?.email}</p></div>
          <div className="flex gap-2"><button disabled={busy} onClick={() => respond('reject', link.id)} className="btn-secondary text-xs">{t('رفض', 'Reject')}</button><button disabled={busy} onClick={() => respond('approve', link.id)} className="btn-primary text-xs">{t('موافقة وربط', 'Approve & link')}</button></div>
        </div>
      })}
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}{notice && <p role="status" className="text-xs text-emerald-700">{notice}</p>}
    </section>
  }

  const generate = () => run(async () => {
    const result = await send('generate')
    setToken(result.token)
    setNotice(t('انسخ رمز الاتصال وشاركه مع ولي أمرك. ينتهي خلال ٢٤ ساعة ويُستخدم مرة واحدة.', 'Share this connection code with your parent. It expires in 24 hours and can only be used once.'))
  })

  const revokeCode = () => run(async () => {
    await send('revoke_code')
    setToken('')
    setNotice(t('تم إلغاء رمز الاتصال.', 'Connection code revoked.'))
  })

  const preview = () => run(async () => {
    const result = await send('preview', { token: code.trim() })
    setStudent(result.student)
  })

  const confirm = () => run(async () => {
    await send('confirm', { token: code.trim() })
    setStudent(null)
    setCode('')
    await refreshLinks()
    setNotice(t('تم إرسال طلب الربط إلى إدارة المدرسة للموافقة.', 'Your link request was sent to school administration for approval.'))
  })

  const unlink = (linkId: string) => run(async () => {
    await send('unlink', { linkId })
    await refreshLinks()
    setNotice(t('تم إرسال طلب فك الارتباط.', 'Unlink request submitted.'))
  })

  return (
    <section className="card-base p-5 sm:p-6 space-y-4" dir={arabic ? 'rtl' : 'ltr'}>
      <div className="flex items-start gap-3">
        <div className="size-10 shrink-0 rounded-xl bg-[#c5a059]/15 text-[#a37e32] flex items-center justify-center"><Link2 className="size-5" /></div>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-[#182b52] dark:text-white">{role === 'student' ? t('ربط حساب ولي الأمر', 'Link a Parent Account') : t('ربط حساب طالب', 'Link a Student Account')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{role === 'student' ? t('أنشئ رمزاً مؤقتاً لمشاركته مع ولي أمرك.', 'Create a temporary code to share with your parent.') : t('أدخل رمز الاتصال الذي شاركه الطالب معك.', 'Enter the connection code shared by the student.')}</p>
        </div>
      </div>

      {role === 'student' ? (
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={busy} onClick={generate} className="btn-primary inline-flex items-center gap-2 text-xs font-bold disabled:opacity-50">
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}{t('إنشاء رمز اتصال', 'Create connection code')}
          </button>
          {token && <button disabled={busy} onClick={revokeCode} className="btn-secondary inline-flex items-center gap-2 text-xs font-bold disabled:opacity-50"><Unlink className="size-4" />{t('إلغاء الرمز', 'Revoke code')}</button>}
          {token && <div className="basis-full flex flex-wrap items-center gap-2">
            <code dir="ltr" className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 font-mono text-xs break-all">{token}</code>
            <button aria-label={t('نسخ الرمز', 'Copy code')} onClick={() => void navigator.clipboard?.writeText(token)} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2"><Copy className="size-4" /></button>
          </div>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input dir="ltr" value={code} onChange={event => { setCode(event.target.value); setStudent(null) }} placeholder={t('رمز الاتصال', 'Connection code')} className="ss-input min-w-0 flex-1 font-mono" maxLength={64} />
            <button disabled={busy || code.trim().length !== 64} onClick={preview} className="btn-primary inline-flex items-center justify-center gap-2 text-xs font-bold disabled:opacity-50">
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}{t('معاينة الطالب', 'Preview student')}
            </button>
          </div>
          {student && <div className="rounded-xl border border-[#c5a059]/30 bg-[#c5a059]/[0.06] p-4 flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-bold text-[#182b52] dark:text-white">{arabic ? student.nameAr : student.nameEn}</p><p className="mt-1 text-xs text-slate-500">{t('الصف', 'Grade')} {student.gradeLevel} · {arabic ? student.classAr : student.classEn}</p></div>
            <button disabled={busy} onClick={confirm} className="btn-primary inline-flex items-center gap-2 text-xs font-bold disabled:opacity-50"><CheckCircle2 className="size-4" />{t('تأكيد طلب الربط', 'Confirm link request')}</button>
          </div>}
        </div>
      )}

      {links.length > 0 && <div className="space-y-2">
        <p className="text-xs font-bold text-slate-500">{t('حالة الارتباط', 'Connection status')}</p>
        {links.map(link => <div key={link.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-xs">
          <span>{link.status === 'approved' ? t('مرتبط', 'Connected') : link.status === 'pending' ? t('بانتظار موافقة المدرسة', 'Pending school approval') : link.status === 'rejected' ? t('مرفوض', 'Rejected') : t('ملغى', 'Revoked')}</span>
          {link.status === 'approved' && <button disabled={busy} onClick={() => unlink(link.id)} className="text-rose-600 inline-flex items-center gap-1"><Unlink className="size-3.5" />{t('فك الارتباط', 'Unlink')}</button>}
        </div>)}
      </div>}
      {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
      {notice && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400">{notice}</p>}
    </section>
  )
}
