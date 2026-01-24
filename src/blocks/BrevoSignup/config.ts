import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

export const BrevoSignup: Block = {
  slug: 'brevoSignup',
  interfaceName: 'BrevoSignupBlock',
  fields: [
    {
      name: 'listId',
      type: 'text',
      required: true,
      label: 'Brevo List ID',
      admin: {
        description: 'ID listy w Brevo, do której będą dodawani subskrybenci',
      },
    },
    {
      name: 'headline',
      type: 'text',
      localized: true,
      label: 'Nagłówek',
      defaultValue: 'Zapisz się do newslettera',
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
      label: 'Opis',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h3', 'h4'] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
    },
    {
      name: 'placeholder',
      type: 'text',
      localized: true,
      label: 'Placeholder pola email',
      defaultValue: 'Twój adres email',
    },
    {
      name: 'buttonText',
      type: 'text',
      localized: true,
      label: 'Tekst przycisku',
      defaultValue: 'Zapisz się',
    },
    {
      name: 'successMessage',
      type: 'text',
      localized: true,
      label: 'Komunikat sukcesu',
      defaultValue: 'Sprawdź swoją skrzynkę email, aby potwierdzić subskrypcję.',
    },
    {
      name: 'privacyLink',
      type: 'text',
      localized: true,
      label: 'Link do polityki prywatności',
      admin: {
        description: 'Opcjonalny link do strony polityki prywatności (np. /privacy)',
      },
    },
  ],
  labels: {
    plural: 'Formularze Brevo',
    singular: 'Formularz Brevo',
  },
}
