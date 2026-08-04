# 日本行程網站 — 實作導入規格書

> **Plan B 架構**:Google Sheets(唯一資料來源)→ GitHub Actions build time 經 Sheets API 拉取 → Next.js SSG 靜態網站 → GitHub Pages
>
> 版本:v1.0(2026-08-04)/ 行程日期:2026/12/14(一)– 12/19(六)

---

## 1. 專案概述

### 1.1 目標

- 行程資料**只在 Google Sheets 維護**(含手機 App 編輯),不需要自建編輯 UI 與資料庫
- 靜態網站部署於 GitHub Pages,**mobile-first**,旅途中作為主要查閱介面
- 更新流程零人工檔案搬運:改完 Sheets 後,以 GitHub 手機 App 手動觸發 rebuild,或等每日排程自動 rebuild
- 支援 PWA 離線瀏覽(日本路上無網路也能看行程)

### 1.2 範圍

| In Scope                                         | Out of Scope                            |
| ------------------------------------------------ | --------------------------------------- |
| Sheets API 資料拉取 script(含驗證與敏感欄位過濾) | 網站上直接編輯資料(寫回 Sheets)         |
| Next.js SSG 前端(總覽/每日/Backlog 頁)           | 使用者登入、授權機制                    |
| GitHub Actions CI/CD + Pages 部署                | 即時更新(改 Sheets 即刻反映;需 rebuild) |
| PWA 離線快取                                     | 多語系                                  |

### 1.3 已定案決策

| 決策        | 選擇                                        | 理由                                                                                |
| ----------- | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| 前端技術    | Next.js 15 App Router + `output: 'export'`  | 符合主力 stack;可重用為未來旅行模板                                                 |
| UI 元件庫   | Chakra UI v3(取代 Tailwind)                 | prototype 依 Chakra 元件解剖設計,實作一比一對應;Chakra 自帶樣式系統,不再疊 Tailwind |
| 敏感欄位    | **build 時過濾**,不進入靜態產物             | Pages 為公開網站;PNR/訂單編號需要時回 Sheets 查                                     |
| 資料來源    | Google Sheets API(service account)          | 試算表不需公開發佈;editing UX 直接用 Sheets                                         |
| 觸發方式    | `workflow_dispatch` + 每日 cron + push main | 手動即時 + 自動兜底                                                                 |
| UI 設計流程 | Claude Design 先行定稿,再移植實作           | 以真實 design system + 逐輪視覺回饋去除 AI 感;實作階段不做視覺決策                  |

---

## 2. 系統架構

```
┌──────────────────┐        ┌─────────────────────────────────────────┐
│  Google Sheets    │        │  GitHub Actions (deploy.yml)             │
│  (唯一資料來源)     │        │                                          │
│  編輯:Web/手機App  │◄───────┤ 1. fetch:scripts/fetch-sheet.ts          │
└──────────────────┘ Sheets │    - service account 認證                 │
                       API   │    - 讀取 7 個 tab → 解析                 │
                             │    - zod 驗證 + 敏感欄位過濾               │
                             │    - 輸出 data/trip-data.json            │
                             │ 2. lint + type-check                     │
                             │ 3. next build (SSG, output: 'export')    │
                             │ 4. actions/deploy-pages                  │
                             └────────────────┬────────────────────────┘
                                              ▼
                             ┌─────────────────────────────────────────┐
                             │  GitHub Pages(靜態網站 + PWA)            │
                             │  https://<user>.github.io/<repo>/       │
                             └─────────────────────────────────────────┘
```

**元件職責**

- **Google Sheets**:資料存儲與編輯介面。schema 見 §3.1,由 `aaa.xlsx` 匯入建立
- **`scripts/fetch-sheet.ts`**:唯一的資料邊界。所有驗證、正規化、敏感欄位過濾都在這一層完成;下游(Next.js)只信任 `trip-data.json`
- **Next.js**:純靜態產出,`getStaticProps` 等 build time 讀 `trip-data.json`,無 runtime API 呼叫
- **GitHub Actions**:唯一的部署路徑;fetch 失敗即中止,不部署過期或不完整資料

---

## 3. 資料層規格

### 3.1 Google Sheets Schema(與 `aaa.xlsx` 一致)

試算表共 7 個 tab:`Backlog` + 6 個日期 tab(`12.14 (一)` ~ `12.19 (六)`)。

