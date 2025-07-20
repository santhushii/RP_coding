const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/visualLearningController");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, ctrl.create);    // expects field: video (file)
router.get("/", auth, ctrl.getAll);
router.get("/:id", auth, ctrl.getById);
router.put("/:id", auth, ctrl.update);  // can replace video
router.delete("/:id", auth, ctrl.remove);

module.exports = router;
