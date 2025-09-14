const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcrypt");

// helper to pick only allowed fields and ignore undefined
const pickAllowed = (obj, allowed) =>
  Object.fromEntries(Object.entries(obj).filter(([k, v]) => allowed.includes(k) && v !== undefined));

exports.getUsers = async (_req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .populate("role", "name permissions") 
      .lean();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });

    const user = await User.findById(id)
      .select("-password")
      .populate("role", "name permissions")
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });

    // whitelist of updatable fields
    const allowed = [
      "firstName",
      "lastName",
      "age",
      "phoneNumber",
      "difficultyLevel",
      "status",
      "suitabilityForCoding",
      "suitableMethod",
      "faceImgUrl",
      "entranceTest"
    ];
    const update = pickAllowed(req.body, allowed);

    if (Object.prototype.hasOwnProperty.call(req.body, "password")) {
      if (!req.body.password) return res.status(400).json({ message: "Password cannot be empty" });
      update.password = await bcrypt.hash(req.body.password, 10);
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    )
      .select("-password")
      .populate("role", "name permissions");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
};

