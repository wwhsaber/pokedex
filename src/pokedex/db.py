"""Database schema and operations for the Pokédex."""
import sqlite3
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent.parent.parent / "data" / "pokedex.db"


def get_db_path() -> Path:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return DB_PATH


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(get_db_path()))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create all tables."""
    conn = get_conn()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS pokemon (
        id              INTEGER PRIMARY KEY,
        species_id      INTEGER NOT NULL,
        identifier      TEXT NOT NULL,
        height          INTEGER,        -- dm
        weight          INTEGER,        -- hg
        base_experience INTEGER,
        generation      INTEGER,
        capture_rate    INTEGER,
        base_happiness  INTEGER,
        growth_rate     TEXT,
        color           TEXT,
        shape           TEXT,
        habitat         TEXT,
        is_baby         INTEGER DEFAULT 0,
        is_legendary    INTEGER DEFAULT 0,
        is_mythical     INTEGER DEFAULT 0,
        -- English fallback
        name_en         TEXT,
        genus_en        TEXT,
        genus_zh        TEXT,
        flavor_en       TEXT,
        flavor_zh       TEXT,
        -- sprites
        sprite_default  TEXT,
        sprite_shiny    TEXT,
        sprite_artwork  TEXT
    );

    CREATE TABLE IF NOT EXISTS pokemon_names (
        pokemon_id  INTEGER NOT NULL,
        language    TEXT NOT NULL,       -- 'zh-hans', 'en', 'ja', etc.
        name        TEXT NOT NULL,
        PRIMARY KEY (pokemon_id, language),
        FOREIGN KEY (pokemon_id) REFERENCES pokemon(id)
    );

    CREATE TABLE IF NOT EXISTS types (
        id          INTEGER PRIMARY KEY,
        identifier  TEXT NOT NULL,
        name_en     TEXT,
        name_zh     TEXT
    );

    CREATE TABLE IF NOT EXISTS type_names (
        type_id     INTEGER NOT NULL,
        language    TEXT NOT NULL,
        name        TEXT NOT NULL,
        PRIMARY KEY (type_id, language),
        FOREIGN KEY (type_id) REFERENCES types(id)
    );

    CREATE TABLE IF NOT EXISTS type_efficacy (
        damage_type_id  INTEGER NOT NULL,
        target_type_id  INTEGER NOT NULL,
        damage_factor   INTEGER NOT NULL,  -- 0, 50, 100, 200
        PRIMARY KEY (damage_type_id, target_type_id),
        FOREIGN KEY (damage_type_id) REFERENCES types(id),
        FOREIGN KEY (target_type_id) REFERENCES types(id)
    );

    CREATE TABLE IF NOT EXISTS pokemon_types (
        pokemon_id  INTEGER NOT NULL,
        type_id     INTEGER NOT NULL,
        slot        INTEGER NOT NULL,     -- 1 = primary, 2 = secondary
        PRIMARY KEY (pokemon_id, type_id),
        FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
        FOREIGN KEY (type_id) REFERENCES types(id)
    );

    CREATE TABLE IF NOT EXISTS abilities (
        id              INTEGER PRIMARY KEY,
        identifier      TEXT NOT NULL,
        name_en         TEXT,
        name_zh         TEXT,
        effect_en       TEXT,
        effect_zh       TEXT,
        short_effect_en TEXT,
        short_effect_zh TEXT
    );

    CREATE TABLE IF NOT EXISTS ability_names (
        ability_id  INTEGER NOT NULL,
        language    TEXT NOT NULL,
        name        TEXT NOT NULL,
        PRIMARY KEY (ability_id, language),
        FOREIGN KEY (ability_id) REFERENCES abilities(id)
    );

    CREATE TABLE IF NOT EXISTS pokemon_abilities (
        pokemon_id  INTEGER NOT NULL,
        ability_id  INTEGER NOT NULL,
        slot        INTEGER NOT NULL,
        is_hidden   INTEGER DEFAULT 0,
        PRIMARY KEY (pokemon_id, ability_id),
        FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
        FOREIGN KEY (ability_id) REFERENCES abilities(id)
    );

    CREATE TABLE IF NOT EXISTS moves (
        id              INTEGER PRIMARY KEY,
        identifier      TEXT NOT NULL,
        type_id         INTEGER,
        power           INTEGER,
        accuracy        INTEGER,
        pp              INTEGER,
        priority        INTEGER DEFAULT 0,
        damage_class    TEXT,       -- 'physical', 'special', 'status'
        target          TEXT,
        name_en         TEXT,
        name_zh         TEXT,
        effect_en       TEXT,
        effect_zh       TEXT,
        short_effect_en TEXT,
        short_effect_zh TEXT,
        FOREIGN KEY (type_id) REFERENCES types(id)
    );

    CREATE TABLE IF NOT EXISTS move_names (
        move_id     INTEGER NOT NULL,
        language    TEXT NOT NULL,
        name        TEXT NOT NULL,
        PRIMARY KEY (move_id, language),
        FOREIGN KEY (move_id) REFERENCES moves(id)
    );

    CREATE TABLE IF NOT EXISTS pokemon_moves (
        pokemon_id      INTEGER NOT NULL,
        move_id         INTEGER NOT NULL,
        learn_method    TEXT NOT NULL,   -- 'level-up', 'machine', 'egg', 'tutor'
        level_learned  INTEGER DEFAULT 0,
        version_group  TEXT,
        PRIMARY KEY (pokemon_id, move_id, learn_method, version_group),
        FOREIGN KEY (pokemon_id) REFERENCES pokemon(id),
        FOREIGN KEY (move_id) REFERENCES moves(id)
    );

    CREATE TABLE IF NOT EXISTS evolution_chains (
        chain_id    INTEGER NOT NULL,
        pokemon_id  INTEGER NOT NULL,
        evolves_to_id INTEGER,
        species_id  INTEGER,
        evolves_from_species_id INTEGER,
        min_level   INTEGER,
        trigger     TEXT,
        item        TEXT,
        happiness   INTEGER,
        time_of_day TEXT,
        held_item   TEXT,
        PRIMARY KEY (chain_id, species_id)
    );

    CREATE TABLE IF NOT EXISTS stats (
        pokemon_id  INTEGER NOT NULL,
        stat_name   TEXT NOT NULL,       -- 'hp', 'attack', 'defense', etc.
        base_stat   INTEGER NOT NULL,
        effort      INTEGER DEFAULT 0,
        PRIMARY KEY (pokemon_id, stat_name),
        FOREIGN KEY (pokemon_id) REFERENCES pokemon(id)
    );

    -- Indexes for fast queries
    CREATE INDEX IF NOT EXISTS idx_pokemon_species ON pokemon(species_id);
    CREATE INDEX IF NOT EXISTS idx_pokemon_gen ON pokemon(generation);
    CREATE INDEX IF NOT EXISTS idx_pokemon_names_lang ON pokemon_names(language);
    CREATE INDEX IF NOT EXISTS idx_pokemon_types_pokemon ON pokemon_types(pokemon_id);
    CREATE INDEX IF NOT EXISTS idx_pokemon_types_type ON pokemon_types(type_id);
    CREATE INDEX IF NOT EXISTS idx_pokemon_abilities_pokemon ON pokemon_abilities(pokemon_id);
    CREATE INDEX IF NOT EXISTS idx_pokemon_moves_pokemon ON pokemon_moves(pokemon_id);
    CREATE INDEX IF NOT EXISTS idx_stats_pokemon ON stats(pokemon_id);
    """)
    conn.commit()
    conn.close()


