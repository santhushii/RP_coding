const StartingPaperTitle = require("../models/StartingPaperTitle");

// CREATE
exports.create = async (req, res) => {
  try {
    const payload = {
      paperTytle: req.body.paperTytle,
      paperNumber: req.body.paperNumber,
      createBy: req.user?.userId || req.body.createBy
    };
    const doc = await StartingPaperTitle.create(payload);
    res.status(201).json(doc);
  } catch (e) { res.status(500).json({ message: "Create failed", error: e.message }); }
};

// READ ALL
exports.getAll = async (_req, res) => {
  try { res.json(await StartingPaperTitle.find().populate("createBy", "username email")); }
  catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

// READ ONE
exports.getById = async (req, res) => {
  try {
    const doc = await StartingPaperTitle.findById(req.params.id).populate("createBy", "username email");
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Fetch failed", error: e.message }); }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const { paperTytle, paperNumber } = req.body;
    const doc = await StartingPaperTitle.findByIdAndUpdate(
      req.params.id, { paperTytle, paperNumber }, { new: true }
    );
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) { res.status(500).json({ message: "Update failed", error: e.message }); }
};

// DELETE
exports.remove = async (req, res) => {
  try {
    const doc = await StartingPaperTitle.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: "Delete failed", error: e.message }); }
};
