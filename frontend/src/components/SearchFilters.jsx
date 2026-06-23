import { useState, useEffect } from 'react'

export default function SearchFilters({
  search, types, typeFilter, genFilter, total,
  onSearch, onTypeFilter, onGenFilter, genNames
}) {
  const [input, setInput] = useState(search)

  useEffect(() => { setInput(search) }, [search])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') onSearch(input)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索宝可梦（名称/编号）..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => onSearch(input)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200/50 bg-transparent
                         focus:outline-none focus:border-stone-300/70
                         text-[13px] text-stone-800 placeholder:text-stone-400/70
                         transition-colors duration-150"
            />
            <svg className="absolute left-3 top-[9px] w-3.5 h-3.5 text-stone-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilter(e.target.value)}
          className="py-2 px-3 rounded-xl border border-stone-200/50 bg-transparent text-[13px] text-stone-500 appearance-none
                     focus:outline-none focus:border-stone-300/70 transition-colors duration-150
                     pr-7 bg-no-repeat bg-[right_8px_center] bg-[length:10px]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a8a29e'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")` }}
        >
          <option value="">全部属性</option>
          {types.map(t => (
            <option key={t.id} value={t.id}>{t.name_zh || t.name_en}</option>
          ))}
        </select>
        <select
          value={genFilter}
          onChange={(e) => onGenFilter(e.target.value)}
          className="py-2 px-3 rounded-xl border border-stone-200/50 bg-transparent text-[13px] text-stone-500 appearance-none
                     focus:outline-none focus:border-stone-300/70 transition-colors duration-150
                     pr-7 bg-no-repeat bg-[right_8px_center] bg-[length:10px]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a8a29e'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")` }}
        >
          <option value="">全部世代</option>
          {Object.entries(genNames).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>
      <div className="mt-3 text-[12px] text-stone-400/70">
        {total} 只宝可梦
      </div>
    </div>
  )
}
