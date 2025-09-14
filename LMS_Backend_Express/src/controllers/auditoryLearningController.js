const multer = require("multer");
const { uploadBuffer } = require("../utils/cloudinaryUpload");
const AuditoryLearning = require("../models/AuditoryLearning");

const upload = multer({ storage: multer.memoryStorage() }).single("audio");

exports.create = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: "Upload error", error: err.message });
    try {
      const uploaded = req.file
        ? await uploadBuffer(req.file, { folder: "auditory/learning", resourceType: "video" })
        : null;

      const doc = await AuditoryLearning.create({
        teacherGuideId: req.body.teacherGuideId,
        AudioUrl: uploaded?.url || null,
        title: req.body.title
      });
      res.status(201).json(doc);
    } catch (e) { res.status(500).json({ message: "Create failed", error: e.message }); }
  });
};

exports.getAll = async (_req, res) => {
  try { res.json(await AuditoryLearning.find().populate("teacherGuideId", "coureInfo")); }
  catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const doc = await AuditoryLearning.findById(req.params.id).populate("teacherGuideId", "coureInfo");
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.update = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: "Upload error", error: err.message });
    try {
      const existing = await AuditoryLearning.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: "Not found" });
      let AudioUrl = existing.AudioUrl;
      if (req.file) {
        AudioUrl = await uploadBuffer(req.file, { folder: "auditory/learning", resourceType: "video" });
      }
      const updated = await AuditoryLearning.findByIdAndUpdate(
        req.params.id, { 
          teacherGuideId: req.body.teacherGuideId ?? existing.teacherGuideId, 
          AudioUrl,
          title: req.body.title ?? existing.title, 
        }, { new: true }
      );
      res.json(updated);
    } catch (e) { res.status(500).json({ message: "Update failed", error: e.message }); }
  });
};

exports.remove = async (req, res) => {
  try {
    const doc = await AuditoryLearning.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Delete failed", error: e.message }); }
};
