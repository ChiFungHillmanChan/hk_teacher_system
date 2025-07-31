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
    academicYear: {
      type: String,
      required: [true, 'Please provide academic year'],
      match: [/^\d{4}\/\d{2}$/, 'Academic year must be in format YYYY/YY (e.g., 2025/26)'],
    },
    grade: {
      type: String,
      required: [true, 'Please provide student grade'],
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
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    contactInfo: {
      parentName: {
        type: String,
        trim: true,
      },
      parentPhone: {
        type: String,
        trim: true,
      },
      parentEmail: {
        type: String,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
      },
      address: {
        type: String,
        trim: true,
      },
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
    },
    academicInfo: {
      previousSchool: String,
      admissionDate: Date,
      graduationDate: Date,
      specialPrograms: [String],
      languageOfInstruction: {
        type: String,
        enum: ['chinese', 'english', 'both'],
        default: 'chinese',
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
      },
    ],
    subjects: [
      {
        name: String,
        teacher: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
        },
        isActive: {
          type: Boolean,
          default: true,
        },
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
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot be more than 1000 characters'],
    },
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

// Compound indexes for performance
studentSchema.index({ school: 1, academicYear: 1, grade: 1 });
studentSchema.index(
  { school: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { studentId: { $exists: true, $ne: null } } }
);
studentSchema.index({ name: 1, school: 1 });
studentSchema.index({ 'teachers.user': 1 });
studentSchema.index({ isActive: 1, status: 1 });

// Virtual to get age
studentSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
});

// Virtual to get full name
studentSchema.virtual('fullName').get(function () {
  if (this.nameEn && this.nameCh) {
    return `${this.nameEn} (${this.nameCh})`;
  }
  return this.name;
});

// Virtual to get primary teacher
studentSchema.virtual('primaryTeacher').get(function () {
  if (!this.teachers || !Array.isArray(this.teachers)) {
    return null;
  }
  return this.teachers.find(t => t.isPrimaryTeacher) || null;
});

// Virtual to get grade level (primary/secondary)
studentSchema.virtual('gradeLevel').get(function () {
  if (!this.grade) {
    return null;
  }
  return this.grade.startsWith('P') ? 'primary' : 'secondary';
});

// Virtual to get grade number
studentSchema.virtual('gradeNumber').get(function () {
  if (!this.grade || this.grade.length < 2) {
    return null;
  }
  return parseInt(this.grade.substring(1));
});

// Pre-save middleware to set lastModifiedBy
studentSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.lastModifiedBy = this.modifiedBy || this.createdBy;
  }
  next();
});

// Method to add teacher
studentSchema.methods.addTeacher = function (teacherData) {
  if (!this.teachers) {
    this.teachers = [];
  }

  const existingTeacher = this.teachers.find(
    t => t.user.toString() === teacherData.user.toString()
  );

  if (existingTeacher) {
    Object.assign(existingTeacher, teacherData);
  } else {
    this.teachers.push(teacherData);
  }

  return this.save();
};

// Method to remove teacher
studentSchema.methods.removeTeacher = function (userId) {
  if (!this.teachers) {
    this.teachers = [];
    return this.save();
  }

  this.teachers = this.teachers.filter(t => t.user.toString() !== userId.toString());
  return this.save();
};

// Method to set primary teacher
studentSchema.methods.setPrimaryTeacher = function (userId) {
  if (!this.teachers) {
    this.teachers = [];
    throw new Error('No teachers found for this student');
  }

  this.teachers.forEach(t => (t.isPrimaryTeacher = false));

  const teacher = this.teachers.find(t => t.user.toString() === userId.toString());
  if (!teacher) {
    throw new Error('Teacher not found');
  }

  teacher.isPrimaryTeacher = true;
  return this.save();
};

// Method to add subject
studentSchema.methods.addSubject = function (subjectData) {
  if (!this.subjects) {
    this.subjects = [];
  }

  const existingSubject = this.subjects.find(s => s.name === subjectData.name);

  if (existingSubject) {
    Object.assign(existingSubject, subjectData);
  } else {
    this.subjects.push(subjectData);
  }

  return this.save();
};

