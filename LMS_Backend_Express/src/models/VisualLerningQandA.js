const mongoose = require("mongoose");

const visualLerningQandASchema = new mongoose.Schema({
  visualLerningId: { type: mongoose.Schema.Types.ObjectId, ref: "VisualLearning", required: true },
  questionTytle: { type: String, required: true, trim: true },
  questionAnswer: { type: String, required: true },
  topicTag: { type: String, trim: true },
  score: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("VisualLerningQandA", visualLerningQandASchema);
