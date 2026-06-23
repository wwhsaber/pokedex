"""Rich CLI interface for the Pokédex."""
import sys
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.columns import Columns
from rich.prompt import Prompt, IntPrompt, IntPrompt as Int
from rich import box

from . import db

console = Console()

# Type emoji/color mapping
TYPE_COLORS = {
    "normal": "#A8A77A", "fire": "#EE8130", "water": "#6390F0",
    "electric": "#F7D02C", "grass": "#7AC74C", "ice": "#96D9D6",
    "fighting": "#C22E28", "poison": "#A33EA1", "ground": "#E2BF65",
    "flying": "#A98FF3", "psychic": "#F95587", "bug": "#A6B91A",
    "rock": "#B6A136", "ghost": "#735797", "dragon": "#6F35FC",
    "dark": "#705746", "steel": "#B7B7CE", "fairy": "#D685AD",
}

STAT_NAMES = {
    "hp": "HP", "attack": "攻击", "defense": "防御",
    "special-attack": "特攻", "special-defense": "特防", "speed": "速度",
}

GEN_NAMES = {
    1: "第一世代 (关都)", 2: "第二世代 (城都)", 3: "第三世代 (丰缘)",
    4: "第四世代 (神奥)", 5: "第五世代 (合众)", 6: "第六世代 (卡洛斯)",
    7: "第七世代 (阿罗拉)", 8: "第八世代 (伽勒尔)", 9: "第九世代 (帕底亚)",
}


def type_badge(type_name: str) -> Text:
    """Create a colored type badge."""
    color = TYPE_COLORS.get(type_name.lower(), "#777")
    return Text(f" {type_name} ", style=f"bold black on {color}")


def stat_bar(name: str, value: int, max_val: int = 255) -> Text:
    """Create a stat bar."""
    label = STAT_NAMES.get(name, name)
    bar_len = int(value / max_val * 20)
    color = "green" if value >= 100 else "yellow" if value >= 60 else "red"
    bar = "█" * bar_len + "░" * (20 - bar_len)
    return Text(f"  {label:<5} {bar} {value}", style=color)


# ── Screens ────────────────────────────────────────────────────────────


def show_home():
    """Show home screen with stats."""
    stats = db.get_stats_summary()
    if stats["total_pokemon"] == 0:
        console.print(Panel(
            "[yellow]数据库为空！请先运行数据抓取：[/]\n\n"
            "  [bold cyan]pokedex fetch[/]\n\n"
            "或：[dim]python scripts/fetch_data.py[/]",
            title="🧬 宝可梦图鉴 / Pokédex",
            border_style="yellow",
        ))
        return False

    console.print()
    title = Text("🧬 宝可梦图鉴 / Pokédex", style="bold magenta")
    console.print(Panel(title, border_style="magenta", width=60))

    # Stats summary
    table = Table(box=box.ROUNDED, show_header=False, border_style="cyan")
    table.add_column("项目", style="bold")
    table.add_column("数量", justify="right")
    table.add_row("📊 宝可梦总数", f"[bold green]{stats['total_pokemon']}[/]")
    table.add_row("🏷️ 属性", str(stats["types"]))
    table.add_row("⚡ 特性", str(stats["abilities"]))
    table.add_row("💥 招式", str(stats["moves"]))

    gen_text = Text()
    for gen, cnt in stats["generations"].items():
        name = GEN_NAMES.get(gen, f"第{gen}世代")
        gen_text.append(f"  Gen {gen}: {cnt}\n", style="dim")

    console.print(table)
    console.print()
    console.print(Panel(gen_text, title="世代分布", border_style="dim"))

    console.print("\n[dim]命令：[/]")
    console.print("  [bold cyan]s[/] 搜索  [bold cyan]b[/] 浏览  [bold cyan]t[/] 属性表  [bold cyan]q[/] 退出\n")
    return True


