import PokemonCard from './PokemonCard'

export default function PokemonGrid({ pokemon, loading, total, offset, limit, onPageChange, onCardClick }) {
  const pages = Math.ceil(total / limit)
  const current = Math.floor(offset / limit) + 1

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-stone-200/40 bg-[#FFFCF7]/40 overflow-hidden">
              <div className="h-36 bg-stone-100/40 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-3.5 bg-stone-100/60 rounded-full animate-pulse" />
                <div className="h-2.5 bg-stone-100/60 rounded-full animate-pulse w-2/3 mx-auto" />
                <div className="flex justify-center gap-1">
                  <div className="h-4 w-10 bg-stone-100/60 rounded-full animate-pulse" />
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
      <div className="text-center py-20 text-stone-400 text-sm">
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
        className={`min-w-[28px] h-7 rounded-full text-[13px] transition-colors duration-150 ${
          i === current
            ? 'text-stone-800 font-medium'
            : 'text-stone-400 hover:text-stone-600'
        }`}
      >
        {i}
      </button>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {pokemon.map(p => (
          <PokemonCard key={p.id} pokemon={p} onClick={onCardClick} />
        ))}
      </div>
      {pages > 1 && (
        <div className="flex justify-center items-center gap-0.5 mt-8">
          {current > 1 && (
            <button
              onClick={() => onPageChange((current - 2) * limit)}
              className="w-7 h-7 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100/60 transition-colors duration-150 text-sm"
            >
              ‹
            </button>
          )}
          {pageButtons}
          {current < pages && (
            <button
              onClick={() => onPageChange(current * limit)}
              className="w-7 h-7 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100/60 transition-colors duration-150 text-sm"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  )
}
