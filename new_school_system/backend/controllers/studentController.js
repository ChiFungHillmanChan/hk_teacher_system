const Student = require('../models/Student');
const School = require('../models/School');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Get all students
// @route   GET /api/students
// @access  Private
const getStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build query based on user role and school access
    const query = { isActive: true };

    // If not admin, filter by schools user has access to
    if (req.user.role !== 'admin') {
      query.school = { $in: req.user.schools };
    }

    // Add filters
    if (req.query.school) {
      query.school = req.query.school;
    }

    if (req.query.academicYear) {
      query.currentAcademicYear = req.query.academicYear;
    }

    if (req.query.grade) {
      query.grade = req.query.grade;
    }

    if (req.query.class) {
      query.class = req.query.class;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    // Search functionality
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { nameEn: { $regex: req.query.search, $options: 'i' } },
        { nameCh: { $regex: req.query.search, $options: 'i' } },
        { studentId: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const students = await Student.find(query)
      .populate('school', 'name nameEn nameCh schoolType district')
      .populate('teachers.user', 'name email')
      .populate('createdBy', 'name email')
      .sort({ grade: 1, class: 1, classNumber: 1, name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Student.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit,
        },
      },
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving students',
    });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('school', 'name nameEn nameCh schoolType district')
      .populate('teachers.user', 'name email teacherId')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check if user has access to this student
    if (req.user.role !== 'admin') {
      const hasSchoolAccess = req.user.schools.some(
        school => school.toString() === student.school._id.toString()
      );

      const isStudentTeacher = student.teachers.some(
        teacher => teacher.user._id.toString() === req.user._id.toString()
      );

      if (!hasSchoolAccess && !isStudentTeacher) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this student',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving student',
    });
  }
};

// @desc    Bulk update students for year summary
// @route   PUT /api/students/bulk-update
// @access  Private
const bulkUpdateStudents = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required',
      });
    }

    const results = {
      updated: 0,
      deleted: 0,
      errors: [],
    };

    // Process each update
    for (const update of updates) {
      try {
        if (update.action === 'delete') {
          await Student.findByIdAndDelete(update.id);
          results.deleted++;
        } else if (update.action === 'update') {
          await Student.findByIdAndUpdate(
            update.id,
            {
              ...update.data,
              lastModifiedBy: req.user._id,
            },
            { runValidators: true }
          );
          results.updated++;
        }
      } catch (error) {
        results.errors.push({
          id: update.id,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `處理完成：更新 ${results.updated} 名，刪除 ${results.deleted} 名學生`,
      data: results,
    });
  } catch (error) {
    console.error('Bulk update students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during bulk update',
    });
  }
};

