const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/visualLerningQandAController");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, ctrl.create);
router.get("/", auth, ctrl.getAll);
router.get("/:id", auth, ctrl.getById);
router.put("/:id", auth, ctrl.update);
router.delete("/:id", auth, ctrl.remove);
router.get("/visualId/:visualLerningId", auth, ctrl.getByVisualLerningId);

module.exports = router;
