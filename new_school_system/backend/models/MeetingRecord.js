const mongoose = require('mongoose');

const meetingRecordSchema = new mongoose.Schema(
  {
    // Basic Meeting Info
    student: {
      type: mongoose.Schema.ObjectId,
      ref: 'Student',
      required: [true, 'Meeting must be for a specific student'],
    },
    school: {
      type: mongoose.Schema.ObjectId,
      ref: 'School',
      required: [true, 'Meeting must belong to a school'],
    },
    academicYear: {
      type: String,
      required: [true, 'Please provide academic year'],
      match: [/^\d{4}\/\d{2}$/, 'Academic year must be in format YYYY/YY (e.g., 2025/26)'],
    },

    // Meeting Type
    meetingType: {
      type: String,
      enum: ['regular', 'iep'],
      required: [true, 'Please specify meeting type'],
    },

    // REQUIRED FIELDS (Both Regular & IEP)
    meetingTitle: {
      type: String,
      required: [true, 'Please provide meeting title'],
      maxlength: [200, 'Meeting title cannot exceed 200 characters'],
    },
    meetingDate: {
      type: Date,
      required: [true, 'Please provide meeting date'],
    },
    endTime: {
      type: String, // Format: "15:30"
      required: [true, 'Please provide end time'],
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'],
    },

    // 與會人員 - Meeting Participants (Text field, not array)
    participants: {
      type: String,
      required: [true, 'Please provide meeting participants'],
      maxlength: [2000, 'Participants list cannot exceed 2000 characters'],
    },

    meetingLocation: {
      type: String,
      required: [true, 'Please provide meeting location'],
      maxlength: [200, 'Meeting location cannot exceed 200 characters'],
    },

    // 學生特殊學習需要類別 - SEN Categories (Multiple selection)
    senCategories: [
      {
        type: String,
        enum: [
          '注意力不足/過度活躍症', // ADHD
          '自閉症譜系障礙', // Autism Spectrum Disorder
          '聽力障礙', // Hearing Impairment
          '精神疾病', // Mental Illness
          '肢體傷殘', // Physical Disability
          '特殊學習困難', // Specific Learning Difficulties
          '言語障礙', // Speech and Language Impairment
          '視覺障礙', // Visual Impairment
          '智力障礙', // Intellectual Disability
          '其他', // Others
          '沒有', // None
        ],
        required: true,
      },
    ],

    // 會議內容 - Meeting Content
    meetingContent: {
      type: String,
      required: [true, 'Please provide meeting content'],
      maxlength: [5000, 'Meeting content cannot exceed 5000 characters'],
    },

    // IEP-SPECIFIC REQUIRED FIELDS
    // 學校支援層級 - School Support Level (Only for IEP)
    supportLevel: {
      type: String,
      enum: ['第一層', '第二層', '第三層', '其他', '沒有'],
      required: function () {
        return this.meetingType === 'iep';
      },
    },

    // OPTIONAL FIELDS
    // 學生特殊學習需要類別 - 其他 (when "其他" is selected)
    senCategoriesOther: {
      type: String,
      maxlength: [500, 'SEN categories other description cannot exceed 500 characters'],
    },

    // 備註 - Remarks (Both Regular & IEP)
    remarks: {
      type: String,
      maxlength: [2000, 'Remarks cannot exceed 2000 characters'],
    },

    // IEP-SPECIFIC OPTIONAL FIELDS
    // 學生在校學習現況 - Student's Current Learning Status at School
    currentLearningStatus: {
      type: String,
      maxlength: [2000, 'Current learning status cannot exceed 2000 characters'],
    },

    // 課程調適 - Curriculum Adaptation
    curriculumAdaptation: {
      type: String,
      maxlength: [2000, 'Curriculum adaptation cannot exceed 2000 characters'],
    },

    // 教學調適 - Teaching Adaptation
    teachingAdaptation: {
      type: String,
      maxlength: [2000, 'Teaching adaptation cannot exceed 2000 characters'],
    },

    // 朋輩支援 - Peer Support
    peerSupport: {
      type: String,
      maxlength: [2000, 'Peer support cannot exceed 2000 characters'],
    },

    // 教師協作 - Teacher Collaboration
    teacherCollaboration: {
      type: String,
      maxlength: [2000, 'Teacher collaboration cannot exceed 2000 characters'],
    },

    // 課堂管理 - Classroom Management
    classroomManagement: {
      type: String,
      maxlength: [2000, 'Classroom management cannot exceed 2000 characters'],
    },

    // 評估調適 - Assessment Adaptation
    assessmentAdaptation: {
      type: String,
      maxlength: [2000, 'Assessment adaptation cannot exceed 2000 characters'],
    },

    // 功課調適 - Homework Adaptation
    homeworkAdaptation: {
      type: String,
      maxlength: [2000, 'Homework adaptation cannot exceed 2000 characters'],
    },

    // 老師建議 - Teacher Recommendations
    teacherRecommendations: {
      type: String,
      maxlength: [2000, 'Teacher recommendations cannot exceed 2000 characters'],
    },

    // 家長建議 - Parent Recommendations
    parentRecommendations: {
      type: String,
      maxlength: [2000, 'Parent recommendations cannot exceed 2000 characters'],
    },

    // File Attachments
    attachments: [
      {
        name: String,
        url: String,
        type: {
          type: String,
          enum: ['document', 'image', 'pdf', 'other'],
          default: 'document',
        },
        uploadedBy: {
          type: mongoose.Schema.ObjectId,
          ref: 'User',
        },
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // System Fields
    status: {
      type: String,
      enum: ['draft', 'completed', 'archived'],
      default: 'completed',
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

// Indexes for performance
meetingRecordSchema.index({ student: 1, meetingDate: -1 });
meetingRecordSchema.index({ school: 1, academicYear: 1, meetingType: 1 });
meetingRecordSchema.index({ meetingType: 1, status: 1 });
meetingRecordSchema.index({ createdBy: 1, meetingDate: -1 });

// Virtual to check if meeting is IEP-related
meetingRecordSchema.virtual('isIEPMeeting').get(function () {
  return this.meetingType === 'iep';
});

// Custom validation for participants count
meetingRecordSchema.pre('validate', function (next) {
  if (this.meetingType === 'regular') {
    // Regular meeting: max 50 people (estimate 25 characters per person on average)
    if (this.participants && this.participants.length > 1250) {
      return next(new Error('Regular meeting participants list is too long (max ~50 people)'));
    }
  } else if (this.meetingType === 'iep') {
    // IEP meeting: max 200 people (estimate 25 characters per person on average)
    if (this.participants && this.participants.length > 5000) {
      return next(new Error('IEP meeting participants list is too long (max ~200 people)'));
    }
  }
  next();
});

// Static method to get meetings by student
meetingRecordSchema.statics.getMeetingsByStudent = function (studentId, options = {}) {
  const query = { student: studentId };

  if (options.academicYear) query.academicYear = options.academicYear;
  if (options.meetingType) query.meetingType = options.meetingType;
  if (options.status) query.status = options.status;
  if (options.startDate && options.endDate) {
    query.meetingDate = { $gte: options.startDate, $lte: options.endDate };
  }

  return this.find(query)
    .populate('student', 'name nameEn nameCh studentId currentGrade currentClass')
    .populate('school', 'name nameEn nameCh')
    .populate('createdBy', 'name email')
    .sort({ meetingDate: -1 });
};

// Static method to get meetings by academic year
meetingRecordSchema.statics.getMeetingsByAcademicYear = function (
  schoolId,
  academicYear,
  meetingType = null
) {
  const query = {
    school: schoolId,
    academicYear: academicYear,
  };

  if (meetingType) {
    query.meetingType = meetingType;
  }

  return this.find(query)
    .populate('student', 'name nameEn nameCh studentId currentGrade currentClass')
    .populate('createdBy', 'name email')
    .sort({ meetingDate: -1 });
};

module.exports = mongoose.model('MeetingRecord', meetingRecordSchema);
