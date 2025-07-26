const KinestheticLearning = require("../models/KinestheticLearning");

exports.create = async (req, res) => {
  try {
    const doc = await KinestheticLearning.create({
      TeacherGuideId: req.body.TeacherGuideId,
      Question: req.body.Question,
      Instructuion: req.body.Instructuion,
      answer: req.body.answer,
      title: req.body.title
    });
    res.status(201).json(doc);
  } catch (e) { res.status(500).json({ message: "Create failed", error: e.message }); }
};

exports.getAll = async (_req, res) => {
  try { res.json(await KinestheticLearning.find().populate("TeacherGuideId", "coureInfo")); }
  catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const doc = await KinestheticLearning.findById(req.params.id).populate("TeacherGuideId", "coureInfo");
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const { TeacherGuideId, Question, Instructuion, answer, title } = req.body;
    const doc = await KinestheticLearning.findByIdAndUpdate(
      req.params.id, { TeacherGuideId, Question, Instructuion, answer, title }, { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Update failed", error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const doc = await KinestheticLearning.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Delete failed", error: e.message }); }
};
