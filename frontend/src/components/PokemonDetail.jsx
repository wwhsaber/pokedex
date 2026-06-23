import { useState } from 'react'

const STAT_COLORS = {
  hp: '#ff5959', attack: '#f5ac78', defense: '#fae078',
  'special-attack': '#9db7f5', 'special-defense': '#a7db8d', speed: '#fa92b2'
}
const STAT_LABELS = {
  hp: 'HP', attack: '攻击', defense: '防御',
  'special-attack': '特攻', 'special-defense': '特防', speed: '速度'
}
const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']
const STAT_MAX = 255

// Version group display names (Chinese + English)
const VERSION_NAMES = {
  'red-blue': '红/蓝', 'yellow': '黄',
  'gold-silver': '金/银', 'crystal': '水晶',
  'ruby-sapphire': '红宝石/蓝宝石', 'emerald': '绿宝石',
  'firered-leafgreen': '火红/叶绿',
  'diamond-pearl': '钻石/珍珠', 'platinum': '白金',
  'heartgold-soulsilver': '心金/魂银',
  'black-white': '黑/白', 'black-2-white-2': '黑2/白2',
  'x-y': 'X/Y',
  'omega-ruby-alpha-sapphire': '终极红宝石/始源蓝宝石',
  'sun-moon': '日/月', 'ultra-sun-ultra-moon': '究极之日/究极之月',
  'lets-go-pikachu-lets-go-eevee': 'Let\'s Go 皮卡丘/伊布',
  'sword-shield': '剑/盾',
  'legends-arceus': '传说 阿尔宙斯',
  'scarlet-violet': '朱/紫',
}
const VERSION_ORDER = [
  'scarlet-violet', 'legends-arceus', 'sword-shield',
  'lets-go-pikachu-lets-go-eevee', 'ultra-sun-ultra-moon', 'sun-moon',
  'omega-ruby-alpha-sapphire', 'x-y', 'black-2-white-2', 'black-white',
  'heartgold-soulsilver', 'platinum', 'diamond-pearl',
  'firered-leafgreen', 'emerald', 'ruby-sapphire',
  'crystal', 'gold-silver', 'yellow', 'red-blue',
]

const METHOD_NAMES = {
  'level-up': '升级学习',
  'machine': '技能机/学习装置',
  'egg': '蛋招式',
  'tutor': '招式教学',
}

