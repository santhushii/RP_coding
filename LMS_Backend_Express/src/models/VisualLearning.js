const mongoose = require("mongoose");

const visualLearningSchema = new mongoose.Schema({
  teacherGuideId: { type: mongoose.Schema.Types.ObjectId, ref: "TeacherGuide", required: true },
  videoUrl: { type: String, required: true },
  title: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("VisualLearning", visualLearningSchema);
