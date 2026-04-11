import { describe, it, expect } from 'vitest'
import { computePieceSurfaces, defaultSurfaceForType } from '../src/utils/surfaceCalculator.js'

describe('computePieceSurfaces', () => {
  it('calcule sol, murs, plafond, périmètre à partir des dimensions', () => {
    const surfaces = computePieceSurfaces({
      type: 'salle_de_bain',
      dimensions: { longueur: 3, largeur: 2, hauteur: 2.5 },
    })
    expect(surfaces.sol).toBe(6)
    expect(surfaces.plafond).toBe(6)
    expect(surfaces.perimetre).toBe(10)
    expect(surfaces.murs).toBe(25) // 10 * 2.5
  })

  it('utilise les surfaces moyennes par défaut si dimensions null', () => {
    const surfaces = computePieceSurfaces({
      type: 'salle_de_bain',
      dimensions: null,
    })
    expect(surfaces.sol).toBeGreaterThan(0)
    expect(surfaces.murs).toBeGreaterThan(0)
    expect(surfaces._default).toBe(true)
  })
})

describe('defaultSurfaceForType', () => {
  it('salle_de_bain = 5m² sol', () => {
    expect(defaultSurfaceForType('salle_de_bain').sol).toBe(5)
  })

  it('cuisine = 10m² sol', () => {
    expect(defaultSurfaceForType('cuisine').sol).toBe(10)
  })

  it('salon = 25m² sol', () => {
    expect(defaultSurfaceForType('salon').sol).toBe(25)
  })

  it('type inconnu = fallback 15m²', () => {
    expect(defaultSurfaceForType('inexistant').sol).toBe(15)
  })
})