#### 3.1.1 每日 tab(×6)

| 區塊     | 儲存格範圍  | 內容                                                                        |
| -------- | ----------- | --------------------------------------------------------------------------- |
| 資訊區塊 | `A1:D4`     | A 欄為標籤(日期/當日主要活動區域/當晚住宿/當日重點 提醒),B 欄為值(B~D 合併) |
| 行程表頭 | `A7:J7`     | 10 欄,見下表                                                                |
| 行程資料 | `A8` 起往下 | 讀到第一個整列空白為止(**不可假設固定 15 列**,使用者會在 Sheets 增列)       |

行程表欄位(A→J):

| #   | 欄位            | 型別               | 說明                                                          |
| --- | --------------- | ------------------ | ------------------------------------------------------------- |
| A   | 時段            | string             | 如 `10:00-12:00`,自由格式                                     |
| B   | 類型            | enum               | `景點/餐廳/咖啡\/甜點/購物/交通/住宿/體驗\/活動`(Sheets 下拉) |
| C   | 名稱            | string             | 必填;整列是否為空以此欄判斷                                   |
| D   | 區域            | string             |                                                               |
| E   | 交通方式 / 車程 | string             |                                                               |
| F   | 營業時間        | string             |                                                               |
| G   | 預估費用 (¥)    | number \| null     | 非數字視為 null                                               |
| H   | 預約狀態        | enum               | `不需預約/待預約/已預約/候補中`                               |
| I   | 地圖 / 官網連結 | string(URL)\| null |                                                               |
| J   | 備註            | string             |                                                               |

#### 3.1.2 Backlog tab(4 個表格,固定起始列)

| 表格            | 表頭列    | 資料起始列 | 欄位(依序)                                                                                                                   |
| --------------- | --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| ✈️ 機票資訊     | `A2:M2`   | 3          | 方向, 日期, 航空公司, 航班編號, 出發機場, 出發時間, 抵達機場, 抵達時間, 航廈, **訂位代號 (PNR)**, 票價 (TWD), 行李額度, 備註 |
| 🏨 房間資訊     | `A8:M8`   | 9          | 住宿名稱, 區域, 入住日, 退房日, 晚數, 房型 / 人數, 總價, 訂房平台, **訂單編號**, 付款狀態, 免費取消期限, 地址 / 連結, 備註   |
| 🎢 環球影城資訊 | `A15:J15` | 16         | 項目, 使用日期, 票種 / 名稱, 張數, 單價, 總價, 購買平台, 購買狀態, 取票 / 入場方式, 備註                                     |
| 🏠 民宿口袋名單 | `A22:L22` | 23         | 名稱, 區域 / 最近車站, 距車站步行, 房型 / 可住人數, 每晚價格, 總價 (估), 評分, 優點, 缺點, 連結, 狀態, 備註                  |

> 各表格資料列同樣「讀到整列空白為止」,但**不可越過下一個表格的表頭列**(依上表列號為邊界)。若使用者在 Sheets 中新增超出邊界的列,fetch script 應報錯提示調整 schema 常數。

#### 3.1.3 Schema 漂移防護

fetch 時先讀各表頭列,**逐欄比對預期欄名**(完全相符);不符即 `process.exit(1)` 並列出差異。避免使用者在 Sheets 改欄名/搬欄位後,資料被靜默對錯欄。

### 3.2 敏感欄位過濾(CRITICAL)

以下欄位**在 fetch 層即丟棄**,不得出現在 `trip-data.json`、TypeScript 型別、或任何靜態產物中:

| 表格     | 欄位           |
| -------- | -------------- |
| 機票資訊 | 訂位代號 (PNR) |
| 房間資訊 | 訂單編號       |

實作方式:解析函式的回傳型別中**不存在**這些欄位(型別層面保證,而非 runtime 刪 key)。CI 加驗證步驟:`grep -r` 檢查 `out/` 產物不含這些欄位名(見 §8)。

### 3.3 GCP 前置作業(一次性,手動)

1. GCP Console 建立專案(如 `japan-trip-site`)
2. 啟用 **Google Sheets API**(唯讀用途,不需 Drive API)
3. 建立 service account(角色留空,不需 GCP 權限),建立 JSON key 並下載
4. 在 Google Sheets 將試算表「共用」給 service account 的 email(**檢視者**權限即可 — 最小權限)
5. GitHub repo → Settings → Secrets and variables → Actions 新增:

