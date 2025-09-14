import { Fragment, useEffect, useState } from "react";
import Footer from "../component/layout/footer";
import Header from "../component/layout/header";
import PageHeader from "../component/layout/pageheader";
import apiClient from "../api";
import Swal from "sweetalert2";

const PER_QUESTION_MINUTES = 2; // time per question
const MAX_PRACTICE_ROUNDS = 3;
const MAX_GEN_PER_CATEGORY = 5; // NEW: clamp upper bound
const MIN_GEN_PER_CATEGORY = 0; // NEW: clamp lower bound

const safeNumber = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

// Parse generated_text into a structured MCQ
const parseGeneratedQA = (text) => {
  const raw = (text || "").replace(/\r/g, "");
  const qMatch = raw.match(/Question:\s*([\s\S]*?)(?=\|\s*Option|\nOption|Correct Answer:|$)/i);
  const question = qMatch ? qMatch[1].trim().replace(/\|$/,"").trim() : raw.trim();

  const options = [];
  const optRegex = /Option\s*([A-D]):\s*([^\n|]+)(?=\s*\||\n|$)/gi;
  let m;
  while ((m = optRegex.exec(raw)) !== null) {
    options.push({ key: m[1].toUpperCase(), text: m[2].trim() });
  }
  if (options.length === 0) {
    const parts = raw.split("|").map(s => s.trim());
    const inferred = parts.filter(s => /^([A-D])[).:-]\s*/i.test(s));
    inferred.forEach(seg => {
      const mm = seg.match(/^([A-D])[).:-]\s*(.*)$/i);
      if (mm) options.push({ key: mm[1].toUpperCase(), text: mm[2].trim() });
    });
  }

  let correctKey = null;
  let correctText = null;
  const caLetter = raw.match(/Correct\s*Answer:\s*([A-D])\b/i);
  if (caLetter) correctKey = caLetter[1].toUpperCase();
  const caAny = raw.match(/Correct\s*Answer:\s*([^\n|]+)$/im);
  if (!correctKey && caAny) correctText = caAny[1].trim();

  if (!correctKey && correctText && options.length) {
    const idx = options.findIndex(o => o.text.toLowerCase() === correctText.toLowerCase());
    if (idx >= 0) correctKey = options[idx].key;
  }

  const expMatch = raw.match(/Explanation:\s*([^\n|]+)/i);
  const explanation = expMatch ? expMatch[1].trim() : "";

  return { question, options, correctKey, correctText, explanation };
};

