const StudentReport = require('../models/StudentReport');
const Student = require('../models/Student');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Get all student reports
// @route   GET /api/student-reports
// @access  Private
const getStudentReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build query based on user role and permissions
    let query = {};

    // Non-admin users can only see reports from their schools or students they teach
    if (req.user.role !== 'admin') {
      query = {
        $or: [
          { school: { $in: req.user.schools } },
          { 'subject.teacher': req.user._id },
          { createdBy: req.user._id },
        ],
      };
    }

    // Add filters
    if (req.query.student) {
      query.student = req.query.student;
    }

    if (req.query.school) {
      query.school = req.query.school;
    }

    if (req.query.academicYear) {
      query.academicYear = req.query.academicYear;
    }

    if (req.query.subject) {
      query['subject.name'] = new RegExp(req.query.subject, 'i');
    }

    if (req.query.term) {
      query.term = req.query.term;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      query.reportDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    const reports = await StudentReport.find(query)
      .populate('student', 'name nameEn nameCh studentId grade class')
      .populate('school', 'name nameEn nameCh')
      .populate('subject.teacher', 'name email')
      .populate('createdBy', 'name email')
      .sort({ reportDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await StudentReport.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit,
        },
      },
    });
  } catch (error) {
    console.error('Get student reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving student reports',
    });
  }
};

// @desc    Get single student report
// @route   GET /api/student-reports/:id
// @access  Private
const getStudentReport = async (req, res) => {
  try {
    const report = await StudentReport.findById(req.params.id)
      .populate('student', 'name nameEn nameCh studentId grade class school')
      .populate('school', 'name nameEn nameCh schoolType district')
      .populate('subject.teacher', 'name email teacherId')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .populate('reviewedBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Student report not found',
      });
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Get student report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving student report',
    });
  }
};

// @desc    Create student report
// @route   POST /api/student-reports
// @access  Private
const createStudentReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const {
      student,
      school,
      academicYear,
      reportDate,
      term,
      subject,
      subjectDetails,
      performance,
      homework,
      behavior,
      remarks,
      attachments,
      tags,
      isPrivate,
      status,
    } = req.body;

    // Verify student exists and user has access
    const studentRecord = await Student.findById(student).populate('school');
    if (!studentRecord) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      const hasSchoolAccess = req.user.schools.some(
        schoolId => schoolId.toString() === studentRecord.school._id.toString()
      );

      const isStudentTeacher =
        studentRecord.teachers &&
        studentRecord.teachers.some(teacher => teacher.user.toString() === req.user._id.toString());

      if (!hasSchoolAccess && !isStudentTeacher) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to create reports for this student',
        });
      }
    }

    // Create the report
    const report = await StudentReport.create({
      student,
      school: school || studentRecord.school._id,
      academicYear,
      reportDate: reportDate || new Date(),
      term: term || 'continuous',
      subject: {
        name: subject.name,
        code: subject.code,
        teacher: subject.teacher || req.user._id,
      },
      subjectDetails,
      performance,
      homework,
      behavior,
      remarks,
      attachments: attachments || [],
      tags: tags || [],
      isPrivate: isPrivate || false,
      status: status || 'submitted',
      createdBy: req.user._id,
    });

    // Populate the created report
    const populatedReport = await StudentReport.findById(report._id)
      .populate('student', 'name nameEn nameCh studentId grade class')
      .populate('school', 'name nameEn nameCh')
      .populate('subject.teacher', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Student report created successfully',
      data: populatedReport,
    });
  } catch (error) {
    console.error('Create student report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating student report',
    });
  }
};

// @desc    Update student report
// @route   PUT /api/student-reports/:id
// @access  Private
// Final Fixed updateStudentReport function in studentReportController.js
// Based on the successful pattern from SchoolDetail

