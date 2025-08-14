const mongoose = require("mongoose");

const startingPaperTitleSchema = new mongoose.Schema({
  paperTytle: { type: String, required: true, trim: true },
  paperNumber: { type: Number, required: true },
  createBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.model("StartingPaperTitle", startingPaperTitleSchema);
