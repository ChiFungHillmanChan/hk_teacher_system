// File: controllers/aiAnalysisController.js - COMPLETE VERSION WITH JSON REPAIR
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ExcelJS = require('exceljs');
const Papa = require('papaparse');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const Student = require('../models/Student');
const School = require('../models/School');
const { validationResult } = require('express-validator');
const https = require('https');

// Enhanced AI Service Class with JSON Repair
class EnhancedAIService {
  constructor() {
    this.apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    this.model = null;
    this.isInitialized = false;
    this.lastConnectivityCheck = null;
    this.connectivityStatus = 'unknown';
    
    this.initialize();
  }

  async initialize() {
    try {
      if (!this.apiKey) {
        console.error('🚨 Google AI API Key Missing!');
        console.error('Please add to your .env file: GOOGLE_AI_API_KEY=your_api_key_here');
        this.connectivityStatus = 'unavailable';
        return false;
      }

      console.log('🤖 Initializing Google AI service...');
      
      const genAI = new GoogleGenerativeAI(this.apiKey);
      
      this.model = genAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 4096, // Limit output to prevent truncation
        },
      });

      const isConnected = await this.testConnectivity();
      this.isInitialized = isConnected;
      this.connectivityStatus = isConnected ? 'available' : 'unavailable';
      
      if (isConnected) {
        console.log('✅ Google AI service initialized successfully');
      } else {
        console.error('❌ Google AI service initialization failed');
      }
      
      return isConnected;
    } catch (error) {
      console.error('💥 Failed to initialize Google AI service:', error);
      this.connectivityStatus = 'unavailable';
      this.isInitialized = false;
      return false;
    }
  }

  async testConnectivity() {
    try {
      console.log('🔍 Testing Google AI connectivity...');
      
      const networkTest = await this.testNetworkConnectivity();
      if (!networkTest) {
        console.error('❌ Network connectivity failed');
        return false;
      }

      const testPrompt = "Reply with exactly: 'OK'";
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI service timeout')), 30000)
      );

      const aiTestPromise = this.model.generateContent(testPrompt);
      const result = await Promise.race([aiTestPromise, timeoutPromise]);
      
      const response = await result.response;
      const text = response.text();
      
      console.log('✅ AI connectivity test passed:', text.trim());
      this.lastConnectivityCheck = new Date();
      this.connectivityStatus = 'available';
      return true;
    } catch (error) {
      console.error('❌ AI connectivity test failed:', error);
      this.connectivityStatus = 'unavailable';
      return false;
    }
  }

  async testNetworkConnectivity() {
    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path: '/v1beta/models',
        method: 'HEAD',
        timeout: 15000
      }, (res) => {
        resolve(res.statusCode < 500);
      });

      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      
      req.setTimeout(15000);
      req.end();
    });
  }

  async checkStatus() {
    if (this.lastConnectivityCheck && 
        (new Date() - this.lastConnectivityCheck) < 5 * 60 * 1000) {
      return {
        available: this.connectivityStatus === 'available',
        lastCheck: this.lastConnectivityCheck,
        status: this.connectivityStatus,
        cached: true
      };
    }

    const isAvailable = await this.testConnectivity();
    return {
      available: isAvailable,
      lastCheck: this.lastConnectivityCheck,
      status: this.connectivityStatus,
      cached: false
    };
  }

  async extractStudentData(extractedText, structuredData, schoolId) {
    if (!this.isInitialized || this.connectivityStatus !== 'available') {
      console.log('🔄 AI service not ready, attempting to reinitialize...');
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('AI 服務目前無法使用。請檢查網路連接或稍後再試。');
      }
    }

    try {
      const prompt = await this.buildExtractionPrompt(extractedText, structuredData, schoolId);
      
      console.log('🤖 Sending content to Google AI for analysis...');
      const startTime = Date.now();
      
      const result = await this.retryWithBackoff(async () => {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI analysis timeout')), 120000)
        );
        
        const aiPromise = this.model.generateContent(prompt);
        return await Promise.race([aiPromise, timeoutPromise]);
      }, 3, 2000);

      const response = await result.response;
      const text = response.text();
      
      const endTime = Date.now();
      console.log(`✅ AI analysis completed in ${endTime - startTime}ms`);
      
      return this.parseAIResponse(text);
    } catch (error) {
      console.error('💥 AI extraction failed:', error);
      
      if (error.message.includes('fetch failed') || 
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('Network')) {
        this.connectivityStatus = 'unavailable';
        throw new Error('AI 服務連接失敗。請檢查網路連接並稍後再試。');
      } else if (error.message.includes('timeout')) {
        throw new Error('AI 分析超時。請確認檔案大小不要過大，或稍後再試。');
      } else if (error.message.includes('quota') || error.message.includes('429')) {
        throw new Error('AI 服務使用量已達上限。請稍後再試或聯絡管理員。');
      } else {
        throw new Error(`AI 分析失敗: ${error.message}`);
      }
    }
  }

  async retryWithBackoff(fn, maxRetries, baseDelay) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (i === maxRetries) break;
        
        if (error.message.includes('API key') || 
            error.message.includes('quota') ||
            error.message.includes('403')) {
          break;
        }
        
        const delay = baseDelay * Math.pow(2, i);
        console.log(`🔄 Retrying in ${delay}ms... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  async buildExtractionPrompt(extractedText, structuredData, schoolId) {
    const school = await School.findById(schoolId);
    
    let dataToAnalyze = '';
    let dataType = '';

    if (structuredData && Array.isArray(structuredData) && structuredData.length > 0) {
      // Reduced limit to prevent JSON truncation
      dataToAnalyze = JSON.stringify(structuredData.slice(0, 30));
      dataType = 'structured';
    } else {
      // Reduced text limit to prevent JSON truncation
      dataToAnalyze = extractedText.slice(0, 6000);
      dataType = 'text';
    }

    return `
  You are an AI assistant specialized in extracting Hong Kong student information from ${dataType} data.

  School Context:
  - School: ${school?.name || 'Unknown'}
  - Type: ${school?.schoolType || 'Unknown'}
  - Valid Grades: P1, P2, P3, P4, P5, P6 (Primary), S1, S2, S3, S4, S5, S6 (Secondary)

  Data to analyze:
  ${dataToAnalyze}

  CRITICAL: Extract student information and return ONLY valid JSON. Maximum 30 students per response to prevent truncation.

  Required JSON format (no explanations, no markdown, no comments):
  {
    "students": [
      {
        "name": "Student Chinese name",
        "nameEn": "Student English name or null",
        "classNumber": "Class number (1-50) or null",
        "grade": "P1-P6 or S1-S6 only, or null",
        "class": "Class name (like 3A, 4B) or null",
        "gender": "male/female/other or null",
        "dateOfBirth": "YYYY-MM-DD or null",
        "phone": "Phone or null",
        "email": "Email or null",
        "address": "Address or null",
        "confidence": 85
      }
    ],
    "errors": []
  }

  FIELD REQUIREMENTS:
  1. name: Primary Chinese name (required)
  2. nameEn: English name if available
  3. classNumber: Student number within class (1-50)
  4. grade: Must be exactly P1, P2, P3, P4, P5, P6, S1, S2, S3, S4, S5, S6
  5. class: Class designation like "3A", "4B", "1C"
  6. gender: Must be "male", "female", or "other"

  RULES:
  1. Return ONLY valid JSON - no markdown blocks, no explanations
  2. Maximum 30 students to prevent response truncation
  3. Use null for missing fields, not empty strings
  4. classNumber should be a number between 1-50
  5. Ensure all JSON brackets and commas are properly closed
  6. Do not include any text before or after the JSON
  `;
}

  parseAIResponse(text) {
    try {
      console.log(`📝 Parsing AI response (${text.length} chars)...`);
      
      // Clean the response text
      let cleanText = text.trim();
      
      // Remove markdown code blocks if present
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Find JSON content
      const jsonStart = cleanText.indexOf('{');
      if (jsonStart === -1) {
        throw new Error('No JSON found in AI response');
      }
      
      let jsonStr = cleanText.substring(jsonStart);
      
      // Try to parse the complete JSON first
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
        console.log(`✅ Successfully parsed complete JSON with ${parsed.students?.length || 0} students`);
      } catch (parseError) {
        console.log('⚠️ Complete JSON parse failed, attempting repair...');
        
        // The JSON is likely truncated, let's try to repair it
        parsed = this.repairTruncatedJSON(jsonStr);
        
        if (!parsed) {
          console.error('💥 JSON repair failed. Error details:');
          console.error(`Error: ${parseError.message}`);
          console.error(`JSON length: ${jsonStr.length}`);
          console.error('Last 200 chars:', jsonStr.slice(-200));
          throw new Error(`JSON parsing failed: ${parseError.message}`);
        }
        
        console.log(`🔧 Successfully repaired JSON with ${parsed.students?.length || 0} students`);
      }
      
      // Validate response structure
      if (!parsed.students || !Array.isArray(parsed.students)) {
        throw new Error('Invalid response structure - missing students array');
      }
      
      if (parsed.students.length === 0) {
        throw new Error('No students found in the response');
      }
      
      // Validate and clean student data
      const validStudents = [];
      const errors = parsed.errors || [];
      
      parsed.students.forEach((student, index) => {
        try {
          if (!student.name && !student.nameEn && !student.nameCh) {
            errors.push(`Student ${index + 1}: Missing name`);
            return;
          }
          
          const cleanedStudent = this.cleanStudentData(student, index, errors);
          if (cleanedStudent) {
            validStudents.push(cleanedStudent);
          }
        } catch (error) {
          console.error(`Error processing student ${index + 1}:`, error);
          errors.push(`Student ${index + 1}: ${error.message}`);
        }
      });
      
      if (validStudents.length === 0) {
        throw new Error('No valid students could be extracted from the response');
      }
      
      const result = {
        students: validStudents,
        errors: errors
      };
      
      console.log(`✅ Final result: ${result.students.length} valid students, ${result.errors.length} errors`);
      return result;
      
    } catch (error) {
      console.error('💥 Failed to parse AI response:', error);
      console.error('Raw response preview (first 500 chars):', text.substring(0, 500));
      console.error('Raw response preview (last 500 chars):', text.slice(-500));
      throw new Error(`AI回應解析失敗: ${error.message}`);
    }
  }

  repairTruncatedJSON(jsonStr) {
    try {
      console.log('🔧 Attempting to repair truncated JSON...');
      
      const studentsStart = jsonStr.indexOf('"students"');
      if (studentsStart === -1) {
        console.error('Could not find students array in response');
        return null;
      }
      
      const arrayStart = jsonStr.indexOf('[', studentsStart);
      if (arrayStart === -1) {
        console.error('Could not find students array opening bracket');
        return null;
      }
      
      // Try to find where the JSON got cut off
      let bracketCount = 0;
      let inString = false;
      let escaped = false;
      let lastValidStudentEnd = arrayStart;
      let studentCount = 0;
      
      for (let i = arrayStart; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        
        if (escaped) {
          escaped = false;
          continue;
        }
        
        if (char === '\\') {
          escaped = true;
          continue;
        }
        
        if (char === '"') {
          inString = !inString;
          continue;
        }
        
        if (inString) continue;
        
        if (char === '{') {
          bracketCount++;
        } else if (char === '}') {
          bracketCount--;
          if (bracketCount === 0) {
            studentCount++;
            lastValidStudentEnd = i;
          }
        }
      }
      
      console.log(`🔍 Found ${studentCount} complete student objects`);
      
      if (studentCount === 0) {
        console.error('No complete student objects found');
        return null;
      }
      
      // Reconstruct the JSON with only complete student objects
      const beforeArray = jsonStr.substring(0, arrayStart + 1);
      const studentsArray = jsonStr.substring(arrayStart + 1, lastValidStudentEnd + 1);
      const reconstructed = beforeArray + studentsArray + '], "errors": []}';
      
      console.log(`🔧 Reconstructed JSON with ${studentCount} students`);
      
      const parsed = JSON.parse(reconstructed);
      return parsed;
      
    } catch (error) {
      console.error('🚫 JSON repair failed:', error);
      return null;
    }
  }

  cleanStudentData(student, index, errors) {
    const cleaned = {};
    
    // Handle names - name is primary (Chinese), nameEn is English
    cleaned.name = student.name || null;
    cleaned.nameEn = student.nameEn || null;
    
    // Must have at least one name
    if (!cleaned.name && !cleaned.nameEn) {
      return null;
    }
    
    // Handle class number (was studentId, now classNumber)
    if (student.classNumber !== null && student.classNumber !== undefined) {
      const classNum = parseInt(student.classNumber);
      if (!isNaN(classNum) && classNum >= 1 && classNum <= 50) {
        cleaned.classNumber = classNum;
      } else {
        cleaned.classNumber = null;
        if (student.classNumber) {
          errors.push(`Student ${index + 1}: Invalid class number "${student.classNumber}" (must be 1-50)`);
        }
      }
    } else {
      cleaned.classNumber = null;
    }
    
    // Validate grade
    const validGrades = ['P1','P2','P3','P4','P5','P6','S1','S2','S3','S4','S5','S6'];
    if (student.grade && validGrades.includes(student.grade)) {
      cleaned.grade = student.grade;
    } else {
      cleaned.grade = null;
      if (student.grade) {
        errors.push(`Student ${index + 1}: Invalid grade "${student.grade}"`);
      }
    }
    
    // Class name (like 3A, 4B)
    cleaned.class = student.class || null;
    
    // Validate and normalize gender
    if (student.gender) {
      const gender = student.gender.toLowerCase();
      if (gender.includes('male') && !gender.includes('female')) {
        cleaned.gender = 'male';
      } else if (gender.includes('female')) {
        cleaned.gender = 'female';
      } else {
        cleaned.gender = 'other';
      }
    } else {
      cleaned.gender = null;
    }
    
    // Handle optional fields
    cleaned.dateOfBirth = student.dateOfBirth || null;
    cleaned.phone = student.phone || null;
    cleaned.email = student.email || null;
    cleaned.address = student.address || null;
    cleaned.confidence = typeof student.confidence === 'number' ? student.confidence : 50;
    
    return cleaned;
  }
}

// Initialize global AI service
const aiService = new EnhancedAIService();

// Legacy genAI for compatibility
let genAI;
try {
  if (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY);
  }
} catch (error) {
  console.error('Legacy genAI initialization failed:', error);
}

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword' // .doc
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支援的檔案格式'), false);
    }
  }
});

// Helper function to extract text from different file types
const extractTextFromFile = async (buffer, mimetype, filename) => {
  try {
    let extractedText = '';
    let structuredData = null;

    switch (mimetype) {
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
        // Excel files using ExcelJS
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        
        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
          throw new Error('Excel 檔案沒有工作表');
        }

        // Convert worksheet to array format
        structuredData = [];
        worksheet.eachRow((row, rowNumber) => {
          const rowData = [];
          row.eachCell((cell, colNumber) => {
            rowData[colNumber - 1] = cell.value;
          });
          structuredData.push(rowData);
        });

        // Convert to text for AI analysis
        extractedText = structuredData.map(row => 
          row.filter(cell => cell !== null && cell !== undefined).join('\t')
        ).join('\n');
        break;

      case 'text/csv':
        // CSV files
        const csvText = buffer.toString('utf8');
        const csvData = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        structuredData = csvData.data;
        extractedText = csvText;
        break;

      case 'application/pdf':
        // PDF files
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text;
        break;

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        // DOCX files
        const docxResult = await mammoth.extractRawText({ buffer });
        extractedText = docxResult.value;
        break;

      case 'application/msword':
        // DOC files (basic text extraction)
        extractedText = buffer.toString('utf8');
        break;

      default:
        throw new Error('不支援的檔案格式');
    }

    return { extractedText, structuredData, fileType: mimetype };
  } catch (error) {
    console.error('Text extraction failed:', error);
    throw new Error(`檔案處理失敗: ${error.message}`);
  }
};

// Enhanced AI extraction function
const extractStudentDataWithAI = async (extractedText, structuredData, schoolId) => {
  return await aiService.extractStudentData(extractedText, structuredData, schoolId);
};

// Helper function to check if student exists in database
const checkStudentExists = async (studentData, schoolId) => {
  try {
    const query = { school: schoolId, isActive: true };
    
    // Primary check: studentId
    if (studentData.studentId) {
      const existingStudent = await Student.findOne({
        ...query,
        studentId: studentData.studentId
      });
      if (existingStudent) return existingStudent;
    }

    // Secondary check: name combination
    if (studentData.name || studentData.nameEn || studentData.nameCh) {
      const nameQuery = { ...query };
      const orConditions = [];

      if (studentData.name) {
        orConditions.push({ name: { $regex: new RegExp(studentData.name.trim(), 'i') } });
      }
      if (studentData.nameEn) {
        orConditions.push({ nameEn: { $regex: new RegExp(studentData.nameEn.trim(), 'i') } });
      }
      if (studentData.nameCh) {
        orConditions.push({ nameCh: { $regex: new RegExp(studentData.nameCh.trim(), 'i') } });
      }

      if (orConditions.length > 0) {
        nameQuery.$or = orConditions;
        
        if (studentData.grade) {
          nameQuery.grade = studentData.grade;
        }

        const existingStudent = await Student.findOne(nameQuery);
        if (existingStudent) return existingStudent;
      }
    }

    return null;
  } catch (error) {
    console.error('Error checking student existence:', error);
    return null;
  }
};

// @desc    Check AI service status
// @route   GET /api/ai-analysis/status
// @access  Private
const checkAIServiceStatus = async (req, res) => {
  try {
    const status = await aiService.checkStatus();
    
    res.status(200).json({
      success: true,
      data: {
        available: status.available,
        status: status.status,
        lastCheck: status.lastCheck,
        cached: status.cached,
        apiKeyConfigured: !!(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY)
      }
    });
  } catch (error) {
    console.error('Check AI status error:', error);
    res.status(500).json({
      success: false,
      message: '無法檢查AI服務狀態',
      data: {
        available: false,
        status: 'error',
        apiKeyConfigured: !!(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY)
      }
    });
  }
};

// @desc    Extract student data from uploaded file using AI
// @route   POST /api/ai-analysis/extract
// @access  Private
const extractStudentData = async (req, res) => {
  try {
    const { schoolId, academicYear } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '請上傳檔案'
      });
    }

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: '請選擇學校'
      });
    }

    // Check AI service status first
    const aiStatus = await aiService.checkStatus();
    if (!aiStatus.available) {
      return res.status(503).json({
        success: false,
        message: 'AI 服務目前無法使用，請稍後再試',
        serviceStatus: aiStatus
      });
    }

    // Verify school exists and user has access
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: '學校不存在'
      });
    }

    // Check user permissions
    if (req.user.role !== 'admin') {
      const hasSchoolAccess = req.user.schools.some(
        userSchool => userSchool.toString() === schoolId.toString()
      );

      if (!hasSchoolAccess) {
        return res.status(403).json({
          success: false,
          message: '沒有權限訪問此學校'
        });
      }
    }

    console.log(`📁 Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

    // Extract text from file
    const { extractedText, structuredData } = await extractTextFromFile(
      req.file.buffer, 
      req.file.mimetype, 
      req.file.originalname
    );

    console.log(`📊 Extracted content: ${extractedText?.length || 0} chars, structured: ${!!structuredData}`);

    // Use Enhanced AI to extract student data
    const aiResponse = await extractStudentDataWithAI(extractedText, structuredData, schoolId);

    if (!aiResponse.students || !Array.isArray(aiResponse.students)) {
      return res.status(400).json({
        success: false,
        message: 'AI 無法從檔案中提取學生資料',
        details: 'AI response did not contain valid student array'
      });
    }

    console.log(`🎯 AI extracted ${aiResponse.students.length} students`);

    // Check which students already exist in database
    const studentsWithExistenceCheck = await Promise.all(
      aiResponse.students.map(async (student) => {
        const existingStudent = await checkStudentExists(student, schoolId);
        return {
          ...student,
          existsInDB: !!existingStudent,
          existingStudentId: existingStudent?._id
        };
      })
    );

    // Validate extracted data
    const errors = [];
    const validStudents = studentsWithExistenceCheck.filter((student, index) => {
      if (!student.name && !student.nameEn && !student.nameCh) {
        errors.push(`第 ${index + 1} 行：缺少學生姓名`);
        return false;
      }
      if (student.grade && !['P1','P2','P3','P4','P5','P6','S1','S2','S3','S4','S5','S6'].includes(student.grade)) {
        errors.push(`第 ${index + 1} 行：年級格式不正確 (${student.grade})`);
      }
      return true;
    });

    const summary = {
      total: validStudents.length,
      new: validStudents.filter(s => !s.existsInDB).length,
      existing: validStudents.filter(s => s.existsInDB).length
    };

    console.log(`📈 Final summary: ${summary.total} total, ${summary.new} new, ${summary.existing} existing`);

    res.status(200).json({
      success: true,
      message: `成功提取 ${validStudents.length} 名學生資料`,
      data: {
        students: validStudents,
        errors: [...(aiResponse.errors || []), ...errors],
        summary,
        aiServiceStatus: aiStatus
      }
    });

  } catch (error) {
    console.error('AI extract error:', error);
    
    // Provide more specific error responses
    let statusCode = 500;
    let message = error.message || '檔案分析失敗';
    
    if (error.message.includes('AI 服務連接失敗')) {
      statusCode = 503;
    } else if (error.message.includes('超時')) {
      statusCode = 408;
    } else if (error.message.includes('配置錯誤')) {
      statusCode = 500;
    }
    
    res.status(statusCode).json({
      success: false,
      message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Import extracted student data to database
// @route   POST /api/ai-analysis/import
// @access  Private
const importStudentData = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '資料驗證失敗',
        errors: errors.array()
      });
    }

    const { schoolId, studentsData, academicYear } = req.body;

    if (!schoolId || !studentsData || !Array.isArray(studentsData)) {
      return res.status(400).json({
        success: false,
        message: '缺少必要參數'
      });
    }

    // Verify school exists and user has access
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: '學校不存在'
      });
    }

    // Check user permissions
    if (req.user.role !== 'admin') {
      const hasSchoolAccess = req.user.schools.some(
        userSchool => userSchool.toString() === schoolId.toString()
      );

      if (!hasSchoolAccess) {
        return res.status(403).json({
          success: false,
          message: '沒有權限訪問此學校'
        });
      }
    }

    let importedCount = 0;
    let skippedCount = 0;
    const importErrors = [];

    // Filter out students that already exist
    const newStudents = studentsData.filter(student => !student.existsInDB);

    for (const [index, studentData] of newStudents.entries()) {
      try {
        // Validate required fields
        if (!studentData.name && !studentData.nameEn && !studentData.nameCh) {
          const error = `第 ${index + 1} 名學生：缺少姓名`;
          importErrors.push(error);
          continue;
        }

        // Prepare student data for database
        const newStudent = new Student({
          name: studentData.name || studentData.nameEn || `學生 ${index + 1}`,
          nameEn: studentData.nameEn || '',
          nameCh: studentData.name || '', // Use name as Chinese name
          studentId: '', // Leave empty or generate if needed
          school: schoolId,
          academicYear: academicYear || '2025/26',
          grade: studentData.grade || '',
          class: studentData.class || '',
          classNumber: studentData.classNumber || null,
          gender: studentData.gender || 'other',
          dateOfBirth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : null,
          phone: studentData.phone || '',
          email: studentData.email || '',
          address: studentData.address || '',
          status: 'enrolled',
          isActive: true,
          createdBy: req.user._id,
          teachers: [{
            user: req.user._id,
            subjects: [],
            isPrimaryTeacher: true,
            assignedDate: new Date()
          }]
        });
        // Validate and save
        await newStudent.validate();
        await newStudent.save();
        importedCount++;

      } catch (error) {
        if (error.code === 11000) {
          skippedCount++;
          const duplicateField = Object.keys(error.keyPattern || {})[0] || 'unknown';
          importErrors.push(`第 ${index + 1} 名學生：${duplicateField} 重複`);
        } else if (error.name === 'ValidationError') {
          const validationErrors = Object.values(error.errors).map(err => err.message);
          importErrors.push(`第 ${index + 1} 名學生：${validationErrors.join(', ')}`);
        } else {
          importErrors.push(`第 ${index + 1} 名學生：${error.message}`);
        }
      }
    }

    // Count existing students that were skipped
    const existingCount = studentsData.filter(student => student.existsInDB).length;
    skippedCount += existingCount;

    res.status(200).json({
      success: true,
      message: `匯入完成：新增 ${importedCount} 名學生，跳過 ${skippedCount} 名`,
      data: {
        imported: importedCount,
        skipped: skippedCount,
        errors: importErrors,
        total: studentsData.length
      }
    });

  } catch (error) {
    console.error('💥 Import student data error:', error);
    res.status(500).json({
      success: false,
      message: `資料匯入失敗: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Get AI analysis statistics
// @route   GET /api/ai-analysis/stats
// @access  Private
const getAIAnalysisStats = async (req, res) => {
  try {
    // Get user's schools
    let schoolQuery = {};
    if (req.user.role !== 'admin') {
      schoolQuery = { _id: { $in: req.user.schools } };
    }

    const schools = await School.find(schoolQuery);
    const schoolIds = schools.map(school => school._id);

    // Get recent AI imports (students created in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentImports = await Student.countDocuments({
      school: { $in: schoolIds },
      createdAt: { $gte: thirtyDaysAgo },
      createdBy: req.user._id
    });

    const totalStudents = await Student.countDocuments({
      school: { $in: schoolIds },
      isActive: true
    });

    const aiImportedStudents = await Student.countDocuments({
      school: { $in: schoolIds },
      createdBy: req.user._id,
      isActive: true
    });

    // Get AI service status
    const aiStatus = await aiService.checkStatus();

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        aiImportedStudents,
        recentImports,
        importRate: totalStudents > 0 ? ((aiImportedStudents / totalStudents) * 100).toFixed(1) : 0,
        aiServiceStatus: aiStatus
      }
    });

  } catch (error) {
    console.error('Get AI stats error:', error);
    res.status(500).json({
      success: false,
      message: '統計資料獲取失敗'
    });
  }
};

module.exports = {
  upload,
  extractStudentData,
  importStudentData,
  getAIAnalysisStats,
  checkAIServiceStatus
};