import { describe, it, expect } from 'vitest'
import { buildExtractionPrompt, SYSTEM_PROMPT } from '../api/_prompt.js'

describe('buildExtractionPrompt', () => {
  it('inclut le fullText du devis', () => {
    const out = buildExtractionPrompt('Ligne 1 ceci est un devis', ['postes_transverses.peinture.peinture_murs_2couches'])
    expect(out).toContain('Ligne 1 ceci est un devis')
  })

  it('inclut la liste aplatie des postes disponibles', () => {
    const postes = [
      'postes_transverses.peinture.peinture_murs_2couches',
      'pieces.salle_de_bain.postes_specifiques.plomberie.receveur_standard',
    ]
    const out = buildExtractionPrompt('devis', postes)
    expect(out).toContain('postes_transverses.peinture.peinture_murs_2couches')
    expect(out).toContain('pieces.salle_de_bain.postes_specifiques.plomberie.receveur_standard')
  })

  it('SYSTEM_PROMPT mentionne les 3 valeurs de typePrestation', () => {
    expect(SYSTEM_PROMPT).toContain('fourniture_et_pose')
    expect(SYSTEM_PROMPT).toContain('pose_seule')
    expect(SYSTEM_PROMPT).toContain('fourniture_seule')
  })

  it('SYSTEM_PROMPT exige une sortie JSON', () => {
    expect(SYSTEM_PROMPT.toLowerCase()).toContain('json')
  })
})
