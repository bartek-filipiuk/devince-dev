import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Newsletter Subscription Confirmed',
  description: 'Your newsletter subscription has been confirmed.',
}

export default function NewsletterConfirmedPage() {
  return (
    <div className="container py-20">
      <div className="max-w-lg mx-auto text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-4">Subscription Confirmed!</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Thank you for subscribing to our newsletter. You will now receive updates and news from
          us.
        </p>
        <Button asChild>
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  )
}
