# SAV-1 Bing SEO 流量下滑复核

日期：2026-08-23

## 结论

流量下滑真实存在，但目前没有证据支持“单一算法更新”或“单次代码提交”是根因。

- 高置信：当前观察窗口内，2026-06-26 出现第一处明显断点，曝光下降同时伴随 CTR 大幅下降。
- 高置信：2026-07-24 后出现第二阶段下滑，主要表现为曝光继续收缩。
- 高置信：不是整站宕机、抓取失败或大规模去索引。
- 中置信：通用头部词的排名、曝光和点击同时流失，是已能量化的主要组成部分；但四个头部词只解释了部分总降幅。
- 中置信：页面规模扩张、模板化标题、弱外链和同质竞争增加了 Bing 重新评估时的风险。
- 未证实：May 26 扩页是直接原因、CTR 下滑由摘要文案单独造成、Bing 在断点当天进行了算法更新。

## Bing Webmaster 数据

### 日级断点

| 周期 | 日均点击 | 日均曝光 | CTR |
|---|---:|---:|---:|
| 06-12–06-25 | 479.9 | 5,121 | 9.37% |
| 06-26–07-09 | 204.3 | 4,186 | 4.88% |
| 06-24–07-23 | 234.3 | 4,363 | 5.37% |
| 07-24–08-21 | 149.2 | 2,834 | 5.26% |

第一断点前后：点击 -57.4%，曝光 -18.3%，CTR -4.49 个百分点。CTR 变化可能由排名、查询结构、SERP 形态和摘要共同造成，不能仅凭该指标归因到 meta description。

第二阶段按日归一化：点击 -36.3%，曝光 -35.0%。

### 查询级证据

Bing 的 07-24–08-22 对比 06-24–07-23：

| 查询 | 曝光变化 | 点击变化 | CTR 变化 | 平均排名变化 |
|---|---:|---:|---:|---:|
| `save editor` | -11.3K | -266 | -0.97pp | +0.49 |
| `save edit online` | -2.5K | -81 | -0.90pp | +0.75 |
| `存档修改器` | -2.5K | -175 | -2.31pp | +2.23 |
| `save editor online` | -3.5K | -84 | -1.07pp | +1.41 |

四词合计损失约 19.8K 曝光、606 点击。`rmmzsave文件修改`基本持平，`rpgsave存档修改器`点击增加，说明并非所有需求或所有页面同步下滑。

## 排除项与风险项

### 已排除

- Bing Site Explorer：564 个已索引 URL、0 错误、0 警告、33 个排除 URL。
- Sitemap：成功，428 个 URL；对线上 sitemap 的 428 个 canonical URL 实测全部 HTTP 200，canonical 全部自洽。
- 根页和 Bingbot User-Agent 均返回 HTTP 200。
- 06-26 前没有紧邻断点的仓库提交；06-30 与 07-07 的元数据提交发生在断点之后，不能解释首轮下滑。

### 仍然存在的风险

- Bing Recommendations：140 页共 142 项，包括 34 个过长标题、1 个缺失 H1、70 个过短描述、35 个 ALT 问题，以及有限抓取能力和低质量外链不足。
- 按“标题超过 70 字符、描述少于 150 字符”的同一长度启发式，线上全量复核得到 123 个长标题、224 个短描述、7 个 ingest 缺失 H1、1 个 compatibility 重复 H1。该结果覆盖全部 sitemap URL；长度启发式不等同于 Bing 的内部阈值，Bing Recommendations 只覆盖其已扫描并列出的子集。
- Site Explorer 仅显示 29 个外链；这会削弱通用高竞争词的抗波动能力。
- 当前搜索结果已有多个直接竞争站点提供相同的浏览器端编辑、自动检测和本地处理能力。现状能证明竞争强，但不能反推这些站点在 06-26 当天首次出现。
- `www.saveeditor.top` 仍以 HTTP 200 返回重复内容；canonical 指向 apex，但主机级 301 尚未配置。

## 代码复核与整改

### 保留

- `/ingest/` 及六个本地化 ingest 页面改为 SSR + hydration，修复七个结构相同的缺失 H1。
- compatibility Markdown 的标题降为 H2，修复页面已有 H1 时的重复 H1。
- 英文首页保留头部查询前置标题，并将描述调整为 154 字符、与页面能力一致。
- 中文首页将损失最大的查询 `存档修改器`前置到标题；描述调整为 160 字符，并明确兼容边界、备份和验证流程。

### 撤销

撤销 BaseLayout 的全站自动截断和自动补写。复核发现该逻辑会修改 305 个页面，并给 About、Privacy、Terms 等页面追加并不存在的“格式兼容/备份流程”描述；这违反页面意图一致性，也超过 Bing 已报告问题范围。

### 回归面

与纯净 HEAD 构建产物逐页对比后，本次 SEO 输出差异仅限英文/中文首页的 title 与 description，以及 7 个 ingest 页面和 1 个 compatibility 页面的 H1；没有改写其他页面的 title、description 或 canonical。整改后 429 个构建 HTML 均只有一个 H1，canonical 均存在。

### 不贸然执行

- 不删除 URL、不批量 noindex、不回滚 May 26 内容扩张。
- 不把 123 个长标题机械截断；先从 Bing 导出实际问题 URL，并结合页面点击/曝光逐页改写。
- 不把 meta description 当作排名修复；它主要用于改善摘要相关性和 CTR。

## 部署与验证门槛

1. 部署当前两处核心落地页元数据和 H1 修复。
2. 在 Cloudflare 配置 `www.saveeditor.top` → `https://saveeditor.top` 的 301 Bulk Redirect，保留路径和查询参数。
3. 请求 Bing 重抓首页、中文首页、ingest 和 compatibility。
4. 观察完整 30 天；对比四个头部词、`/`、`/zh-cn/`、索引/排除数和 Recommendations。
5. 只有页面级数据证明收益后，才扩展标题/描述改写范围。

## 官方依据

- [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)
- [How Bing chooses titles for web search results](https://blogs.bing.com/webmaster/august-2020/How-Bing-Chooses-Titles-for-Web-Search-Results)
- [Why won’t Bing use my meta description?](https://blogs.bing.com/webmaster/May-2020/Why-won%E2%80%99t-Bing-use-my-meta-description)
- [Duplicate content: Why it matters and how to fix it](https://blogs.bing.com/webmaster/december-2025/Duplicate-Content-Why-It-Matters-and-How-to-Fix-It)
- [Cloudflare Pages：重定向 www 到 apex](https://developers.cloudflare.com/pages/how-to/www-redirect/)
