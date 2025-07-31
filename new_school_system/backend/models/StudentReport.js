const mongoose = require('mongoose');

const studentReportSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.ObjectId,
      ref: 'Student',
      required: [true, 'Report must belong to a student'],
    },
    school: {
      type: mongoose.Schema.ObjectId,
      ref: 'School',
      required: [true, 'Report must belong to a school'],
    },
    academicYear: {
      type: String,
      required: [true, 'Please provide academic year'],
      match: [/^\d{4}\/\d{2}$/, 'Academic year must be in format YYYY/YY (e.g., 2025/26)'],
    },
    reportDate: {
      type: Date,
      required: [true, 'Please provide report date'],
      default: Date.now,
    },
    term: {
      type: String,
      enum: ['term1', 'term2', 'term3', 'midterm', 'final', 'continuous'],
      default: 'continuous',
    },
    subject: {
      name: {
        type: String,
        required: [true, 'Please provide subject name'],
      },
      code: String,
      teacher: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Please provide teacher'],
      },
    },
    subjectDetails: {
      topic: {
        type: String,
        required: [true, 'Please provide topic/lesson details'],
        maxlength: [200, 'Topic cannot be more than 200 characters'],
      },
      learningObjectives: [String],
      materials: [String],
      activities: [String],
      duration: {
        type: Number, // in minutes
        min: [1, 'Duration must be at least 1 minute'],
      },
    },
    performance: {
      attendance: {
        status: {
          type: String,
          enum: ['present', 'absent', 'late', 'early_leave'],
          default: 'present',
        },
        punctuality: {
          type: String,
          enum: ['excellent', 'good', 'fair', 'poor'],
          default: 'good',
        },
      },
      participation: {
        level: {
          type: String,
          enum: ['excellent', 'good', 'fair', 'poor', 'not_applicable'],
          default: 'good',
        },
        engagement: {
          type: String,
          enum: ['very_active', 'active', 'moderate', 'passive', 'disengaged'],
          default: 'moderate',
        },
        contribution: {
          type: String,
          maxlength: [500, 'Contribution details cannot be more than 500 characters'],
        },
      },
      understanding: {
        level: {
          type: String,
          enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'],
          default: 'satisfactory',
        },
        concepts_mastered: [String],
        concepts_struggling: [String],
        comprehension_notes: {
          type: String,
          maxlength: [500, 'Comprehension notes cannot be more than 500 characters'],
        },
      },
      skills: {
        academic_skills: [
          {
            skill: String,
            level: {
              type: String,
              enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'],
            },
          },
        ],
        social_skills: [
          {
            skill: String,
            level: {
              type: String,
              enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'],
            },
          },
        ],
        communication: {
          verbal: {
            type: String,
            enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'],
          },
          written: {
            type: String,
            enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'],
          },
          listening: {
            type: String,
            enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'],
          },
        },
      },
      assessment: {
        type: {
          type: String,
          enum: [
            'quiz',
            'test',
            'assignment',
            'project',
            'presentation',
            'observation',
            'peer_assessment',
            'self_assessment',
          ],
          default: 'observation',
        },
        score: {
          type: Number,
          min: [0, 'Score cannot be negative'],
          max: [100, 'Score cannot be more than 100'],
        },
        grade: {
          type: String,
          enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'P', 'F'],
        },
        rubric_scores: [
          {
            criteria: String,
            score: Number,
            max_score: Number,
            comments: String,
          },
        ],
      },
    },
    homework: {
      assigned: {
        type: Boolean,
        default: false,
      },
      details: {
        description: {
          type: String,
          maxlength: [500, 'Homework description cannot be more than 500 characters'],
        },
        due_date: Date,
        estimated_time: Number, // in minutes
        materials_needed: [String],
        instructions: [String],
      },
      completion: {
        status: {
          type: String,
          enum: ['completed', 'partial', 'not_completed', 'not_applicable', 'pending'],
          default: 'pending',
        },
        quality: {
          type: String,
          enum: [
            'excellent',
            'good',
            'satisfactory',
            'needs_improvement',
            'poor',
            'not_applicable',
          ],
        },
        timeliness: {
          type: String,
          enum: ['on_time', 'late', 'very_late', 'not_submitted', 'not_applicable'],
        },
        effort: {
          type: String,
          enum: ['excellent', 'good', 'satisfactory', 'minimal', 'none'],
          default: 'satisfactory',
        },
      },
    },
    behavior: {
      conduct: {
        type: String,
        enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'],
        default: 'satisfactory',
      },
      cooperation: {
        type: String,
        enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'],
        default: 'satisfactory',
      },
      respect: {
        type: String,
        enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'],
        default: 'satisfactory',
      },
      following_instructions: {
        type: String,
        enum: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'],
        default: 'satisfactory',
      },
      incidents: [
        {
          type: {
            type: String,
            enum: ['positive', 'neutral', 'negative'],
          },
          description: String,
          action_taken: String,
          follow_up_needed: Boolean,
        },
      ],
    },
    remarks: {
      strengths: [String],
      areas_for_improvement: [String],
      recommendations: [String],
      next_steps: [String],
      teacher_comments: {
        type: String,
        maxlength: [1000, 'Teacher comments cannot be more than 1000 characters'],
      },
      parent_feedback_requested: {
        type: Boolean,
        default: false,
      },
      follow_up_meeting: {
        requested: Boolean,
        scheduled_date: Date,
        purpose: String,
      },
    },
    attachments: [
      {
        name: String,
        url: String,
        type: {
          type: String,
          enum: ['image', 'document', 'video', 'audio', 'other'],
        },
        description: String,
      },
    ],
    tags: [String],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'reviewed', 'approved', 'archived'],
      default: 'draft',
    },
    reviewedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    approvedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
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
studentReportSchema.index({ student: 1, reportDate: -1 });
studentReportSchema.index({ school: 1, academicYear: 1, 'subject.name': 1 });
studentReportSchema.index({ 'subject.teacher': 1, reportDate: -1 });
studentReportSchema.index({ student: 1, academicYear: 1, term: 1 });
studentReportSchema.index({ status: 1, createdAt: -1 });
studentReportSchema.index({ tags: 1 });

