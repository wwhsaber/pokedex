import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import SearchFilters from './components/SearchFilters'
import PokemonGrid from './components/PokemonGrid'
import PokemonDetail from './components/PokemonDetail'
import TypeChart from './components/TypeChart'
import { fetchPokemon, fetchTypes, fetchPokemonDetail } from './api'

const GEN_NAMES = {
  1: '第一世代 · 关都', 2: '第二世代 · 城都', 3: '第三世代 · 丰缘',
  4: '第四世代 · 神奥', 5: '第五世代 · 合众', 6: '第六世代 · 卡洛斯',
  7: '第七世代 · 阿罗拉', 8: '第八世代 · 伽勒尔', 9: '第九世代 · 帕底亚',
}

export default function App() {
  const [view, setView] = useState('list') // 'list' | 'types'
  const [pokemon, setPokemon] = useState([])
  const [total, setTotal] = useState(0)
  const [types, setTypes] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [genFilter, setGenFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const limit = 36

  // Load types on mount
  useEffect(() => {
    fetchTypes().then(setTypes)
  }, [])

  // Load pokemon list
  const loadPokemon = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchPokemon({
        search, type_id: typeFilter, generation: genFilter, limit, offset
      })
      setPokemon(data.pokemon)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, genFilter, offset])

  useEffect(() => {
    if (view === 'list') loadPokemon()
  }, [view, loadPokemon])

  // Open detail
  const openDetail = async (id) => {
    setDetailLoading(true)
    try {
      const data = await fetchPokemonDetail(id)
      setDetail(data)
    } finally {
      setDetailLoading(false)
    }
  }

  // Search handler (debounced)
  const handleSearch = (val) => {
    setSearch(val)
    setOffset(0)
  }

  const handleTypeFilter = (val) => {
    setTypeFilter(val)
    setOffset(0)
  }

  const handleGenFilter = (val) => {
    setGenFilter(val)
    setOffset(0)
  }

  const goHome = () => {
    setView('list')
    setOffset(0)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header view={view} onHome={goHome} onTypes={() => setView('types')} />

      {view === 'list' && (
        <>
          <SearchFilters
            search={search}
            types={types}
            typeFilter={typeFilter}
            genFilter={genFilter}
            total={total}
            onSearch={handleSearch}
            onTypeFilter={handleTypeFilter}
            onGenFilter={handleGenFilter}
            genNames={GEN_NAMES}
          />
          <PokemonGrid
            pokemon={pokemon}
            loading={loading}
            total={total}
            offset={offset}
            limit={limit}
            onPageChange={setOffset}
            onCardClick={openDetail}
          />
        </>
      )}

      {view === 'types' && <TypeChart types={types} />}

      {detail && (
        <PokemonDetail
          pokemon={detail}
          types={types}
          loading={detailLoading}
          onClose={() => setDetail(null)}
          onPokemonClick={(id) => openDetail(id)}
        />
      )}
    </div>
  )
}
