'use client'

import React, { ReactNode, useEffect, useRef, useState } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  animation?: string
  delay?: number
  duration?: number
  threshold?: number
  once?: boolean
  className?: string
  staggerIndex?: number
}

/**
 * ScrollReveal - Intersection Observer based reveal animations
 *
 * Reveals children when they enter the viewport using CSS transitions.
 * Uses the .scroll-reveal and .revealed classes defined in theme.css.
 *
 * Props:
 * - delay: Transition delay in ms (default: 0)
 * - threshold: Visibility threshold 0-1 (default: 0.1)
 * - once: Only animate once (default: true)
 * - staggerIndex: For staggered animations (1-6), adds stagger-N class
 * - className: Additional classes to apply
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  delay = 0,
  threshold = 0.1,
  once = true,
  className = '',
  staggerIndex,
}) => {
  const [isRevealed, setIsRevealed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setIsRevealed(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsRevealed(true)
            if (once) {
              observer.unobserve(element)
            }
          } else if (!once) {
            setIsRevealed(false)
          }
        })
      },
      {
        threshold,
        rootMargin: '0px 0px -50px 0px',
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold, once])

  const staggerClass = staggerIndex ? `stagger-${staggerIndex}` : ''
  const revealedClass = isRevealed ? 'revealed' : ''

  const style: React.CSSProperties = delay && !staggerIndex ? { transitionDelay: `${delay}ms` } : {}

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${staggerClass} ${revealedClass} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  )
}