// Virtual to calculate overall performance score
studentReportSchema.virtual('overallScore').get(function () {
  const scores = [];

  if (this.performance.participation.level) {
    const participationScores = { excellent: 5, good: 4, fair: 3, poor: 2, not_applicable: null };
    const score = participationScores[this.performance.participation.level];
    if (score !== null) scores.push(score);
  }

  if (this.performance.understanding.level) {
    const understandingScores = {
      excellent: 5,
      good: 4,
      satisfactory: 3,
      needs_improvement: 2,
      poor: 1,
    };
    scores.push(understandingScores[this.performance.understanding.level]);
  }

  if (this.performance.assessment.score) {
    scores.push(this.performance.assessment.score / 20); // Convert to 5-point scale
  }

  if (this.behavior.conduct) {
    const behaviorScores = {
      excellent: 5,
      good: 4,
      satisfactory: 3,
      needs_improvement: 2,
      poor: 1,
    };
    scores.push(behaviorScores[this.behavior.conduct]);
  }

  return scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : null;
});

// Virtual to get grade level
studentReportSchema.virtual('gradeLevel').get(function () {
  return this.student && this.student.grade
    ? this.student.grade.startsWith('P')
      ? 'primary'
      : 'secondary'
    : null;
});

// Pre-save middleware
studentReportSchema.pre('save', function (next) {
  if (this.isModified() && !this.isNew) {
    this.lastModifiedBy = this.modifiedBy || this.createdBy;
  }

  // Auto-set review/approval dates
  if (this.isModified('status')) {
    if (this.status === 'reviewed' && !this.reviewedAt) {
      this.reviewedAt = new Date();
    }
    if (this.status === 'approved' && !this.approvedAt) {
      this.approvedAt = new Date();
    }
  }

  next();
});

// Method to submit report
studentReportSchema.methods.submit = function () {
  if (this.status !== 'draft') {
    throw new Error('Only draft reports can be submitted');
  }

  this.status = 'submitted';
  return this.save();
};

// Method to review report
studentReportSchema.methods.review = function (reviewerId) {
  if (this.status !== 'submitted') {
    throw new Error('Only submitted reports can be reviewed');
  }

  this.status = 'reviewed';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  return this.save();
};

// Method to approve report
studentReportSchema.methods.approve = function (approverId) {
  if (this.status !== 'reviewed') {
    throw new Error('Only reviewed reports can be approved');
  }

  this.status = 'approved';
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  return this.save();
};

// Method to archive report
studentReportSchema.methods.archive = function () {
  this.status = 'archived';
  return this.save();
};

// Static method to get reports by student
studentReportSchema.statics.getReportsByStudent = function (studentId, options = {}) {
  const query = { student: studentId };

  if (options.academicYear) query.academicYear = options.academicYear;
  if (options.subject) query['subject.name'] = options.subject;
  if (options.term) query.term = options.term;
  if (options.status) query.status = options.status;
  if (options.startDate && options.endDate) {
    query.reportDate = { $gte: options.startDate, $lte: options.endDate };
  }

  return this.find(query)
    .populate('student', 'name nameEn nameCh studentId grade class')
    .populate('subject.teacher', 'name email')
    .populate('createdBy', 'name')
    .sort({ reportDate: -1 });
};

// Static method to get reports by teacher
studentReportSchema.statics.getReportsByTeacher = function (teacherId, options = {}) {
  const query = { 'subject.teacher': teacherId };

  if (options.school) query.school = options.school;
  if (options.academicYear) query.academicYear = options.academicYear;
  if (options.subject) query['subject.name'] = options.subject;
  if (options.status) query.status = options.status;
  if (options.startDate && options.endDate) {
    query.reportDate = { $gte: options.startDate, $lte: options.endDate };
  }

  return this.find(query)
    .populate('student', 'name nameEn nameCh studentId grade class')
    .populate('school', 'name')
    .sort({ reportDate: -1 });
};

// Static method to get performance analytics
studentReportSchema.statics.getPerformanceAnalytics = function (filters = {}) {
  const matchStage = {};

  if (filters.school) matchStage.school = mongoose.Types.ObjectId(filters.school);
  if (filters.academicYear) matchStage.academicYear = filters.academicYear;
  if (filters.subject) matchStage['subject.name'] = filters.subject;
  if (filters.grade) matchStage['student.grade'] = filters.grade;

  return this.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: '$student' },
    {
      $group: {
        _id: {
          subject: '$subject.name',
          grade: '$student.grade',
        },
        totalReports: { $sum: 1 },
        avgAssessmentScore: { $avg: '$performance.assessment.score' },
        excellentCount: {
          $sum: {
            $cond: [{ $eq: ['$performance.understanding.level', 'excellent'] }, 1, 0],
          },
        },
        goodCount: {
          $sum: {
            $cond: [{ $eq: ['$performance.understanding.level', 'good'] }, 1, 0],
          },
        },
        needsImprovementCount: {
          $sum: {
            $cond: [{ $eq: ['$performance.understanding.level', 'needs_improvement'] }, 1, 0],
          },
        },
      },
    },
    { $sort: { '_id.grade': 1, '_id.subject': 1 } },
  ]);
};

module.exports = mongoose.model('StudentReport', studentReportSchema);