// Method to remove subject
studentSchema.methods.removeSubject = function (subjectName) {
  if (!this.subjects) {
    this.subjects = [];
    return this.save();
  }

  this.subjects = this.subjects.filter(s => s.name !== subjectName);
  return this.save();
};

// Method to get active subjects
studentSchema.methods.getActiveSubjects = function () {
  if (!this.subjects) {
    return [];
  }

  return this.subjects.filter(s => s.isActive);
};

// Method to update status
studentSchema.methods.updateStatus = function (newStatus, notes) {
  this.status = newStatus;
  if (notes) {
    this.notes = this.notes ? `${this.notes}\n${notes}` : notes;
  }

  if (newStatus !== 'enrolled') {
    this.isActive = false;
  }

  return this.save();
};

// Static method to get students by teacher
studentSchema.statics.getStudentsByTeacher = function (teacherId, options = {}) {
  const query = {
    'teachers.user': teacherId,
    isActive: true,
  };

  if (options.school) query.school = options.school;
  if (options.academicYear) query.academicYear = options.academicYear;
  if (options.grade) query.grade = options.grade;
  if (options.subject) query['subjects.name'] = options.subject;

  return this.find(query)
    .populate('school', 'name nameEn nameCh')
    .populate('teachers.user', 'name email')
    .sort({ grade: 1, class: 1, classNumber: 1, name: 1 });
};

// Static method to get students by school and academic year
studentSchema.statics.getStudentsBySchoolAndYear = function (schoolId, academicYear, options = {}) {
  const query = {
    school: schoolId,
    academicYear: academicYear,
    isActive: true,
  };

  if (options.grade) query.grade = options.grade;
  if (options.class) query.class = options.class;
  if (options.status) query.status = options.status;

  return this.find(query)
    .populate('teachers.user', 'name email')
    .sort({ grade: 1, class: 1, classNumber: 1, name: 1 });
};

studentSchema.index(
  { studentId: 1, school: 1 },
  {
    unique: true,
    partialFilterExpression: { studentId: { $exists: true, $ne: '' } },
  }
);

// Static method to search students
studentSchema.statics.searchStudents = function (searchTerm, schoolId, options = {}) {
  const query = {
    school: schoolId,
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { nameEn: { $regex: searchTerm, $options: 'i' } },
      { nameCh: { $regex: searchTerm, $options: 'i' } },
      { studentId: { $regex: searchTerm, $options: 'i' } },
    ],
  };

  if (options.academicYear) query.academicYear = options.academicYear;
  if (options.grade) query.grade = options.grade;

  return this.find(query)
    .populate('school', 'name')
    .populate('teachers.user', 'name')
    .sort({ name: 1 })
    .limit(options.limit || 50);
};

studentSchema.statics.getForYearSummary = function (schoolId, gradeRange, options = {}) {
  const query = {
    school: schoolId,
    isActive: true,
    status: 'enrolled'
  };

  // Filter by grade range
  if (gradeRange === 'grades-1-5') {
    query.grade = { 
      $in: ['P1', 'P2', 'P3', 'P4', 'P5', 'S1', 'S2', 'S3', 'S4', 'S5'] 
    };
  } else if (gradeRange === 'grade-6') {
    query.grade = { $in: ['P6', 'S6'] };
  }

  if (options.academicYear) {
    query.academicYear = options.academicYear;
  }

  return this.find(query)
    .populate('school', 'name nameEn schoolType')
    .sort({ grade: 1, class: 1, classNumber: 1, name: 1 });
};

// Get next grade for a student
studentSchema.methods.getNextGrade = function () {
  const gradeOrder = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
  const currentIndex = gradeOrder.indexOf(this.grade);
  
  if (currentIndex === -1 || currentIndex === gradeOrder.length - 1) {
    return null; // No next grade
  }
  
  return gradeOrder[currentIndex + 1];
};

studentSchema.methods.canUpgrade = function () {
  return this.getNextGrade() !== null && this.status === 'enrolled';
};

module.exports = mongoose.model('Student', studentSchema);
