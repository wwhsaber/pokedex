# 🧬 宝可梦图鉴 / Pokédex

全世代宝可梦图鉴 Web 应用，支持中英双语，数据来源于 [PokeAPI](https://pokeapi.co/)。

## 功能

- 📊 **完整数据**：全世代 1025 只宝可梦（Gen 1-9），包含种族值、属性、特性、招式
- 🌏 **中英双语**：宝可梦名称、属性、特性、招式均支持简体中文和英文
- 🔍 **多维搜索**：按名称（中/英）、编号搜索，按属性、世代筛选
- 📈 **种族值图表**：直观的彩色种族值条形图
- 🔄 **进化链**：完整的进化关系展示
- 💥 **招式列表**：升级可学招式，含属性、威力、命中、分类
- ⚔️ **属性克制表**：18×18 完整属性克制矩阵
- 🖥️ **响应式 Web UI**：支持桌面和移动端

## 快速开始

```bash
# 安装 Python 依赖
cd pokedex
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn aiohttp aiosqlite rich

# 抓取数据（首次运行，约需 10-15 分钟）
pokedex fetch

# 启动 Web 服务
uvicorn backend.app:app --host 0.0.0.0 --port 8080

# 访问 http://localhost:8080
```

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Python + FastAPI + SQLite |
| 前端 | HTML + JavaScript + Tailwind CSS |
| 数据源 | PokeAPI (REST) |
| 部署 | Uvicorn ASGI |

## 项目结构

```
pokedex/
├── backend/
│   └── app.py              # FastAPI 后端 API
├── frontend/
│   ├── index.html           # 主页面
│   ├── app.js               # 前端应用逻辑
│   └── style.css            # 自定义样式
├── src/pokedex/
│   ├── db.py                # 数据库 schema 和查询
│   ├── fetcher.py           # PokeAPI 异步数据抓取
│   └── cli.py               # CLI 界面（可选）
├── data/
│   └── pokedex.db           # SQLite 数据库（本地生成）
├── pyproject.toml
└── README.md
```

## API 接口

| 端点 | 说明 |
|------|------|
| `GET /api/pokemon` | 宝可梦列表（支持搜索/筛选/分页） |
| `GET /api/pokemon/{id}` | 宝可梦详情（种族值/特性/招式/进化链） |
| `GET /api/types` | 所有属性列表 |
| `GET /api/type-matchup` | 属性克制矩阵 |
| `GET /api/stats` | 数据统计概览 |

### 查询参数（`/api/pokemon`）

| 参数 | 类型 | 说明 |
|------|------|------|
| `search` | string | 搜索关键词（中/英文名称或编号） |
| `type_id` | int | 属性 ID 筛选 |
| `generation` | int | 世代筛选 (1-9) |
| `legendary` | bool | 仅传说宝可梦 |
| `mythical` | bool | 仅幻之宝可梦 |
| `limit` | int | 每页数量（默认 36） |
| `offset` | int | 偏移量 |

## 数据覆盖

| 类别 | 数量 |
|------|------|
| 宝可梦 | 1025 |
| 属性 | 21 (18 + 星晶/???/暗) |
| 特性 | 371 |
| 招式 | 937 |
| 进化链 | 541 |

## License

MIT
