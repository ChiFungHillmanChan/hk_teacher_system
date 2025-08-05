const MeetingRecord = require('../models/MeetingRecord');
const Student = require('../models/Student');
const School = require('../models/School');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Get all meeting records with filtering
// @route   GET /api/meeting-records
// @access  Private
const getMeetingRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    let query = {};

    if (req.user.role !== 'admin') {
      const userStudents = await Student.find({
        $or: [{ school: { $in: req.user.schools } }, { 'teachers.user': req.user._id }],
        isActive: true,
      }).select('_id');
      const studentIds = userStudents.map(s => s._id);
      query = {
        $or: [
          { school: { $in: req.user.schools } },
          { student: { $in: studentIds } },
          { createdBy: req.user._id },
        ],
      };
    }

    if (req.query.student) query.student = req.query.student;
    if (req.query.school) query.school = req.query.school;
    if (req.query.academicYear) query.academicYear = req.query.academicYear;
    if (req.query.meetingType) query.meetingType = req.query.meetingType;
    if (req.query.status) query.status = req.query.status;
    if (req.query.startDate && req.query.endDate) {
      query.meetingDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    const meetings = await MeetingRecord.find(query)
      .populate('student', 'name nameEn nameCh studentId currentGrade currentClass')
      .populate('school', 'name nameEn nameCh')
      .populate('createdBy', 'name email')
      .sort({ meetingDate: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MeetingRecord.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        meetings,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit,
        },
      },
    });
  } catch (error) {
    console.error('Get meeting records error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving meeting records',
    });
  }
};

// @desc    Get single meeting record
// @route   GET /api/meeting-records/:id
// @access  Private
const getMeetingRecord = async (req, res) => {
  try {
    const meeting = await MeetingRecord.findById(req.params.id)
      .populate('student', 'name nameEn nameCh studentId currentGrade currentClass school')
      .populate('school', 'name nameEn nameCh schoolType')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting record not found',
      });
    }

    if (req.user.role !== 'admin') {
      const hasSchoolAccess = req.user.schools.some(
        school => school.toString() === meeting.school._id.toString()
      );
      const isCreator = meeting.createdBy._id.toString() === req.user._id.toString();
      const student = await Student.findById(meeting.student._id);
      const isStudentTeacher =
        student &&
        student.teachers.some(teacher => teacher.user.toString() === req.user._id.toString());
      if (!hasSchoolAccess && !isCreator && !isStudentTeacher) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this meeting record',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    console.error('Get meeting record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving meeting record',
    });
  }
};

// @desc    Create meeting record
// @route   POST /api/meeting-records
// @access  Private
const createMeetingRecord = async (req, res) => {
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
      meetingType,
      meetingTitle,
      meetingDate,
      endTime,
      participants,
      meetingLocation,
      senCategories,
      meetingContent,
      supportLevel,
      senCategoriesOther,
      remarks,
      currentLearningStatus,
      curriculumAdaptation,
      teachingAdaptation,
      peerSupport,
      teacherCollaboration,
      classroomManagement,
      assessmentAdaptation,
      homeworkAdaptation,
      teacherRecommendations,
      parentRecommendations,
      attachments,
    } = req.body;

    const studentRecord = await Student.findById(student).populate('school');
    if (!studentRecord) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

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
          message: 'Not authorized to create meeting records for this student',
        });
      }
    }

    if (!senCategories || !Array.isArray(senCategories) || senCategories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one SEN category must be selected',
      });
    }

    const meetingData = {
      student,
      school: school || studentRecord.school._id,
      academicYear,
      meetingType,
      meetingTitle,
      meetingDate: meetingDate || new Date(),
      endTime,
      participants,
      meetingLocation,
      senCategories,
      meetingContent,
      senCategoriesOther,
      remarks,
      attachments: attachments || [],
      createdBy: req.user._id,
    };

    if (meetingType === 'iep') {
      meetingData.supportLevel = supportLevel;
      meetingData.currentLearningStatus = currentLearningStatus;
      meetingData.curriculumAdaptation = curriculumAdaptation;
      meetingData.teachingAdaptation = teachingAdaptation;
      meetingData.peerSupport = peerSupport;
      meetingData.teacherCollaboration = teacherCollaboration;
      meetingData.classroomManagement = classroomManagement;
      meetingData.assessmentAdaptation = assessmentAdaptation;
      meetingData.homeworkAdaptation = homeworkAdaptation;
      meetingData.teacherRecommendations = teacherRecommendations;
      meetingData.parentRecommendations = parentRecommendations;
    }

    const meeting = await MeetingRecord.create(meetingData);

    const populatedMeeting = await MeetingRecord.findById(meeting._id)
      .populate('student', 'name nameEn nameCh studentId currentGrade currentClass')
      .populate('school', 'name nameEn nameCh')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Meeting record created successfully',
      data: populatedMeeting,
    });
  } catch (error) {
    console.error('Create meeting record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating meeting record',
    });
  }
};

