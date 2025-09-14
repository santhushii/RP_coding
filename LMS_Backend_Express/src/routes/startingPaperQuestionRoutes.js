const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/startingPaperQuestionController");
const auth = require("../middleware/authMiddleware");

router.post("/", auth, ctrl.create);
router.get("/", auth, ctrl.getAll);
router.get("/:id", auth, ctrl.getById);
router.put("/:id", auth, ctrl.update);
router.delete("/:id", auth, ctrl.remove);
router.get("/by-paper/:startingPaperId", auth, ctrl.getByStartingPaperId);

module.exports = router;
