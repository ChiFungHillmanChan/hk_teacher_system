// src/pages/analysation/IdentityResolution.js - Enhanced Database Checking
import { schoolHelpers, studentHelpers } from '../../services/api';

const IdentityResolution = {
  /**
   * Check for duplicate schools and students using real API
   */
  checkDuplicates: async schools => {
    console.log('[重複檢查] 🔍 開始檢查重複項目');
    console.log(`[重複檢查] 📊 檢查 ${schools.length} 所學校的重複狀況`);

    const processedSchools = [];

    for (const [index, school] of schools.entries()) {
      console.log(`[重複檢查] 🏫 檢查學校 ${index + 1}/${schools.length}: ${school.name}`);

      // Find potential duplicate schools using real API
      const duplicateSchools = await IdentityResolution.findDuplicateSchools(school);

      const schoolToProcess = { ...school };

      if (duplicateSchools.length > 0) {
        console.log(
          `[重複檢查] ⚠️ 發現既有學校: ${school.name} - 找到 ${duplicateSchools.length} 個可能重複`
        );

        schoolToProcess.hasDuplicates = true;
        schoolToProcess.duplicates = duplicateSchools;
        schoolToProcess.requiresUserDecision = true;
        schoolToProcess.duplicateType = 'school';
      } else {
        console.log(`[重複檢查] ✅ 學校 "${school.name}" 沒有發現重複`);
        schoolToProcess.hasDuplicates = false;
        schoolToProcess.duplicates = [];
        schoolToProcess.requiresUserDecision = false;
      }

      // Check for duplicate students within this school using real API
      if (school.students && school.students.length > 0) {
        console.log(`[重複檢查] 👥 檢查學校 "${school.name}" 的 ${school.students.length} 名學生`);

        const processedStudents = await IdentityResolution.checkDuplicateStudents(
          school.students,
          school.name
        );

        schoolToProcess.students = processedStudents;
      }

      // NEW: Add confirmation state for school-by-school UI
      schoolToProcess.isConfirmed = false;
      schoolToProcess.isExpanded = false;
      schoolToProcess.confirmationRequired =
        schoolToProcess.hasDuplicates ||
        (schoolToProcess.students && schoolToProcess.students.some(s => s.hasDuplicates));

      processedSchools.push(schoolToProcess);
    }

    const schoolsWithDuplicates = processedSchools.filter(school => school.hasDuplicates).length;
    const studentsWithDuplicates = processedSchools.reduce((count, school) => {
      return count + (school.students?.filter(student => student.hasDuplicates).length || 0);
    }, 0);

    console.log(
      `[重複檢查] 📋 檢查完成 - 學校重複: ${schoolsWithDuplicates}, 學生重複: ${studentsWithDuplicates}`
    );

    return processedSchools;
  },

  /**
   * Enhanced duplicate school finding with better matching
   */
  findDuplicateSchools: async school => {
    try {
      console.log(`[重複檢查] 🔍 搜尋學校重複: ${school.name} (${school.schoolType})`);

      // Get all existing schools
      const existingSchools = await schoolHelpers.getAll({ limit: 1000 });

      if (!Array.isArray(existingSchools)) {
        console.warn('[重複檢查] ⚠️ 無法獲取現有學校資料');
        return [];
      }

      const duplicates = [];
      const schoolNameLower = school.name.toLowerCase().trim();
      const schoolType = school.schoolType;

      for (const existing of existingSchools) {
        const existingNameLower = existing.name.toLowerCase().trim();

        // Exact match (name + type)
        if (existingNameLower === schoolNameLower && existing.schoolType === schoolType) {
          duplicates.push({
            id: existing.id,
            name: existing.name,
            schoolType: existing.schoolType,
            district: existing.district,
            matchType: 'exact',
            confidence: 1.0,
            reason: '學校名稱和類型完全相符',
          });
          continue;
        }

        // Similar name match (fuzzy matching)
        const similarity = IdentityResolution.calculateStringSimilarity(
          schoolNameLower,
          existingNameLower
        );
        if (similarity > 0.8 && existing.schoolType === schoolType) {
          duplicates.push({
            id: existing.id,
            name: existing.name,
            schoolType: existing.schoolType,
            district: existing.district,
            matchType: 'similar',
            confidence: similarity,
            reason: `學校名稱相似度 ${Math.round(similarity * 100)}%`,
          });
        }

        // Partial name match
        if (
          schoolNameLower.includes(existingNameLower) ||
          existingNameLower.includes(schoolNameLower)
        ) {
          if (existing.schoolType === schoolType && similarity > 0.6) {
            duplicates.push({
              id: existing.id,
              name: existing.name,
              schoolType: existing.schoolType,
              district: existing.district,
              matchType: 'partial',
              confidence: similarity,
              reason: '學校名稱部分相符',
            });
          }
        }
      }

      // Sort by confidence (highest first)
      duplicates.sort((a, b) => b.confidence - a.confidence);

      // Remove duplicates with same ID
      const uniqueDuplicates = duplicates.filter(
        (item, index, arr) => arr.findIndex(t => t.id === item.id) === index
      );

      console.log(`[重複檢查] 🎯 找到 ${uniqueDuplicates.length} 個可能重複的學校`);
      return uniqueDuplicates;
    } catch (error) {
      console.error('[重複檢查] ❌ 學校重複檢查失敗:', error);
      return [];
    }
  },

  /**
   * Apply user decisions to duplicate resolution
   */
  applyUserDecisions: (schools, userDecisions) => {
    console.log('[重複檢查] 📝 應用使用者決定');
    console.log('[重複檢查] 📋 收到決定:', Object.keys(userDecisions).length);

    return schools.map(school => {
      const schoolKey = `school_${school.name}_${school.schoolType}`;
      const userDecision = userDecisions[schoolKey];

      if (userDecision && school.hasDuplicates) {
        console.log(`[重複檢查] ✅ 應用學校決定: ${school.name} -> ${userDecision.action}`);

        return {
          ...school,
          // ✅ CRITICAL: Apply user decision
          identityDecision: userDecision,
          useExistingSchool: userDecision.action === 'use_existing',
          existingSchoolId: userDecision.existingId,
          existingSchoolData: userDecision.existingData,
          updateExistingData: userDecision.updateData || false,
          requiresUserDecision: false,
          // ✅ Mark as resolved
          duplicateResolution: userDecision.action,
          skipImport: userDecision.action === 'skip',
        };
      }

      // Apply student decisions
      if (school.students) {
        school.students = school.students.map(student => {
          const studentKey = `student_${school.name}_${student.name}_${student.grade}_${student.class}`;
          const studentDecision = userDecisions[studentKey];

          if (studentDecision && student.hasDuplicates) {
            console.log(`[重複檢查] ✅ 應用學生決定: ${student.name} -> ${studentDecision.action}`);

            return {
              ...student,
              duplicateResolution: studentDecision.action,
              mergeWithStudentId: studentDecision.existingId,
              skipImport: studentDecision.action === 'skip',
              requiresUserDecision: false,
            };
          }
          return student;
        });
      }

      return school;
    });
  },

  /**
   * Enhanced duplicate student checking
   */
  checkDuplicateStudents: async (students, schoolName) => {
    try {
      console.log(`[重複檢查] 👥 檢查學生重複 (學校: ${schoolName})`);

      // Get existing students from the same school
      const existingStudents = await studentHelpers.getAll({
        schoolName: schoolName,
        limit: 2000,
      });

      if (!Array.isArray(existingStudents)) {
        console.warn('[重複檢查] ⚠️ 無法獲取現有學生資料');
        return students.map(student => ({ ...student, hasDuplicates: false, duplicates: [] }));
      }

      const processedStudents = [];

      for (const student of students) {
        const duplicates = [];
        const studentNameLower = student.name.toLowerCase().trim();

        for (const existing of existingStudents) {
          const existingNameLower = existing.name.toLowerCase().trim();

          // Exact match with same academic details
          if (
            existingNameLower === studentNameLower &&
            existing.grade === student.grade &&
            existing.class === student.class &&
            existing.classNumber === student.classNumber
          ) {
            duplicates.push({
              id: existing.id,
              name: existing.name,
              grade: existing.grade,
              class: existing.class,
              classNumber: existing.classNumber,
              matchType: 'exact',
              confidence: 1.0,
              reason: '姓名、年級、班別、班內號碼完全相符',
            });
            continue;
          }

          // Same name, different class/grade
          if (existingNameLower === studentNameLower) {
            duplicates.push({
              id: existing.id,
              name: existing.name,
              grade: existing.grade,
              class: existing.class,
              classNumber: existing.classNumber,
              matchType: 'name_only',
              confidence: 0.8,
              reason: '姓名相符但班級或年級不同',
            });
          }

          // Similar name in same class
          const similarity = IdentityResolution.calculateStringSimilarity(
            studentNameLower,
            existingNameLower
          );
          if (
            similarity > 0.85 &&
            existing.grade === student.grade &&
            existing.class === student.class
          ) {
            duplicates.push({
              id: existing.id,
              name: existing.name,
              grade: existing.grade,
              class: existing.class,
              classNumber: existing.classNumber,
              matchType: 'similar',
              confidence: similarity,
              reason: `同班同學姓名相似度 ${Math.round(similarity * 100)}%`,
            });
          }
        }

        // Sort by confidence
        duplicates.sort((a, b) => b.confidence - a.confidence);

        processedStudents.push({
          ...student,
          hasDuplicates: duplicates.length > 0,
          duplicates: duplicates,
          requiresUserDecision: duplicates.length > 0,
          duplicateType: 'student',
        });
      }

      const studentsWithDuplicates = processedStudents.filter(s => s.hasDuplicates).length;
      console.log(
        `[重複檢查] 👥 學生檢查完成: ${studentsWithDuplicates}/${students.length} 名學生有重複`
      );

      return processedStudents;
    } catch (error) {
      console.error('[重複檢查] ❌ 學生重複檢查失敗:', error);
      return students.map(student => ({ ...student, hasDuplicates: false, duplicates: [] }));
    }
  },

  /**
   * Calculate string similarity using Levenshtein distance
   */
  calculateStringSimilarity: (str1, str2) => {
    if (str1 === str2) return 1.0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = IdentityResolution.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  },

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance: (str1, str2) => {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  },

  /**
   * Generate duplicate summary for UI display
   */
  generateDuplicateSummary: duplicateResults => {
    const schoolDuplicates = duplicateResults.filter(school => school.hasDuplicates).length;
    const studentDuplicates = duplicateResults.reduce((count, school) => {
      return count + (school.students?.filter(student => student.hasDuplicates).length || 0);
    }, 0);

    const requiresUserAction = schoolDuplicates > 0 || studentDuplicates > 0;

    return {
      schoolDuplicates,
      studentDuplicates,
      totalDuplicates: schoolDuplicates + studentDuplicates,
      requiresUserAction,
      schoolsRequiringConfirmation: duplicateResults.filter(school => school.confirmationRequired)
        .length,
      summary: `發現 ${schoolDuplicates} 所重複學校，${studentDuplicates} 名重複學生`,
    };
  },

  /**
   * NEW: Validate that all duplicate resolutions are complete
   */
  validateResolutions: (duplicateResults, userDecisions = {}) => {
    console.log('[重複檢查] ✅ 驗證重複解決方案');

    const unresolved = {
      schools: [],
      students: [],
    };

    for (const school of duplicateResults) {
      // Check school-level duplicates
      if (school.hasDuplicates && school.duplicateType === 'school') {
        const schoolKey = `school_${school.name}_${school.schoolType}`;
        if (!userDecisions[schoolKey]) {
          unresolved.schools.push({
            name: school.name,
            type: 'school',
            key: schoolKey,
          });
        }
      }

      // Check student-level duplicates
      if (school.students) {
        for (const student of school.students) {
          if (student.hasDuplicates && student.duplicateType === 'student') {
            const studentKey = `student_${school.name}_${student.name}_${student.grade}_${student.class}`;
            if (!userDecisions[studentKey]) {
              unresolved.students.push({
                name: student.name,
                school: school.name,
                type: 'student',
                key: studentKey,
              });
            }
          }
        }
      }
    }

    const isValid = unresolved.schools.length === 0 && unresolved.students.length === 0;

    console.log(`[重複檢查] 📊 解決方案驗證: ${isValid ? '✅ 完成' : '⚠️ 未完成'}`);
    console.log(
      `[重複檢查] 📊 未解決: 學校 ${unresolved.schools.length}, 學生 ${unresolved.students.length}`
    );

    if (unresolved.schools.length > 0) {
      console.log(
        '[重複檢查] 🏫 未解決學校:',
        unresolved.schools.map(s => s.name)
      );
    }
    if (unresolved.students.length > 0) {
      console.log(
        '[重複檢查] 👥 未解決學生:',
        unresolved.students.map(s => `${s.name} (${s.school})`)
      );
    }

    return {
      isValid,
      unresolved,
      totalUnresolved: unresolved.schools.length + unresolved.students.length,
    };
  },

  /**
   * NEW: Apply user decisions to resolve duplicates
   */
  resolveSchoolDuplicates: (schools, userDecisions) => {
    console.log('[重複檢查] 🔧 應用學校重複解決方案');

    return schools.map(school => {
      if (school.hasDuplicates && school.duplicateType === 'school') {
        const schoolKey = `school_${school.name}_${school.schoolType}`;
        const decision = userDecisions[schoolKey];

        if (decision) {
          console.log(`[重複檢查] 📝 學校決定: ${school.name} -> ${decision.action}`);

          return {
            ...school,
            duplicateResolution: decision.action,
            useExistingSchool: decision.action === 'use_existing',
            existingSchoolId: decision.action === 'use_existing' ? decision.existingId : null,
            updateExistingData: decision.updateData || false,
            skipImport: decision.action === 'skip',
          };
        }
      }
      return school;
    });
  },

  /**
   * NEW: Apply user decisions to resolve student duplicates
   */
  resolveStudentDuplicates: (schools, userDecisions) => {
    console.log('[重複檢查] 🔧 應用學生重複解決方案');

    return schools.map(school => ({
      ...school,
      students:
        school.students?.map(student => {
          if (student.hasDuplicates && student.duplicateType === 'student') {
            const studentKey = `student_${school.name}_${student.name}_${student.grade}_${student.class}`;
            const decision = userDecisions[studentKey];

            if (decision) {
              console.log(`[重複檢查] 📝 學生決定: ${student.name} -> ${decision.action}`);

              return {
                ...student,
                duplicateResolution: decision.action,
                mergeWithStudentId: decision.action === 'merge' ? decision.existingId : null,
                skipImport: decision.action === 'skip',
                updateExistingData: decision.updateData || false,
              };
            }
          }
          return student;
        }) || [],
    }));
  },

  /**
   * NEW: Check if school confirmation is required
   */
  isSchoolConfirmationRequired: school => {
    // School has duplicates
    if (school.hasDuplicates) return true;

    // School has students with duplicates
    if (school.students && school.students.some(s => s.hasDuplicates)) return true;

    // School has validation warnings
    if (school.validation && school.validation.hasWarnings) return true;

    return false;
  },

  /**
   * NEW: Mark school as confirmed
   */
  confirmSchool: (schools, schoolIndex) => {
    console.log(`[重複檢查] ✅ 確認學校: ${schools[schoolIndex]?.name}`);

    return schools.map((school, index) => {
      if (index === schoolIndex) {
        return {
          ...school,
          isConfirmed: true,
          confirmationTimestamp: new Date().toISOString(),
        };
      }
      return school;
    });
  },

  /**
   * NEW: Check if all schools are confirmed
   */
  areAllSchoolsConfirmed: schools => {
    const schoolsRequiringConfirmation = schools.filter(school =>
      IdentityResolution.isSchoolConfirmationRequired(school)
    );

    const confirmedSchools = schoolsRequiringConfirmation.filter(school => school.isConfirmed);

    const allConfirmed = schoolsRequiringConfirmation.length === confirmedSchools.length;

    console.log(
      `[重複檢查] 📊 學校確認狀態: ${confirmedSchools.length}/${schoolsRequiringConfirmation.length} 已確認`
    );

    return {
      allConfirmed,
      totalRequiringConfirmation: schoolsRequiringConfirmation.length,
      totalConfirmed: confirmedSchools.length,
      remainingSchools: schoolsRequiringConfirmation.length - confirmedSchools.length,
    };
  },
};

export default IdentityResolution;
