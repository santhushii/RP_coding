const mongoose = require("mongoose");

const pythonPapersSchema = new mongoose.Schema({
  paperTytle: { type: String, required: true, trim: true },
  paperDifficulty: { type: String, trim: true },
  teacherGuideId: { type: mongoose.Schema.Types.ObjectId, ref: "TeacherGuide", required: true }
}, { timestamps: true });

module.exports = mongoose.model("PythonPapers", pythonPapersSchema);
