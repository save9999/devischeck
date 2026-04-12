import { describe, it, expect } from 'vitest'
import { analyzeDevis } from '../../src/utils/priceAnalyzer.js'
import { enrichPiecesWithSurfaces } from '../../src/utils/surfaceCalculator.js'
import prixBTP from '../../src/data/prixBTP.json'
import mockResponse from '../fixtures/mock-responses/simple-sdb.json'

describe('Integration: full pipeline from Claude response to analysis', () => {
  it('analyse une sdb 5m² avec carrelage + peinture', () => {
    const enriched = enrichPiecesWithSurfaces(mockResponse)
    const analysis = analyzeDevis(enriched, prixBTP)

    expect(analysis.totalArtisan).toBe(1085)
    expect(analysis.coefficient).toBe(1.00) // 93 → IDF hors Paris
    expect(analysis.lines).toHaveLength(2)

    const carrelage = analysis.lines.find(l => l.numero === 1)
    expect(carrelage.matched).toBe(true)
    // (mat 20 + mo 65) * 1.00 * 5 = 425 → ok
    expect(carrelage.prixMarche.prixMoyen).toBe(425)
    expect(carrelage.verdict).toBe('ok')

    const peinture = analysis.lines.find(l => l.numero === 2)
    expect(peinture.matched).toBe(true)
    // (mat 8 + mo 22) * 1.00 * 22 = 660 → ok
    expect(peinture.verdict).toBe('ok')
  })

  it('détecte une anomalie quand le prix est surévalué', () => {
    const inflated = {
      ...mockResponse,
      lines: mockResponse.lines.map(l => l.numero === 1 ? { ...l, prixUnitaire: 200, montantHT: 1000 } : l),
    }
    const enriched = enrichPiecesWithSurfaces(inflated)
    const analysis = analyzeDevis(enriched, prixBTP)
    const carrelage = analysis.lines.find(l => l.numero === 1)
    expect(['warn', 'bad']).toContain(carrelage.verdict)
  })
})
