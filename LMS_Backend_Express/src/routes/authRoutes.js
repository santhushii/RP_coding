const express = require("express");
const router = express.Router();
const authController = require("../authentication/authController");
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });


router.post("/login", authController.loginUser);
// router.post("/register",upload.single('faceImage'), authController.registerUser);
router.post("/face-login", authController.faceLoginUser);
router.post(
  "/register",
  upload.fields([{ name: "face", maxCount: 1 }, { name: "faceImage", maxCount: 1 }]),
  (req, res, next) => {
    // Normalize so controller can keep using req.file
    req.file = (req.files?.face?.[0] || req.files?.faceImage?.[0] || null);
    next();
  },
  authController.registerUser
);

module.exports = router;