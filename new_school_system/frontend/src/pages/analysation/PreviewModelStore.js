// src/pages/analysation/PreviewModelStore.js - Fixed with createModel Method
class PreviewModelStore {
  constructor() {
    console.log('[PreviewModelStore] 🔄 初始化預覽模型存儲');
    this.state = null;
    this.history = [];
    this.pointer = -1;
    this.maxHistorySize = 50;
    this.listeners = new Set();
  }

  /**
   * Create a preview model from parsed schools data
   * This is the missing method that AI_Analysis.jsx was calling
   */
  createModel(schools) {
    console.log('[PreviewModelStore] 🏗️ 創建預覽模型');

    if (!schools || !Array.isArray(schools)) {
      throw new Error('Invalid schools data provided to createModel');
    }

    // Transform schools data into preview model format
    const model = {
      schools: schools.map((school, schoolIndex) => ({
        // Basic school data
        name: school.name || '',
        schoolType: school.schoolType || 'primary',
        district: school.district || '',
        address: school.address || '',
        contactPerson: school.contactPerson || '',
        email: school.email || '',
        phone: school.phone || '',
        description: school.description || '',

        // Metadata from parsing
        metadata: school.metadata || {
          studentCount: school.students?.length || 0,
          hasGrades: school.students?.some(s => s.grade) || false,
          hasClasses: school.students?.some(s => s.class) || false,
        },

        // Identity resolution state
        hasDuplicates: false,
        duplicates: [],
        requiresUserDecision: false,
        identityDecisionResolved: false,
        identityDecision: null,
        useExistingSchool: false,
        existingSchoolId: null,
        existingSchoolData: null,
        updateExistingData: false,

        // Validation state
        validation: {
          errors: [],
          warnings: [],
          isValid: true,
          hasBlockingErrors: false,
        },

        // Confirmation state
        isConfirmed: false,

        // Students data
        students: (school.students || []).map((student, studentIndex) => ({
          // Basic student data
          name: student.name || '',
          nameEn: student.nameEn || '',
          nameCh: student.nameCh || student.name || '',
          studentId: student.studentId || '',
          grade: student.grade || '',
          class: student.class || '',
          classNumber: student.classNumber || null,
          gender: student.gender || 'other',
          dateOfBirth: student.dateOfBirth || null,
          phone: student.phone || '',
          email: student.email || '',
          address: student.address || '',
          parentContact: student.parentContact || '',
          emergencyContact: student.emergencyContact || '',
          notes: student.notes || '',

          // Metadata
          rawRowNumber: student.rawRowNumber || studentIndex + 2,

          // Duplicate resolution state
          hasDuplicates: false,
          duplicates: [],
          requiresUserDecision: false,
          duplicateResolution: null,
          mergeWithStudentId: null,
          skipImport: false,

          // Validation state
          validation: {
            errors: [],
            warnings: [],
            isValid: true,
            hasBlockingErrors: false,
          },
        })),
      })),

      // Model metadata
      metadata: {
        totalSchools: schools.length,
        totalStudents: schools.reduce((total, school) => total + (school.students?.length || 0), 0),
        createdAt: new Date().toISOString(),
        source: 'excel_parser',
        version: '1.0',
      },

      // Processing state
      processing: {
        currentStage: 'created',
        stagesCompleted: ['parsing'],
        stagesPending: ['identity_resolution', 'validation', 'confirmation'],
      },
    };

    console.log(
      `[PreviewModelStore] ✅ 模型創建完成 - ${model.schools.length} 所學校，${model.metadata.totalStudents} 名學生`
    );

    // Store the model
    this.setState(model);

    return model;
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  /**
   * Set new state and add to history
   */
  setState(newState) {
    if (newState === null) {
      this.state = null;
      this.history = [];
      this.pointer = -1;
      this.notifyListeners();
      console.log('[PreviewModelStore] 🗑️ 清空狀態');
      return;
    }

    // Truncate history if we're not at the end
    this.history = this.history.slice(0, this.pointer + 1);

    // Add new state
    this.history.push(JSON.parse(JSON.stringify(newState))); // Deep clone
    this.pointer++;

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.pointer--;
    }

    this.state = newState;
    this.notifyListeners();

    console.log('[PreviewModelStore] 💾 狀態已保存', {
      schools: newState.schools?.length || 0,
      historySize: this.history.length,
    });
  }

  /**
   * Update processing stage
   */
  updateProcessingStage(stage) {
    if (!this.state) return false;

    const newState = JSON.parse(JSON.stringify(this.state));
    newState.processing.currentStage = stage;

    // Update completed/pending stages
    const allStages = ['parsing', 'identity_resolution', 'validation', 'confirmation', 'import'];
    const currentIndex = allStages.indexOf(stage);

    if (currentIndex !== -1) {
      newState.processing.stagesCompleted = allStages.slice(0, currentIndex + 1);
      newState.processing.stagesPending = allStages.slice(currentIndex + 1);
    }

    this.setState(newState);
    console.log(`[PreviewModelStore] 📊 處理階段更新: ${stage}`);
    return true;
  }

