// src/pages/analysation/ImportOrchestrator.js - Real API Implementation
import { schoolHelpers, studentHelpers } from '../../services/api';

const currentYear = new Date().getFullYear();
const nextYear = (currentYear + 1).toString().slice(-2);
const academicYear = `${currentYear}/${nextYear}`;

const ImportOrchestrator = {
  /**
   * Import a single school with its students using real API
   */
  importSchool: async (school, onProgress) => {
    console.log(`[單校匯入] 🏫 開始匯入學校: ${school.name}`);

    const studentCount = school.students?.length || 0;

    // Report start progress
    if (onProgress) {
      onProgress({
        stage: 'processing_school',
        current: 0,
        total: 1,
        currentSchool: school.name,
        message: `處理學校: ${school.name}`,
      });
    }

    try {
      // Step 1: Process School
      const schoolResult = await ImportOrchestrator.processSchool(school);
      const schoolId = schoolResult.id;

      // Step 2: Process Students
      const studentResults = await ImportOrchestrator.processStudentsForSchool(
        school,
        schoolId,
        onProgress,
        0, // schoolIndex for single school import
        1 // totalSchools for single school import
      );

      const summary = {
        schoolResult,
        studentResults,
        successCount: studentResults.successCount,
        failureCount: studentResults.failureCount,
        totalProcessed: studentResults.successCount + studentResults.failureCount,
      };

      console.log(
        `[單校匯入] 📋 學校 "${school.name}" 匯入完成 - 成功: ${summary.successCount}, 失敗: ${summary.failureCount}`
      );

      // Final progress report
      if (onProgress) {
        onProgress({
          stage: 'completed',
          current: 1,
          total: 1,
          message: `學校匯入完成 - 成功: ${summary.successCount}, 失敗: ${summary.failureCount}`,
          summary,
        });
      }

      return summary;
    } catch (error) {
      console.error(`[單校匯入] ❌ 學校匯入失敗: ${school.name}`, error);

      const errorSummary = {
        schoolResult: { success: false, error: error.message },
        studentResults: { successCount: 0, failureCount: studentCount, studentResults: [] },
        successCount: 0,
        failureCount: 1 + studentCount,
        totalProcessed: 1 + studentCount,
        error: error.message,
      };

      if (onProgress) {
        onProgress({
          stage: 'error',
          current: 1,
          total: 1,
          message: `學校匯入失敗: ${error.message}`,
          summary: errorSummary,
        });
      }

      return errorSummary;
    }
  },

  /**
   * Import all schools and students using real API endpoints
   */
  importAll: async (schools, onProgress) => {
    console.log('[匯入開始] 🚀 開始匯入流程');
    console.log(`[匯入準備] 📊 偵測到 ${schools.length} 所學校`);

    let successCount = 0;
    let failureCount = 0;
    const results = [];
    const errors = [];

    // Report progress
    if (onProgress) {
      onProgress({
        stage: 'starting',
        current: 0,
        total: schools.length,
        message: '開始匯入流程',
      });
    }

    for (const [schoolIndex, school] of schools.entries()) {
      const studentCount = school.students?.length || 0;

      console.log(
        `[學校處理] 🏫 處理第 ${schoolIndex + 1}/${schools.length} 所學校: ${school.name}`
      );
      console.log(`[學校推斷] 🏫 ${school.name} (${school.schoolType}) - ${studentCount} 名學生`);

      // Report progress
      if (onProgress) {
        onProgress({
          stage: 'processing_school',
          current: schoolIndex,
          total: schools.length,
          currentSchool: school.name,
          message: `處理學校: ${school.name}`,
        });
      }

      try {
        // Step 1: Process School (create new or reuse existing)
        const schoolResult = await ImportOrchestrator.processSchool(school);
        const schoolId = schoolResult.id;

        // Step 2: Process Students for this school
        const studentResults = await ImportOrchestrator.processStudentsForSchool(
          school,
          schoolId,
          onProgress,
          schoolIndex,
          schools.length
        );

        successCount += studentResults.successCount;
        failureCount += studentResults.failureCount;

        results.push({
          type: 'school',
          name: school.name,
          success: true,
          action: schoolResult.action,
          schoolId: schoolId,
          students: studentResults.studentResults,
          studentSuccessCount: studentResults.successCount,
          studentFailureCount: studentResults.failureCount,
        });
      } catch (error) {
        console.error(`[School Import] ❌ 學校匯入失敗: ${school.name}`, error);
        errors.push(`學校 "${school.name}": ${error.message}`);

        // Count all students in this school as failed
        failureCount += 1 + studentCount;

        results.push({
          type: 'school',
          name: school.name,
          success: false,
          error: error.message,
          studentsSkipped: studentCount,
        });

        // Continue with next school instead of breaking
        continue;
      }
    }

    const summary = {
      successCount,
      failureCount,
      totalProcessed: successCount + failureCount,
      results,
      errors,
    };

    console.log(`[匯入完成] 📋 成功: ${successCount} 筆 | 失敗: ${failureCount} 筆`);

    // Final progress report
    if (onProgress) {
      onProgress({
        stage: 'completed',
        current: schools.length,
        total: schools.length,
        message: `匯入完成 - 成功: ${successCount}, 失敗: ${failureCount}`,
        summary,
      });
    }

    return summary;
  },

  /**
   * Process a single school (create new or reuse existing) using real API
   */
  processSchool: async school => {
    console.log(`[School Import] 🏫 處理學校: ${school.name}`);
    console.log(
      `[School Import] 📊 重複狀態: hasDuplicates=${school.hasDuplicates}, identityDecision=${school.identityDecision?.action}`
    );

    // ✅ ENHANCED: Check multiple duplicate resolution methods
    const shouldReuseExisting =
      (school.hasDuplicates && school.identityDecision?.action === 'use_existing') ||
      school.useExistingSchool === true ||
      school.duplicateResolution === 'reuse' ||
      (school.existingSchoolId && school.existingSchoolId !== null);

    if (shouldReuseExisting) {
      const existingId = school.existingSchoolId || school.identityDecision?.existingId;

      if (!existingId) {
        console.error(`[School Import] ❌ 決定重複使用但缺少既有學校ID: ${school.name}`);
        throw new Error(`重複使用設定錯誤：缺少既有學校ID`);
      }

      console.log(`[School Import] 🔄 重複使用既有學校: ${school.name} (ID: ${existingId})`);

      // ✅ OPTION: Update existing school if requested
      if (school.updateExistingData || school.identityDecision?.updateData) {
        try {
          const updateData = ImportOrchestrator.prepareSchoolUpdateData(school);
          const updatedSchool = await schoolHelpers.update(existingId, updateData);
          console.log(`[School Import] 📝 更新既有學校資料: ${school.name}`);

          return {
            id: existingId,
            action: 'updated',
            data: updatedSchool,
          };
        } catch (updateError) {
          console.warn(`[School Import] ⚠️ 更新既有學校失敗，改用原始資料: ${updateError.message}`);
        }
      }

      return {
        id: existingId,
        action: 'reused',
        data: school.existingSchoolData || { _id: existingId, name: school.name },
      };
    }

    // Create new school
    console.log(`[School Import] ➕ 建立新學校: ${school.name}`);
    const schoolData = ImportOrchestrator.prepareSchoolData(school);
    const newSchool = await schoolHelpers.create(schoolData);

    console.log(`[School Import] ✅ 成功建立學校: ${school.name} (ID: ${newSchool._id})`);

    return {
      id: newSchool._id,
      action: 'created',
      data: newSchool,
    };
  },

  /**
   * Process students for a specific school using real API
   */
  processStudentsForSchool: async (school, schoolId, onProgress, schoolIndex, totalSchools) => {
    const studentResults = [];
    let successCount = 0;
    let failureCount = 0;

    if (!school.students || school.students.length === 0) {
      console.log(`[Student Import] ℹ️ 學校 "${school.name}" 沒有學生資料`);
      return { studentResults, successCount, failureCount };
    }

    // Filter students that should be imported
    const studentsToImport = school.students.filter(
      student =>
        student.duplicateResolution !== 'skip' && student.duplicateResolution !== 'merge_into_other'
    );

    console.log(
      `[Student Import] 👥 開始處理 ${studentsToImport.length} 名學生 (學校: ${school.name})`
    );

    for (const [index, student] of studentsToImport.entries()) {
      try {
        // Report progress for each student
        if (onProgress) {
          onProgress({
            stage: 'processing_student',
            current: schoolIndex,
            total: totalSchools,
            currentSchool: school.name,
            currentStudent: student.name,
            studentIndex: index,
            totalStudents: studentsToImport.length,
            message: `處理學生: ${student.name} (${index + 1}/${studentsToImport.length})`,
          });
        }

        // Handle duplicate resolution
        if (student.duplicateResolution === 'merge') {
          console.log(`[Student Import] 🔀 合併學生記錄: ${student.name}`);

          // Real API call to update existing student with merged data
          const mergeData = ImportOrchestrator.prepareMergeData(student, schoolId);
          const mergedStudent = await studentHelpers.update(student.mergeWithStudentId, mergeData);

          console.log(`[Student Import] ✅ 學生合併成功: ${student.name}`);

          studentResults.push({
            index,
            name: student.name,
            success: true,
            action: 'merged',
            studentId: student.mergeWithStudentId,
            data: mergedStudent,
          });
          successCount++;
          continue;
        }

        // Create new student using real API
        const studentData = ImportOrchestrator.prepareStudentData(student, schoolId);

        const newStudent = await studentHelpers.create(studentData);

        console.log(
          `[Student Import] ✅ 成功建立學生: ${student.name} (學校: ${school.name}) (班級: ${
            student.class || 'N/A'
          })`
        );

        studentResults.push({
          index,
          name: student.name,
          success: true,
          action: 'created',
          studentId: newStudent._id,
          data: newStudent,
        });
        successCount++;
      } catch (error) {
        console.error(`[Student Import] ❌ 學生匯入失敗: ${student.name}`, error);

        studentResults.push({
          index,
          name: student.name,
          success: false,
          error: error.message,
        });
        failureCount++;

        // Continue with next student instead of breaking
        continue;
      }
    }

    console.log(
      `[Student Import] 📊 學校 "${school.name}" 學生處理完成 - 成功: ${successCount}, 失敗: ${failureCount}`
    );

    return { studentResults, successCount, failureCount };
  },

  /**
   * Prepare school data for API submission
   */
  prepareSchoolData: school => {
    return {
      name: school.name?.trim() || '',
      nameEn: school.nameEn?.trim() || '',
      nameCh: school.nameCh?.trim() || school.name?.trim() || '',
      schoolType: school.schoolType || 'primary',
      district: school.district?.trim() || '',
      address: school.address?.trim() || '',
      contactPerson: school.contactPerson?.trim() || '',
      email: school.email?.trim() || '',
      phone: school.phone?.trim() || '',
      description: school.description?.trim() || '',
      isActive: true,
      createdBy: 'excel_import',
      metadata: {
        importSource: 'excel',
        importedAt: new Date().toISOString(),
        originalData: {
          studentCount: school.students?.length || 0,
          hasGrades: school.students?.some(s => s.grade) || false,
          hasClasses: school.students?.some(s => s.class) || false,
        },
      },
    };
  },

  /**
   * Prepare school update data for existing schools
   */
  prepareSchoolUpdateData: school => {
    const updateData = {
      nameEn: school.nameEn?.trim() || '',
      nameCh: school.nameCh?.trim() || '',
      district: school.district?.trim() || '',
      address: school.address?.trim() || '',
      contactPerson: school.contactPerson?.trim() || '',
      email: school.email?.trim() || '',
      phone: school.phone?.trim() || '',
      description: school.description?.trim() || '',
      updatedBy: 'excel_import',
      lastUpdated: new Date().toISOString(),
    };

    // Remove empty strings and convert to null
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === '') {
        updateData[key] = null;
      }
    });

    return updateData;
  },

  /**
   * Prepare student data for API submission - MATCH manual creation format
   */
  prepareStudentData: (student, schoolId) => {
    console.log(`[Student Prep] 👤 Preparing data for: ${student.name}`);

    // ✅ GENERATE: Academic year (required field)
    const currentYear = new Date().getFullYear();
    const nextYear = (currentYear + 1).toString().slice(-2);
    const academicYear = `${currentYear}/${nextYear}`;

    // ✅ MATCH: Exact format that manual creation uses
    const studentData = {
      // ✅ REQUIRED FIELDS
      name: student.name?.trim() || '',
      school: schoolId,
      academicYear: academicYear, // ✅ academicYear (not currentAcademicYear)
      grade: student.grade || '', // ✅ grade (not currentGrade)

      // ✅ OPTIONAL: Only include if not empty - use undefined not empty string
      ...(student.nameEn?.trim() && { nameEn: student.nameEn.trim() }),
      ...(student.nameCh?.trim() && { nameCh: student.nameCh.trim() }),
      ...(student.studentId?.trim() && { studentId: student.studentId.trim() }),
      ...(student.class?.trim() && { class: student.class.trim() }), // ✅ class (not currentClass)
      ...(student.classNumber &&
        !isNaN(parseInt(student.classNumber)) && {
          classNumber: parseInt(student.classNumber),
        }),
      ...(student.gender && student.gender !== 'other' && { gender: student.gender }),
      ...(student.notes?.trim() && { notes: student.notes.trim() }),

      // ✅ DATE: Only include if valid date
      ...(student.dateOfBirth &&
        !isNaN(new Date(student.dateOfBirth).getTime()) && {
          dateOfBirth: student.dateOfBirth, // Send as string, let backend handle conversion
        }),

      // ✅ CONTACT INFO: Structure exactly like manual creation
      contactInfo: {}, // Start with empty object

      // ✅ SYSTEM: Required meta fields
      createdBy: 'excel_import', // ✅ Add createdBy field
    };

    // ✅ BUILD: Contact info object like manual creation
    const contactFields = {};
    if (student.phone?.trim()) contactFields.parentPhone = student.phone.trim();
    if (student.email?.trim()) contactFields.parentEmail = student.email.trim();
    if (student.address?.trim()) contactFields.address = student.address.trim();
    if (student.parentContact?.trim()) contactFields.parentName = student.parentContact.trim();

    // Only add contactInfo if there are contact fields
    if (Object.keys(contactFields).length > 0) {
      studentData.contactInfo = contactFields;
    }

    // ✅ CLEAN: Remove any undefined values (but keep empty objects)
    Object.keys(studentData).forEach(key => {
      if (studentData[key] === undefined) {
        delete studentData[key];
      }
    });

    console.log(`[Student Prep] ✅ Final data (matches manual format):`, {
      name: studentData.name,
      grade: studentData.grade,
      academicYear: studentData.academicYear,
      school: typeof studentData.school,
      hasContactInfo: Object.keys(studentData.contactInfo || {}).length > 0,
      fieldCount: Object.keys(studentData).length,
    });

    console.log(`[Student Prep] 📋 Complete payload:`, studentData);

    return studentData;
  },

  /**
   * Prepare merge data for existing students
   */
  prepareMergeData: (student, schoolId) => {
    const mergeData = {
      nameEn: student.nameEn?.trim() || '',
      nameCh: student.nameCh?.trim() || '',
      studentId: student.studentId?.trim() || '',
      school: schoolId,
      grade: student.grade || '',
      class: student.class?.trim() || '',
      classNumber: student.classNumber || null,
      gender: student.gender || 'other',
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth) : null,
      phone: student.phone?.trim() || '',
      email: student.email?.trim() || '',
      address: student.address?.trim() || '',
      parentContact: student.parentContact?.trim() || '',
      emergencyContact: student.emergencyContact?.trim() || '',
      notes: student.notes?.trim() || '',
      updatedBy: 'excel_import',
      lastUpdated: new Date().toISOString(),
    };

    // Remove empty strings and convert to null
    Object.keys(mergeData).forEach(key => {
      if (mergeData[key] === '') {
        mergeData[key] = null;
      }
    });

    return mergeData;
  },

  /**
   * Find existing schools for identity resolution using real API
   */
  findExistingSchools: async (searchCriteria = {}) => {
    console.log('[Identity Resolution] 🔍 搜尋既有學校:', searchCriteria);

    try {
      // Use real API to get schools
      const allSchools = await schoolHelpers.getAll({ limit: 1000 });

      if (!Array.isArray(allSchools)) {
        console.log('[Identity Resolution] ⚠️ 無法取得學校列表');
        return [];
      }

      console.log(`[Identity Resolution] 📋 找到 ${allSchools.length} 所既有學校`);

      // Filter schools based on search criteria
      let filteredSchools = allSchools;

      if (searchCriteria.name) {
        const searchName = searchCriteria.name.toLowerCase();
        filteredSchools = filteredSchools.filter(school =>
          school.name?.toLowerCase().includes(searchName)
        );
      }

      if (searchCriteria.schoolType) {
        filteredSchools = filteredSchools.filter(
          school => school.schoolType === searchCriteria.schoolType
        );
      }

      if (searchCriteria.district) {
        filteredSchools = filteredSchools.filter(
          school => school.district === searchCriteria.district
        );
      }

      console.log(`[Identity Resolution] ✅ 搜尋結果: ${filteredSchools.length} 所相符學校`);

      return filteredSchools.map(school => ({
        _id: school._id,
        name: school.name,
        nameEn: school.nameEn,
        nameCh: school.nameCh,
        schoolType: school.schoolType,
        district: school.district,
        address: school.address,
        isActive: school.isActive,
      }));
    } catch (error) {
      console.error('[Identity Resolution] ❌ 搜尋學校時發生錯誤:', error);
      throw new Error(`搜尋既有學校失敗: ${error.message}`);
    }
  },

  /**
   * Find existing students for identity resolution using real API
   */
  findExistingStudents: async (searchCriteria = {}) => {
    console.log('[Identity Resolution] 🔍 搜尋既有學生:', searchCriteria);

    try {
      // Use real API to get students
      const allStudents = await studentHelpers.getAll({ limit: 1000 });

      if (!Array.isArray(allStudents)) {
        console.log('[Identity Resolution] ⚠️ 無法取得學生列表');
        return [];
      }

      console.log(`[Identity Resolution] 📋 找到 ${allStudents.length} 名既有學生`);

      // Filter students based on search criteria
      let filteredStudents = allStudents;

      if (searchCriteria.name) {
        const searchName = searchCriteria.name.toLowerCase();
        filteredStudents = filteredStudents.filter(student =>
          student.name?.toLowerCase().includes(searchName)
        );
      }

      if (searchCriteria.grade) {
        filteredStudents = filteredStudents.filter(
          student => student.grade === searchCriteria.grade
        );
      }

      if (searchCriteria.class) {
        filteredStudents = filteredStudents.filter(
          student => student.class === searchCriteria.class
        );
      }

      if (searchCriteria.studentId) {
        filteredStudents = filteredStudents.filter(
          student => student.studentId === searchCriteria.studentId
        );
      }

      console.log(`[Identity Resolution] ✅ 搜尋結果: ${filteredStudents.length} 名相符學生`);

      return filteredStudents.map(student => ({
        _id: student._id,
        name: student.name,
        nameEn: student.nameEn,
        nameCh: student.nameCh,
        studentId: student.studentId,
        grade: student.grade,
        class: student.class,
        classNumber: student.classNumber,
        school: student.school,
        isActive: student.isActive,
      }));
    } catch (error) {
      console.error('[Identity Resolution] ❌ 搜尋學生時發生錯誤:', error);
      throw new Error(`搜尋既有學生失敗: ${error.message}`);
    }
  },
};

export default ImportOrchestrator;
