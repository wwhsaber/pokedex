import { useState } from 'react'
import { VersionSpriteGallery, FlavorTextSection, PokedexNumbersSection, AnimeArchiveSection } from './VersionData'

const STAT_COLORS = {
  hp: '#ef4444', attack: '#f59e0b', defense: '#eab308',
  'special-attack': '#6366f1', 'special-defense': '#22c55e', speed: '#ec4899'
}
const STAT_LABELS = {
  hp: 'HP', attack: '攻击', defense: '防御',
  'special-attack': '特攻', 'special-defense': '特防', speed: '速度'
}
const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed']
const STAT_MAX = 255

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
  'lets-go-pikachu-lets-go-eevee': "Let's Go 皮卡丘/伊布",
  'sword-shield': '剑/盾',
  'legends-arceus': '传说 阿尔宙斯',
  'scarlet-violet': '朱/紫',
  'brilliant-diamond-shining-pearl': '晶灿钻石/明亮珍珠',
}
const VERSION_ORDER = [
  'scarlet-violet', 'legends-arceus', 'sword-shield',
  'lets-go-pikachu-lets-go-eevee', 'ultra-sun-ultra-moon', 'sun-moon',
  'omega-ruby-alpha-sapphire', 'x-y', 'black-2-white-2', 'black-white',
  'heartgold-soulsilver', 'platinum', 'diamond-pearl',
  'firered-leafgreen', 'emerald', 'ruby-sapphire',
  'crystal', 'gold-silver', 'yellow', 'red-blue',
  'brilliant-diamond-shining-pearl',
]

const METHOD_NAMES = {
  'level-up': '升级学习',
  'machine': '技能机/学习装置',
  'egg': '蛋招式',
  'tutor': '招式教学',
}