  /**
   * Undo last change
   */
  undo() {
    if (this.canUndo()) {
      this.pointer--;
      this.state = JSON.parse(JSON.stringify(this.history[this.pointer]));
      this.notifyListeners();
      console.log('[PreviewModelStore] ↶ 撤銷操作');
      return true;
    }
    return false;
  }

  /**
   * Redo last undone change
   */
  redo() {
    if (this.canRedo()) {
      this.pointer++;
      this.state = JSON.parse(JSON.stringify(this.history[this.pointer]));
      this.notifyListeners();
      console.log('[PreviewModelStore] ↷ 重做操作');
      return true;
    }
    return false;
  }

  /**
   * Check if undo is possible
   */
  canUndo() {
    return this.pointer > 0;
  }

  /**
   * Check if redo is possible
   */
  canRedo() {
    return this.pointer < this.history.length - 1;
  }

  /**
   * Update a specific school
   */
  updateSchool(schoolIndex, updates) {
    if (!this.state || !this.state.schools[schoolIndex]) {
      console.warn('[PreviewModelStore] ⚠️ 無效的學校索引:', schoolIndex);
      return false;
    }

    const newState = JSON.parse(JSON.stringify(this.state));
    newState.schools[schoolIndex] = {
      ...newState.schools[schoolIndex],
      ...updates,
    };

    this.setState(newState);
    console.log(`[PreviewModelStore] 🏫 更新學校 ${schoolIndex}:`, Object.keys(updates));
    return true;
  }

  /**
   * Update a specific student
   */
  updateStudent(schoolIndex, studentIndex, updates) {
    if (
      !this.state ||
      !this.state.schools[schoolIndex] ||
      !this.state.schools[schoolIndex].students[studentIndex]
    ) {
      console.warn('[PreviewModelStore] ⚠️ 無效的學生索引:', { schoolIndex, studentIndex });
      return false;
    }

    const newState = JSON.parse(JSON.stringify(this.state));
    newState.schools[schoolIndex].students[studentIndex] = {
      ...newState.schools[schoolIndex].students[studentIndex],
      ...updates,
    };

    this.setState(newState);
    console.log(
      `[PreviewModelStore] 👤 更新學生 ${schoolIndex}-${studentIndex}:`,
      Object.keys(updates)
    );
    return true;
  }

  /**
   * Remove a student
   */
  removeStudent(schoolIndex, studentIndex) {
    if (
      !this.state ||
      !this.state.schools[schoolIndex] ||
      !this.state.schools[schoolIndex].students[studentIndex]
    ) {
      console.warn('[PreviewModelStore] ⚠️ 無效的學生索引:', { schoolIndex, studentIndex });
      return false;
    }

    const newState = JSON.parse(JSON.stringify(this.state));
    newState.schools[schoolIndex].students.splice(studentIndex, 1);

    this.setState(newState);
    console.log(`[PreviewModelStore] 🗑️ 移除學生 ${schoolIndex}-${studentIndex}`);
    return true;
  }

  /**
   * Add a new student to a school
   */
  addStudent(schoolIndex, studentData) {
    if (!this.state || !this.state.schools[schoolIndex]) {
      console.warn('[PreviewModelStore] ⚠️ 無效的學校索引:', schoolIndex);
      return false;
    }

    const newState = JSON.parse(JSON.stringify(this.state));
    const newStudent = {
      name: '',
      grade: '',
      class: '',
      ...studentData,
      validation: { errors: [], warnings: [], isValid: false },
      hasDuplicates: false,
      duplicates: [],
      requiresUserDecision: false,
      duplicateResolution: null,
    };

    newState.schools[schoolIndex].students.push(newStudent);

    this.setState(newState);
    console.log(`[PreviewModelStore] ➕ 新增學生到學校 ${schoolIndex}`);
    return true;
  }

  /**
   * Confirm a school (mark as ready for import)
   */
  confirmSchool(schoolIndex, confirmed = true) {
    return this.updateSchool(schoolIndex, { isConfirmed: confirmed });
  }

  /**
   * Resolve school identity decision
   */
  resolveSchoolIdentity(schoolIndex, decision) {
    const updates = {
      identityDecisionResolved: true,
      identityDecision: decision,
    };

    switch (decision) {
      case 'reuse':
        updates.useExistingSchool = true;
        break;
      case 'create_new':
        updates.useExistingSchool = false;
        updates.existingSchoolId = null;
        updates.existingSchoolData = null;
        break;
      case 'update_existing':
        updates.useExistingSchool = true;
        updates.updateExistingData = true;
        break;
    }

    return this.updateSchool(schoolIndex, updates);
  }

