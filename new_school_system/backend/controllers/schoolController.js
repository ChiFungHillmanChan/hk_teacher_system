const { validationResult } = require('express-validator');
const School = require('../models/School');
const User = require('../models/User');

// @desc    Get all schools
// @route   GET /api/schools
// @access  Private
const getSchools = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};

    // Filter by school type
    if (req.query.schoolType) {
      query.schoolType = req.query.schoolType;
    }

    // Filter by district
    if (req.query.district) {
      query.district = req.query.district;
    }

    // Search by name
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { nameEn: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Role-based filtering
    if (req.user.role !== 'admin') {
      query._id = { $in: req.user.schools };
    }

    const schools = await School.find(query)
      .populate('teachers.user', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await School.countDocuments(query);

    res.status(200).json({
      success: true,
      count: schools.length,
      data: schools,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit,
      },
    });
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving schools',
    });
  }
};

// @desc    Get single school
// @route   GET /api/schools/:id
// @access  Private
const getSchool = async (req, res) => {
  try {
    const school = await School.findById(req.params.id)
      .populate('teachers.user', 'name email teacherId')
      .populate('createdBy', 'name email');

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    // Check if user has access to this school
    if (req.user.role !== 'admin') {
      const hasAccess = req.user.schools.some(
        userSchool => userSchool.toString() === school._id.toString()
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this school',
        });
      }
    }

    res.status(200).json({
      success: true,
      data: school,
    });
  } catch (error) {
    console.error('Get school error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving school',
    });
  }
};

// @desc    Create school
// @route   POST /api/schools
// @access  Private
const createSchool = async (req, res) => {
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
      schoolType,
      district,
      address,
      contactPerson,
      email,
      phone,
      description,
    } = req.body;

    // Check if school with same name already exists
    const existingSchool = await School.findOne({ name });
    if (existingSchool) {
      return res.status(400).json({
        success: false,
        message: 'School with this name already exists',
      });
    }

    // Set up grades based on school type
    const grades = {
      primary: {
        enabled: schoolType === 'primary' || schoolType === 'both',
        levels:
          schoolType === 'primary' || schoolType === 'both'
            ? ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']
            : [],
      },
      secondary: {
        enabled: schoolType === 'secondary' || schoolType === 'both',
        levels:
          schoolType === 'secondary' || schoolType === 'both'
            ? ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
            : [],
      },
    };

    // Get default subjects based on school type
    const defaultSubjects = School.getDefaultSubjects(schoolType);

    // Create current academic year (2025/26 format)
    const currentYear = new Date().getFullYear();
    const nextYear = (currentYear + 1).toString().slice(-2);
    const academicYear = `${currentYear}/${nextYear}`;

    const school = await School.create({
      name,
      nameEn,
      schoolType,
      district,
      address,
      contactPerson,
      email,
      phone,
      description,
      grades,
      subjects: defaultSubjects,
      academicYears: [
        {
          year: academicYear,
          isActive: true,
          startDate: new Date(`${currentYear}-09-01`),
          endDate: new Date(`${currentYear + 1}-07-31`),
        },
      ],
      teachers: [
        {
          user: req.user._id,
          role: req.user.role === 'admin' ? 'admin' : 'head_teacher',
          subjects: [],
          grades: [],
          isActive: true,
        },
      ],
      createdBy: req.user._id,
    });

    // Add school to user's schools array
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { schools: school._id } });

    const populatedSchool = await School.findById(school._id)
      .populate('teachers.user', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'School created successfully',
      data: populatedSchool,
    });
  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating school',
    });
  }
};

// @desc    Update school
// @route   PUT /api/schools/:id
// @access  Private
const updateSchool = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      const isHeadTeacher = school.teachers.some(
        teacher =>
          teacher.user.toString() === req.user._id.toString() && teacher.role === 'head_teacher'
      );

      if (!isHeadTeacher) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this school',
        });
      }
    }

    const allowedFields = [
      'name',
      'nameEn',
      'district',
      'address',
      'contactPerson',
      'email',
      'phone',
      'description',
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updatedSchool = await School.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('teachers.user', 'name email')
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'School updated successfully',
      data: updatedSchool,
    });
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating school',
    });
  }
};

// @desc    Delete school
// @route   DELETE /api/schools/:id
// @access  Private (Admin only)
const deleteSchool = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);

    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    // Only admin can delete schools
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete schools',
      });
    }

    await School.findByIdAndDelete(req.params.id);

    // Remove school from all users' schools array
    await User.updateMany({ schools: req.params.id }, { $pull: { schools: req.params.id } });

    res.status(200).json({
      success: true,
      message: 'School deleted successfully',
    });
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting school',
    });
  }
};

