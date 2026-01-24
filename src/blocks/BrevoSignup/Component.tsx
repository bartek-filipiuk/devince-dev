'use client'

import React, { useState } from 'react'
import Link from 'next/link'

import type { BrevoSignupBlock as BrevoSignupProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { ScrollReveal } from '@/components/ScrollReveal'

/**
 * BrevoSignup Block - Newsletter Signup Form
 *
 * This component provides STRUCTURE only.
 * All visual styling should be added via theme.css based on PAGE_DESIGN.md
 *
 * CSS classes to customize in theme.css:
 * - .brevo-section: Main section wrapper
 * - .brevo-content: Content container
 * - .brevo-headline: Main heading
 * - .brevo-description: Description text
 * - .brevo-form: Form wrapper
 * - .brevo-input: Email input field
 * - .brevo-button: Submit button
 * - .brevo-message: Message container
 * - .brevo-message--success: Success message
 * - .brevo-message--error: Error message
 * - .brevo-privacy: Privacy link text
 */
export const BrevoSignupBlock: React.FC<BrevoSignupProps> = ({
  listId,
  headline,
  description,
  placeholder,
  buttonText,
  successMessage,
  privacyLink,
}) => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setStatus('error')
      setMessage('Proszę podać adres email')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, listId }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(successMessage || data.message || 'Sprawdź swoją skrzynkę email, aby potwierdzić subskrypcję.')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Wystąpił błąd. Spróbuj ponownie.')
      }
    } catch {
      setStatus('error')
      setMessage('Wystąpił błąd. Spróbuj ponownie.')
    }
  }

  return (
    <section className="brevo-section py-16 md:py-24">
      <div className="container">
        <ScrollReveal>
          <div className="brevo-content max-w-2xl mx-auto text-center">
            {headline && (
              <h2 className="brevo-headline text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                {headline}
              </h2>
            )}

            {description && (
              <div className="brevo-description text-muted-foreground mb-8">
                <RichText data={description} enableGutter={false} />
              </div>
            )}

            <form onSubmit={handleSubmit} className="brevo-form">
              <div className="brevo-form-inner flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={placeholder || 'Twój adres email'}
                  className="brevo-input flex-1 px-4 py-3 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={status === 'loading'}
                  required
                />
                <button
                  type="submit"
                  className="brevo-button px-6 py-3 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Zapisywanie...' : buttonText || 'Zapisz się'}
                </button>
              </div>

              {message && (
                <p
                  className={`brevo-message mt-4 text-sm ${
                    status === 'success'
                      ? 'brevo-message--success text-green-600 dark:text-green-400'
                      : 'brevo-message--error text-red-600 dark:text-red-400'
                  }`}
                >
                  {message}
                </p>
              )}

              {privacyLink && (
                <p className="brevo-privacy text-sm text-muted-foreground mt-4">
                  Zapisując się, akceptujesz{' '}
                  <Link href={privacyLink} className="underline hover:text-foreground transition-colors">
                    politykę prywatności
                  </Link>.
                </p>
              )}
            </form>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
