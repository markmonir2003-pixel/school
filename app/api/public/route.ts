import { readWorkspace } from '@/lib/server/db'
import { ok, fail, NO_STORE, databaseUnavailable } from '@/lib/server/http'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  let stored
  try { stored = readWorkspace() } catch (error) { return databaseUnavailable(error, '/api/public') }
  if (!stored) {
    return NextResponse.json(
      { ok: true, setupRequired: true, publicData: null },
      { headers: NO_STORE },
    )
  }

  const { data } = stored

  const publicData = {
    setupRequired: false,
    school: {
      nameAr: data.settings.schoolNameAr,
      nameEn: data.settings.schoolNameEn,
      platformNameAr: data.settings.platformNameAr,
      platformNameEn: data.settings.platformNameEn,
      mottoAr: data.settings.mottoAr,
      mottoEn: data.settings.mottoEn,
      email: data.settings.email,
      phone: data.settings.phone,
      addressAr: data.settings.addressAr,
      addressEn: data.settings.addressEn,
      website: data.settings.website,
      logoText: data.settings.logoText,
      principalNameAr: data.settings.principalNameAr,
      principalNameEn: data.settings.principalNameEn,
    },
    cms: data.cms,
    announcements: (data.announcements || [])
      .filter(a => a.published && (a.targetRoles.includes('all') || a.pinned))
      .slice(0, 6),
    events: (data.events || [])
      .filter(e => e.published)
      .slice(0, 6),
    studentProjects: (data.studentProjects || [])
      .filter(p => p.status === 'approved' || p.featured)
      .slice(0, 6),
    activities: (data.schoolActivities || [])
      .filter(a => a.active)
      .slice(0, 6),
    librarySample: (data.libraryResources || [])
      .filter(r => r.isDigital)
      .slice(0, 6),
  }

  return NextResponse.json({ ok: true, ...publicData }, { headers: NO_STORE })
}
