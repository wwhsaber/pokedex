import { useState, useEffect } from 'react'

const GENERATION_ORDER = [
  'generation-i', 'generation-ii', 'generation-iii', 'generation-iv',
  'generation-v', 'generation-vi', 'generation-vii', 'generation-viii', 'generation-ix'
]

const GEN_NAMES = {
  'generation-i': '第一世代', 'generation-ii': '第二世代', 'generation-iii': '第三世代',
  'generation-iv': '第四世代', 'generation-v': '第五世代', 'generation-vi': '第六世代',
  'generation-vii': '第七世代', 'generation-viii': '第八世代', 'generation-ix': '第九世代'
}

const REGION_NAMES = {
  'national': '全国', 'kanto': '关都', 'johto': '城都', 'hoenn': '丰缘',
  'sinnoh': '神奥', 'unova': '合众', 'kalos': '卡洛斯', 'alola': '阿罗拉',
  'galar': '伽勒尔', 'paldea': '帕底亚', 'hisui': '洗翠'
}

const POKEDEX_NAMES = {
  'national': '全国图鉴', 'kanto': '关都图鉴', 'original-johto': '城都图鉴(初)',
  'hoenn': '丰缘图鉴', 'original-sinnoh': '神奥图鉴(初)', 'extended-sinnoh': '神奥图鉴(扩展)',
  'original-unova': '合众图鉴(初)', 'updated-unova': '合众图鉴(更新)',
  'kalos-central': '卡洛斯中央', 'kalos-coastal': '卡洛斯海岸', 'kalos-mountain': '卡洛斯山岳',
  'original-alola': '阿罗拉图鉴(初)', 'updated-alola': '阿罗拉图鉴(更新)',
  'galar': '伽勒尔图鉴', 'hisui': '洗翠图鉴', 'paldea': '帕底亚图鉴'
}

export function VersionSpriteGallery({ pokemonId }) {
  const [sprites, setSprites] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeGen, setActiveGen] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/pokemon/${pokemonId}/version-sprites`)
      .then(r => r.json())
      .then(data => {
        setSprites(data)
        if (data.length > 0) {
          setActiveGen(data[0].generation)
        }
      })
      .catch(() => setSprites([]))
      .finally(() => setLoading(false))
  }, [pokemonId])

  if (loading) return <div className="text-stone-400 text-sm py-4">加载中...</div>
  if (!sprites.length) return <div className="text-stone-400 text-sm py-4">暂无版本精灵图</div>

  // Group by generation
  const grouped = {}
  sprites.forEach(s => {
    if (!grouped[s.generation]) grouped[s.generation] = []
    grouped[s.generation].push(s)
  })

  const availableGens = GENERATION_ORDER.filter(g => grouped[g])

  return (
    <div className="space-y-4">
      {/* Generation tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {availableGens.map(gen => (
          <button
            key={gen}
            onClick={() => setActiveGen(gen)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
              activeGen === gen
                ? 'bg-stone-800 text-white'
                : 'text-stone-500 hover:bg-stone-100'
            }`}
          >
            {GEN_NAMES[gen] || gen}
          </button>
        ))}
      </div>

      {/* Sprites grid */}
      {activeGen && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {grouped[activeGen]?.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-stone-100 text-center">
              <div className="text-xs text-stone-500 mb-2">{s.version_group}</div>
              <div className="flex gap-2 justify-center">
                {s.sprite_front && (
                  <div>
                    <img src={s.sprite_front} alt="front" className="w-16 h-16 mx-auto" />
                    <div className="text-[10px] text-stone-400">正面</div>
                  </div>
                )}
                {s.sprite_back && (
                  <div>
                    <img src={s.sprite_back} alt="back" className="w-16 h-16 mx-auto" />
                    <div className="text-[10px] text-stone-400">背面</div>
                  </div>
                )}
              </div>
              {s.sprite_shiny_front && (
                <div className="flex gap-2 justify-center mt-2">
                  <div>
                    <img src={s.sprite_shiny_front} alt="shiny front" className="w-16 h-16 mx-auto" />
                    <div className="text-[10px] text-amber-400">异色</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function FlavorTextSection({ pokemonId }) {
  const [texts, setTexts] = useState([])
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState('zh-hans')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/pokemon/${pokemonId}/flavor-texts?language=${lang}`)
      .then(r => r.json())
      .then(setTexts)
      .catch(() => setTexts([]))
      .finally(() => setLoading(false))
  }, [pokemonId, lang])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold text-stone-800">图鉴描述</h3>
        <div className="flex gap-1">
          {['zh-hans', 'en'].map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                lang === l ? 'bg-stone-200 text-stone-700' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              {l === 'zh-hans' ? '中文' : 'English'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-stone-400 text-sm py-4">加载中...</div>
      ) : (
        <div className="grid gap-2">
          {texts.map((t, i) => (
            <div key={i} className="bg-stone-50 rounded-xl p-3">
              <div className="text-xs text-stone-400 mb-1">{t.version}</div>
              <div className="text-sm text-stone-700 leading-relaxed">{t.flavor_text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function PokedexNumbersSection({ pokemonId }) {
  const [numbers, setNumbers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/pokemon/${pokemonId}/pokedex-numbers`)
      .then(r => r.json())
      .then(setNumbers)
      .catch(() => setNumbers([]))
      .finally(() => setLoading(false))
  }, [pokemonId])

  if (loading) return <div className="text-stone-400 text-sm py-4">加载中...</div>
  if (!numbers.length) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-stone-800">地区图鉴编号</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {numbers.map((n, i) => (
          <div key={i} className="flex items-center justify-between bg-stone-50 rounded-xl px-3 py-2">
            <span className="text-xs text-stone-500">{POKEDEX_NAMES[n.pokedex] || n.pokedex}</span>
            <span className="text-sm font-medium text-stone-800">#{n.entry_number}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AnimeArchiveSection({ pokemonId }) {
  const [anime, setAnime] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/pokemon/${pokemonId}/anime`)
      .then(r => r.json())
      .then(setAnime)
      .catch(() => setAnime(null))
      .finally(() => setLoading(false))
  }, [pokemonId])

  if (loading) return <div className="text-stone-400 text-sm py-4">加载中...</div>
  if (!anime) return null

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-500 text-lg">📺</span>
        <h3 className="text-sm font-semibold text-amber-800">动画档案</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs text-amber-600">首次登场</div>
            <div className="text-sm font-medium text-amber-900">
              {anime.first_appearance_cn || anime.first_appearance}
            </div>
          </div>
          {anime.episode_count && (
            <div>
              <div className="text-xs text-amber-600">出场集数</div>
              <div className="text-sm font-medium text-amber-900">{anime.episode_count} 集</div>
            </div>
          )}
        </div>

        {anime.notable_trainer && anime.notable_trainer !== '无' && (
          <div>
            <div className="text-xs text-amber-600">知名训练家</div>
            <div className="text-sm font-medium text-amber-900">{anime.notable_trainer}</div>
          </div>
        )}

        {anime.notable_scene && (
          <div>
            <div className="text-xs text-amber-600">经典场景</div>
            <div className="text-sm text-amber-800">{anime.notable_scene}</div>
          </div>
        )}

        {anime.notes && (
          <div className="text-xs text-amber-600 bg-amber-100/50 rounded-lg p-2">
            {anime.notes}
          </div>
        )}
      </div>
    </div>
  )
}