const updateStudentReport = async (req, res) => {
  try {
    console.log('📝 Received update request for report:', req.params.id);
    console.log('📥 Request body:', JSON.stringify(req.body, null, 2));

    // Validate request data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    // Find the existing report
    const report = await StudentReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Student report not found',
      });
    }

    console.log('📋 Found existing report:', {
      id: report._id,
      topic: report.subjectDetails?.topic,
      content: report.content
    });

    // Check permissions
    if (req.user.role !== 'admin') {
      const isCreator = report.createdBy.toString() === req.user._id.toString();
      const isSubjectTeacher = report.subject?.teacher?.toString() === req.user._id.toString();
      
      if (!isCreator && !isSubjectTeacher) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this report',
        });
      }
    }

    // Check if report can be modified
    if (report.status === 'approved' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify approved reports',
      });
    }

    // Prepare clean update data - similar to SchoolDetail pattern
    const updateData = {};

    // Update subjectDetails if provided
    if (req.body.subjectDetails) {
      updateData.subjectDetails = {
        topic: req.body.subjectDetails.topic || report.subjectDetails?.topic || '',
        duration: req.body.subjectDetails.duration || report.subjectDetails?.duration || 60,
        learningObjectives: req.body.subjectDetails.learningObjectives || report.subjectDetails?.learningObjectives || [],
        materials: req.body.subjectDetails.materials || report.subjectDetails?.materials || [],
        activities: req.body.subjectDetails.activities || report.subjectDetails?.activities || []
      };
    }

    // Update content if provided
    if (req.body.content !== undefined) {
      updateData.content = req.body.content;
    }

    // Update performance if provided
    if (req.body.performance) {
      updateData.performance = {
        attendance: {
          status: req.body.performance.attendance?.status || report.performance?.attendance?.status || 'present',
          punctuality: req.body.performance.attendance?.punctuality || report.performance?.attendance?.punctuality || 'good'
        },
        participation: {
          level: req.body.performance.participation?.level || report.performance?.participation?.level || 'good',
          engagement: req.body.performance.participation?.engagement || report.performance?.participation?.engagement || 'active',
          contribution: req.body.performance.participation?.contribution || report.performance?.participation?.contribution || ''
        },
        understanding: {
          level: req.body.performance.understanding?.level || report.performance?.understanding?.level || 'satisfactory',
          concepts_mastered: req.body.performance.understanding?.concepts_mastered || report.performance?.understanding?.concepts_mastered || [],
          concepts_struggling: req.body.performance.understanding?.concepts_struggling || report.performance?.understanding?.concepts_struggling || [],
          comprehension_notes: req.body.performance.understanding?.comprehension_notes || report.performance?.understanding?.comprehension_notes || ''
        },
        skills: {
          academic_skills: req.body.performance.skills?.academic_skills || report.performance?.skills?.academic_skills || [],
          social_skills: req.body.performance.skills?.social_skills || report.performance?.skills?.social_skills || [],
          communication: req.body.performance.skills?.communication || report.performance?.skills?.communication || {}
        },
        assessment: {
          type: req.body.performance.assessment?.type || report.performance?.assessment?.type || 'observation',
          score: req.body.performance.assessment?.score !== undefined ? req.body.performance.assessment.score : report.performance?.assessment?.score,
          grade: req.body.performance.assessment?.grade || report.performance?.assessment?.grade || undefined,
          feedback: req.body.performance.assessment?.feedback || report.performance?.assessment?.feedback || '',
          rubric_scores: req.body.performance.assessment?.rubric_scores || report.performance?.assessment?.rubric_scores || []
        }
      };
    }

    // Update homework if provided
    if (req.body.homework) {
      updateData.homework = {
        assigned: req.body.homework.assigned !== undefined ? req.body.homework.assigned : (report.homework?.assigned || false),
        details: {
          description: req.body.homework.details?.description || report.homework?.details?.description || '',
          due_date: req.body.homework.details?.due_date || report.homework?.details?.due_date || undefined,
          estimated_time: req.body.homework.details?.estimated_time || report.homework?.details?.estimated_time || undefined,
          materials_needed: req.body.homework.details?.materials_needed || report.homework?.details?.materials_needed || [],
          instructions: req.body.homework.details?.instructions || report.homework?.details?.instructions || []
        },
        completion: {
          status: req.body.homework.completion?.status || report.homework?.completion?.status || 'pending',
          quality: req.body.homework.completion?.quality || report.homework?.completion?.quality || undefined,
          timeliness: req.body.homework.completion?.timeliness || report.homework?.completion?.timeliness || undefined,
          effort: req.body.homework.completion?.effort || report.homework?.completion?.effort || 'satisfactory'
        }
      };
    }

    // Update behavior if provided
    if (req.body.behavior) {
      updateData.behavior = {
        conduct: req.body.behavior.conduct || report.behavior?.conduct || 'satisfactory',
        cooperation: req.body.behavior.cooperation || report.behavior?.cooperation || 'satisfactory',
        respect: req.body.behavior.respect || report.behavior?.respect || 'satisfactory',
        following_instructions: req.body.behavior.following_instructions || report.behavior?.following_instructions || 'satisfactory',
        notes: req.body.behavior.notes || report.behavior?.notes || '',
        incidents: req.body.behavior.incidents || report.behavior?.incidents || []
      };
    }

    // Update remarks if provided
    if (req.body.remarks) {
      updateData.remarks = {
        strengths: req.body.remarks.strengths || report.remarks?.strengths || [],
        areas_for_improvement: req.body.remarks.areas_for_improvement || report.remarks?.areas_for_improvement || [],
        recommendations: req.body.remarks.recommendations || report.remarks?.recommendations || [],
        next_steps: req.body.remarks.next_steps || report.remarks?.next_steps || [],
        teacher_comments: req.body.remarks.teacher_comments || report.remarks?.teacher_comments || '',
        parent_feedback_requested: req.body.remarks.parent_feedback_requested !== undefined ? req.body.remarks.parent_feedback_requested : (report.remarks?.parent_feedback_requested || false),
        follow_up_meeting: req.body.remarks.follow_up_meeting || report.remarks?.follow_up_meeting || undefined
      };
    }

    // Update other fields if provided
    if (req.body.tags !== undefined) updateData.tags = req.body.tags;
    if (req.body.isPrivate !== undefined) updateData.isPrivate = req.body.isPrivate;

    // Set lastModifiedBy
    updateData.lastModifiedBy = req.user._id;

    console.log('💾 Prepared update data:', JSON.stringify(updateData, null, 2));

    // Use findByIdAndUpdate with proper options - like SchoolDetail
    const updatedReport = await StudentReport.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true, // Return updated document
        runValidators: false, // Skip validation since we're doing manual validation
        lean: false // Return mongoose document, not plain object
      }
    ).populate('student', 'name nameEn nameCh studentId grade class')
     .populate('school', 'name nameEn nameCh')
     .populate('subject.teacher', 'name email')
     .populate('createdBy', 'name email')
     .populate('lastModifiedBy', 'name email');

    if (!updatedReport) {
      return res.status(404).json({
        success: false,
        message: 'Report not found after update',
      });
    }

    console.log('✅ Successfully updated report:', {
      id: updatedReport._id,
      topic: updatedReport.subjectDetails?.topic,
      content: updatedReport.content,
      updatedAt: updatedReport.updatedAt
    });

    res.status(200).json({
      success: true,
      message: 'Student report updated successfully',
      data: updatedReport,
    });

  } catch (error) {
    console.error('❌ Update student report error:', error);
    
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating student report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
// @desc    Delete student report
// @route   DELETE /api/student-reports/:id
// @access  Private
const deleteStudentReport = async (req, res) => {
  try {
    const report = await StudentReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Student report not found',
      });
    }

    // Only allow deletion by report creator or admin
    if (report.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this report',
      });
    }

    // Check if report is approved - only admin can delete approved reports
    if (report.status === 'approved' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete approved reports',
      });
    }

    await StudentReport.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Student report deleted successfully',
    });
  } catch (error) {
    console.error('Delete student report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting student report',
    });
  }
};

