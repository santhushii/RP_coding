const TeacherGuide = require("../models/TeacherGuide");

exports.create = async (req, res) => {
  try {
    const doc = await TeacherGuide.create({
      coureInfo: req.body.coureInfo,
      originalTeacherGuide: req.body.originalTeacherGuide,
      createBy: req.user?.userId || req.body.createBy
    });
    res.status(201).json(doc);
  } catch (e) { res.status(500).json({ message: "Create failed", error: e.message }); }
};

exports.getAll = async (_req, res) => {
  try { res.json(await TeacherGuide.find().populate("createBy", "username email")); }
  catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const doc = await TeacherGuide.findById(req.params.id).populate("createBy", "username email");
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.update = async (req, res) => {
  try {
    const { coureInfo, originalTeacherGuide } = req.body;
    const doc = await TeacherGuide.findByIdAndUpdate(
      req.params.id, { coureInfo, originalTeacherGuide }, { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Update failed", error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const doc = await TeacherGuide.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Delete failed", error: e.message }); }
};