// @desc    Add teacher to school
// @route   POST /api/schools/:id/teachers
// @access  Private
const addTeacherToSchool = async (req, res) => {
  try {
    const { teacherEmail, role = 'teacher', subjects = [], grades = [] } = req.body;

    const school = await School.findById(req.params.id);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      const isHeadTeacher = school.teachers.some(
        teacher =>
          teacher.user.toString() === req.user._id.toString() && teacher.role === 'head_teacher'
      );

      if (!isHeadTeacher) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to add teachers to this school',
        });
      }
    }

    // Find teacher by email
    const teacher = await User.findOne({ email: teacherEmail });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found with this email',
      });
    }

    // Check if teacher is already in school
    const existingTeacher = school.teachers.find(t => t.user.toString() === teacher._id.toString());

    if (existingTeacher) {
      return res.status(400).json({
        success: false,
        message: 'Teacher is already part of this school',
      });
    }

    // Add teacher to school
    school.teachers.push({
      user: teacher._id,
      role,
      subjects,
      grades,
      isActive: true,
    });

    await school.save();

    // Add school to teacher's schools array
    await User.findByIdAndUpdate(teacher._id, { $addToSet: { schools: school._id } });

    const updatedSchool = await School.findById(school._id).populate('teachers.user', 'name email');

    res.status(200).json({
      success: true,
      message: 'Teacher added to school successfully',
      data: updatedSchool,
    });
  } catch (error) {
    console.error('Add teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding teacher to school',
    });
  }
};

// @desc    Remove teacher from school
// @route   DELETE /api/schools/:id/teachers/:teacherId
// @access  Private
const removeTeacherFromSchool = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      const isHeadTeacher = school.teachers.some(
        teacher =>
          teacher.user.toString() === req.user._id.toString() && teacher.role === 'head_teacher'
      );

      if (!isHeadTeacher) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to remove teachers from this school',
        });
      }
    }

    // Remove teacher from school
    school.teachers = school.teachers.filter(
      teacher => teacher.user.toString() !== req.params.teacherId
    );

    await school.save();

    // Remove school from teacher's schools array
    await User.findByIdAndUpdate(req.params.teacherId, { $pull: { schools: school._id } });

    res.status(200).json({
      success: true,
      message: 'Teacher removed from school successfully',
    });
  } catch (error) {
    console.error('Remove teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing teacher from school',
    });
  }
};

// @desc    Add academic year
// @route   POST /api/schools/:id/academic-years
// @access  Private
const addAcademicYear = async (req, res) => {
  try {
    const { year, startDate, endDate } = req.body;

    const school = await School.findById(req.params.id);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    // Check if academic year already exists
    const existingYear = school.academicYears.find(ay => ay.year === year);
    if (existingYear) {
      return res.status(400).json({
        success: false,
        message: 'Academic year already exists',
      });
    }

    school.academicYears.push({
      year,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      isActive: false,
    });

    await school.save();

    res.status(200).json({
      success: true,
      message: 'Academic year added successfully',
      data: school,
    });
  } catch (error) {
    console.error('Add academic year error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding academic year',
    });
  }
};

// @desc    Set active academic year
// @route   PUT /api/schools/:id/academic-years/:year/activate
// @access  Private
const setActiveAcademicYear = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    // Deactivate all academic years
    school.academicYears.forEach(ay => (ay.isActive = false));

    // Activate the specified year
    const targetYear = school.academicYears.find(ay => ay.year === req.params.year);
    if (!targetYear) {
      return res.status(404).json({
        success: false,
        message: 'Academic year not found',
      });
    }

    targetYear.isActive = true;
    await school.save();

    res.status(200).json({
      success: true,
      message: 'Active academic year updated successfully',
      data: school,
    });
  } catch (error) {
    console.error('Set active academic year error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating academic year',
    });
  }
};

// @desc    Get school statistics
// @route   GET /api/schools/:id/stats
// @access  Private
const getSchoolStats = async (req, res) => {
  try {
    const school = await School.findById(req.params.id);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    // Import Student model here to avoid circular dependency
    const Student = require('../models/Student');

    // Get student statistics
    const totalStudents = await Student.countDocuments({ school: school._id });
    const studentsByGrade = await Student.aggregate([
      { $match: { school: school._id } },
      { $group: { _id: '$grade', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Get teacher statistics
    const totalTeachers = school.teachers.filter(t => t.isActive).length;
    const headTeachers = school.teachers.filter(
      t => t.role === 'head_teacher' && t.isActive
    ).length;

    const stats = {
      students: {
        total: totalStudents,
        byGrade: studentsByGrade,
      },
      teachers: {
        total: totalTeachers,
        headTeachers: headTeachers,
      },
      academicYears: school.academicYears.length,
      subjects: school.subjects.filter(s => s.isActive).length,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get school stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving school statistics',
    });
  }
};

module.exports = {
  getSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool,
  addTeacherToSchool,
  removeTeacherFromSchool,
  addAcademicYear,
  setActiveAcademicYear,
  getSchoolStats,
};
