import type { CollectionConfig } from 'payload'
import crypto from 'crypto'
import { adminOnly } from '../access/adminOnly'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export const CourseInvites: CollectionConfig = {
  slug: 'course-invites',
  access: { read: adminOnly, create: adminOnly, update: adminOnly, delete: adminOnly },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'program', 'cohort', 'expiresAt', 'usedAt'],
  },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create') {
          data.token = crypto.randomUUID()
          data.expiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString()
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation }) => {
        if (operation !== 'create') return
        // Best-effort: błąd wysyłki nie może zablokować utworzenia invite'a —
        // joinUrl i tak jest widoczny w adminie do ręcznego wysłania.
        try {
          const { sendTransactionalEmail } = await import('../utilities/brevo')
          const base = process.env.NEXT_PUBLIC_COURSES_URL ?? 'https://courses.devince.dev'
          const link = `${base}/join/${doc.token}`
          await sendTransactionalEmail({
            to: doc.email,
            subject: 'Twoje zaproszenie do kursu',
            htmlContent: `<p>Cześć!</p><p>Masz zaproszenie do kursu. Dołącz tutaj (link ważny 7 dni):</p><p><a href="${link}">${link}</a></p>`,
          })
        } catch (err) {
          console.error('[course-invites] wysyłka zaproszenia nie powiodła się:', err)
        }
      },
    ],
  },
  fields: [
    { name: 'email', type: 'email', required: true },
    { name: 'program', type: 'relationship', relationTo: 'program', required: true },
    { name: 'cohort', type: 'relationship', relationTo: 'cohorts', required: true },
    { name: 'token', type: 'text', unique: true, index: true, admin: { readOnly: true } },
    { name: 'expiresAt', type: 'date', admin: { readOnly: true } },
    {
      name: 'usedAt',
      type: 'date',
      admin: {
        readOnly: true,
        description: 'Ustawiane atomowo przy dołączeniu — puste = nieużyte',
      },
    },
    { name: 'createdBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    {
      name: 'joinUrl',
      type: 'text',
      virtual: true,
      admin: { readOnly: true, description: 'Link do wysłania uczestnikowi' },
      hooks: {
        afterRead: [
          ({ siblingData }) =>
            siblingData?.token
              ? `${process.env.NEXT_PUBLIC_COURSES_URL ?? ''}/join/${siblingData.token}`
              : null,
        ],
      },
    },
  ],
}
