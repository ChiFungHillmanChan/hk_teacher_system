// Enhanced Student.js model with academic year progression tracking
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide student name'],
      trim: true,
      maxlength: [50, 'Student name cannot be more than 50 characters'],
    },
    nameEn: {
      type: String,
      trim: true,
      maxlength: [50, 'English name cannot be more than 50 characters'],
    },
    nameCh: {
      type: String,
      trim: true,
      maxlength: [50, 'Chinese name cannot be more than 50 characters'],
    },
    studentId: {
      type: String,
      default: null,
      required: false,
      trim: true,
    },
    school: {
      type: mongoose.Schema.ObjectId,
      ref: 'School',
      required: [true, 'Student must belong to a school'],
    },

    // CURRENT academic info (for quick access)
    currentAcademicYear: {
      type: String,
      required: [true, 'Please provide current academic year'],
      match: [/^\d{4}\/\d{2}$/, 'Academic year must be in format YYYY/YY (e.g., 2025/26)'],
    },
    currentGrade: {
      type: String,
      required: [true, 'Please provide current student grade'],
      enum: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
    },
    currentClass: {
      type: String,
      trim: true,
      maxlength: [10, 'Class cannot be more than 10 characters'],
    },
    currentClassNumber: {
      type: Number,
      min: [1, 'Class number must be at least 1'],
      max: [50, 'Class number cannot be more than 50'],
    },

    // NEW: Academic progression history
    academicHistory: [
      {
        academicYear: {
          type: String,
          required: true,
          match: [/^\d{4}\/\d{2}$/, 'Academic year must be in format YYYY/YY'],
        },
        grade: {
          type: String,
          required: true,
          enum: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
        },
        class: {
          type: String,
          trim: true,
          maxlength: [10, 'Class cannot be more than 10 characters'],
        },
        classNumber: {
          type: Number,
          min: [1, 'Class number must be at least 1'],
          max: [50, 'Class number cannot be more than 50'],
        },
        school: {
          type: mongoose.Schema.ObjectId,
          ref: 'School',
          required: true,
        },
        status: {
          type: String,
          enum: ['enrolled', 'transferred', 'graduated', 'dropped_out', 'suspended', 'promoted'],
          default: 'enrolled',
        },
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
        },
        // For year-end processing
        promotionStatus: {
          type: String,
          enum: ['promoted', 'retained', 'transferred', 'graduated', 'pending'],
          default: 'pending',
        },
        finalGrades: {
          overall: String,
          subjects: [
            {
              name: String,
              grade: String,
              score: Number,
            },
          ],
        },
        notes: String,
        createdBy: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
        },
        updatedBy: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Keep existing fields...
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    contactInfo: {
      parentName: String,
      parentPhone: String,
      parentEmail: String,
      address: String,
      emergencyContact: {
        name: String,
        phone: String,
        relationship: String,
      },
    },
    medicalInfo: {
      allergies: [String],
      medications: [String],
      specialNeeds: String,
      healthNotes: String,
      hasIEP: {
        type: Boolean,
        default: false,
      },
      iepDetails: {
        startDate: Date,
        endDate: Date,
        goals: [String],
        accommodations: [String],
        notes: String,
      },
    },
    teachers: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
        },
        subjects: [String],
        isPrimaryTeacher: {
          type: Boolean,
          default: false,
        },
        academicYear: String, // Track which year this assignment was for
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['enrolled', 'transferred', 'graduated', 'dropped_out', 'suspended'],
      default: 'enrolled',
    },
    notes: String,
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const validateGradeAgainstSchoolType = async function () {
  if (this.isModified('currentGrade') || this.isModified('school')) {
    const school = await this.constructor.model('School').findById(this.school);
    if (school) {
      const availableGrades = school.getAvailableGrades();
      if (!availableGrades.includes(this.currentGrade)) {
        throw new Error(
          `Grade ${this.currentGrade} is not available for school type ${school.schoolType}`
        );
      }
    }
  }
};

// Apply the validation as a pre-save hook
studentSchema.pre('save', validateGradeAgainstSchoolType);

studentSchema.methods.promoteToNextYear = function (nextYearData, userId) {
  const currentRecord = {
    academicYear: this.currentAcademicYear,
    grade: this.currentGrade,
    class: this.currentClass,
    classNumber: this.currentClassNumber,
    school: this.school,
    status: 'enrolled',
    startDate: new Date(`${this.currentAcademicYear.split('/')[0]}-09-01`),
    endDate: new Date(),
    promotionStatus: nextYearData.promotionStatus || 'promoted',
    finalGrades: nextYearData.finalGrades || {},
    notes: nextYearData.notes || '',
    createdBy: userId,
    updatedBy: userId,
  };

  // Add current year to history
  this.academicHistory.push(currentRecord);

  // Update current info
  this.currentAcademicYear = nextYearData.academicYear;
  this.currentGrade = nextYearData.grade;
  this.currentClass = nextYearData.class;
  this.currentClassNumber = nextYearData.classNumber;
  this.lastModifiedBy = userId;

  return this.save();
};

// Get student info for specific academic year
studentSchema.methods.getAcademicYearInfo = function (academicYear) {
  if (academicYear === this.currentAcademicYear) {
    return {
      academicYear: this.currentAcademicYear,
      grade: this.currentGrade,
      class: this.currentClass,
      classNumber: this.currentClassNumber,
      school: this.school,
      status: this.status,
      isCurrent: true,
    };
  }

  const historicalRecord = this.academicHistory.find(
    record => record.academicYear === academicYear
  );

  return historicalRecord
    ? {
        ...historicalRecord.toObject(),
        isCurrent: false,
      }
    : null;
};

// Get all academic years for this student
studentSchema.methods.getAllAcademicYears = function () {
  const years = this.academicHistory.map(record => record.academicYear);
  years.push(this.currentAcademicYear);
  return [...new Set(years)].sort();
};

// Static method to search students across academic years
studentSchema.statics.findByAcademicYear = function (schoolId, academicYear, options = {}) {
  const query = {
    school: schoolId,
    isActive: true,
  };

  // Search in current year
  if (options.searchCurrent !== false) {
    query.$or = [{ currentAcademicYear: academicYear }];
  }

  // Also search in academic history
  if (options.searchHistory !== false) {
    if (!query.$or) query.$or = [];
    query.$or.push({
      'academicHistory.academicYear': academicYear,
    });
  }

  if (options.grade) {
    // This is more complex - need to check both current and historical
    const gradeQuery = {
      $or: [
        { currentGrade: options.grade, currentAcademicYear: academicYear },
        {
          academicHistory: {
            $elemMatch: {
              academicYear: academicYear,
              grade: options.grade,
            },
          },
        },
      ],
    };

    if (query.$or) {
      query.$and = [{ $or: query.$or }, gradeQuery];
      delete query.$or;
    } else {
      Object.assign(query, gradeQuery);
    }
  }

  return this.find(query)
    .populate('school', 'name nameEn nameCh')
    .populate('teachers.user', 'name email')
    .sort({ currentGrade: 1, currentClass: 1, currentClassNumber: 1, name: 1 });
};

module.exports = mongoose.model('Student', studentSchema);
