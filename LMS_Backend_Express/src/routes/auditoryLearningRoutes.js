const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/auditoryLearningController");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, ctrl.create);     // expects field: audio (file)
router.get("/", auth, ctrl.getAll);
router.get("/:id", auth, ctrl.getById);
router.put("/:id", auth, ctrl.update);   // can replace audio
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