const createStudent = async (req, res) => {
  try {
    // validation result from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    // auth guard
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to create student',
      });
    }

    const {
      name,
      nameEn,
      nameCh,
      studentId,
      school,
      academicYear,
      grade,
      class: studentClass,
      classNumber,
      dateOfBirth,
      gender,
      contactInfo,
      medicalInfo,
      academicInfo,
      notes,
    } = req.body;

    if (!academicYear) {
      const currentYear = new Date().getFullYear();
      const nextYear = (currentYear + 1).toString().slice(-2);
      academicYear = `${currentYear}/${nextYear}`;
      console.log(`[Student] 🗓️ Auto-generated academic year: ${academicYear}`);
    }

    // Normalize studentId
    let normalizedStudentId;
    if (studentId && typeof studentId === 'string' && studentId.trim() !== '') {
      normalizedStudentId = studentId.trim();
    }

    // Verify school exists
    const schoolDoc = await School.findById(school);
    if (!schoolDoc) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    // Access control
    if (req.user.role !== 'admin') {
      const hasAccess = (req.user.schools || []).some(s => s.toString() === school.toString());
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to add students to this school',
        });
      }
    }

    // Enhanced duplicate checking (using current* fields)
    const duplicateChecks = [];

    if (normalizedStudentId) {
      const existingStudentId = await Student.findOne({
        school: school,
        studentId: normalizedStudentId,
        isActive: true,
      });

      if (existingStudentId) {
        duplicateChecks.push({
          field: 'studentId',
          message: `學號 "${normalizedStudentId}" 在此學校已存在`,
          existingStudent: {
            name: existingStudentId.name,
            grade: existingStudentId.currentGrade,
            class: existingStudentId.currentClass,
          },
        });
      }
    }

    if (
      classNumber !== undefined &&
      classNumber !== null &&
      studentClass &&
      academicYear &&
      grade
    ) {
      const existingClassNumber = await Student.findOne({
        school: school,
        currentAcademicYear: academicYear,
        currentGrade: grade,
        currentClass: studentClass,
        currentClassNumber: classNumber,
        isActive: true,
      });

      if (existingClassNumber) {
        duplicateChecks.push({
          field: 'classNumber',
          message: `班號 ${classNumber} 在 ${grade}${studentClass} 已被使用`,
          existingStudent: {
            name: existingClassNumber.name,
            studentId: existingClassNumber.studentId,
          },
        });
      }
    }

    if (duplicateChecks.length > 0) {
      return res.status(409).json({
        success: false,
        message: '發現重複資料',
        conflicts: duplicateChecks,
        canProceed: false,
      });
    }

    // Validate grade against school type
    const availableGrades = schoolDoc.getAvailableGrades();
    if (!availableGrades.includes(grade)) {
      return res.status(400).json({
        success: false,
        message: `年級 ${grade} 不適用於此學校類型`,
      });
    }

    // Derive startDate from academicYear (e.g., interpret "2025/26" as September 1, 2025)
    let startDate;
    if (academicYear) {
      const [startYearStr] = academicYear.split('/');
      const startYear = parseInt(startYearStr, 10);
      if (!isNaN(startYear)) {
        startDate = new Date(startYear, 8, 1); // September 1 of startYear
      }
    }
    if (!startDate) {
      startDate = new Date(); // fallback to now if parsing failed
    }

    // Construct student payload aligned with updated schema
    const newStudentData = {
      name,
      nameEn,
      nameCh,
      school,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender,
      contactInfo: contactInfo || {},
      medicalInfo: medicalInfo || {},
      academicInfo: academicInfo || {},
      notes,
      // required current fields
      currentAcademicYear: academicYear,
      currentGrade: grade,
      currentClass: studentClass,
      currentClassNumber: classNumber,
      // initial academic history entry
      academicHistory: [
        {
          academicYear,
          grade,
          class: studentClass,
          classNumber,
          school,
          startDate,
          status: 'enrolled',
          promotionStatus: 'pending',
          createdBy: req.user._id,
        },
      ],
      teachers: [
        {
          user: req.user._id,
          subjects: [],
          isPrimaryTeacher: true,
        },
      ],
      createdBy: req.user._id,
    };

    if (normalizedStudentId) {
      newStudentData.studentId = normalizedStudentId;
    }

    // Create the student
    const student = await Student.create(newStudentData);

    const populatedStudent = await Student.findById(student._id)
      .populate('school', 'name nameEn nameCh')
      .populate('teachers.user', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: populatedStudent,
    });
  } catch (error) {
    console.error('Create student error:', error);

    // Surface Mongoose validation errors as 400
    if (error.name === 'ValidationError') {
      const formatted = Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: formatted,
      });
    }

    // Duplicate key (unique) error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field === 'studentId' ? '學號' : '資料'} 已存在`,
        field: field,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating student',
    });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private
