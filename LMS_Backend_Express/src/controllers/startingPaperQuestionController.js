// controllers/startingPaperQuestionController.js
const mongoose = require("mongoose");
const StartingPaperQuestion = require("../models/StartingPaperQuestion");

// CREATE (with basic validation)
exports.create = async (req, res) => {
  try {
    const {
      paperQuestionId,
      paperQuestionTitle,
      paperQuestioncategory,
      answers = [],
      correctanser
    } = req.body;

    if (!paperQuestionId) {
      return res.status(400).json({ message: "paperQuestionId is required" });
    }
    if (!mongoose.isValidObjectId(paperQuestionId)) {
      return res.status(400).json({ message: "Invalid paperQuestionId" });
    }
    if (!paperQuestionTitle) {
      return res.status(400).json({ message: "paperQuestionTitle is required" });
    }
    if (!correctanser) {
      return res.status(400).json({ message: "correctanser is required" });
    }
    if (Array.isArray(answers) && answers.length > 0 && !answers.includes(correctanser)) {
      return res.status(400).json({ message: "correctanser must be one of answers when answers are provided" });
    }

    const doc = await StartingPaperQuestion.create({
      paperQuestionId,
      paperQuestionTitle,
      paperQuestioncategory,
      answers,
      correctanser
    });

    res.status(201).json(doc);
  } catch (e) {
    res.status(500).json({ message: "Create failed", error: e.message });
  }
};

exports.getAll = async (_req, res) => {
  try {
    const data = await StartingPaperQuestion.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const doc = await StartingPaperQuestion.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const { paperQuestionTitle, paperQuestioncategory, answers, correctanser } = req.body;

    if (Array.isArray(answers) && answers.length > 0 && correctanser && !answers.includes(correctanser)) {
      return res.status(400).json({ message: "correctanser must be one of answers when answers are provided" });
    }

    const doc = await StartingPaperQuestion.findByIdAndUpdate(
      req.params.id,
      { paperQuestionTitle, paperQuestioncategory, answers, correctanser },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Update failed", error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const doc = await StartingPaperQuestion.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Delete failed", error: e.message }); }
};

exports.getByStartingPaperId = async (req, res) => {
  try {
    const { startingPaperId } = req.params;
    if (!mongoose.isValidObjectId(startingPaperId)) {
      return res.status(400).json({ message: "Invalid startingPaperId" });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const filter = { paperQuestionId: startingPaperId };
    const [items, total] = await Promise.all([
      StartingPaperQuestion.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      StartingPaperQuestion.countDocuments(filter)
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (e) {
    res.status(500).json({ message: "Fetch failed", error: e.message });
  }
};
