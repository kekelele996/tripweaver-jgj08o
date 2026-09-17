# TripWeaver 旅游行程规划助手

## 快速启动

```bash
pnpm install
pnpm dev
```

访问地址：http://localhost:18417

TripWeaver 是一款纯前端旅行规划应用，支持创建旅行、探索景点、编排每日行程、预算统计和分享预览。

## 主要功能

- 我的旅行：创建、筛选、删除旅行计划。
- 行程详情：查看每日行程、预算图表和共享时间线。
- 景点探索：按 SpotCategory 搜索和筛选，收藏并加入行程。
- 行程编排：SortableJS 拖拽排序，实时影响预算计算。
- 分享预览：生成可复制的行程文本。
- 跨时区会合倒计时（`/rendezvous`）：登记每位参与者的出发地 IANA 时区、通勤分钟与锁定状态，按集合时间倒推最晚出发时刻并展示个人/会合倒计时。

## 跨时区会合倒计时

访问地址：`http://localhost:18417/rendezvous`（导航栏「会合倒计时」为唯一页面入口）。

- 集合时间以 **UTC 绝对时刻** 存储，表单按所选时区填写墙钟时间；IANA 时区换算与夏令时由 `utils/timezone.ts` 通过 `Intl.DateTimeFormat` 处理。
- 最晚出发时刻 = 集合时刻 − 通勤分钟。**未锁定者**随集合时间更新自动重算；**锁定者**保留锁定时冻结的原值，修改其出发地时区或通勤分钟也不会改动该值。
- **唯一执行入口**：页面所有写操作（新建、改集合时间、登记/编辑参与者、切换锁定）都只调用 `useRendezvousStore().commit(draft)`，其内部调用纯函数事务 `commitRendezvous(prev, draft)`（`utils/rendezvousEngine.ts`）。
- **整次保存失败**：若新集合时间会让任一锁定者无法按时到达（冻结的出发时刻 + 其通勤分钟 > 新集合时刻），事务抛出 `RendezvousConflictError`，store 不替换状态、不写 localStorage，旧集合时间、锁定状态和全部倒计时保持不变，页面展示冲突名单。
- **刷新回读一致**：成功保存时原子写入 localStorage（键 `tripweaver-v1:rendezvous`，见 `api/rendezvousApi.ts`），刷新后 store 初始值即上次成功保存的快照。
- 规格测试：`pnpm test:rendezvous`（覆盖倒推、冻结、冲突回滚、DST 换算、刷新回读，共 12 项断言）。

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 前端 | Vue 3 + TypeScript |
| 构建 | Vite |
| UI | Element Plus + ECharts |
| 状态 | Pinia |
| 路由 | Vue Router 4 |
| 持久化 | localStorage + Dexie.js |
| 交互 | sortablejs |

## 目录结构

```
src/
├── api/
├── stores/
├── models/
├── types/
├── components/common/
├── hooks/
├── pages/
├── router/
├── utils/
├── config/
└── constants/
```

跨时区会合倒计时新增文件（沿用同一分层）：

```
src/models/rendezvous.ts                  # Rendezvous / RendezvousParticipant 模型
src/constants/rendezvous.ts               # 常用 IANA 时区、默认通勤分钟、刷新间隔
src/api/rendezvousApi.ts                  # localStorage 回读 / 写入
src/stores/rendezvousStore.ts             # 唯一写入口 commit(draft)
src/utils/rendezvousEngine.ts             # 纯函数事务：倒推 / 冻结 / 冲突检测
src/utils/timezone.ts                     # IANA 时区、DST、墙钟时间 <-> 绝对时刻
src/utils/countdown.ts                    # 倒计时拆分与格式化
src/hooks/useNow.ts                       # 每秒 tick 驱动倒计时
src/components/common/RendezvousSummary.vue
src/components/common/ParticipantRow.vue
src/pages/Rendezvous.vue
scripts/rendezvous.spec.ts                # 规格测试（pnpm test:rendezvous）
```

## 数据持久化

本地数据通过 `utils/storage.ts` 统一写入 localStorage，并保留 Dexie 数据库对象用于后续 IndexedDB 扩展。版本键来自 `constants/storageVersion.ts`。

## 环境变量

`VITE_AMAP_KEY`：高德地图 key。未配置时使用 demo-key，地图主题配置同时出现在 `config/map.ts`、`SpotCard`、`DayTimeline`、`Planner` 相关逻辑中。

## 枚举出现位置清单

SpotCategory：
- `src/constants/spot.ts`
- `src/models/spot.ts`
- `src/stores/spotStore.ts`
- `src/components/common/CategoryFilter.vue`
- `src/components/common/SpotCard.vue`
- `src/pages/Spots.vue`
- `src/pages/TripDetail.vue`
- `src/utils/formatters.ts`
- `src/router/guards.ts`

TripStatus：
- `src/constants/trip.ts`
- `src/models/trip.ts`
- `src/stores/tripStore.ts`
- `src/components/common/TripCard.vue`
- `src/pages/Trips.vue`
- `src/utils/formatters.ts`
- `src/router/guards.ts`

## License

MIT

