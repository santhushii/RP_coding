const multer = require("multer");
const { uploadBuffer, uploadMany } = require("../utils/cloudinaryUpload");
const PythonVideoLecture = require("../models/PythonVideoLecture");

const upload = multer({ storage: multer.memoryStorage() }).fields([
  { name: "video", maxCount: 1 },
  { name: "pdfMaterials", maxCount: 10 }
]);

exports.create = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: "Upload error", error: err.message });
    try {
      const createdBy = req.user?.userId || req.body.createby;

      let videoUrl = null;
      if (req.files?.video?.[0]) {
        videoUrl = (await uploadBuffer(req.files.video[0], {
          folder: "python/lectures",
          resourceType: "video",
          keepFilename: true
        })).url;
      }

      const pdfs = req.files?.pdfMaterials
        ? (await uploadMany(req.files.pdfMaterials, {
            folder: "python/materials",
            resourceType: "raw",
            keepFilename: true,       
            forcePdfExtension: true,  
            format: "pdf"             
          })).map(x => x.url)         
        : [];

      const doc = await PythonVideoLecture.create({
        lectureType: Number(req.body.lectureType),
        lectureTytle: req.body.lectureTytle,
        lectureDifficulty: req.body.lectureDifficulty,
        teacherGuideId: req.body.teacherGuideId,
        videoUrl,
        description: req.body.description,
        pdfMaterials: pdfs,
        createby: createdBy
      });

      res.status(201).json(doc);
    } catch (e) { res.status(500).json({ message: "Create failed", error: e.message }); }
  });
};

exports.getAll = async (_req, res) => {
  try {
    const docs = await PythonVideoLecture.find()
      .populate("teacherGuideId", "coureInfo")
      .populate("createby", "username email");
    res.json(docs);
  } catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.getById = async (req, res) => {
  try {
    const doc = await PythonVideoLecture.findById(req.params.id)
      .populate("teacherGuideId", "coureInfo")
      .populate("createby", "username email");
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

exports.update = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: "Upload error", error: err.message });

    try {
      const existing = await PythonVideoLecture.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: "Not found" });

      let keepPdfUrls = null;
      if (typeof req.body.existingPdfUrls !== 'undefined') {
        try {
          const parsed = JSON.parse(req.body.existingPdfUrls);
          if (Array.isArray(parsed)) keepPdfUrls = parsed.filter(Boolean);
          else keepPdfUrls = [];
        } catch {
          keepPdfUrls = [];
        }
      }

      let videoUrl = existing.videoUrl;
      if (req.files?.video?.[0]) {
        videoUrl = (await uploadBuffer(req.files.video[0], {
          folder: "python/lectures",
          resourceType: "video",
          keepFilename: true,
        })).url;
      }

      let newPdfUrls = [];
      if (req.files?.pdfMaterials?.length) {
        newPdfUrls = (await uploadMany(req.files.pdfMaterials, {
          folder: "python/materials",
          resourceType: "raw",
          keepFilename: true,
          forcePdfExtension: true,
          format: "pdf",
        })).map(x => x.url);
      }

      let pdfMaterials;
      if (keepPdfUrls !== null) {
        pdfMaterials = [...new Set([...(keepPdfUrls || []), ...newPdfUrls])];
      } else {
        pdfMaterials = [...(existing.pdfMaterials || []), ...newPdfUrls];
      }

      const teacherGuideId =
        req.body.teacherGuideId === ''
          ? null
          : (req.body.teacherGuideId ?? existing.teacherGuideId);

      const updated = await PythonVideoLecture.findByIdAndUpdate(
        req.params.id,
        {
          lectureType: req.body.lectureType ?? existing.lectureType,
          lectureTytle: req.body.lectureTytle ?? existing.lectureTytle,
          lectureDifficulty: req.body.lectureDifficulty ?? existing.lectureDifficulty,
          teacherGuideId,
          videoUrl,
          description: req.body.description ?? existing.description,
          pdfMaterials,
        },
        { new: true }
      );

      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: "Update failed", error: e.message });
    }
  });
};


exports.remove = async (req, res) => {
  try {
    const doc = await PythonVideoLecture.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Delete failed", error: e.message }); }
};
