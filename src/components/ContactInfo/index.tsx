import React from 'react'
import { Mail, Phone, MapPin } from 'lucide-react'
import { cn } from '@/utilities/ui'

type Address = {
  street?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
}

type Contact = {
  email?: string | null
  phone?: string | null
  address?: Address | null
}

type ContactInfoProps = {
  contact?: Contact | null
  detailed?: boolean
  className?: string
}

export const ContactInfo: React.FC<ContactInfoProps> = ({
  contact,
  detailed = false,
  className,
}) => {
  if (!contact) return null

  const { email, phone, address } = contact

  const hasAddress = address && (address.street || address.city || address.country)

  if (!email && !phone && !hasAddress) return null

  const formatAddress = () => {
    if (!address) return null
    const parts = []
    if (address.street) parts.push(address.street)
    if (address.city || address.postalCode) {
      const cityPart = [address.postalCode, address.city].filter(Boolean).join(' ')
      if (cityPart) parts.push(cityPart)
    }
    if (address.country) parts.push(address.country)
    return parts
  }

  const addressParts = formatAddress()

  if (detailed) {
    return (
      <div className={cn('space-y-4', className)}>
        {email && (
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 mt-0.5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <a href={`mailto:${email}`} className="hover:text-primary transition-colors">
                {email}
              </a>
            </div>
          </div>
        )}

        {phone && (
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 mt-0.5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <a href={`tel:${phone}`} className="hover:text-primary transition-colors">
                {phone}
              </a>
            </div>
          </div>
        )}

        {hasAddress && addressParts && (
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 mt-0.5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              {addressParts.map((part, index) => (
                <p key={index}>{part}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Compact view for footer
  return (
    <div className={cn('space-y-2 text-sm', className)}>
      {email && (
        <a
          href={`mailto:${email}`}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <Mail className="w-4 h-4" />
          {email}
        </a>
      )}

      {phone && (
        <a
          href={`tel:${phone}`}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <Phone className="w-4 h-4" />
          {phone}
        </a>
      )}

      {hasAddress && addressParts && (
        <div className="flex items-start gap-2 text-gray-400">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            {addressParts.map((part, index) => (
              <span key={index}>
                {part}
                {index < addressParts.length - 1 && ', '}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
