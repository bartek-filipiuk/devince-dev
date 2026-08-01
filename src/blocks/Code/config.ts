import type { Block } from 'payload'

export const Code: Block = {
  slug: 'code',
  interfaceName: 'CodeBlock',
  fields: [
    {
      name: 'language',
      type: 'select',
      defaultValue: 'typescript',
      options: [
        // "Plain Text" pierwszy, bo to wybór dla treści, które kodem nie są:
        // promptów, outputów z terminala, wklejek z logów. Prism przy 'text'
        // nie koloruje niczego i dokładnie o to chodzi.
        { label: 'Plain Text', value: 'text' },
        { label: 'TypeScript', value: 'typescript' },
        { label: 'JavaScript', value: 'javascript' },
        { label: 'Python', value: 'python' },
        { label: 'Bash', value: 'bash' },
        { label: 'JSON', value: 'json' },
        { label: 'YAML', value: 'yaml' },
        { label: 'Markdown', value: 'markdown' },
        { label: 'Diff', value: 'diff' },
        { label: 'CSS', value: 'css' },
        { label: 'HTML', value: 'html' },
        { label: 'PHP', value: 'php' },
        { label: 'SQL', value: 'sql' },
      ],
    },
    {
      // Świadomie `textarea`, nie `code`. Pole typu `code` renderuje w adminie
      // CodeMirror, a ten wewnątrz bloku Lexical nie dostaje zdarzenia paste,
      // bo Lexical przechwytuje je na swoim roocie. Efekt: nie da się wkleić
      // treści do bloku kodu. Textarea to natywny element i wkleja się
      // normalnie. Kolorowanie składni robi prism na froncie, więc tracimy
      // wyłącznie podświetlanie w panelu admina.
      name: 'code',
      type: 'textarea',
      label: false,
      required: true,
      admin: {
        rows: 14,
      },
    },
  ],
}
