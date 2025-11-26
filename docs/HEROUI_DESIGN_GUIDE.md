# HeroUI 使用指南與本專案 UI/UX 設計規範

**版本**：v1.0.0
**更新日期**：2025-11-26
**目標讀者**：後端開發團隊
**專案**：慈濟災區訪視紀錄系統 POC v0.0.5

---

## 📌 快速開始

### 1. 安裝 HeroUI

```bash
npm install @heroui/system @heroui/theme
npm install @heroui/button @heroui/card @heroui/input @heroui/modal
npm install @heroui/progress @heroui/select @heroui/table
npm install framer-motion  # HeroUI 依賴的動畫庫
```

### 2. Tailwind CSS 配置

**檔案**：`tailwind.config.js`

```javascript
import {heroui} from "@heroui/theme"

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"  // 重要！
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  darkMode: "class",
  plugins: [heroui(), require('@tailwindcss/typography')],
}

module.exports = config
```

### 3. Provider 設定

**檔案**：`app/providers.tsx`

```typescript
"use client"

import * as React from "react"
import { HeroUIProvider } from "@heroui/system"
import { useRouter } from "next/navigation"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function Providers({ children, themeProps }) {
  const router = useRouter()

  return (
    <HeroUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>
        {children}
      </NextThemesProvider>
    </HeroUIProvider>
  )
}
```

**檔案**：`app/layout.tsx`

```typescript
import { Providers } from "./providers"

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body>
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

---

## 一、本專案設計風格規範

### 1.1 顏色系統

**主色調**：藍色系（Indigo/Blue）

```typescript
// 背景漸層
className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950"

// 主要按鈕
color="primary"  // HeroUI 預設藍色

// 成功狀態
color="success"  // 綠色

// 危險/刪除
color="danger"   // 紅色

// 次要按鈕
color="secondary"  // 紫色

// 輔助資訊
className="text-default-500"  // 灰色文字
```

### 1.2 字體系統

**主字體**：Inter（Google Fonts）
**等寬字體**：Fira Code

```typescript
// 檔案：config/fonts.ts
import { Inter as FontSans, Fira_Code as FontMono } from "next/font/google"

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
})
```

### 1.3 佈局規範

**Container 寬度**：
- 最大寬度：`max-w-6xl`（大部分頁面）
- 表單頁面：`max-w-3xl`（訪視紀錄表單）
- 內容頁面：`max-w-4xl`

**間距系統**：
```typescript
// 頁面 padding
className="p-4 md:p-8"  // 手機 4，桌面 8

// 組件間距
className="space-y-6"   // 垂直間距
className="gap-4"       // 網格間距

// 卡片 padding
className="p-4"         // Card 內部
```

### 1.4 響應式設計（RWD）

**斷點使用**：
```typescript
// Tailwind 斷點
sm:  640px   // 小型手機橫向
md:  768px   // 平板
lg:  1024px  // 小型桌面
xl:  1280px  // 桌面
2xl: 1536px  // 大型桌面

// 常用模式
className="hidden md:flex"           // 桌面顯示
className="md:hidden"                // 手機顯示
className="grid-cols-2 md:grid-cols-4"  // 響應式網格
className="flex-col md:flex-row"    // 響應式方向
```

---

## 二、HeroUI 核心組件使用

### 2.1 Card 組件（卡片）

**基本用法**：
```typescript
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card"

<Card className="shadow-lg">
  <CardHeader>
    <h2 className="text-lg font-bold">標題</h2>
    <p className="text-sm text-default-500">副標題</p>
  </CardHeader>
  <CardBody className="space-y-4">
    內容區域
  </CardBody>
  <CardFooter>
    <Button>操作按鈕</Button>
  </CardFooter>
</Card>
```

**變體**：
```typescript
// 陰影效果
className="shadow-lg"      // 大陰影
className="shadow-2xl"     // 超大陰影

// 背景顏色
className="bg-content2"    // 次要背景
className="bg-primary-50"  // 主色淺背景
className="bg-danger-50"   // 錯誤淺背景
```

### 2.2 Button 組件（按鈕）

**基本用法**：
```typescript
import { Button } from "@heroui/button"

<Button color="primary" size="lg">
  主要按鈕
