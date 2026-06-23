"""Targeted fix: only re-fetch pokemon_moves and evolution_chains."""
import asyncio
import sqlite3
import time
from pathlib import Path

import aiohttp

DB_PATH = Path(__file__).parent / "data" / "pokedex.db"
API_BASE = "https://pokeapi.co/api/v2"
CONCURRENCY = 30


async def fix_moves():
    """Re-fetch pokemon_moves with correct dedup key."""
    print("🔧 [1/2] Fixing pokemon_moves...")
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("DELETE FROM pokemon_moves")
    conn.commit()

    pokemon_ids = [r[0] for r in conn.execute("SELECT id FROM pokemon ORDER BY id").fetchall()]
    total = len(pokemon_ids)
    print(f"  Cleared table, re-fetching {total} Pokémon...")

    sem = asyncio.Semaphore(CONCURRENCY)
    connector = aiohttp.TCPConnector(limit=CONCURRENCY)

    async def fetch_moves(session, pid):
        async with sem:
            for attempt in range(3):
                try:
                    async with session.get(f"{API_BASE}/pokemon/{pid}", timeout=aiohttp.ClientTimeout(total=30)) as resp:
                        if resp.status == 200:
                            return (pid, (await resp.json()).get("moves", []))
                        elif resp.status == 429:
                            await asyncio.sleep(2 ** attempt)
                        else:
                            return (pid, [])
                except:
                    if attempt == 2:
                        return (pid, [])
                    await asyncio.sleep(1)
            return (pid, [])

    async with aiohttp.ClientSession(connector=connector) as session:
        for i in range(0, total, 50):
            batch = pokemon_ids[i:i+50]
            results = await asyncio.gather(*[fetch_moves(session, pid) for pid in batch])

            for pid, moves in results:
                seen = set()
                for m in moves:
                    mid = int(m["move"]["url"].rstrip("/").split("/")[-1])
                    for vd in m.get("version_group_details", []):
                        method = vd["move_learn_method"]["name"]
                        level = vd["level_learned_at"]
                        vg = vd["version_group"]["name"]
                        key = (mid, method, level, vg)
                        if key not in seen:
                            seen.add(key)
                            conn.execute(
                                "INSERT OR IGNORE INTO pokemon_moves (pokemon_id, move_id, learn_method, level_learned, version_group) VALUES (?,?,?,?,?)",
                                (pid, mid, method, level, vg),
                            )
            conn.commit()
            done = min(i + 50, total)
            print(f"  Moves: {done}/{total}")

    conn.close()
    print(f"✅ Moves done")


async def fix_evolutions():
    """Re-fetch evolution chains with correct schema."""
    print("🔧 [2/2] Fixing evolution_chains...")
    conn = sqlite3.connect(str(DB_PATH))

    # Drop & recreate with composite primary key
    conn.execute("DROP TABLE IF EXISTS evolution_chains")
    conn.execute("""CREATE TABLE evolution_chains (
        chain_id INTEGER NOT NULL, pokemon_id INTEGER NOT NULL, evolves_to_id INTEGER,
        species_id INTEGER, evolves_from_species_id INTEGER,
        min_level INTEGER, trigger TEXT, item TEXT, happiness INTEGER,
        time_of_day TEXT, held_item TEXT,
        PRIMARY KEY (chain_id, species_id)
    )""")
    conn.commit()

    sem = asyncio.Semaphore(CONCURRENCY)
    connector = aiohttp.TCPConnector(limit=CONCURRENCY)

    async with aiohttp.ClientSession(connector=connector) as session:
        # Get all chain URLs
        async with sem:
            async with session.get(f"{API_BASE}/evolution-chain?limit=2000", timeout=aiohttp.ClientTimeout(total=30)) as resp:
                data = await resp.json()
                chain_urls = [r["url"] for r in data.get("results", [])]

        total = len(chain_urls)
        print(f"  Fetching {total} chains...")

        async def fetch_chain(url):
            async with sem:
                for attempt in range(3):
                    try:
                        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                            if resp.status == 200:
                                return await resp.json()
                            elif resp.status == 429:
                                await asyncio.sleep(2 ** attempt)
                            else:
                                return None
                    except:
                        if attempt == 2:
                            return None
                        await asyncio.sleep(1)
                return None

        for i in range(0, total, 50):
            batch = chain_urls[i:i+50]
            results = await asyncio.gather(*[fetch_chain(u) for u in batch])

            for chain_data in results:
                if not chain_data:
                    continue
                cid = chain_data.get("id")
                chain = chain_data.get("chain", {})
                _process_chain(conn, cid, chain, None)

            conn.commit()
            done = min(i + 50, total)
            if done % 200 == 0 or done == total:
                print(f"  Evolutions: {done}/{total}")

    conn.close()
    print(f"✅ Evolutions done")


def _process_chain(conn, chain_id, chain, evolves_from_id):
    species_url = chain.get("species", {}).get("url", "")
    species_id = int(species_url.rstrip("/").split("/")[-1]) if species_url else None
    evo_details = chain.get("evolution_details", [])
    trigger = min_level = item = happiness = time_of_day = held_item = None
    if evo_details:
        ed = evo_details[0]
        trigger = ed.get("trigger", {}).get("name") if ed.get("trigger") else None
        min_level = ed.get("min_level")
        item = ed.get("item", {}).get("name") if ed.get("item") else None
        happiness = ed.get("min_happiness")
        time_of_day = ed.get("time_of_day") or None
        held_item = ed.get("held_item", {}).get("name") if ed.get("held_item") else None

    conn.execute(
        "INSERT OR REPLACE INTO evolution_chains (chain_id, pokemon_id, evolves_to_id, species_id, evolves_from_species_id, min_level, trigger, item, happiness, time_of_day, held_item) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (chain_id, species_id, None, species_id, evolves_from_id, min_level, trigger, item, happiness, time_of_day, held_item),
    )
    for evo in chain.get("evolves_to", []):
        _process_chain(conn, chain_id, evo, species_id)


async def main():
    start = time.time()
    print("🧬 Pokédex Data Fix (moves + evolutions only)")
    print("=" * 50)
    await fix_moves()
    await fix_evolutions()
    elapsed = time.time() - start

    # Verify
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    sv_lv = conn.execute("SELECT COUNT(*) FROM pokemon_moves WHERE pokemon_id=25 AND version_group='scarlet-violet' AND learn_method='level-up'").fetchone()[0]
    evo = conn.execute("SELECT COUNT(*) FROM evolution_chains WHERE chain_id=1").fetchone()[0]
    all_evo = conn.execute("SELECT COUNT(*) FROM evolution_chains").fetchone()[0]
    all_moves = conn.execute("SELECT COUNT(*) FROM pokemon_moves").fetchone()[0]
    conn.close()

    print(f"\n📊 Verification ({elapsed:.0f}s):")
    print(f"  Total pokemon_moves: {all_moves}")
    print(f"  Pikachu SV level-up: {sv_lv} moves")
    print(f"  Bulbasaur chain entries: {evo}")
    print(f"  Total evolution entries: {all_evo}")


if __name__ == "__main__":
    asyncio.run(main())
