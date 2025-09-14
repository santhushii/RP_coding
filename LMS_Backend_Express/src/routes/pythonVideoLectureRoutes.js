const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/pythonVideoLectureController");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, ctrl.create);       // expects fields: video (file), pdfMaterials[] (files)
router.get("/", auth, ctrl.getAll);
router.get("/:id", auth, ctrl.getById);
router.put("/:id", auth, ctrl.update);     // can update media too
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
