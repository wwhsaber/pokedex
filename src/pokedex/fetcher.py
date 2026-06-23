"""Async data fetcher: PokeAPI → local SQLite."""
import asyncio
import json
import time
from typing import Any, Optional

import aiohttp
from rich.console import Console
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    TextColumn,
    TimeElapsedColumn,
    TimeRemainingColumn,
)

from .db import get_conn, get_db_path, init_db

API_BASE = "https://pokeapi.co/api/v2"
CONCURRENCY = 30  # polite concurrency
console = Console()

# ── Helpers ────────────────────────────────────────────────────────────


def _name_from_names(names: list, lang: str) -> Optional[str]:
    """Extract a name from the 'names' array."""
    for n in names:
        if n["language"]["name"] == lang:
            return n["name"]
    return None


def _flavor_from_entries(entries: list, lang: str, version: str = None) -> Optional[str]:
    """Extract flavor text, preferring specific version."""
    candidates = []
    for e in entries:
        if e["language"]["name"] == lang:
            candidates.append(e["flavor_text"].replace("\n", " ").replace("\f", " "))
    if version:
        for e in entries:
            if e["language"]["name"] == lang and e["version"]["name"] == version:
                return e["flavor_text"].replace("\n", " ").replace("\f", " ")
    return candidates[0] if candidates else None


def _effect_from_entries(entries: list, lang: str) -> tuple[Optional[str], Optional[str]]:
    """Extract (short_effect, effect) from effect_entries."""
    for e in entries:
        if e["language"]["name"] == lang:
            return (
                e.get("short_effect", "").replace("\n", " "),
                e.get("effect", "").replace("\n", " "),
            )
    return None, None


# ── Fetcher class ──────────────────────────────────────────────────────


