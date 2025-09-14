import { Fragment, useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Footer from "../component/layout/footer";
import Header from "../component/layout/header";
import PageHeader from "../component/layout/pageheader";
import apiClient from "../api";
import Swal from "sweetalert2";

const PaperDetails = () => {
  const { paperId } = useParams();
  const [paper, setPaper] = useState(null);
  const [questions, setQuestions] = useState([]); 
  const [studentAnswers, setStudentAnswers] = useState({});
  const [evaluationResults, setEvaluationResults] = useState({});
  const [totalCorrectMarks, setTotalCorrectMarks] = useState(0);
  const [totalAvailableMarks, setTotalAvailableMarks] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const userId = localStorage.getItem("userId");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    fetchPaperAndQuestions();
  }, [paperId]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    checkAndCreateStudentPerformanceIfMissing();
  }, [userId]);

  const checkAndCreateStudentPerformanceIfMissing = async () => {
    if (!userId) return;
    try {
      const res = await apiClient.get(`/api/student-performance/user/${userId}`);
      if (!res.data) {
        await apiClient.post("/api/student-performance", {
          userId,
          totalStudyTime: 0,
          resourceScore: 0,
          totalScore: 0,
          paperCount: 0,
          averageScore: 0,
          lectureCount: 0,
        });
      }
    } catch (_e) {
      // ignore; backend may 404 when not found which is fine
    }
  };

  const fetchPaperAndQuestions = async () => {
    setLoading(true);
    setError("");
    try {
      // Try detail first; if not supported, fall back to list+find
      let paperData = null;
      try {
        const p = await apiClient.get(`/api/python/papers/${paperId}`);
        paperData = p.data;
      } catch {
        const list = await apiClient.get(`/api/python/papers`);
        paperData = Array.isArray(list.data)
          ? list.data.find((it) => it._id === paperId)
          : null;
      }

      if (!paperData) throw new Error("Paper not found");

      setPaper(paperData);

      const qRes = await apiClient.get(`/api/python/qanda/paper/${paperId}`);
      const qs = Array.isArray(qRes.data) ? qRes.data : [];
      setQuestions(qs);

      // Precompute total available marks
      const totalAvail = qs.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
      setTotalAvailableMarks(totalAvail);

      setLoading(false);
    } catch (e) {
      setError("Failed to fetch paper details.");
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setStudentAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const submitAnswers = () => {
    if (isSubmitted) return;

    let results = {};
    let correct = 0;

    questions.forEach((q) => {
      const student = (studentAnswers[q._id] || "").trim().toLowerCase();
      const correctAns = (q.questionAnswer || "").trim().toLowerCase();
      const isCorrect = student !== "" && student === correctAns;

      results[q._id] = isCorrect;
      if (isCorrect) correct += Number(q.score) || 0;
    });

    const pct = totalAvailableMarks > 0 ? (correct / totalAvailableMarks) * 100 : 0;

    setEvaluationResults(results);
    setTotalCorrectMarks(Number(correct.toFixed(2)));
    setPercentage(Number(pct.toFixed(2)));
    setIsSubmitted(true);

    updateStudentPerformance(correct);
  };

  const updateStudentPerformance = async (correctScore) => {
    if (!userId) return;

    // difficulty weight: easy=1, medium=1.2, hard=1.5
    const weightMap = { easy: 1, medium: 1.2, hard: 1.5 };
    const diffKey = (paper?.paperDifficulty || "").toString().trim().toLowerCase();
    const weight = weightMap[diffKey] ?? 1;

    const weightedScore = Number(correctScore) * weight;

    try {
      const response = await apiClient.get(`/api/student-performance/user/${userId}`);
      if (response.data) {
        const sp = response.data;
        await apiClient.put(`/api/student-performance/user/${userId}`, {
          totalStudyTime: sp.totalStudyTime ?? 0,          // unchanged here
          resourceScore: sp.resourceScore ?? 0,            // unchanged
          totalScore: (sp.totalScore ?? 0) + weightedScore,
          paperCount: (sp.paperCount ?? 0) + 1,            // +1 paper
          averageScore: sp.averageScore ?? 0,              // unchanged
          lectureCount: sp.lectureCount ?? 0,              // unchanged
        });

        Swal.fire({
          title: "Success!",
          text: `Your score has been updated! Added ${(weightedScore).toFixed(2)} (weight: ${weight}). New total: ${((sp.totalScore ?? 0) + weightedScore).toFixed(2)}`,
          icon: "success",
          confirmButtonText: "OK",
        });
      } else {
        // If somehow GET returned no data, create new with this paper’s result
        await apiClient.post("/api/student-performance", {
          userId,
          totalStudyTime: 0,
          resourceScore: 0,
          totalScore: weightedScore,
          paperCount: 1,
          averageScore: 0,
          lectureCount: 0,
        });

        Swal.fire({
          title: "Success!",
          text: `New performance record created. Initial total: ${weightedScore.toFixed(2)} (weight: ${weight}).`,
          icon: "success",
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      console.error("Error updating student performance:", error);
      Swal.fire({
        title: "Error!",
        text: "There was an issue updating your score. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  return (
    <Fragment>
      <Header />
      <PageHeader title="Question Paper" curPage={"Paper Details"} />
      <div className="paper-section padding-tb section-bg">
        <div className="container">
          {loading ? (
            <p>Loading paper details...</p>
          ) : error ? (
            <p>{error}</p>
          ) : paper ? (
            <div className="paper-content">
              {/* Paper Header */}
              <div className="paper-header text-center">
                <h2>{paper.paperTytle}</h2>
                <p>
                  <strong>Difficulty:</strong> {paper.paperDifficulty}{" "}
                  {paper.teacherGuideId?.coureInfo && (
                    <>
                      | <strong>Guide:</strong> {paper.teacherGuideId.coureInfo}
                    </>
                  )}{" "}
                  | <strong>Created:</strong>{" "}
                  {new Date(paper.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Questions */}
              <div className="question-section">
                {questions.length > 0 ? (
                  <ul className="question-list">
                    {questions.map((q, idx) => (
                      <li key={q._id} className="mb-4">
                        <p className="mb-2">
                          <strong>Q{idx + 1}:</strong> {q.questionTytle}{" "}
                          <span className="text-muted">({q.score} marks)</span>
                        </p>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter your answer..."
                          value={studentAnswers[q._id] || ""}
                          onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                          disabled={isSubmitted}
                        />
                        {evaluationResults[q._id] !== undefined && (
                          <p
                            className={
                              evaluationResults[q._id] ? "text-success mt-1" : "text-danger mt-1"
                            }
                          >
                            {evaluationResults[q._id] ? "Correct ✅" : "Incorrect ❌"}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No questions available.</p>
                )}
              </div>

              {/* Submit + Scores */}
              <div className="text-center mt-4">
                <button
                  className="btn btn-primary"
                  onClick={submitAnswers}
                  disabled={isSubmitted || questions.length === 0}
                >
                  {isSubmitted ? "Submitted" : "Submit Answers"}
                </button>

                {isSubmitted && (
                  <div className="mt-3">
                    <h5 className="text-success">
                      Correct Marks: {totalCorrectMarks} / {totalAvailableMarks}
                    </h5>
                    <h5 className="text-primary">Score: {percentage}%</h5>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p>Paper not found.</p>
          )}
        </div>
      </div>
      <Footer />
    </Fragment>
  );
};

export default PaperDetails;
