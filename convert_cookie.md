# Cookie 轉換流程

## 背景

MCP server 需要 `cookies.json`（JSON 陣列格式）才能驗證 OpenEvidence 身份。
瀏覽器擴充功能（如 Cookie-Editor）匯出的是 tab 分隔文字，需先轉換。

## 步驟

### 1. 從瀏覽器匯出 Cookie

1. 安裝 [Cookie-Editor](https://cookie-editor.com/) 或類似擴充功能
2. 前往 `https://www.openevidence.com` 並登入
3. 開啟 Cookie-Editor → Export → **Tab Separated Values**
4. 儲存為 `exported_cookies.txt`

### 2. 執行轉換

```bash
npm run convert-cookies -- exported_cookies.txt cookies.json
```

輸出範例：
```
Converted 11 cookies → /path/to/cookies.json
```

若省略第二個參數，輸出檔名與輸入相同（副檔名改為 `.json`）：

```bash
npm run convert-cookies -- exported_cookies.txt
# → exported_cookies.json
```

### 3. 驗證

```bash
npm run smoke
```

## 輸入格式說明

Tab 分隔，每行一筆 cookie，欄位順序：

| 欄位 | 說明 |
|------|------|
| name | Cookie 名稱（空白行自動跳過）|
| value | Cookie 值 |
| domain | 網域（`.openevidence.com` 或 `www.openevidence.com`）|
| path | 路徑，通常為 `/` |
| expires | ISO 8601 日期、Unix 時間戳，或 `Session` |
| size | 大小（忽略）|
| httpOnly | `✓` 表示啟用（忽略，不影響 HTTP header 發送）|
| secure | `✓` 表示僅限 HTTPS |
| sameSite | Lax / Strict / None（忽略）|

## 關鍵 Cookie

| 名稱 | 用途 |
|------|------|
| `appSession.0` / `appSession.1` | Auth0 session token（必須）|
| `datadome` | Bot 防護（建議保留）|
| `auth0` | 身份元資料 |
| `cookieyes-consent` | 同意設定 |

## 注意事項

- `appSession` 有效期約一年，過期需重新登入並重新匯出
- `datadome` token 有效期約一年，若遇到 403 需重新取得
- 轉換腳本：`scripts/convert_cookies.ts`
