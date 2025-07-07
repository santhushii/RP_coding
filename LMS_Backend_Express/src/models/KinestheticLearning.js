const mongoose = require("mongoose");

const kinestheticLearningSchema = new mongoose.Schema({
  TeacherGuideId: { type: mongoose.Schema.Types.ObjectId, ref: "TeacherGuide", required: true },
  Question: { type: String, required: true },
  Instructuion: { type: String },
  answer: { type: String, required: true },
  title: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("KinestheticLearning", kinestheticLearningSchema);
