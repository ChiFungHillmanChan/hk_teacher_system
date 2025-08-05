// src/pages/analysation/ExcelParser.js
import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file';
import { GRADE_MAP, HEADER_SYNONYMS } from './utils/Config';
import { fuzzyMatchHeader, normalizeString } from './utils/Utils';

const ExcelParser = {
  /**
   * Parse Excel/CSV file and return raw model with schools and students
   * @param {File} file - The uploaded file
   * @returns {Promise<Object>} Raw model with schools array
   */
  parseFile: async file => {
    console.log('[ExcelParser] 📊 開始解析檔案:', file.name);

    try {
      // Extract data based on file type
      let rawData;
      if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
        rawData = await ExcelParser.parseCSV(file);
      } else if (file.name.toLowerCase().match(/\.(xlsx|xls)$/)) {
        rawData = await ExcelParser.parseExcel(file);
      } else {
        throw new Error('不支援的檔案格式。請上傳 CSV、XLSX 或 XLS 檔案。');
      }

      console.log('[ExcelParser] 📋 原始資料行數:', rawData.length);

      // Process the raw data
      const processedModel = ExcelParser.processRawData(rawData);

      console.log('[ExcelParser] 🏫 偵測到學校數量:', processedModel.schools.length);
      console.log(
        '[ExcelParser] 👥 總學生數量:',
        processedModel.schools.reduce((total, school) => total + school.students.length, 0)
      );

      return processedModel;
    } catch (error) {
      console.error('[ExcelParser] ❌ 解析失敗:', error);
      throw new Error(`檔案解析失敗: ${error.message}`);
    }
  },

  /**
   * Parse CSV file using Papa Parse (secure)
   */
  parseCSV: async file => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        dynamicTyping: false, // Prevent automatic type conversion for security
        delimitersToGuess: [',', '\t', '|', ';'],
        complete: results => {
          if (results.errors.length > 0) {
            console.warn('[ExcelParser] ⚠️ CSV 解析警告:', results.errors);
          }
          resolve(results.data);
        },
        error: error => {
          reject(new Error(`CSV 解析錯誤: ${error.message}`));
        },
      });
    });
  },

  /**
   * Parse Excel file using read-excel-file (secure alternative to xlsx)
   */
  parseExcel: async file => {
    try {
      console.log('[ExcelParser] 📈 使用安全的 Excel 解析器');

      // Use read-excel-file which is more secure than xlsx
      const rows = await readXlsxFile(file, {
        sheet: 1, // First sheet
        transformData: data => {
          // Convert all cells to strings for consistency and security
          return data.map(row =>
            row.map(cell => {
              if (cell === null || cell === undefined) return '';
              return String(cell).trim();
            })
          );
        },
      });

      return rows;
    } catch (error) {
      console.error('[ExcelParser] ❌ Excel 解析錯誤:', error);
      throw new Error(`Excel 解析錯誤: ${error.message}`);
    }
  },

  /**
   * Process raw data into schools and students model
   */
  processRawData: rawData => {
    if (!rawData || rawData.length === 0) {
      throw new Error('檔案內容為空');
    }

    // Validate data structure
    if (!Array.isArray(rawData)) {
      throw new Error('檔案格式無效');
    }

    // Extract headers and normalize them
    const headers = rawData[0];
    if (!Array.isArray(headers)) {
      throw new Error('無法讀取檔案標題行');
    }

    console.log('[ExcelParser] 📝 原始標題:', headers);

    const normalizedHeaders = ExcelParser.normalizeHeaders(headers);
    console.log('[ExcelParser] 📝 標題映射:', normalizedHeaders);

    // Validate required columns
    ExcelParser.validateRequiredColumns(normalizedHeaders);

    // Process data rows
    const dataRows = rawData.slice(1);
    console.log(`[ExcelParser] 📊 處理 ${dataRows.length} 行資料`);

    const groupedData = ExcelParser.groupDataBySchool(dataRows, normalizedHeaders);
    console.log(`[ExcelParser] 🏫 分組後得到 ${groupedData.length} 個學校群組`);

    // Convert to schools model
    const schools = ExcelParser.convertToSchoolsModel(groupedData);
    console.log(`[ExcelParser] ✅ 轉換完成，最終 ${schools.length} 所學校`);

    return { schools };
  },

  /**
   * Normalize headers using synonyms and fuzzy matching
   */
  normalizeHeaders: headers => {
    const normalized = {};
    const headerMap = {};

    headers.forEach((header, index) => {
      if (!header || typeof header !== 'string') return;

      const cleanHeader = normalizeString(header);
      let mappedField = null;

      // Try exact synonym match first
      for (const [standardField, synonyms] of Object.entries(HEADER_SYNONYMS)) {
        if (synonyms.includes(cleanHeader) || standardField === cleanHeader) {
          mappedField = standardField;
          break;
        }
      }

      // Try partial matching if no exact match
      if (!mappedField) {
        for (const [standardField, synonyms] of Object.entries(HEADER_SYNONYMS)) {
          // Check if header contains any of the synonyms
          const hasPartialMatch = synonyms.some(
            synonym => cleanHeader.includes(synonym) || synonym.includes(cleanHeader)
          );

          if (hasPartialMatch) {
            mappedField = standardField;
            console.log(`[ExcelParser] 🔍 部分匹配: "${cleanHeader}" → "${standardField}"`);
            break;
          }
        }
      }

      // Try fuzzy matching if still no match
      if (!mappedField) {
        mappedField = fuzzyMatchHeader(cleanHeader, HEADER_SYNONYMS);
      }

      // Try semantic matching for common variations
      if (!mappedField) {
        if (cleanHeader.includes('學校') || cleanHeader.includes('校名')) {
          mappedField = '學校';
        } else if (cleanHeader.includes('學生') && cleanHeader.includes('姓名')) {
          mappedField = '姓名';
        } else if (cleanHeader.includes('年級') || cleanHeader.includes('級別')) {
          mappedField = '年級';
        } else if (cleanHeader.includes('班別') || cleanHeader.includes('班級')) {
          mappedField = '班別';
        } else if (cleanHeader.includes('類別') || cleanHeader.includes('類型')) {
          mappedField = '學校類別';
        }

        if (mappedField) {
          console.log(`[ExcelParser] 🧠 語義匹配: "${cleanHeader}" → "${mappedField}"`);
        }
      }

      if (mappedField) {
        normalized[mappedField] = index;
        headerMap[index] = mappedField;
      } else {
        console.warn('[ExcelParser] ⚠️ 未能映射標題:', cleanHeader);
      }
    });

    return { normalized, headerMap };
  },

  /**
   * Validate that required columns are present
   */
  validateRequiredColumns: normalizedHeaders => {
    const required = ['姓名', '學校'];

    console.log('[ExcelParser] 🔍 調試信息:');
    console.log('- normalizedHeaders:', normalizedHeaders);
    console.log('- normalizedHeaders.normalized:', normalizedHeaders.normalized);
    console.log('- 檢查學校欄位:', '學校' in normalizedHeaders.normalized);
    console.log('- 檢查姓名欄位:', '姓名' in normalizedHeaders.normalized);

    const missing = required.filter(field => {
      const exists = field in normalizedHeaders.normalized;
      console.log(`- 欄位 "${field}" 存在: ${exists}`);
      return !exists;
    });

    if (missing.length > 0) {
      console.error('[ExcelParser] ❌ 缺少必要欄位:', missing);
      console.log('[ExcelParser] 📋 已找到的欄位:', Object.keys(normalizedHeaders.normalized));
      throw new Error(`缺少必要欄位: ${missing.join(', ')}`);
    }

    console.log('[ExcelParser] ✅ 所有必要欄位已找到:', Object.keys(normalizedHeaders.normalized));
  },

  /**
   * Group data rows by school with propagation logic
   */
  groupDataBySchool: (dataRows, normalizedHeaders) => {
    const { normalized } = normalizedHeaders;
    const schoolGroups = new Map();
    let currentSchool = null;
    let currentSchoolType = null;

    dataRows.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) return;

      // Extract school info
      const schoolName = normalizeString(row[normalized['學校']] || '');
      const schoolType = normalizeString(row[normalized['學校類別']] || '');

      // School propagation logic
      if (schoolName) {
        currentSchool = schoolName;
        if (schoolType) {
          currentSchoolType = schoolType;
        }
      }

      // Skip rows without school context
      if (!currentSchool) {
        console.warn(`[ExcelParser] ⚠️ 第 ${rowIndex + 2} 行缺少學校資訊，跳過`);
        return;
      }

      // Extract student data
      const studentData = ExcelParser.extractStudentData(row, normalized, rowIndex + 2);

      // Skip rows without student name
      if (!studentData.name) {
        return;
      }

      // Create school key
      const schoolKey = `${currentSchool}|${currentSchoolType || ''}`;

      // Initialize school group if needed
      if (!schoolGroups.has(schoolKey)) {
        schoolGroups.set(schoolKey, {
          name: currentSchool,
          type: currentSchoolType,
          students: [],
        });
      }

      // Add student to school
      schoolGroups.get(schoolKey).students.push(studentData);
    });

    return Array.from(schoolGroups.values());
  },

  /**
   * Convert grouped data to schools model with validation
   */
  convertToSchoolsModel: groupedData => {
    return groupedData
      .map(group => {
        // Validate group structure
        if (!group.name || !Array.isArray(group.students)) {
          console.warn('[ExcelParser] ⚠️ 無效的學校群組:', group);
          return null;
        }

        // Infer school type from students if not provided
        const schoolType = ExcelParser.inferSchoolType(group.type, group.students);

        // Add duplicate hints
        const studentsWithHints = ExcelParser.generateDuplicateHints(group.students);

        return {
          name: ExcelParser.sanitizeString(group.name),
          schoolType,
          students: studentsWithHints,
          metadata: {
            studentCount: group.students.length,
            hasGrades: group.students.some(s => s.grade),
            hasClasses: group.students.some(s => s.class),
          },
        };
      })
      .filter(Boolean); // Remove null entries
  },

  /**
   * Extract student data from a row with input sanitization
   */
  extractStudentData: (row, normalized, rowNumber) => {
    const student = {
      rawRowNumber: rowNumber,
      name: ExcelParser.sanitizeString(row[normalized['姓名']] || ''),
      nameEn: ExcelParser.sanitizeString(row[normalized['英文姓名']] || ''),
      grade: ExcelParser.normalizeGrade(row[normalized['年級']] || ''),
      class: ExcelParser.sanitizeString(row[normalized['班別']] || ''),
      classNumber: ExcelParser.normalizeClassNumber(row[normalized['班內號碼']] || ''),
      gender: ExcelParser.normalizeGender(row[normalized['性別']] || ''),
      phone: ExcelParser.sanitizeString(row[normalized['電話']] || ''),
      email: ExcelParser.sanitizeString(row[normalized['電郵']] || ''),
      address: ExcelParser.sanitizeString(row[normalized['地址']] || ''),
    };

    // Remove empty fields
    Object.keys(student).forEach(key => {
      if (student[key] === '' || student[key] === null || student[key] === undefined) {
        delete student[key];
      }
    });

    return student;
  },

  /**
   * Sanitize string input to prevent injection attacks
   */
  sanitizeString: input => {
    if (typeof input !== 'string') {
      return normalizeString(String(input || ''));
    }

    // Remove potentially dangerous characters and normalize
    const sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();

    return normalizeString(sanitized);
  },

  /**
   * Normalize grade to HK standard format (P1-P6, S1-S6)
   */
  normalizeGrade: rawGrade => {
    if (!rawGrade || typeof rawGrade !== 'string') return null;

    const grade = normalizeString(rawGrade);

    // Try direct mapping first
    if (GRADE_MAP[grade]) {
      return GRADE_MAP[grade];
    }

    // Try pattern matching with security checks
    const patterns = [
      { regex: /^(小|primary|p)([1-6])$/i, transform: match => `P${match[2]}` },
      { regex: /^(中|secondary|s)([1-6])$/i, transform: match => `S${match[2]}` },
      { regex: /^([PS])([1-6])$/i, transform: match => `${match[1].toUpperCase()}${match[2]}` },
    ];

    for (const pattern of patterns) {
      const match = grade.match(pattern.regex);
      if (match) {
        return pattern.transform(match);
      }
    }

    console.warn('[ExcelParser] ⚠️ 無法標準化年級:', rawGrade);
    return ExcelParser.sanitizeString(rawGrade); // Return sanitized original if can't normalize
  },

  /**
   * Normalize class number to safe integer
   */
  normalizeClassNumber: rawNumber => {
    if (!rawNumber) return null;

    // Convert to string first for safety
    const str = String(rawNumber).trim();

    // Extract numbers only
    const numbers = str.replace(/[^\d]/g, '');

    if (!numbers) return null;

    const num = parseInt(numbers, 10);

    // Validate range for security
    if (isNaN(num) || num < 1 || num > 50) {
      console.warn('[ExcelParser] ⚠️ 班內號碼超出範圍:', rawNumber);
      return null;
    }

    return num;
  },

  /**
   * Normalize gender with validation
   */
  normalizeGender: rawGender => {
    if (!rawGender || typeof rawGender !== 'string') return null;

    const gender = normalizeString(rawGender).toLowerCase();
    const genderMap = {
      男: 'male',
      女: 'female',
      male: 'male',
      female: 'female',
      m: 'male',
      f: 'female',
      其他: 'other',
      other: 'other',
    };

    return genderMap[gender] || null;
  },

  /**
   * Infer school type from explicit type or student grades
   */
  inferSchoolType: (explicitType, students) => {
    // Use explicit type if available and normalize it
    if (explicitType && typeof explicitType === 'string') {
      const type = normalizeString(explicitType).toLowerCase();
      if (type.includes('小學') || type.includes('primary')) return 'primary';
      if (type.includes('中學') || type.includes('secondary')) return 'secondary';
      if (
        type.includes('特殊') ||
        type.includes('特校') ||
        type.includes('sen') ||
        type.includes('special') ||
        type.includes('綜合')
      )
        return 'special';
    }

    // Infer from student grades
    const grades = students
      .map(s => s.grade)
      .filter(g => g && typeof g === 'string' && (g.startsWith('P') || g.startsWith('S')));

    if (grades.length === 0) return 'primary'; // Default

    const hasPrimary = grades.some(g => g.startsWith('P'));
    const hasSecondary = grades.some(g => g.startsWith('S'));

    if (hasPrimary && hasSecondary) return 'special';
    if (hasSecondary) return 'secondary';
    return 'primary';
  },

  /**
   * Generate duplicate hints for students within the same school
   */
  generateDuplicateHints: students => {
    if (!Array.isArray(students)) return [];

    return students.map((student, index) => {
      const duplicates = [];

      // Check for potential duplicates
      for (let i = index + 1; i < students.length; i++) {
        const other = students[i];

        // Name similarity
        if (student.name && other.name && student.name === other.name) {
          duplicates.push({
            type: 'name',
            otherIndex: i,
            reason: '姓名相同',
          });
        }

        // Class number collision
        if (
          student.grade &&
          other.grade &&
          student.class &&
          other.class &&
          student.classNumber &&
          other.classNumber &&
          student.grade === other.grade &&
          student.class === other.class &&
          student.classNumber === other.classNumber
        ) {
          duplicates.push({
            type: 'class_collision',
            otherIndex: i,
            reason: '年級、班別、班內號碼相同',
          });
        }
      }

      return {
        ...student,
        duplicateHint: duplicates.length > 0 ? duplicates : null,
        duplicateResolution: duplicates.length > 0 ? 'pending' : null,
      };
    });
  },
};

export default ExcelParser;
