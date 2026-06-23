export default function Header({ view, onHome, onTypes }) {
  return (
    <header className="sticky top-0 z-50 bg-[#FAF7F0]/90 backdrop-blur-sm border-b border-stone-200/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={onHome}>
          <div className="w-7 h-7 rounded-full bg-stone-900 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FAF7F0]" />
          </div>
          <span className="text-[15px] font-medium text-stone-800 tracking-tight">宝可梦图鉴</span>
        </div>
        <nav className="flex gap-1">
          <button
            onClick={onHome}
            className={`px-3.5 py-1 rounded-full text-[13px] font-medium transition-colors duration-150 ${
              view === 'list'
                ? 'bg-stone-900 text-stone-50'
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100/60'
            }`}
          >
            图鉴
          </button>
          <button
            onClick={onTypes}
            className={`px-3.5 py-1 rounded-full text-[13px] font-medium transition-colors duration-150 ${
              view === 'types'
                ? 'bg-stone-900 text-stone-50'
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100/60'
            }`}
          >
            属性克制
          </button>
        </nav>
      </div>
    </header>
  )
}
