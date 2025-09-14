const mongoose = require("mongoose");

const startingPaperQuestionSchema = new mongoose.Schema({
  paperQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: "StartingPaperTitle", required: true },
  paperQuestionTitle: { type: String, required: true, trim: true }, // the question
  paperQuestioncategory: { type: String, trim: true },
  answers: { type: [String], default: [] },                          // optional MCQ options
  correctanser: { type: String, required: true }                     // exact value (or key) of correct answer
}, { timestamps: true });

startingPaperQuestionSchema.index({ paperQuestionId: 1, createdAt: -1 });

module.exports = mongoose.model("StartingPaperQuestion", startingPaperQuestionSchema);