const updateStudent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      const hasSchoolAccess = req.user.schools.some(
        school => school.toString() === student.school.toString()
      );

      const isStudentTeacher = student.teachers.some(
        teacher => teacher.user.toString() === req.user._id.toString()
      );

      if (!hasSchoolAccess && !isStudentTeacher) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this student',
        });
      }
    }

    const allowedFields = [
      'name',
      'nameEn',
      'nameCh',
      'class',
      'classNumber',
      'dateOfBirth',
      'gender',
      'contactInfo',
      'medicalInfo',
      'academicInfo',
      'notes',
      'status',
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'dateOfBirth' && req.body[field]) {
          updateData[field] = new Date(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    // Set lastModifiedBy
    updateData.lastModifiedBy = req.user._id;

    const updatedStudent = await Student.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('school', 'name nameEn nameCh')
      .populate('teachers.user', 'name email')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: updatedStudent,
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating student',
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check permissions (admin or primary teacher)
    if (req.user.role !== 'admin') {
      const isAssociatedTeacher = student.teachers.some(
        teacher => teacher.user.toString() === req.user._id.toString()
      );

      if (!isAssociatedTeacher) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this student',
        });
      }
    }

    // Soft delete - mark as inactive
    student.isActive = false;
    student.status = 'dropped_out';
    student.lastModifiedBy = req.user._id;
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting student',
    });
  }
};

// @desc    Add teacher to student
// @route   POST /api/students/:id/teachers
// @access  Private
const addTeacherToStudent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { teacherEmail, subjects, isPrimaryTeacher } = req.body;

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Find teacher by email
    const teacher = await User.findOne({
      email: teacherEmail,
      role: 'teacher',
      schools: student.school,
    });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found or not assigned to this school',
      });
    }

    // Check if teacher already assigned to student
    const existingTeacher = student.teachers.find(
      t => t.user.toString() === teacher._id.toString()
    );

    if (existingTeacher) {
      return res.status(400).json({
        success: false,
        message: 'Teacher already assigned to this student',
      });
    }

    // If setting as primary teacher, remove primary status from others
    if (isPrimaryTeacher) {
      student.teachers.forEach(t => (t.isPrimaryTeacher = false));
    }

    // Add teacher to student
    student.teachers.push({
      user: teacher._id,
      subjects: subjects || [],
      isPrimaryTeacher: isPrimaryTeacher || false,
    });

    student.lastModifiedBy = req.user._id;
    await student.save();

    const updatedStudent = await Student.findById(student._id).populate(
      'teachers.user',
      'name email teacherId'
    );

    res.status(200).json({
      success: true,
      message: 'Teacher added to student successfully',
      data: updatedStudent,
    });
  } catch (error) {
    console.error('Add teacher to student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding teacher to student',
    });
  }
};

// @desc    Remove teacher from student
// @route   DELETE /api/students/:id/teachers/:teacherId
// @access  Private
const removeTeacherFromStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const teacherId = req.params.teacherId;

    // Don't allow removing the primary teacher if it's the only teacher
    const teacherToRemove = student.teachers.find(t => t.user.toString() === teacherId);

    if (teacherToRemove && teacherToRemove.isPrimaryTeacher && student.teachers.length === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the only primary teacher. Please assign another teacher first.',
      });
    }

    // Remove teacher from student
    student.teachers = student.teachers.filter(t => t.user.toString() !== teacherId);

    student.lastModifiedBy = req.user._id;
    await student.save();

    res.status(200).json({
      success: true,
      message: 'Teacher removed from student successfully',
    });
  } catch (error) {
    console.error('Remove teacher from student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing teacher from student',
    });
  }
};

// @desc    Get students by teacher
// @route   GET /api/students/my-students
// @access  Private
const getMyStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {
      'teachers.user': req.user._id,
      isActive: true,
    };

    // Add filters
    if (req.query.school) {
      query.school = req.query.school;
    }

    if (req.query.academicYear) {
      query.academicYear = req.query.academicYear;
    }

    if (req.query.grade) {
      query.grade = req.query.grade;
    }

    if (req.query.subject) {
      query['teachers.subjects'] = req.query.subject;
    }

    const students = await Student.find(query)
      .populate('school', 'name nameEn nameCh')
      .populate('teachers.user', 'name email')
      .sort({ grade: 1, class: 1, classNumber: 1, name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Student.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total,
          limit,
        },
      },
    });
  } catch (error) {
    console.error('Get my students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving your students',
    });
  }
};

