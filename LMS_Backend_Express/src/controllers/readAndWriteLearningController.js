const ReadAndWriteLearning = require("../models/ReadAndWriteLearning");

exports.create = async (req, res) => {
  try {
    const doc = await ReadAndWriteLearning.create({
      paperTytle: req.body.paperTytle,
      Description: req.body.Description,
      teacherguideId: req.body.teacherguideId
    });
    res.status(201).json(doc);
  } catch (e) { res.status(500).json({ message: "Create failed", error: e.message }); }
};

exports.getAll = async (_req, res) => {
  try { res.json(await ReadAndWriteLearning.find().populate("teacherguideId", "coureInfo")); }
  catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const doc = await ReadAndWriteLearning.findById(req.params.id).populate("teacherguideId", "coureInfo");
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const { paperTytle, Description, teacherguideId } = req.body;
    const doc = await ReadAndWriteLearning.findByIdAndUpdate(
      req.params.id, { paperTytle, Description, teacherguideId }, { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Update failed", error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const doc = await ReadAndWriteLearning.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Delete failed", error: e.message }); }
};
