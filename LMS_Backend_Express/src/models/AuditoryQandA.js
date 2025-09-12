const mongoose = require("mongoose");

const auditoryQandASchema = new mongoose.Schema({
  AuditoryLearningId: { type: mongoose.Schema.Types.ObjectId, ref: "AuditoryLearning", required: true },
  questionTytle: { type: String, required: true, trim: true },
  questionAnswer: { type: String, required: true },
  topicTag: { type: String, trim: true },
  score: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("AuditoryQandA", auditoryQandASchema);
