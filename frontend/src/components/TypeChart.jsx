import { useState, useEffect } from 'react'
import { fetchTypeMatchup } from '../api'

export default function TypeChart({ types }) {
  const [matrix, setMatrix] = useState(null)

  useEffect(() => {
    fetchTypeMatchup().then(setMatrix)
  }, [])

  if (!matrix || !types.length) {
    return <div className="text-center py-20 text-gray-400">加载中...</div>
  }

  const mainTypes = types.filter(t => t.id <= 18)

  const factorCell = (factor) => {
    if (factor === 200) return <span className="text-green-600 font-bold">2×</span>
    if (factor === 50) return <span className="text-red-500 font-bold">½</span>
    if (factor === 0) return <span className="text-gray-400 font-bold">0</span>
    return <span className="text-gray-300">1</span>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">属性克制表</h2>
      <p className="text-sm text-gray-500 mb-4">横向攻击 → 纵向防御</p>
      <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200">
        <table className="w-full bg-white">
          <thead>
            <tr>
              <th className="p-2 bg-gray-100 text-xs text-gray-500 sticky left-0 z-20">攻＼防</th>
              {mainTypes.map(t => (
                <th
                  key={t.id}
                  className={`p-1 text-[10px] font-bold text-white type-${t.identifier}`}
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 60 }}
                >
                  {t.name_zh || t.name_en}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mainTypes.map(atk => (
              <tr key={atk.id}>
                <td className={`p-1.5 text-xs font-bold text-white type-${atk.identifier} whitespace-nowrap sticky left-0 z-10`}>
                  {atk.name_zh || atk.name_en}
                </td>
                {mainTypes.map(def => {
                  const factor = matrix[atk.id]?.[def.id] ?? 100
                  return (
                    <td key={def.id} className="p-1 text-center text-xs border border-gray-100">
                      {factorCell(factor)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <span><span className="text-green-600 font-bold">2×</span> 效果拔群</span>
        <span><span className="text-red-500 font-bold">½</span> 效果不好</span>
        <span><span className="text-gray-400 font-bold">0</span> 无效</span>
        <span><span className="text-gray-300">1</span> 普通</span>
      </div>
    </div>
  )
}
