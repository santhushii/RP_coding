import { Fragment, useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import Footer from "../component/layout/footer";
import Header from "../component/layout/header";
import PageHeader from "../component/layout/pageheader";
import apiClient from "../api";
import axios from "axios";

const StudentProfile = () => {
  const [student, setStudent] = useState(null);
  const [studentPerformance, setStudentPerformance] = useState(null);
  const [studentPerScore, setStudentPerScore] = useState(null); // will hold { predicted_skill, ... }
  const [studentPerformanceHistory, setStudentPerformanceHistory] = useState([]);
  const userId = localStorage.getItem("userId");

  const [learningType, setLearningType] = useState(null);
  const [bestLearningStyle, setBestLearningStyle] = useState(null);
  const [learningBreakdown, setLearningBreakdown] = useState([]);

  useEffect(() => {
    fetchStudentProfile();
    fetchStudentPerformance();
    fetchStudentPerformanceHistory();
    fetchLearningType();
  }, []);

  useEffect(() => {
    if (studentPerformance) {
      fetchStudentCurrentLevel();
    }
  }, [studentPerformance, studentPerformanceHistory.length]);

  useEffect(() => {
    if (!learningType) {
      setBestLearningStyle(null);
      setLearningBreakdown([]);
      return;
    }

    const types = [
      {
        key: "visual",
        label: "Visual",
        count: Number(learningType.visualLearningCount || 0),
        total: Number(learningType.visualLearningTotalPoint || 0),
      },
      {
        key: "auditory",
        label: "Auditory",
        count: Number(learningType.auditoryLearningCount || 0),
        total: Number(learningType.auditoryLearningTotalPoint || 0),
      },
      {
        key: "kinesthetic",
        label: "Kinesthetic",
        count: Number(learningType.kinestheticLearningCount || 0),
        total: Number(learningType.kinestheticLearningTotalPoint || 0),
      },
      {
        key: "readwrite",
        label: "Read & Write",
        count: Number(learningType.readAndWriteLearningCount || 0),
        total: Number(learningType.readAndWriteLearningTotalPoint || 0),
      },
    ];

    const breakdown = types.map(t => {
      const avg = t.count > 0 ? (t.total / t.count) : 0; 
      const engage = Math.min(1, t.count / 5);           
      const score = avg * (0.6 + 0.4 * engage);          
      return { ...t, avg, engage, score };
    })
    .sort((a, b) => b.score - a.score);

    setLearningBreakdown(breakdown);

    const top = breakdown[0];
    const hasSignal = breakdown.some(b => b.count > 0 && b.avg > 0);
    setBestLearningStyle(hasSignal ? top.label : null);
  }, [learningType]);

  const fetchLearningType = async () => {
    try {
      const res = await apiClient.get(`/api/learning-type/user/${userId}`);
      if (res?.data) setLearningType(res.data);
    } catch (err) {
      console.error("Error fetching learning-type:", err);
      setLearningType(null);
    }
  };

  const fetchStudentProfile = async () => {
    try {
      const response = await apiClient.get(`/api/users/${userId}`);
      if (response.data) {
        setStudent(response.data);
      }
    } catch (error) {
      console.error("Error fetching student profile:", error);
    }
  };

  const fetchStudentPerformance = async () => {
    try {
      const response = await apiClient.get(`/api/student-performance/user/${userId}`);
      if (response.data) {
        setStudentPerformance(response.data);
      }
    } catch (error) {
      console.error("Error fetching student performance:", error);
    }
  };

  const fetchStudentPerformanceHistory = async () => {
    try {
      const response = await apiClient.get(`/api/student-performance-history/user/${userId}`);
      if (response.data) {
        setStudentPerformanceHistory(response.data);
      }
    } catch (error) {
      console.error("Error fetching student performance history:", error);
    }
  };

  const fetchStudentCurrentLevel = async () => {
    try {
      const sp = studentPerformance || {};
      const attendanceRate = Number(studentPerformanceHistory?.length || 0);

      const payload = {
        papers_completed: Number(sp.paperCount ?? 0),
        video_lectures_watched: Number(sp.lectureCount ?? 0),
        total_time_on_LMS_hours: Number(sp.totalStudyTime ?? 0),
        resources_downloaded: Number(sp.resourceScore ?? 0),
        attendance_rate: attendanceRate,
        past_coding_score: Number(sp.averageScore ?? 0),
      };

      const response = await axios.post(`http://127.0.0.1:5000/predict-skill`, payload);
      if (response.data) {
        setStudentPerScore(response.data); // expect { predicted_skill: "Basic" | "Intermediate" | "Advanced", ... }
      }
    } catch (error) {
      console.error("Error fetching student skill prediction:", error);
    }
  };

  // Map ML label -> app difficulty
  const mapSkillToDifficulty = (skill) => {
    switch (String(skill || "").toLowerCase()) {
      case "basic":
        return "Easy";
      case "intermediate":
        return "Medium";
      case "advanced":
        return "Hard";
      default:
        return "N/A";
    }
  };

  return (
    <Fragment>
      <Header />
      <PageHeader title={"Student Profile"} curPage={"Profile"} />
      <section className="student-profile-section padding-tb section-bg">
        <div className="container">
          <div className="profile-wrapper">
            {student ? (
              <div className="profile-content text-center">
                <h2 className="text-center">
                  Welcome, {student.firstName} {student.lastName}
                </h2>

                <div className="d-flex align-items-center flex-wrap mb-4" style={{ gap: "40px" }}>
                  <div className="profile-image text-center">
                    <img
                      src={
                        student.faceImgUrl
                          ? student.faceImgUrl
                          : "https://img.freepik.com/premium-vector/man-avatar-profile-picture-vector-illustration_268834-538.jpg"
                      }
                      alt="Profile"
                      className="rounded"
                      style={{
                        width: "300px",
                        height: "300px",
                        objectFit: "cover",
                        border: "3px solid #007bff",
                        maxWidth: "100%",
                      }}
                    />
                  </div>

                  <div className="profile-info" style={{ flex: "1", minWidth: "250px" }}>
                    <p><strong>Email:</strong> {student.email}</p>
                    <p><strong>First Name:</strong> {student.firstName}</p>
                    <p><strong>Last Name:</strong> {student.lastName}</p>
                    <p><strong>Age:</strong> {student.age ?? "N/A"}</p>
                    <p><strong>Phone Number:</strong> {student.phoneNumber ?? "N/A"}</p>
                    <p><strong>Current Difficulty Level:</strong> {student.difficultyLevel ?? "N/A"}</p>
                    <p>
                      <strong>Suggested Difficulty:</strong>{" "}
                      {studentPerScore?.predicted_skill
                        ? mapSkillToDifficulty(studentPerScore.predicted_skill)
                        : "N/A"}
                    </p>
                  </div>
                </div>
                {/* ===== Learning Style Summary ===== */}
                <div className="mt-5 mb-5">
                  <h3 className="text-center mb-3">Best Learning Style</h3>
                  <div className="text-center mb-5">
                    <span className="badge bg-primary" style={{ fontSize: 16, padding: "8px 14px" }}>
                      {bestLearningStyle || "Not enough data yet"}
                    </span>
                  </div>

                  {/* Breakdown table */}
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered align-middle">
                      <thead className="table-light">
                        <tr>
                          <th style={{whiteSpace:"nowrap"}}>Style</th>
                          <th className="text-end">Attempts</th>
                          <th className="text-end">Avg % (manual)</th>
                          <th className="text-end">Engagement</th>
                          <th className="text-end">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {learningBreakdown.map((row) => (
                          <tr key={row.key}>
                            <td>{row.label}</td>
                            <td className="text-end">{row.count}</td>
                            <td className="text-end">{row.avg.toFixed(1)}</td>
                            <td className="text-end">{(row.engage * 100).toFixed(0)}%</td>
                            <td className="text-end">{row.score.toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <small className="text-muted">
                    We compute averages from your totals (ignoring API “Average” fields). Score = Avg × (0.6 + 0.4 × min(1, Attempts/5)) to avoid overfitting to a single attempt.
                  </small>
                </div>

                {/* Historical Average Score Chart */}
                <div className="chart-container">
                  <h3 className="text-center">Student's Average Score Trend</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={studentPerformanceHistory.map((entry, index) => ({
                        index,
                        averageScore: entry.averageScore,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="index" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="averageScore" stroke="#28a745" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <p className="text-center">Loading student profile...</p>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </Fragment>
  );
};

export default StudentProfile;
