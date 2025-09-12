const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/auditoryQandAController");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, ctrl.create);
router.get("/", auth, ctrl.getAll);
router.get("/:id", auth, ctrl.getById);
router.put("/:id", auth, ctrl.update);
router.delete("/:id", auth, ctrl.remove);
router.get("/auditoryId/:auditoryLearningId", auth, ctrl.getByAuditoryLearningId);


module.exports = router;
