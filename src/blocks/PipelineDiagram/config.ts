import type { Block } from 'payload'

/**
 * A content block that renders a bespoke pipeline diagram (native CSS, no image).
 * Insert it in a richText field via the WYSIWYG to place the diagram exactly where
 * it belongs in the content flow. Currently one variant: the idea-to-mvp pipeline.
 * The actual visuals live in src/app/apps-app/_components/PipelineDiagram.tsx and
 * are wired through the RichText converter.
 */
export const PipelineDiagram: Block = {
  slug: 'pipelineDiagram',
  interfaceName: 'PipelineDiagramBlock',
  labels: { singular: 'Pipeline diagram', plural: 'Pipeline diagrams' },
  fields: [
    {
      name: 'variant',
      type: 'select',
      defaultValue: 'idea-to-mvp',
      options: [{ label: 'idea-to-mvp (24 stages)', value: 'idea-to-mvp' }],
      admin: { description: 'Which pipeline to render.' },
    },
  ],
}