function MoveTable({ moves, types }) {
  if (!moves || moves.length === 0) return <div className="text-gray-400 text-sm py-2">无数据</div>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b-2 border-gray-100 text-xs text-gray-400">
            <th className="py-2 w-12">Lv.</th>
            <th className="py-2">名称</th>
            <th className="py-2">属性</th>
            <th className="py-2 w-12">威力</th>
            <th className="py-2 w-12">命中</th>
            <th className="py-2 w-12">PP</th>
            <th className="py-2 w-14">分类</th>
            <th className="py-2 min-w-[200px]">说明</th>
          </tr>
        </thead>
        <tbody>
          {moves.map(m => {
            const mtype = types.find(t => t.id === m.type_id)
            return (
              <tr key={`${m.id}-${m.level_learned}`} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-1.5 text-xs text-gray-500">{m.level_learned || '—'}</td>
                <td className="py-1.5 text-sm font-medium">{m.name_zh || m.name_en}</td>
                <td className="py-1.5">
                  {mtype && <span className={`type-badge type-${mtype.identifier}`} style={{ fontSize: 10 }}>{mtype.name_zh}</span>}
                </td>
                <td className="py-1.5 text-xs text-gray-600">{m.power || '—'}</td>
                <td className="py-1.5 text-xs text-gray-600">{m.accuracy || '—'}</td>
                <td className="py-1.5 text-xs text-gray-500">{m.pp || '—'}</td>
                <td className="py-1.5 text-xs text-gray-500">
                  {m.damage_class === 'physical' ? '物理' : m.damage_class === 'special' ? '特殊' : m.damage_class === 'status' ? '变化' : '—'}
                </td>
                <td className="py-1.5 text-xs text-gray-400 max-w-[300px]">{m.short_effect_zh || m.short_effect_en || ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MovesSection({ movesByVersion, types }) {
  const [activeVersion, setActiveVersion] = useState(null)
  const [activeMethod, setActiveMethod] = useState('level-up')

  if (!movesByVersion || Object.keys(movesByVersion).length === 0) {
    return null
  }

  // Sort versions by our defined order
  const availableVersions = Object.keys(movesByVersion).sort((a, b) => {
    const ia = VERSION_ORDER.indexOf(a)
    const ib = VERSION_ORDER.indexOf(b)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

  // Default to first (newest) version
  const currentVersion = activeVersion || availableVersions[0]
  const versionMoves = movesByVersion[currentVersion] || {}
  const availableMethods = Object.keys(versionMoves)

  // Auto-select a valid method if current one doesn't exist
  const currentMethod = availableMethods.includes(activeMethod) ? activeMethod : availableMethods[0]

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-700 mb-3">招式列表</h3>

      {/* Version tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {availableVersions.map(vg => (
          <button
            key={vg}
            onClick={() => setActiveVersion(vg)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              vg === currentVersion
                ? 'bg-red-500 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {VERSION_NAMES[vg] || vg}
          </button>
        ))}
      </div>

      {/* Method sub-tabs */}
      {availableMethods.length > 1 && (
        <div className="flex gap-1.5 mb-3">
          {availableMethods.map(method => (
            <button
              key={method}
              onClick={() => setActiveMethod(method)}
              className={`px-2.5 py-0.5 rounded-md text-xs transition-colors ${
                method === currentMethod
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {METHOD_NAMES[method] || method} ({versionMoves[method]?.length || 0})
            </button>
          ))}
        </div>
      )}

      {/* Move table */}
      <MoveTable moves={versionMoves[currentMethod]} types={types} />
    </div>
  )
}

export default function PokemonDetail({ pokemon: p, types, loading, onClose, onPokemonClick }) {
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!p) return null

  const typeBadges = (p.types || []).map(t => (
    <span key={t.id} className={`type-badge type-${t.identifier} text-base px-4 py-1`}>
      {t.name_zh || t.name_en}
    </span>
  ))

  const totalStat = STAT_ORDER.reduce((sum, s) => sum + (p.stats?.[s] || 0), 0)

  const statBars = STAT_ORDER.map(s => {
    const val = p.stats?.[s] || 0
    const pct = Math.min(100, (val / STAT_MAX) * 100)
    return (
      <div key={s} className="flex items-center gap-3">
        <span className="w-12 text-xs text-gray-500 text-right font-medium">{STAT_LABELS[s]}</span>
        <span className="w-8 text-sm font-bold text-gray-700">{val}</span>
        <div className="flex-1 stat-bar-bg">
          <div className="stat-bar-fill" style={{ width: `${pct}%`, background: STAT_COLORS[s] }} />
        </div>
      </div>
    )
  })

  const abilities = (p.abilities || []).map(a => (
    <div key={a.id} className="text-sm">
      <span className="font-medium">{a.name_zh || a.name_en}</span>
      {a.is_hidden ? <span className="text-xs text-gray-400 ml-1">(隐藏特性)</span> : null}
      {(a.short_effect_zh || a.short_effect_en) && (
        <div className="text-xs text-gray-500 mt-0.5">{a.short_effect_zh || a.short_effect_en}</div>
      )}
    </div>
  ))

  // Evolution chain
  let evoSection = null
  if (p.evolutions && p.evolutions.length > 0) {
    const evoItems = p.evolutions.map((e, i) => {
      const arrow = i > 0 ? (
        <div key={`arrow-${i}`} className="flex flex-col items-center mx-1">
          <span className="text-base text-gray-400">→</span>
          {e.min_level && <span className="text-[10px] text-gray-400">Lv.{e.min_level}</span>}
          {e.trigger === 'use-item' && e.item && <span className="text-[10px] text-gray-400">{e.item}</span>}
        </div>
      ) : null
      const isActive = e.species_id === p.species_id
      return (
        <div key={e.species_id || i} className="flex items-center">
          {arrow}
          <div
            className={`flex flex-col items-center ${isActive ? 'ring-2 ring-red-400 rounded-xl bg-red-50 p-2' : 'p-2'} ${e.evo_pokemon_id ? 'cursor-pointer hover:bg-gray-100 rounded-xl transition-colors' : ''}`}
            onClick={() => e.evo_pokemon_id && onPokemonClick(e.evo_pokemon_id)}
          >
            {e.evo_sprite && <img src={e.evo_sprite} className="w-16 h-16 object-contain" alt="" />}
            <span className="text-xs font-medium mt-1">{e.evo_name_zh || e.evo_name_en || '?'}</span>
          </div>
        </div>
      )
    })
    evoSection = (
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">进化链</h3>
        <div className="flex items-center justify-center flex-wrap bg-gray-50 rounded-xl p-4">{evoItems}</div>
      </div>
    )
  }

  const flags = []
  if (p.is_legendary) flags.push(<span key="l" className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">★ 传说</span>)
  if (p.is_mythical) flags.push(<span key="m" className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">◆ 幻之</span>)
  if (p.is_baby) flags.push(<span key="b" className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">幼年</span>)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-12">
      {/* Back button */}
      <button
        onClick={onClose}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <span className="text-lg">←</span> 返回列表
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="bg-gradient-to-br from-gray-50 to-white p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-48 h-48 flex items-center justify-center">
              {p.sprite_artwork && <img src={p.sprite_artwork} className="w-full h-full object-contain drop-shadow-lg" alt={p.name_en} />}
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="text-xs text-gray-400 font-mono">#{String(p.id).padStart(4, '0')}</div>
              <h1 className="text-3xl font-bold text-gray-800">{p.name_zh || p.name_en}</h1>
              <div className="text-sm text-gray-400 mb-2">{p.name_en}</div>
              {(p.genus_zh || p.genus_en) && <div className="text-sm text-gray-500 mb-2">「{p.genus_zh || p.genus_en}」</div>}
              <div className="flex gap-2 justify-center sm:justify-start mb-2">{typeBadges}</div>
              {flags.length > 0 && <div className="flex gap-2 justify-center sm:justify-start flex-wrap">{flags}</div>}
              <div className="flex gap-4 mt-3 text-xs text-gray-500 justify-center sm:justify-start">
                <span>身高: {((p.height || 0) / 10).toFixed(1)}m</span>
                <span>体重: {((p.weight || 0) / 10).toFixed(1)}kg</span>
                <span>捕获率: {p.capture_rate ?? '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Description */}
        {(p.flavor_zh || p.flavor_en) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-sm text-gray-600 italic">
            "{p.flavor_zh || p.flavor_en}"
          </div>
        )}

        {/* Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            种族值 <span className="text-gray-400 font-normal">合计 {totalStat}</span>
          </h3>
          <div className="space-y-2">{statBars}</div>
        </div>

        {/* Abilities */}
        {abilities.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-2">特性</h3>
            <div className="space-y-2">{abilities}</div>
          </div>
        )}

        {/* Evolution */}
        {evoSection && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            {evoSection}
          </div>
        )}

        {/* Moves by version */}
        {p.moves_by_version && Object.keys(p.moves_by_version).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <MovesSection movesByVersion={p.moves_by_version} types={types} />
          </div>
        )}
      </div>
    </div>
  )
}