// @desc    Update meeting record
// @route   PUT /api/meeting-records/:id
// @access  Private
const updateMeetingRecord = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const meeting = await MeetingRecord.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting record not found',
      });
    }

    if (req.user.role !== 'admin' && meeting.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this meeting record',
      });
    }

    // Prevent editing archived meetings
    if (meeting.status === 'archived') {
      return res.status(403).json({
        success: false,
        message: 'Cannot update an archived meeting record',
      });
    }

    const updateData = { ...req.body };
    updateData.lastModifiedBy = req.user._id;

    const updatedMeeting = await MeetingRecord.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('student', 'name nameEn nameCh studentId currentGrade currentClass')
      .populate('school', 'name nameEn nameCh')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Meeting record updated successfully',
      data: updatedMeeting,
    });
  } catch (error) {
    console.error('Update meeting record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating meeting record',
    });
  }
};

// @desc    Delete meeting record
// @route   DELETE /api/meeting-records/:id
// @access  Private
const deleteMeetingRecord = async (req, res) => {
  try {
    const meeting = await MeetingRecord.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting record not found',
      });
    }
    // Only allow deletion by meeting creator or admin
    if (meeting.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this meeting record',
      });
    }
    // Prevent deleting archived meetings
    if (meeting.status === 'archived') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete an archived meeting record',
      });
    }
    await MeetingRecord.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Meeting record deleted successfully',
    });
  } catch (error) {
    console.error('Delete meeting record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting meeting record',
    });
  }
};

// @desc    Get meetings by student
// @route   GET /api/meeting-records/student/:studentId
// @access  Private
const getMeetingsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { meetingType, academicYear, limit = 50, page = 1 } = req.query;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

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
          message: "Not authorized to access this student's meeting records",
        });
      }
    }

    const query = { student: studentId };
    if (meetingType) query.meetingType = meetingType;
    if (academicYear) query.academicYear = academicYear;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const meetings = await MeetingRecord.find(query)
      .populate('student', 'name nameEn nameCh studentId currentGrade currentClass')
      .populate('school', 'name nameEn nameCh')
      .populate('createdBy', 'name email')
      .sort({ meetingDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await MeetingRecord.countDocuments(query);

    const regularMeetings = meetings.filter(m => m.meetingType === 'regular');
    const iepMeetings = meetings.filter(m => m.meetingType === 'iep');

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.name,
          studentId: student.studentId,
          grade: student.currentGrade,
          class: student.currentClass,
        },
        meetings: {
          all: meetings,
          regular: regularMeetings,
          iep: iepMeetings,
        },
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit),
        },
        summary: {
          totalMeetings: total,
          regularCount: regularMeetings.length,
          iepCount: iepMeetings.length,
        },
      },
    });
  } catch (error) {
    console.error('Error in getMeetingsByStudent:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving student meeting records',
    });
  }
};

// @desc    Get meeting statistics
// @route   GET /api/meeting-records/stats
// @access  Private
const getMeetingStats = async (req, res) => {
  try {
    let matchQuery = {};

    if (req.user.role !== 'admin') {
      const userStudents = await Student.find({
        $or: [{ school: { $in: req.user.schools } }, { 'teachers.user': req.user._id }],
        isActive: true,
      }).select('_id');
      const studentIds = userStudents.map(s => s._id);
      matchQuery = {
        $or: [
          { school: { $in: req.user.schools } },
          { student: { $in: studentIds } },
          { createdBy: req.user._id },
        ],
      };
    }

    if (req.query.school) matchQuery.school = mongoose.Types.ObjectId(req.query.school);
    if (req.query.academicYear) matchQuery.academicYear = req.query.academicYear;

    const stats = await MeetingRecord.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalMeetings: { $sum: 1 },
          regularMeetings: {
            $sum: { $cond: [{ $eq: ['$meetingType', 'regular'] }, 1, 0] },
          },
          iepMeetings: {
            $sum: { $cond: [{ $eq: ['$meetingType', 'iep'] }, 1, 0] },
          },
          completedMeetings: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalMeetings: 0,
        regularMeetings: 0,
        iepMeetings: 0,
        completedMeetings: 0,
      },
    });
  } catch (error) {
    console.error('Get meeting stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving meeting statistics',
    });
  }
};

// @desc    Get meetings by academic year and type
// @route   GET /api/meeting-records/by-year/:schoolId/:academicYear
// @access  Private
const getMeetingsByYear = async (req, res) => {
  try {
    const { schoolId, academicYear } = req.params;
    const { meetingType } = req.query;

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    if (req.user.role !== 'admin') {
      const hasAccess = req.user.schools.some(
        userSchool => userSchool.toString() === schoolId.toString()
      );
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this school',
        });
      }
    }

    const meetings = await MeetingRecord.getMeetingsByAcademicYear(
      schoolId,
      academicYear,
      meetingType
    );

    res.status(200).json({
      success: true,
      data: {
        school: {
          id: school._id,
          name: school.name,
        },
        academicYear,
        meetingType: meetingType || 'all',
        meetings,
        count: meetings.length,
      },
    });
  } catch (error) {
    console.error('Get meetings by year error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving meetings by year',
    });
  }
};

module.exports = {
  getMeetingRecords,
  getMeetingRecord,
  createMeetingRecord,
  updateMeetingRecord,
  deleteMeetingRecord,
  getMeetingsByStudent,
  getMeetingStats,
  getMeetingsByYear,
};
