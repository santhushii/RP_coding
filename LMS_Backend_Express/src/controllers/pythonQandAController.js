const PythonQandA = require("../models/PythonQandA");

exports.create = async (req, res) => {
  try {
    const doc = await PythonQandA.create({
      paperId: req.body.paperId,
      questionTytle: req.body.questionTytle,
      questionAnswer: req.body.questionAnswer,
      topicTag: req.body.topicTag,
      score: req.body.score ?? 0
    });
    res.status(201).json(doc);
  } catch (e) { res.status(500).json({ message: "Create failed", error: e.message }); }
};

exports.getAll = async (_req, res) => {
  try { res.json(await PythonQandA.find().populate("paperId", "paperTytle")); }
  catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const doc = await PythonQandA.findById(req.params.id).populate("paperId", "paperTytle");
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const { questionTytle, questionAnswer, topicTag, score, paperId } = req.body;
    const doc = await PythonQandA.findByIdAndUpdate(
      req.params.id, { questionTytle, questionAnswer, topicTag, score, paperId }, { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Update failed", error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const doc = await PythonQandA.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Delete failed", error: e.message }); }
};

exports.getByPaperId = async (req, res) => {
  try {
    const { paperId } = req.params;
    const docs = await PythonQandA
      .find({ paperId })
      .populate("paperId", "paperTytle");
    res.json(docs);
  } catch (e) { res.status(500).json({ message: "Fetch by paperId failed", error: e.message }); }
};
