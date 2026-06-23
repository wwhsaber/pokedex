export default function Header({ view, onHome, onTypes }) {
  return (
    <header className="sticky top-0 z-50 bg-[#FAF7F0]/80 backdrop-blur-md border-b border-stone-200/70">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onHome}>
          <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[#FAF7F0]" />
          </div>
          <h1 className="text-lg font-medium tracking-tight text-stone-900">宝可梦图鉴</h1>
        </div>
        <nav className="flex gap-1.5">
          <button
            onClick={onHome}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              view === 'list'
                ? 'bg-stone-900 text-stone-50'
                : 'border border-stone-200/70 bg-white/60 text-stone-600 hover:bg-white'
            }`}
          >
            图鉴
          </button>
          <button
            onClick={onTypes}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              view === 'types'
                ? 'bg-stone-900 text-stone-50'
                : 'border border-stone-200/70 bg-white/60 text-stone-600 hover:bg-white'
            }`}
          >
            属性克制
          </button>
        </nav>
      </div>
    </header>
  )
}