# ── Query helpers ──────────────────────────────────────────────────────

def get_pokemon_list(
    generation: Optional[int] = None,
    type_id: Optional[int] = None,
    search: Optional[str] = None,
    legendary: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """Search/filter Pokemon with bilingual names."""
    conn = get_conn()
    conditions = ["1=1"]
    params = []

    if generation:
        conditions.append("p.generation = ?")
        params.append(generation)
    if legendary is not None:
        conditions.append("p.is_legendary = ?")
        params.append(1 if legendary else 0)
    if search:
        conditions.append(
            "(p.name_en LIKE ? OR pn_zh.name LIKE ? OR CAST(p.id AS TEXT) = ?)"
        )
        s = f"%{search}%"
        params.extend([s, s, search])
    if type_id:
        conditions.append("pt.type_id = ?")
        params.append(type_id)

    where = " AND ".join(conditions)
    sql = f"""
        SELECT p.id, p.species_id, p.name_en, pn_zh.name AS name_zh,
               p.sprite_artwork, p.generation, p.is_legendary, p.is_mythical
        FROM pokemon p
        LEFT JOIN pokemon_names pn_zh ON pn_zh.pokemon_id = p.id AND pn_zh.language = 'zh-hans'
        {"LEFT JOIN pokemon_types pt ON pt.pokemon_id = p.id" if type_id else ""}
        WHERE {where}
        GROUP BY p.id
        ORDER BY p.id
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_pokemon_count(
    generation: Optional[int] = None,
    type_id: Optional[int] = None,
    search: Optional[str] = None,
    legendary: Optional[bool] = None,
) -> int:
    conn = get_conn()
    conditions = ["1=1"]
    params = []
    if generation:
        conditions.append("p.generation = ?")
        params.append(generation)
    if legendary is not None:
        conditions.append("p.is_legendary = ?")
        params.append(1 if legendary else 0)
    if search:
        conditions.append(
            "(p.name_en LIKE ? OR pn_zh.name LIKE ? OR CAST(p.id AS TEXT) = ?)"
        )
        s = f"%{search}%"
        params.extend([s, s, search])
    if type_id:
        conditions.append("pt.type_id = ?")
        params.append(type_id)
    where = " AND ".join(conditions)
    sql = f"""
        SELECT COUNT(DISTINCT p.id)
        FROM pokemon p
        LEFT JOIN pokemon_names pn_zh ON pn_zh.pokemon_id = p.id AND pn_zh.language = 'zh-hans'
        {"LEFT JOIN pokemon_types pt ON pt.pokemon_id = p.id" if type_id else ""}
        WHERE {where}
    """
    count = conn.execute(sql, params).fetchone()[0]
    conn.close()
    return count


def get_pokemon_detail(pokemon_id: int) -> Optional[dict]:
    """Get full detail for a single Pokemon."""
    conn = get_conn()

    # Basic info
    p = conn.execute(
        "SELECT * FROM pokemon WHERE id = ?", (pokemon_id,)
    ).fetchone()
    if not p:
        conn.close()
        return None
    p = dict(p)

    # Chinese name
    zh = conn.execute(
        "SELECT name FROM pokemon_names WHERE pokemon_id=? AND language='zh-hans'",
        (pokemon_id,),
    ).fetchone()
    p["name_zh"] = zh["name"] if zh else p["name_en"]

    # Types
    p["types"] = [
        dict(r)
        for r in conn.execute(
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
        dict(r)
        for r in conn.execute(
            """SELECT a.id, a.identifier, a.name_en, a.name_zh, a.short_effect_en, a.short_effect_zh,
                      pa.is_hidden, pa.slot
               FROM pokemon_abilities pa JOIN abilities a ON a.id = pa.ability_id
               WHERE pa.pokemon_id = ? ORDER BY pa.slot""",
            (pokemon_id,),
        ).fetchall()
    ]

    # Moves (level-up only, top 20)
    p["moves_levelup"] = [
        dict(r)
        for r in conn.execute(
            """SELECT m.id, m.identifier, m.name_en, m.name_zh, m.type_id,
                      m.power, m.accuracy, m.damage_class, pm.level_learned
               FROM pokemon_moves pm JOIN moves m ON m.id = pm.move_id
               WHERE pm.pokemon_id = ? AND pm.learn_method = 'level-up'
               ORDER BY pm.level_learned
               LIMIT 30""",
            (pokemon_id,),
        ).fetchall()
    ]

    # Evolution chain
    p["evolutions"] = [
        dict(r)
        for r in conn.execute(
            """SELECT ec.*, p2.name_en AS evo_name_en,
                      pn2.name AS evo_name_zh
               FROM evolution_chains ec
               LEFT JOIN pokemon p2 ON p2.species_id = ec.pokemon_id
               LEFT JOIN pokemon_names pn2 ON pn2.pokemon_id = p2.id AND pn2.language = 'zh-Hans'
               WHERE ec.chain_id = (
                   SELECT chain_id FROM evolution_chains
                   WHERE pokemon_id = ? OR evolves_to_id = ?
                   LIMIT 1
               )
               ORDER BY ec.chain_id""",
            (pokemon_id, pokemon_id),
        ).fetchall()
    ]

    conn.close()
    return p


def get_types() -> list[dict]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM types ORDER BY id").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_type_matchups(type_id: int) -> dict:
    """Get type effectiveness for attacking and defending."""
    conn = get_conn()
    # Attacking: how effective this type is against others
    atk = conn.execute(
        """SELECT target_type_id, damage_factor FROM type_efficacy
           WHERE damage_type_id = ?""",
        (type_id,),
    ).fetchall()
    # Defending: how effective other types are against this type
    dfn = conn.execute(
        """SELECT damage_type_id, damage_factor FROM type_efficacy
           WHERE target_type_id = ?""",
        (type_id,),
    ).fetchall()
    conn.close()
    return {
        "attacking": {r["target_type_id"]: r["damage_factor"] for r in atk},
        "defending": {r["damage_type_id"]: r["damage_factor"] for r in dfn},
    }


def get_stats_summary() -> dict:
    conn = get_conn()
    total = conn.execute("SELECT COUNT(*) FROM pokemon").fetchone()[0]
    gens = conn.execute(
        "SELECT generation, COUNT(*) as cnt FROM pokemon GROUP BY generation ORDER BY generation"
    ).fetchall()
    types = conn.execute("SELECT COUNT(*) FROM types").fetchone()[0]
    abilities = conn.execute("SELECT COUNT(*) FROM abilities").fetchone()[0]
    moves = conn.execute("SELECT COUNT(*) FROM moves").fetchone()[0]
    conn.close()
    return {
        "total_pokemon": total,
        "generations": {r["generation"]: r["cnt"] for r in gens},
        "types": types,
        "abilities": abilities,
        "moves": moves,
    }
