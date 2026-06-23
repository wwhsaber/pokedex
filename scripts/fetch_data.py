"""Fetch data from PokeAPI and populate local SQLite database."""
import asyncio
import sys

from pokedex.fetcher import PokeAPIFetcher


def main():
    print("🧬 Pokédex Data Fetcher")
    print("=" * 50)
    print("Fetching all Pokémon data from PokeAPI...")
    print("This will take ~10-15 minutes on first run.\n")

    fetcher = PokeAPIFetcher()
    asyncio.run(fetcher.run())


if __name__ == "__main__":
    main()
