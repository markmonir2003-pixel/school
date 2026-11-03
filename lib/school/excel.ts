import * as XLSX from 'xlsx'
import type { ParsedStudentRow } from './types'
import type { Language } from './types'

/* ── CSV / XLSX download helpers ───────────────────────────────────────── */

export function downloadBlob(content: BlobPart, fileName: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function exportRowsToCsv(rows: Array<Record<string, unknown>>, fileName: string, headers?: Record<string, string>) {
  if (rows.length === 0) {
    downloadBlob('', fileName, 'text/csv;charset=utf-8')
    return
  }
  const keys = Object.keys(headers ?? rows[0])
  const escape = (value: unknown) => {
    const text = value == null ? '' : String(value)
    return `"${text.replace(/"/g, '""')}"`
  }
  const lines = [
    keys.map(key => escape(headers?.[key] ?? key)).join(','),
    ...rows.map(row => keys.map(key => escape(row[key])).join(',')),
  ]
  // BOM keeps Arabic readable in Excel on Windows.
  downloadBlob('\uFEFF' + lines.join('\r\n'), fileName, 'text/csv;charset=utf-8')
}

export function exportRowsToXlsx(
  rows: Array<Record<string, unknown>>,
  fileName: string,
  sheetName = 'Data',
  headers?: Record<string, string>,
) {
  const keys = rows.length > 0 ? Object.keys(headers ?? rows[0]) : Object.keys(headers ?? {})
  const data = rows.map(row => {
    const mapped: Record<string, unknown> = {}
    keys.forEach(key => { mapped[headers?.[key] ?? key] = row[key] ?? '' })
    return mapped
  })
  const sheet = XLSX.utils.json_to_sheet(data)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31))
  XLSX.writeFile(book, fileName)
}

/* ── Student import ───────────────────────────────────────────────────── */

const HEADER_ALIASES: Record<keyof ParsedStudentRow | 'email', string[]> = {
  row: [],
  nameAr: ['namear', 'arabic name', 'الاسم بالعربية', 'الاسم العربي', 'اسم الطالب', 'الاسم'],
  nameEn: ['nameen', 'english name', 'الاسم بالإنجليزية', 'الاسم الانجليزي', 'name'],
  gender: ['gender', 'الجنس', 'sex'],
  dob: ['dob', 'date of birth', 'birthdate', 'تاريخ الميلاد', 'الميلاد'],
  gradeLevel: ['gradelevel', 'grade', 'الصف', 'المرحلة', 'المستوى'],
  className: ['classname', 'class', 'الفصل', 'الشعبة', 'الصف والفصل'],
  parentNameAr: ['parentnamear', 'اسم ولي الأمر', 'اسم ولي الامر', 'ولي الأمر'],
  parentNameEn: ['parentnameen', 'guardian name', 'parent name'],
  parentPhone: ['parentphone', 'phone', 'mobile', 'هاتف ولي الأمر', 'رقم الهاتف', 'الجوال'],
  parentEmail: ['parentemail', 'guardian email', 'بريد ولي الأمر'],
  email: ['email', 'student email', 'البريد الإلكتروني', 'البريد'],
}

function cleanHeader(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function findHeader(row: Record<string, unknown>, key: keyof typeof HEADER_ALIASES) {
  const aliases = HEADER_ALIASES[key]
  for (const header of Object.keys(row)) {
    if (aliases.includes(cleanHeader(header))) return row[header]
  }
  return undefined
}

function parseDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  if (typeof value === 'number') {
    // Excel serial date (1900 date system).
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000)
    return date.toISOString().slice(0, 10)
  }
  const text = String(value ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return text
}

function parseGrade(value: unknown): number {
  const text = String(value ?? '').replace(/[^\d]/g, '')
  const number = Number(text)
  if (number > 0 && number < 13) return number
  return 0
}

