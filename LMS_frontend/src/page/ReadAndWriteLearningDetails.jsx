import { Fragment, useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Footer from "../component/layout/footer";
import Header from "../component/layout/header";
import PageHeader from "../component/layout/pageheader";
import apiClient from "../api";
import Swal from "sweetalert2";

const LECTURE_TYPE = "readwrite"; // value stored in CompletedLecture.lectureType

const ReadAndWriteLearningDetails = () => {
  const { id } = useParams();
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
  const [learningType, setLearningType] = useState(null);

  // completed-lectures state
  const [isCompleted, setIsCompleted] = useState(false);
  const completionMarkedRef = useRef(false);

  useEffect(() => {
    fetchPaperAndQuestions();
  }, [id]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    checkAndCreateStudentPerformanceIfMissing();
  }, [userId]);

  // check if this paper is already in completed list
  useEffect(() => {
    const checkCompleted = async () => {
      if (!userId || !id) return;
      try {
        const res = await apiClient.get(`/api/completed-lectures/is-completed`, {
          params: { userId, lectureId: id, lectureType: LECTURE_TYPE },
        });
        const completed = !!res?.data?.completed;
        setIsCompleted(completed);
        if (completed) completionMarkedRef.current = true;
      } catch (e) {
        // if API not available yet, just ignore
        console.error("Completed-check failed:", e);
      }
    };
    checkCompleted();
  }, [userId, id]);

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
    }
  };

  async function ensureLearningTypeExists(userId, setLearningType) {
    if (!userId) return;
    try {
      const res = await apiClient.get(`/api/learning-type/user/${userId}`);
      if (res?.data?._id) {
        setLearningType(res.data);
      } else {
        const created = await apiClient.post('/api/learning-type', { user: userId });
        setLearningType(created?.data || null);
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        try {
          const created = await apiClient.post('/api/learning-type', { user: userId });
          setLearningType(created?.data || null);
        } catch (e2) {
          console.error('Error creating learning-type record:', e2);
        }
      } else {
        console.error('Error fetching learning-type record:', err);
      }
    }
  }

  async function updateReadWriteLearningProgress({ userId, learningType, setLearningType, percentInt }) {
    if (!userId) return;
    try {
      let lt = learningType;
      if (!lt?._id) {
        await ensureLearningTypeExists(userId, setLearningType);
        const refetched = await apiClient.get(`/api/learning-type/user/${userId}`).catch(() => null);
        lt = refetched?.data?._id ? refetched.data : learningType;
      }
      if (!lt?._id) return;

      const payload = {
        readAndWriteLearningCount: (lt.readAndWriteLearningCount ?? 0) + 1,
        readAndWriteLearningTotalPoint: (lt.readAndWriteLearningTotalPoint ?? 0) + Number(percentInt),
      };

      const updated = await apiClient.put(`/api/learning-type/${lt._id}`, payload);
      setLearningType(updated?.data ?? { ...lt, ...payload });
    } catch (e) {
      console.error('Error updating learning-type (read & write):', e);
    }
  }

  useEffect(() => {
    if (userId) {
      ensureLearningTypeExists(userId, setLearningType);
    }
  }, [userId]);

  const fetchPaperAndQuestions = async () => {
    setLoading(true);
    setError("");
    try {
      const p = await apiClient.get(`/api/readwrite/learning/${id}`);
      setPaper(p.data || null);

      const qRes = await apiClient.get(`/api/readwrite/qanda/readId/${id}`);
      const qs = Array.isArray(qRes.data?.items) ? qRes.data.items : [];
      setQuestions(qs);

      const totalAvail = qs.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
      setTotalAvailableMarks(totalAvail);

      setStudentAnswers({});
      setEvaluationResults({});
      setIsSubmitted(false);

      setLoading(false);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch paper details.");
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setStudentAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // difficulty weight: Easy 1, Medium 1.2, Hard 1.5
  const getDifficultyWeight = () => {
    const raw =
      paper?.paperDifficulty ||
      paper?.lectureDifficulty ||
      paper?.difficulty ||
      "Easy";
    const key = String(raw).trim().toLowerCase();
    const map = { easy: 1, medium: 1.2, hard: 1.5 };
    return map[key] ?? 1;
  };

  // helper: mark as completed in the list (idempotent on client; backend should enforce idempotency too)
  const markThisPaperCompleted = async () => {
    if (!userId || !id || completionMarkedRef.current) return;
    try {
      await apiClient.post(`/api/completed-lectures`, {
        userId,
        lectureId: id,
        lectureType: LECTURE_TYPE,
        completedAt: new Date().toISOString(),
      });
      completionMarkedRef.current = true;
      setIsCompleted(true);
      Swal.fire({
        icon: "success",
        title: "Passed! ✅",
        text: "You scored above 75%. This paper is now marked as completed.",
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error("Failed to mark completed:", e);
    }
  };

  const submitAnswers = async () => {
    if (isSubmitted) return;

    let results = {};
    let correctMarks = 0;

    questions.forEach((q) => {
      const student = (studentAnswers[q._id] || "").trim().toLowerCase();
      const correctAns = (q.questionAnswer || "").trim().toLowerCase();
      const isCorrect = student !== "" && student === correctAns;

      results[q._id] = isCorrect;
      if (isCorrect) correctMarks += Number(q.score) || 0;
    });

    const pct = totalAvailableMarks > 0 ? (correctMarks / totalAvailableMarks) * 100 : 0;
    const percentInt = Math.round(pct);

    setEvaluationResults(results);
    setTotalCorrectMarks(Number(correctMarks.toFixed(2)));
    setPercentage(Number(pct.toFixed(2)));
    setIsSubmitted(true);

    // update read/write learning progress
    await updateReadWriteLearningProgress({
      userId,
      learningType,
      setLearningType,
      percentInt,
    });

    // ✅ If not completed and score > 75%, add to completed list
    if (percentInt > 75 && !isCompleted && !completionMarkedRef.current) {
      await markThisPaperCompleted();
    }

    updateStudentPerformance(correctMarks);
  };

  const updateStudentPerformance = async (correctScore) => {
    if (!userId) return;

    const weight = getDifficultyWeight();
    const weightedScore = Number(correctScore) * weight;

    try {
      const response = await apiClient.get(`/api/student-performance/user/${userId}`);
      if (response.data) {
        const sp = response.data;
        await apiClient.put(`/api/student-performance/user/${userId}`, {
          totalStudyTime: sp.totalStudyTime ?? 0,
          resourceScore: sp.resourceScore ?? 0,
          totalScore: (sp.totalScore ?? 0) + weightedScore,
          paperCount: (sp.paperCount ?? 0) + 1,
          averageScore: sp.averageScore ?? 0,
          lectureCount: sp.lectureCount ?? 0,
        });

        Swal.fire({
          title: "Success!",
          text: `Your score has been updated! `,
          icon: "success",
          confirmButtonText: "OK",
        });
      } else {
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
          text: `New performance record created. Initial total: ${weightedScore.toFixed(2)}`,
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
      <PageHeader title="Reading & Writing" curPage={"Paper Details"} />

      <div className="paper-section padding-tb section-bg">
        <div className="container">
          {loading ? (
            <p>Loading paper details...</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : paper ? (
            <div className="paper-content">
              {/* Paper Header */}
              <div className="paper-header text-center mb-3">
                <h2>
                  {paper.paperTytle}
                  {isCompleted && (
                    <span className="badge bg-success ms-2 align-middle">Completed</span>
                  )}
                </h2>
                <p className="mb-1">
                  {paper.teacherguideId?.coureInfo && (
                    <>
                      <strong>Guide:</strong> {paper.teacherguideId.coureInfo} |{" "}
                    </>
                  )}
                  <strong>Created:</strong>{" "}
                  {paper.createdAt
                    ? new Date(paper.createdAt).toLocaleDateString()
                    : "—"}
                </p>
                {paper.Description && (
                  <div className="alert alert-light border text-start mt-3">
                    <div className="fw-semibold mb-1">Description</div>
                    <div>{paper.Description}</div>
                  </div>
                )}
              </div>

              {/* Questions */}
              <div className="question-section">
                {questions.length > 0 ? (
                  <ul className="question-list">
                    {questions.map((q, idx) => (
                      <li key={q._id} className="mb-4">
                        <p className="mb-2">
                          <strong>Q{idx + 1}:</strong> {q.questionTytle}{" "}
                          <span className="text-muted">
                            ({q.score ?? 0} marks)
                          </span>
                          {q.topicTag && (
                            <span className="ms-2 badge bg-light text-dark">
                              {q.topicTag}
                            </span>
                          )}
                        </p>

                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter your answer…"
                          value={studentAnswers[q._id] || ""}
                          onChange={(e) =>
                            handleAnswerChange(q._id, e.target.value)
                          }
                          disabled={isSubmitted}
                        />

                        {evaluationResults[q._id] !== undefined && (
                          <p
                            className={
                              evaluationResults[q._id]
                                ? "text-success mt-1"
                                : "text-danger mt-1"
                            }
                          >
                            {evaluationResults[q._id]
                              ? "Correct ✅"
                              : "Incorrect ❌"}
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

export default ReadAndWriteLearningDetails;