function MoveTable({ moves, types }) {
  if (!moves || moves.length === 0) return <div className="text-stone-400 text-sm py-4">无数据</div>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-stone-200/70 text-xs text-stone-500 uppercase tracking-wider">
            <th className="py-2.5 pr-3 w-12">Lv.</th>
            <th className="py-2.5 pr-3">名称</th>
            <th className="py-2.5 pr-3">属性</th>
            <th className="py-2.5 pr-3 w-12">威力</th>
            <th className="py-2.5 pr-3 w-12">命中</th>
            <th className="py-2.5 pr-3 w-12">PP</th>
            <th className="py-2.5 pr-3 w-14">分类</th>
            <th className="py-2.5 min-w-[180px]">说明</th>
          </tr>
        </thead>
        <tbody>
          {moves.map(m => {
            const mtype = types.find(t => t.id === m.type_id)
            return (
              <tr key={`${m.id}-${m.level_learned}`} className="border-b border-stone-100/50 hover:bg-stone-50/50 transition-colors">
                <td className="py-2 pr-3 text-xs text-stone-400">{m.level_learned || '—'}</td>
                <td className="py-2 pr-3 text-sm font-medium text-stone-800">{m.name_zh || m.name_en}</td>
                <td className="py-2 pr-3">
                  {mtype && <span className={`type-badge type-${mtype.identifier}`} style={{ fontSize: 10 }}>{mtype.name_zh}</span>}
                </td>
                <td className="py-2 pr-3 text-xs text-stone-500">{m.power || '—'}</td>
                <td className="py-2 pr-3 text-xs text-stone-500">{m.accuracy || '—'}</td>
                <td className="py-2 pr-3 text-xs text-stone-400">{m.pp || '—'}</td>
                <td className="py-2 pr-3 text-xs text-stone-500">
                  {m.damage_class === 'physical' ? '物理' : m.damage_class === 'special' ? '特殊' : m.damage_class === 'status' ? '变化' : '—'}
                </td>
                <td className="py-2 text-xs text-stone-400 max-w-[280px]">{m.short_effect_zh || m.short_effect_en || ''}</td>
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

  if (!movesByVersion || Object.keys(movesByVersion).length === 0) return null

  const availableVersions = Object.keys(movesByVersion).sort((a, b) => {
    const ia = VERSION_ORDER.indexOf(a)
    const ib = VERSION_ORDER.indexOf(b)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

  const currentVersion = activeVersion || availableVersions[0]
  const versionMoves = movesByVersion[currentVersion] || {}
  const availableMethods = Object.keys(versionMoves)
  const currentMethod = availableMethods.includes(activeMethod) ? activeMethod : availableMethods[0]

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {availableVersions.map(vg => (
          <button
            key={vg}
            onClick={() => setActiveVersion(vg)}
            className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors duration-150 ${
              vg === currentVersion
                ? 'bg-stone-900 text-stone-50'
                : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100/50'
            }`}
          >
            {VERSION_NAMES[vg] || vg}
          </button>
        ))}
      </div>

      {availableMethods.length > 1 && (
        <div className="flex gap-1 mb-4">
          {availableMethods.map(method => (
            <button
              key={method}
              onClick={() => setActiveMethod(method)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] transition-colors duration-150 ${
                method === currentMethod
                  ? 'bg-stone-800 text-stone-50'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              {METHOD_NAMES[method] || method} ({versionMoves[method]?.length || 0})
            </button>
          ))}
        </div>
      )}

      <MoveTable moves={versionMoves[currentMethod]} types={types} />
    </div>
  )
}

export default function PokemonDetail({ pokemon: p, types, loading, onClose, onPokemonClick }) {
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-stone-200 rounded-full w-24" />
          <div className="h-48 bg-stone-100 rounded-3xl" />
          <div className="h-32 bg-stone-100 rounded-3xl" />
        </div>
      </div>
    )
  }

  if (!p) return null

  const typeBadges = (p.types || []).map(t => (
    <span key={t.id} className={`type-badge type-${t.identifier} text-sm px-4 py-1`}>
      {t.name_zh || t.name_en}
    </span>
  ))

  const totalStat = STAT_ORDER.reduce((sum, s) => sum + (p.stats?.[s] || 0), 0)

  const statBars = STAT_ORDER.map(s => {
    const val = p.stats?.[s] || 0
    const pct = Math.min(100, (val / STAT_MAX) * 100)
    return (
      <div key={s} className="flex items-center gap-3">
        <span className="w-12 text-xs text-stone-400 text-right font-medium">{STAT_LABELS[s]}</span>
        <span className="w-8 text-sm font-medium text-stone-700">{val}</span>
        <div className="flex-1 stat-bar-bg">
          <div className="stat-bar-fill" style={{ width: `${pct}%`, background: STAT_COLORS[s] }} />
        </div>
      </div>
    )
  })

  const abilities = (p.abilities || []).map(a => (
    <div key={a.id} className="text-sm">
      <span className="font-medium text-stone-800">{a.name_zh || a.name_en}</span>
      {a.is_hidden ? <span className="text-xs text-stone-400 ml-1.5">(隐藏特性)</span> : null}
      {(a.short_effect_zh || a.short_effect_en) && (
        <div className="text-xs text-stone-500 mt-0.5 leading-relaxed">{a.short_effect_zh || a.short_effect_en}</div>
      )}
    </div>
  ))

  // Evolution chain
  let evoSection = null
  if (p.evolutions && p.evolutions.length > 0) {
    const evoItems = p.evolutions.map((e, i) => {
      const arrow = i > 0 ? (
        <div key={`arrow-${i}`} className="flex flex-col items-center mx-1.5">
          <span className="text-stone-300">→</span>
          {e.min_level && <span className="text-[10px] text-stone-400">Lv.{e.min_level}</span>}
          {e.trigger === 'use-item' && e.item && <span className="text-[10px] text-stone-400">{e.item}</span>}
        </div>
      ) : null
      const isActive = e.species_id === p.species_id
      return (
        <div key={e.species_id || i} className="flex items-center">
          {arrow}
          <div
            className={`flex flex-col items-center ${isActive ? 'ring-1 ring-stone-300/60 rounded-2xl bg-stone-100/50 p-2' : 'p-2 rounded-2xl'} ${e.evo_pokemon_id ? 'cursor-pointer hover:bg-stone-100/40 transition-colors duration-150' : ''}`}
            onClick={() => e.evo_pokemon_id && onPokemonClick(e.evo_pokemon_id)}
          >
            {e.evo_sprite && <img src={e.evo_sprite} className="w-16 h-16 object-contain" alt="" />}
            <span className="text-xs font-medium text-stone-700 mt-1">{e.evo_name_zh || e.evo_name_en || '?'}</span>
          </div>
        </div>
      )
    })
    evoSection = (
      <div>
        <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500 mb-3">进化链</h3>
        <div className="flex items-center justify-center flex-wrap bg-stone-50/50 rounded-2xl p-5">{evoItems}</div>
      </div>
    )
  }

  const flags = []
  if (p.is_legendary) flags.push(<span key="l" className="bg-amber-50 text-amber-700 text-xs px-2.5 py-0.5 rounded-full border border-amber-200/50">★ 传说</span>)
  if (p.is_mythical) flags.push(<span key="m" className="bg-purple-50 text-purple-700 text-xs px-2.5 py-0.5 rounded-full border border-purple-200/50">◆ 幻之</span>)
  if (p.is_baby) flags.push(<span key="b" className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full border border-blue-200/50">幼年</span>)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-16">
      {/* Back */}
      <button
        onClick={onClose}
        className="mb-6 flex items-center gap-1 text-[13px] text-stone-400 hover:text-stone-600 transition-colors duration-150"
      >
        <span>←</span> 返回列表
      </button>

      {/* Header - Hero Section */}
      <div className="rounded-3xl border border-stone-200/70 bg-white/70 overflow-hidden mb-6">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Left: Large Sprite */}
            <div className="w-52 h-52 flex items-center justify-center flex-shrink-0">
              {p.sprite_artwork && <img src={p.sprite_artwork} className="w-full h-full object-contain drop-shadow-md" alt={p.name_en} />}
            </div>
            
            {/* Right: Info */}
            <div className="text-center md:text-left flex-1">
              <div className="text-xs font-mono text-stone-400 mb-1">#{String(p.id).padStart(4, '0')}</div>
              <h1 className="text-4xl font-medium tracking-tight text-stone-900 mb-1">{p.name_zh || p.name_en}</h1>
              <div className="text-sm text-stone-400 mb-2">{p.name_en}</div>
              {(p.genus_zh || p.genus_en) && <div className="text-sm text-stone-500 mb-3">「{p.genus_zh || p.genus_en}」</div>}
              
              <div className="flex gap-2 justify-center md:justify-start mb-3">{typeBadges}</div>
              {flags.length > 0 && <div className="flex gap-2 justify-center md:justify-start flex-wrap mb-3">{flags}</div>}
              
              {/* Quick Stats */}
              <div className="flex gap-6 text-xs text-stone-400 justify-center md:justify-start">
                <div className="text-center">
                  <div className="text-lg font-medium text-stone-700">{((p.height || 0) / 10).toFixed(1)}m</div>
                  <div>身高</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-medium text-stone-700">{((p.weight || 0) / 10).toFixed(1)}kg</div>
                  <div>体重</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-medium text-stone-700">{p.capture_rate ?? '—'}</div>
                  <div>捕获率</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-medium text-stone-700">{totalStat}</div>
                  <div>种族值</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Core Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {(p.flavor_zh || p.flavor_en) && (
            <div className="rounded-3xl border border-stone-200/70 bg-[#FFFCF7]/80 p-6 text-sm text-stone-600 italic leading-relaxed">
              "{p.flavor_zh || p.flavor_en}"
            </div>
          )}

          {/* Stats */}
          <div className="rounded-3xl border border-stone-200/70 bg-white/70 p-6">
            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500 mb-4">
              种族值 <span className="normal-case tracking-normal text-stone-400">· 合计 {totalStat}</span>
            </h3>
            <div className="space-y-2.5">{statBars}</div>
          </div>

          {/* Evolution */}
          {evoSection && (
            <div className="rounded-3xl border border-stone-200/70 bg-white/70 p-6">
              {evoSection}
            </div>
          )}

          {/* Moves */}
          {p.moves_by_version && Object.keys(p.moves_by_version).length > 0 && (
            <div className="rounded-3xl border border-stone-200/70 bg-white/70 p-6">
              <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500 mb-4">招式列表</h3>
              <MovesSection movesByVersion={p.moves_by_version} types={types} />
            </div>
          )}

          {/* Version Sprites Gallery */}
          <div className="rounded-3xl border border-stone-200/70 bg-white/70 p-6">
            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500 mb-4">
              历代精灵图
            </h3>
            <VersionSpriteGallery pokemonId={p.id} />
          </div>

          {/* Flavor Texts */}
          <div className="rounded-3xl border border-stone-200/70 bg-white/70 p-6">
            <FlavorTextSection pokemonId={p.id} />
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Anime Archive - Prominent Position */}
          <AnimeArchiveSection pokemonId={p.id} />

          {/* Abilities */}
          {abilities.length > 0 && (
            <div className="rounded-3xl border border-stone-200/70 bg-white/70 p-6">
              <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500 mb-3">特性</h3>
              <div className="space-y-3">{abilities}</div>
            </div>
          )}

          {/* Pokedex Numbers */}
          <div className="rounded-3xl border border-stone-200/70 bg-white/70 p-6">
            <PokedexNumbersSection pokemonId={p.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
