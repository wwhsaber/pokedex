import { useState, useEffect } from 'react'
import { fetchTypeMatchup } from '../api'

export default function TypeChart({ types }) {
  const [matrix, setMatrix] = useState(null)

  useEffect(() => {
    fetchTypeMatchup().then(setMatrix)
  }, [])

  if (!matrix || !types.length) {
    return <div className="text-center py-20 text-stone-400">加载中...</div>
  }

  const mainTypes = types.filter(t => t.id <= 18)

  const factorCell = (factor) => {
    if (factor === 200) return <span className="text-emerald-600 font-semibold">2×</span>
    if (factor === 50) return <span className="text-red-400 font-semibold">½</span>
    if (factor === 0) return <span className="text-stone-300 font-semibold">0</span>
    return <span className="text-stone-200">·</span>
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h2 className="text-2xl font-medium tracking-tight text-stone-900 mb-1">属性克制表</h2>
      <p className="text-sm text-stone-500 mb-6">横向攻击 → 纵向防御</p>
      <div className="overflow-x-auto rounded-3xl border border-stone-200/70 bg-white/70">
        <table className="w-full">
          <thead>
            <tr>
              <th className="p-2 bg-stone-50/80 text-xs text-stone-500 font-medium sticky left-0 z-20 rounded-tl-3xl">攻╲防</th>
              {mainTypes.map((t, i) => (
                <th
                  key={t.id}
                  className={`p-1 text-[10px] font-bold text-white type-${t.identifier} ${i === mainTypes.length - 1 ? 'rounded-tr-3xl' : ''}`}
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 60 }}
                >
                  {t.name_zh || t.name_en}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mainTypes.map((atk, ri) => (
              <tr key={atk.id}>
                <td className={`p-1.5 text-xs font-bold text-white type-${atk.identifier} whitespace-nowrap sticky left-0 z-10 ${ri === mainTypes.length - 1 ? 'rounded-bl-3xl' : ''}`}>
                  {atk.name_zh || atk.name_en}
                </td>
                {mainTypes.map(def => {
                  const factor = matrix[atk.id]?.[def.id] ?? 100
                  return (
                    <td key={def.id} className="p-1.5 text-center text-xs border border-stone-100/50">
                      {factorCell(factor)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-5 text-xs text-stone-500">
        <span><span className="text-emerald-600 font-semibold">2×</span> 效果拔群</span>
        <span><span className="text-red-400 font-semibold">½</span> 效果不好</span>
        <span><span className="text-stone-300 font-semibold">0</span> 无效</span>
        <span><span className="text-stone-200">·</span> 普通</span>
      </div>
    </div>
  )
}
