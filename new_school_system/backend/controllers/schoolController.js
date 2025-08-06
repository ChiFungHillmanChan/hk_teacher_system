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

    // Add permission metadata
    const isAssignedTeacher = req.user.schools?.some(
      userSchoolId => userSchoolId.toString() === school._id.toString()
    );

    const isSchoolTeacher = school.teachers?.some(
      teacher => teacher.user._id.toString() === req.user._id.toString()
    );

    const teacherRole = school.teachers?.find(
      teacher => teacher.user._id.toString() === req.user._id.toString()
    )?.role;

    const schoolWithPermissions = {
      ...school.toObject(),
      userPermissions: {
        canView: true,
        canEdit: req.user.role === 'admin' || isAssignedTeacher || isSchoolTeacher,
        canDelete:
          req.user.role === 'admin' ||
          (isSchoolTeacher && teacherRole === 'head_teacher') ||
          (isAssignedTeacher && teacherRole === 'head_teacher'),
        canManageTeachers:
          req.user.role === 'admin' || (isSchoolTeacher && teacherRole === 'head_teacher'),
        isAssigned: isAssignedTeacher,
        isTeacher: isSchoolTeacher,
        teacherRole: teacherRole || null,
      },
    };

    console.log(`✅ School found: ${school.name}, permissions calculated`);

    res.status(200).json({
      success: true,
      data: schoolWithPermissions,
    });
  } catch (error) {
    console.error('❌ Get school error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      schoolId: req.params.id,
      userId: req.user?._id,
    });

    res.status(500).json({
      success: false,
      message: 'Server error retrieving school',
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message,
        stack: error.stack,
      }),
    });
  }
};