// @desc    Get reports by student
// @route   GET /api/student-reports/student/:studentId
// @access  Private
const getReportsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Add validation for studentId
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required',
      });
    }

    // Check if studentId is valid MongoDB ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student ID format',
      });
    }

    // Verify student exists first
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check user permissions
    if (req.user.role !== 'admin') {
      const hasSchoolAccess = req.user.schools.some(
        schoolId => schoolId.toString() === student.school.toString()
      );

      const isStudentTeacher =
        student.teachers &&
        student.teachers.some(teacher => teacher.user.toString() === req.user._id.toString());

      if (!hasSchoolAccess && !isStudentTeacher) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this student's reports",
        });
      }
    }

    // Build query
    const query = { student: new mongoose.Types.ObjectId(studentId) };

    // Add filters
    if (req.query.academicYear) {
      query.academicYear = req.query.academicYear;
    }

    if (req.query.subject) {
      query['subject.name'] = new RegExp(req.query.subject, 'i');
    }

    if (req.query.term) {
      query.term = req.query.term;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const reports = await StudentReport.find(query)
      .populate('student', 'name nameEn nameCh studentId grade class')
      .populate('school', 'name nameEn nameCh')
      .populate('subject.teacher', 'name email')
      .populate('createdBy', 'name email')
      .sort({ reportDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await StudentReport.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.name,
          studentId: student.studentId,
          grade: student.grade,
          class: student.class,
        },
        reports,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit,
        },
      },
    });
  } catch (error) {
    console.error('Error in getReportsByStudent:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving student reports',
    });
  }
};