export async function parseStudentWorkbook(file: File): Promise<ParsedStudentRow[]> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { type: 'array', cellDates: true, codepage: 65001 })
  const sheetName = book.SheetNames[0]
  if (!sheetName) throw new Error('empty_workbook')
  const sheet = book.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true })
  return raw.map((row, index) => {
    const genderText = String(findHeader(row, 'gender') ?? '').trim().toLowerCase()
    const gender: 'female' | 'male' = ['أنثى', 'female', 'f', 'بنت'].includes(genderText) ? 'female' : 'male'
    return {
      row: index + 2,
      nameAr: String(findHeader(row, 'nameAr') ?? '').trim(),
      nameEn: String(findHeader(row, 'nameEn') ?? '').trim(),
      gender,
      dob: parseDate(findHeader(row, 'dob') ?? ''),
      gradeLevel: parseGrade(findHeader(row, 'gradeLevel') ?? findHeader(row, 'className')),
      className: String(findHeader(row, 'className') ?? '').trim(),
      parentNameAr: String(findHeader(row, 'parentNameAr') ?? '').trim(),
      parentNameEn: String(findHeader(row, 'parentNameEn') ?? '').trim(),
      parentPhone: String(findHeader(row, 'parentPhone') ?? '').trim(),
      parentEmail: String(findHeader(row, 'parentEmail') ?? '').trim(),
      email: String(findHeader(row, 'email') ?? '').trim(),
    }
  }).filter(row => Object.entries(row).some(([key, value]) => key !== 'row' && String(value).trim() !== ''))
}

export function downloadStudentTemplate(lang: Language) {
  const headers = lang === 'ar'
    ? ['الاسم بالعربية', 'الاسم بالإنجليزية', 'الجنس', 'تاريخ الميلاد', 'الصف', 'الفصل', 'اسم ولي الأمر', 'هاتف ولي الأمر', 'بريد ولي الأمر', 'البريد الإلكتروني']
    : ['nameAr', 'nameEn', 'gender', 'dob', 'gradeLevel', 'className', 'parentNameEn', 'parentPhone', 'parentEmail', 'email']
  const sample = lang === 'ar'
    ? ['عمر أحمد المصري', 'Omar Ahmed El-Masry', 'ذكر', '2011-04-15', 9, 'Grade 9-A', 'أحمد المصري', '+20 100 123 4567', 'ahmed@example.com', '']
    : ['عمر أحمد المصري', 'Omar Ahmed El-Masry', 'male', '2011-04-15', 9, 'Grade 9-A', 'Ahmed El-Masry', '+20 100 123 4567', 'ahmed@example.com', '']
  const sheet = XLSX.utils.aoa_to_sheet([headers, sample])
  sheet['!cols'] = headers.map(() => ({ wch: 22 }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, lang === 'ar' ? 'الطلاب' : 'Students')
  XLSX.writeFile(book, lang === 'ar' ? 'نموذج-استيراد-الطلاب.xlsx' : 'student-import-template.xlsx')
}

/* ── Grade import ─────────────────────────────────────────────────────── */

const GRADE_HEADER_ALIASES = {
  studentId: ['studentid', 'id', 'الرقم الأكاديمي', 'رقم الطالب', 'الرقم'],
  score: ['score', 'mark', 'marks', 'grade', 'الدرجة', 'العلامة'],
  comment: ['comment', 'note', 'ملاحظة', 'تعليق'],
}

export interface ParsedGradeRow {
  row: number
  studentId: string
  score: number
  comment?: string
}

export async function parseGradeWorkbook(file: File): Promise<ParsedGradeRow[]> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { type: 'array', codepage: 65001 })
  const sheetName = book.SheetNames[0]
  if (!sheetName) throw new Error('empty_workbook')
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[sheetName], { defval: '' })
  const read = (row: Record<string, unknown>, key: keyof typeof GRADE_HEADER_ALIASES) => {
    for (const header of Object.keys(row)) {
      if (GRADE_HEADER_ALIASES[key].includes(cleanHeader(header))) return row[header]
    }
    return undefined
  }
  return raw.map((row, index) => ({
    row: index + 2,
    studentId: String(read(row, 'studentId') ?? '').trim(),
    score: Number(read(row, 'score') ?? NaN),
    comment: String(read(row, 'comment') ?? '').trim() || undefined,
  })).filter(row => row.studentId || Number.isFinite(row.score))
}