def show_search():
    """Search Pokemon by name/ID."""
    keyword = Prompt.ask("[bold cyan]搜索宝可梦[/] (名称/编号)")
    if not keyword:
        return

    results = db.get_pokemon_list(search=keyword, limit=30)
    if not results:
        console.print("[yellow]没有找到匹配的宝可梦[/]")
        return

    _show_pokemon_table(results, f"搜索: {keyword}")


def show_browse():
    """Browse Pokemon by generation/type."""
    console.print("\n[bold]筛选选项[/]")
    console.print("  [cyan]g[/] 按世代  [cyan]t[/] 按属性  [cyan]l[/] 传说宝可梦  [cyan]a[/] 全部")

    choice = Prompt.ask("选择", choices=["g", "t", "l", "a"], default="a")

    gen = None
    type_id = None
    legendary = None

    if choice == "g":
        gen = Int.ask("世代 (1-9)", choices=[str(i) for i in range(1, 10)])
    elif choice == "t":
        types = db.get_types()
        for t in types:
            console.print(f"  [cyan]{t['id']:>2}[/] {t['name_zh'] or t['name_en']}")
        type_id = IntPrompt.ask("属性 ID")
    elif choice == "l":
        legendary = True

    total = db.get_pokemon_count(generation=gen, type_id=type_id, legendary=legendary)
    console.print(f"\n[dim]共 {total} 个宝可梦[/]")

    offset = 0
    page_size = 30
    while True:
        results = db.get_pokemon_list(
            generation=gen, type_id=type_id, legendary=legendary,
            limit=page_size, offset=offset,
        )
        if not results:
            break

        _show_pokemon_table(results, f"浏览 (第 {offset+1}-{offset+len(results)} / {total})")

        if offset + page_size >= total:
            break
        nav = Prompt.ask("[dim]n[/] 下一页  [dim]p[/] 上一页  [dim]ID[/] 查看详情  [dim]q[/] 返回", default="n")
        if nav == "n":
            offset += page_size
        elif nav == "p":
            offset = max(0, offset - page_size)
        elif nav == "q":
            break
        else:
            try:
                show_detail(int(nav))
            except (ValueError, TypeError):
                pass


def show_type_chart():
    """Show type effectiveness chart."""
    types = db.get_types()
    if not types:
        console.print("[yellow]数据库为空[/]")
        return

    console.print("\n[bold magenta]属性克制表[/]\n")

    # Show all types
    table = Table(box=box.SIMPLE_HEAVY, title="所有属性")
    table.add_column("ID", justify="right")
    table.add_column("英文", style="bold")
    table.add_column("中文", style="bold")
    for t in types:
        table.add_row(str(t["id"]), t["name_en"], t["name_zh"] or "")

    console.print(table)

    tid = IntPrompt.ask("\n查看属性详情 (输入 ID)")
    matchups = db.get_type_matchups(tid)

    target_type = next((t for t in types if t["id"] == tid), None)
    if not target_type:
        console.print("[yellow]无效的属性 ID[/]")
        return

    console.print(f"\n[bold]{target_type['name_zh'] or target_type['name_en']} ({target_type['name_en']})[/]")

    # Attacking
    console.print("\n[bold green]攻击时：[/]")
    for tid2, factor in sorted(matchups["attacking"].items(), key=lambda x: -x[1]):
        t = next((t for t in types if t["id"] == tid2), None)
        if t and factor != 100:
            label = t["name_zh"] or t["name_en"]
            if factor == 200:
                console.print(f"  [green]效果拔群 (2x)[/] → {label}")
            elif factor == 50:
                console.print(f"  [red]效果不好 (0.5x)[/] → {label}")
            elif factor == 0:
                console.print(f"  [dim]无效 (0x)[/] → {label}")

    # Defending
    console.print("\n[bold red]防御时：[/]")
    for tid2, factor in sorted(matchups["defending"].items(), key=lambda x: -x[1]):
        t = next((t for t in types if t["id"] == tid2), None)
        if t and factor != 100:
            label = t["name_zh"] or t["name_en"]
            if factor == 200:
                console.print(f"  [red]受到双倍伤害 (2x)[/] ← {label}")
            elif factor == 50:
                console.print(f"  [green]受到半倍伤害 (0.5x)[/] ← {label}")
            elif factor == 0:
                console.print(f"  [dim]完全无效 (0x)[/] ← {label}")