| Secret                        | 內容                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `GOOGLE_SERVICE_ACCOUNT_KEY`  | service account JSON key 全文                                                |
| `SHEET_ID`                    | 試算表 URL 中 `/d/` 與 `/edit` 之間的 ID                                     |
| `NEXT_PUBLIC_GMAPS_EMBED_KEY` | Maps Embed API key(§4.3 地圖;會內嵌於前端屬公開值,以 HTTP referrer 限制網域) |

> GCP 專案需同時啟用 **Google Sheets API** 與 **Maps Embed API**(後者免費、無用量計費)。

> JSON key 檔**不得**進版控;本機開發放專案外路徑,以環境變數指向。`.gitignore` 需含 `*.json` key 檔與 `data/trip-data.json`(產物由 CI 產生,避免 stale 資料進版控誤導)。

### 3.4 `scripts/fetch-sheet.ts`

- 依賴:`googleapis`(auth: JWT with `https://www.googleapis.com/auth/spreadsheets.readonly` scope)、`zod`
- 輸入環境變數:`GOOGLE_SERVICE_ACCOUNT_KEY`(JSON 字串)、`SHEET_ID`
- 使用 `spreadsheets.values.batchGet` 一次取回全部 range(7 個 tab),減少 API round trip
- 流程:batchGet → 表頭驗證(§3.1.3)→ 逐表解析 → zod parse → 寫出 `data/trip-data.json`
- 任何步驟失敗:印出明確錯誤(哪個 tab、哪一列、哪一欄)後 non-zero exit
- 每個函式明確回傳型別;禁用 `any`,未知輸入以 `unknown` 接再收斂

### 3.5 TypeScript 型別定義(`lib/types.ts`,由 zod schema `z.infer` 導出)

```typescript
export interface ItineraryItem {
  timeSlot: string;
  category:
    | "景點"
    | "餐廳"
    | "咖啡/甜點"
    | "購物"
    | "交通"
    | "住宿"
    | "體驗/活動"
    | null;
  name: string;
  area: string;
  transport: string;
  openingHours: string;
  estimatedCostJpy: number | null;
  reservationStatus: "不需預約" | "待預約" | "已預約" | "候補中" | null;
  link: string | null;
  note: string;
}

export interface TripDay {
  date: string; // ISO: '2026-12-14'
  weekdayZh: string; // '一' ~ '日'
  mainArea: string;
  accommodation: string;
  highlight: string;
  items: ItineraryItem[];
}

export interface Flight {
  direction: string;
  date: string;
  airline: string;
  flightNo: string;
  from: string;
  departTime: string;
  to: string;
  arriveTime: string;
  terminal: string;
  priceTwd: number | null;
  baggage: string;
  note: string;
  // 注意:無 PNR 欄位 — 敏感欄位於 fetch 層過濾(§3.2)
}

export interface Room {
  name: string;
  area: string;
  checkIn: string;
  checkOut: string;
  nights: number | null;
  roomType: string;
  totalPrice: string;
  platform: string;
  paymentStatus: string;
  freeCancelDeadline: string;
  addressOrLink: string;
  note: string;
  // 注意:無訂單編號欄位
}

export interface UsjTicket {
  item: string;
  useDate: string;
  ticketName: string;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  platform: string;
  purchaseStatus: string;
  redemption: string;
  note: string;
}

export interface BnbCandidate {
  name: string;
  areaStation: string;
  walkToStation: string;
  roomType: string;
  pricePerNight: string;
  totalPriceEst: string;
  rating: string;
  pros: string;
  cons: string;
  link: string | null;
  status: string;
  note: string;
}

export interface TripData {
  generatedAt: string; // ISO timestamp,顯示於網站 footer
  days: TripDay[];
  backlog: {
    flights: Flight[];
    rooms: Room[];
    usj: UsjTicket[];
    bnbCandidates: BnbCandidate[];
  };
}
```

---

## 4. 前端規格

### 4.1 技術與設定

- Next.js 15、App Router、TypeScript strict、Chakra UI v3、pnpm
- `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const repoName = "japan-trip-2026"; // 依實際 repo 名稱調整

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NODE_ENV === "production" ? `/${repoName}` : "",
  images: { unoptimized: true }, // 靜態匯出必要
  trailingSlash: true, // Pages 目錄式路由相容
};

export default nextConfig;
```