/* ── Attendance import ────────────────────────────────────────────────── */

export interface ParsedAttendanceRow {
  row: number
  date: string
  className: string
  studentId: string
  status: 'present' | 'absent' | 'late' | 'excused'
  session: string
  note?: string
}

const ATTENDANCE_HEADER_ALIASES = {
  date: ['date', 'day', 'التاريخ', 'اليوم'],
  className: ['classname', 'class', 'section', 'الفصل', 'الشعبة'],
  studentId: ['studentid', 'id', 'student id', 'الرقم الأكاديمي', 'رقم الطالب'],
  status: ['status', 'attendance', 'state', 'الحالة', 'الحضور'],
  session: ['session', 'period', 'shift', 'الحصة', 'الفترة'],
  note: ['note', 'notes', 'comment', 'ملاحظة', 'تعليق'],
}

export async function parseAttendanceWorkbook(file: File): Promise<ParsedAttendanceRow[]> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { type: 'array', cellDates: true, codepage: 65001 })
  const sheetName = book.SheetNames[0]
  if (!sheetName) throw new Error('empty_workbook')
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[sheetName], { defval: '', raw: true })
  const read = (row: Record<string, unknown>, key: keyof typeof ATTENDANCE_HEADER_ALIASES) => {
    for (const header of Object.keys(row)) {
      if (ATTENDANCE_HEADER_ALIASES[key].includes(cleanHeader(header))) return row[header]
    }
    return undefined
  }
  const normalizeStatus = (value: unknown): ParsedAttendanceRow['status'] => {
    const text = String(value ?? '').trim().toLowerCase()
    if (['present', 'حاضر', 'حضور', 'p', '1'].includes(text)) return 'present'
    if (['absent', 'غائب', 'غياب', 'a', '0'].includes(text)) return 'absent'
    if (['late', 'متأخر', 'تأخير', 'l'].includes(text)) return 'late'
    if (['excused', 'بعذر', 'معذور', 'e'].includes(text)) return 'excused'
    return 'present'
  }
  return raw.map((row, index) => ({
    row: index + 2,
    date: parseDate(read(row, 'date') ?? ''),
    className: String(read(row, 'className') ?? '').trim(),
    studentId: String(read(row, 'studentId') ?? '').trim(),
    status: normalizeStatus(read(row, 'status')),
    session: String(read(row, 'session') ?? '').trim() || 'Morning',
    note: String(read(row, 'note') ?? '').trim() || undefined,
  })).filter(row => row.studentId || row.date)
}

/* ── Teacher import ───────────────────────────────────────────────────── */

export interface ParsedTeacherRow {
  row: number
  nameAr: string
  nameEn: string
  email: string
  phone: string
  subjects: string[]
  classes: string[]
}

const TEACHER_HEADER_ALIASES = {
  nameAr: ['namear', 'arabic name', 'الاسم بالعربية', 'الاسم العربي', 'اسم المعلم', 'الاسم'],
  nameEn: ['nameen', 'english name', 'الاسم بالإنجليزية', 'الاسم الانجليزي', 'name'],
  email: ['email', 'البريد الإلكتروني', 'البريد'],
  phone: ['phone', 'mobile', 'الهاتف', 'الجوال', 'رقم الهاتف'],
  subjects: ['subjects', 'subject', 'التخصص', 'المواد', 'المادة'],
  classes: ['classes', 'class', 'الفصول', 'الفصل', 'الشعبة'],
}