def show_detail(pokemon_id: int):
    """Show detailed Pokemon info."""
    p = db.get_pokemon_detail(pokemon_id)
    if not p:
        console.print(f"[yellow]未找到 ID={pokemon_id} 的宝可梦[/]")
        return

    name_zh = p.get("name_zh", p["name_en"])
    name_en = p["name_en"]
    pid = p["id"]

    # Header
    header = Text()
    header.append(f"#{pid:04d} ", style="dim bold")
    header.append(f"{name_zh}", style="bold white")
    if name_zh.lower() != name_en.lower():
        header.append(f"  {name_en}", style="dim")

    # Types
    type_text = Text()
    for i, t in enumerate(p.get("types", [])):
        if i > 0:
            type_text.append(" ")
        type_text.append(type_badge(t["name_zh"] or t["name_en"]))

    # Info table
    info = Table(box=None, show_header=False, padding=(0, 2))
    info.add_column("key", style="bold dim")
    info.add_column("value")

    info.add_row("分类", p.get("genus_zh") or p.get("genus_en") or "—")
    info.add_row("属性", type_text)
    info.add_row("身高", f"{(p.get('height') or 0) / 10:.1f} m")
    info.add_row("体重", f"{(p.get('weight') or 0) / 10:.1f} kg")
    info.add_row("世代", GEN_NAMES.get(p.get("generation"), f"Gen {p.get('generation')}"))
    info.add_row("捕获率", str(p.get("capture_rate", "—")))

    flags = []
    if p.get("is_legendary"):
        flags.append("[bold yellow]★ 传说[/]")
    if p.get("is_mythical"):
        flags.append("[bold magenta]◆ 幻之[/]")
    if p.get("is_baby"):
        flags.append("[bold cyan]👶 幼年[/]")
    if flags:
        info.add_row("特殊", " ".join(flags))

    # Abilities
    ability_text = Text()
    for i, a in enumerate(p.get("abilities", [])):
        if i > 0:
            ability_text.append("  ")
        aname = a.get("name_zh") or a.get("name_en", "")
        hidden = " [dim](隐藏)[/]" if a.get("is_hidden") else ""
        ability_text.append_text(Text.from_markup(f"{aname}{hidden}"))

    # Stats
    stats_text = Text()
    total = 0
    for stat_name in ["hp", "attack", "defense", "special-attack", "special-defense", "speed"]:
        val = p.get("stats", {}).get(stat_name, 0)
        total += val
        stats_text.append_text(stat_bar(stat_name, val))
        stats_text.append("\n")
    stats_text.append(f"  合计   {total}", style="bold white")

    # Flavor text
    flavor = p.get("flavor_zh") or p.get("flavor_en") or ""

    # Build panel content
    console.print()
    console.print(Panel(header, border_style="cyan", width=65))
    console.print(info)
    console.print()
    console.print(Panel(ability_text, title="特性", border_style="green"))
    console.print(Panel(stats_text, title="种族值", border_style="yellow"))

    if flavor:
        console.print(Panel(f"[italic]{flavor}[/]", title="图鉴说明", border_style="dim"))

    # Moves (level-up)
    moves = p.get("moves_levelup", [])
    if moves:
        mt = Table(box=box.SIMPLE, title="升级可学招式 (部分)", show_lines=False)
        mt.add_column("Lv.", justify="right", width=5)
        mt.add_column("名称", style="bold")
        mt.add_column("属性", width=8)
        mt.add_column("威力", justify="right", width=5)
        mt.add_column("命中", justify="right", width=5)
        mt.add_column("分类", width=6)
        for m in moves:
            move_type = ""
            tid = m.get("type_id")
            if tid:
                tt = next((t for t in db.get_types() if t["id"] == tid), None)
                if tt:
                    move_type = tt["name_zh"] or tt["name_en"]
            mt.add_row(
                str(m.get("level_learned", 0)),
                m.get("name_zh") or m.get("name_en", ""),
                move_type,
                str(m.get("power") or "—"),
                str(m.get("accuracy") or "—"),
                m.get("damage_class") or "—",
            )
        console.print(mt)

    # Evolution
    evos = p.get("evolutions", [])
    if len(evos) > 1:
        evo_text = Text()
        for i, e in enumerate(evos):
            ename = e.get("evo_name_zh") or e.get("evo_name_en", "?")
            if i > 0:
                trigger = e.get("trigger", "")
                if trigger == "level-up" and e.get("min_level"):
                    evo_text.append(f" --(Lv.{e['min_level']})--> ", style="dim")
                elif trigger == "use-item" and e.get("item"):
                    evo_text.append(f" --({e['item']})--> ", style="dim")
                elif trigger == "trade":
                    evo_text.append(" --(交换)--> ", style="dim")
                else:
                    evo_text.append(" --> ", style="dim")
            evo_text.append(f"{ename}", style="bold")
        console.print(Panel(evo_text, title="进化链", border_style="magenta"))

    # Sprites
    artwork = p.get("sprite_artwork")
    if artwork:
        console.print(f"\n[dim]官方立绘: {artwork}[/]")

    console.print()