// @desc    Get student statistics by school
// @route   GET /api/students/stats/:schoolId
// @access  Private
const getStudentStatsBySchool = async (req, res) => {
  try {
    const schoolId = req.params.schoolId;

    // Verify school access
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    const stats = {
      school: {
        id: school._id,
        name: school.name,
        type: school.schoolType,
      },
      students: {
        total: await Student.countDocuments({ school: schoolId, isActive: true }),
        byGrade: {},
        byStatus: {},
        byGender: {},
      },
    };

    // Get stats by grade
    const gradeStats = await Student.aggregate([
      { $match: { school: schoolId, isActive: true } },
      { $group: { _id: '$grade', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    gradeStats.forEach(stat => {
      stats.students.byGrade[stat._id] = stat.count;
    });

    // Get stats by status
    const statusStats = await Student.aggregate([
      { $match: { school: schoolId, isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    statusStats.forEach(stat => {
      stats.students.byStatus[stat._id] = stat.count;
    });

    // Get stats by gender
    const genderStats = await Student.aggregate([
      { $match: { school: schoolId, isActive: true } },
      { $group: { _id: '$gender', count: { $sum: 1 } } },
    ]);

    genderStats.forEach(stat => {
      if (stat._id) {
        stats.students.byGender[stat._id] = stat.count;
      }
    });

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving student statistics',
    });
  }
};

// @desc    Advanced student search with academic year progression
// @route   GET /api/students/search/advanced
// @access  Private
const advancedStudentSearch = async (req, res) => {
  try {
    const {
      schoolId,
      academicYear,
      grade,
      class: studentClass,
      searchTerm,
      includeHistory = true,
      page = 1,
      limit = 50,
    } = req.query;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required',
      });
    }

    // Verify school exists and user has access
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    // Check permissions
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

    // Build search query
    const query = {
      school: schoolId,
      isActive: true,
    };

    // Academic year search - complex logic for current vs historical
    if (academicYear) {
      if (includeHistory === 'true') {
        query.$or = [
          { currentAcademicYear: academicYear },
          { 'academicHistory.academicYear': academicYear },
        ];
      } else {
        query.currentAcademicYear = academicYear;
      }
    }

    // Text search across name fields and student ID
    if (searchTerm) {
      const textQuery = {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { nameEn: { $regex: searchTerm, $options: 'i' } },
          { nameCh: { $regex: searchTerm, $options: 'i' } },
          { studentId: { $regex: searchTerm, $options: 'i' } },
        ],
      };

      if (query.$or) {
        query.$and = [{ $or: query.$or }, textQuery];
        delete query.$or;
      } else {
        Object.assign(query, textQuery);
      }
    }

    // Grade and class filtering (works with both current and historical data)
    if (grade || studentClass) {
      const gradeClassQuery = { $or: [] };

      // Search in current data
      const currentQuery = {};
      if (grade) currentQuery.currentGrade = grade;
      if (studentClass) currentQuery.currentClass = studentClass;
      if (academicYear) currentQuery.currentAcademicYear = academicYear;

      if (Object.keys(currentQuery).length > 0) {
        gradeClassQuery.$or.push(currentQuery);
      }

      // Search in historical data if requested
      if (includeHistory === 'true') {
        const historyQuery = { academicHistory: { $elemMatch: {} } };
        if (grade) historyQuery.academicHistory.$elemMatch.grade = grade;
        if (studentClass) historyQuery.academicHistory.$elemMatch.class = studentClass;
        if (academicYear) historyQuery.academicHistory.$elemMatch.academicYear = academicYear;

        gradeClassQuery.$or.push(historyQuery);
      }

      if (query.$and) {
        query.$and.push(gradeClassQuery);
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, gradeClassQuery];
        delete query.$or;
      } else {
        Object.assign(query, gradeClassQuery);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute search
    const students = await Student.find(query)
      .populate('school', 'name nameEn nameCh')
      .populate('teachers.user', 'name email')
      .populate('academicHistory.school', 'name nameEn')
      .sort({ currentGrade: 1, currentClass: 1, currentClassNumber: 1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Student.countDocuments(query);

    // Process results to show relevant academic year info
    const processedStudents = students.map(student => {
      let relevantYearInfo = null;

      if (academicYear) {
        // Find the specific academic year data
        if (student.currentAcademicYear === academicYear) {
          relevantYearInfo = {
            academicYear: student.currentAcademicYear,
            grade: student.currentGrade,
            class: student.currentClass,
            classNumber: student.currentClassNumber,
            isCurrent: true,
          };
        } else {
          const historicalRecord = student.academicHistory?.find(
            record => record.academicYear === academicYear
          );
          if (historicalRecord) {
            relevantYearInfo = {
              academicYear: historicalRecord.academicYear,
              grade: historicalRecord.grade,
              class: historicalRecord.class,
              classNumber: historicalRecord.classNumber,
              school: historicalRecord.school,
              status: historicalRecord.status,
              promotionStatus: historicalRecord.promotionStatus,
              isCurrent: false,
            };
          }
        }
      }

      return {
        ...student,
        relevantYearInfo,
        academicYearCount: (student.academicHistory?.length || 0) + 1,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        students: processedStudents,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit),
        },
        searchCriteria: {
          schoolId,
          academicYear,
          grade,
          class: studentClass,
          searchTerm,
          includeHistory,
        },
      },
    });
  } catch (error) {
    console.error('Advanced student search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during search',
    });
  }
};

// @desc    Get student progression history
// @route   GET /api/students/:id/progression
// @access  Private
const getStudentProgression = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('school', 'name nameEn nameCh')
      .populate('academicHistory.school', 'name nameEn nameCh')
      .populate('teachers.user', 'name email');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      console.log('🔍 Debug authorization for progression:');
      console.log('User ID:', req.user._id.toString());
      console.log(
        'User schools:',
        req.user.schools.map(s => s.toString())
      );
      console.log('Student school ID:', student.school._id.toString()); // FIXED: Added ._id
      console.log(
        'Student teachers:',
        student.teachers?.map(t => ({
          user: t.user._id.toString(), // FIXED: Added ._id since teachers.user is populated
          isPrimary: t.isPrimaryTeacher,
        }))
      );

      // FIXED: Compare with student.school._id since school is populated
      const hasSchoolAccess = req.user.schools.some(
        school => school.toString() === student.school._id.toString()
      );

      // FIXED: Compare with teacher.user._id since teachers.user is populated
      const isStudentTeacher =
        student.teachers &&
        student.teachers.some(teacher => teacher.user._id.toString() === req.user._id.toString());

      console.log('Has school access:', hasSchoolAccess);
      console.log('Is student teacher:', isStudentTeacher);

      if (!hasSchoolAccess && !isStudentTeacher) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this student',
          debug:
            process.env.NODE_ENV === 'development'
              ? {
                  userSchools: req.user.schools.map(s => s.toString()),
                  studentSchool: student.school._id.toString(),
                  hasSchoolAccess,
                  isStudentTeacher,
                }
              : undefined,
        });
      }
    }

    // Build progression timeline
    const progression = [
      ...(student.academicHistory || []).map(record => ({
        ...record.toObject(),
        isCurrent: false,
      })),
      {
        academicYear: student.currentAcademicYear,
        grade: student.currentGrade,
        class: student.currentClass,
        classNumber: student.currentClassNumber,
        school: student.school,
        status: student.status,
        isCurrent: true,
        startDate: new Date(`${student.currentAcademicYear.split('/')[0]}-09-01`),
      },
    ].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.name,
          nameEn: student.nameEn,
          nameCh: student.nameCh,
          studentId: student.studentId,
        },
        progression,
        summary: {
          totalYears: progression.length,
          currentYear: student.currentAcademicYear,
          currentGrade: student.currentGrade,
          currentClass: student.currentClass,
          schoolsAttended: [...new Set(progression.map(p => p.school._id.toString()))].length,
        },
      },
    });
  } catch (error) {
    console.error('Get student progression error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving student progression',
    });
  }
};

