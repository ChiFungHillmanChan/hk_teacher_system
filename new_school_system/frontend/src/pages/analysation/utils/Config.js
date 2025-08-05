// src/pages/analysation/utils/Config.js

export const UI_STRINGS = {
  selectTitle: '請選擇上傳檔案類型',
  uploadPdf: '上傳 PDF/Word',
  uploadExcel: '上傳 Excel/CSV',
  previewTitle: '預覽並確認資料',
  importButton: '開始匯入',

  // Step indicators
  steps: {
    pdf: ['選擇檔案', 'AI 分析', '預覽資料', '匯入完成'],
    excel: ['選擇檔案', '解析檔案', '確認資料', '匯入完成'],
  },

  // Status messages
  status: {
    processing: '處理中...',
    success: '完成',
    error: '錯誤',
    warning: '警告',
  },

  // Validation messages
  validation: {
    schoolRequired: '學校名稱不能為空',
    studentNameRequired: '學生姓名不能為空',
    gradeInvalid: '無效的年級格式',
    classNumberRange: '班內號碼應在 1-50 之間',
  },
};

// Enhanced header synonyms for Excel column mapping with better matching
export const HEADER_SYNONYMS = {
  姓名: [
    '姓名',
    '學生姓名',
    '學生名稱',
    '學生名字',
    '名稱',
    '名字',
    '全名',
    '中文姓名',
    'name',
    'student_name',
    'studentname',
    'full_name',
    'fullname',
    '學員姓名',
    '學員名稱',
    '姓氏名字',
  ],
  英文姓名: [
    '英文姓名',
    '英文名',
    '英文名字',
    '英語姓名',
    '英語名字',
    '英文全名',
    'english_name',
    'english name',
    'name_en',
    'english',
    'eng_name',
    '英語名稱',
    'englishname',
  ],
  年級: [
    '年級',
    '級別',
    '班級',
    '學年',
    '年班',
    '等級',
    '程度',
    'grade',
    'level',
    'class_level',
    'year',
    'form',
    '年度',
    '學級',
    '級數',
  ],
  班別: [
    '班別',
    '班級名稱',
    '班級',
    '班',
    '組別',
    '班號',
    '班名',
    'class',
    'class_name',
    'className',
    'section',
    'group',
    '班組',
    '分班',
    '班次',
  ],
  班內號碼: [
    '班內號碼',
    '座號',
    '學號',
    '號碼',
    '編號',
    '序號',
    '學生號碼',
    '班內編號',
    'class_number',
    'seat_number',
    'number',
    'student_number',
    'roll_number',
    '座位號',
    '學籍號',
    '班級號碼',
    '內部編號',
  ],
  學校: [
    '學校',
    '學校名稱',
    '校名',
    '學校名',
    '院校',
    '學院',
    '校',
    '學府',
    'school',
    'school_name',
    'schoolname',
    'institution',
    'academy',
    '學校全名',
    '校園',
    '教育機構',
  ],
  學校類別: [
    '學校類別',
    '學校類型',
    '校別',
    '類別',
    '類型',
    '學校性質',
    '辦學類型',
    'school_type',
    'type',
    'category',
    'kind',
    'school_category',
    '辦學性質',
    '學校分類',
    '教育類型',
  ],
  性別: ['性別', '男女', '性', '別', 'gender', 'sex', 'male_female', 'm_f', '性別欄', '男/女'],
  電話: [
    '電話',
    '聯絡電話',
    '電話號碼',
    '手機',
    '聯絡號碼',
    '通訊電話',
    '家庭電話',
    'phone',
    'telephone',
    'mobile',
    'contact',
    'tel',
    'cell',
    '手機號碼',
    '聯繫電話',
    '電話欄',
  ],
  電郵: [
    '電郵',
    '電子郵件',
    '郵箱',
    '電郵地址',
    '電子郵箱',
    '信箱',
    'email',
    'e-mail',
    'mail',
    'email_address',
    'e_mail',
    '郵件地址',
    '電子信箱',
    '網絡郵箱',
  ],
  地址: [
    '地址',
    '住址',
    '居住地址',
    '家庭地址',
    '通訊地址',
    '聯絡地址',
    'address',
    'location',
    'home_address',
    'residence',
    'addr',
    '住所',
    '居所',
    '地址欄',
  ],
};

export const SCHOOL_TYPE_MAP = {
  小學: 'primary',
  中學: 'secondary',
  特殊學校: 'special', // NEW: Add special school mapping
  特校: 'special', // NEW: Short form
  SEN學校: 'special', // NEW: Alternative name
  小學及中學: 'special', // NEW: MixVALIDATION_RULESed type schools
  綜合學校: 'special', // NEW: Comprehensive schools
  primary: 'primary',
  secondary: 'secondary',
  special: 'special', // NEW: Add special
  both: 'special', // MIGRATION: Map old 'both' to 'special' for compatibility
  國小: 'primary',
  國中: 'secondary',
  高中: 'secondary',
};