const StartingPaper = () => {
  const [paper, setPaper] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState("");

  // original paper answering/evaluation
  const [studentAnswers, setStudentAnswers] = useState({});
  const [evaluationResults, setEvaluationResults] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [totalCorrectMarks, setTotalCorrectMarks] = useState(0);
  const [totalAvailableMarks, setTotalAvailableMarks] = useState(0);
  const [percentage, setPercentage] = useState(0);

  // category payloads/predictions (always the predictions for "the next step")
  const [categoryPayloads, setCategoryPayloads] = useState({});
  const [categoryPredictions, setCategoryPredictions] = useState({});

  // Generated practice papers flow (multi-round)
  const [practiceRound, setPracticeRound] = useState(0); // 0 = none yet, then 1..3
  const [generating, setGenerating] = useState(false);
  const [nextPaper, setNextPaper] = useState([]); // current round questions
  const [nextAnswers, setNextAnswers] = useState({});
  const [nextResults, setNextResults] = useState({});
  const [nextSubmitted, setNextSubmitted] = useState(false);
  const [nextScore, setNextScore] = useState(0);
  const [nextTotal, setNextTotal] = useState(0);

  // History & summary after round 3
  const [practiceHistory, setPracticeHistory] = useState([]); // [{round, score, total, percent}]
  const [showSummary, setShowSummary] = useState(false);

  // User id for final update
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    fetchRandomPaperAndQuestions();
  }, []);

  const fetchAllQuestionsByPaperId = async (paperId) => {
    let page = 1;
    const limit = 100;
    let items = [];
    let pages = 1;

    do {
      const res = await apiClient.get(
        `/api/starting-paper-questions/by-paper/${paperId}?page=${page}&limit=${limit}`
      );
      const data = res?.data || {};
      const batch = Array.isArray(data.items) ? data.items : [];
      items = items.concat(batch);

      if (Number.isFinite(Number(data.pages))) {
        pages = Number(data.pages);
      } else if (Number.isFinite(Number(data.total))) {
        pages = Math.max(1, Math.ceil(Number(data.total) / limit));
      } else {
        pages = 1;
      }
      page += 1;
    } while (page <= pages);

    return items;
  };

  const fetchRandomPaperAndQuestions = async () => {
    setLoading(true);
    setError("");
    try {
      const listRes = await apiClient.get(`/api/starting-paper-titles`);
      const arr = Array.isArray(listRes.data) ? listRes.data : [];
      if (arr.length === 0) throw new Error("No starting-paper titles found");
      const pick = arr[Math.floor(Math.random() * arr.length)];
      setPaper(pick);

      const all = await fetchAllQuestionsByPaperId(pick._id);
      const normalized = all.map((q) => ({ ...q, score: safeNumber(q.score, 1) }));
      setQuestions(normalized);

      const totalAvail = normalized.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
      setTotalAvailableMarks(totalAvail);

      // reset everything
      setStudentAnswers({});
      setEvaluationResults({});
      setIsSubmitted(false);
      setCategoryPayloads({});
      setCategoryPredictions({});
      setTotalCorrectMarks(0);
      setPercentage(0);

      setPracticeRound(0);
      setGenerating(false);
      setNextPaper([]);
      setNextAnswers({});
      setNextResults({});
      setNextSubmitted(false);
      setNextScore(0);
      setNextTotal(0);
      setPracticeHistory([]);
      setShowSummary(false);

      setLoading(false);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch starting paper.");
      setLoading(false);
    }
  };

  // ===== Original paper evaluation & predictions for first practice round =====
  const handleAnswerChange = (qid, value) => {
    if (isSubmitted) return;
    setStudentAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const submitAnswers = async () => {
    if (isSubmitted || questions.length === 0) return;

    let results = {};
    let correctMarks = 0;

    questions.forEach((q) => {
      const student = (studentAnswers[q._id] || "").trim();
      const correctAns = (q.correctanser || "").trim();
      const isCorrect = student !== "" && student === correctAns;

    results[q._id] = isCorrect;
      if (isCorrect) correctMarks += Number(q.score) || 0;
    });

    const pct = totalAvailableMarks > 0 ? (correctMarks / totalAvailableMarks) * 100 : 0;

    setEvaluationResults(results);
    setTotalCorrectMarks(Number(correctMarks.toFixed(2)));
    setPercentage(Number(pct.toFixed(2)));
    setIsSubmitted(true);

    const payloads = buildCategoryPayloadsFromOriginal(questions, results, studentAnswers);
    setCategoryPayloads(payloads);
    await predictForAllCategories(payloads); // predictions for next step (practice round 1)
  };

  // Build payloads using the original paper answers
  const buildCategoryPayloadsFromOriginal = (qs, results, answers) => {
    const byCat = {};
    qs.forEach((q) => {
      const cat = q.paperQuestioncategory || "General";
      if (!byCat[cat]) {
        byCat[cat] = { all: 0, answered: 0, wrong: 0, empty: 0 };
      }
      const st = byCat[cat];
      st.all += 1;

      const ans = (answers[q._id] || "").trim();
      if (ans === "") st.empty += 1;
      else {
        st.answered += 1;
        if (!results[q._id]) st.wrong += 1;
      }
    });

    const payloads = {};
    Object.keys(byCat).forEach((cat) => {
      const st = byCat[cat];
      payloads[cat] = {
        Category: cat,
        CategoryTimeLimit: st.all * PER_QUESTION_MINUTES,
        AnsweredQuestionCount: st.answered,
        AllocatedMarksPercentage: 100,
        WrongQuestionCount: st.wrong,
        EmptyQuestionCount: st.empty,
        AllQuestionCount: st.all,
      };
    });
    return payloads;
  };

  const predictForAllCategories = async (payloads) => {
    setPredicting(true);
    setCategoryPredictions({});
    try {
      const entries = Object.entries(payloads);
      const results = await Promise.all(
        entries.map(async ([cat, payload]) => {
          const resp = await apiClient.post(
            `http://127.0.0.1:5000/predict-required-questions`,
            payload
          );
          return [cat, resp.data];
        })
      );
      const mapped = results.reduce((acc, [cat, data]) => {
        acc[cat] = data;
        return acc;
      }, {});
      setCategoryPredictions(mapped);
    } catch (e) {
      console.error(e);
      Swal.fire({
        title: "Prediction Error",
        text: "Could not fetch predictions for categories.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setPredicting(false);
    }
  };

  // ===== Generate practice paper for current round via /predict-answer =====
  const handleGenerateNextPaperClick = async () => {
    if (practiceRound >= MAX_PRACTICE_ROUNDS) return;

    if (!isSubmitted) {
      Swal.fire({
        title: "Please submit",
        text: "Submit your answers first to compute category-wise predictions.",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }
    if (!categoryPredictions || Object.keys(categoryPredictions).length === 0) {
      Swal.fire({
        title: "No predictions yet",
        text: "We need category predictions before generating the next paper.",
        icon: "info",
        confirmButtonText: "OK",
      });
      return;
    }

    setGenerating(true);
    setNextPaper([]);
    setNextAnswers({});
    setNextResults({});
    setNextSubmitted(false);
    setNextScore(0);
    setNextTotal(0);

    try {
      const generated = [];
      const cats = Object.keys(categoryPredictions);

      for (const cat of cats) {
        const pred = categoryPredictions[cat] || {};
        const difficulty = pred.difficulty_level || "Easy";
        const countRaw = pred.predicted_required_questions;

        // NEW: clamp per-category generation to [0, 5]
        const need = Math.min(
          MAX_GEN_PER_CATEGORY,
          Math.max(MIN_GEN_PER_CATEGORY, Math.round(Number(countRaw) || 0))
        );

        for (let i = 0; i < need; i++) {
          const body = { prompt: `Skill : ${cat} | Difficulty: ${difficulty} ` };
          try {
            const r = await apiClient.post(`http://127.0.0.1:5000/predict-answer`, body);
            const txt = r?.data?.generated_text || r?.data?.full_text || "";
            const parsed = parseGeneratedQA(txt);
            if (parsed?.question && parsed?.options?.length) {
              generated.push({
                id: `${cat}_${difficulty}_${i}_${Date.now()}`,
                category: cat,
                difficulty,
                ...parsed,
                score: 1, // 1 mark per generated question
              });
            }
          } catch (e) {
            console.error("predict-answer failed", e);
          }
        }
      }

      if (generated.length === 0) {
        Swal.fire({
          title: "No questions generated",
          text: "The generator did not return usable questions.",
          icon: "info",
          confirmButtonText: "OK",
        });
        return;
      }

      setNextPaper(generated);
      setNextTotal(generated.reduce((s, q) => s + (q.score || 1), 0));
      setPracticeRound((r) => r + 1);
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Generation Error",
        text: "Could not generate the next paper.",
        icon: "error",
        confirmButtonText: "OK",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleNextAnswerChange = (qid, value) => {
    if (nextSubmitted) return;
    setNextAnswers((p) => ({ ...p, [qid]: value })); // A/B/C/D
  };

  // Build payloads from a generated practice paper's answers (for the NEXT round predictions)
  const buildCategoryPayloadsFromGenerated = (items, results, answers) => {
    const byCat = {};
    items.forEach((q) => {
      const cat = q.category || "General";
      if (!byCat[cat]) {
        byCat[cat] = { all: 0, answered: 0, wrong: 0, empty: 0 };
      }
      const st = byCat[cat];
      st.all += 1;

      const chosen = (answers[q.id] || "").trim(); // option key
      if (chosen === "") st.empty += 1;
      else {
        st.answered += 1;
        if (!results[q.id]) st.wrong += 1;
      }
    });

    const payloads = {};
    Object.keys(byCat).forEach((cat) => {
      const st = byCat[cat];
      payloads[cat] = {
        Category: cat,
        CategoryTimeLimit: st.all * PER_QUESTION_MINUTES,
        AnsweredQuestionCount: st.answered,
        AllocatedMarksPercentage: 100,
        WrongQuestionCount: st.wrong,
        EmptyQuestionCount: st.empty,
        AllQuestionCount: st.all,
      };
    });
    return payloads;
  };

  // NEW: update user suitability based on final average
  const updateUserSuitability = async (avgPercent) => {
    if (!userId) {
      console.warn("No userId in localStorage; skipping user update.");
      return;
    }
    const body =
      avgPercent > 60
        ? { suitabilityForCoding: 1, entranceTest: 1 }
        : { suitabilityForCoding: 0, entranceTest: 1 };

    try {
      await apiClient.put(`/api/users/${userId}`, body);
      Swal.fire({
        title: "User Updated",
        text:
          avgPercent > 60
            ? "Great job! Marked as suitable for coding."
            : "Recorded entrance test; keep practicing!",
        icon: "success",
        confirmButtonText: "OK",
      });
    } catch (e) {
      console.error("Failed to update user suitability:", e);
      Swal.fire({
        title: "Update Failed",
        text: "Could not update your profile at this time.",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const submitNextPaper = async () => {
    if (nextSubmitted || nextPaper.length === 0) return;

    let results = {};
    let score = 0;

    nextPaper.forEach((q) => {
      const chosenKey = (nextAnswers[q.id] || "").trim().toUpperCase();
      const isCorrect =
        chosenKey !== "" &&
        (q.correctKey ? chosenKey === q.correctKey.toUpperCase() : false);
      results[q.id] = isCorrect;
      if (isCorrect) score += Number(q.score) || 1;
    });

    setNextResults(results);
    setNextScore(score);
    setNextSubmitted(true);

    // add to history
    const total = nextPaper.reduce((s, q) => s + (q.score || 1), 0);
    const percent = total > 0 ? (score / total) * 100 : 0;
    const thisRound = { round: practiceRound, score, total, percent: Number(percent.toFixed(2)) };

    // Prepare a finalHistory for accurate calculation right away
    const finalHistory = [...practiceHistory, thisRound];
    setPracticeHistory(finalHistory);

    // If we reached round 3, show summary and update user based on final average %
    if (practiceRound >= MAX_PRACTICE_ROUNDS) {
      const avgPercent =
        finalHistory.reduce((s, x) => s + x.percent, 0) / finalHistory.length || 0;
      setShowSummary(true);
      await updateUserSuitability(avgPercent);
      return;
    }

    // Otherwise compute payloads from this generated paper & fetch new predictions for next round
    const payloads = buildCategoryPayloadsFromGenerated(nextPaper, results, nextAnswers);
    setCategoryPayloads(payloads);
    await predictForAllCategories(payloads);
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
            <p className="text-danger">{error}</p>
          ) : paper ? (
            <div className="paper-content">
              {/* Paper Header */}
              <div className="paper-header text-center">
                <h2>{paper.paperTytle}</h2>
                <p className="mb-1">
                  <strong>Paper No:</strong> {paper.paperNumber ?? "-"}{" "}
                  | <strong>Creator:</strong> {paper.createBy?.username ?? "-"}{" "}
                  | <strong>Created:</strong>{" "}
                  {paper.createdAt ? new Date(paper.createdAt).toLocaleDateString() : "-"}
                </p>
                <p className="mb-0">
                  <strong>Full Marks:</strong> {totalAvailableMarks}
                </p>
              </div>

              {/* Questions (answerable) */}
              <div className="question-section mt-4">
                {questions.length > 0 ? (
                  <ul className="question-list list-unstyled">
                    {questions.map((q, idx) => (
                      <li key={q._id} className="mb-4 p-3 bg-white rounded shadow-sm">
                        <p className="mb-2">
                          <strong>Q{idx + 1}:</strong> {q.paperQuestionTitle}{" "}
                          <span className="text-muted">({q.paperQuestioncategory})</span>{" "}
                          <span className="text-muted">[{q.score} mark{q.score === 1 ? "" : "s"}]</span>
                        </p>

                        <div>
                          {(Array.isArray(q.answers) ? q.answers : []).map((opt, i) => {
                            const inputId = `${q._id}_${i}`;
                            const checked = (studentAnswers[q._id] || "") === opt;
                            return (
                              <div className="form-check" key={inputId}>
                                <input
                                  className="form-check-input"
                                  type="radio"
                                  name={q._id}
                                  id={inputId}
                                  value={opt}
                                  disabled={isSubmitted}
                                  checked={checked}
                                  onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                                />
                                <label className="form-check-label" htmlFor={inputId}>
                                  {opt}
                                </label>
                              </div>
                            );
                          })}
                        </div>

                        {evaluationResults[q._id] !== undefined && (
                          <p
                            className={
                              evaluationResults[q._id] ? "text-success mt-2" : "text-danger mt-2"
                            }
                          >
                            {evaluationResults[q._id]
                              ? "Correct ✅"
                              : `Incorrect ❌ (Answer: ${q.correctanser})`}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No questions available.</p>
                )}
              </div>

              {/* Submit + Scores (original) */}
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

              {/* Category Predictions -> Generate Next Paper */}
              {isSubmitted && (
                <div className="mt-4">
                  <div className="d-flex align-items-center justify-content-between">
                    <h4 className="mb-3">Category Predictions</h4>
                    <span className="badge bg-secondary">
                      Practice Round: {practiceRound} / {MAX_PRACTICE_ROUNDS}
                    </span>
                  </div>

                  {predicting && <p>Predicting required questions per category…</p>}

                  {!predicting && Object.keys(categoryPayloads).length === 0 && (
                    <p className="text-muted">No categories found.</p>
                  )}

                  {!predicting && Object.keys(categoryPayloads).length > 0 && (
                    <div className="table-responsive">
                      <table className="table table-striped align-middle">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Allocated %</th>
                            <th>All Qs</th>
                            <th>Answered</th>
                            <th>Wrong</th>
                            <th>Empty</th>
                            <th>Difficulty</th>
                            <th>Predicted Required</th>
                            <th>Accuracy</th>
                            <th>Empty Rate</th>
                            <th>Marks OK</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.keys(categoryPayloads).map((cat) => {
                            const payload = categoryPayloads[cat];
                            const pred = categoryPredictions[cat] || {};
                            const details = pred.details || {};
                            const predictedNum = pred.predicted_required_questions;
                            const difficulty = pred.difficulty_level || "-";
                            const accuracy =
                              typeof details.accuracy === "number"
                                ? `${(details.accuracy * 100).toFixed(1)}%`
                                : "-";
                            const emptyRate =
                              typeof details.empty_rate === "number"
                                ? `${(details.empty_rate * 100).toFixed(1)}%`
                                : "-";
                            const marksOk =
                              typeof details.marks_ok === "boolean" ? (details.marks_ok ? "Yes" : "No") : "-";

                            return (
                              <tr key={cat}>
                                <td>{cat}</td>
                                <td>{payload.AllocatedMarksPercentage}%</td>
                                <td>{payload.AllQuestionCount}</td>
                                <td>{payload.AnsweredQuestionCount}</td>
                                <td>{payload.WrongQuestionCount}</td>
                                <td>{payload.EmptyQuestionCount}</td>
                                <td>{difficulty}</td>
                                <td>
                                  {typeof predictedNum === "number"
                                    ? `${predictedNum.toFixed(2)} (≈ ${Math.max(
                                        0,
                                        Math.round(predictedNum)
                                      )})`
                                    : "-"}
                                </td>
                                <td>{accuracy}</td>
                                <td>{emptyRate}</td>
                                <td>{marksOk}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Generate Next Paper */}
                  <div className="text-center mt-3">
                    <button
                      className="btn btn-success"
                      onClick={handleGenerateNextPaperClick}
                      disabled={
                        predicting ||
                        Object.keys(categoryPredictions).length === 0 ||
                        generating ||
                        practiceRound >= MAX_PRACTICE_ROUNDS
                      }
                    >
                      {generating
                        ? "Generating…"
                        : practiceRound === 0
                        ? "Generate Next Paper (1 / 3)"
                        : `Generate Next Paper (${practiceRound + 1} / ${MAX_PRACTICE_ROUNDS})`}
                    </button>
                  </div>
                </div>
              )}

              {/* Current Practice Paper */}
              {nextPaper.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-3">
                    Practice Paper {practiceRound} / {MAX_PRACTICE_ROUNDS}
                  </h3>
                  <p className="text-muted">
                    Total Questions: {nextPaper.length} | Total Marks: {nextTotal}
                  </p>
                  <ul className="list-unstyled">
                    {nextPaper.map((q, idx) => (
                      <li key={q.id} className="mb-4 p-3 bg-white rounded shadow-sm">
                        <p className="mb-2">
                          <strong>Q{idx + 1}:</strong> {q.question}{" "}
                          <span className="text-muted">
                            ({q.category} | {q.difficulty})
                          </span>{" "}
                          <span className="text-muted">[{q.score} mark{q.score === 1 ? "" : "s"}]</span>
                        </p>
                        <div>
                          {(Array.isArray(q.options) ? q.options : []).map((opt) => {
                            const inputId = `${q.id}_${opt.key}`;
                            const checked = (nextAnswers[q.id] || "") === opt.key;
                            return (
                              <div className="form-check" key={inputId}>
                                <input
                                  className="form-check-input"
                                  type="radio"
                                  name={q.id}
                                  id={inputId}
                                  value={opt.key}
                                  disabled={nextSubmitted}
                                  checked={checked}
                                  onChange={(e) => handleNextAnswerChange(q.id, e.target.value)}
                                />
                                <label className="form-check-label" htmlFor={inputId}>
                                  <strong>{opt.key}.</strong> {opt.text}
                                </label>
                              </div>
                            );
                          })}
                        </div>

                        {nextResults[q.id] !== undefined && (
                          <p className={nextResults[q.id] ? "text-success mt-2" : "text-danger mt-2"}>
                            {nextResults[q.id]
                              ? "Correct ✅"
                              : `Incorrect ❌ (Answer: ${q.correctKey || "-"})`}
                          </p>
                        )}
                        {q.explanation && nextResults[q.id] !== undefined && (
                          <p className="text-muted mb-0">
                            <em>Explanation:</em> {q.explanation}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* Submit Current Practice Paper */}
                  <div className="text-center mt-3">
                    <button
                      className="btn btn-primary"
                      onClick={submitNextPaper}
                      disabled={nextSubmitted || nextPaper.length === 0}
                    >
                      {nextSubmitted ? "Submitted" : "Submit Practice Paper"}
                    </button>

                    {nextSubmitted && (
                      <div className="mt-3">
                        <h5 className="text-success">
                          Correct Marks: {nextScore} / {nextTotal}
                        </h5>
                        <h5 className="text-primary">
                          Score: {nextTotal > 0 ? ((nextScore / nextTotal) * 100).toFixed(2) : "0"}%
                        </h5>
                        {practiceRound < MAX_PRACTICE_ROUNDS ? (
                          <p className="text-muted mt-2">
                            Predictions updated — you can generate the next paper above.
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Summary after 3 practice rounds */}
              {showSummary && practiceHistory.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-3">Practice Summary (3 rounds)</h3>
                  <div className="table-responsive">
                    <table className="table table-bordered align-middle">
                      <thead>
                        <tr>
                          <th>Round</th>
                          <th>Score</th>
                          <th>Total</th>
                          <th>Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {practiceHistory.map((r) => (
                          <tr key={r.round}>
                            <td>{r.round}</td>
                            <td>{r.score}</td>
                            <td>{r.total}</td>
                            <td>{r.percent}%</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th>Average</th>
                          <th>
                            {Math.round(
                              practiceHistory.reduce((s, x) => s + x.score, 0) / practiceHistory.length
                            )}
                          </th>
                          <th>
                            {Math.round(
                              practiceHistory.reduce((s, x) => s + x.total, 0) / practiceHistory.length
                            )}
                          </th>
                          <th>
                            {(
                              practiceHistory.reduce((s, x) => s + x.percent, 0) / practiceHistory.length
                            ).toFixed(2)}
                            %
                          </th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <p className="text-muted">
                    Tip: Use the “Generate Next Paper” flow again after restarting a new starting paper to continue practicing.
                  </p>
                </div>
              )}
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

export default StartingPaper;