- 資料存取:`lib/trip-data.ts` 提供 `getTripData(): TripData`(Server Component 直接 import JSON,build time 內嵌),不做 runtime fetch

### 4.2 Routes

| Route                                    | 內容                                                                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                                      | 嵌入式 Google Map + 六天列表(日期/區域/住宿/當日花費小計)。進入或點擊「總覽」tab 時,依 client 端裝置日期自動 **focus 當天列**(捲動至該列 + 高亮),地圖同步定位該日「主要活動區域」;點擊其他日期列時地圖跟隨切換定位 |
| `/day/[date]`(×6,`generateStaticParams`) | 當日資訊區塊 + 行程 timeline                                                                                                                                                                                       |
| `/backlog`                               | 機票/房間/環球/民宿 四區塊(已過濾敏感欄位)                                                                                                                                                                         |

### 4.3 Mobile-first UI 需求

- **底部固定 tab bar**:`總覽 | 14 | 15 | 16 | 17 | 18 | 19 | Backlog`,當天日期自動 highlight(依裝置時間;僅行程期間內)
- **總覽頁地圖(Google Maps Embed API)**:iframe `place` mode,query 取 focus 日的「當日主要活動區域」;`loading="lazy"` 延遲載入;離線或載入失敗時顯示條紋 placeholder(PWA 離線時地圖不可用為已知限制)。採 Embed API 而非 Maps JavaScript API 的理由:免費無用量上限、純 iframe 與 SSG 靜態產出完全相容、不需引入 runtime SDK;API key 以 HTTP referrer 限制在 Pages 網域(key 本身即為公開值,限制網域即可)
- **行程卡片**:預設顯示 時段/類型 badge/名稱/區域;點擊展開 交通方式、營業時間、費用、預約狀態、備註
- **地圖連結**:`<a href>` 直接開啟 Google Maps(mobile 上喚起 App)
- **當日花費小計**:由 `items` 的 `estimatedCostJpy` 前端加總顯示於當日頁底部
- **預約狀態視覺化**:`待預約`/`候補中` 以醒目色標示(旅前待辦一目了然)
- **空狀態(No Data)**:當日無行程(或 Backlog 區塊無資料)時顯示瑪利歐問號方塊空狀態——**純 CSS 繪製**(黃色圓角方塊 + 四角鉚釘 + Press Start 2P 問號,不使用任天堂官方 sprite 素材以避免版權問題),附「這天還沒有行程」說明與「開啟 Google Sheets」連結;方塊帶 idle 頂跳微動畫
- **首次載入 splash(虛擬 loading)**:靜態站實際無請求,splash 為品牌動畫——問號方塊頂出金幣(CSS keyframes)+ 條紋進度條 + `LOADING...` 像素字 + 底部像素地面捲動;**時長固定 ~1.2s**,以 `sessionStorage` 限每 session 播一次,`prefers-reduced-motion` 使用者直接跳過;實作為 client component overlay,與 SSG 無衝突
- 觸控目標 ≥ 44px;深色模式跟隨系統(`prefers-color-scheme`)
- footer 顯示 `generatedAt`(「資料更新於 …」),讓使用者判斷是否需要手動 rebuild

### 4.4 UI 設計流程(Claude Design)

- 視覺定稿於 Claude Design 專案先行完成:https://claude.ai/design/p/ebfee8b1-2dd9-4568-b5d5-e57b18589ac5
- Prototype 使用**真實行程樣本資料**(非 lorem ipsum),涵蓋三個頁面(總覽/每日/Backlog)的 mobile viewport
- 回饋迴圈:使用者於 Claude Design web UI 對畫面留 comment → 修改 → 再審,直到 finalize
- 定稿後的移植原則:視覺 tokens 轉為 Chakra custom theme(`lib/theme.ts`),元件依 Chakra 元件解剖對應(Tag subtle variant、Card、Tabs 等);**實作階段不重新做視覺決策**,畫面以定稿 prototype 為準
- 已定稿色彩 tokens(dark mode,瑪利歐主題;使用者指定四個高飽和代表色**僅作強調色**,底色維持深色系):