// Grade mapping for normalization
export const GRADE_MAP = {
  // Chinese formats
  小一: 'P1',
  小二: 'P2',
  小三: 'P3',
  小四: 'P4',
  小五: 'P5',
  小六: 'P6',
  中一: 'S1',
  中二: 'S2',
  中三: 'S3',
  中四: 'S4',
  中五: 'S5',
  中六: 'S6',

  // English formats
  'primary-1': 'P1',
  'primary-2': 'P2',
  'primary-3': 'P3',
  'primary-4': 'P4',
  'primary-5': 'P5',
  'primary-6': 'P6',
  'secondary-1': 'S1',
  'secondary-2': 'S2',
  'secondary-3': 'S3',
  'secondary-4': 'S4',
  'secondary-5': 'S5',
  'secondary-6': 'S6',

  // Alternative formats
  p1: 'P1',
  p2: 'P2',
  p3: 'P3',
  p4: 'P4',
  p5: 'P5',
  p6: 'P6',
  s1: 'S1',
  s2: 'S2',
  s3: 'S3',
  s4: 'S4',
  s5: 'S5',
  s6: 'S6',

  // Numeric with grade indicators
  '1年級': 'P1',
  '2年級': 'P2',
  '3年級': 'P3',
  '4年級': 'P4',
  '5年級': 'P5',
  '6年級': 'P6',
  '7年級': 'S1',
  '8年級': 'S2',
  '9年級': 'S3',
  '10年級': 'S4',
  '11年級': 'S5',
  '12年級': 'S6',

  // Form system (traditional HK)
  form1: 'S1',
  form2: 'S2',
  form3: 'S3',
  form4: 'S4',
  form5: 'S5',
  form6: 'S6',
  f1: 'S1',
  f2: 'S2',
  f3: 'S3',
  f4: 'S4',
  f5: 'S5',
  f6: 'S6',

  // Alternative Chinese formats
  小學一年級: 'P1',
  小學二年級: 'P2',
  小學三年級: 'P3',
  小學四年級: 'P4',
  小學五年級: 'P5',
  小學六年級: 'P6',
  中學一年級: 'S1',
  中學二年級: 'S2',
  中學三年級: 'S3',
  中學四年級: 'S4',
  中學五年級: 'S5',
  中學六年級: 'S6',

  // Mainland China formats
  初一: 'S1',
  初二: 'S2',
  初三: 'S3',
  高一: 'S4',
  高二: 'S5',
  高三: 'S6',
};

// Validation rules configuration
export const VALIDATION_RULES = {
  blocking: {
    school: [
      { field: 'name', rule: 'required', message: '學校名稱不能為空' },
      { field: 'name', rule: 'maxLength', value: 100, message: '學校名稱不能超過100字符' },
      { field: 'schoolType', rule: 'required', message: '學校類別不能為空' },
      {
        field: 'schoolType',
        rule: 'enum',
        values: ['primary', 'secondary', 'special'],
        message: '無效的學校類別',
      },
    ],
    student: [
      { field: 'name', rule: 'required', message: '學生姓名不能為空' },
      { field: 'name', rule: 'maxLength', value: 50, message: '學生姓名不能超過50字符' },
      {
        field: 'grade',
        rule: 'enum',
        values: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
        message: '無效的年級格式',
      },
    ],
  },
  warning: {
    school: [
      { field: 'email', rule: 'email', message: '電郵格式無效' },
      { field: 'phone', rule: 'phone', message: '電話號碼格式無效' },
    ],
    student: [
      { field: 'classNumber', rule: 'range', min: 1, max: 50, message: '班內號碼應在1-50之間' },
      { field: 'email', rule: 'email', message: '電郵格式無效' },
      { field: 'phone', rule: 'phone', message: '電話號碼格式無效' },
      {
        field: 'class',
        rule: 'pattern',
        pattern: /^[1-6][A-Z]?$/i,
        message: '班別格式建議使用 1A、2B 等標準格式',
      },
    ],
  },
};

// File processing configuration
export const FILE_CONFIG = {
  maxSize: 25 * 1024 * 1024, // 25MB
  allowedTypes: {
    excel: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
    ],
    pdf: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ],
  },
  extensions: {
    excel: ['.xlsx', '.xls', '.csv'],
    pdf: ['.pdf', '.docx', '.doc'],
  },
};

// Import configuration
export const IMPORT_CONFIG = {
  maxSchoolsPerImport: 50,
  maxStudentsPerSchool: 1000,
  batchSize: 10,
  retryAttempts: 3,
  timeoutMs: 30000,
};
