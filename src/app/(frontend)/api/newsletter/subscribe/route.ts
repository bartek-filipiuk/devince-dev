import { NextRequest, NextResponse } from 'next/server'
import { brevoDoubleOptin } from '@/utilities/brevoContacts'

const BREVO_API_KEY = process.env.BREVO_API_KEY
const BREVO_LIST_ID = process.env.BREVO_LIST_ID
const BREVO_DOI_TEMPLATE_ID = process.env.BREVO_DOI_TEMPLATE_ID

export async function POST(request: NextRequest) {
  try {
    // Check if Brevo is configured. The DOI helper itself no-ops without an API
    // key / template, but the public newsletter form should tell the user the
    // service is unavailable rather than silently "succeed".
    if (!BREVO_API_KEY || !BREVO_LIST_ID || !BREVO_DOI_TEMPLATE_ID) {
      console.error('Brevo environment variables not configured')
      return NextResponse.json(
        { error: 'Newsletter service not configured' },
        { status: 503 },
      )
    }

    const { email, listId: customListId } = await request.json()

    // Use custom listId if provided, otherwise fall back to env var
    const targetListId = customListId || BREVO_LIST_ID

    // Validate email
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Get the site URL for redirect
    const siteUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

    // Create double opt-in contact via the shared best-effort helper (DRY — same
    // /v3/contacts/doubleOptinConfirmation call the purchase webhook uses). It
    // never throws; a Brevo "already subscribed" (duplicate_parameter) is a
    // benign no-op, so a neutral 200 "check your email" is correct here (Brevo
    // dedups, no email enumeration).
    await brevoDoubleOptin({
      email,
      listId: Number(targetListId),
      templateId: BREVO_DOI_TEMPLATE_ID,
      redirectionUrl: `${siteUrl}/newsletter/confirmed`,
    })

    return NextResponse.json(
      { message: 'Please check your email to confirm your subscription' },
      { status: 200 },
    )
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again later.' },
      { status: 500 },
    )
  }
}
