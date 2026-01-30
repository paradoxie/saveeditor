# Web 项目 SEO 架构完美审核清单

> 📋 通用的 SEO 技术审核框架，用于检查 Web 项目是否达到最佳实践标准。

---

## 目录

1. [基础元数据层](#一基础元数据层-meta-layer)
2. [国际化层](#二国际化层-i18n-layer)
3. [结构化数据层](#三结构化数据层-schemaorg--json-ld)
4. [URL 与路由层](#四url-与路由层-routing-layer)
5. [爬虫控制层](#五爬虫控制层-crawl-control)
6. [索引状态与日志](#六索引状态与日志-indexing-reality)
7. [渲染与可索引性](#七渲染与可索引性-rendering)
8. [性能层](#八性能层-core-web-vitals)
9. [可访问性层](#九可访问性层-accessibility)
10. [内容层](#十内容层-content-quality)
11. [分页与参数层](#十一分页与参数层-pagination--facets)
12. [媒体与资产层](#十二媒体与资产层-imagesvideo)
13. [安全与信任信号](#十三安全与信任信号-trust)
14. [结构化数据一致性](#十四结构化数据一致性-schema-consistency)

---

## 一、基础元数据层 (Meta Layer)

**权重：15%**

| 检查项 | 完美标准 | 常见问题 |
| :--- | :--- | :--- |
| **Title 标签** | 每页唯一、含关键词、50-60字符、品牌名在后 | 重复、过长被截断、关键词堆砌 |
| **Meta Description** | 每页唯一、含 CTA、120-160字符 | 未填写、与内容不符、重复 |
| **Canonical URL** | 每页有且仅有一个、指向自身或权威版本 | 缺失、指向错误页面、循环引用 |
| **Open Graph** | `og:title`, `og:description`, `og:image`, `og:url` 全部存在 | 缺少 `og:image` 导致分享无预览图 |
| **Twitter Cards** | `twitter:card`, `twitter:title`, `twitter:description` | 使用错误的 card 类型 |
| **Viewport** | `<meta name="viewport" content="width=device-width, initial-scale=1">` | 移动端无法正常缩放 |
| **Charset** | `<meta charset="UTF-8">` 在 `<head>` 最开始 | 字符编码问题导致乱码 |

### 检查命令

```bash
curl -s https://example.com | grep -E '<title>|<meta name="description"|<link rel="canonical"'
```

---

## 二、国际化层 (i18n Layer)

**权重：15%**

| 检查项 | 完美标准 | 常见问题 |
| :--- | :--- | :--- |
| **Hreflang 标签** | 所有语言版本页面互相引用、含 `x-default` | 单向引用、路径错误、语言代码错误 |
| **Hreflang 一致性** | A→B 且 B→A (双向确认) | `/en/page` 指向 `/ja/page`，但 `/ja/page` 没有指回 |
| **语言代码格式** | ISO 639-1 (`en`, `ja`) 或带地区 (`zh-CN`, `pt-BR`) | 使用非标准代码如 `jp` 或 `chinese` |
| **URL 结构统一** | 语言在子目录 (`/ja/`) 或子域名 (`ja.example.com`)，全站一致 | 混用：`/ja/about` 但 `/blog/ja/article` |
| **`lang` 属性** | `<html lang="ja">` 与页面内容匹配 | 所有页面都写 `lang="en"` |

### 正确的 Hreflang 示例

```html
<!-- 在英文页面 /about -->
<link rel="alternate" hreflang="en" href="https://example.com/about" />
<link rel="alternate" hreflang="ja" href="https://example.com/ja/about" />
<link rel="alternate" hreflang="zh-CN" href="https://example.com/zh-cn/about" />
<link rel="alternate" hreflang="x-default" href="https://example.com/about" />
```

---

## 三、结构化数据层 (Schema.org / JSON-LD)

**权重：15%**

| 检查项 | 完美标准 | 常见问题 |
| :--- | :--- | :--- |
| **站点级 Schema** | `WebSite` (含 SearchAction)、`Organization` | 完全缺失 |
| **页面级 Schema** | 根据内容类型选择：`Article`, `Product`, `SoftwareApplication`, `FAQPage`, `HowTo`, `BreadcrumbList` | 类型错误、属性不完整 |
| **必填属性** | 通过 Google Rich Results Test 验证 | 缺少必填字段如 `author`、`datePublished` |
| **嵌套正确性** | JSON-LD 语法正确、`@context` 和 `@type` 存在 | 手写 JSON 时括号/逗号错误 |

### 推荐 Schema 类型

| 页面类型 | 推荐 Schema |
| :--- | :--- |
| 首页 | `WebSite`, `Organization`, `SoftwareApplication` (如果是工具站) |
| 博客文章 | `Article` 或 `BlogPosting`, `BreadcrumbList` |
| 产品页 | `Product`, `Offer`, `AggregateRating` |
| FAQ 页面 | `FAQPage` |
| 教程页面 | `HowTo` |
| 联系页面 | `Organization`, `ContactPoint` |

### SoftwareApplication 示例

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "My App",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "Web Browser",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

---

## 四、URL 与路由层 (Routing Layer)

**权重：10%**

| 检查项 | 完美标准 | 常见问题 |
| :--- | :--- | :--- |
| **Trailing Slash 一致性** | 全站统一（要么全有 `/`，要么全无） | `/about` 和 `/about/` 都可访问 (重复内容) |
| **URL 可读性** | 使用 `-` 分隔、小写、含关键词 | 使用 `_` 或 CamelCase、含参数 `?id=123` |
| **无死链** | 所有内部链接返回 2xx | 返回 404、500 |
| **重定向链** | 最多 1 次重定向 | A→B→C→D 链式重定向 |
| **HTTPS** | 全站 HTTPS、HTTP 自动 301 重定向到 HTTPS | 混合内容、证书错误 |

### Astro 配置示例

```js
// astro.config.mjs
export default defineConfig({
  trailingSlash: 'always', // 或 'never'
  site: 'https://example.com',
});
```

---

## 五、爬虫控制层 (Crawl Control)

**权重：10%**

| 检查项 | 完美标准 | 常见问题 |
| :--- | :--- | :--- |
| **robots.txt** | 位于根目录、允许重要内容、禁止无价值路径 | 意外 Disallow 整站、未声明 Sitemap |
| **Sitemap XML** | 列出所有重要页面、`<lastmod>` 准确、`<loc>` 都可访问 | 包含 404 页面、lastmod 总是当前日期 |
| **Sitemap 提交** | 已在 Google Search Console 和 Bing Webmaster 提交 | 未提交或状态为"无法读取" |
| **IndexNow** (可选) | 内容更新时主动推送 URL 到 Bing/Yandex | 未实现主动索引 |

### 标准 robots.txt 模板

```txt
User-agent: *
Allow: /

# 禁止爬取的路径
Disallow: /api/
Disallow: /admin/
Disallow: /_astro/

# Sitemap
Sitemap: https://example.com/sitemap-index.xml
```

---

## 六、索引状态与日志 (Indexing Reality)

| 检查项 | 完美标准 | 常见问题 |
| :--- | :--- | :--- |
| **GSC 覆盖率** | 重要页面"已编入索引"占比高 | 大量"已发现未编入"或"已抓取未编入" |
| **Google 选定 Canonical** | 与页面声明一致 | Google 选择了不同 Canonical |
| **软 404** | 不存在页面返回真实 404/410 | 返回 200 但内容为空 |
| **抓取统计** | 抓取量稳定、无异常尖峰 | 突然下降或异常高峰 |

---

## 七、渲染与可索引性 (Rendering)

| 检查项 | 完美标准 | 常见问题 |
| :--- | :--- | :--- |
| **SSR/静态输出** | 关键内容在 HTML 源码中可见 | 只靠 JS 渲染导致抓取不到内容 |
| **noscript 回退** | 关键入口有基础文本/链接 | JS 关闭后页面空白 |
| **关键内容加载** | 首屏文本、标题可被爬虫直接看到 | 首屏内容延迟注入 |

---

## 八、性能层 (Core Web Vitals)

**权重：15%**

| 检查项 | 完美标准 | 常见问题 |
| :--- | :--- | :--- |
| **LCP (Largest Contentful Paint)** | < 2.5s | 首屏大图未优化、CSS 阻塞渲染 |
| **INP (Interaction to Next Paint)** | < 200ms | 大量 JS 阻塞主线程 |
| **CLS (Cumulative Layout Shift)** | < 0.1 | 图片无尺寸、动态插入广告 |
| **Font 加载** | `font-display: swap` 或 `optional` | FOIT (Flash of Invisible Text) |
| **图片优化** | WebP/AVIF、响应式 `srcset`、懒加载 | 使用未压缩的 PNG/JPG |
| **Preconnect/Preload** | 预连接第三方域名、预加载关键资源 | 未优化第三方脚本加载顺序 |

### 性能优化代码片段

```html
<!-- Preconnect 第三方域名 -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- 图片懒加载 -->
<img src="image.webp" loading="lazy" alt="Description" width="800" height="600" />
```

---

## 九、可访问性层 (Accessibility)

**权重：10%**

| 检查项 | 完美标准 | 常见问题 |
| :--- | :--- | :--- |
| **语义化 HTML** | 使用 `<header>`, `<main>`, `<nav>`, `<article>`, `<footer>` | 全部是 `<div>` |
| **Heading 层级** | 每页一个 `<h1>`、层级递进 (h1→h2→h3) | 跳级使用、多个 h1 |
| **Alt 文本** | 所有 `<img>` 有描述性 alt | 留空或使用"图片" |
| **Skip Link** | 页面顶部有跳转到主内容的隐藏链接 | 缺失 |
| **键盘导航** | 所有交互元素可用 Tab 键访问 | 自定义按钮无法聚焦 |
| **颜色对比度** | WCAG AA 标准 (4.5:1 for text) | 浅灰色文字难以阅读 |

---

## 十、内容层 (Content Quality)

**权重：10%**

| 检查项 | 完美标准 | 常见问题 |
| :--- | :--- | :--- |
| **内容唯一性** | 每个 URL 内容独特、无重复 | 分页参数产生重复内容 |
| **Thin Content** | 每页有足够的原创、有价值的文字内容 | 页面只有几行字或纯图片 |
| **E-E-A-T 信号** | 作者信息、发布日期、引用来源、关于我们页面 | 匿名发布、无联系方式 |
| **内部链接** | 相关页面互相链接、使用描述性锚文本 | 使用"点击这里"作为锚文本 |
| **外部链接** | 权威来源、`rel="noopener"` for `target="_blank"` | 链接到垃圾站点 |

---

## 十一、分页与参数层 (Pagination & Facets)

| 检查项 | 完美标准 | 常见问题 |
| :--- | :--- | :--- |
| **分页策略** | 分页 URL 结构清晰、可抓取 | `/page/2` 与 `?page=2` 混用 |
| **参数去重** | 过滤/排序参数有 canonical 或 noindex | 参数组合无限增殖 |
| **站内搜索** | 搜索结果默认 noindex | 搜索页被大量收录 |

---

## 十二、媒体与资产层 (Images/Video)

| 检查项 | 完美标准 | 常见问题 |
| :--- | :--- | :--- |
| **图片可索引** | `alt` 描述清晰、可被抓取 | 缺少 alt 或被阻止抓取 |
| **Image Sitemap** | 图片型站点提供 image sitemap | 图片被发现率低 |
| **视频结构化** | 重要视频有 VideoObject | 视频无缩略图或无法解析 |

---

## 十三、安全与信任信号 (Trust)

| 检查项 | 完美标准 | 常见问题 |
| :--- | :--- | :--- |
| **HTTPS/HSTS** | 强制 HTTPS 并开启 HSTS | 混合内容或可降级 |
| **隐私/条款可达** | 隐私/条款页面可访问 | 404 或被阻止抓取 |

---

## 十四、结构化数据一致性 (Schema Consistency)

| 检查项 | 完美标准 | 常见问题 |
| :--- | :--- | :--- |
| **类型冲突** | 同页 schema 不冲突 | 多套插件产生互斥类型 |
| **重复声明** | 避免重复 JSON-LD | 同类型重复多次 |

---

## 🛠️ 推荐的审核工具

| 层级 | 工具 | 链接 |
| :--- | :--- | :--- |
| **综合爬取** | Screaming Frog SEO Spider | https://www.screamingfrog.co.uk/seo-spider/ |
| **综合爬取** | Ahrefs Site Audit | https://ahrefs.com/site-audit |
| **结构化数据** | Google Rich Results Test | https://search.google.com/test/rich-results |
| **结构化数据** | Schema Markup Validator | https://validator.schema.org/ |
| **性能** | PageSpeed Insights | https://pagespeed.web.dev/ |
| **性能** | WebPageTest | https://www.webpagetest.org/ |
| **国际化** | Hreflang Tags Testing Tool | https://technicalseo.com/tools/hreflang/ |
| **可访问性** | axe DevTools | https://www.deque.com/axe/ |
| **可访问性** | WAVE | https://wave.webaim.org/ |
| **移动端** | Google Mobile-Friendly Test | https://search.google.com/test/mobile-friendly |

---

## 📋 快速自检流程

### 1. 自动化爬取

```bash
# 使用 Screaming Frog 或类似工具爬取全站
# 导出 CSV 检查：
# - 状态码 (寻找 4xx, 5xx)
# - Title 和 Description 长度
# - H1 标签
# - Canonical URL
```

### 2. 随机抽样检查

```bash
# 随机选择 5 个不同类型的页面，查看源码验证：
curl -s https://example.com/page | grep -E 'hreflang|application/ld\+json|og:image|canonical'
```

### 3. 结构化数据验证

```bash
# 使用 Google Rich Results Test 验证每种页面类型
# - 首页
# - 博客文章
# - 产品/工具页面
# - FAQ 页面
```

### 4. 性能测试

```bash
# 使用 Lighthouse CLI
npx lighthouse https://example.com --view

# 或使用 PageSpeed Insights API
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com"
```

### 5. Search Console 验证

- 检查"已发现"vs"已编入索引"的比例
- 查看"网页体验"报告
- 检查"增强功能"中的结构化数据状态

---

## 🔄 持续监控建议

1. **每周**：检查 Google Search Console 的索引状态和错误
2. **每月**：运行完整的 Screaming Frog 爬取
3. **每次发布**：验证新页面的 Schema 和 hreflang
4. **每季度**：全面 SEO 审核 + 竞品分析
