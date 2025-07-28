const TeacherGuideFeedBack = require("../models/TeacherGuideFeedBack");
const mongoose = require("mongoose");

exports.create = async (req, res) => {
  try {
    const doc = await TeacherGuideFeedBack.create({
      teacherGuideId: req.body.teacherGuideId,
      studentId: req.user?.userId || req.body.studentId,
      studentFeedback: req.body.studentFeedback
    });
    res.status(201).json(doc);
  } catch (e) { res.status(500).json({ message: "Create failed", error: e.message }); }
};

exports.getAll = async (_req, res) => {
  try {
    const docs = await TeacherGuideFeedBack.find()
      .populate("teacherGuideId", "coureInfo")
      .populate("studentId", "username email");
    res.json(docs);
  } catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const doc = await TeacherGuideFeedBack.findById(req.params.id)
      .populate("teacherGuideId", "coureInfo")
      .populate("studentId", "username email");
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.remove = async (req, res) => {
  try {
    const doc = await TeacherGuideFeedBack.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Delete failed", error: e.message }); }
};


exports.getByTeacherGuideId = async (req, res) => {
  const { teacherGuideId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(teacherGuideId)) {
    return res.status(400).json({ message: "Invalid teacherGuideId" });
  }

  try {
    const docs = await TeacherGuideFeedBack.find({ teacherGuideId })
      .populate("teacherGuideId")
      .populate("studentId", "username email")
      .sort({ createdAt: -1 });

    // Return an array (possibly empty) for consistency with getAll
    res.json(docs);
  } catch (e) {
    res.status(500).json({ message: "Fetch failed", error: e.message });
  }
};