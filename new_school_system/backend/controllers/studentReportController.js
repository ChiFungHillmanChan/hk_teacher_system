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
const updateStudentReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const report = await StudentReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Student report not found',
      });
    }

    // Check if report can be modified
    if (report.status === 'approved' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify approved reports',
      });
    }

    // Update fields
    const updateData = { ...req.body };
    updateData.lastModifiedBy = req.user._id;

    const updatedReport = await StudentReport.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('student', 'name nameEn nameCh studentId grade class')
      .populate('school', 'name nameEn nameCh')
      .populate('subject.teacher', 'name email')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Student report updated successfully',
      data: updatedReport,
    });
  } catch (error) {
    console.error('Update student report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating student report',
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
