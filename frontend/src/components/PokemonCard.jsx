export default function PokemonCard({ pokemon, onClick }) {
  const p = pokemon
  const types = (p.types || []).map(t => (
    <span key={t.id} className={`type-badge type-${t.identifier}`}>
      {t.name_zh || t.name_en}
    </span>
  ))

  const flags = []
  if (p.is_legendary) flags.push(<span key="l" className="text-yellow-500 text-xs">★</span>)
  if (p.is_mythical) flags.push(<span key="m" className="text-purple-500 text-xs">◆</span>)

  return (
    <div
      className="pokemon-card bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer overflow-hidden"
      onClick={() => onClick(p.id)}
    >
      <div className="relative bg-gradient-to-b from-gray-50 to-white p-4 pb-2 flex justify-center">
        <img
          src={p.sprite_artwork || ''}
          alt={p.name_en}
          className="w-28 h-28 object-contain"
          loading="lazy"
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <span className="absolute top-2 right-3 text-xs font-mono text-gray-300">
          #{String(p.id).padStart(4, '0')}
        </span>
        {flags.length > 0 && (
          <div className="absolute top-2 left-3 flex gap-1">{flags}</div>
        )}
      </div>
      <div className="px-4 pb-4 text-center">
        <div className="font-bold text-gray-800 text-sm">{p.name_zh || p.name_en}</div>
        <div className="text-xs text-gray-400 mb-2">{p.name_en}</div>
        <div className="flex justify-center gap-1">{types}</div>
      </div>
    </div>
  )
}
