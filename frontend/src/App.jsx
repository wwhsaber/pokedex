import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom'
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

function ListPage({ types, genNames }) {
  const navigate = useNavigate()
  const [pokemon, setPokemon] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [genFilter, setGenFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 36

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

  useEffect(() => { loadPokemon() }, [loadPokemon])

  const handleSearch = (val) => { setSearch(val); setOffset(0) }
  const handleTypeFilter = (val) => { setTypeFilter(val); setOffset(0) }
  const handleGenFilter = (val) => { setGenFilter(val); setOffset(0) }

  return (
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
        genNames={genNames}
      />
      <PokemonGrid
        pokemon={pokemon}
        loading={loading}
        total={total}
        offset={offset}
        limit={limit}
        onPageChange={setOffset}
        onCardClick={(id) => navigate(`/pokemon/${id}`)}
      />
    </>
  )
}

function DetailPage({ types }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pokemon, setPokemon] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setPokemon(null)
    fetchPokemonDetail(id).then(data => {
      setPokemon(data)
      setLoading(false)
    })
  }, [id])

  return (
    <PokemonDetail
      pokemon={pokemon}
      types={types}
      loading={loading}
      onClose={() => navigate('/')}
      onPokemonClick={(newId) => navigate(`/pokemon/${newId}`)}
    />
  )
}

function TypesPage({ types }) {
  return <TypeChart types={types} />
}

export default function App() {
  const [types, setTypes] = useState([])
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    fetchTypes().then(setTypes)
  }, [])

  const view = location.pathname === '/types' ? 'types' : 'list'

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        view={view}
        onHome={() => navigate('/')}
        onTypes={() => navigate('/types')}
      />
      <Routes>
        <Route path="/" element={<ListPage types={types} genNames={GEN_NAMES} />} />
        <Route path="/pokemon/:id" element={<DetailPage types={types} />} />
        <Route path="/types" element={<TypesPage types={types} />} />
      </Routes>
    </div>
  )
}
