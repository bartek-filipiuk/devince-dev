import React from 'react'
import Link from 'next/link'
import {
  FacebookIcon,
  TwitterIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
  GithubIcon,
  DiscordIcon,
  TiktokIcon,
} from '@/components/icons/brand'
import { cn } from '@/utilities/ui'

type Platform =
  | 'facebook'
  | 'twitter'
  | 'instagram'
  | 'linkedin'
  | 'youtube'
  | 'discord'
  | 'github'
  | 'tiktok'

const platformIcons: Record<Platform, React.FC<{ className?: string }>> = {
  facebook: FacebookIcon,
  twitter: TwitterIcon,
  instagram: InstagramIcon,
  linkedin: LinkedinIcon,
  youtube: YoutubeIcon,
  discord: DiscordIcon,
  github: GithubIcon,
  tiktok: TiktokIcon,
}

const platformLabels: Record<Platform, string> = {
  facebook: 'Facebook',
  twitter: 'Twitter / X',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  discord: 'Discord',
  github: 'GitHub',
  tiktok: 'TikTok',
}

type SocialLink = {
  platform?: Platform | null
  url?: string | null
  id?: string | null
}

type SocialLinksProps = {
  links?: SocialLink[] | null
  size?: 'default' | 'large'
  className?: string
}

export const SocialLinks: React.FC<SocialLinksProps> = ({
  links,
  size = 'default',
  className,
}) => {
  if (!links || links.length === 0) return null

  const iconSize = size === 'large' ? 'w-6 h-6' : 'w-5 h-5'
  const linkPadding = size === 'large' ? 'p-3' : 'p-2'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {links.map((link, index) => {
        if (!link.platform || !link.url) return null

        const Icon = platformIcons[link.platform]
        const label = platformLabels[link.platform]

        return (
          <Link
            key={link.id || index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10',
              linkPadding,
            )}
            aria-label={label}
          >
            <Icon className={iconSize} />
          </Link>
        )
      })}
    </div>
  )
}