</Button>
```

**顏色變體**：
```typescript
color="primary"    // 藍色（主要操作）
color="success"    // 綠色（成功/確認）
color="danger"     // 紅色（刪除/危險）
color="secondary"  // 紫色（次要操作）
color="default"    // 灰色（一般操作）
```

**樣式變體**：
```typescript
variant="solid"     // 實心（預設）
variant="bordered"  // 邊框
variant="light"     // 淺色
variant="flat"      // 扁平
variant="ghost"     // 幽靈（透明背景）
```

**尺寸**：
```typescript
size="sm"   // 小
size="md"   // 中（預設）
size="lg"   // 大
```

**狀態**：
```typescript
isLoading={true}      // 載入中（顯示 spinner）
isDisabled={true}     // 禁用
```

**完整範例**：
```typescript
<div className="flex gap-2">
  <Button variant="ghost" onClick={handleBack}>
    返回
  </Button>
  <Button
    color="primary"
    size="lg"
    onClick={handleSubmit}
    isLoading={isSubmitting}
    isDisabled={!isValid}
  >
    {isSubmitting ? '提交中...' : '提交'}
  </Button>
</div>
```

### 2.3 Input 組件（輸入框）

**方法 1：使用原生 HTML + Tailwind**（本專案採用）
```typescript
<div className="space-y-2">
  <label htmlFor="eventName" className="text-sm font-medium">
    事件名稱 <span className="text-danger">*</span>
  </label>
  <input
    id="eventName"
    type="text"
    placeholder="例如：2025花蓮地震"
    value={formData.eventName}
    onChange={(e) => setFormData({...formData, eventName: e.target.value})}
    className="w-full px-4 py-3 rounded-lg border border-default-200 focus:border-primary focus:outline-none dark:bg-default-100"
    aria-label="事件名稱"
  />
</div>
```

**方法 2：使用 HeroUI Input 組件**
```typescript
import { Input } from "@heroui/input"

<Input
  label="事件名稱"
  placeholder="例如：2025花蓮地震"
  value={formData.eventName}
  onChange={(e) => setFormData({...formData, eventName: e.target.value})}
  isRequired
  variant="bordered"
/>
```

**Textarea**：
```typescript
<textarea
  placeholder="請描述..."
  rows={6}
  className="w-full px-4 py-3 rounded-lg border border-default-200 focus:border-primary focus:outline-none resize-none dark:bg-default-100"
/>
```

### 2.4 Modal 組件（彈窗）

```typescript
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal"

const [isOpen, setIsOpen] = useState(false)

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  size="2xl"  // xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, full
>
  <ModalContent>
    <ModalHeader>標題</ModalHeader>
    <ModalBody>
      內容區域
    </ModalBody>
    <ModalFooter>
      <Button variant="light" onClick={() => setIsOpen(false)}>
        取消
      </Button>
      <Button color="primary" onClick={handleConfirm}>
        確認
      </Button>
    </ModalFooter>
  </ModalContent>
</Modal>
```

### 2.5 Progress 組件（進度條）

```typescript
import { Progress } from "@heroui/progress"

// 確定進度
<Progress
  value={66}
  color="primary"
  size="lg"
  aria-label="處理進度"
/>

// 不確定進度（載入中）
<Progress
  isIndeterminate
  color="primary"
  aria-label="載入中"
/>
```

### 2.6 Table 組件（表格）

```typescript
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell
} from "@heroui/table"

