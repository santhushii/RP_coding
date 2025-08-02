const PythonPapers = require("../models/PythonPapers");

exports.create = async (req, res) => {
  try {
    const doc = await PythonPapers.create({
      paperTytle: req.body.paperTytle,
      paperDifficulty: req.body.paperDifficulty,
      teacherGuideId: req.body.teacherGuideId
    });
    res.status(201).json(doc);
  } catch (e) { res.status(500).json({ message: "Create failed", error: e.message }); }
};

exports.getAll = async (_req, res) => {
  try { res.json(await PythonPapers.find().populate("teacherGuideId", "coureInfo")); }
  catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const doc = await PythonPapers.findById(req.params.id).populate("teacherGuideId", "coureInfo");
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const { paperTytle, paperDifficulty, teacherGuideId } = req.body;
    const doc = await PythonPapers.findByIdAndUpdate(
      req.params.id, { paperTytle, paperDifficulty, teacherGuideId }, { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Update failed", error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const doc = await PythonPapers.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Delete failed", error: e.message }); }
};
