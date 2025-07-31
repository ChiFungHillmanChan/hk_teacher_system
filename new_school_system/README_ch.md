# 🎓 香港教師系統 (HK Teacher System)

> 專為香港教育工作者設計的現代化學生管理平台

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-green.svg)](https://www.mongodb.com/)

## 📋 項目簡介

香港教師系統是一個全面的學生管理平台，專為香港教育環境量身打造。系統支持繁體中文界面，完全符合香港學制（小一至小六、中一至中六），提供從學生註冊到年度升級的完整管理功能。

### ✨ 核心特色

- 🏫 **多學校管理** - 支持小學、中學或一貫制學校
- 👥 **智能學生管理** - 完整的學生檔案和追蹤系統
- 📊 **學習記錄追蹤** - 詳細的學習表現和行為記錄
- 🤖 **AI 智能分析** - Google AI 驅動的學生資料批量匯入
- 📈 **年度整理功能** - 自動化升級處理，支持小六升中一轉銜
- 🔐 **多角色權限** - 教師和管理員分級權限控制
- 📱 **響應式設計** - 支持桌面、平板和手機設備

## 🚀 快速開始

### 環境要求

- **Node.js** 18.0 或更高版本
- **MongoDB** 6.0 或更高版本
- **npm** 或 **yarn** 包管理器

### 安裝步驟

#### 1. 複製項目
```bash
git clone https://github.com/ChiFungHillmanChan/hk_teacher_system
cd hk-teacher-system
```

#### 2. 後端設置
```bash
cd backend
npm install

# 創建環境變數文件
cp .env.example .env
# 編輯 .env 文件，配置數據庫和其他設置
```

#### 3. 前端設置
```bash
cd ../frontend
npm install
```

#### 4. 數據庫設置
確保 MongoDB 正在運行。

#### 5. 啟動應用
```bash
# 後端 (在 backend 目錄)
npm run dev

# 前端 (在新終端，frontend 目錄)
npm run dev
```

應用將在以下地址運行：
- **前端**：http://localhost:3000
- **後端 API**：http://localhost:5001

## 📁 項目結構

```
hk-teacher-system/
├── backend/                 # Node.js + Express 後端
│   ├── controllers/         # 業務邏輯控制器
│   ├── models/             # MongoDB 數據模型
│   ├── routes/             # API 路由
│   ├── middleware/         # 中間件 (認證、驗證等)
│   ├── utils/              # 工具函數
│   └── server.js           # 服務器入口
├── frontend/               # React 前端
│   ├── src/
│   │   ├── components/     # React 組件
│   │   ├── pages/          # 頁面組件
│   │   ├── context/        # React Context
│   │   ├── services/       # API 服務
│   │   ├── utils/          # 工具函數
│   │   └── styles/         # CSS 樣式
│   └── public/             # 靜態資源
└── docs/                   # 項目文檔
```

## 🎯 主要功能

### 👨‍🏫 用戶管理
- 🔐 安全的註冊和登錄系統
- 🎫 邀請碼機制
- 👤 個人資料管理
- 🔑 密碼重置功能

### 🏫 學校管理
- ➕ 創建和編輯學校資訊
- 📍 支持香港18區地址
- 👥 教師團隊管理
- 📊 學校統計資料
- ⚠️ 安全刪除 (防止誤刪有學生的學校)

### 👥 學生管理
- 📝 完整學生檔案 (中英文姓名、學號、年級、班別)
- 🏫 學校轉換功能 (含確認對話框)
- 📋 批量操作支持
- 🔍 高級搜索和篩選
- ⚠️ 重複資料警告系統

### 📊 學習記錄
- 📈 詳細的學習表現追蹤
- 💼 作業完成情況記錄
- 🎭 行為表現評估
- 💬 教師評語和建議
- 📎 附件上傳支持

### 🎓 年度整理 (核心功能)
- 📚 **小一至小五、中一至中五**: 自動升級到下一年級
- 🔄 **留級處理**: 手動標記需要留級的學生
- 🚀 **小六升中一**: 特殊轉銜處理，需要選擇中學
- 🎖️ **中六畢業**: 畢業生記錄保留或刪除選項
- 📊 **批量處理**: 一鍵處理整個學校的升級作業

### 🤖 AI 智能功能
- 📄 **文件識別**: 支持 Excel、CSV、PDF、Word 格式
- 🧠 **Google AI 驅動**: 自動識別學生姓名、學號、年級等資訊
- 🔍 **智能預覽**: 匯入前預覽和修正資料
- ⚡ **批量匯入**: 一次匯入大量學生資料

## 🛠️ 技術棧

### 後端
- **Runtime**: Node.js 18+
- **框架**: Express.js
- **數據庫**: MongoDB with Mongoose ODM
- **認證**: JWT + bcrypt
- **驗證**: express-validator
- **AI服務**: Google Generative AI
- **文件處理**: multer, exceljs, papaparse, mammoth

### 前端
- **框架**: React 18
- **路由**: React Router Dom
- **狀態管理**: React Context API
- **UI庫**: Lucide React (圖標)
- **樣式**: 自定義 CSS with CSS 變數
- **HTTP客戶端**: Axios
- **通知**: React Hot Toast

### 開發工具
- **建構工具**: Vite (前端), nodemon (後端)
- **代碼規範**: ESLint, Prettier
- **版本控制**: Git

## 🔧 配置

### 環境變數 (.env)

```env
# 服務器配置
NODE_ENV=development
PORT=5001

# 數據庫
MONGODB_URI=mongodb://localhost:27017/hk_teacher_system

# JWT 配置
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# 郵件配置 (可選)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Google AI (AI 功能需要)
GOOGLE_AI_API_KEY=your_google_ai_api_key

# 前端地址
FRONTEND_URL=http://localhost:3000
```

## 📖 使用指南

### 🚀 初次使用

1. **註冊帳戶**: 使用邀請碼 `1234567890` 註冊教師帳戶
2. **創建學校**: 在學校管理頁面創建您的學校
3. **添加學生**: 手動添加或使用 AI 批量匯入
4. **開始記錄**: 為學生創建學習記錄

### 📚 年度整理流程

1. 進入「年度整理」頁面
2. 選擇要處理的學校
3. 分別處理「小一至小五、中一至中五」和「小六、中六」
4. 檢查每個學生的升級狀態
5. 確認後批量執行升級

### 🤖 AI 匯入流程

1. 進入「AI 智能分析」頁面
2. 選擇學校並上傳包含學生資料的文件
3. 等待 AI 分析和資料提取
4. 預覽並修正提取的學生資料
5. 確認匯入到系統

## 🔒 安全特性

- 🔐 **JWT 認證**: 安全的用戶認證機制
- 🛡️ **密碼加密**: bcrypt 哈希加密
- 🚫 **SQL 注入防護**: Mongoose ODM 保護
- 🔒 **XSS 防護**: 輸入清理和驗證
- 📧 **郵件驗證**: 註冊郵件驗證 (可選)
- 🔄 **密碼重置**: 安全的密碼重置流程

## 🚀 部署

### 生產環境部署

1. **準備生產環境**:
   ```bash
   # 後端
   cd backend
   npm install --production
   
   # 前端
   cd frontend
   npm run build
   ```

2. **環境變數配置**:
   - 設置 `NODE_ENV=production`
   - 配置生產數據庫連接
   - 設置安全的 JWT 密鑰

3. **啟動服務**:
   ```bash
   # 使用 PM2 管理進程
   npm install -g pm2
   pm2 start server.js --name "hk-teacher-api"
   
   # 或使用 Docker (如果有 Dockerfile)
   docker-compose up -d
   ```

## 🤝 貢獻指南

我們歡迎社區貢獻！請遵循以下步驟：

1. Fork 這個項目
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m '新增某個功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

### 📝 開發規範

- 使用有意義的提交信息
- 遵循現有的代碼風格
- 添加適當的註釋和文檔
- 確保所有測試通過

## 💬 支持與反饋

- 🐛 **問題報告**: [GitHub Issues](https://github.com/ChiFungHillmanChan/hk_teacher_system/issues)
- 📧 **聯繫我們**: hillmanchan709@gmail.com

## 🎯 路線圖

### 即將推出的功能

- [ ] 📊 高級數據分析和圖表
- [ ] 📱 移動應用版本
- [ ] 🔔 系統通知功能
- [ ] 📝 自定義報告生成器
- [ ] 🎨 主題自定義
- [ ] 🌐 多語言支持 (英文界面)
- [ ] 📋 家長端查看功能

## 🙏 致謝

感謝所有為香港教育工作的教師們，這個系統是為了讓您的工作更加便利而創建的。

特別感謝：
- Google AI 團隊提供的 Generative AI 服務
- React 和 Node.js 開源社區
- 所有測試用戶的寶貴反饋

---

<div align="center">

**由 ❤️ 為香港教育工作者打造**

</div>