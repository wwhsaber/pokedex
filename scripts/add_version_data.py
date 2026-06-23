#!/usr/bin/env python3
"""Add version-specific data tables: sprites, flavor texts, pokedex numbers, anime archives."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "pokedex.db"


def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def add_version_tables():
    """Create new tables for version-specific data."""
    conn = get_conn()
    conn.executescript("""
    -- Version-specific sprites (19 version groups)
    CREATE TABLE IF NOT EXISTS pokemon_version_sprites (
        pokemon_id      INTEGER NOT NULL,
        version_group   TEXT NOT NULL,
        generation      TEXT,
        sprite_front    TEXT,
        sprite_back     TEXT,
        sprite_shiny_front TEXT,
        sprite_shiny_back  TEXT,
        PRIMARY KEY (pokemon_id, version_group),
        FOREIGN KEY (pokemon_id) REFERENCES pokemon(id)
    );

    -- Version-specific flavor texts (pokedex descriptions)
    CREATE TABLE IF NOT EXISTS pokemon_flavor_texts (
        pokemon_id  INTEGER NOT NULL,
        version     TEXT NOT NULL,
        language    TEXT NOT NULL,
        flavor_text TEXT,
        PRIMARY KEY (pokemon_id, version, language),
        FOREIGN KEY (pokemon_id) REFERENCES pokemon(id)
    );

    -- Regional pokedex numbers
    CREATE TABLE IF NOT EXISTS pokemon_pokedex_numbers (
        pokemon_id  INTEGER NOT NULL,
        pokedex     TEXT NOT NULL,
        entry_number INTEGER NOT NULL,
        PRIMARY KEY (pokemon_id, pokedex),
        FOREIGN KEY (pokemon_id) REFERENCES pokemon(id)
    );

    -- Anime archives (manually curated)
    CREATE TABLE IF NOT EXISTS anime_archives (
        pokemon_id      INTEGER NOT NULL,
        first_appearance TEXT,      -- e.g. "EP001"
        first_appearance_cn TEXT,   -- e.g. "第1集"
        notable_trainer   TEXT,     -- e.g. "小智"
        notable_scene     TEXT,     -- e.g. "雷丘对战"
        episode_count     INTEGER,  -- appearances
        notes           TEXT,
        PRIMARY KEY (pokemon_id),
        FOREIGN KEY (pokemon_id) REFERENCES pokemon(id)
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_version_sprites_pokemon ON pokemon_version_sprites(pokemon_id);
    CREATE INDEX IF NOT EXISTS idx_flavor_texts_pokemon ON pokemon_flavor_texts(pokemon_id);
    CREATE INDEX IF NOT EXISTS idx_pokedex_numbers_pokemon ON pokemon_pokedex_numbers(pokemon_id);
    """)
    conn.commit()
    conn.close()
    print("✓ Version tables created")


if __name__ == "__main__":
    add_version_tables()