# ── Helpers ────────────────────────────────────────────────────────────


def _show_pokemon_table(results: list[dict], title: str = ""):
    """Display a list of Pokemon in a table."""
    table = Table(
        box=box.ROUNDED,
        title=title,
        title_style="bold",
        show_lines=False,
        row_styles=["", "dim"],
    )
    table.add_column("#", justify="right", style="dim", width=5)
    table.add_column("中文名", style="bold")
    table.add_column("英文名", style="dim")
    table.add_column("世代", justify="center", width=4)
    table.add_column("标记", width=6)

    for r in results:
        flags = ""
        if r.get("is_legendary"):
            flags += "★"
        if r.get("is_mythical"):
            flags += "◆"

        table.add_row(
            str(r["id"]),
            r.get("name_zh") or r["name_en"],
            r["name_en"],
            str(r.get("generation") or "?"),
            flags,
        )

    console.print(table)

    pid = Prompt.ask("\n[dim]输入编号查看详情，或按 Enter 返回[/]", default="")
    if pid:
        try:
            show_detail(int(pid))
        except (ValueError, TypeError):
            pass


# ── Main loop ──────────────────────────────────────────────────────────


def main():
    """Main CLI entry point."""
    # Check if this is a fetch command
    if len(sys.argv) > 1 and sys.argv[1] == "fetch":
        from .fetcher import PokeAPIFetcher
        import asyncio
        console.print("[bold cyan]🧬 开始抓取宝可梦数据...[/]\n")
        fetcher = PokeAPIFetcher()
        asyncio.run(fetcher.run())
        return

    # Check if DB exists
    from .db import get_db_path
    if not get_db_path().exists():
        console.print(Panel(
            "[yellow]数据库不存在！请先运行：[/]\n\n"
            "  [bold cyan]pokedex fetch[/]\n\n"
            "这将从 PokeAPI 抓取全部宝可梦数据到本地。",
            title="🧬 宝可梦图鉴 / Pokédex",
            border_style="yellow",
        ))
        return

    # Main loop
    while True:
        if not show_home():
            break

        cmd = Prompt.ask("[bold]命令", choices=["s", "b", "t", "q"], default="s")

        if cmd == "s":
            show_search()
        elif cmd == "b":
            show_browse()
        elif cmd == "t":
            show_type_chart()
        elif cmd == "q":
            console.print("[dim]再见！[/]")
            break

        console.print()


if __name__ == "__main__":
    main()