// @desc    Get my reports (for teachers)
// @route   GET /api/student-reports/my-reports
// @access  Private
const getMyReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {
      $or: [{ 'subject.teacher': req.user._id }, { createdBy: req.user._id }],
    };

    // Add filters
    if (req.query.school) {
      query.school = req.query.school;
    }

    if (req.query.academicYear) {
      query.academicYear = req.query.academicYear;
    }

    if (req.query.subject) {
      query['subject.name'] = new RegExp(req.query.subject, 'i');
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const reports = await StudentReport.find(query)
      .populate('student', 'name nameEn nameCh studentId grade class')
      .populate('school', 'name nameEn nameCh')
      .populate('subject.teacher', 'name email')
      .sort({ reportDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await StudentReport.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit,
        },
      },
    });
  } catch (error) {
    console.error('Get my reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving your reports',
    });
  }
};

// @desc    Submit report for review
// @route   PUT /api/student-reports/:id/submit
// @access  Private
const submitReport = async (req, res) => {
  try {
    const report = await StudentReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Student report not found',
      });
    }

    if (report.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft reports can be submitted',
      });
    }

    await report.submit();

    res.status(200).json({
      success: true,
      message: 'Report submitted for review successfully',
      data: report,
    });
  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error submitting report',
    });
  }
};

// @desc    Review report
// @route   PUT /api/student-reports/:id/review
// @access  Private
const reviewReport = async (req, res) => {
  try {
    const report = await StudentReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Student report not found',
      });
    }

    await report.review(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Report reviewed successfully',
      data: report,
    });
  } catch (error) {
    console.error('Review report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error reviewing report',
    });
  }
};

// @desc    Approve report
// @route   PUT /api/student-reports/:id/approve
// @access  Private
const approveReport = async (req, res) => {
  try {
    const report = await StudentReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Student report not found',
      });
    }

    await report.approve(req.user._id);

    res.status(200).json({
      success: true,
      message: 'Report approved successfully',
      data: report,
    });
  } catch (error) {
    console.error('Approve report error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error approving report',
    });
  }
};

// @desc    Get report statistics
// @route   GET /api/student-reports/stats
// @access  Private
const getReportStats = async (req, res) => {
  try {
    let matchQuery = {};

    // Non-admin users can only see stats from their schools or reports they created
    if (req.user.role !== 'admin') {
      matchQuery = {
        $or: [
          { school: { $in: req.user.schools } },
          { 'subject.teacher': req.user._id },
          { createdBy: req.user._id },
        ],
      };
    }

    // Add filters
    if (req.query.school) {
      matchQuery.school = mongoose.Types.ObjectId(req.query.school);
    }

    if (req.query.academicYear) {
      matchQuery.academicYear = req.query.academicYear;
    }

    const stats = await StudentReport.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          draftReports: {
            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] },
          },
          submittedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] },
          },
          reviewedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'reviewed'] }, 1, 0] },
          },
          approvedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalReports: 0,
        draftReports: 0,
        submittedReports: 0,
        reviewedReports: 0,
        approvedReports: 0,
      },
    });
  } catch (error) {
    console.error('Get report stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving report statistics',
    });
  }
};

module.exports = {
  getStudentReports,
  getStudentReport,
  createStudentReport,
  updateStudentReport,
  deleteStudentReport,
  getReportsByStudent,
  getMyReports,
  submitReport,
  reviewReport,
  approveReport,
  getReportStats,
};
