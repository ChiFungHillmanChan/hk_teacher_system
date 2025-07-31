// File: controllers/aiAnalysisController.js
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ExcelJS = require('exceljs');
const Papa = require('papaparse');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const Student = require('../models/Student');
const School = require('../models/School');
const { validationResult } = require('express-validator');

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

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
        // Excel files using ExcelJS (secure alternative)
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

// Helper function to use Google AI for data extraction
const extractStudentDataWithAI = async (extractedText, structuredData, schoolId) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Get school information for context
    const school = await School.findById(schoolId);
    if (!school) {
      throw new Error('學校不存在');
    }

    let prompt = '';
    let dataToAnalyze = '';

    if (structuredData && Array.isArray(structuredData) && structuredData.length > 0) {
      // For structured data (Excel/CSV)
      dataToAnalyze = JSON.stringify(structuredData.slice(0, 100)); // Limit to first 100 rows
      prompt = `
你是一個專門處理香港學校學生資料的AI助手。請分析以下結構化數據，提取學生資訊並轉換為標準格式。

學校資訊：
- 學校名稱：${school.name}
- 學校類型：${school.schoolType}
- 可用年級：${school.getAvailableGrades ? school.getAvailableGrades().join(', ') : 'P1-P6, S1-S6'}

資料：
${dataToAnalyze}

請提取每個學生的以下資訊並以JSON陣列格式返回：
{
  "students": [
    {
      "name": "學生姓名（如果只有中文或英文姓名，放在這裡）",
      "nameEn": "英文姓名（如果有的話）",
      "nameCh": "中文姓名（如果有的話）",
      "studentId": "學號",
      "grade": "年級（使用香港標準：P1-P6或S1-S6）",
      "class": "班別",
      "classNumber": "班內號碼",
      "gender": "性別（male/female/other）",
      "dateOfBirth": "出生日期（YYYY-MM-DD格式）",
      "phone": "聯絡電話",
      "email": "電子郵件",
      "address": "地址",
      "confidence": "提取信心度（0-100）"
    }
  ],
  "errors": ["任何發現的問題或無法處理的數據"]
}

注意事項：
1. 只提取確定的學生資料，不要猜測
2. 年級必須符合香港標準（P1-P6為小學，S1-S6為中學）
3. 如果無法確定某個欄位，請設為null
4. 請確保返回有效的JSON格式
5. 學號應該是唯一的
`;
    } else {
      // For unstructured text data (PDF/Word)
      dataToAnalyze = extractedText.slice(0, 10000); // Limit text length
      prompt = `
你是一個專門處理香港學校學生資料的AI助手。請分析以下文本內容，提取學生資訊。

學校資訊：
- 學校名稱：${school.name}
- 學校類型：${school.schoolType}

文本內容：
${dataToAnalyze}

請從文本中識別和提取學生資料，並以JSON格式返回：
{
  "students": [
    {
      "name": "學生姓名",
      "nameEn": "英文姓名（如果有）",
      "nameCh": "中文姓名（如果有）",
      "studentId": "學號",
      "grade": "年級（P1-P6或S1-S6）",
      "class": "班別",
      "classNumber": "班內號碼",
      "gender": "性別",
      "dateOfBirth": "出生日期",
      "phone": "電話",
      "email": "電子郵件",
      "address": "地址",
      "confidence": "信心度（0-100）"
    }
  ],
  "errors": ["處理問題說明"]
}

請只提取明確的學生資料，不要猜測缺失的資訊。
`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    let aiResponse;
    try {
      // Clean the response text and extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI 回應格式不正確');
      }
    } catch (parseError) {
      console.error('AI response parsing failed:', parseError);
      throw new Error('AI 分析結果無法解析');
    }

    return aiResponse;
  } catch (error) {
    console.error('Google AI extraction failed:', error);
    throw new Error(`AI 分析失敗: ${error.message}`);
  }
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

    // Extract text from file
    const { extractedText, structuredData } = await extractTextFromFile(
      req.file.buffer, 
      req.file.mimetype, 
      req.file.originalname
    );

    // Use Google AI to extract student data
    const aiResponse = await extractStudentDataWithAI(extractedText, structuredData, schoolId);

    if (!aiResponse.students || !Array.isArray(aiResponse.students)) {
      return res.status(400).json({
        success: false,
        message: 'AI 無法從檔案中提取學生資料'
      });
    }

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

    res.status(200).json({
      success: true,
      message: `成功提取 ${validStudents.length} 名學生資料`,
      data: {
        students: validStudents,
        errors: [...(aiResponse.errors || []), ...errors],
        summary: {
          total: validStudents.length,
          new: validStudents.filter(s => !s.existsInDB).length,
          existing: validStudents.filter(s => s.existsInDB).length
        }
      }
    });

  } catch (error) {
    console.error('AI extract error:', error);
    res.status(500).json({
      success: false,
      message: error.message || '檔案分析失敗'
    });
  }
};

