#!/usr/bin/env python3
"""Fetch version-specific sprites, flavor texts, and pokedex numbers from PokeAPI.
   Optimized: only fetch first 151 (Gen 1) for initial testing.
"""

import json
import sqlite3
import time
import urllib.request
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).parent.parent / "data" / "pokedex.db"
BASE_URL = "https://pokeapi.co/api/v2"

# Generation mapping for version groups (flat, not nested by generation)
VERSION_GROUP_GEN = {
    "red-blue": ("generation-i", 1),
    "yellow": ("generation-i", 1),
    "gold-silver": ("generation-ii", 2),
    "crystal": ("generation-ii", 2),
    "ruby-sapphire": ("generation-iii", 3),
    "emerald": ("generation-iii", 3),
    "firered-leafgreen": ("generation-iii", 3),
    "diamond-pearl": ("generation-iv", 4),
    "platinum": ("generation-iv", 4),
    "heartgold-soulsilver": ("generation-iv", 4),
    "black-white": ("generation-v", 5),
    "black-2-white-2": ("generation-v", 5),
    "x-y": ("generation-vi", 6),
    "omega-ruby-alpha-sapphire": ("generation-vi", 6),
    "sun-moon": ("generation-vii", 7),
    "ultra-sun-ultra-moon": ("generation-vii", 7),
    "lets-go-pikachu-lets-go-eevee": ("generation-vii", 7),
    "sword-shield": ("generation-viii", 8),
    "brilliant-diamond-shining-pearl": ("generation-viii", 8),
    "legends-arceus": ("generation-viii", 8),
    "scarlet-violet": ("generation-ix", 9),
    "the-teal-mask": ("generation-ix", 9),
    "the-indigo-disk": ("generation-ix", 9),
}


def fetch(url: str) -> dict[str, Any]:
    """Fetch JSON with proper headers."""
    req = urllib.request.Request(url, headers={"User-Agent": "Pokedex/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read())


def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def fetch_version_sprites(pokemon_id: int, species_id: int) -> list[dict]:
    """Fetch all version-specific sprites for a Pokemon."""
    data = fetch(f"{BASE_URL}/pokemon/{pokemon_id}")
    sprites_data = data.get("sprites", {}).get("versions", {})
    results = []

    for gen_key, gen_data in sprites_data.items():
        if not isinstance(gen_data, dict):
            continue
        for vg_name, sprite_set in gen_data.items():
            if not isinstance(sprite_set, dict):
                continue

            gen_info = VERSION_GROUP_GEN.get(vg_name)
            if not gen_info:
                continue
            gen_name, gen_num = gen_info

            front = sprite_set.get("front_default")
            back = sprite_set.get("back_default")
            shiny_front = sprite_set.get("front_shiny")
            shiny_back = sprite_set.get("back_shiny")

            if not any([front, back, shiny_front, shiny_back]):
                continue

            results.append({
                "pokemon_id": pokemon_id,
                "version_group": vg_name,
                "generation": gen_name,
                "sprite_front": front,
                "sprite_back": back,
                "sprite_shiny_front": shiny_front,
                "sprite_shiny_back": shiny_back,
            })

    return results


def fetch_flavor_texts(pokemon_id: int, species_id: int) -> list[dict]:
    """Fetch flavor text entries for all versions."""
    data = fetch(f"{BASE_URL}/pokemon-species/{species_id}")
    entries = data.get("flavor_text_entries", [])
    results = []

    for entry in entries:
        lang = entry["language"]["name"]
        if lang not in ("zh-hans", "zh-hant", "en"):
            continue

        version = entry["version"]["name"]
        text = entry["flavor_text"].replace("\n", " ").replace("\f", " ").strip()

        results.append({
            "pokemon_id": pokemon_id,
            "version": version,
            "language": lang,
            "flavor_text": text,
        })

    return results


def fetch_pokedex_numbers(pokemon_id: int, species_id: int) -> list[dict]:
    """Fetch regional pokedex entry numbers."""
    data = fetch(f"{BASE_URL}/pokemon-species/{species_id}")
    entries = data.get("pokedex_numbers", [])
    results = []

    for entry in entries:
        pokedex = entry["pokedex"]["name"]
        number = entry["entry_number"]
        results.append({
            "pokemon_id": pokemon_id,
            "pokedex": pokedex,
            "entry_number": number,
        })

    return results


def save_version_sprites(conn, sprites: list[dict]):
    conn.executemany("""
        INSERT OR REPLACE INTO pokemon_version_sprites
        (pokemon_id, version_group, generation, sprite_front, sprite_back,
         sprite_shiny_front, sprite_shiny_back)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, [
        (s["pokemon_id"], s["version_group"], s["generation"],
         s["sprite_front"], s["sprite_back"],
         s["sprite_shiny_front"], s["sprite_shiny_back"])
        for s in sprites
    ])


def save_flavor_texts(conn, texts: list[dict]):
    conn.executemany("""
        INSERT OR REPLACE INTO pokemon_flavor_texts
        (pokemon_id, version, language, flavor_text)
        VALUES (?, ?, ?, ?)
    """, [
        (t["pokemon_id"], t["version"], t["language"], t["flavor_text"])
        for t in texts
    ])


def save_pokedex_numbers(conn, numbers: list[dict]):
    conn.executemany("""
        INSERT OR REPLACE INTO pokemon_pokedex_numbers
        (pokemon_id, pokedex, entry_number)
        VALUES (?, ?, ?)
    """, [
        (n["pokemon_id"], n["pokedex"], n["entry_number"])
        for n in numbers
    ])


def main(limit: int = 151):
    """Fetch version data. limit=151 for Gen 1 testing."""
    conn = get_conn()

    pokemon_list = conn.execute(
        "SELECT id, species_id FROM pokemon ORDER BY id LIMIT ?",
        (limit,)
    ).fetchall()

    print(f"Fetching version data for {len(pokemon_list)} pokemon (limit={limit})...")

    for idx, row in enumerate(pokemon_list, 1):
        pid = row["id"]
        sid = row["species_id"]

        if idx % 20 == 0:
            print(f"  Progress: {idx}/{len(pokemon_list)}")

        try:
            sprites = fetch_version_sprites(pid, sid)
            if sprites:
                save_version_sprites(conn, sprites)

            texts = fetch_flavor_texts(pid, sid)
            if texts:
                save_flavor_texts(conn, texts)

            numbers = fetch_pokedex_numbers(pid, sid)
            if numbers:
                save_pokedex_numbers(conn, numbers)

            time.sleep(0.03)

        except Exception as e:
            print(f"  Error on pokemon {pid}: {e}")
            continue

    conn.commit()
    conn.close()
    print(f"✓ Version data fetch complete ({limit} pokemon)")


if __name__ == "__main__":
    import sys
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 151
    main(limit)
