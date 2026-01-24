import { NextRequest, NextResponse } from 'next/server'

const BREVO_API_KEY = process.env.BREVO_API_KEY
const BREVO_LIST_ID = process.env.BREVO_LIST_ID
const BREVO_DOI_TEMPLATE_ID = process.env.BREVO_DOI_TEMPLATE_ID

export async function POST(request: NextRequest) {
  try {
    // Check if Brevo is configured
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

    // Create double opt-in contact via Brevo API v3
    const response = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        email,
        includeListIds: [parseInt(targetListId)],
        templateId: parseInt(BREVO_DOI_TEMPLATE_ID),
        redirectionUrl: `${siteUrl}/newsletter/confirmed`,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()

      // Handle "contact already exists" case
      if (errorData.code === 'duplicate_parameter') {
        return NextResponse.json(
          { message: 'This email is already subscribed' },
          { status: 200 },
        )
      }

      console.error('Brevo API error:', errorData)
      throw new Error(errorData.message || 'Brevo API error')
    }

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
