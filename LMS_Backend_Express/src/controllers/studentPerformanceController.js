const StudentPerformance = require("../models/StudentPerformance");
const User = require("../models/User");

exports.createStudentPerformance = async (req, res) => {
  try {
    const { userId, totalStudyTime = 0, resourceScore = 0, totalScore = 0, paperCount = 0, lectureCount = 0 } = req.body;

    const averageScore = paperCount > 0 ? totalScore / paperCount : 0;

    const newStudentPerformance = new StudentPerformance({
      userId,
      totalStudyTime,
      resourceScore,
      totalScore,
      paperCount,
      lectureCount,
      averageScore,
    });

    await newStudentPerformance.save();
    res.status(201).json({
      message: "Student performance record created successfully!",
      newStudentPerformance,
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating student performance record", error });
  }
};

exports.getStudentPerformances = async (req, res) => {
  try {
    const studentPerformances = await StudentPerformance.find().populate("userId", "username email firstName lastName");
    res.status(200).json(studentPerformances);
  } catch (error) {
    res.status(500).json({ message: "Error fetching student performances", error });
  }
};

exports.getStudentPerformanceById = async (req, res) => {
  try {
    const studentPerformance = await StudentPerformance.findById(req.params.id).populate(
      "userId",
      "username email firstName lastName"
    );
    if (!studentPerformance) return res.status(404).json({ message: "Student performance record not found" });
    res.status(200).json(studentPerformance);
  } catch (error) {
    res.status(500).json({ message: "Error fetching student performance record", error });
  }
};

exports.updateStudentPerformance = async (req, res) => {
  try {
    const doc = await StudentPerformance.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Student performance record not found" });

    const { totalStudyTime, resourceScore, totalScore, paperCount, lectureCount } = req.body;

    if (totalStudyTime !== undefined) doc.totalStudyTime = totalStudyTime;
    if (resourceScore !== undefined) doc.resourceScore = resourceScore;
    if (totalScore !== undefined) doc.totalScore = totalScore;
    if (paperCount !== undefined) doc.paperCount = paperCount;
    if (lectureCount !== undefined) doc.lectureCount = lectureCount;

    doc.averageScore = doc.paperCount > 0 ? doc.totalScore / doc.paperCount : 0;

    await doc.save();
    res.status(200).json({ message: "Student performance updated successfully!", updatedStudentPerformance: doc });
  } catch (error) {
    res.status(500).json({ message: "Error updating student performance", error });
  }
};

exports.deleteStudentPerformance = async (req, res) => {
  try {
    const deletedStudentPerformance = await StudentPerformance.findByIdAndDelete(req.params.id);
    if (!deletedStudentPerformance) return res.status(404).json({ message: "Student performance record not found" });

    res.status(200).json({ message: "Student performance deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting student performance", error });
  }
};

exports.getStudentPerformanceByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const studentPerformance = await StudentPerformance.findOne({ userId }).populate("userId", "username email firstName lastName");
    if (!studentPerformance) return res.status(200).json(null);
    res.status(200).json(studentPerformance);
  } catch (error) {
    res.status(500).json({ message: "Error fetching student performance record", error });
  }
};

exports.updateStudentPerformanceByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const doc = await StudentPerformance.findOne({ userId });
    if (!doc) return res.status(404).json({ message: "Student performance record not found" });

    const { totalStudyTime, resourceScore, totalScore, paperCount, lectureCount } = req.body;

    if (totalStudyTime !== undefined) doc.totalStudyTime = totalStudyTime;
    if (resourceScore !== undefined) doc.resourceScore = resourceScore;
    if (totalScore !== undefined) doc.totalScore = totalScore;
    if (paperCount !== undefined) doc.paperCount = paperCount;
    if (lectureCount !== undefined) doc.lectureCount = lectureCount;

    doc.averageScore = doc.paperCount > 0 ? doc.totalScore / doc.paperCount : 0;

    await doc.save();
    res.status(200).json({ message: "Student performance updated successfully!", updatedStudentPerformance: doc });
  } catch (error) {
    res.status(500).json({ message: "Error updating student performance", error });
  }
};
