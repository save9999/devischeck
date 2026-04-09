import RoomForm from './RoomForm'

export default function RoomList({ rooms, onChange, devisLines, onAnalyze }) {
  function updateRoom(index, updatedRoom) {
    const newRooms = [...rooms]
    newRooms[index] = updatedRoom
    onChange(newRooms)
  }

  function addRoom() {
    onChange([...rooms, {
      id: Date.now(),
      type: 'autre',
      longueur: '',
      largeur: '',
      hauteur: '',
      douche: null,
      porte: { largeur: '0.8', hauteur: '2' },
      fenetre: null
    }])
  }

  function removeRoom(index) {
    onChange(rooms.filter((_, i) => i !== index))
  }

  const allComplete = rooms.every(r => r.longueur && r.largeur && r.hauteur)

  return (
    <div>
      <div className="card devis-summary">
        <p>📄 <strong>{devisLines.length} lignes</strong> détectées — Total : <strong>{devisLines.reduce((s, l) => s + l.montantHT, 0).toFixed(2)} € HT</strong></p>
      </div>

      {rooms.map((room, index) => (
        <RoomForm
          key={room.id}
          room={room}
          onChange={r => updateRoom(index, r)}
          onRemove={() => removeRoom(index)}
          canRemove={rooms.length > 1}
        />
      ))}

      <button className="btn btn-outline" onClick={addRoom}>
        + Ajouter une autre pièce
      </button>

      <button
        className="btn btn-primary"
        style={{ marginTop: 16 }}
        disabled={!allComplete}
        onClick={onAnalyze}
      >
        🔍 Analyser le devis
      </button>
    </div>
  )
}
