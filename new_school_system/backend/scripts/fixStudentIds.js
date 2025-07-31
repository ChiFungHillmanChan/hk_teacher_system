const mongoose = require('mongoose');
const Student = require('../models/Student');

(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/YOUR_DB_NAME'); // replace with your connection string

    // 1. Convert all empty string studentIds to null
    const updatedEmpty = await Student.updateMany(
      { studentId: '' },
      { $set: { studentId: null } }
    );
    console.log(`Converted ${updatedEmpty.modifiedCount} empty studentIds to null`);

    // 2. Find duplicates by (school, studentId)
    const duplicates = await Student.aggregate([
      { $match: { studentId: { $ne: null } } },
      {
        $group: {
          _id: { school: '$school', studentId: '$studentId' },
          ids: { $push: '$_id' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]);

    if (duplicates.length) {
      console.log('Found duplicates:');
      for (const dup of duplicates) {
        console.log(
          `School: ${dup._id.school}, StudentID: ${dup._id.studentId}, Count: ${dup.count}`
        );
        // Keep first student, nullify studentId for others
        const [keep, ...remove] = dup.ids;
        await Student.updateMany(
          { _id: { $in: remove } },
          { $set: { studentId: null } }
        );
      }
    } else {
      console.log('No duplicates found.');
    }

    console.log('Student IDs cleaned up.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
})();