| Token                                 | 值                                | 用途(語意)                                                |
| ------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| `bg` / `surface` / `surface2`         | `#12141D` / `#1A1D28` / `#202433` | 頁面底 / 卡片 / 強調卡片(地下關卡深藍夜色調)              |
| `text` / `dim` / `faint`              | `#EDEFF7` / `#A7ACBD` / `#6D7284` | 主文字 / 次要 / 弱化                                      |
| `yellow`(按鈕黃 `#FBD000`)            | 原色直用                          | 金幣語意:當日 highlight、active tab、時刻、金額總計、評分 |
| `red` / `red-t`(經典紅 `#E52521`)     | 原色作填色 / 文字提亮 `#F2635F`   | 警示語意:待預約、比價中、取消期限;機票登機證色帶          |
| `green` / `green-t`(經典綠 `#43B047`) | 填色 / 文字提亮 `#6FCE73`         | 成功語意:已預約、已付全額、已購買;住宿日期帶              |
| `blue` / `blue-t`(吊帶褲藍 `#049CD8`) | 填色 / 文字提亮 `#4FC0EC`         | 資訊語意:連結、當日抽 等中性提示                          |

- 字體:Noto Sans TC(內文)+ IBM Plex Mono(時刻、金額、代碼)+ **Press Start 2P**(僅限英文小標:eyebrow、星期、CHECK-IN/OUT、區段代號——8 bit 像素字型是瑪利歐主題的點題元素,限縮用量避免影響可讀性)
- 類型化卡片:機票 = 登機證樣式(色帶 + 虛線撕線 + 條碼)、住宿 = check-in/out 雙欄卡、USJ = 票根樣式列(虛線分隔 + 狀態 stub)、民宿 = 含 +/− 優缺點的比較卡

### 4.5 PWA

- `manifest.json`(name/icons/`display: standalone`/`start_url` 含 basePath)
- Service worker:precache 全部頁面與 assets(資料已內嵌於頁面,無額外 runtime 請求需快取);策略 stale-while-revalidate,新部署後下次開啟自動更新
- 實作選項:`@serwist/next`(next-pwa 後繼,支援 App Router);若相依問題則手寫 minimal SW(precache manifest 由 build script 產生)

---

## 5. CI/CD 規格(`.github/workflows/deploy.yml`)

### 5.1 觸發條件

```yaml
on:
  workflow_dispatch: {} # GitHub 手機 App 手動 rebuild(主要更新路徑)
  schedule:
    - cron: "0 21 * * *" # 每日 UTC 21:00 = 台灣 05:00 自動兜底
  push:
    branches: [main] # 程式碼變更即部署
```

### 5.2 Job 步驟

```
build-and-deploy:
  1. actions/checkout
  2. pnpm/action-setup + actions/setup-node(cache: pnpm)
  3. pnpm install --frozen-lockfile
  4. pnpm fetch-sheet          # 環境變數帶入兩個 Secrets;失敗 → 整個 job fail
  5. pnpm lint && pnpm type-check
  6. 敏感欄位檢查:grep 產物 JSON 不含 PNR/訂單編號欄名(fail fast)
  7. pnpm build                # next build → out/
  8. actions/upload-pages-artifact (path: out) → actions/deploy-pages
```

- permissions:`pages: write`、`id-token: write`(deploy-pages 官方流程);`contents: read`
- `concurrency: group: pages, cancel-in-progress: true`(連按 dispatch 只跑最後一次)
- **失敗策略**:fetch 或驗證失敗絕不部署(寧可留舊版網站,不部署錯誤資料);GitHub 預設 email 通知 workflow 失敗
- Repo Settings → Pages → Source 設為 **GitHub Actions**

### 5.3 `package.json` scripts

