export default function Header({ view, onHome, onTypes }) {
  return (
    <header className="bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onHome}>
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <div className="w-6 h-6 bg-red-500 rounded-full border-4 border-white" />
          </div>
          <h1 className="text-xl font-bold tracking-wide">宝可梦图鉴 Pokédex</h1>
        </div>
        <nav className="flex gap-2">
          <button
            onClick={onHome}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              view === 'list' ? 'bg-white text-red-600' : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            图鉴
          </button>
          <button
            onClick={onTypes}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              view === 'types' ? 'bg-white text-red-600' : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            属性克制
          </button>
        </nav>
      </div>
    </header>
  )
}
