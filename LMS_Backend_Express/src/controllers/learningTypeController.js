const mongoose = require("mongoose");
const LearningType = require("../models/LearningType");

exports.getByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const doc = await LearningType.findOne({ user: userId })
      .populate("user", "firstName lastName email role")
      .exec();

    if (!doc) return res.status(404).json({ message: "LearningType not found for this user" });

    return res.status(200).json(doc.toObject({ virtuals: true }));
  } catch (error) {
    return res.status(500).json({ message: "Error fetching learning type", error: error.message });
  }
};


exports.create = async (req, res) => {
  try {
    const { user } = req.body;
    if (!mongoose.isValidObjectId(user)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const existing = await LearningType.findOne({ user });
    if (existing) {
      return res.status(409).json({ message: "LearningType already exists for this user" });
    }

    const created = await LearningType.create({ user });
    return res.status(201).json(created.toObject({ virtuals: true }));
  } catch (error) {
    return res.status(500).json({ message: "Error creating learning type", error: error.message });
  }
};


exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const allowed = [
      "visualLearningCount",
      "visualLearningTotalPoint",
      "auditoryLearningCount",
      "auditoryLearningTotalPoint",
      "kinestheticLearningCount",
      "kinestheticLearningTotalPoint",
      "readAndWriteLearningCount",
      "readAndWriteLearningTotalPoint",
    ];

    const update = Object.fromEntries(
      Object.entries(req.body).filter(([k, v]) => allowed.includes(k) && v !== undefined)
    );

    const updated = await LearningType.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    )
      .populate("user", "firstName lastName email role")
      .exec();

    if (!updated) return res.status(404).json({ message: "LearningType not found" });
    return res.status(200).json(updated.toObject({ virtuals: true }));
  } catch (error) {
    return res.status(500).json({ message: "Error updating learning type", error: error.message });
  }
};
