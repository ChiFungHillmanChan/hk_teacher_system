// src/pages/analysation/ValidationEngine.js - Enhanced Grade-School Type Validation
import { isValidEmail, isValidPhone } from './utils/Utils';

const ValidationEngine = {
  /**
   * Validate all schools and students data for real API compatibility
   */
  validateAll: schools => {
    console.log('[ValidationEngine] 🔍 開始驗證所有資料');

    const errors = [];
    const warnings = [];
    let totalStudents = 0;

    schools.forEach((school, schoolIndex) => {
      console.log(`[ValidationEngine] 🏫 驗證學校 ${schoolIndex + 1}: ${school.name}`);

      // Validate school
      const schoolValidation = ValidationEngine.validateSchool(school, schoolIndex);
      errors.push(...schoolValidation.errors);
      warnings.push(...schoolValidation.warnings);

      // Validate students with enhanced grade-school type checking
      if (school.students && Array.isArray(school.students)) {
        school.students.forEach((student, studentIndex) => {
          totalStudents++;
          const studentValidation = ValidationEngine.validateStudent(
            student,
            studentIndex,
            school.name,
            school.schoolType
          );
          errors.push(...studentValidation.errors);
          warnings.push(...studentValidation.warnings);
        });

        // Additional school-level validation for grade consistency
        const gradeConsistencyWarnings = ValidationEngine.validateSchoolGradeConsistency(
          school,
          schoolIndex
        );
        warnings.push(...gradeConsistencyWarnings);
      }
    });

    const summary = {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalSchools: schools.length,
        totalStudents,
        errorCount: errors.length,
        warningCount: warnings.length,
      },
    };

    console.log(
      `[ValidationEngine] 📊 驗證完成 - 學校: ${schools.length}, 學生: ${totalStudents}, 錯誤: ${errors.length}, 警告: ${warnings.length}`
    );

    return summary;
  },

  /**
   * Enhanced school-level grade consistency validation
   */
  validateSchoolGradeConsistency: (school, schoolIndex) => {
    const warnings = [];
    const context = `學校 ${schoolIndex + 1} (${school.name})`;

    if (!school.students || school.students.length === 0) return warnings;

    const studentGrades = school.students.map(s => s.grade).filter(Boolean);
    const primaryGrades = studentGrades.filter(grade =>
      ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].includes(grade)
    );
    const secondaryGrades = studentGrades.filter(grade =>
      ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].includes(grade)
    );

    // Enhanced validation with more specific messaging
    if (school.schoolType === 'primary' && secondaryGrades.length > 0) {
      warnings.push(
        `🚨 ${context}: 發現 ${secondaryGrades.length} 名中學年級學生在小學 - 年級: ${[
          ...new Set(secondaryGrades),
        ].join(', ')}`
      );
      console.warn(
        `[ValidationEngine] 🚨 年級不符: ${school.name} (小學) 有中學年級學生:`,
        secondaryGrades
      );
    }

    if (school.schoolType === 'secondary' && primaryGrades.length > 0) {
      warnings.push(
        `🚨 ${context}: 發現 ${primaryGrades.length} 名小學年級學生在中學 - 年級: ${[
          ...new Set(primaryGrades),
        ].join(', ')}`
      );
      console.warn(
        `[ValidationEngine] 🚨 年級不符: ${school.name} (中學) 有小學年級學生:`,
        primaryGrades
      );
    }

    return warnings;
  },

  /**
   * Validate individual school data for real API
   */
  validateSchool: (school, index) => {
    console.log(`[ValidationEngine] 🏫 驗證學校資料: ${school.name || `學校 ${index + 1}`}`);

    const errors = [];
    const warnings = [];
    const context = `學校 ${index + 1}`;

    // Required fields validation
    if (!school.name || typeof school.name !== 'string' || school.name.trim() === '') {
      errors.push(`${context}: 學校名稱為必填欄位`);
    } else {
      // Validate name length (API constraint)
      if (school.name.length > 100) {
        errors.push(`${context}: 學校名稱不能超過 100 字符`);
      }
    }

    // School type validation
    if (school.schoolType) {
      const validTypes = ['primary', 'secondary', 'both', 'special'];
      if (!validTypes.includes(school.schoolType)) {
        errors.push(`${context}: 無效的學校類型 "${school.schoolType}"`);
      }
    } else {
      warnings.push(`${context}: 建議設定學校類型`);
    }

    // Optional fields validation
    if (school.nameEn && school.nameEn.length > 100) {
      errors.push(`${context}: 英文名稱不能超過 100 字符`);
    }

    if (school.nameCh && school.nameCh.length > 100) {
      errors.push(`${context}: 中文名稱不能超過 100 字符`);
    }

    if (school.district && school.district.length > 50) {
      warnings.push(`${context}: 地區名稱較長，建議簡化`);
    }

    if (school.address && school.address.length > 200) {
      warnings.push(`${context}: 地址較長，可能需要簡化`);
    }

    if (school.contactPerson && school.contactPerson.length > 50) {
      warnings.push(`${context}: 聯絡人姓名較長`);
    }

    // Email validation
    if (school.email && !isValidEmail(school.email)) {
      errors.push(`${context}: 無效的電子郵件格式`);
    }

    // Phone validation
    if (school.phone && !isValidPhone(school.phone)) {
      warnings.push(`${context}: 電話號碼格式可能不正確`);
    }

    if (school.description && school.description.length > 500) {
      warnings.push(`${context}: 學校描述較長，建議精簡`);
    }

    return { errors, warnings };
  },

  /**
   * Enhanced student validation with prominent grade-school type checking
   */
  validateStudent: (student, index, schoolName, schoolType) => {
    console.log(`[ValidationEngine] 👤 驗證學生資料: ${student.name || `學生 ${index + 1}`}`);

    const errors = [];
    const warnings = [];
    const context = `學生 ${index + 1} (${schoolName})`;

    // Required fields validation - API expects at least one name field
    if (!student.name && !student.nameEn && !student.nameCh) {
      errors.push(`${context}: 必須提供至少一個姓名欄位（中文姓名、英文姓名或姓名）`);
    }

    // Name validation
    if (student.name) {
      if (typeof student.name !== 'string' || student.name.trim() === '') {
        errors.push(`${context}: 姓名不能為空`);
      } else if (student.name.length > 50) {
        errors.push(`${context}: 姓名不能超過 50 字符`);
      }
    }

    if (student.nameEn && student.nameEn.length > 50) {
      errors.push(`${context}: 英文姓名不能超過 50 字符`);
    }

    if (student.nameCh && student.nameCh.length > 50) {
      errors.push(`${context}: 中文姓名不能超過 50 字符`);
    }

    // Student ID validation
    if (student.studentId && student.studentId.length > 20) {
      errors.push(`${context}: 學號不能超過 20 字符`);
    }

    // ENHANCED Grade validation - must match HK education system
    if (student.grade) {
      const validGrades = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
      if (!validGrades.includes(student.grade)) {
        errors.push(`${context}: 無效的年級格式 "${student.grade}"，必須是 P1-P6 或 S1-S6`);
      } else {
        // CRITICAL: Enhanced grade-school type consistency check
        const isPrimaryGrade = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].includes(student.grade);
        const isSecondaryGrade = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].includes(student.grade);

        if (schoolType === 'primary' && isSecondaryGrade) {
          // Make this very prominent and visible
          const warningMsg = `🚨 年級嚴重不符：${student.name} 是中學年級 ${student.grade}，但學校 "${schoolName}" 是小學`;
          warnings.push(warningMsg);
          console.warn(`[ValidationEngine] 🚨 CRITICAL: ${warningMsg}`);
        }

        if (schoolType === 'secondary' && isPrimaryGrade) {
          const warningMsg = `🚨 年級嚴重不符：${student.name} 是小學年級 ${student.grade}，但學校 "${schoolName}" 是中學`;
          warnings.push(warningMsg);
          console.warn(`[ValidationEngine] 🚨 CRITICAL: ${warningMsg}`);
        }
      }
    }

    // Class validation
    if (student.class && student.class.length > 10) {
      errors.push(`${context}: 班別不能超過 10 字符`);
    }

    // Class number validation
    if (student.classNumber !== null && student.classNumber !== undefined) {
      const classNum = parseInt(student.classNumber);
      if (isNaN(classNum) || classNum < 1 || classNum > 50) {
        errors.push(`${context}: 班內號碼必須在 1-50 之間`);
      }
    }

    // Gender validation
    if (student.gender) {
      const validGenders = ['male', 'female', 'other'];
      if (!validGenders.includes(student.gender)) {
        errors.push(`${context}: 無效的性別值 "${student.gender}"，必須是 male、female 或 other`);
      }
    }

    // Date of birth validation
    if (student.dateOfBirth) {
      const birthDate = new Date(student.dateOfBirth);
      if (isNaN(birthDate.getTime())) {
        errors.push(`${context}: 無效的出生日期格式`);
      } else {
        const currentYear = new Date().getFullYear();
        const birthYear = birthDate.getFullYear();

        if (birthYear < currentYear - 25 || birthYear > currentYear - 3) {
          warnings.push(`${context}: 出生日期看起來不太合理（${birthYear}年）`);
        }
      }
    }

    // Contact information validation
    if (student.email && !isValidEmail(student.email)) {
      errors.push(`${context}: 無效的電子郵件格式`);
    }

    if (student.phone && !isValidPhone(student.phone)) {
      warnings.push(`${context}: 電話號碼格式可能不正確`);
    }

    if (student.address && student.address.length > 200) {
      warnings.push(`${context}: 地址較長，可能需要簡化`);
    }

    if (student.parentContact && student.parentContact.length > 100) {
      warnings.push(`${context}: 家長聯絡資訊較長`);
    }

    if (student.emergencyContact && student.emergencyContact.length > 100) {
      warnings.push(`${context}: 緊急聯絡資訊較長`);
    }

    if (student.notes && student.notes.length > 500) {
      warnings.push(`${context}: 備註內容較長，建議精簡`);
    }

    // Academic year validation
    if (student.academicYear) {
      const academicYearPattern = /^\d{4}\/\d{2}$/;
      if (!academicYearPattern.test(student.academicYear)) {
        errors.push(`${context}: 學年格式錯誤，應為 YYYY/YY 格式（如 2025/26）`);
      }
    }

    return { errors, warnings };
  },

  /**
   * Legacy function - kept for backward compatibility but enhanced
   */
  validateGradeSchoolTypeConsistency: (grade, schoolType, context, warnings) => {
    if (!grade || !schoolType) return;

    const isPrimaryGrade = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].includes(grade);
    const isSecondaryGrade = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].includes(grade);

    if (schoolType === 'primary' && isSecondaryGrade) {
      warnings.push(`🚨 ${context}: 小學學校但有中學年級學生（${grade}）- 請檢查資料正確性`);
    }

    if (schoolType === 'secondary' && isPrimaryGrade) {
      warnings.push(`🚨 ${context}: 中學學校但有小學年級學生（${grade}）- 請檢查資料正確性`);
    }
  },

  /**
   * Legacy function - kept for backward compatibility
   */
  validateSchoolTypeConsistency: (schoolType, studentGrades, context, warnings) => {
    if (!schoolType || studentGrades.length === 0) return;

    const primaryGrades = studentGrades.filter(grade =>
      ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].includes(grade)
    );
    const secondaryGrades = studentGrades.filter(grade =>
      ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].includes(grade)
    );

    if (schoolType === 'primary' && secondaryGrades.length > 0) {
      warnings.push(
        `🚨 ${context}: 小學但包含 ${secondaryGrades.length} 名中學年級學生，建議檢查學校類型`
      );
    }

    if (schoolType === 'secondary' && primaryGrades.length > 0) {
      warnings.push(
        `🚨 ${context}: 中學但包含 ${primaryGrades.length} 名小學年級學生，建議檢查學校類型`
      );
    }

    if (schoolType === 'both') {
      // This is expected for combined schools
      return;
    }
  },

  /**
   * Sanitize data for API submission
   */
  sanitizeForApiSubmission: schools => {
    return schools.map(school => {
      const sanitizedSchool = {
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

        students: (school.students || []).map(student => ({
          name: student.name?.trim() || '',
          nameEn: student.nameEn?.trim() || '',
          nameCh: student.nameCh?.trim() || student.name?.trim() || '',
          studentId: student.studentId?.trim() || '',
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

          hasDuplicates: student.hasDuplicates || false,
          duplicates: student.duplicates || [],
          duplicateResolution: student.duplicateResolution || null,
          mergeWithStudentId: student.mergeWithStudentId || null,
          skipImport: student.skipImport || false,
        })),
      };

      Object.keys(sanitizedSchool).forEach(key => {
        if (sanitizedSchool[key] === '') {
          sanitizedSchool[key] = null;
        }
      });

      sanitizedSchool.students.forEach(student => {
        Object.keys(student).forEach(key => {
          if (student[key] === '') {
            student[key] = null;
          }
        });
      });

      return sanitizedSchool;
    });
  },

  /**
   * Validate data before API submission
   */
  validateForApiSubmission: schools => {
    console.log('[ValidationEngine] 📤 驗證 API 提交資料');

    const errors = [];

    schools.forEach((school, schoolIndex) => {
      if (!school.name || school.name.trim() === '') {
        errors.push(`學校 ${schoolIndex + 1}: API 要求學校名稱為必填`);
      }

      if (!school.schoolType) {
        errors.push(`學校 ${schoolIndex + 1}: API 要求學校類型為必填`);
      }

      if (school.students && school.students.length > 0) {
        school.students.forEach((student, studentIndex) => {
          const studentContext = `學校 "${school.name}" 學生 ${studentIndex + 1}`;

          if (!student.name && !student.nameEn && !student.nameCh) {
            errors.push(`${studentContext}: API 要求至少一個姓名欄位`);
          }

          if (student.hasDuplicates && !student.duplicateResolution) {
            errors.push(`${studentContext}: 重複學生未設定處理方式`);
          }
        });
      }

      if (school.hasDuplicates && school.requiresUserDecision) {
        errors.push(`學校 "${school.name}": 重複學校未設定處理方式`);
      }
    });

    const isValid = errors.length === 0;

    console.log(
      `[ValidationEngine] 📤 API 提交驗證${isValid ? '通過' : '失敗'} - 錯誤: ${errors.length}`
    );

    return { isValid, errors };
  },

  /**
   * Generate validation summary report
   */
  generateValidationReport: validationResults => {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSchools: validationResults.stats.totalSchools,
        totalStudents: validationResults.stats.totalStudents,
        isValid: validationResults.isValid,
        errorCount: validationResults.errors.length,
        warningCount: validationResults.warnings.length,
      },
      errors: validationResults.errors,
      warnings: validationResults.warnings,
      recommendations: [],
    };

    // Generate recommendations based on common issues
    if (validationResults.errors.length > 0) {
      report.recommendations.push('請修正所有錯誤後再嘗試匯入');
    }

    if (validationResults.warnings.length > 0) {
      report.recommendations.push('建議檢查警告項目以確保資料品質');
    }

    // Check for grade-school type mismatches
    const gradeWarnings = validationResults.warnings.filter(
      warning => warning.includes('年級嚴重不符') || warning.includes('年級不符')
    );
    if (gradeWarnings.length > 0) {
      report.recommendations.push('發現年級與學校類型不符的情況，強烈建議檢查資料正確性');
    }

    const gradeErrors = validationResults.errors.filter(error => error.includes('年級格式'));
    if (gradeErrors.length > 0) {
      report.recommendations.push('請確認年級格式符合香港學制（P1-P6, S1-S6）');
    }

    const emailErrors = validationResults.errors.filter(error => error.includes('電子郵件'));
    if (emailErrors.length > 0) {
      report.recommendations.push('請檢查電子郵件地址格式');
    }

    console.log(
      `[ValidationEngine] 📊 生成驗證報告 - 錯誤: ${report.summary.errorCount}, 警告: ${report.summary.warningCount}`
    );

    return report;
  },
};

export default ValidationEngine;
