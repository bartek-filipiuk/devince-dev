import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { BrevoSignupBlock } from '@/blocks/BrevoSignup/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { GlassHeroBlock } from '@/blocks/GlassHero/Component'
import { FeaturesBlock } from '@/blocks/Features/Component'
import { TestimonialsBlock } from '@/blocks/Testimonials/Component'
import { ContactCTABlock } from '@/blocks/ContactCTA/Component'
import { FeaturedProjectsBlock } from '@/blocks/FeaturedProjects/Component'

const blockComponents = {
  archive: ArchiveBlock,
  brevoSignup: BrevoSignupBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  formBlock: FormBlock,
  mediaBlock: MediaBlock,
  glassHero: GlassHeroBlock,
  features: FeaturesBlock,
  testimonials: TestimonialsBlock,
  contactCTA: ContactCTABlock,
  featuredProjects: FeaturedProjectsBlock,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
}> = (props) => {
  const { blocks } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (hasBlocks) {
    return (
      <Fragment>
        {blocks.map((block, index) => {
          const { blockType } = block

          if (blockType && blockType in blockComponents) {
            const Block = blockComponents[blockType]

            if (Block) {
              return (
                <Fragment key={index}>
                  {/* @ts-expect-error there may be some mismatch between the expected types here */}
                  <Block {...block} disableInnerContainer />
                </Fragment>
              )
            }
          }
          return null
        })}
      </Fragment>
    )
  }

  return null
}
