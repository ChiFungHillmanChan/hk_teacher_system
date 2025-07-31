const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema(
  {
    // 基本資料 - Basic Information
    name: {
      type: String,
      required: [true, 'Please provide school name'],
      trim: true,
      maxlength: [100, 'School name cannot be more than 100 characters'],
    },
    nameEn: {
      type: String,
      trim: true,
      maxlength: [100, 'English school name cannot be more than 100 characters'],
    },
    schoolType: {
      type: String,
      enum: ['primary', 'secondary', 'both'],
      required: [true, 'Please specify school type'],
    },
    district: {
      type: String,
      enum: [
        'Central and Western',
        'Eastern',
        'Southern',
        'Wan Chai',
        'Kowloon City',
        'Kwun Tong',
        'Sham Shui Po',
        'Wong Tai Sin',
        'Yau Tsim Mong',
        'Islands',
        'Kwai Tsing',
        'North',
        'Sai Kung',
        'Sha Tin',
        'Tai Po',
        'Tsuen Wan',
        'Tuen Mun',
        'Yuen Long',
      ],
    },

    // 位置資訊 - Location Information
    address: {
      type: String,
      trim: true,
    },

    // 聯絡資訊 - Contact Information
    contactPerson: {
      type: String,
      trim: true,
      maxlength: [50, 'Contact person name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
    },

    // 其他資訊 - Other Information
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'School description cannot be more than 1000 characters'],
    },

    // System fields (unchanged from original)
    academicYears: [
      {
        year: {
          type: String,
          required: true,
          match: [/^\d{4}\/\d{2}$/, 'Academic year must be in format YYYY/YY (e.g., 2025/26)'],
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        startDate: Date,
        endDate: Date,
      },
    ],
    grades: {
      primary: {
        enabled: {
          type: Boolean,
          default: false,
        },
        levels: [
          {
            type: String,
            enum: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
          },
        ],
      },
      secondary: {
        enabled: {
          type: Boolean,
          default: false,
        },
        levels: [
          {
            type: String,
            enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
          },
        ],
      },
    },
    subjects: [
      {
        name: {
          type: String,
          required: true,
        },
        nameEn: String,
        nameCh: String,
        code: String,
        grades: [
          {
            type: String,
            enum: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
          },
        ],
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    teachers: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['teacher', 'head_teacher', 'admin'],
          default: 'teacher',
        },
        subjects: [
          {
            type: String,
          },
        ],
        grades: [
          {
            type: String,
            enum: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
          },
        ],
        startDate: {
          type: Date,
          default: Date.now,
        },
        endDate: Date,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    settings: {
      allowMultipleTeachers: {
        type: Boolean,
        default: true,
      },
      requireApproval: {
        type: Boolean,
        default: false,
      },
      maxStudentsPerClass: {
        type: Number,
        default: 40,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
schoolSchema.index({ name: 1 });
schoolSchema.index({ district: 1 });
schoolSchema.index({ schoolType: 1 });
schoolSchema.index({ 'teachers.user': 1 });
schoolSchema.index({ 'academicYears.year': 1 });
schoolSchema.index({ isActive: 1 });

// Virtual to get current academic year
schoolSchema.virtual('currentAcademicYear').get(function () {
  if (!this.academicYears || this.academicYears.length === 0) {
    return null;
  }

  const activeYear = this.academicYears.find(year => year.isActive);
  return activeYear ? activeYear.year : this.academicYears[0].year;
});

// Virtual to get school display name
schoolSchema.virtual('displayName').get(function () {
  return this.nameEn ? `${this.name} (${this.nameEn})` : this.name;
});

// Method to add teacher
schoolSchema.methods.addTeacher = function (teacherData) {
  if (!this.teachers) {
    this.teachers = [];
  }

  const existingTeacher = this.teachers.find(
    t => t.user.toString() === teacherData.user.toString()
  );

  if (existingTeacher) {
    throw new Error('Teacher already exists in this school');
  }

  this.teachers.push(teacherData);
  return this.save();
};

// Method to remove teacher
schoolSchema.methods.removeTeacher = function (userId) {
  if (!this.teachers) {
    this.teachers = [];
  }

  this.teachers = this.teachers.filter(t => t.user.toString() !== userId.toString());
  return this.save();
};

// Method to add subject
schoolSchema.methods.addSubject = function (subjectData) {
  if (!this.subjects) {
    this.subjects = [];
  }

  const existingSubject = this.subjects.find(s => s.name === subjectData.name);
  if (existingSubject) {
    throw new Error('Subject already exists');
  }

  this.subjects.push(subjectData);
  return this.save();
};

// Method to get available grades based on school type
schoolSchema.methods.getAvailableGrades = function () {
  const grades = [];

  if (!this.grades) {
    return grades;
  }

  if (this.grades.primary && this.grades.primary.enabled && this.grades.primary.levels) {
    grades.push(...this.grades.primary.levels);
  }

  if (this.grades.secondary && this.grades.secondary.enabled && this.grades.secondary.levels) {
    grades.push(...this.grades.secondary.levels);
  }

  return grades;
};

// Static method to get default subjects for Hong Kong schools
schoolSchema.statics.getDefaultSubjects = function (schoolType) {
  const primarySubjects = [
    { name: 'Chinese Language', nameEn: 'Chinese Language', nameCh: '中國語文', code: 'CHI' },
    { name: 'English Language', nameEn: 'English Language', nameCh: '英國語文', code: 'ENG' },
    { name: 'Mathematics', nameEn: 'Mathematics', nameCh: '數學', code: 'MAT' },
    { name: 'General Studies', nameEn: 'General Studies', nameCh: '常識', code: 'GS' },
  ];

  const secondarySubjects = [
    { name: 'Chinese Language', nameEn: 'Chinese Language', nameCh: '中國語文', code: 'CHI' },
    { name: 'English Language', nameEn: 'English Language', nameCh: '英國語文', code: 'ENG' },
    { name: 'Mathematics', nameEn: 'Mathematics', nameCh: '數學', code: 'MAT' },
    { name: 'Liberal Studies', nameEn: 'Liberal Studies', nameCh: '通識教育', code: 'LS' },
    { name: 'Physics', nameEn: 'Physics', nameCh: '物理', code: 'PHY' },
    { name: 'Chemistry', nameEn: 'Chemistry', nameCh: '化學', code: 'CHE' },
    { name: 'Biology', nameEn: 'Biology', nameCh: '生物', code: 'BIO' },
    { name: 'History', nameEn: 'History', nameCh: '歷史', code: 'HIS' },
    { name: 'Geography', nameEn: 'Geography', nameCh: '地理', code: 'GEO' },
  ];

  switch (schoolType) {
    case 'primary':
      return primarySubjects;
    case 'secondary':
      return secondarySubjects;
    case 'both':
      return [...primarySubjects, ...secondarySubjects];
    default:
      return [];
  }
};

module.exports = mongoose.model('School', schoolSchema);
