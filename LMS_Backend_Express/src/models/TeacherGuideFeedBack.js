const mongoose = require("mongoose");

const teacherGuideFeedBackSchema = new mongoose.Schema({
  teacherGuideId: { type: mongoose.Schema.Types.ObjectId, ref: "TeacherGuide", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  studentFeedback: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("TeacherGuideFeedBack", teacherGuideFeedBackSchema);
