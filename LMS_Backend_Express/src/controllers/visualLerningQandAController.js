const VisualLerningQandA = require("../models/VisualLerningQandA");
const mongoose = require("mongoose");

exports.create = async (req, res) => {
  try {
    const doc = await VisualLerningQandA.create({
      visualLerningId: req.body.visualLerningId,
      questionTytle: req.body.questionTytle,
      questionAnswer: req.body.questionAnswer,
      topicTag: req.body.topicTag,
      score: req.body.score ?? 0
    });
    res.status(201).json(doc);
  } catch (e) { res.status(500).json({ message: "Create failed", error: e.message }); }
};

exports.getAll = async (_req, res) => {
  try { res.json(await VisualLerningQandA.find().populate("visualLerningId")); }
  catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const doc = await VisualLerningQandA.findById(req.params.id).populate("visualLerningId");
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const { visualLerningId, questionTytle, questionAnswer, topicTag, score } = req.body;
    const doc = await VisualLerningQandA.findByIdAndUpdate(
      req.params.id, { visualLerningId, questionTytle, questionAnswer, topicTag, score }, { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Update failed", error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const doc = await VisualLerningQandA.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Delete failed", error: e.message }); }
};

exports.getByVisualLerningId = async (req, res) => {
  try {
    const { visualLerningId } = req.params;
    if (!mongoose.isValidObjectId(visualLerningId)) {
      return res.status(400).json({ message: "Invalid visualLerningId" });
    }
    const docs = await VisualLerningQandA
      .find({ visualLerningId })
      .populate("visualLerningId");
    res.json(docs);
  } catch (e) {
    res.status(500).json({ message: "Fetch failed", error: e.message });
  }
};