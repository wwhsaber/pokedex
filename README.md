# 🧬 宝可梦图鉴 / Pokédex

完整的宝可梦图鉴数据库，支持中英双语，数据来源于 [PokeAPI](https://pokeapi.co/)。

## 功能

- 📊 **完整数据**：全世代宝可梦（截至第9世代），包含种族值、属性、特性、招式等
- 🌏 **中英双语**：宝可梦名称、属性、特性、招式均支持简体中文和英文
- 🔍 **多维搜索**：按名称、编号、属性、世代搜索和筛选
- 💾 **本地 SQLite**：数据缓存到本地，查询飞快，无需联网
- 🖥️ **CLI 界面**：Rich 终端 UI，美观易用

## 快速开始

```bash
# 安装依赖
pip install -e .

# 抓取数据（首次运行，约需 10-15 分钟）
pokedex fetch

# 启动图鉴
pokedex
```

## 技术栈

- Python 3.10+
- SQLite（本地数据库）
- aiohttp（异步 HTTP）
- Rich（终端 UI）
- PokeAPI（数据源）

## 项目结构

```
pokedex/
├── src/pokedex/
│   ├── __init__.py
│   ├── db.py          # 数据库 schema 和操作
│   ├── fetcher.py     # PokeAPI 异步数据抓取
│   └── cli.py         # Rich CLI 界面
├── scripts/
│   └── fetch_data.py  # 数据抓取入口
├── data/              # SQLite 数据库存放目录
├── pyproject.toml
└── README.md
```

## 数据覆盖

| 类别 | 数量 | 中文支持 |
|------|------|----------|
| 宝可梦 | ~1025 | ✅ |
| 属性 | 18 | ✅ |
| 特性 | ~300+ | ✅ |
| 招式 | ~900+ | ✅ |
| 进化链 | ~500+ | — |

## License

MIT