// @desc    Promote students to next academic year (Any teacher can do this)
// @route   POST /api/students/promote-year
// @access  Private (Any authenticated teacher/admin)
const promoteStudentsToNextYear = async (req, res) => {
  try {
    const {
      schoolId,
      fromAcademicYear,
      toAcademicYear,
      promotions, // Array of { studentId, newGrade, newClass, newClassNumber, promotionStatus, finalGrades, notes }
    } = req.body;

    if (!schoolId || !fromAcademicYear || !toAcademicYear || !Array.isArray(promotions)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for year promotion',
      });
    }

    // Verify school exists and user has access
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    // Check if user has access to this school (any teacher can promote)
    if (req.user.role !== 'admin') {
      const hasAccess = req.user.schools.some(
        userSchool => userSchool.toString() === schoolId.toString()
      );
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to promote students in this school',
        });
      }
    }

    const results = {
      successful: [],
      failed: [],
      total: promotions.length,
    };

    // Process each promotion
    for (const promotion of promotions) {
      try {
        const student = await Student.findById(promotion.studentId);

        if (!student) {
          results.failed.push({
            studentId: promotion.studentId,
            error: 'Student not found',
          });
          continue;
        }

        if (student.school.toString() !== schoolId.toString()) {
          results.failed.push({
            studentId: promotion.studentId,
            error: 'Student does not belong to specified school',
          });
          continue;
        }

        if (student.currentAcademicYear !== fromAcademicYear) {
          results.failed.push({
            studentId: promotion.studentId,
            error: `Student is not in academic year ${fromAcademicYear}`,
          });
          continue;
        }

        // Store current info before promotion
        const currentInfo = {
          grade: student.currentGrade,
          class: student.currentClass,
          classNumber: student.currentClassNumber,
        };

        // Perform promotion using the method from enhanced Student model
        await student.promoteToNextYear(
          {
            academicYear: toAcademicYear,
            grade: promotion.newGrade,
            class: promotion.newClass,
            classNumber: promotion.newClassNumber,
            promotionStatus: promotion.promotionStatus || 'promoted',
            finalGrades: promotion.finalGrades || {},
            notes: promotion.notes || '',
          },
          req.user._id
        );

        results.successful.push({
          studentId: promotion.studentId,
          name: student.name,
          from: `${currentInfo.grade} ${currentInfo.class}${currentInfo.classNumber ? ` #${currentInfo.classNumber}` : ''}`,
          to: `${promotion.newGrade} ${promotion.newClass}${promotion.newClassNumber ? ` #${promotion.newClassNumber}` : ''}`,
        });
      } catch (error) {
        console.error(`Error promoting student ${promotion.studentId}:`, error);
        results.failed.push({
          studentId: promotion.studentId,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Year promotion completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results,
    });
  } catch (error) {
    console.error('Promote students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during year promotion',
    });
  }
};

