import PokemonCard from './PokemonCard'

export default function PokemonGrid({ pokemon, loading, total, offset, limit, onPageChange, onCardClick }) {
  const pages = Math.ceil(total / limit)
  const current = Math.floor(offset / limit) + 1

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-36 bg-gray-100 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3 mx-auto" />
                <div className="flex justify-center gap-1">
                  <div className="h-5 w-12 bg-gray-100 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!pokemon.length) {
    return (
      <div className="text-center py-20 text-gray-400 text-lg">
        没有找到宝可梦
      </div>
    )
  }

  const pageButtons = []
  for (let i = Math.max(1, current - 2); i <= Math.min(pages, current + 2); i++) {
    pageButtons.push(
      <button
        key={i}
        onClick={() => onPageChange((i - 1) * limit)}
        className={`px-3 py-1 rounded-lg text-sm ${
          i === current
            ? 'bg-red-500 text-white'
            : 'bg-white border hover:bg-gray-50'
        }`}
      >
        {i}
      </button>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {pokemon.map(p => (
          <PokemonCard key={p.id} pokemon={p} onClick={onCardClick} />
        ))}
      </div>
      {pages > 1 && (
        <div className="flex justify-center gap-1 mt-6">
          {current > 1 && (
            <button
              onClick={() => onPageChange((current - 2) * limit)}
              className="px-3 py-1 rounded-lg bg-white border text-sm hover:bg-gray-50"
            >
              ‹
            </button>
          )}
          {pageButtons}
          {current < pages && (
            <button
              onClick={() => onPageChange(current * limit)}
              className="px-3 py-1 rounded-lg bg-white border text-sm hover:bg-gray-50"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  )
}
