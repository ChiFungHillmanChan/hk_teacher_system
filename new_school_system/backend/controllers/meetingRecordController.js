// controllers/meetingRecordController.js

const MeetingRecord = require('../models/MeetingRecord');
const Student = require('../models/Student');
const School = require('../models/School');
const { validationResult } = require('express-validator');

// @desc    Get all meeting records with filtering
// @route   GET /api/meeting-records
// @access  Private
const getMeetingRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build query based on user role and permissions
    let query = {};

    // Non-admin users can only see records from their schools
    if (req.user.role !== 'admin') {
      query = {
        $or: [
          { school: { $in: req.user.schools } },
          { createdBy: req.user._id },
          { meetingChair: req.user._id },
          { secretary: req.user._id },
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

    if (req.query.meetingType) {
      query.meetingType = req.query.meetingType;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      query.meetingDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    const meetings = await MeetingRecord.find(query)
      .populate('student', 'name nameEn nameCh studentId currentGrade currentClass')
      .populate('school', 'name nameEn nameCh')
      .populate('meetingChair', 'name email')
      .populate('secretary', 'name email')
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
      .populate('meetingChair', 'name email')
      .populate('secretary', 'name email')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting record not found',
      });
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      const hasSchoolAccess = req.user.schools.some(
        school => school.toString() === meeting.school._id.toString()
      );

      const isInvolvedInMeeting =
        meeting.createdBy._id.toString() === req.user._id.toString() ||
        meeting.meetingChair._id.toString() === req.user._id.toString() ||
        (meeting.secretary && meeting.secretary._id.toString() === req.user._id.toString()) ||
        meeting.participants.some(p => p.email === req.user.email);

      if (!hasSchoolAccess && !isInvolvedInMeeting) {
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
      title,
      meetingDate,
      startTime,
      endTime,
      location,
      participants,
      purpose,
      agenda,
      discussionPoints,
      decisions,
      actionItems,
      iepDetails,
      summary,
      nextMeetingDate,
      nextMeetingPurpose,
      secretary,
      attachments,
      confidentialityLevel,
      followUpRequired,
      followUpDate,
      followUpNotes,
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
          message: 'Not authorized to create meeting records for this student',
        });
      }
    }

    // Create the meeting record
    const meeting = await MeetingRecord.create({
      student,
      school: school || studentRecord.school._id,
      academicYear,
      meetingType,
      title,
      meetingDate: meetingDate || new Date(),
      startTime,
      endTime,
      location,
      participants: participants || [],
      purpose,
      agenda: agenda || [],
      discussionPoints: discussionPoints || [],
      decisions: decisions || [],
      actionItems: actionItems || [],
      iepDetails: meetingType === 'iep' ? iepDetails : undefined,
      summary,
      nextMeetingDate,
      nextMeetingPurpose,
      meetingChair: req.user._id,
      secretary,
      attachments: attachments || [],
      confidentialityLevel: confidentialityLevel || 'restricted',
      status: 'scheduled',
      followUpRequired: followUpRequired || false,
      followUpDate,
      followUpNotes,
      createdBy: req.user._id,
    });

    // Populate the created meeting
    const populatedMeeting = await MeetingRecord.findById(meeting._id)
      .populate('student', 'name nameEn nameCh studentId currentGrade currentClass')
      .populate('school', 'name nameEn nameCh')
      .populate('meetingChair', 'name email')
      .populate('secretary', 'name email')
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

    // Check if user can modify this meeting
    if (req.user.role !== 'admin') {
      const canModify =
        meeting.createdBy.toString() === req.user._id.toString() ||
        meeting.meetingChair.toString() === req.user._id.toString() ||
        (meeting.secretary && meeting.secretary.toString() === req.user._id.toString());

      if (!canModify) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this meeting record',
        });
      }
    }

    // Check if meeting can be modified (completed meetings have restrictions)
    if (meeting.status === 'completed' && req.user.role !== 'admin') {
      // Only allow certain fields to be updated for completed meetings
      const allowedFields = ['summary', 'actionItems', 'followUpNotes', 'attachments'];
      const requestedFields = Object.keys(req.body);
      const unauthorizedFields = requestedFields.filter(field => !allowedFields.includes(field));

      if (unauthorizedFields.length > 0) {
        return res.status(403).json({
          success: false,
          message: `Cannot modify ${unauthorizedFields.join(', ')} for completed meetings`,
        });
      }
    }

    // Update fields
    const updateData = { ...req.body };
    updateData.lastModifiedBy = req.user._id;

    const updatedMeeting = await MeetingRecord.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('student', 'name nameEn nameCh studentId currentGrade currentClass')
      .populate('school', 'name nameEn nameCh')
      .populate('meetingChair', 'name email')
      .populate('secretary', 'name email')
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

    // Don't allow deletion of completed IEP meetings (for compliance)
    if (
      meeting.meetingType === 'iep' &&
      meeting.status === 'completed' &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete completed IEP meeting records',
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

    // Verify student exists and user has access
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check permissions
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

    // Build query
    const query = { student: studentId };

    if (meetingType) {
      query.meetingType = meetingType;
    }

    if (academicYear) {
      query.academicYear = academicYear;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const meetings = await MeetingRecord.find(query)
      .populate('student', 'name nameEn nameCh studentId currentGrade currentClass')
      .populate('school', 'name nameEn nameCh')
      .populate('meetingChair', 'name email')
      .populate('createdBy', 'name email')
      .sort({ meetingDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await MeetingRecord.countDocuments(query);

    // Separate regular and IEP meetings for better organization
    const regularMeetings = meetings.filter(m => m.meetingType !== 'iep');
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

// @desc    Get upcoming meetings
// @route   GET /api/meeting-records/upcoming
// @access  Private
const getUpcomingMeetings = async (req, res) => {
  try {
    const { schoolId, days = 7 } = req.query;

    let schoolIds = [];
    if (schoolId) {
      schoolIds = [schoolId];
    } else if (req.user.role !== 'admin') {
      schoolIds = req.user.schools;
    }

    const querySchools = schoolIds.length > 0 ? { school: { $in: schoolIds } } : {};

    const meetings = await MeetingRecord.getUpcomingMeetings(
      schoolIds.length > 0 ? schoolIds[0] : null,
      parseInt(days)
    );

    res.status(200).json({
      success: true,
      data: {
        meetings,
        count: meetings.length,
        period: `Next ${days} days`,
      },
    });
  } catch (error) {
    console.error('Get upcoming meetings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving upcoming meetings',
    });
  }
};

// @desc    Get overdue action items
// @route   GET /api/meeting-records/action-items/overdue
// @access  Private
const getOverdueActionItems = async (req, res) => {
  try {
    const { schoolId } = req.query;

    let querySchoolId = schoolId;
    if (!querySchoolId && req.user.role !== 'admin') {
      querySchoolId = req.user.schools[0]; // Use first school if not specified
    }

    const meetings = await MeetingRecord.getOverdueActionItems(querySchoolId, req.user._id);

    // Extract overdue action items
    const overdueItems = [];
    meetings.forEach(meeting => {
      meeting.actionItems.forEach(item => {
        if (item.dueDate < new Date() && ['pending', 'in_progress'].includes(item.status)) {
          overdueItems.push({
            meetingId: meeting._id,
            meetingTitle: meeting.title,
            meetingDate: meeting.meetingDate,
            student: meeting.student,
            actionItem: item,
            daysOverdue: Math.floor((new Date() - item.dueDate) / (1000 * 60 * 60 * 24)),
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      data: {
        overdueItems,
        count: overdueItems.length,
      },
    });
  } catch (error) {
    console.error('Get overdue action items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving overdue action items',
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
  getUpcomingMeetings,
  getOverdueActionItems,
};
