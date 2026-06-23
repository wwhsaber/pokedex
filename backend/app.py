     1|"""FastAPI backend for the Pokédex web app."""
     2|from fastapi import FastAPI, Query, HTTPException
     3|from fastapi.middleware.cors import CORSMiddleware
     4|from fastapi.staticfiles import StaticFiles
     5|from fastapi.responses import FileResponse
     6|from pathlib import Path
     7|from typing import Optional
     8|import sqlite3
     9|
    10|app = FastAPI(title="Pokédex API", version="1.0.0")
    11|
    12|# CORS for dev
    13|app.add_middleware(
    14|    CORSMiddleware,
    15|    allow_origins=["*"],
    16|    allow_methods=["*"],
    17|    allow_headers=["*"],
    18|)
    19|
    20|DB_PATH = Path(__file__).parent.parent / "data" / "pokedex.db"
    21|FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
    22|
    23|
    24|def get_conn():
    25|    conn = sqlite3.connect(str(DB_PATH))
    26|    conn.row_factory = sqlite3.Row
    27|    return conn
    28|
    29|
    30|# ── API Routes ─────────────────────────────────────────────────────────
    31|
    32|@app.get("/api/pokemon")
    33|def list_pokemon(
    34|    search: Optional[str] = None,
    35|    type_id: Optional[int] = None,
    36|    generation: Optional[int] = None,
    37|    legendary: Optional[bool] = None,
    38|    mythical: Optional[bool] = None,
    39|    sort: str = "id",
    40|    limit: int = Query(default=36, le=200),
    41|    offset: int = 0,
    42|):
    43|    conn = get_conn()
    44|    conditions, params = ["1=1"], []
    45|
    46|    if generation:
    47|        conditions.append("p.generation = ?")
    48|        params.append(generation)
    49|    if legendary is not None:
    50|        conditions.append("p.is_legendary = ?")
    51|        params.append(1 if legendary else 0)
    52|    if mythical is not None:
    53|        conditions.append("p.is_mythical = ?")
    54|        params.append(1 if mythical else 0)
    55|    if search:
    56|        conditions.append(
    57|            "(p.name_en LIKE ? OR pn_zh.name LIKE ? OR CAST(p.id AS TEXT) LIKE ?)"
    58|        )
    59|        s = f"%{search}%"
    60|        params.extend([s, s, f"%{search}%"])
    61|    if type_id:
    62|        conditions.append("pt.type_id = ?")
    63|        params.append(type_id)
    64|
    65|    where = " AND ".join(conditions)
    66|    join_type = "LEFT JOIN pokemon_types pt ON pt.pokemon_id = p.id" if type_id else ""
    67|
    68|    # Count
    69|    count_sql = f"""
    70|        SELECT COUNT(DISTINCT p.id) FROM pokemon p
    71|        LEFT JOIN pokemon_names pn_zh ON pn_zh.pokemon_id = p.id AND pn_zh.language = 'zh-hans'
    72|        {join_type} WHERE {where}
    73|    """
    74|    total = conn.execute(count_sql, params).fetchone()[0]
    75|
    76|    # Sort
    77|    order = "p.id"
    78|    if sort == "name":
    79|        order = "COALESCE(pn_zh.name, p.name_en)"
    80|    elif sort == "gen":
    81|        order = "p.generation, p.id"
    82|
    83|    # Fetch
    84|    data_sql = f"""
    85|        SELECT p.id, p.name_en, pn_zh.name AS name_zh,
    86|               p.sprite_artwork, p.generation,
    87|               p.is_legendary, p.is_mythical, p.is_baby
    88|        FROM pokemon p
    89|        LEFT JOIN pokemon_names pn_zh ON pn_zh.pokemon_id = p.id AND pn_zh.language = 'zh-hans'
    90|        {join_type}
    91|        WHERE {where}
    92|        GROUP BY p.id
    93|        ORDER BY {order}
    94|        LIMIT ? OFFSET ?
    95|    """
    96|    params.extend([limit, offset])
    97|    rows = conn.execute(data_sql, params).fetchall()
    98|
    99|    # Attach types to each pokemon
   100|    result = []
   101|    for r in rows:
   102|        p = dict(r)
   103|        p["types"] = [
   104|            dict(t)
   105|            for t in conn.execute(
   106|                """SELECT t.id, t.identifier, t.name_en, t.name_zh
   107|                   FROM pokemon_types pt JOIN types t ON t.id = pt.type_id
   108|                   WHERE pt.pokemon_id = ? ORDER BY pt.slot""",
   109|                (p["id"],),
   110|            ).fetchall()
   111|        ]
   112|        result.append(p)
   113|
   114|    conn.close()
   115|    return {"total": total, "limit": limit, "offset": offset, "pokemon": result}
   116|
   117|
   118|@app.get("/api/pokemon/{pokemon_id}")
   119|def get_pokemon(pokemon_id: int):
   120|    conn = get_conn()
   121|
   122|    p = conn.execute("SELECT * FROM pokemon WHERE id = ?", (pokemon_id,)).fetchone()
   123|    if not p:
   124|        raise HTTPException(404, "Pokemon not found")
   125|    p = dict(p)
   126|
   127|    # Chinese name
   128|    zh = conn.execute(
   129|        "SELECT name FROM pokemon_names WHERE pokemon_id=? AND language='zh-hans'",
   130|        (pokemon_id,),
   131|    ).fetchone()
   132|    p["name_zh"] = zh["name"] if zh else p["name_en"]
   133|
   134|    # Types
   135|    p["types"] = [
   136|        dict(t)
   137|        for t in conn.execute(
   138|            """SELECT t.id, t.identifier, t.name_en, t.name_zh
   139|               FROM pokemon_types pt JOIN types t ON t.id = pt.type_id
   140|               WHERE pt.pokemon_id = ? ORDER BY pt.slot""",
   141|            (pokemon_id,),
   142|        ).fetchall()
   143|    ]
   144|
   145|    # Stats
   146|    p["stats"] = {
   147|        r["stat_name"]: r["base_stat"]
   148|        for r in conn.execute(
   149|            "SELECT stat_name, base_stat FROM stats WHERE pokemon_id=?",
   150|            (pokemon_id,),
   151|        ).fetchall()
   152|    }
   153|
   154|    # Abilities
   155|    p["abilities"] = [
   156|        dict(a)
   157|        for a in conn.execute(
   158|            """SELECT a.id, a.identifier, a.name_en, a.name_zh,
   159|                      a.short_effect_en, a.short_effect_zh, pa.is_hidden
   160|               FROM pokemon_abilities pa JOIN abilities a ON a.id = pa.ability_id
   161|               WHERE pa.pokemon_id = ? ORDER BY pa.slot""",
   162|            (pokemon_id,),
   163|        ).fetchall()
   164|    ]
   165|
   166|    # Moves grouped by version_group
   167|    all_moves = [
   168|        dict(m)
   169|        for m in conn.execute(
   170|            """SELECT m.id, m.identifier, m.name_en, m.name_zh,
   171|                      m.type_id, m.power, m.accuracy, m.pp, m.damage_class,
   172|                      m.short_effect_en, m.short_effect_zh,
   173|                      pm.learn_method, pm.level_learned, pm.version_group
   174|               FROM pokemon_moves pm JOIN moves m ON m.id = pm.move_id
   175|               WHERE pm.pokemon_id = ?
   176|               ORDER BY pm.version_group, pm.learn_method, pm.level_learned""",
   177|            (pokemon_id,),
   178|        ).fetchall()
   179|    ]
   180|    moves_by_version = {}
   181|    for m in all_moves:
   182|        vg = m.pop("version_group")
   183|        if vg not in moves_by_version:
   184|            moves_by_version[vg] = {}
   185|        method = m.pop("learn_method")
   186|        if method not in moves_by_version[vg]:
   187|            moves_by_version[vg][method] = []
   188|        moves_by_version[vg][method].append(m)
   189|    p["moves_by_version"] = moves_by_version
   190|
   191|    # Evolution chain - direct lookup by species_id
   192|    sid = p.get("species_id") or pokemon_id
   193|    chain_row = conn.execute(
   194|        "SELECT DISTINCT chain_id FROM evolution_chains WHERE species_id = ? LIMIT 1",
   195|        (sid,),
   196|    ).fetchone()
   197|
   198|    p["evolutions"] = []
   199|    if chain_row:
   200|        chain_id = chain_row["chain_id"]
   201|        evos = conn.execute(
   202|            """SELECT ec.*, p2.id as evo_pokemon_id, p2.name_en AS evo_name_en,
   203|                      p2.sprite_artwork as evo_sprite,
   204|                      pn2.name AS evo_name_zh
   205|               FROM evolution_chains ec
   206|               LEFT JOIN pokemon p2 ON p2.species_id = ec.species_id
   207|               LEFT JOIN pokemon_names pn2 ON pn2.pokemon_id = p2.id AND pn2.language = 'zh-hans'
   208|               WHERE ec.chain_id = ?""",
   209|            (chain_id,),
   210|        ).fetchall()
   211|        evo_list = [dict(e) for e in evos]
   212|        # Topological sort: build chain from base → final
   213|        by_sid = {e["species_id"]: e for e in evo_list}
   214|        base = [e for e in evo_list if not e.get("evolves_from_species_id") or e["evolves_from_species_id"] not in by_sid]
   215|        if base:
   216|            ordered = [base[0]]
   217|            while True:
   218|                cur_sid = ordered[-1]["species_id"]
   219|                nxt = [e for e in evo_list if e.get("evolves_from_species_id") == cur_sid and e not in ordered]
   220|                if not nxt:
   221|                    break
   222|                ordered.extend(nxt)
   223|            p["evolutions"] = ordered
   224|        else:
   225|            p["evolutions"] = evo_list
   226|
   227|    conn.close()
   228|    return p
   229|
   230|
   231|@app.get("/api/types")
   232|def list_types():
   233|    conn = get_conn()
   234|    rows = conn.execute("SELECT * FROM types ORDER BY id").fetchall()
   235|    conn.close()
   236|    return [dict(r) for r in rows]
   237|
   238|
   239|@app.get("/api/type-matchup")
   240|def type_matchup():
   241|    """Full type effectiveness matrix."""
   242|    conn = get_conn()
   243|    rows = conn.execute(
   244|        "SELECT damage_type_id, target_type_id, damage_factor FROM type_efficacy"
   245|    ).fetchall()
   246|    conn.close()
   247|    matrix = {}
   248|    for r in rows:
   249|        dt, tt, df = r["damage_type_id"], r["target_type_id"], r["damage_factor"]
   250|        if dt not in matrix:
   251|            matrix[dt] = {}
   252|        matrix[dt][tt] = df
   253|    return matrix
   254|
   255|
   256|@app.get("/api/stats")
   257|def stats_summary():
   258|    conn = get_conn()
   259|    total = conn.execute("SELECT COUNT(*) FROM pokemon").fetchone()[0]
   260|    gens = conn.execute(
   261|        "SELECT generation, COUNT(*) as cnt FROM pokemon GROUP BY generation ORDER BY generation"
   262|    ).fetchall()
   263|    legendary = conn.execute(
   264|        "SELECT COUNT(*) FROM pokemon WHERE is_legendary=1"
   265|    ).fetchone()[0]
   266|    mythical = conn.execute(
   267|        "SELECT COUNT(*) FROM pokemon WHERE is_mythical=1"
   268|    ).fetchone()[0]
   269|    types = conn.execute("SELECT COUNT(*) FROM types").fetchone()[0]
   270|    moves = conn.execute("SELECT COUNT(*) FROM moves").fetchone()[0]
   271|    conn.close()
   272|    return {
   273|        "total": total,
   274|        "generations": {r["generation"]: r["cnt"] for r in gens},
   275|        "legendary": legendary,
   276|        "mythical": mythical,
   277|        "types": types,
   278|        "moves": moves,
   279|    }
   280|
   281|