export async function parseTeacherWorkbook(file: File): Promise<ParsedTeacherRow[]> {
  const buffer = await file.arrayBuffer()
  const book = XLSX.read(buffer, { type: 'array', codepage: 65001 })
  const sheetName = book.SheetNames[0]
  if (!sheetName) throw new Error('empty_workbook')
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[sheetName], { defval: '' })
  const read = (row: Record<string, unknown>, key: keyof typeof TEACHER_HEADER_ALIASES) => {
    for (const header of Object.keys(row)) {
      if (TEACHER_HEADER_ALIASES[key].includes(cleanHeader(header))) return row[header]
    }
    return undefined
  }
  const splitList = (value: unknown) => String(value ?? '')
    .split(/[;,|]/)
    .map(part => part.trim())
    .filter(Boolean)
  return raw.map((row, index) => ({
    row: index + 2,
    nameAr: String(read(row, 'nameAr') ?? '').trim(),
    nameEn: String(read(row, 'nameEn') ?? '').trim(),
    email: String(read(row, 'email') ?? '').trim(),
    phone: String(read(row, 'phone') ?? '').trim(),
    subjects: splitList(read(row, 'subjects')),
    classes: splitList(read(row, 'classes')),
  })).filter(row => row.nameAr || row.nameEn || row.email)
}

/* ── Printable PDF (browser print dialog) ─────────────────────────────── */

export interface PrintOptions {
  title: string
  subtitle?: string
  lang: Language
  bodyHtml: string
  footer?: string
}

export function printPdf({ title, subtitle, lang, bodyHtml, footer }: PrintOptions) {
  const ar = lang === 'ar'
  const win = window.open('', '_blank', 'width=1024,height=768')
  if (!win) return false
  win.document.write(`<!doctype html>
<html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; }
  body { font-family: Cairo, Inter, Arial, sans-serif; color: #1a2540; margin: 0; padding: 32px; font-size: 12px; }
  .brand { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #19a99a; padding-bottom:14px; margin-bottom:20px; }
  .brand h1 { margin:0; font-size:20px; color:#182b52; }
  .brand p { margin:4px 0 0; color:#64748b; font-size:11px; }
  .logo { width:44px;height:44px;border-radius:12px;background:#19a99a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;}
  h2 { color:#182b52; font-size:16px; margin:0 0 4px; }
  .sub { color:#64748b; margin-bottom:18px; }
  table { width:100%; border-collapse:collapse; margin-top:12px; }
  th { background:#f1f5f9; color:#334155; text-align:${ar ? 'right' : 'left'}; font-size:10px; text-transform:uppercase; letter-spacing:.04em; padding:8px; border-bottom:2px solid #e2e8f0; }
  td { padding:8px; border-bottom:1px solid #eef2f7; font-size:11px; }
  tr:nth-child(even) td { background:#fbfcfe; }
  .badge { display:inline-block; padding:2px 7px; border-radius:99px; font-size:9px; font-weight:700; }
  .ok { background:#dcfce7; color:#15803d; } .warn { background:#fef3c7; color:#b45309; } .bad { background:#fee2e2; color:#b91c1c; }
  .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin:14px 0; }
  .kpi { border:1px solid #e2e8f0; border-radius:10px; padding:10px; }
  .kpi span { display:block; color:#64748b; font-size:9px; } .kpi strong { font-size:18px; color:#182b52; }
  .footer { margin-top:28px; border-top:1px solid #e2e8f0; padding-top:10px; color:#94a3b8; font-size:9px; display:flex; justify-content:space-between; }
  @media print { body { padding: 12px; } .no-print { display:none; } }
</style>
</head>
<body>
  <div class="brand">
    <div>
      <h1>${ar ? 'مدرسة سان جورج — الحرم الرقمي' : 'St. George School — Digital Campus'}</h1>
      <p>${ar ? 'تقرير رسمي معتمد' : 'Official Academic Document'}</p>
    </div>
    <div class="logo">SGS</div>
  </div>
  <h2>${title}</h2>
  ${subtitle ? `<div class="sub">${subtitle}</div>` : ''}
  ${bodyHtml}
  <div class="footer">
    <span>${footer ?? ''}</span>
    <span>${new Date().toLocaleString(ar ? 'ar-EG' : 'en-GB')}</span>
  </div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 350); };</script>
</body>
</html>`)
  win.document.close()
  return true
}

/* ── Small DOM helper for printable tables ────────────────────────────── */

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function htmlTable(headers: string[], rows: string[][]) {
  return `<table><thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${
    rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')
  }</tbody></table>`
}