// @desc    Import extracted student data to database
// @route   POST /api/ai-analysis/import
// @access  Private
const importStudentData = async (req, res) => {
  try {
    console.log('🔍 Import request received:', {
      body: req.body,
      user: req.user?.name,
      userRole: req.user?.role
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: '資料驗證失敗',
        errors: errors.array()
      });
    }

    const { schoolId, studentsData, academicYear } = req.body;

    if (!schoolId || !studentsData || !Array.isArray(studentsData)) {
      console.log('❌ Missing required parameters:', { schoolId, studentsDataLength: studentsData?.length });
      return res.status(400).json({
        success: false,
        message: '缺少必要參數'
      });
    }

    // Verify school exists and user has access
    const school = await School.findById(schoolId);
    if (!school) {
      console.log('❌ School not found:', schoolId);
      return res.status(404).json({
        success: false,
        message: '學校不存在'
      });
    }

    console.log('✅ School found:', school.name);

    // Check user permissions
    if (req.user.role !== 'admin') {
      const hasSchoolAccess = req.user.schools.some(
        userSchool => userSchool.toString() === schoolId.toString()
      );

      console.log('🔐 Checking permissions:', {
        userRole: req.user.role,
        userSchools: req.user.schools,
        targetSchool: schoolId,
        hasAccess: hasSchoolAccess
      });

      if (!hasSchoolAccess) {
        console.log('❌ Permission denied for user:', req.user.name);
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
    console.log(`📊 Processing ${newStudents.length} new students out of ${studentsData.length} total`);

    for (const [index, studentData] of newStudents.entries()) {
      try {
        console.log(`👤 Processing student ${index + 1}:`, studentData.name);

        // Validate required fields
        if (!studentData.name && !studentData.nameEn && !studentData.nameCh) {
          const error = `第 ${index + 1} 名學生：缺少姓名`;
          console.log('❌', error);
          importErrors.push(error);
          continue;
        }

        // Prepare student data for database
        const newStudent = new Student({
          name: studentData.name || studentData.nameEn || studentData.nameCh,
          nameEn: studentData.nameEn || studentData.name,
          nameCh: studentData.nameCh || '',
          studentId: studentData.studentId || '',
          school: schoolId,
          academicYear: academicYear || '2025/26',
          grade: studentData.grade || '',
          class: studentData.class || '',
          classNumber: studentData.classNumber || null,
          gender: studentData.gender || 'other', // Default to 'other' if not specified
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
        console.log(`✅ Student ${index + 1} imported successfully`);

      } catch (error) {
        console.error(`❌ Error importing student ${index + 1}:`, error);
        if (error.code === 11000) {
          // Duplicate key error
          skippedCount++;
          const duplicateField = Object.keys(error.keyPattern || {})[0] || 'unknown';
          importErrors.push(`第 ${index + 1} 名學生：${duplicateField} 重複`);
        } else if (error.name === 'ValidationError') {
          // Validation error
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

    console.log(`📈 Import summary: ${importedCount} imported, ${skippedCount} skipped, ${importErrors.length} errors`);

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
      details: error.stack
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

    res.status(200).json({
      success: true,
      data: {
        totalStudents,
        aiImportedStudents,
        recentImports,
        importRate: totalStudents > 0 ? ((aiImportedStudents / totalStudents) * 100).toFixed(1) : 0
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
  getAIAnalysisStats
};