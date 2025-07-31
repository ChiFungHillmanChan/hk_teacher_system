const Student = require('../models/Student');
const School = require('../models/School');
const User = require('../models/User');
const { validationResult } = require('express-validator');

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
      query.academicYear = req.query.academicYear;
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
      errors: []
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
              lastModifiedBy: req.user._id 
            },
            { runValidators: true }
          );
          results.updated++;
        }
      } catch (error) {
        results.errors.push({
          id: update.id,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `處理完成：更新 ${results.updated} 名，刪除 ${results.deleted} 名學生`,
      data: results
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
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

    // Normalize studentId (only set if non-empty)
    let normalizedStudentId;
    if (studentId && typeof studentId === 'string' && studentId.trim() !== '') {
      normalizedStudentId = studentId.trim();
    } else {
      normalizedStudentId = undefined;
    }

    // Verify school exists
    const schoolDoc = await School.findById(school);
    if (!schoolDoc) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    // Check access permissions
    if (req.user.role !== 'admin') {
      const hasAccess = req.user.schools.some(
        s => s.toString() === school.toString()
      );
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to add students to this school',
        });
      }
    }

    // Enhanced duplicate checking with better error messages
    const duplicateChecks = [];

    // Check for duplicate studentId in the same school
    if (normalizedStudentId) {
      const existingStudentId = await Student.findOne({
        school: school,
        studentId: normalizedStudentId,
        isActive: true
      });

      if (existingStudentId) {
        duplicateChecks.push({
          field: 'studentId',
          message: `學號 "${normalizedStudentId}" 在此學校已存在`,
          existingStudent: {
            name: existingStudentId.name,
            grade: existingStudentId.grade,
            class: existingStudentId.class
          }
        });
      }
    }

    // Check for duplicate classNumber within school/year/grade/class
    if (classNumber !== undefined && classNumber !== null && studentClass) {
      const existingClassNumber = await Student.findOne({
        school: school,
        academicYear: academicYear,
        grade: grade,
        class: studentClass,
        classNumber: classNumber,
        isActive: true
      });

      if (existingClassNumber) {
        duplicateChecks.push({
          field: 'classNumber',
          message: `班號 ${classNumber} 在 ${grade}${studentClass} 已被使用`,
          existingStudent: {
            name: existingClassNumber.name,
            studentId: existingClassNumber.studentId
          }
        });
      }
    }

    // Return warnings if duplicates found
    if (duplicateChecks.length > 0) {
      return res.status(409).json({
        success: false,
        message: '發現重複資料',
        conflicts: duplicateChecks,
        canProceed: false // Frontend can show warnings and ask user to confirm
      });
    }

    // Validate grade matches school type
    const availableGrades = schoolDoc.getAvailableGrades();
    if (!availableGrades.includes(grade)) {
      return res.status(400).json({
        success: false,
        message: `年級 ${grade} 不適用於此學校類型`,
      });
    }

    // Build the student object dynamically
    const newStudentData = {
      name,
      nameEn,
      nameCh,
      school,
      academicYear,
      grade,
      class: studentClass,
      classNumber,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender,
      contactInfo: contactInfo || {},
      medicalInfo: medicalInfo || {},
      academicInfo: academicInfo || {},
      notes,
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
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field === 'studentId' ? '學號' : '資料'} 已存在`,
        field: field
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
      const isPrimaryTeacher = student.teachers.some(
        teacher => teacher.user.toString() === req.user._id.toString() && teacher.isPrimaryTeacher
      );

      if (!isPrimaryTeacher) {
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
  bulkUpdateStudents
};