<Table aria-label="分析記錄列表">
  <TableHeader>
    <TableColumn>圖片</TableColumn>
    <TableColumn>事件</TableColumn>
    <TableColumn>狀態</TableColumn>
    <TableColumn>時間</TableColumn>
  </TableHeader>
  <TableBody>
    {items.map(item => (
      <TableRow key={item.id}>
        <TableCell>
          <img src={item.image_url} className="w-16 h-16 object-cover rounded" />
        </TableCell>
        <TableCell>{item.event_description}</TableCell>
        <TableCell>
          <span className={`px-2 py-1 rounded text-xs ${
            item.status === 'completed' ? 'bg-success-100 text-success-700' :
            item.status === 'failed' ? 'bg-danger-100 text-danger-700' :
            'bg-warning-100 text-warning-700'
          }`}>
            {item.status}
          </span>
        </TableCell>
        <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 2.7 Select 組件（下拉選單）

```typescript
import { Select, SelectItem } from "@heroui/select"

<Select
  label="選擇狀態"
  placeholder="請選擇"
  value={selectedStatus}
  onChange={(e) => setSelectedStatus(e.target.value)}
>
  <SelectItem key="pending" value="pending">等待處理</SelectItem>
  <SelectItem key="processing" value="processing">處理中</SelectItem>
  <SelectItem key="completed" value="completed">已完成</SelectItem>
  <SelectItem key="failed" value="failed">失敗</SelectItem>
</Select>
```

---

## 三、本專案設計模式

### 3.1 頁面佈局標準模式

```typescript
export default function MyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-divider p-3 md:p-4">
        <div className="max-w-6xl mx-auto">
          {/* 桌面版 Header */}
          <div className="hidden md:flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Logo />
              <div>
                <h1 className="text-xl font-bold">頁面標題</h1>
                <p className="text-sm text-default-500">副標題</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={50} size="sm" className="w-24" aria-label="進度" />
              <ThemeSwitcher />
              <LanguageSwitcher />
              <Button variant="ghost" onClick={() => router.push('/dashboard')}>
                返回
              </Button>
            </div>
          </div>

          {/* 手機版 Header */}
          <div className="md:hidden space-y-3">
            <div className="flex justify-between items-center">
              <Logo width={32} height={32} />
              <MobileMenu />
            </div>
            <Progress value={50} color="primary" size="sm" aria-label="進度" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* 內容區域 */}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-background border-t border-divider p-6">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <Button variant="ghost">返回</Button>
          <Button color="primary" size="lg">下一步</Button>
        </div>
      </div>
    </div>
  )
}
```

### 3.2 表單設計模式

```typescript
<Card className="shadow-lg">
  <CardHeader className="flex flex-col gap-2 pb-4">
    <h2 className="text-2xl font-bold">表單標題</h2>
    <p className="text-sm text-default-500">表單說明</p>
  </CardHeader>
  <CardBody className="space-y-6">
    {/* 輸入欄位 */}
    <div className="space-y-2">
      <label htmlFor="fieldName" className="text-sm font-medium">
        欄位名稱 <span className="text-danger">*</span>
      </label>
      <input
        id="fieldName"
        type="text"
        placeholder="提示文字"
        className="w-full px-4 py-3 rounded-lg border border-default-200 focus:border-primary focus:outline-none dark:bg-default-100"
        aria-label="欄位名稱"
      />
    </div>

    {/* 錯誤訊息 */}
    {error && (
      <div className="bg-danger-50 p-4 rounded-lg border border-danger-200">
        <p className="text-danger-800">
          <strong>錯誤：</strong>{error}
        </p>
      </div>
    )}

    {/* 提示訊息 */}
    <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
      <p className="text-sm text-default-600">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="inline mr-2">
          <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
        </svg>
        提示文字
      </p>
    </div>
  </CardBody>
</Card>
```

### 3.3 照片網格顯示模式

```typescript
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {photos.map((photo, index) => (
    <div key={index} className="relative group">
      {/* 照片 */}
      <img
        src={photo.url}
        alt={`照片 ${index + 1}`}
        className="w-full aspect-square object-cover rounded-lg"
      />

      {/* Hover 操作層 */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
        <Button size="sm" color="danger" onClick={() => handleDelete(index)}>
          刪除
        </Button>
      </div>

      {/* 編號標籤 */}
      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        #{index + 1}
      </div>

      {/* GPS 標籤 */}
      {photo.exifData?.gps && (
        <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
          GPS
        </div>
      )}
    </div>
  ))}
</div>
```

### 3.4 狀態標籤模式

```typescript
// 根據狀態顯示不同顏色
<span className={`px-2 py-1 rounded text-xs font-medium ${
  status === 'completed' ? 'bg-success-100 text-success-700 dark:bg-success-950 dark:text-success-300' :
  status === 'processing' ? 'bg-warning-100 text-warning-700 dark:bg-warning-950 dark:text-warning-300' :
  status === 'failed' ? 'bg-danger-100 text-danger-700 dark:bg-danger-950 dark:text-danger-300' :
  'bg-default-100 text-default-700 dark:bg-default-950 dark:text-default-300'
}`}>
  {status === 'completed' ? '✓ 已完成' :
   status === 'processing' ? '⏳ 處理中' :
   status === 'failed' ? '✗ 失敗' :
   '⏸ 待處理'}
</span>
```

---

## 四、實際應用範例

### 4.1 Admin 控制台 - 分析記錄列表

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from '@heroui/table'
import { Select, SelectItem } from '@heroui/select'
import { Input } from '@heroui/input'
import { supabase } from '@/lib/supabase'
import { useRealtimeImageAnalyses } from '@/hooks/useRealtimeImageAnalyses'

export default function AnalysisListPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { analyses, isLoading, subscriptionStatus } = useRealtimeImageAnalyses(userId)

  // 取得當前用戶
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
    })
  }, [])

  // 過濾資料
  const filteredData = statusFilter === 'all'
    ? analyses
    : analyses.filter(a => a.status === statusFilter)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 標題卡片 */}
        <Card>
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">分析記錄列表</h1>
              <p className="text-sm text-default-500">
                Realtime 狀態：
                <span className={`ml-2 ${
                  subscriptionStatus === 'SUBSCRIBED' ? 'text-success' : 'text-danger'
                }`}>
                  {subscriptionStatus === 'SUBSCRIBED' ? '● 已連線' : '● 未連線'}
                </span>
              </p>
            </div>

            {/* 篩選器 */}
            <div className="flex gap-2">
              <Select
                label="狀態"
                placeholder="全部"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-40"
              >
                <SelectItem key="all" value="all">全部</SelectItem>
                <SelectItem key="pending" value="pending">待處理</SelectItem>
                <SelectItem key="processing" value="processing">處理中</SelectItem>
                <SelectItem key="completed" value="completed">已完成</SelectItem>
                <SelectItem key="failed" value="failed">失敗</SelectItem>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {/* 資料表格 */}
        <Card>
          <CardBody>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Progress isIndeterminate aria-label="載入中" />
              </div>
            ) : (
              <Table aria-label="分析記錄">
                <TableHeader>
                  <TableColumn>縮圖</TableColumn>
                  <TableColumn>檔名</TableColumn>
                  <TableColumn>事件</TableColumn>
                  <TableColumn>狀態</TableColumn>
                  <TableColumn>AI 結果</TableColumn>
                  <TableColumn>時間</TableColumn>
                  <TableColumn>操作</TableColumn>
                </TableHeader>
                <TableBody>
                  {filteredData.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <img
                          src={item.image_url}
                          className="w-16 h-16 object-cover rounded"
                        />
                      </TableCell>
                      <TableCell className="text-sm">{item.image_name}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {item.event_description}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.status === 'completed' ? 'bg-success-100 text-success-700' :
                          item.status === 'processing' ? 'bg-warning-100 text-warning-700' :
                          item.status === 'failed' ? 'bg-danger-100 text-danger-700' :
                          'bg-default-100 text-default-700'
                        }`}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs max-w-xs">
                        {item.caption || '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(item.created_at).toLocaleString('zh-TW')}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="light" color="danger">
                          刪除
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* 空狀態 */}
        {!isLoading && filteredData.length === 0 && (
          <Card>
            <CardBody className="flex flex-col items-center justify-center h-64">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-default-300 mb-4">
                <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
              </svg>
              <p className="text-default-500">尚無分析記錄</p>
              <Button color="primary" className="mt-4" onClick={() => router.push('/application/new')}>
                新增訪視紀錄
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}
```

---

## 五、本專案 UI/UX 設計原則

### 5.1 視覺層次

**標題層級**：
```typescript
h1: "text-2xl font-bold"           // 頁面主標題
h2: "text-lg font-bold"            // 卡片標題
h3: "text-md font-semibold"        // 子標題
p:  "text-sm text-default-500"     // 說明文字
```

### 5.2 顏色語意

**功能顏色**：
- `primary`：主要操作（藍色）
- `success`：成功/完成（綠色）
- `warning`：警告/處理中（黃色）
- `danger`：錯誤/刪除（紅色）
- `default`：一般（灰色）

**文字顏色**：
- `text-foreground`：主要文字
- `text-default-500`：次要文字
- `text-default-400`：輔助文字
- `text-danger`：錯誤文字
- `text-success`：成功文字

### 5.3 間距規範

**組件間距**：
- `space-y-6`：卡片內部主要間距
- `space-y-4`：表單欄位間距
- `space-y-2`：label 與 input 間距
- `gap-4`：Flex/Grid 間距

**Padding**：
- Card：`p-4`（內部）
- Container：`p-4 md:p-8`（響應式）
- Button：`px-6 py-3`（大按鈕）

### 5.4 圓角規範

```typescript
rounded-lg     // 標準圓角（卡片、輸入框）
rounded        // 小圓角（標籤、小元素）
rounded-full   // 全圓角（頭像、圓形按鈕）
```

### 5.5 陰影規範

```typescript
shadow-lg      // 標準陰影（卡片）
shadow-2xl     // 大陰影（重要卡片）
shadow-3xl     // 超大陰影（hover 效果）
```

---

## 六、常見 UI 模式

### 6.1 載入狀態

```typescript
{isLoading ? (
  <div className="flex justify-center items-center h-64">
    <Progress isIndeterminate aria-label="載入中" />
  </div>
) : (
  <div>{/* 實際內容 */}</div>
)}
```

### 6.2 空狀態

```typescript
<Card>
  <CardBody className="flex flex-col items-center justify-center h-64">
    <svg width="64" height="64" className="text-default-300 mb-4">
      {/* 圖示 */}
    </svg>
    <p className="text-default-500 mb-4">尚無資料</p>
    <Button color="primary" onClick={handleCreate}>
      新增資料
    </Button>
  </CardBody>
</Card>
```

### 6.3 錯誤狀態

```typescript
<div className="bg-danger-50 dark:bg-danger-950/30 p-4 rounded-lg border border-danger-200">
  <p className="text-danger-800 dark:text-danger-300">
    <strong>錯誤：</strong>{errorMessage}
  </p>
</div>
```

### 6.4 成功訊息

```typescript
<div className="bg-success-50 dark:bg-success-950/30 p-4 rounded-lg border border-success-200">
  <p className="text-success-800 dark:text-success-300">
    <strong>✓ 成功：</strong>操作已完成
  </p>
</div>
```

---

## 七、深色模式支援

### 7.1 顏色適配

```typescript
// 背景
className="bg-content1"                    // 自動適配深淺
className="bg-blue-50 dark:bg-blue-950"    // 手動指定

// 文字
className="text-foreground"                // 自動適配
className="text-default-500"               // 自動適配

// 邊框
className="border-divider"                 // 自動適配
className="border-default-200"             // 自動適配
```

### 7.2 HeroUI 自動深色模式

HeroUI 組件**自動支援深色模式**，無需手動設定：
```typescript
<Button color="primary">按鈕</Button>  // 自動適配深淺
<Card>卡片</Card>                      // 自動適配深淺
```

---

## 八、最佳實踐

### 8.1 Accessibility（無障礙）

**必須項目**：
```typescript
// 1. 所有 Progress 加 aria-label
<Progress value={50} aria-label="處理進度" />

// 2. 所有 input 關聯 label
<label htmlFor="name">姓名</label>
<input id="name" aria-label="姓名" />

// 3. 所有 Button 有清楚文字或 aria-label
<Button aria-label="刪除照片">
  <TrashIcon />
</Button>

// 4. 所有 Table 有 aria-label
<Table aria-label="資料列表">
```

### 8.2 響應式設計

**手機優先**：
```typescript
// ✅ 正確：從小螢幕開始
className="text-sm md:text-base lg:text-lg"

// ❌ 錯誤：從大螢幕開始
className="lg:text-lg md:text-base text-sm"
```

**隱藏/顯示**：
```typescript
// 桌面顯示
className="hidden md:block"
className="hidden md:flex"

// 手機顯示
className="md:hidden"
```

### 8.3 效能優化

**圖片最佳化**：
```typescript
// 使用縮圖
<img src={item.thumbnail_url || item.image_url} />

// 懶載入
<img loading="lazy" />

// 固定尺寸避免 layout shift
className="w-16 h-16"
```

---

## 九、HeroUI 官方資源

### 官方文件
- **官網**：https://www.heroui.com
- **組件文檔**：https://www.heroui.com/docs/components
- **主題配置**：https://www.heroui.com/docs/customization/theme

### 常用組件文檔
- Button：https://www.heroui.com/docs/components/button
- Card：https://www.heroui.com/docs/components/card
- Input：https://www.heroui.com/docs/components/input
- Table：https://www.heroui.com/docs/components/table
- Modal：https://www.heroui.com/docs/components/modal
- Progress：https://www.heroui.com/docs/components/progress

---

## 十、快速參考：本專案常用組件

### 複製即用的程式碼片段

#### 基本卡片
```typescript
<Card className="shadow-lg">
  <CardHeader>
    <h2 className="text-lg font-bold">標題</h2>
  </CardHeader>
  <CardBody>
    內容
  </CardBody>
</Card>
```

#### 按鈕組
```typescript
<div className="flex gap-2">
  <Button variant="ghost">取消</Button>
  <Button color="primary">確認</Button>
</div>
```

#### 表單欄位
```typescript
<div className="space-y-2">
  <label htmlFor="field" className="text-sm font-medium">
    欄位名稱 <span className="text-danger">*</span>
  </label>
  <input
    id="field"
    type="text"
    placeholder="提示"
    className="w-full px-4 py-3 rounded-lg border border-default-200 focus:border-primary focus:outline-none dark:bg-default-100"
    aria-label="欄位名稱"
  />
</div>
```

#### 狀態標籤
```typescript
<span className="px-2 py-1 rounded text-xs bg-success-100 text-success-700">
  ✓ 已完成
</span>
```

#### 空狀態
```typescript
<div className="flex flex-col items-center justify-center h-64">
  <p className="text-default-500 mb-4">尚無資料</p>
  <Button color="primary">新增資料</Button>
</div>
```

---

## 十一、避免常見錯誤

### ❌ 錯誤示範

```typescript
// 1. 忘記導入 CSS
// 需要在 layout.tsx 中導入：import './globals.css'

// 2. 忘記 Provider
// 需要包裹 HeroUIProvider

// 3. 缺少 aria-label
<Progress value={50} />  // ❌ 缺少 aria-label

// 4. 深色模式硬編碼
className="bg-white text-black"  // ❌ 深色模式會很醜

// 5. 忘記響應式
className="flex"  // ❌ 手機版可能需要 flex-col
```

### ✅ 正確示範

```typescript
// 1. 完整設定
import './globals.css'
import { Providers } from './providers'

// 2. 使用 Provider
<Providers>{children}</Providers>

// 3. 加入 aria-label
<Progress value={50} aria-label="進度" />

// 4. 使用語意化顏色
className="bg-content1 text-foreground"

// 5. 響應式設計
className="flex flex-col md:flex-row"
```

---

## 十二、本專案設計截圖參考

### 訪視紀錄表單（步驟 1）
- 背景：藍色漸層
- 卡片：白色 + 大陰影
- 輸入框：淺灰邊框，focus 時藍色
- 按鈕：主色藍色

### 現場照片上傳（子步驟 2）
- 照片網格：2x4 響應式
- Hover 效果：半透明黑底 + 刪除按鈕
- 標籤：黑底白字（編號）、綠底白字（GPS）
- 批次選擇：虛線框 + hover 淺藍

### 確認送出（子步驟 4）
- 雙欄佈局：訪視紀錄 + 照片預覽
- 進度條：藍色 + 百分比
- 狀態訊息：動態文字顯示

---

## 十三、給後端團隊的建議

### 🎯 快速改善現有頁面

**步驟 1：加入基本佈局**
```typescript
<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-8">
  <div className="max-w-6xl mx-auto">
    <Card className="shadow-lg">
      <CardHeader>
        <h1 className="text-2xl font-bold">Admin 控制台</h1>
      </CardHeader>
      <CardBody>
        {/* 現有內容放這裡 */}
      </CardBody>
    </Card>
  </div>
</div>
```

**步驟 2：使用 HeroUI 組件**
- ❌ 原生 `<button>` → ✅ `<Button color="primary">`
- ❌ 原生 `<table>` → ✅ `<Table>` 組件
- ❌ 原生 `<input>` → ✅ `<Input>` 或自定義樣式

**步驟 3：加入顏色和間距**
- `className="space-y-6"`：組件間距
- `color="primary"`：語意化顏色
- `shadow-lg`：卡片陰影

### 🚀 立即可用的模板

複製本專案的頁面結構：
- `app/application/new/page.tsx` - 完整表單範例
- `app/dashboard/page.tsx` - 列表頁面範例
- `app/login/page.tsx` - 登入頁面範例

只需修改內容，保留佈局和樣式即可！

---

**文件版本**：v1.0.0
**撰寫**：前端團隊（Claude Code）
**最後更新**：2025-11-26

如有任何問題，歡迎透過 AI-MCP 通訊系統回覆！