// @desc    Create school
// @route   POST /api/schools
// @access  Private
const createSchool = async (req, res) => {
  try {
    // ✅ ADD: Comprehensive request logging
    console.log('📝 CREATE SCHOOL REQUEST:');
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log(
      'User:',
      req.user ? { id: req.user._id, role: req.user.role, email: req.user.email } : 'UNDEFINED'
    );
    console.log('Headers:', req.headers.authorization ? 'Present' : 'Missing');

    // ✅ ADD: User authentication validation
    if (!req.user || !req.user._id) {
      console.error('❌ Authentication failure: req.user is missing or invalid');
      return res.status(401).json({
        success: false,
        message: 'Authentication required - user not found',
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
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

    // ✅ ADD: SchoolType validation
    const validSchoolTypes = ['primary', 'secondary', 'both', 'special'];
    if (!schoolType || !validSchoolTypes.includes(schoolType)) {
      console.error('❌ Invalid schoolType:', schoolType);
      return res.status(400).json({
        success: false,
        message: `Invalid school type. Must be one of: ${validSchoolTypes.join(', ')}`,
      });
    }

    // ✅ ADD: Required fields validation
    if (!name || typeof name !== 'string' || name.trim() === '') {
      console.error('❌ School name is required');
      return res.status(400).json({
        success: false,
        message: 'School name is required and cannot be empty',
      });
    }

    console.log(`🏫 Creating school: "${name}" (${schoolType})`);

    // Check if school with same name already exists
    const existingSchool = await School.findOne({ name: name.trim() });
    if (existingSchool) {
      console.log('⚠️ School already exists:', existingSchool.name);
      return res.status(400).json({
        success: false,
        message: 'School with this name already exists',
      });
    }

    // ✅ ENHANCED: Safe grades setup with validation
    let grades;
    try {
      grades = {
        primary: {
          enabled: schoolType === 'primary' || schoolType === 'both' || schoolType === 'special',
          levels:
            schoolType === 'primary' || schoolType === 'both' || schoolType === 'special'
              ? ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']
              : [],
        },
        secondary: {
          enabled: schoolType === 'secondary' || schoolType === 'both' || schoolType === 'special',
          levels:
            schoolType === 'secondary' || schoolType === 'both' || schoolType === 'special'
              ? ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
              : [],
        },
      };
      console.log('✅ Grades setup completed:', grades);
    } catch (gradeError) {
      console.error('❌ Grade setup failed:', gradeError);
      return res.status(500).json({
        success: false,
        message: 'Failed to setup school grades configuration',
      });
    }

    // ✅ ENHANCED: Safe default subjects with error handling
    let defaultSubjects = [];
    try {
      if (School.getDefaultSubjects && typeof School.getDefaultSubjects === 'function') {
        defaultSubjects = School.getDefaultSubjects(schoolType) || [];
      } else {
        console.warn('⚠️ getDefaultSubjects method not available, using empty array');
        defaultSubjects = [];
      }
      console.log(`✅ Default subjects loaded: ${defaultSubjects.length} subjects`);
    } catch (subjectError) {
      console.error('❌ Default subjects loading failed:', subjectError);
      console.log('🔄 Continuing with empty subjects array');
      defaultSubjects = [];
    }

    // ✅ ENHANCED: Safe academic year generation
    let academicYear;
    let startDate;
    let endDate;
    try {
      const currentYear = new Date().getFullYear();
      const nextYear = (currentYear + 1).toString().slice(-2);
      academicYear = `${currentYear}/${nextYear}`;
      startDate = new Date(`${currentYear}-09-01`);
      endDate = new Date(`${currentYear + 1}-07-31`);

      console.log(`✅ Academic year generated: ${academicYear}`);
    } catch (yearError) {
      console.error('❌ Academic year generation failed:', yearError);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate academic year',
      });
    }

    const schoolData = {
      name: name.trim(),
      nameEn: nameEn?.trim() || '',
      schoolType,
      district: district?.trim() || null,
      address: address?.trim() || '',
      contactPerson: contactPerson?.trim() || '',
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      description: description?.trim() || '',
      grades,
      subjects: defaultSubjects,
      academicYears: [
        {
          year: academicYear,
          isActive: true,
          startDate,
          endDate,
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
    };

    console.log('🚀 Attempting to create school with data:', {
      name: schoolData.name,
      schoolType: schoolData.schoolType,
      gradesEnabled: `P:${grades.primary.enabled}, S:${grades.secondary.enabled}`,
      subjectCount: defaultSubjects.length,
      createdBy: req.user._id,
    });

    const school = await School.create(schoolData);

    console.log('✅ School created successfully:', school._id);

    // Add school to user's schools array
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { schools: school._id } });

    const populatedSchool = await School.findById(school._id)
      .populate('teachers.user', 'name email')
      .populate('createdBy', 'name email');

    console.log('🎉 School creation completed successfully');

    res.status(201).json({
      success: true,
      message: 'School created successfully',
      data: populatedSchool,
    });
  } catch (error) {
    // ✅ ENHANCED: Comprehensive error logging
    console.error('❌ CREATE SCHOOL ERROR:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    if (error.name === 'ValidationError') {
      console.error('Mongoose validation errors:', error.errors);
      return res.status(400).json({
        success: false,
        message: 'School data validation failed',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message,
        })),
      });
    }

    if (error.code === 11000) {
      console.error('Duplicate key error:', error.keyPattern);
      return res.status(400).json({
        success: false,
        message: 'School with this information already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating school',
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message,
        stack: error.stack,
      }),
    });
  }
};