@app.get("/api/pokemon/{pokemon_id}/version-sprites")
def get_version_sprites(pokemon_id: int):
    """Get version-specific sprites for a Pokemon."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT version_group, generation, sprite_front, sprite_back,
               sprite_shiny_front, sprite_shiny_back
        FROM pokemon_version_sprites
        WHERE pokemon_id = ?
        ORDER BY generation, version_group
    """, (pokemon_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/pokemon/{pokemon_id}/flavor-texts")
def get_flavor_texts(pokemon_id: int, language: str = "zh-hans"):
    """Get version-specific flavor texts."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT version, flavor_text
        FROM pokemon_flavor_texts
        WHERE pokemon_id = ? AND language = ?
        ORDER BY version
    """, (pokemon_id, language)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/pokemon/{pokemon_id}/pokedex-numbers")
def get_pokedex_numbers(pokemon_id: int):
    """Get regional pokedex entry numbers."""
    conn = get_conn()
    rows = conn.execute("""
        SELECT pokedex, entry_number
        FROM pokemon_pokedex_numbers
        WHERE pokemon_id = ?
        ORDER BY pokedex
    """, (pokemon_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/pokemon/{pokemon_id}/anime")
def get_anime_archive(pokemon_id: int):
    """Get anime archive data for a Pokemon."""
    conn = get_conn()
    row = conn.execute("""
        SELECT * FROM anime_archives WHERE pokemon_id = ?
    """, (pokemon_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


   282|# ── Serve frontend static files ────────────────────────────────────────
   283|
   284|FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
   285|
   286|if FRONTEND_DIST.exists():
   287|    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="static-assets")
   288|
   289|    @app.get("/{full_path:path}")
   290|    async def serve_frontend(full_path: str):
   291|        """Serve frontend files, fallback to index.html for SPA."""
   292|        file_path = FRONTEND_DIST / full_path
   293|        if file_path.exists() and file_path.is_file():
   294|            return FileResponse(file_path)
   295|        return FileResponse(FRONTEND_DIST / "index.html")
   296|