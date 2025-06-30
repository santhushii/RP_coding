import { Fragment, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Footer from "../component/layout/footer";
import Header from "../component/layout/header";
import PageHeader from "../component/layout/pageheader";
import apiClient from "../api";
import Swal from "sweetalert2";

const isNumeric = (s) => /^-?\d+(\.\d+)?$/.test(String(s).trim());
const normalize = (s) => String(s ?? "").trim().toLowerCase();
const LECTURE_TYPE = "kinesthetic"; // <-- for CompletedLecture.lectureType

const KinestheticLearningDetails = () => {
  const params = useParams();
  const activityId = params.id || params.kinestheticId || params.paperId;
  const [learningType, setLearningType] = useState(null);

  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [finalAnswer, setFinalAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);

  const userId = localStorage.getItem("userId");
  const hasPerfChecked = useRef(false);

  const tickerRef = useRef(null);
  const lectureCountBumpedRef = useRef(false);

  const [pyodide, setPyodide] = useState(null);
  const [engineLoading, setEngineLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [code, setCode] = useState("");
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const scriptRef = useRef(null);

  // completed-lectures state
  const [isCompleted, setIsCompleted] = useState(false);
  const completionMarkedRef = useRef(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiClient.get(`/api/kinesthetic/learning/${activityId}`);
        setActivity(res.data || null);
      } catch (e) {
        console.error(e);
        setError("Failed to load activity.");
      } finally {
        setLoading(false);
      }
    })();
  }, [activityId]);

  // Check if this activity is already completed
  useEffect(() => {
    const checkCompleted = async () => {
      if (!userId || !activityId) return;
      try {
        const res = await apiClient.get(`/api/completed-lectures/is-completed`, {
          params: { userId, lectureId: activityId, lectureType: LECTURE_TYPE },
        });
        const completed = !!res?.data?.completed;
        setIsCompleted(completed);
        if (completed) completionMarkedRef.current = true;
      } catch (e) {
        console.error("Failed checking completion:", e);
      }
    };
    checkCompleted();
  }, [userId, activityId]);

  useEffect(() => {
    if (hasPerfChecked.current || !userId) return;
    hasPerfChecked.current = true;
    (async () => {
      try {
        const res = await apiClient.get(`/api/student-performance/user/${userId}`);
        if (!res.data) {
          await apiClient.post("/api/student-performance", {
            userId,
            totalStudyTime: 0,
            totalScore: 0,
            paperCount: 0,
            averageScore: 0,
            lectureCount: 0,
          });
        }
      } catch (_) {}
    })();
  }, [userId]);

  async function ensureLearningTypeExists() {
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

  async function updateKinestheticLearningProgress(attemptPercent) {
    if (!userId) return;
    try {
      let lt = learningType;
      if (!lt?._id) {
        await ensureLearningTypeExists();
        const refetched = await apiClient.get(`/api/learning-type/user/${userId}`).catch(() => null);
        lt = refetched?.data?._id ? refetched.data : learningType;
      }
      if (!lt?._id) return;

      const payload = {
        kinestheticLearningCount: (lt.kinestheticLearningCount ?? 0) + 1,
        kinestheticLearningTotalPoint: (lt.kinestheticLearningTotalPoint ?? 0) + Math.round(attemptPercent),
      };

      const updated = await apiClient.put(`/api/learning-type/${lt._id}`, payload);
      setLearningType(updated?.data ?? { ...lt, ...payload });
    } catch (e) {
      console.error('Error updating learning-type (kinesthetic):', e);
    }
  }

  useEffect(() => {
    if (userId) {
      ensureLearningTypeExists();
    }
  }, [userId]);

  const getWeight = () => {
    const raw =
      activity?.difficulty ??
      activity?.activityDifficulty ??
      activity?.lectureDifficulty ??
      "Easy";
    const key = String(raw).trim().toLowerCase();
    const map = { easy: 1, medium: 1.2, hard: 1.5 };
    return map[key] ?? 1;
  };

  useEffect(() => {
    if (!userId || !activity) return;
    clearInterval(tickerRef.current);

    const weight = getWeight();
    tickerRef.current = setInterval(async () => {
      try {
        const res = await apiClient.get(`/api/student-performance/user/${userId}`);
        const sp = res?.data || {};
        await apiClient.put(`/api/student-performance/user/${userId}`, {
          totalStudyTime: (sp.totalStudyTime ?? 0) + weight,
          totalScore: sp.totalScore ?? 0,
          paperCount:   sp.paperCount ?? 0,
          averageScore: sp.averageScore ?? 0,
          lectureCount: sp.lectureCount ?? 0,
        });
      } catch (e) {
        console.error("Weighted study-time tick failed:", e);
      }
    }, 60000);

    return () => clearInterval(tickerRef.current);
  }, [activity, userId]);

  useEffect(() => {
    const bumpOnce = async () => {
      if (!userId || !activity || lectureCountBumpedRef.current) return;
      try {
        const res = await apiClient.get(`/api/student-performance/user/${userId}`);
        const sp = res?.data || {};
        await apiClient.put(`/api/student-performance/user/${userId}`, {
          totalStudyTime: sp.totalStudyTime ?? 0,
          totalScore:     sp.totalScore ?? 0,
          paperCount:     sp.paperCount ?? 0,
          averageScore:   sp.averageScore ?? 0,
          lectureCount:  (sp.lectureCount ?? 0) + 1,
        });
        lectureCountBumpedRef.current = true;
      } catch (e) {
        console.error("Failed to bump lectureCount:", e);
      }
    };
    bumpOnce();
  }, [activity, userId]);

  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
    s.onload = async () => {
      try {
        const p = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
        });
        setPyodide(p);
      } catch (e) {
        console.error(e);
      } finally {
        setEngineLoading(false);
      }
    };
    s.onerror = () => setEngineLoading(false);
    scriptRef.current = s;
    document.body.appendChild(s);
    return () => {
      if (scriptRef.current) document.body.removeChild(scriptRef.current);
    };
  }, []);

  const runCode = async () => {
    if (!pyodide) return;
    setRunning(true);
    setStdout("");
    setStderr("");
    try {
      pyodide.globals.set("USER_CODE", code ?? "");
      await pyodide.runPythonAsync(`
import builtins, io, sys
from contextlib import redirect_stdout, redirect_stderr
from js import window

def _my_input(prompt_text=""):
    val = window.prompt(prompt_text)
    return "" if val is None else str(val)

builtins.input = _my_input

_stdout = io.StringIO()
_stderr = io.StringIO()
with redirect_stdout(_stdout), redirect_stderr(_stderr):
    try:
        exec(USER_CODE, {})
    except Exception:
        import traceback; traceback.print_exc()

RESULT_STDOUT = _stdout.getvalue()
RESULT_STDERR = _stderr.getvalue()
      `);
      const out = pyodide.globals.get("RESULT_STDOUT");
      const err = pyodide.globals.get("RESULT_STDERR");
      setStdout(out.toString());
      setStderr(err.toString());
      out.destroy && out.destroy();
      err.destroy && err.destroy();
    } catch (e) {
      setStderr(String(e));
    } finally {
      setRunning(false);
    }
  };

  // POST to completed-lectures (idempotent backend recommended)
  const markThisActivityCompleted = async () => {
    if (!userId || !activityId || completionMarkedRef.current) return;
    try {
      await apiClient.post(`/api/completed-lectures`, {
        userId,
        lectureId: activityId,
        lectureType: LECTURE_TYPE,
        completedAt: new Date().toISOString(),
      });
      completionMarkedRef.current = true;
      setIsCompleted(true);
      Swal.fire({
        icon: "success",
        title: "Passed! ✅",
        text: "You scored above 75%. This activity is now marked as completed.",
        timer: 1600,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error("Failed to mark completed:", e);
    }
  };

  const submitAnswer = async () => {
    if (!activity) return;
    if (checked) return;

    const expected = activity.answer ?? "";

    let correct = false;
    const a = String(finalAnswer ?? "").trim();
    const b = String(expected ?? "").trim();

    if (isNumeric(a) && isNumeric(b)) {
      const A = Number(a), B = Number(b);
      correct = Math.abs(A - B) < 1e-9;
    } else {
      correct = normalize(a) === normalize(b);
    }

    setChecked(true);
    setIsCorrect(correct);

    // attempt percentage (single final answer -> 100% or 0%)
    const attemptPercent = correct ? 100 : 0;

    // update kinesthetic learning stats
    await updateKinestheticLearningProgress(attemptPercent);

    // NEW: mark completed if > 75% and not already completed
    if (attemptPercent > 75 && !isCompleted && !completionMarkedRef.current) {
      await markThisActivityCompleted();
    }

    if (correct && userId) {
      try {
        const response = await apiClient.get(`/api/student-performance/user/${userId}`);
        if (response.data) {
          const sp = response.data;
          await apiClient.put(`/api/student-performance/user/${userId}`, {
            totalStudyTime: sp.totalStudyTime ?? 0,
            totalScore: (sp.totalScore ?? 0) + 1,
            paperCount: (sp.paperCount ?? 0) + 1,
            averageScore: sp.averageScore ?? 0,
            lectureCount: sp.lectureCount ?? 0,
          });
        } else {
          await apiClient.post("/api/student-performance", {
            userId,
            totalStudyTime: 0,
            totalScore: 1,
            paperCount: 1,
            averageScore: 0,
            lectureCount: 0,
          });
        }
        Swal.fire({
          icon: "success",
          title: "Great job!",
          text: "Answer is correct. Score updated by +1.",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (e) {
        console.error(e);
        Swal.fire({
          icon: "warning",
          title: "Correct, but…",
          text: "We couldn’t update your score this time.",
        });
      }
    } else if (!correct) {
      Swal.fire({
        icon: "info",
        title: "Keep trying!",
        text: "That wasn’t the expected answer. Check your code/output and try again.",
      });
    }
  };

  if (loading) {
    return (
      <Fragment>
        <Header />
        <PageHeader title="Kinesthetic Activity" curPage={"Details"} />
        <div className="container py-5">Loading activity…</div>
        <Footer />
      </Fragment>
    );
  }

  if (error || !activity) {
    return (
      <Fragment>
        <Header />
        <PageHeader title="Kinesthetic Activity" curPage={"Details"} />
        <div className="container py-5">{error || "Activity not found."}</div>
        <Footer />
      </Fragment>
    );
  }

  const guide = activity.TeacherGuideId?.coureInfo;
  const created = activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : "—";

  return (
    <Fragment>
      <Header />
      <PageHeader title="Kinesthetic Activity" curPage={"Details"} />

      <div className="paper-section padding-tb section-bg">
        <div className="container">
          {/* Header */}
          <div className="paper-content">
            <div className="paper-header text-center mb-4">
              <h2>
                {activity.title || "Kinesthetic Activity"}
                {isCompleted && (
                  <span className="badge bg-success ms-2 align-middle">Completed</span>
                )}
              </h2>
              <p className="mb-0">
                {guide && (<><strong>Guide:</strong> {guide} &nbsp;|&nbsp; </>)}
                <strong>Created:</strong> {created}
              </p>
            </div>

            {/* Task */}
            <div className="row g-3">
              <div className="col-12 col-lg-6">
                <div className="card h-100">
                  <div className="card-body">
                    <h5 className="card-title mb-2">Question</h5>
                    <p className="card-text">{activity.Question || "—"}</p>
                    <hr />
                    <h6 className="mb-2">Instruction</h6>
                    <p className="mb-0">{activity.Instructuion || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Compiler */}
              <div className="col-12 col-lg-6">
                <div className="card h-100">
                  <div className="card-body">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <h5 className="card-title mb-0">Python Inbuilt Compiler</h5>
                      <span className="text-muted small">Run code to help solve the task</span>
                      <button
                        className="btn btn-primary ms-auto"
                        onClick={runCode}
                        disabled={!pyodide || running}
                      >
                        {running ? "Running…" : "Run ▶"}
                      </button>
                    </div>

                    {engineLoading && (
                      <div className="alert alert-warning py-2">Loading Python engine…</div>
                    )}
                    {!engineLoading && !pyodide && (
                      <div className="alert alert-danger py-2">
                        Couldn’t load the Python engine. Check your internet connection.
                      </div>
                    )}

                    <textarea
                      className="form-control mb-3"
                      style={{
                        height: 260,
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
                        fontSize: 14,
                        lineHeight: 1.45,
                      }}
                      spellCheck={false}
                      placeholder={`# Write Python here. Example:
  total = 0
  for _ in range(20):
      total = 1 + total
  print(total)  # should print 20`}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />

                    <div className="mb-1 fw-semibold">Output</div>
                    <pre
                      className="p-3 rounded-3"
                      style={{ background: "#f7fbff", border: "1px solid #e6f0ff", minHeight: 100, whiteSpace: "pre-wrap" }}
                    >
{stdout || " "}
                    </pre>

                    {stderr && (
                      <>
                        <div className="mb-1 fw-semibold text-danger">Errors</div>
                        <pre
                          className="p-3 rounded-3"
                          style={{ background: "#fff6f6", border: "1px solid #ffd3d3", color: "#9b0c0c", whiteSpace: "pre-wrap" }}
                        >
{stderr}
                        </pre>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Final answer input */}
            <div className="card mt-4">
              <div className="card-body">
                <h5 className="card-title mb-3">Submit Your Final Answer</h5>
                <div className="row g-2 align-items-center">
                  <div className="col-sm-8">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g., 20"
                      value={finalAnswer}
                      onChange={(e) => setFinalAnswer(e.target.value)}
                    />
                  </div>
                  <div className="col-sm-4 text-sm-start text-end">
                    <button className="btn btn-success" onClick={submitAnswer} disabled={!finalAnswer.trim()}>
                      Submit
                    </button>
                  </div>
                </div>

                {checked && (
                  <div className={`mt-3 alert ${isCorrect ? "alert-success" : "alert-warning"}`}>
                    {isCorrect ? "Correct ✅ Well done!" : "Not quite. Try again ❌"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </Fragment>
  );
};

export default KinestheticLearningDetails;
