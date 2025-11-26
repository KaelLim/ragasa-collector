# 慈濟災害個人資料收集系統 - Claude AI 開發指引

> **專案名稱**: 慈濟災害個人資料收集系統_地端驗證版 (Tzu Chi Disaster Relief Personal Data Collection System - Local Verification)
> **版本**: v0.0.5
> **最後更新**: 2025-11-25

## 📋 快速索引

- [團隊協作模式](#團隊協作模式)
- [AI MCP 團隊通訊系統部署](#ai-mcp-團隊通訊系統部署)
- [技術棧概覽](#技術棧概覽)
- [專案結構](#專案結構)
- [核心業務流程](#核心業務流程)
- [關鍵檔案位置](#關鍵檔案位置)
- [開發注意事項](#開發注意事項)
- [已知問題與限制](#已知問題與限制)
- [常見開發任務](#常見開發任務)

---

## 👥 團隊協作模式

### 專案團隊組成

本專案採用 **AI MCP (Model Context Protocol) 協作開發模式**，由以下團隊共同協作：

- **前端團隊 (Frontend Team)** - 負責 Next.js/React 前端開發
- **後端團隊 (Backend Team)** - 負責 Supabase 後端服務與 API 開發
- **專案領導 (Leader)** - 負責整體技術架構與決策

### 協作原則

1. **透過 AI MCP 通訊系統進行協作** - 所有團隊成員透過 MCP 訊息系統溝通
2. **前後端分離開發** - 前端團隊專注於 UI/UX，後端團隊專注於資料與服務
3. **統一技術標準** - 遵循本文件定義的開發規範與架構
4. **即時溝通協調** - 使用 MCP 工具即時交換技術資訊與問題

---

## 🤖 AI MCP 團隊通訊系統部署

### 概述

AI MCP (Model Context Protocol) 團隊通訊系統允許不同 AI 團隊成員之間進行結構化通訊協作。本系統使用 Supabase 作為訊息儲存後端。

### 系統架構

**團隊成員角色**:
- `frontend` - 前端開發團隊
- `backend` - 後端開發團隊
- `deployment` - 部署團隊
- `leader` - 專案領導
- `testing` - 測試團隊
- `customer-service` - 客服團隊
- `architecture` - 架構團隊

**訊息類型**:
- `question` - 問題詢問
- `answer` - 問題回答
- `information` - 資訊分享
- `urgent` - 緊急通知
- `meeting_note` - 會議紀錄
- `decision` - 決策記錄

### 部署步驟

#### 步驟 1: 建立 Supabase 資料表

在 Supabase SQL Editor 執行以下 SQL：

```sql
-- 建立 AI 訊息表
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL,
  parent_id UUID,
  from_team TEXT NOT NULL CHECK (from_team IN ('frontend', 'backend', 'deployment', 'leader', 'testing', 'customer-service', 'architecture')),
  to_team TEXT NOT NULL CHECK (to_team IN ('frontend', 'backend', 'deployment', 'leader', 'testing', 'customer-service', 'architecture')),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'information' CHECK (message_type IN ('question', 'answer', 'information', 'urgent', 'meeting_note', 'decision')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'resolved')),
  tags TEXT[],
  file_references TEXT[],
  code_references TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- 建立索引優化查詢
CREATE INDEX idx_ai_messages_thread_id ON public.ai_messages(thread_id);
CREATE INDEX idx_ai_messages_to_team ON public.ai_messages(to_team);
CREATE INDEX idx_ai_messages_status ON public.ai_messages(status);
CREATE INDEX idx_ai_messages_created_at ON public.ai_messages(created_at DESC);

-- 啟用 RLS (Row Level Security)
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- 建立 RLS 政策 (允許所有認證用戶讀寫)
CREATE POLICY "Enable read access for authenticated users" ON public.ai_messages
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable insert access for authenticated users" ON public.ai_messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Enable update access for authenticated users" ON public.ai_messages
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 建立函數：自動生成 thread_id
CREATE OR REPLACE FUNCTION generate_thread_id()
RETURNS UUID AS $$
BEGIN
  RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.ai_messages IS 'AI 團隊通訊訊息表';
COMMENT ON COLUMN public.ai_messages.thread_id IS '對話串 ID，用於追蹤相關訊息';
COMMENT ON COLUMN public.ai_messages.parent_id IS '父訊息 ID，用於回覆串接';
COMMENT ON COLUMN public.ai_messages.from_team IS '發送團隊';
COMMENT ON COLUMN public.ai_messages.to_team IS '接收團隊';
COMMENT ON COLUMN public.ai_messages.priority IS '訊息優先級';
COMMENT ON COLUMN public.ai_messages.status IS '訊息狀態：未讀/已讀/已解決';
```

#### 步驟 2: 配置環境變數

建立或更新 `.env.local` 檔案（專案根目錄）：

```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=你的_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_SUPABASE_ANON_KEY

# 或使用 Service Role Key (用於 MCP Server)
SUPABASE_SERVICE_ROLE_KEY=你的_SERVICE_ROLE_KEY
```

#### 步驟 3: 建立 MCP Server 配置

建立 `.mcp.json` 檔案（專案根目錄）：

```json
{
  "mcpServers": {
    "ai-communication": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-supabase"],
      "env": {
        "SUPABASE_URL": "${NEXT_PUBLIC_SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    }
  }
}
```

**注意**: 如果使用自訂 MCP Server，請替換 command 和 args。

#### 步驟 4: 安裝相依套件（可選）

如果專案需要直接調用 AI Communication API：

```bash
npm install @supabase/supabase-js
```

#### 步驟 5: 建立通訊工具函數

建立 `lib/ai-communication.ts`：

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type TeamRole = 'frontend' | 'backend' | 'deployment' | 'leader' | 'testing' | 'customer-service' | 'architecture';
export type MessageType = 'question' | 'answer' | 'information' | 'urgent' | 'meeting_note' | 'decision';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

interface SendMessageParams {
  from_team: TeamRole;
  to_team: TeamRole;
  subject: string;
  content: string;
  message_type?: MessageType;
  priority?: Priority;
  tags?: string[];
  file_references?: string[];
  code_references?: string[];
  parent_id?: string;
}

export async function sendMessage(params: SendMessageParams) {
  const thread_id = params.parent_id
    ? (await supabase.from('ai_messages').select('thread_id').eq('id', params.parent_id).single()).data?.thread_id
    : crypto.randomUUID();

  const { data, error } = await supabase
    .from('ai_messages')
    .insert({
      thread_id,
      ...params,
      message_type: params.message_type || 'information',
      priority: params.priority || 'normal'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function checkInbox(team: TeamRole, includeRead = false) {
  let query = supabase
    .from('ai_messages')
    .select('*')
    .eq('to_team', team)
    .order('created_at', { ascending: false });

  if (!includeRead) {
    query = query.eq('status', 'unread');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function markAsRead(messageId: string) {
  const { error } = await supabase
    .from('ai_messages')
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('id', messageId);

  if (error) throw error;
}

export async function viewThread(threadId: string) {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}
```

### 使用範例

#### 發送訊息

```typescript
import { sendMessage } from '@/lib/ai-communication';

await sendMessage({
  from_team: 'backend',
  to_team: 'frontend',
  subject: 'API 端點更新通知',
  content: '已新增 /api/users/profile 端點，請更新前端調用邏輯',
  message_type: 'information',
  priority: 'high',
  tags: ['api', 'update'],
  code_references: ['app/api/users/profile/route.ts']
});
```

#### 檢查收件匣

```typescript
import { checkInbox } from '@/lib/ai-communication';

const messages = await checkInbox('frontend', false); // 只顯示未讀
console.log(`收到 ${messages.length} 則未讀訊息`);
```

#### 查看對話串

```typescript
import { viewThread } from '@/lib/ai-communication';

const thread = await viewThread('thread-uuid-here');
thread.forEach(msg => {
  console.log(`[${msg.from_team} → ${msg.to_team}] ${msg.subject}`);
});
```

### MCP 工具使用

在 Claude Code 中可直接使用以下 MCP 工具：

```typescript
// 發送訊息
mcp__ai-communication__send_message({
  from_team: "backend",
  to_team: "leader",
  subject: "部署完成報告",
  content: "地端驗證版 v0.0.5 已成功部署",
  message_type: "information",
  priority: "normal"
})

// 檢查收件匣
mcp__ai-communication__check_inbox({
  team: "leader",
  include_read: false
})

// 回覆訊息
mcp__ai-communication__reply_to_message({
  message_id: "訊息ID",
  content: "收到，謝謝通知",
  from_team: "leader"
})

// 查看對話串
mcp__ai-communication__view_thread({
  thread_id: "對話串ID"
})

// 標記已讀
mcp__ai-communication__mark_as_read({
  message_id: "訊息ID"
})

// 標記已解決
mcp__ai-communication__mark_as_resolved({
  message_id: "訊息ID"
})
```

### 故障排除

#### 問題 1: 資料表不存在
**錯誤**: `Could not find the table 'public.ai_messages' in the schema cache`

**解決方案**:
1. 確認已在 Supabase SQL Editor 執行建表 SQL
2. 檢查 Supabase Dashboard → Table Editor 是否看到 `ai_messages` 表
3. 重新整理 Supabase schema cache

#### 問題 2: RLS 政策阻擋
**錯誤**: `new row violates row-level security policy`

**解決方案**:
1. 確認已執行 RLS 政策 SQL
2. 檢查使用的 API Key (建議使用 Service Role Key)
3. 暫時停用 RLS 進行測試：`ALTER TABLE public.ai_messages DISABLE ROW LEVEL SECURITY;`

#### 問題 3: MCP Server 無法連接
**錯誤**: MCP 工具無法使用

**解決方案**:
1. 檢查 `.mcp.json` 配置是否正確
2. 確認環境變數已設定
3. 重啟 Claude Code
4. 使用 `claude mcp list` 檢查 MCP Server 狀態

### 安全性建議

1. **永遠使用環境變數**: 不要將 Supabase Keys 硬編碼在程式碼中
2. **啟用 RLS**: 確保 Row Level Security 已啟用
3. **最小權限原則**: 前端使用 Anon Key，MCP Server 使用 Service Role Key
4. **審計日誌**: 定期檢查 `ai_messages` 表的訊息記錄
5. **敏感資料加密**: 如需傳輸敏感資料，考慮加密 `content` 欄位

### 進階功能

#### 訊息搜尋

```sql
-- 搜尋包含特定關鍵字的訊息
SELECT * FROM ai_messages
WHERE content ILIKE '%關鍵字%'
ORDER BY created_at DESC;

-- 搜尋特定標籤的訊息
SELECT * FROM ai_messages
WHERE 'api' = ANY(tags)
ORDER BY created_at DESC;
```

#### 統計分析

```sql
-- 各團隊訊息統計
SELECT from_team, to_team, COUNT(*) as message_count
FROM ai_messages
GROUP BY from_team, to_team
ORDER BY message_count DESC;

-- 未讀訊息統計
SELECT to_team, COUNT(*) as unread_count
FROM ai_messages
WHERE status = 'unread'
GROUP BY to_team;
```

---

## 🚀 技術棧概覽

### 前端框架
- **Next.js 15.3.1** (App Router)
- **React 18.3.1** (Client Components)
- **TypeScript 5.6.3**
- **Tailwind CSS 4.1.11**

### UI 組件庫
- **HeroUI 2.8.4** (主要 UI 框架)
- **Framer Motion** (動畫效果)
- **react-markdown** (Markdown 渲染)

### 後端服務
- **Supabase** (BaaS)
  - PostgreSQL 資料庫
  - Supabase Auth (使用者認證)
  - Supabase Storage (檔案管理)
  - Row Level Security (RLS)

### 國際化
- **i18next** + **react-i18next**
- 支援語言: 繁體中文 (預設) / English

---

## 📂 專案結構

```
relieffundpj/heroui/
├── app/
│   ├── page.tsx                    # 首頁 (登入頁面)
│   ├── register/page.tsx           # 註冊頁面 ⚠️ 硬編碼密碼問題
│   ├── dashboard/page.tsx          # 主控台 (申請清單 + 下載功能)
│   ├── application/
│   │   ├── new/page.tsx            # 🔴 核心：新申請表單 (943行巨型組件)
│   │   └── [id]/page.tsx           # 申請詳情檢視
│   ├── layout.tsx                  # 根佈局 (國際化設定)
│   └── providers.tsx               # HeroUI Provider
├── components/
│   ├── CameraCapture.tsx           # 相機拍照元件
│   ├── SignatureCanvas.tsx         # 簽名畫布元件
│   ├── BankSelector.tsx            # 銀行選擇器
│   └── navbar.tsx                  # 導航列
├── lib/
│   └── supabase.ts                 # ⚠️ Supabase 配置 (包含 anon key)
├── sql/
│   └── setup_simple.sql            # 資料庫 Schema 定義
├── public/
│   └── locales/                    # i18n 翻譯檔案
│       ├── en/translation.json
│       └── zh-TW/translation.json
└── config/
    └── fonts.ts                    # 字型設定
```

---

## 🔄 核心業務流程

### 申請流程 (3 大步驟 + 4 子步驟)

```
步驟 1: comfort-letter (慰問信)
   └─> 閱讀並同意慰問信內容

步驟 2: consent-form (授權同意書)
   └─> 閱讀並同意授權條款

步驟 3: application-form (申請表單) - 4 個子步驟
   ├─> 子步驟 1: 基本資料輸入
   │   ├─ 受災者姓名 (victim_name)
   │   ├─ 身分證字號 (id_number) - 驗證: ^[A-Z][0-9]{9}$
   │   ├─ 聯絡電話 (phone_number) - 驗證: ^[0-9\-]{8,12}$
   │   ├─ 聯絡地址 (address)
   │   ├─ 銀行代碼 (bank_code) - 3位數字
   │   └─ 銀行帳號 (bank_account) - 驗證: ^[0-9]{5,20}$
   │
   ├─> 子步驟 2: 身分證照片
   │   ├─ 身分證正面照 (front_id_photo)
   │   └─ 身分證背面照 (back_id_photo)
   │
   ├─> 子步驟 3: 銀行存摺照片
   │   └─ 存摺封面照 (bank_photo)
   │
   └─> 子步驟 4: 簽名確認
       └─ 申請人簽名 (signature)

步驟 4: completed (完成)
   └─> 顯示申請成功訊息 + 申請編號
```

### 檔案上傳機制

```javascript
// 檔案儲存結構
supabase.storage.from('media')
  ├─ id-cards-front/   # 身分證正面
  ├─ id-cards-back/    # 身分證背面
  ├─ bank-photos/      # 銀行存摺
  └─ signatures/       # 簽名檔案

// 檔案命名規則: {folder}/{uuid}.{jpg|png}
// 例: id-cards-front/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg
```

---

## 🔑 關鍵檔案位置

### 必讀檔案

| 檔案路徑 | 重要性 | 說明 |
|---------|--------|------|
| `lib/supabase.ts` | 🔴 極高 | Supabase 配置，包含 API 金鑰 (安全風險) |
| `app/application/new/page.tsx` | 🔴 極高 | 核心業務邏輯 (943行巨型組件) |
| `app/register/page.tsx` | 🟠 高 | 註冊邏輯 (硬編碼密碼: 94800552) |
| `sql/setup_simple.sql` | 🟡 中 | 資料庫 Schema 定義 |
| `components/CameraCapture.tsx` | 🟡 中 | 相機拍照功能實作 |
| `components/SignatureCanvas.tsx` | 🟡 中 | 簽名畫布實作 |

### 資料庫 Schema

#### `disaster_applications` 表 (主表)

```typescript
interface DisasterApplication {
  id: string                    // UUID (主鍵)
  user_id: string               // 使用者 ID (外鍵到 auth.users)
  victim_name: string           // 受災者姓名 (max 50)
  id_number: string             // 身分證字號 (固定 10)
  phone_number: string          // 聯絡電話 (8-12 位)
  address: string               // 聯絡地址 (TEXT)
  bank_code: string             // 銀行代碼 (3 位)
  bank_account: string          // 銀行帳號 (5-20 位)
  front_id_photo?: string       // 身分證正面照 URL
  back_id_photo?: string        // 身分證背面照 URL
  bank_photo?: string           // 銀行存摺照 URL
  signature?: string            // 簽名檔案 URL
  status: 'submitted' | 'reviewed' | 'approved' | 'rejected'
  created_at: string            // 建立時間
  updated_at: string            // 更新時間
}
```

#### `bank_codes` 表 (參考表)

```typescript
interface BankCode {
  id: number                    // 自動遞增主鍵
  code: string                  // 銀行代碼 (3位)
  name: string                  // 銀行名稱 (max 100)
  type: string                  // 銀行類型 (max 20)
  created_at: string            // 建立時間
}
```

---

## ⚠️ 開發注意事項

### 🔴 關鍵安全問題 (必須優先處理)

1. **共享密碼漏洞 (Critical)**
   - **位置**: `app/register/page.tsx`
   - **問題**: 所有使用者共用硬編碼密碼 `94800552`
   - **風險**: 任何人知道此密碼即可登入任意帳號
   - **建議**: 實作 OTP 或 Magic Link 無密碼登入

2. **敏感資訊暴露 (High)**
   - **位置**: `lib/supabase.ts`
   - **問題**: Supabase Anon Key 直接寫在程式碼中
   - **風險**: 金鑰洩露風險
   - **建議**: 移至環境變數 `.env.local`

3. **檔案上傳驗證缺失 (Medium)**
   - **位置**: `app/application/new/page.tsx`
   - **問題**: 未驗證檔案類型、大小、內容
   - **風險**: 惡意檔案上傳、儲存空間濫用
   - **建議**: 加入檔案類型白名單、大小限制、病毒掃描

### 🟠 架構問題

1. **巨型組件 (應優先重構)**
   - **位置**: `app/application/new/page.tsx` (943 行)
   - **問題**: 違反單一職責原則，難以維護和測試
   - **建議重構方案**:
     ```
     app/application/new/
     ├── page.tsx (主容器 ~100 行)
     ├── components/
     │   ├── ComfortLetter.tsx
     │   ├── ConsentForm.tsx
     │   ├── ApplicationForm/
     │   │   ├── index.tsx
     │   │   ├── BasicInfoStep.tsx
     │   │   ├── IdPhotoStep.tsx
     │   │   ├── BankPhotoStep.tsx
     │   │   └── SignatureStep.tsx
     │   └── CompletedMessage.tsx
     ├── hooks/
     │   ├── useApplicationForm.ts
     │   ├── useFileUpload.ts
     │   └── useFormValidation.ts
     └── types.ts
     ```

2. **測試覆蓋率為零**
   - **現狀**: 無任何測試檔案
   - **風險**: 重構或新增功能時容易引入 Bug
   - **建議**: 優先為核心業務邏輯 (`application/new/page.tsx`) 撰寫測試

### 🟡 效能考量

1. **大型相依套件**
   - `@mui/material` 和 `@mui/icons-material` 未充分使用
   - **建議**: 評估是否可用 HeroUI 內建圖示替代，減少 bundle size

2. **圖片最佳化**
   - 使用者上傳的照片未進行壓縮
   - **建議**: 客戶端壓縮 + Supabase Transform API

---

## 🛠️ 常見開發任務

### 新增表單欄位

1. 更新 TypeScript 型別 (`lib/supabase.ts`)
2. 修改資料庫 Schema (`sql/setup_simple.sql`)
3. 在 `application/new/page.tsx` 的 `formData` state 中加入欄位
4. 在對應的子步驟 UI 中加入表單控制項
5. 更新 `validateBasicInfo()` 驗證邏輯
6. 更新翻譯檔案 (`public/locales/*/translation.json`)

### 修改申請狀態流程

申請狀態定義在 `disaster_applications.status`:
- `submitted` → `reviewed` → `approved` | `rejected`

如需修改:
1. 更新資料庫 CHECK constraint (`sql/setup_simple.sql`)
2. 更新 TypeScript 型別定義 (`lib/supabase.ts`)
3. 修改狀態顯示邏輯 (`app/dashboard/page.tsx`)

### 新增國際化語言

1. 複製現有翻譯檔案:
   ```bash
   cp -r public/locales/zh-TW public/locales/ja
   ```
2. 翻譯 `public/locales/ja/translation.json`
3. 更新 `app/layout.tsx` 的語言切換選項

---

## 🐛 已知問題與限制

### 安全性
- [ ] 共享密碼漏洞 (Critical)
- [ ] Supabase 金鑰硬編碼 (High)
- [ ] 缺少檔案上傳驗證 (Medium)
- [ ] 下載功能使用同一密碼 (Medium)
- [ ] 未實作 RLS 政策驗證 (需確認)

### 架構
- [ ] 巨型組件需重構 (943 行)
- [ ] 無測試覆蓋率
- [ ] 缺少錯誤邊界處理
- [ ] 未使用 Next.js 15 的 Parallel Routes

### 功能
- [ ] 無申請編輯功能 (只能新增)
- [ ] 無申請刪除功能
- [ ] 缺少檔案預覽功能
- [ ] 未實作進度自動儲存

### 效能
- [ ] 圖片未壓縮
- [ ] 大型相依套件未最佳化
- [ ] 無 SSR/ISR 快取策略

---

## 📚 參考資料

### 詳細技術文件
完整架構分析請參閱: [`ARCHITECTURE.md`](./ARCHITECTURE.md)

### 官方文檔
- [Next.js 15 文檔](https://nextjs.org/docs)
- [Supabase 文檔](https://supabase.com/docs)
- [HeroUI 文檔](https://www.heroui.com)
- [i18next 文檔](https://www.i18next.com)

### 專案相關
- **GitHub 儲存庫**: https://github.com/KaelLim/ragasa-collector
- **Supabase 專案**: https://sberelieffundpj.tzuchi-org.tw

---

## 🚀 開發環境設定

### 前置需求
- Node.js >= 18.17
- npm >= 9.6.7

### 快速開始

```bash
# 安裝相依套件
cd heroui
npm install

# 設定環境變數 (建議)
cp .env.example .env.local
# 編輯 .env.local，設定 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY

# 啟動開發伺服器
npm run dev

# 開啟瀏覽器
open http://localhost:5173
```

### 資料庫設定

```bash
# 在 Supabase Dashboard 執行
psql -h sberelieffundpj.tzuchi-org.tw -U postgres -f sql/setup_simple.sql
```

---

## 🎯 建議優先處理事項

### 短期 (1-2 週)
1. ✅ 建立技術文件 (已完成)
2. 🔴 修復共享密碼安全漏洞
3. 🔴 將 Supabase 金鑰移至環境變數
4. 🟠 加入檔案上傳驗證

### 中期 (1-2 月)
1. 重構巨型組件 (`application/new/page.tsx`)
2. 建立測試套件 (Jest + React Testing Library)
3. 實作申請編輯功能
4. 優化圖片上傳與儲存

### 長期 (3-6 月)
1. 實作管理後台 (審核功能)
2. 加入申請狀態通知 (Email/SMS)
3. 效能最佳化 (SSR、快取)
4. 建立 CI/CD 流程

---

## 📞 聯絡資訊

如有技術問題或需要協助，請聯絡:
- **專案負責人**: [待補充]
- **技術支援**: [待補充]

---

## 📝 書記記憶 UID（OpenMemory）

**專案 UID**: `relieffundpj-local-v0.0.5`

### 最新進度記錄（2025-11-25）

| 記憶 UID | 說明 |
|:---|:---|
| `b27fc563-a720-4579-9a29-9af163441c74` | 每日進度 - 2025-11-25 |
| `c86d3413-be02-4277-8f52-1de057c129f5` | 專案完整進度 |

---

## 📅 明日工作項目（前端團隊）

1. **實作角色權限 UI 控制**
   - Admin：完整功能 + 使用者管理
   - Editor：完整功能
   - User：僅圖片上傳，設定功能灰色

2. **整合 Supabase 服務到現有元件**
   - 替換舊有的 vectorDbService.js
   - 整合到 app/application/new/page.tsx

3. **移除舊有 score 評分功能**
   - 清理相關 UI 和邏輯
   - 更新翻譯檔案

4. **完整流程測試**
   - 圖片上傳 → EXIF 解析 → Storage 上傳
   - 資料庫記錄 → Edge Function 處理
   - Realtime 推送 → UI 即時更新

5. **與後端團隊協作驗證**
   - 測試 Edge Functions 連通性
   - 驗證角色權限隔離
   - 確認向量搜尋功能

---

**最後更新**: 2025-11-25
**文件維護者**: Claude AI (Anthropic)
**專案版本**: v0.0.5 (地端驗證版)

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