// @desc    Update school
// @route   PUT /api/schools/:id
// @access  Private
const updateSchool = async (req, res) => {
  try {
    console.log('📝 UPDATE SCHOOL REQUEST:');
    console.log('School ID:', req.params.id);
    console.log('User:', { id: req.user._id, role: req.user.role });

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

    // UPDATED PERMISSION CHECK - Allow admin OR any teacher of the school
    if (req.user.role !== 'admin') {
      const isTeacher = school.teachers.some(
        teacher =>
          teacher.user.toString() === req.user._id.toString() &&
          ['teacher', 'head_teacher'].includes(teacher.role) && // Allow both roles
          teacher.isActive !== false
      );

      if (!isTeacher) {
        console.log('❌ Update permission denied');
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this school',
        });
      }
    }

    // Only allow certain fields to be updated
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

    console.log('✅ Update data:', updateData);

    const updatedSchool = await School.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('teachers.user', 'name email')
      .populate('createdBy', 'name email');

    console.log('✅ School updated successfully');

    res.status(200).json({
      success: true,
      message: 'School updated successfully',
      data: updatedSchool,
    });
  } catch (error) {
    console.error('❌ Update error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message,
        })),
      });
    }

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
    console.log('🗑️ DELETE SCHOOL REQUEST:');
    console.log('School ID:', req.params.id);
    console.log('User:', {
      id: req.user._id,
      role: req.user.role,
      email: req.user.email,
    });

    const school = await School.findById(req.params.id);

    if (!school) {
      console.log('❌ School not found');
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    console.log('🏫 School found:', school.name);
    console.log(
      '👥 School teachers:',
      school.teachers.map(t => ({
        userId: t.user,
        role: t.role,
        isActive: t.isActive,
      }))
    );

    // UPDATED PERMISSION CHECK - Allow admin OR any teacher of the school
    let canDelete = false;
    let reason = '';

    if (req.user.role === 'admin') {
      canDelete = true;
      reason = 'User is admin';
      console.log('✅ Admin can delete');
    } else {
      // Check if user is ANY teacher of this school
      const isTeacher = school.teachers.some(teacher => {
        const userIdMatch = teacher.user.toString() === req.user._id.toString();
        const roleMatch = ['teacher', 'head_teacher'].includes(teacher.role); // Allow both roles
        const activeMatch = teacher.isActive !== false;

        console.log('👨‍🏫 Checking teacher:', {
          teacherUserId: teacher.user.toString(),
          reqUserId: req.user._id.toString(),
          userIdMatch,
          teacherRole: teacher.role,
          roleMatch,
          isActive: teacher.isActive,
          activeMatch,
          canDelete: userIdMatch && roleMatch && activeMatch,
        });

        return userIdMatch && roleMatch && activeMatch;
      });

      if (isTeacher) {
        canDelete = true;
        reason = 'User is teacher of this school';
        console.log('✅ Teacher can delete');
      } else {
        reason = 'User is not admin or teacher of this school';
        console.log('❌ User not authorized:', reason);
      }
    }

    if (!canDelete) {
      console.log('❌ Authorization failed:', reason);
      return res.status(403).json({
        success: false,
        message: `Not authorized to delete schools. ${reason}`,
        debug: {
          userRole: req.user.role,
          userId: req.user._id,
          schoolTeachers: school.teachers.map(t => ({
            userId: t.user,
            role: t.role,
            isActive: t.isActive,
          })),
        },
      });
    }

    console.log('✅ User authorized to delete:', reason);

    // Check if school has students
    const Student = require('../models/Student');
    const studentCount = await Student.countDocuments({
      school: req.params.id,
      isActive: true,
    });

    console.log('📊 Student count:', studentCount);

    if (studentCount > 0) {
      console.log('❌ Cannot delete school with students');
      return res.status(400).json({
        success: false,
        message: `Cannot delete school with ${studentCount} active students. Please transfer or remove students first.`,
        data: { studentCount },
      });
    }

    // Delete the school
    console.log('🗑️ Proceeding with deletion...');
    await School.findByIdAndDelete(req.params.id);

    // Remove school from all users' schools array
    const User = require('../models/User');
    await User.updateMany({ schools: req.params.id }, { $pull: { schools: req.params.id } });

    console.log('✅ School deleted successfully');

    res.status(200).json({
      success: true,
      message: 'School deleted successfully',
    });
  } catch (error) {
    console.error('❌ Delete error:', error);
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
