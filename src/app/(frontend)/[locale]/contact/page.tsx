import React from 'react'
import type { Metadata } from 'next'

// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic'
import { getCachedGlobal } from '@/utilities/getGlobals'
import type { SiteSetting } from '@/payload-types'
import { ContactInfo } from '@/components/ContactInfo'
import { SocialLinks } from '@/components/SocialLinks'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with us. Find our contact information and location.',
}

export default async function ContactPage() {
  const siteSettings = (await getCachedGlobal('site-settings', 1)()) as SiteSetting

  return (
    <div className="container py-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Contact Us</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
            {siteSettings?.contact ? (
              <ContactInfo contact={siteSettings.contact} detailed />
            ) : (
              <p className="text-muted-foreground">
                Contact information not configured. Please update Site Settings in the admin panel.
              </p>
            )}
          </div>

          {/* Additional Info / Map Placeholder */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Find Us</h2>
            <div className="bg-muted rounded-lg p-8 text-center">
              <p className="text-muted-foreground">
                Map or additional information can be added here.
              </p>
            </div>
          </div>
        </div>

        {/* Social Links */}
        {siteSettings?.socialLinks && siteSettings.socialLinks.length > 0 && (
          <div className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-semibold mb-6">Follow Us</h2>
            <SocialLinks links={siteSettings.socialLinks} size="large" />
          </div>
        )}
      </div>
    </div>
  )
}
