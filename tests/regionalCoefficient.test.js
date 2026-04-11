import { describe, it, expect } from 'vitest'
import { getCoefficient } from '../src/utils/regionalCoefficient.js'

describe('getCoefficient', () => {
  it('retourne 1.15 pour Paris (75)', () => {
    expect(getCoefficient('75001')).toBe(1.15)
    expect(getCoefficient('75020')).toBe(1.15)
  })

  it('retourne 1.15 pour Hauts-de-Seine (92)', () => {
    expect(getCoefficient('92100')).toBe(1.15)
  })

  it('retourne 1.00 pour IDF hors Paris (77, 78, 91, 93, 94, 95)', () => {
    expect(getCoefficient('77000')).toBe(1.00)
    expect(getCoefficient('93200')).toBe(1.00)
    expect(getCoefficient('95000')).toBe(1.00)
  })

  it('retourne 0.95 pour les grandes métropoles (Lyon 69, Marseille 13, Bordeaux 33, Toulouse 31, Nantes 44, Lille 59)', () => {
    expect(getCoefficient('69000')).toBe(0.95)
    expect(getCoefficient('13001')).toBe(0.95)
    expect(getCoefficient('33000')).toBe(0.95)
    expect(getCoefficient('31000')).toBe(0.95)
    expect(getCoefficient('44000')).toBe(0.95)
    expect(getCoefficient('59000')).toBe(0.95)
  })

  it('retourne 0.85 pour une ville moyenne (ex. Angers 49)', () => {
    expect(getCoefficient('49000')).toBe(0.85)
  })

  it('retourne 0.75 pour un département rural (ex. Creuse 23)', () => {
    expect(getCoefficient('23000')).toBe(0.75)
  })

  it('retourne 1.0 pour un code postal invalide ou null', () => {
    expect(getCoefficient(null)).toBe(1.0)
    expect(getCoefficient('')).toBe(1.0)
    expect(getCoefficient('abc')).toBe(1.0)
  })

  it('accepte un code postal en number', () => {
    expect(getCoefficient(75001)).toBe(1.15)
  })
})
