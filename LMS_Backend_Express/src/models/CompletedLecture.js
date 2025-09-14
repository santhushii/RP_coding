const mongoose = require("mongoose");

const completedLectureSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lectureId: { type: String, required: true, trim: true },
    lectureType: { type: String, required: true, trim: true },
    completedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

completedLectureSchema.index({ userId: 1, lectureId: 1, lectureType: 1 }, { unique: true });

module.exports = mongoose.model("CompletedLecture", completedLectureSchema);
