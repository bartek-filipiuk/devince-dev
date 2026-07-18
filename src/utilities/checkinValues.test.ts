import { describe, expect, it } from 'vitest'
import { validateCheckinValues, validateMeasurementValues, type FieldDef } from './checkinValues'

const fields: FieldDef[] = [
  { key: 'trainingType', fieldType: 'select', options: [{ value: 'sila_A' }, { value: 'cardio' }] },
  { key: 'steps', fieldType: 'number', min: 0, max: 100000 },
  { key: 'swapUpf', fieldType: 'boolean' },
  { key: 'memo', fieldType: 'text' },
]

describe('validateCheckinValues', () => {
  it('przyjmuje poprawne wartości i odrzuca nieznane klucze', () => {
    const ok = validateCheckinValues(fields, { trainingType: 'sila_A', steps: 8000 })
    expect(ok).toEqual({ ok: true, values: { trainingType: 'sila_A', steps: 8000 } })
    expect(validateCheckinValues(fields, { hack: 1 }).ok).toBe(false)
  })
  it('null czyści pole; brakujące pola są opcjonalne', () => {
    const ok = validateCheckinValues(fields, { steps: null })
    expect(ok).toEqual({ ok: true, values: { steps: null } })
  })
  it('egzekwuje typ, zakres i opcje selecta', () => {
    expect(validateCheckinValues(fields, { steps: 'duzo' }).ok).toBe(false)
    expect(validateCheckinValues(fields, { steps: -1 }).ok).toBe(false)
    expect(validateCheckinValues(fields, { steps: 100001 }).ok).toBe(false)
    expect(validateCheckinValues(fields, { trainingType: 'zumba' }).ok).toBe(false)
    expect(validateCheckinValues(fields, { swapUpf: 'tak' }).ok).toBe(false)
  })
  it('tekst max 2000 znaków; input nie-obiekt odrzucony', () => {
    expect(validateCheckinValues(fields, { memo: 'x'.repeat(2001) }).ok).toBe(false)
    expect(validateCheckinValues(fields, 'string').ok).toBe(false)
    expect(validateCheckinValues(fields, undefined)).toEqual({ ok: true, values: {} })
  })
})

describe('validateMeasurementValues', () => {
  const metrics = [{ key: 'weightKg', min: 30, max: 300 }, { key: 'pushups', min: 0, max: 200 }]
  it('tylko liczby w zakresie, nieznane klucze odrzucone', () => {
    expect(validateMeasurementValues(metrics, { weightKg: 92.5 })).toEqual({ ok: true, values: { weightKg: 92.5 } })
    expect(validateMeasurementValues(metrics, { weightKg: 10 }).ok).toBe(false)
    expect(validateMeasurementValues(metrics, { other: 1 }).ok).toBe(false)
  })
})