  /**
   * Resolve student duplicate
   */
  resolveStudentDuplicate(schoolIndex, studentIndex, resolution) {
    const updates = {
      duplicateResolution: resolution,
    };

    return this.updateStudent(schoolIndex, studentIndex, updates);
  }

  /**
   * Batch update multiple items
   */
  batchUpdate(updates) {
    if (!this.state) return false;

    const newState = JSON.parse(JSON.stringify(this.state));

    updates.forEach(update => {
      const { type, schoolIndex, studentIndex, data } = update;

      switch (type) {
        case 'school':
          if (newState.schools[schoolIndex]) {
            newState.schools[schoolIndex] = {
              ...newState.schools[schoolIndex],
              ...data,
            };
          }
          break;

        case 'student':
          if (
            newState.schools[schoolIndex] &&
            newState.schools[schoolIndex].students[studentIndex]
          ) {
            newState.schools[schoolIndex].students[studentIndex] = {
              ...newState.schools[schoolIndex].students[studentIndex],
              ...data,
            };
          }
          break;
      }
    });

    this.setState(newState);
    console.log(`[PreviewModelStore] 🔄 批量更新 ${updates.length} 項`);
    return true;
  }

  /**
   * Get validation summary
   */
  getValidationSummary() {
    if (!this.state) return null;

    const schools = this.state.schools || [];
    const totalSchools = schools.length;
    const confirmedSchools = schools.filter(s => s.isConfirmed).length;
    const schoolsWithErrors = schools.filter(s => s.validation?.hasBlockingErrors).length;

    const totalStudents = schools.reduce(
      (total, school) => total + (school.students?.length || 0),
      0
    );

    const studentsWithErrors = schools.reduce(
      (total, school) =>
        total + (school.students?.filter(s => s.validation?.hasBlockingErrors)?.length || 0),
      0
    );

    const totalErrors = schools.reduce((total, school) => {
      const schoolErrors = school.validation?.errors?.length || 0;
      const studentErrors =
        school.students?.reduce(
          (subtotal, student) => subtotal + (student.validation?.errors?.length || 0),
          0
        ) || 0;
      return total + schoolErrors + studentErrors;
    }, 0);

    const totalWarnings = schools.reduce((total, school) => {
      const schoolWarnings = school.validation?.warnings?.length || 0;
      const studentWarnings =
        school.students?.reduce(
          (subtotal, student) => subtotal + (student.validation?.warnings?.length || 0),
          0
        ) || 0;
      return total + schoolWarnings + studentWarnings;
    }, 0);

    return {
      totalSchools,
      confirmedSchools,
      schoolsWithErrors,
      totalStudents,
      studentsWithErrors,
      totalErrors,
      totalWarnings,
      canProceedToImport: totalErrors === 0 && confirmedSchools === totalSchools,
      progressPercentage:
        totalSchools > 0 ? Math.round((confirmedSchools / totalSchools) * 100) : 0,
    };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('[PreviewModelStore] ❌ Listener error:', error);
      }
    });
  }

  /**
   * Export state for debugging
   */
  exportState() {
    return {
      state: this.state,
      historySize: this.history.length,
      pointer: this.pointer,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.setState(null);
  }

  /**
   * Get schools that need attention
   */
  getSchoolsNeedingAttention() {
    if (!this.state) return [];

    return this.state.schools
      .map((school, index) => ({ school, index }))
      .filter(
        ({ school }) =>
          !school.identityDecisionResolved ||
          school.validation?.hasBlockingErrors ||
          !school.isConfirmed
      );
  }

  /**
   * Get students with duplicate issues
   */
  getStudentsWithDuplicates() {
    if (!this.state) return [];

    const duplicates = [];

    this.state.schools.forEach((school, schoolIndex) => {
      school.students?.forEach((student, studentIndex) => {
        if (student.hasDuplicates && student.requiresUserDecision) {
          duplicates.push({
            schoolIndex,
            studentIndex,
            student,
            school: school.name,
          });
        }
      });
    });

    return duplicates;
  }

  /**
   * Auto-fix common issues
   */
  autoFix() {
    if (!this.state) return false;

    const newState = JSON.parse(JSON.stringify(this.state));
    let changesMade = false;

    newState.schools.forEach(school => {
      school.students?.forEach(student => {
        // Auto-fix missing gender
        if (!student.gender) {
          student.gender = 'other';
          changesMade = true;
        }

        // Auto-resolve low-confidence duplicates
        if (
          student.hasDuplicates &&
          student.requiresUserDecision &&
          student.duplicates &&
          student.duplicates.every(duplicate => duplicate.confidence < 0.7)
        ) {
          student.duplicateResolution = 'create_new';
          student.requiresUserDecision = false;
          changesMade = true;
        }
      });
    });

    if (changesMade) {
      this.setState(newState);
      console.log('[PreviewModelStore] 🔧 執行自動修復');
    }

    return changesMade;
  }
}

// Create singleton instance
const previewModelStore = new PreviewModelStore();

export default previewModelStore;