class PokeAPIFetcher:
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.sem = asyncio.Semaphore(CONCURRENCY)
        self.conn = None

    async def _get(self, url: str) -> dict:
        """Rate-limited GET request with retry."""
        async with self.sem:
            for attempt in range(3):
                try:
                    async with self.session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                        if resp.status == 200:
                            return await resp.json()
                        elif resp.status == 429:
                            await asyncio.sleep(2 ** attempt)
                        else:
                            console.print(f"[red]HTTP {resp.status} for {url}[/]")
                            return {}
                except Exception as e:
                    if attempt == 2:
                        console.print(f"[red]Failed: {url} — {e}[/]")
                        return {}
                    await asyncio.sleep(1)
            return {}

    async def _get_list(self, endpoint: str) -> list[dict]:
        """Fetch all items from a paginated endpoint."""
        items = []
        url = f"{API_BASE}/{endpoint}?limit=2000"
        while url:
            data = await self._get(url)
            items.extend(data.get("results", []))
            url = data.get("next")
        return items

    # ── Types ──────────────────────────────────────────────────────────

    async def fetch_types(self, progress, task):
        """Fetch all 18 types + names + efficacy."""
        items = await self._get_list("type")
        type_list = [i for i in items if i["url"].rstrip("/").split("/")[-1].isdigit()]

        for item in type_list:
            tid = int(item["url"].rstrip("/").split("/")[-1])
            data = await self._get(item["url"])
            if not data:
                continue

            name_en = _name_from_names(data.get("names", []), "en") or data["name"]
            name_zh = _name_from_names(data.get("names", []), "zh-Hans") or name_en

            self.conn.execute(
                "INSERT OR REPLACE INTO types (id, identifier, name_en, name_zh) VALUES (?,?,?,?)",
                (tid, data["name"], name_en, name_zh),
            )

            # Type names
            for n in data.get("names", []):
                self.conn.execute(
                    "INSERT OR REPLACE INTO type_names (type_id, language, name) VALUES (?,?,?)",
                    (tid, n["language"]["name"], n["name"]),
                )

            # Damage relations
            for rel in data.get("damage_relations", {}).get("double_damage_to", []):
                target_id = int(rel["url"].rstrip("/").split("/")[-1])
                self.conn.execute(
                    "INSERT OR REPLACE INTO type_efficacy (damage_type_id, target_type_id, damage_factor) VALUES (?,?,200)",
                    (tid, target_id),
                )
            for rel in data.get("damage_relations", {}).get("half_damage_to", []):
                target_id = int(rel["url"].rstrip("/").split("/")[-1])
                self.conn.execute(
                    "INSERT OR REPLACE INTO type_efficacy (damage_type_id, target_type_id, damage_factor) VALUES (?,?,50)",
                    (tid, target_id),
                )
            for rel in data.get("damage_relations", {}).get("no_damage_to", []):
                target_id = int(rel["url"].rstrip("/").split("/")[-1])
                self.conn.execute(
                    "INSERT OR REPLACE INTO type_efficacy (damage_type_id, target_type_id, damage_factor) VALUES (?,?,0)",
                    (tid, target_id),
                )

            progress.update(task, advance=1)

        self.conn.commit()

    # ── Abilities ──────────────────────────────────────────────────────

    async def fetch_abilities(self, progress, task):
        items = await self._get_list("ability")
        for item in items:
            aid = int(item["url"].rstrip("/").split("/")[-1])
            data = await self._get(item["url"])
            if not data:
                continue

            name_en = _name_from_names(data.get("names", []), "en") or data["name"]
            name_zh = _name_from_names(data.get("names", []), "zh-Hans") or name_en
            eff_en, eff_zh = None, None
            for e in data.get("effect_entries", []):
                if e["language"]["name"] == "en":
                    eff_en = e.get("effect", "")
                # PokeAPI doesn't have zh effect_entries for most abilities

            short_en = None
            for e in data.get("effect_entries", []):
                if e["language"]["name"] == "en":
                    short_en = e.get("short_effect", "")
                    break

            self.conn.execute(
                """INSERT OR REPLACE INTO abilities
                   (id, identifier, name_en, name_zh, effect_en, effect_zh, short_effect_en, short_effect_zh)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (aid, data["name"], name_en, name_zh, eff_en, eff_zh, short_en, None),
            )

            for n in data.get("names", []):
                self.conn.execute(
                    "INSERT OR REPLACE INTO ability_names (ability_id, language, name) VALUES (?,?,?)",
                    (aid, n["language"]["name"], n["name"]),
                )

            progress.update(task, advance=1)

        self.conn.commit()

    # ── Moves ──────────────────────────────────────────────────────────

    async def fetch_moves(self, progress, task):
        items = await self._get_list("move")
        for item in items:
            mid = int(item["url"].rstrip("/").split("/")[-1])
            data = await self._get(item["url"])
            if not data:
                continue

            name_en = _name_from_names(data.get("names", []), "en") or data["name"]
            name_zh = _name_from_names(data.get("names", []), "zh-Hans") or name_en
            type_id = None
            if data.get("type"):
                type_id = int(data["type"]["url"].rstrip("/").split("/")[-1])

            eff_en, eff_zh = None, None
            for e in data.get("effect_entries", []):
                if e["language"]["name"] == "en":
                    eff_en = e.get("effect", "")
                    break
            short_en = None
            for e in data.get("effect_entries", []):
                if e["language"]["name"] == "en":
                    short_en = e.get("short_effect", "")
                    break

            dc = data.get("damage_class", {})
            dc_name = dc.get("name") if dc else None

            self.conn.execute(
                """INSERT OR REPLACE INTO moves
                   (id, identifier, type_id, power, accuracy, pp, priority,
                    damage_class, target, name_en, name_zh, effect_en, effect_zh, short_effect_en, short_effect_zh)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    mid, data["name"], type_id, data.get("power"),
                    data.get("accuracy"), data.get("pp"), data.get("priority", 0),
                    dc_name, data.get("target", {}).get("name") if data.get("target") else None,
                    name_en, name_zh, eff_en, eff_zh, short_en, None,
                ),
            )

            for n in data.get("names", []):
                self.conn.execute(
                    "INSERT OR REPLACE INTO move_names (move_id, language, name) VALUES (?,?,?)",
                    (mid, n["language"]["name"], n["name"]),
                )

            progress.update(task, advance=1)

        self.conn.commit()

    # ── Pokemon Species ────────────────────────────────────────────────

    async def _fetch_species_batch(self, species_list: list[dict], progress, task):
        """Fetch a batch of species + their default pokemon data."""
        for item in species_list:
            sid = int(item["url"].rstrip("/").split("/")[-1])
            sp_data = await self._get(item["url"])
            if not sp_data:
                progress.update(task, advance=1)
                continue

            # Get default variety
            varieties = sp_data.get("varieties", [])
            default_variety = None
            for v in varieties:
                if v.get("is_default"):
                    default_variety = v
                    break
            if not default_variety and varieties:
                default_variety = varieties[0]

            pokemon_id = sid  # fallback
            poke_data = {}

            if default_variety:
                poke_url = default_variety["pokemon"]["url"]
                pokemon_id = int(poke_url.rstrip("/").split("/")[-1])
                poke_data = await self._get(poke_url)

            # Extract names
            name_en = _name_from_names(sp_data.get("names", []), "en") or sp_data["name"]
            name_zh = _name_from_names(sp_data.get("names", []), "zh-Hans") or name_en
            genus_en = None
            genus_zh = None
            for g in sp_data.get("genera", []):
                if g["language"]["name"] == "en":
                    genus_en = g["genus"]
                if g["language"]["name"] == "zh-Hans":
                    genus_zh = g["genus"]

            flavor_en = _flavor_from_entries(sp_data.get("flavor_text_entries", []), "en")
            flavor_zh = _flavor_from_entries(sp_data.get("flavor_text_entries", []), "zh-Hans")

            # Sprites
            sprites = poke_data.get("sprites", {})
            sprite_default = sprites.get("front_default")
            sprite_shiny = sprites.get("front_shiny")
            sprite_artwork = (
                sprites.get("other", {})
                .get("official-artwork", {})
                .get("front_default")
            )

            # Generation number
            gen_url = sp_data.get("generation", {}).get("url", "")
            gen_num = int(gen_url.rstrip("/").split("/")[-1]) if gen_url else None

            # Growth rate
            gr = sp_data.get("growth_rate", {})
            growth_rate = gr.get("name") if gr else None

            # Color, shape, habitat
            color = sp_data.get("color", {}).get("name") if sp_data.get("color") else None
            shape = sp_data.get("shape", {}).get("name") if sp_data.get("shape") else None
            habitat = sp_data.get("habitat", {}).get("name") if sp_data.get("habitat") else None

            self.conn.execute(
                """INSERT OR REPLACE INTO pokemon
                   (id, species_id, identifier, height, weight, base_experience,
                    generation, capture_rate, base_happiness, growth_rate,
                    color, shape, habitat, is_baby, is_legendary, is_mythical,
                    name_en, genus_en, genus_zh, flavor_en, flavor_zh,
                    sprite_default, sprite_shiny, sprite_artwork)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    pokemon_id, sid, sp_data["name"],
                    poke_data.get("height"), poke_data.get("weight"),
                    poke_data.get("base_experience"),
                    gen_num, sp_data.get("capture_rate"),
                    sp_data.get("base_happiness"), growth_rate,
                    color, shape, habitat,
                    1 if sp_data.get("is_baby") else 0,
                    1 if sp_data.get("is_legendary") else 0,
                    1 if sp_data.get("is_mythical") else 0,
                    name_en, genus_en, genus_zh, flavor_en, flavor_zh,
                    sprite_default, sprite_shiny, sprite_artwork,
                ),
            )

            # Pokemon names (zh-hans + en)
            self.conn.execute(
                "INSERT OR REPLACE INTO pokemon_names (pokemon_id, language, name) VALUES (?,?,?)",
                (pokemon_id, "en", name_en),
            )
            self.conn.execute(
                "INSERT OR REPLACE INTO pokemon_names (pokemon_id, language, name) VALUES (?,?,?)",
                (pokemon_id, "zh-Hans", name_zh),
            )
            for n in sp_data.get("names", []):
                self.conn.execute(
                    "INSERT OR REPLACE INTO pokemon_names (pokemon_id, language, name) VALUES (?,?,?)",
                    (pokemon_id, n["language"]["name"], n["name"]),
                )

            # Types
            for t in poke_data.get("types", []):
                type_id = int(t["type"]["url"].rstrip("/").split("/")[-1])
                self.conn.execute(
                    "INSERT OR REPLACE INTO pokemon_types (pokemon_id, type_id, slot) VALUES (?,?,?)",
                    (pokemon_id, type_id, t["slot"]),
                )

            # Abilities
            for a in poke_data.get("abilities", []):
                ability_id = int(a["ability"]["url"].rstrip("/").split("/")[-1])
                self.conn.execute(
                    "INSERT OR REPLACE INTO pokemon_abilities (pokemon_id, ability_id, slot, is_hidden) VALUES (?,?,?,?)",
                    (pokemon_id, ability_id, a["slot"], 1 if a["is_hidden"] else 0),
                )

            # Stats
            for s in poke_data.get("stats", []):
                stat_name = s["stat"]["name"]
                self.conn.execute(
                    "INSERT OR REPLACE INTO stats (pokemon_id, stat_name, base_stat, effort) VALUES (?,?,?,?)",
                    (pokemon_id, stat_name, s["base_stat"], s["effort"]),
                )

            # Moves (latest version group only to avoid bloat)
            seen_moves = set()
            for m in poke_data.get("moves", []):
                mid = int(m["move"]["url"].rstrip("/").split("/")[-1])
                for vd in m.get("version_group_details", []):
                    method = vd["move_learn_method"]["name"]
                    level = vd["level_learned_at"]
                    vg = vd["version_group"]["name"]
                    key = (mid, method, level)
                    if key not in seen_moves:
                        seen_moves.add(key)
                        self.conn.execute(
                            """INSERT OR IGNORE INTO pokemon_moves
                               (pokemon_id, move_id, learn_method, level_learned, version_group)
                               VALUES (?,?,?,?,?)""",
                            (pokemon_id, mid, method, level, vg),
                        )

            progress.update(task, advance=1)

        self.conn.commit()

    async def fetch_pokemon(self, progress, task):
        """Fetch all pokemon species."""
        items = await self._get_list("pokemon-species")
        console.print(f"[cyan]Found {len(items)} species to fetch[/]")

        # Process in batches of 50
        batch_size = 50
        for i in range(0, len(items), batch_size):
            batch = items[i : i + batch_size]
            await self._fetch_species_batch(batch, progress, task)

    # ── Evolution Chains ───────────────────────────────────────────────

    async def fetch_evolutions(self, progress, task):
        items = await self._get_list("evolution-chain")
        for item in items:
            cid = int(item["url"].rstrip("/").split("/")[-1])
            data = await self._get(item["url"])
            if not data:
                progress.update(task, advance=1)
                continue

            chain = data.get("chain", {})
            self._process_evo_chain(cid, chain, None, progress)

            progress.update(task, advance=1)

        self.conn.commit()

    def _process_evo_chain(self, chain_id, chain, evolves_from_id, progress):
        species_url = chain.get("species", {}).get("url", "")
        species_id = int(species_url.rstrip("/").split("/")[-1]) if species_url else None

        evo_details = chain.get("evolution_details", [])
        trigger = None
        min_level = None
        item = None
        happiness = None
        time_of_day = None
        held_item = None

        if evo_details:
            ed = evo_details[0]
            trigger = ed.get("trigger", {}).get("name") if ed.get("trigger") else None
            min_level = ed.get("min_level")
            item = ed.get("item", {}).get("name") if ed.get("item") else None
            happiness = ed.get("min_happiness")
            time_of_day = ed.get("time_of_day") or None
            held_item = ed.get("held_item", {}).get("name") if ed.get("held_item") else None

        self.conn.execute(
            """INSERT OR REPLACE INTO evolution_chains
               (chain_id, pokemon_id, evolves_to_id, species_id, evolves_from_species_id,
                min_level, trigger, item, happiness, time_of_day, held_item)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (chain_id, species_id, None, species_id, evolves_from_id,
             min_level, trigger, item, happiness, time_of_day, held_item),
        )

        for evo in chain.get("evolves_to", []):
            self._process_evo_chain(chain_id, evo, species_id, progress)

    # ── Main runner ────────────────────────────────────────────────────

    async def run(self):
        """Run the full data fetch."""
        start = time.time()
        init_db()
        self.conn = get_conn()

        connector = aiohttp.TCPConnector(limit=CONCURRENCY)
        self.session = aiohttp.ClientSession(connector=connector)

        try:
            with Progress(
                TextColumn("[bold blue]{task.description}"),
                BarColumn(),
                MofNCompleteColumn(),
                TimeElapsedColumn(),
                TimeRemainingColumn(),
                console=console,
            ) as progress:
                t1 = progress.add_task("Types", total=20)
                t2 = progress.add_task("Abilities", total=350)
                t3 = progress.add_task("Moves", total=950)
                t4 = progress.add_task("Pokemon", total=1100)
                t5 = progress.add_task("Evolutions", total=550)

                # Run types and abilities first (they're referenced by others)
                await self.fetch_types(progress, t1)
                await asyncio.gather(
                    self.fetch_abilities(progress, t2),
                    self.fetch_moves(progress, t3),
                )
                await self.fetch_pokemon(progress, t4)
                await self.fetch_evolutions(progress, t5)

        finally:
            await self.session.close()
            self.conn.close()

        elapsed = time.time() - start
        size = get_db_path().stat().st_size / (1024 * 1024)
        console.print(f"\n[green]✅ Done![/] Database saved to: {get_db_path()}")
        console.print(f"[cyan]Size: {size:.1f} MB | Time: {elapsed:.0f}s[/]")
