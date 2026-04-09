import { calculateSurfaces } from '../utils/surfaceCalculator'

const ROOM_TYPES = [
  { key: 'salle_de_bain', label: '🚿 Salle de bain' },
  { key: 'cuisine', label: '🍳 Cuisine' },
  { key: 'salon', label: '🛋️ Salon' },
  { key: 'chambre', label: '🛏️ Chambre' },
  { key: 'wc', label: '🚽 WC' },
  { key: 'autre', label: '📐 Autre' }
]

export default function RoomForm({ room, onChange, onRemove, canRemove }) {
  function update(field, value) {
    onChange({ ...room, [field]: value })
  }

  function updateNested(parent, field, value) {
    onChange({ ...room, [parent]: { ...room[parent], [field]: value } })
  }

  const hasRequiredFields = room.longueur && room.largeur && room.hauteur
  const surfaces = hasRequiredFields
    ? calculateSurfaces({
        ...room,
        longueur: parseFloat(room.longueur),
        largeur: parseFloat(room.largeur),
        hauteur: parseFloat(room.hauteur),
        douche: room.douche?.largeur && room.douche?.profondeur
          ? { largeur: parseFloat(room.douche.largeur), profondeur: parseFloat(room.douche.profondeur) }
          : null,
        porte: room.porte?.largeur
          ? { largeur: parseFloat(room.porte.largeur), hauteur: parseFloat(room.porte.hauteur) }
          : null,
        fenetre: room.fenetre?.largeur
          ? { largeur: parseFloat(room.fenetre.largeur), hauteur: parseFloat(room.fenetre.hauteur) }
          : null
      })
    : null

  return (
    <div className="card room-card">
      <div className="room-header">
        <div className="room-type-selector">
          {ROOM_TYPES.map(t => (
            <button
              key={t.key}
              className={`room-type-btn ${room.type === t.key ? 'active' : ''}`}
              onClick={() => update('type', t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {canRemove && (
          <button className="room-remove" onClick={onRemove}>✕</button>
        )}
      </div>

      <div className="room-grid">
        <div className="form-group">
          <label className="form-label">Longueur (m)</label>
          <input className="form-input" type="number" step="0.01" placeholder="3,50"
            value={room.longueur} onChange={e => update('longueur', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Largeur (m)</label>
          <input className="form-input" type="number" step="0.01" placeholder="1,30"
            value={room.largeur} onChange={e => update('largeur', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Hauteur sous plafond (m)</label>
          <input className="form-input" type="number" step="0.01" placeholder="2,50"
            value={room.hauteur} onChange={e => update('hauteur', e.target.value)} />
        </div>
      </div>

      {room.type === 'salle_de_bain' && (
        <div className="room-section">
          <p className="room-section-title">Douche / Baignoire existante</p>
          <div className="room-grid">
            <div className="form-group">
              <label className="form-label">Largeur (m)</label>
              <input className="form-input" type="number" step="0.01" placeholder="1,20"
                value={room.douche?.largeur || ''} onChange={e => updateNested('douche', 'largeur', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Profondeur (m)</label>
              <input className="form-input" type="number" step="0.01" placeholder="0,90"
                value={room.douche?.profondeur || ''} onChange={e => updateNested('douche', 'profondeur', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {surfaces && (
        <div className="surfaces-box">
          <p className="surfaces-title">📐 Surfaces calculées</p>
          <div className="surfaces-grid">
            <div className="surface-item">
              <span className="surface-value">{surfaces.sol.toFixed(2)}</span>
              <span className="surface-label">m² sol</span>
            </div>
            <div className="surface-item">
              <span className="surface-value">{surfaces.mursNet.toFixed(2)}</span>
              <span className="surface-label">m² murs</span>
            </div>
            <div className="surface-item">
              <span className="surface-value">{surfaces.plafond.toFixed(2)}</span>
              <span className="surface-label">m² plafond</span>
            </div>
            <div className="surface-item">
              <span className="surface-value">{surfaces.perimetre.toFixed(2)}</span>
              <span className="surface-label">ml périmètre</span>
            </div>
            {surfaces.carrelageSol !== undefined && surfaces.carrelageSol !== surfaces.sol && (
              <div className="surface-item">
                <span className="surface-value">{surfaces.carrelageSol.toFixed(2)}</span>
                <span className="surface-label">m² carrelage sol</span>
              </div>
            )}
            {surfaces.faienceTotal > 0 && (
              <div className="surface-item">
                <span className="surface-value">{surfaces.faienceTotal.toFixed(2)}</span>
                <span className="surface-label">m² faïence</span>
              </div>
            )}
          </div>
          {surfaces.alertes?.length > 0 && (
            <div className="surfaces-alertes">
              {surfaces.alertes.map((a, i) => (
                <p key={i} className="alerte-item">⚠️ {a.message}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
