import { describe, it, expect } from 'vitest'
import { analyzeDevis, resolvePoste } from '../src/utils/priceAnalyzer.js'
import prixBTP from '../src/data/prixBTP.json'

const base = {
  codePostal: '93200',
  ville: null,
  pieces: [{ id: 'p1', type: 'salle_de_bain', nom: 'SdB', dimensions: null, surfaces: { sol: 5, murs: 22 }, lineIds: [1] }],
  totalHT: 0,
  warnings: [],
}

describe('resolvePoste', () => {
  it('résout un chemin postes_transverses', () => {
    const poste = resolvePoste(prixBTP, 'postes_transverses.peinture.peinture_murs_2couches')
    expect(poste).toBeTruthy()
    expect(poste.unite).toBe('m²')
    expect(poste.mat_moy).toBe(8)
  })

  it('résout un chemin pieces.postes_specifiques', () => {
    const poste = resolvePoste(prixBTP, 'pieces.salle_de_bain.postes_specifiques.plomberie.receveur_standard')
    expect(poste).toBeTruthy()
    expect(poste.unite).toBe('u')
  })

  it('retourne null pour chemin inexistant', () => {
    expect(resolvePoste(prixBTP, 'postes_transverses.inexistant.foo')).toBeNull()
  })
})

describe('analyzeDevis — typePrestation', () => {
  const lineTemplate = {
    numero: 1, designation: 'Peinture murs', quantite: 20, unite: 'm²',
    pieceId: 'p1', poste: 'postes_transverses.peinture.peinture_murs_2couches',
    confidence: 0.9,
  }

  it('fourniture_et_pose : somme mat+mo', () => {
    const result = analyzeDevis({
      ...base,
      lines: [{ ...lineTemplate, typePrestation: 'fourniture_et_pose', prixUnitaire: 30, montantHT: 600 }],
    }, prixBTP)
    // (mat_moy 8 + mo_moy 22) * coef 1.00 * 20m² = 600 → verdict ok
    expect(result.lines[0].verdict).toBe('ok')
    expect(result.lines[0].prixMarche.prixMoyen).toBe(600)
  })

  it('pose_seule : utilise UNIQUEMENT mo_moy', () => {
    const result = analyzeDevis({
      ...base,
      lines: [{ ...lineTemplate, typePrestation: 'pose_seule', prixUnitaire: 22, montantHT: 440 }],
    }, prixBTP)
    expect(result.lines[0].prixMarche.prixMoyen).toBe(440)
    expect(result.lines[0].verdict).toBe('ok')
  })

  it('fourniture_seule : utilise UNIQUEMENT mat_moy', () => {
    const result = analyzeDevis({
      ...base,
      lines: [{ ...lineTemplate, typePrestation: 'fourniture_seule', prixUnitaire: 8, montantHT: 160 }],
    }, prixBTP)
    expect(result.lines[0].prixMarche.prixMoyen).toBe(160)
  })

  it('classe `bad` si montant > fourchetteMax * 1.15', () => {
    const result = analyzeDevis({
      ...base,
      lines: [{ ...lineTemplate, typePrestation: 'fourniture_et_pose', prixUnitaire: 60, montantHT: 1200 }],
    }, prixBTP)
    expect(result.lines[0].verdict).toBe('bad')
  })

  it('classe `warn` si montant entre fourchetteMax et fourchetteMax * 1.15', () => {
    const result = analyzeDevis({
      ...base,
      lines: [{ ...lineTemplate, typePrestation: 'fourniture_et_pose', prixUnitaire: 46, montantHT: 920 }],
    }, prixBTP)
    expect(result.lines[0].verdict).toBe('warn')
  })

  it('classe `low` si montant < fourchetteMin * 0.85', () => {
    const result = analyzeDevis({
      ...base,
      lines: [{ ...lineTemplate, typePrestation: 'fourniture_et_pose', prixUnitaire: 15, montantHT: 300 }],
    }, prixBTP)
    expect(result.lines[0].verdict).toBe('low')
  })

  it('classe `unknown` si poste null', () => {
    const result = analyzeDevis({
      ...base,
      lines: [{ ...lineTemplate, typePrestation: 'fourniture_et_pose', poste: null, prixUnitaire: 30, montantHT: 600 }],
    }, prixBTP)
    expect(result.lines[0].verdict).toBe('unknown')
  })
})

describe('analyzeDevis — coefficient régional', () => {
  const line = {
    numero: 1, designation: 'x', quantite: 20, unite: 'm²', pieceId: 'p1',
    poste: 'postes_transverses.peinture.peinture_murs_2couches',
    typePrestation: 'fourniture_et_pose', prixUnitaire: 30, montantHT: 600, confidence: 0.9,
  }

  it('Paris (75) applique ×1.15', () => {
    const result = analyzeDevis({ ...base, codePostal: '75011', lines: [line] }, prixBTP)
    expect(result.lines[0].prixMarche.prixMoyen).toBe(690)
  })

  it('Lyon (69) applique ×0.95', () => {
    const result = analyzeDevis({ ...base, codePostal: '69001', lines: [line] }, prixBTP)
    expect(result.lines[0].prixMarche.prixMoyen).toBe(570)
  })
})

describe('analyzeDevis — totaux et verdict global', () => {
  it('calcule totalArtisan, totalMarcheMoyen, écart global', () => {
    const result = analyzeDevis({
      ...base,
      lines: [
        {
          numero: 1, designation: 'x', quantite: 20, unite: 'm²', pieceId: 'p1',
          poste: 'postes_transverses.peinture.peinture_murs_2couches',
          typePrestation: 'fourniture_et_pose', prixUnitaire: 30, montantHT: 600, confidence: 0.9,
        },
      ],
    }, prixBTP)
    expect(result.totalArtisan).toBe(600)
    expect(result.totalMarcheMoyen).toBe(600)
    expect(result.ecartPourcent).toBe(0)
    expect(result.verdict).toBe('ok')
  })
})