```json
{
  "scripts": {
    "fetch-sheet": "tsx scripts/fetch-sheet.ts",
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

---

## 6. Repo 結構

```
japan-trip-2026/
├── .github/workflows/deploy.yml
├── app/
│   ├── layout.tsx               # 含底部 tab bar、PWA meta
│   ├── page.tsx                 # 總覽 + 當天自動導向
│   ├── day/[date]/page.tsx      # generateStaticParams ×6
│   └── backlog/page.tsx
├── components/                  # ItineraryCard, BottomTabBar, StatusBadge, …
├── lib/
│   ├── types.ts                 # §3.5 型別(zod z.infer 導出)
│   ├── schema.ts                # zod schemas
│   ├── theme.ts                 # Chakra custom theme(§4.4 tokens)
│   └── trip-data.ts             # getTripData()
├── scripts/fetch-sheet.ts       # §3.4
├── data/trip-data.json          # CI 產生;gitignore
├── public/manifest.json
├── aaa.xlsx                     # 初始 schema 來源(匯入 Sheets 後僅作參考)
├── spec.md                      # 本文件
├── next.config.ts / tsconfig.json / .gitignore
└── package.json / pnpm-lock.yaml
```

---

## 7. 導入步驟

### Phase 0 — Sheets 與 GCP 設定(手動,約 20 分鐘)

- [x] `aaa.xlsx` 上傳 Google Drive → 另存為 Google 試算表,確認 7 個 tab、下拉選單正常
- [x] GCP:建專案 → 啟用 Sheets API → 建 service account + JSON key(§3.3)
- [x] 試算表共用給 SA email(檢視者)
- [ ] GitHub 建 repo,設定兩個 Secrets、Pages Source = GitHub Actions
- ✅ **驗收**:本機 `curl` 或臨時 script 以 SA 憑證讀取 sheet 成功回傳資料

### Phase 1 — fetch script

- [ ] 專案初始化(Next.js + TS strict + Tailwind + ESLint/Prettier)
- [ ] `lib/schema.ts`、`lib/types.ts`、`scripts/fetch-sheet.ts`
- ✅ **驗收**:`pnpm fetch-sheet` 產出合法 `trip-data.json`;PNR/訂單編號不在其中;改壞 Sheets 表頭時報錯且指出位置

### Phase 2a — UI 設計定稿(Claude Design)

- [ ] 選定視覺方向(基調/配色/密度)
- [ ] 三個頁面 mobile prototype(總覽/每日/Backlog),使用真實樣本資料(§4.4)
- [ ] 逐輪 comment 迭代 → finalize
- ✅ **驗收**:三頁 prototype 經使用者於 Claude Design 確認定稿

### Phase 2b — 前端實作(移植定稿)

- [ ] 定稿 tokens → Chakra custom theme(`lib/theme.ts`);元件結構 → Chakra 元件組合
- [ ] Routes ×3、components、mobile UI(§4.2–4.3)
- ✅ **驗收**:`pnpm build` 成功;`npx serve out` 手機模擬器檢查三種頁面、tab bar、展開卡片、地圖連結;畫面與定稿 prototype 一致

### Phase 3 — CI/CD

- [ ] `deploy.yml` + 敏感欄位 grep 檢查步驟
- ✅ **驗收**:手動 `workflow_dispatch` 跑完,Pages URL 可開;改 Sheets 一格 → dispatch → 網站反映變更(端到端)

### Phase 4 — PWA

- [ ] manifest + service worker
- ✅ **驗收**:手機加入主畫面;飛航模式下可完整瀏覽已載入過的網站

> Commit 一律 Conventional Commits(`feat:`/`fix:`/`chore:`/`ci:`);Phase 各自成 PR 或至少獨立 commit。

---

## 8. 驗證方式(完成定義)

| 項目        | 方法                                                                   |
| ----------- | ---------------------------------------------------------------------- | --- | ----------------------------------------------- |
| 資料正確性  | Sheets 改一筆行程 → rebuild → 網站與 Sheets 逐欄比對一致               |
| 敏感欄位    | `grep -rE "訂位代號                                                    | PNR | 訂單編號" out/ data/` 必須零命中(CI 內建此步驟) |
| Schema 防護 | 故意改壞 Sheets 一個欄名 → fetch fail 且 CI 不部署、舊網站保留         |
| 靜態品質    | `pnpm lint`、`pnpm type-check` 零錯誤(CI gate)                         |
| Mobile 體驗 | Lighthouse(mobile)Performance/Best Practices/SEO ≥ 90、PWA installable |
| 離線        | 實機飛航模式瀏覽全部頁面                                               |
| 更新流程    | GitHub 手機 App 觸發 dispatch → 3 分鐘內新版上線                       |

---

## 附錄 A — 已知限制與後續可選項

- 網站非即時:改 Sheets 後需 rebuild(dispatch 或每日 cron)。可接受,為架構簡單性的交換
- Pages 網站公開:已以敏感欄位過濾降低風險;若要更進一步,可改部署 Cloudflare Pages + Access(超出本期範圍)
- 未來旅行重用:更換 `SHEET_ID` Secret + 調整 `lib/constants.ts` 的日期範圍與 repo 名即可,schema 不變
