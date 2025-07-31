# 🎓 HK Teacher System

> A modern student management platform designed specifically for Hong Kong educators

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-green.svg)](https://www.mongodb.com/)

## 📋 Project Overview

The HK Teacher System is a comprehensive student management platform tailored specifically for the Hong Kong education environment. The system features Traditional Chinese interface support and full compatibility with the Hong Kong school system (Primary 1 to Primary 6, Secondary 1 to Secondary 6), providing complete management functionality from student registration to annual grade progression.

### ✨ Core Features

- 🏫 **Multi-School Management** - Support for primary, secondary, or through-train schools
- 👥 **Intelligent Student Management** - Complete student profiles and tracking system
- 📊 **Learning Progress Tracking** - Detailed academic performance and behavioral records
- 🤖 **AI-Powered Analysis** - Google AI-driven bulk student data import
- 📈 **Annual Progression System** - Automated grade advancement with P6 to S1 transition support
- 🔐 **Multi-Role Permissions** - Tiered access control for teachers and administrators
- 📱 **Responsive Design** - Desktop, tablet, and mobile device support

## 🚀 Quick Start

### System Requirements

- **Node.js** 18.0 or higher
- **MongoDB** 6.0 or higher
- **npm** or **yarn** package manager

### Installation Steps

#### 1. Clone the Repository
```bash
git clone https://github.com/ChiFungHillmanChan/hk_teacher_system
cd hk-teacher-system
```

#### 2. Backend Setup
```bash
cd backend
npm install

# Create environment variables file
cp .env.example .env
# Edit the .env file to configure database and other settings
```

#### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

#### 4. Database Setup
Ensure MongoDB is running

#### 5. Start the Application
```bash
# Backend (in backend directory)
npm run dev

# Frontend (in new terminal, frontend directory)
npm run dev
```

The application will run at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001

## 📁 Project Structure

```
hk-teacher-system/
├── backend/                 # Node.js + Express backend
│   ├── controllers/         # Business logic controllers
│   ├── models/             # MongoDB data models
│   ├── routes/             # API routes
│   ├── middleware/         # Middleware (auth, validation, etc.)
│   ├── utils/              # Utility functions
│   └── server.js           # Server entry point
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React Context
│   │   ├── services/       # API services
│   │   ├── utils/          # Utility functions
│   │   └── styles/         # CSS styles
│   └── public/             # Static assets
└── docs/                   # Project documentation
```

## 🎯 Main Features

### 👨‍🏫 User Management
- 🔐 Secure registration and login system
- 🎫 Invitation code mechanism
- 👤 Profile management
- 🔑 Password reset functionality

### 🏫 School Management
- ➕ Create and edit school information
- 📍 Support for Hong Kong's 18 districts
- 👥 Teaching staff management
- 📊 School statistics
- ⚠️ Safe deletion (prevents deletion of schools with enrolled students)

### 👥 Student Management
- 📝 Complete student profiles (Chinese/English names, student ID, grade, class)
- 🏫 School transfer functionality (with confirmation dialogs)
- 📋 Bulk operation support
- 🔍 Advanced search and filtering
- ⚠️ Duplicate data warning system

### 📊 Academic Records
- 📈 Detailed learning performance tracking
- 💼 Homework completion records
- 🎭 Behavioral assessment
- 💬 Teacher comments and recommendations
- 📎 File attachment support

### 🎓 Annual Progression (Core Feature)
- 📚 **P1-P5, S1-S5**: Automatic advancement to next grade
- 🔄 **Grade Retention**: Manual marking for students requiring retention
- 🚀 **P6 to S1 Transition**: Special transition handling requiring secondary school selection
- 🎖️ **S6 Graduation**: Graduate record retention or deletion options
- 📊 **Bulk Processing**: One-click processing for entire school grade advancement

### 🤖 AI Smart Features
- 📄 **File Recognition**: Support for Excel, CSV, PDF, Word formats
- 🧠 **Google AI Powered**: Automatic identification of student names, IDs, grades, etc.
- 🔍 **Smart Preview**: Preview and correct data before import
- ⚡ **Bulk Import**: Import large amounts of student data at once

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcrypt
- **Validation**: express-validator
- **AI Service**: Google Generative AI
- **File Processing**: multer, exceljs, papaparse, mammoth

### Frontend
- **Framework**: React 18
- **Routing**: React Router Dom
- **State Management**: React Context API
- **UI Library**: Lucide React (icons)
- **Styling**: Custom CSS with CSS variables
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

### Development Tools
- **Build Tools**: Vite (frontend), nodemon (backend)
- **Code Standards**: ESLint, Prettier
- **Version Control**: Git

## 🔧 Configuration

### Environment Variables (.env)

```env
# Server Configuration
NODE_ENV=development
PORT=5001

# Database
MONGODB_URI=mongodb://localhost:27017/hk_teacher_system

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Google AI (Required for AI features)
GOOGLE_AI_API_KEY=your_google_ai_api_key

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## 📖 User Guide

### 🚀 First Time Setup

1. **Register Account**: Use invitation code `1234567890` to register a teacher account
2. **Create School**: Create your school in the School Management page
3. **Add Students**: Manually add students or use AI bulk import
4. **Start Recording**: Create learning records for students

### 📚 Annual Progression Workflow

1. Navigate to the "Annual Progression" page
2. Select the school to process
3. Process "P1-P5, S1-S5" and "P6, S6" separately
4. Review each student's advancement status
5. Confirm and execute bulk advancement

### 🤖 AI Import Workflow

1. Navigate to the "AI Smart Analysis" page
2. Select school and upload file containing student data
3. Wait for AI analysis and data extraction
4. Preview and correct extracted student data
5. Confirm import to system

## 🔒 Security Features

- 🔐 **JWT Authentication**: Secure user authentication mechanism
- 🛡️ **Password Encryption**: bcrypt hash encryption
- 🚫 **SQL Injection Protection**: Mongoose ODM protection
- 🔒 **XSS Protection**: Input sanitization and validation
- 📧 **Email Verification**: Registration email verification (optional)
- 🔄 **Password Reset**: Secure password reset process

## 🚀 Deployment

### Production Environment Deployment

1. **Prepare Production Environment**:
   ```bash
   # Backend
   cd backend
   npm install --production
   
   # Frontend
   cd frontend
   npm run build
   ```

2. **Environment Configuration**:
   - Set `NODE_ENV=production`
   - Configure production database connection
   - Set secure JWT secret

3. **Start Services**:
   ```bash
   # Using PM2 for process management
   npm install -g pm2
   pm2 start server.js --name "hk-teacher-api"
   
   # Or using Docker (if Dockerfile available)
   docker-compose up -d
   ```

## 🤝 Contributing

We welcome community contributions! Please follow these steps:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 📝 Development Guidelines

- Use meaningful commit messages
- Follow existing code style
- Add appropriate comments and documentation
- Ensure all tests pass

## 💬 Support & Feedback

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/ChiFungHillmanChan/hk_teacher_system/issues)
- 📧 **Contact Us**: hillmanchan709@gmail.com

## 🎯 Roadmap

### Upcoming Features

- [ ] 📊 Advanced data analytics and charts
- [ ] 📱 Mobile application version
- [ ] 🔔 System notification functionality
- [ ] 📝 Custom report generator
- [ ] 🎨 Theme customization
- [ ] 🌐 Multi-language support (English interface)
- [ ] 📋 Parent portal access

## 🙏 Acknowledgments

Thanks to all teachers working in Hong Kong education - this system was created to make your work more efficient and manageable.

Special thanks to:
- Google AI team for providing Generative AI services
- React and Node.js open source communities
- All beta users for their valuable feedback

## 🌟 Key Highlights for Hong Kong Education System

### Hong Kong School System Compliance
- **Primary Schools (小學)**: Complete P1-P6 grade management
- **Secondary Schools (中學)**: Full S1-S6 curriculum support
- **Through-train Schools (一條龍)**: Seamless P1-S6 management
- **District Support**: All 18 Hong Kong districts included

### Localization Features
- **Bilingual Support**: Traditional Chinese and English interfaces
- **HK Address System**: Integration with Hong Kong postal districts
- **Local Academic Calendar**: Hong Kong academic year format (2025/26)
- **Cultural Adaptation**: Designed for Hong Kong teaching methodologies

### Educational Workflow Integration
- **Class Management**: Hong Kong-style class numbering system
- **Student Records**: Comprehensive tracking aligned with HK education standards
- **Report Generation**: Formats compatible with Hong Kong school requirements
- **Transition Management**: Special handling for critical transition points (P6→S1)

---

<div align="center">

**Built with ❤️ for Hong Kong Educators**

</div>