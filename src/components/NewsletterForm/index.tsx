'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/utilities/ui'

type NewsletterFormProps = {
  className?: string
}

export const NewsletterForm: React.FC<NewsletterFormProps> = ({ className }) => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message || 'Successfully subscribed!')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Subscription failed')
      }
    } catch (error) {
      setStatus('error')
      setMessage('An error occurred. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-2', className)}>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={status === 'loading'}
          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
        />
        <Button
          type="submit"
          disabled={status === 'loading'}
          variant="secondary"
          className="whitespace-nowrap"
        >
          {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </Button>
      </div>
      {message && (
        <p
          className={cn(
            'text-sm',
            status === 'error' ? 'text-red-400' : 'text-green-400',
          )}
        >
          {message}
        </p>
      )}
    </form>
  )
}
