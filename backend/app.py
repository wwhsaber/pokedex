"""FastAPI backend for the Pokédex web app."""
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from typing import Optional
import sqlite3

app = FastAPI(title="Pokédex API", version="1.0.0")

# CORS for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = Path(__file__).parent.parent / "data" / "pokedex.db"
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"


def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


# ── API Routes ─────────────────────────────────────────────────────────

@app.get("/api/pokemon")
def list_pokemon(
    search: Optional[str] = None,
    type_id: Optional[int] = None,
    generation: Optional[int] = None,
    legendary: Optional[bool] = None,
    mythical: Optional[bool] = None,
    sort: str = "id",
    limit: int = Query(default=36, le=200),
    offset: int = 0,
):
    conn = get_conn()
    conditions, params = ["1=1"], []

    if generation:
        conditions.append("p.generation = ?")
        params.append(generation)
    if legendary is not None:
        conditions.append("p.is_legendary = ?")
        params.append(1 if legendary else 0)
    if mythical is not None:
        conditions.append("p.is_mythical = ?")
        params.append(1 if mythical else 0)
    if search:
        conditions.append(
            "(p.name_en LIKE ? OR pn_zh.name LIKE ? OR CAST(p.id AS TEXT) LIKE ?)"
        )
        s = f"%{search}%"
        params.extend([s, s, f"%{search}%"])
    if type_id:
        conditions.append("pt.type_id = ?")
        params.append(type_id)

    where = " AND ".join(conditions)
    join_type = "LEFT JOIN pokemon_types pt ON pt.pokemon_id = p.id" if type_id else ""

    # Count
    count_sql = f"""
        SELECT COUNT(DISTINCT p.id) FROM pokemon p
        LEFT JOIN pokemon_names pn_zh ON pn_zh.pokemon_id = p.id AND pn_zh.language = 'zh-hans'
        {join_type} WHERE {where}
    """
    total = conn.execute(count_sql, params).fetchone()[0]

    # Sort
    order = "p.id"
    if sort == "name":
        order = "COALESCE(pn_zh.name, p.name_en)"
    elif sort == "gen":
        order = "p.generation, p.id"

    # Fetch
    data_sql = f"""
        SELECT p.id, p.name_en, pn_zh.name AS name_zh,
               p.sprite_artwork, p.generation,
               p.is_legendary, p.is_mythical, p.is_baby
        FROM pokemon p
        LEFT JOIN pokemon_names pn_zh ON pn_zh.pokemon_id = p.id AND pn_zh.language = 'zh-hans'
        {join_type}
        WHERE {where}
        GROUP BY p.id
        ORDER BY {order}
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    rows = conn.execute(data_sql, params).fetchall()

    # Attach types to each pokemon
    result = []
    for r in rows:
        p = dict(r)
        p["types"] = [
            dict(t)
            for t in conn.execute(
                """SELECT t.id, t.identifier, t.name_en, t.name_zh
                   FROM pokemon_types pt JOIN types t ON t.id = pt.type_id
                   WHERE pt.pokemon_id = ? ORDER BY pt.slot""",
                (p["id"],),
            ).fetchall()
        ]
        result.append(p)

    conn.close()
    return {"total": total, "limit": limit, "offset": offset, "pokemon": result}


@app.get("/api/pokemon/{pokemon_id}")
def get_pokemon(pokemon_id: int):
    conn = get_conn()

    p = conn.execute("SELECT * FROM pokemon WHERE id = ?", (pokemon_id,)).fetchone()
    if not p:
        raise HTTPException(404, "Pokemon not found")
    p = dict(p)

    # Chinese name
    zh = conn.execute(
        "SELECT name FROM pokemon_names WHERE pokemon_id=? AND language='zh-hans'",
        (pokemon_id,),
    ).fetchone()
    p["name_zh"] = zh["name"] if zh else p["name_en"]

    # Types
    p["types"] = [
        dict(t)
        for t in conn.execute(
            """SELECT t.id, t.identifier, t.name_en, t.name_zh
               FROM pokemon_types pt JOIN types t ON t.id = pt.type_id
               WHERE pt.pokemon_id = ? ORDER BY pt.slot""",
            (pokemon_id,),
        ).fetchall()
    ]

    # Stats
    p["stats"] = {
        r["stat_name"]: r["base_stat"]
        for r in conn.execute(
            "SELECT stat_name, base_stat FROM stats WHERE pokemon_id=?",
            (pokemon_id,),
        ).fetchall()
    }

    # Abilities
    p["abilities"] = [
        dict(a)
        for a in conn.execute(
            """SELECT a.id, a.identifier, a.name_en, a.name_zh,
                      a.short_effect_en, a.short_effect_zh, pa.is_hidden
               FROM pokemon_abilities pa JOIN abilities a ON a.id = pa.ability_id
               WHERE pa.pokemon_id = ? ORDER BY pa.slot""",
            (pokemon_id,),
        ).fetchall()
    ]

    # Moves grouped by version_group
    all_moves = [
        dict(m)
        for m in conn.execute(
            """SELECT m.id, m.identifier, m.name_en, m.name_zh,
                      m.type_id, m.power, m.accuracy, m.pp, m.damage_class,
                      m.short_effect_en, m.short_effect_zh,
                      pm.learn_method, pm.level_learned, pm.version_group
               FROM pokemon_moves pm JOIN moves m ON m.id = pm.move_id
               WHERE pm.pokemon_id = ?
               ORDER BY pm.version_group, pm.learn_method, pm.level_learned""",
            (pokemon_id,),
        ).fetchall()
    ]
    moves_by_version = {}
    for m in all_moves:
        vg = m.pop("version_group")
        if vg not in moves_by_version:
            moves_by_version[vg] = {}
        method = m.pop("learn_method")
        if method not in moves_by_version[vg]:
            moves_by_version[vg][method] = []
        moves_by_version[vg][method].append(m)
    p["moves_by_version"] = moves_by_version

    # Evolution chain - direct lookup by species_id
    sid = p.get("species_id") or pokemon_id
    chain_row = conn.execute(
        "SELECT DISTINCT chain_id FROM evolution_chains WHERE species_id = ? LIMIT 1",
        (sid,),
    ).fetchone()

    p["evolutions"] = []
    if chain_row:
        chain_id = chain_row["chain_id"]
        evos = conn.execute(
            """SELECT ec.*, p2.id as evo_pokemon_id, p2.name_en AS evo_name_en,
                      p2.sprite_artwork as evo_sprite,
                      pn2.name AS evo_name_zh
               FROM evolution_chains ec
               LEFT JOIN pokemon p2 ON p2.species_id = ec.species_id
               LEFT JOIN pokemon_names pn2 ON pn2.pokemon_id = p2.id AND pn2.language = 'zh-hans'
               WHERE ec.chain_id = ?""",
            (chain_id,),
        ).fetchall()
        evo_list = [dict(e) for e in evos]
        # Topological sort: build chain from base → final
        by_sid = {e["species_id"]: e for e in evo_list}
        base = [e for e in evo_list if not e.get("evolves_from_species_id") or e["evolves_from_species_id"] not in by_sid]
        if base:
            ordered = [base[0]]
            while True:
                cur_sid = ordered[-1]["species_id"]
                nxt = [e for e in evo_list if e.get("evolves_from_species_id") == cur_sid and e not in ordered]
                if not nxt:
                    break
                ordered.extend(nxt)
            p["evolutions"] = ordered
        else:
            p["evolutions"] = evo_list

    conn.close()
    return p


@app.get("/api/types")
def list_types():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM types ORDER BY id").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/api/type-matchup")
def type_matchup():
    """Full type effectiveness matrix."""
    conn = get_conn()
    rows = conn.execute(
        "SELECT damage_type_id, target_type_id, damage_factor FROM type_efficacy"
    ).fetchall()
    conn.close()
    matrix = {}
    for r in rows:
        dt, tt, df = r["damage_type_id"], r["target_type_id"], r["damage_factor"]
        if dt not in matrix:
            matrix[dt] = {}
        matrix[dt][tt] = df
    return matrix


@app.get("/api/stats")
def stats_summary():
    conn = get_conn()
    total = conn.execute("SELECT COUNT(*) FROM pokemon").fetchone()[0]
    gens = conn.execute(
        "SELECT generation, COUNT(*) as cnt FROM pokemon GROUP BY generation ORDER BY generation"
    ).fetchall()
    legendary = conn.execute(
        "SELECT COUNT(*) FROM pokemon WHERE is_legendary=1"
    ).fetchone()[0]
    mythical = conn.execute(
        "SELECT COUNT(*) FROM pokemon WHERE is_mythical=1"
    ).fetchone()[0]
    types = conn.execute("SELECT COUNT(*) FROM types").fetchone()[0]
    moves = conn.execute("SELECT COUNT(*) FROM moves").fetchone()[0]
    conn.close()
    return {
        "total": total,
        "generations": {r["generation"]: r["cnt"] for r in gens},
        "legendary": legendary,
        "mythical": mythical,
        "types": types,
        "moves": moves,
    }


# ── Serve frontend static files ────────────────────────────────────────

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve frontend files, fallback to index.html for SPA."""
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")
