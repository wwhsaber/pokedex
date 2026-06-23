# 🧬 宝可梦图鉴 / Pokédex

全世代宝可梦图鉴 Web 应用，前后端分离架构，支持中英双语。

## 功能

- 📊 **完整数据**：1025 只宝可梦（Gen 1-9），含种族值、属性、特性、招式
- 🌏 **中英双语**：宝可梦名称、属性、特性、招式均支持中文和英文
- 🔍 **多维搜索**：按名称（中/英）、编号搜索，按属性、世代筛选
- 📈 **种族值图表**：彩色种族值条形图
- 🔄 **进化链**：完整进化关系展示
- 💥 **招式列表**：升级可学招式，含属性、威力、命中、分类
- ⚔️ **属性克制表**：18×18 完整属性克制矩阵
- 📱 **响应式设计**：适配桌面和移动端

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React + Vite + Tailwind CSS v4 |
| 后端 | Python + FastAPI + SQLite |
| 数据源 | PokeAPI (REST) |

## 快速开始

```bash
# 1. 安装后端依赖
cd pokedex
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn aiohttp aiosqlite rich

# 2. 抓取数据（首次运行，约 10-15 分钟）
pokedex fetch

# 3. 构建前端
cd frontend
npm install
npm run build
cd ..

# 4. 启动服务
uvicorn backend.app:app --host 0.0.0.0 --port 8080

# 5. 访问 http://localhost:8080
```

### 开发模式

```bash
# 终端 1：启动后端
uvicorn backend.app:app --host 0.0.0.0 --port 8080

# 终端 2：启动前端开发服务器（自动代理 API）
cd frontend
npm run dev
# 访问 http://localhost:5173
```

## 项目结构

```
pokedex/
├── backend/
│   └── app.py              # FastAPI 后端 API
├── frontend/
│   ├── src/
│   │   ├── api.js           # API 请求封装
│   │   ├── App.jsx          # 主应用组件
│   │   ├── index.css        # Tailwind + 自定义样式
│   │   ├── main.jsx         # 入口
│   │   └── components/
│   │       ├── Header.jsx       # 顶部导航
│   │       ├── SearchFilters.jsx # 搜索与筛选
│   │       ├── PokemonGrid.jsx   # 宝可梦网格 + 分页
│   │       ├── PokemonCard.jsx   # 单个宝可梦卡片
│   │       ├── PokemonDetail.jsx # 详情弹窗（种族值/招式/进化链）
│   │       └── TypeChart.jsx     # 属性克制表
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── src/pokedex/
│   ├── db.py               # 数据库 schema 和查询
│   ├── fetcher.py          # PokeAPI 异步数据抓取
│   └── cli.py              # CLI 界面
├── data/
│   └── pokedex.db          # SQLite 数据库（本地生成）
├── pyproject.toml
└── README.md
```

## API 接口

| 端点 | 说明 |
|------|------|
| `GET /api/pokemon` | 宝可梦列表（搜索/筛选/分页） |
| `GET /api/pokemon/{id}` | 详情（种族值/特性/招式/进化链） |
| `GET /api/types` | 属性列表 |
| `GET /api/type-matchup` | 属性克制矩阵 |
| `GET /api/stats` | 数据统计 |

## 数据覆盖

| 类别 | 数量 |
|------|------|
| 宝可梦 | 1025 |
| 属性 | 21 |
| 特性 | 371 |
| 招式 | 937 |
| 进化链 | 541 |

## License

MIT