// @desc    Get available academic years for a school
// @route   GET /api/schools/:schoolId/academic-years-available
// @access  Private
const getAvailableAcademicYears = async (req, res) => {
  try {
    const { schoolId } = req.params;

    // Verify school exists and user has access
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    // Check permissions - user must have access to this school
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

    // Get all unique academic years from students in this school
    const academicYears = await Student.aggregate([
      { $match: { school: new mongoose.Types.ObjectId(schoolId), isActive: true } },
      {
        $project: {
          years: {
            $concatArrays: [
              ['$currentAcademicYear'],
              { $ifNull: ['$academicHistory.academicYear', []] },
            ],
          },
        },
      },
      { $unwind: '$years' },
      { $group: { _id: '$years' } },
      { $sort: { _id: -1 } },
      { $project: { _id: 0, academicYear: '$_id' } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        academicYears: academicYears.map(item => item.academicYear),
        count: academicYears.length,
        school: {
          id: school._id,
          name: school.name,
        },
      },
    });
  } catch (error) {
    console.error('Get available academic years error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving academic years',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  addTeacherToStudent,
  removeTeacherFromStudent,
  getMyStudents,
  getStudentStatsBySchool,
  bulkUpdateStudents,
  advancedStudentSearch,
  getStudentProgression,
  promoteStudentsToNextYear,
  getAvailableAcademicYears,
};
