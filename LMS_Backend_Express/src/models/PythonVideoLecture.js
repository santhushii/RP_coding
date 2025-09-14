const mongoose = require("mongoose");

const pythonVideoLectureSchema = new mongoose.Schema({
  lectureType: { type: Number, enum: [1, 2, 3], required: true }, // 1=video, 2=no video, 3=material only
  lectureTytle: { type: String, required: true, trim: true },
  lectureDifficulty: { type: String, trim: true },
  teacherGuideId: { type: mongoose.Schema.Types.ObjectId, ref: "TeacherGuide", required: true },
  videoUrl: { type: String, default: null },
  description: { type: String },
  pdfMaterials: { type: [String], default: [] }, // allow multiple PDFs
  createby: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.model("PythonVideoLecture", pythonVideoLectureSchema);
