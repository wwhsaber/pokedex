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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索宝可梦（名称/编号）..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => onSearch(input)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-200/70 bg-white/70
                         focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent
                         text-sm text-stone-900 placeholder:text-stone-400"
            />
            <svg className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilter(e.target.value)}
          className="py-2.5 px-3 rounded-2xl border border-stone-200/70 bg-white/70 text-sm text-stone-700
                     focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="">全部属性</option>
          {types.map(t => (
            <option key={t.id} value={t.id}>{t.name_zh || t.name_en}</option>
          ))}
        </select>
        <select
          value={genFilter}
          onChange={(e) => onGenFilter(e.target.value)}
          className="py-2.5 px-3 rounded-2xl border border-stone-200/70 bg-white/70 text-sm text-stone-700
                     focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="">全部世代</option>
          {Object.entries(genNames).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>
      <div className="mt-3 text-sm text-stone-500">
        共 <span className="font-medium text-stone-700">{total}</span> 只宝可梦
      </div>
    </div>
  )
}
