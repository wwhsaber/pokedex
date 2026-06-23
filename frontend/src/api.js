const API = '/api';

export async function fetchPokemon({ search, type_id, generation, limit = 36, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (search) params.set('search', search);
  if (type_id) params.set('type_id', type_id);
  if (generation) params.set('generation', generation);
  const res = await fetch(`${API}/pokemon?${params}`);
  return res.json();
}

export async function fetchPokemonDetail(id) {
  const res = await fetch(`${API}/pokemon/${id}`);
  return res.json();
}

export async function fetchTypes() {
  const res = await fetch(`${API}/types`);
  return res.json();
}

export async function fetchTypeMatchup() {
  const res = await fetch(`${API}/type-matchup`);
  return res.json();
}

export async function fetchStats() {
  const res = await fetch(`${API}/stats`);
  return res.json();
}
