// Départements réputés ruraux (faible densité INSEE)
const RURAL_DEPARTEMENTS = new Set([
  '03','04','05','07','08','09','12','15','16','18','19','23','24','32',
  '36','39','40','43','46','48','52','53','55','58','61','65','70','71',
  '79','81','82','87','88','89','90'
])

const COEFFICIENTS = {
  // Paris + proche couronne premium
  '75': 1.15, '92': 1.15,
  // IDF hors Paris
  '77': 1.00, '78': 1.00, '91': 1.00, '93': 1.00, '94': 1.00, '95': 1.00,
  // Grandes métropoles régionales
  '69': 0.95, // Rhône (Lyon)
  '13': 0.95, // Bouches-du-Rhône (Marseille)
  '33': 0.95, // Gironde (Bordeaux)
  '31': 0.95, // Haute-Garonne (Toulouse)
  '44': 0.95, // Loire-Atlantique (Nantes)
  '59': 0.95, // Nord (Lille)
  '06': 0.95, // Alpes-Maritimes (Nice)
  '34': 0.95, // Hérault (Montpellier)
  '67': 0.95, // Bas-Rhin (Strasbourg)
  '38': 0.95, // Isère (Grenoble)
}

export function getCoefficient(codePostal) {
  if (codePostal === null || codePostal === undefined) return 1.0
  const cp = String(codePostal).trim()
  if (!/^\d{4,5}$/.test(cp)) return 1.0
  const dep = cp.length === 4 ? '0' + cp.slice(0, 1) : cp.slice(0, 2)
  if (COEFFICIENTS[dep] !== undefined) return COEFFICIENTS[dep]
  if (RURAL_DEPARTEMENTS.has(dep)) return 0.75
  return 0.85 // ville moyenne par défaut
}
