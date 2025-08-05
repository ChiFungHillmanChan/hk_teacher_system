// src/pages/analysation/AIHelper.js - Fixed Version
const AIHelper = {
  cache: new Map(),
  cacheTimeout: 30 * 60 * 1000, // 30 minutes

  /**
   * Parse document using Gemini 1.5 Flash for PDF/Word analysis
   * @param {File} file - The uploaded document file
   * @returns {Promise<Object>} Parsed document data
   */
  parseDocument: async file => {
    console.log('[AIHelper] 📄 開始解析文件:', file.name);

    // This would integrate with the existing AI analysis endpoint
    // For now, return a placeholder structure
    const mockResult = {
      schools: [
        {
          name: '從PDF提取的學校',
          schoolType: 'primary',
          students: [],
        },
      ],
      students: [
        {
          name: '從PDF提取的學生',
          grade: 'P1',
          class: '1A',
          confidence: 0.85,
        },
      ],
    };

    console.log('[AIHelper] ✅ 文件解析完成');
    return mockResult;
  },

  /**
   * Disambiguate headers using Gemini
   * @param {Array} headers - Array of ambiguous headers
   * @returns {Promise<Object>} Header mapping suggestions
   */
  disambiguateHeader: async headers => {
    const cacheKey = `headers_${headers.join('|')}`;

    // Check cache first
    if (AIHelper.cache.has(cacheKey)) {
      const cached = AIHelper.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < AIHelper.cacheTimeout) {
        console.log('[AIHelper] 💾 使用快取的標題映射');
        return cached.data;
      }
    }

    console.log('[AIHelper] 🧠 請求AI解釋標題:', headers);

    try {
      // Mock Gemini call for header disambiguation
      const prompt = `
請幫我映射這些Excel標題到標準欄位：
標題: ${headers.join(', ')}

標準欄位包括：
- 姓名 (學生姓名)
- 英文姓名 (英文名字)
- 年級 (P1-P6, S1-S6)
- 班別 (班級)
- 班內號碼 (座號)
- 學校 (學校名稱)
- 學校類別 (小學/中學)
- 性別
- 電話
- 電郵
- 地址

請返回JSON格式的映射建議。
      `;

      // Simulate AI response with better mapping logic
      const mockResponse = {
        mappings: {},
        confidence: 0.85,
        suggestions: ['建議檢查標題是否完整', '可能需要手動調整映射'],
      };

      // Process each header
      headers.forEach((header, index) => {
        if (!header || header.trim() === '') {
          mockResponse.mappings[header] = {
            standardField: '未知',
            confidence: 0,
            reasoning: '空白標題',
          };
          return;
        }

        // Simple mapping logic for demonstration
        const normalized = header.toLowerCase().trim();
        let standardField = null;
        let confidence = 0.1;
        let reasoning = `無法確定 "${header}" 的對應欄位`;

        // Enhanced mapping logic
        if (normalized.includes('姓名') || normalized.includes('name') || normalized === '名字') {
          standardField = '姓名';
          confidence = 0.95;
          reasoning = `"${header}" 明顯對應到學生姓名`;
        } else if (
          normalized.includes('英文') &&
          (normalized.includes('姓名') || normalized.includes('名'))
        ) {
          standardField = '英文姓名';
          confidence = 0.9;
          reasoning = `"${header}" 對應到英文姓名`;
        } else if (
          normalized.includes('年級') ||
          normalized.includes('grade') ||
          normalized.includes('級別')
        ) {
          standardField = '年級';
          confidence = 0.9;
          reasoning = `"${header}" 對應到年級`;
        } else if (
          normalized.includes('班別') ||
          normalized.includes('班級') ||
          normalized === 'class'
        ) {
          standardField = '班別';
          confidence = 0.85;
          reasoning = `"${header}" 對應到班別`;
        } else if (
          normalized.includes('班內') ||
          normalized.includes('座號') ||
          normalized.includes('學號') ||
          normalized.includes('號碼')
        ) {
          standardField = '班內號碼';
          confidence = 0.8;
          reasoning = `"${header}" 對應到班內號碼`;
        } else if (
          normalized.includes('學校') ||
          normalized.includes('school') ||
          normalized.includes('校名')
        ) {
          standardField = '學校';
          confidence = 0.9;
          reasoning = `"${header}" 對應到學校`;
        } else if (
          normalized.includes('類別') ||
          normalized.includes('類型') ||
          normalized.includes('type')
        ) {
          standardField = '學校類別';
          confidence = 0.8;
          reasoning = `"${header}" 對應到學校類別`;
        } else if (
          normalized.includes('性別') ||
          normalized.includes('gender') ||
          normalized.includes('sex')
        ) {
          standardField = '性別';
          confidence = 0.9;
          reasoning = `"${header}" 對應到性別`;
        } else if (
          normalized.includes('電話') ||
          normalized.includes('phone') ||
          normalized.includes('聯絡')
        ) {
          standardField = '電話';
          confidence = 0.85;
          reasoning = `"${header}" 對應到電話`;
        } else if (
          normalized.includes('電郵') ||
          normalized.includes('email') ||
          normalized.includes('mail')
        ) {
          standardField = '電郵';
          confidence = 0.9;
          reasoning = `"${header}" 對應到電郵`;
        } else if (
          normalized.includes('地址') ||
          normalized.includes('address') ||
          normalized.includes('住址')
        ) {
          standardField = '地址';
          confidence = 0.85;
          reasoning = `"${header}" 對應到地址`;
        }

        mockResponse.mappings[header] = {
          standardField: standardField || '未知',
          confidence,
          reasoning,
        };
      });

      // Calculate overall confidence
      const confidences = Object.values(mockResponse.mappings).map(m => m.confidence);
      mockResponse.confidence =
        confidences.length > 0
          ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
          : 0;

      // Cache the result
      AIHelper.cache.set(cacheKey, {
        data: mockResponse,
        timestamp: Date.now(),
      });

      console.log('[AIHelper] ✅ 標題映射完成');
      return mockResponse;
    } catch (error) {
      console.error('[AIHelper] ❌ 標題映射失敗:', error);

      // Return fallback mapping
      return {
        mappings: headers.reduce((acc, header) => {
          acc[header] = {
            standardField: '未知',
            confidence: 0,
            reasoning: '處理失敗，請手動設定',
            error: true,
          };
          return acc;
        }, {}),
        confidence: 0,
        error: error.message,
        fallback: true,
      };
    }
  },

  /**
   * Generate validation summary for a school using AI
   * @param {Object} school - School data with validation results
   * @returns {Promise<string>} Natural language validation summary
   */
  generateValidationSummary: async school => {
    const cacheKey = `validation_${school.name}_${JSON.stringify(school.validation)}`;

    // Check cache
    if (AIHelper.cache.has(cacheKey)) {
      const cached = AIHelper.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < AIHelper.cacheTimeout) {
        console.log('[AIHelper] 💾 使用快取的驗證摘要');
        return cached.data;
      }
    }

    console.log('[AIHelper] 🧠 生成驗證摘要:', school.name);

    try {
      // Simulate AI-generated validation summary
      const { errors = [], warnings = [] } = school.validation || {};
      let summary = '';

      if (errors.length === 0 && warnings.length === 0) {
        summary = `學校「${school.name}」的資料完整無誤，包含 ${
          school.students?.length || 0
        } 名學生，可以直接匯入。`;
      } else if (errors.length > 0) {
        summary = `學校「${school.name}」發現 ${errors.length} 個需要修正的問題：${errors
          .slice(0, 2)
          .join('、')}${errors.length > 2 ? '等' : ''}。`;
        if (warnings.length > 0) {
          summary += ` 另外還有 ${warnings.length} 個警告需要注意。`;
        }
      } else {
        summary = `學校「${school.name}」資料基本正確，但有 ${warnings.length} 個建議改善的地方，不影響匯入。`;
      }

      // Cache the result
      AIHelper.cache.set(cacheKey, {
        data: summary,
        timestamp: Date.now(),
      });

      console.log('[AIHelper] ✅ 驗證摘要生成完成');
      return summary;
    } catch (error) {
      console.error('[AIHelper] ❌ 驗證摘要生成失敗:', error);
      return `無法生成「${school.name}」的驗證摘要，請手動檢查。`;
    }
  },

  /**
   * Compare suspected duplicate students using AI
   * @param {Object} student1 - First student
   * @param {Object} student2 - Second student
   * @returns {Promise<Object>} Comparison result with recommendation
   */
  compareDuplicateStudents: async (student1, student2) => {
    const cacheKey = `compare_${JSON.stringify([
      student1.name,
      student2.name,
      student1.grade,
      student2.grade,
    ])}`;

    // Check cache
    if (AIHelper.cache.has(cacheKey)) {
      const cached = AIHelper.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < AIHelper.cacheTimeout) {
        console.log('[AIHelper] 💾 使用快取的學生比較');
        return cached.data;
      }
    }

    console.log('[AIHelper] 🧠 比較疑似重複學生:', student1.name, 'vs', student2.name);

    try {
      // Simulate AI comparison
      const similarities = [];
      const differences = [];
      let overallSimilarity = 0;

      // Name comparison
      if (student1.name === student2.name) {
        similarities.push('姓名完全相同');
        overallSimilarity += 0.4;
      } else if (
        student1.name &&
        student2.name &&
        AIHelper.calculateStringSimilarity(student1.name, student2.name) > 0.8
      ) {
        similarities.push('姓名非常相似');
        overallSimilarity += 0.3;
      } else {
        differences.push('姓名不同');
      }

      // Grade comparison
      if (student1.grade === student2.grade) {
        similarities.push('年級相同');
        overallSimilarity += 0.2;
      } else {
        differences.push(`年級不同 (${student1.grade} vs ${student2.grade})`);
      }

      // Class comparison
      if (student1.class && student2.class && student1.class === student2.class) {
        similarities.push('班別相同');
        overallSimilarity += 0.2;
      } else if (student1.class && student2.class) {
        differences.push(`班別不同 (${student1.class} vs ${student2.class})`);
      }

      // Class number comparison
      if (
        student1.classNumber &&
        student2.classNumber &&
        student1.classNumber === student2.classNumber
      ) {
        similarities.push('班內號碼相同');
        overallSimilarity += 0.2;
      } else if (student1.classNumber && student2.classNumber) {
        differences.push(`班內號碼不同 (${student1.classNumber} vs ${student2.classNumber})`);
      }

      // Generate recommendation
      let recommendation;
      let action;

      if (overallSimilarity >= 0.8) {
        recommendation = '極可能是同一人，建議合併記錄';
        action = 'merge';
      } else if (overallSimilarity >= 0.6) {
        recommendation = '可能是同一人，建議人工確認';
        action = 'manual_review';
      } else {
        recommendation = '可能是不同學生，建議保留兩筆記錄';
        action = 'keep_both';
      }

      const result = {
        similarity: overallSimilarity,
        similarities,
        differences,
        recommendation,
        action,
        explanation: `根據姓名、年級、班別等資訊的比較，兩名學生的相似度為 ${Math.round(
          overallSimilarity * 100
        )}%。${recommendation}。`,
      };

      // Cache the result
      AIHelper.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      console.log('[AIHelper] ✅ 學生比較完成');
      return result;
    } catch (error) {
      console.error('[AIHelper] ❌ 學生比較失敗:', error);
      return {
        similarity: 0,
        similarities: [],
        differences: [],
        recommendation: '無法比較，請手動確認',
        action: 'manual_review',
        error: error.message,
      };
    }
  },

  /**
   * Suggest fixes for edge-case grade formats
   * @param {string} rawGrade - The problematic grade string
   * @returns {Promise<Array>} Array of suggested fixes
   */
  suggestGradeFixes: async rawGrade => {
    console.log('[AIHelper] 🧠 分析年級格式:', rawGrade);

    try {
      // Simulate AI analysis of grade format
      const suggestions = [];

      if (!rawGrade || rawGrade.trim() === '') {
        return suggestions;
      }

      const grade = rawGrade.toLowerCase().trim();

      // Pattern matching with suggestions
      if (grade.match(/一年級|1年級/)) {
        suggestions.push({ value: 'P1', confidence: 0.9, reason: '一年級通常對應小一(P1)' });
      }
      if (grade.match(/二年級|2年級/)) {
        suggestions.push({ value: 'P2', confidence: 0.9, reason: '二年級通常對應小二(P2)' });
      }
      if (grade.match(/三年級|3年級/)) {
        suggestions.push({ value: 'P3', confidence: 0.9, reason: '三年級通常對應小三(P3)' });
      }
      if (grade.match(/四年級|4年級/)) {
        suggestions.push({ value: 'P4', confidence: 0.9, reason: '四年級通常對應小四(P4)' });
      }
      if (grade.match(/五年級|5年級/)) {
        suggestions.push({ value: 'P5', confidence: 0.9, reason: '五年級通常對應小五(P5)' });
      }
      if (grade.match(/六年級|6年級/)) {
        suggestions.push({ value: 'P6', confidence: 0.9, reason: '六年級通常對應小六(P6)' });
      }
      if (grade.match(/初一|中學一年級|7年級/)) {
        suggestions.push({ value: 'S1', confidence: 0.9, reason: '初一對應中一(S1)' });
      }
      if (grade.match(/初二|中學二年級|8年級/)) {
        suggestions.push({ value: 'S2', confidence: 0.9, reason: '初二對應中二(S2)' });
      }
      if (grade.match(/初三|中學三年級|9年級/)) {
        suggestions.push({ value: 'S3', confidence: 0.9, reason: '初三對應中三(S3)' });
      }
      if (grade.match(/高一|中學四年級|10年級/)) {
        suggestions.push({ value: 'S4', confidence: 0.9, reason: '高一對應中四(S4)' });
      }
      if (grade.match(/高二|中學五年級|11年級/)) {
        suggestions.push({ value: 'S5', confidence: 0.9, reason: '高二對應中五(S5)' });
      }
      if (grade.match(/高三|中學六年級|12年級/)) {
        suggestions.push({ value: 'S6', confidence: 0.9, reason: '高三對應中六(S6)' });
      }

      // Fuzzy matching
      const allGrades = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
      allGrades.forEach(standardGrade => {
        const similarity = AIHelper.calculateStringSimilarity(grade, standardGrade.toLowerCase());
        if (similarity > 0.6) {
          suggestions.push({
            value: standardGrade,
            confidence: similarity,
            reason: `與 ${standardGrade} 相似度較高`,
          });
        }
      });

      // Remove duplicates and sort by confidence
      const uniqueSuggestions = suggestions.reduce((acc, current) => {
        const existing = acc.find(item => item.value === current.value);
        if (!existing || existing.confidence < current.confidence) {
          return acc.filter(item => item.value !== current.value).concat([current]);
        }
        return acc;
      }, []);

      uniqueSuggestions.sort((a, b) => b.confidence - a.confidence);

      console.log('[AIHelper] ✅ 年級建議生成完成');
      return uniqueSuggestions.slice(0, 3); // Return top 3 suggestions
    } catch (error) {
      console.error('[AIHelper] ❌ 年級建議失敗:', error);
      return [];
    }
  },

  /**
   * Calculate string similarity (Levenshtein distance based)
   */
  calculateStringSimilarity: (str1, str2) => {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLength = Math.max(len1, len2);
    return 1 - distance / maxLength;
  },

  /**
   * Clear cache
   */
  clearCache: () => {
    AIHelper.cache.clear();
    console.log('[AIHelper] 🧹 快取已清空');
  },

  /**
   * Get cache statistics
   */
  getCacheStats: () => {
    const now = Date.now();
    const validEntries = Array.from(AIHelper.cache.values()).filter(
      entry => now - entry.timestamp < AIHelper.cacheTimeout
    );

    return {
      totalEntries: AIHelper.cache.size,
      validEntries: validEntries.length,
      expiredEntries: AIHelper.cache.size - validEntries.length,
    };
  },

  /**
   * Batch process multiple AI requests
   */
  batchProcess: async requests => {
    console.log(`[AIHelper] 🔄 批量處理 ${requests.length} 個AI請求`);

    if (!requests || requests.length === 0) {
      console.log('[AIHelper] ⚠️ 沒有請求需要處理');
      return [];
    }

    const results = [];
    const batchSize = 3; // Process 3 at a time to avoid rate limiting

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (request, batchIndex) => {
          try {
            switch (request.type) {
              case 'header_disambiguation':
                return await AIHelper.disambiguateHeader(request.headers);
              case 'validation_summary':
                return await AIHelper.generateValidationSummary(request.school);
              case 'student_comparison':
                return await AIHelper.compareDuplicateStudents(request.student1, request.student2);
              case 'grade_suggestions':
                return await AIHelper.suggestGradeFixes(request.rawGrade);
              default:
                throw new Error(`Unknown request type: ${request.type}`);
            }
          } catch (error) {
            console.error(`[AIHelper] ❌ 批次請求失敗 (${i + batchIndex}):`, error);
            throw error;
          }
        })
      );

      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[AIHelper] ✅ 批量處理完成，成功 ${successCount}/${results.length}`);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`[AIHelper] ❌ 請求 ${index} 失敗:`, result.reason);
        return {
          error: result.reason?.message || result.reason || 'Unknown error',
          index,
        };
      }
    });
  },

  /**
   * Generate sample test data for development
   */
  generateTestData: () => {
    return {
      headers: ['學生姓名', '年級', '班別', '座號', '學校名稱'],
      students: [
        { name: '張小明', grade: 'P1', class: '1A', classNumber: 5 },
        { name: '李小華', grade: 'P1', class: '1A', classNumber: 12 },
        { name: '王大成', grade: 'S1', class: '1B', classNumber: 8 },
      ],
      schools: [
        { name: '測試小學', schoolType: 'primary' },
        { name: '測試中學', schoolType: 'secondary' },
      ],
    };
  },

  /**
   * Validate AI request structure
   */
  validateRequest: request => {
    if (!request || typeof request !== 'object') {
      return { valid: false, error: 'Request must be an object' };
    }

    if (!request.type) {
      return { valid: false, error: 'Request type is required' };
    }

    const validTypes = [
      'header_disambiguation',
      'validation_summary',
      'student_comparison',
      'grade_suggestions',
    ];
    if (!validTypes.includes(request.type)) {
      return { valid: false, error: `Invalid request type: ${request.type}` };
    }

    switch (request.type) {
      case 'header_disambiguation':
        if (!Array.isArray(request.headers)) {
          return { valid: false, error: 'Headers must be an array' };
        }
        break;
      case 'validation_summary':
        if (!request.school || typeof request.school !== 'object') {
          return { valid: false, error: 'School object is required' };
        }
        break;
      case 'student_comparison':
        if (!request.student1 || !request.student2) {
          return { valid: false, error: 'Two student objects are required' };
        }
        break;
      case 'grade_suggestions':
        if (!request.rawGrade || typeof request.rawGrade !== 'string') {
          return { valid: false, error: 'Raw grade string is required' };
        }
        break;
    }

    return { valid: true };
  },
};

export default AIHelper;
