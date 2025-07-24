const mongoose = require("mongoose");

const auditoryLearningSchema = new mongoose.Schema({
  teacherGuideId: { type: mongoose.Schema.Types.ObjectId, ref: "TeacherGuide", required: true },
  AudioUrl: { type: String, required: true },
  title: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("AuditoryLearning", auditoryLearningSchema);
