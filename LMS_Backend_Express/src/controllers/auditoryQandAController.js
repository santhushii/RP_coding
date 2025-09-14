const AuditoryQandA = require("../models/AuditoryQandA");
const mongoose = require("mongoose");

exports.create = async (req, res) => {
  try {
    const doc = await AuditoryQandA.create({
      AuditoryLearningId: req.body.AuditoryLearningId,
      questionTytle: req.body.questionTytle,
      questionAnswer: req.body.questionAnswer,
      topicTag: req.body.topicTag,
      score: req.body.score ?? 0
    });
    res.status(201).json(doc);
  } catch (e) { res.status(500).json({ message: "Create failed", error: e.message }); }
};

exports.getAll = async (_req, res) => {
  try { res.json(await AuditoryQandA.find().populate("AuditoryLearningId")); }
  catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const doc = await AuditoryQandA.findById(req.params.id).populate("AuditoryLearningId");
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const { AuditoryLearningId, questionTytle, questionAnswer, topicTag, score } = req.body;
    const doc = await AuditoryQandA.findByIdAndUpdate(
      req.params.id, { AuditoryLearningId, questionTytle, questionAnswer, topicTag, score }, { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Update failed", error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const doc = await AuditoryQandA.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Delete failed", error: e.message }); }
};

exports.getByAuditoryLearningId = async (req, res) => {
  try {
    const { auditoryLearningId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(auditoryLearningId)) {
      return res.status(400).json({ message: "Invalid AuditoryLearningId" });
    }

    // Optional pagination: /by-learning/:auditoryLearningId?page=1&limit=20
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "20", 10), 1);
    const skip = (page - 1) * limit;

    const filter = { AuditoryLearningId: auditoryLearningId };

    const [items, total] = await Promise.all([
      AuditoryQandA.find(filter)
        .populate("AuditoryLearningId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditoryQandA.countDocuments(filter),
    ]);

    res.json({
      total,
      page,
      pageSize: limit,
      items,
    });
  } catch (e) {
    res.status(500).json({ message: "Fetch failed", error: e.message });
  }
};
