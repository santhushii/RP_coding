import React, { Fragment, useEffect, useState, useRef } from 'react';
import { useParams } from "react-router-dom";
import Footer from "../component/layout/footer";
import Header from "../component/layout/header";
import PageHeader from "../component/layout/pageheader";
import apiClient from "../api";
import Swal from "sweetalert2";
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const typeLabels = {
  1: "Video Lectures",
  2: "Practical",
  3: "Reading",
};

const LECTURE_TYPE = "visual"; // what we store in CompletedLecture. Keep consistent.

// --- helpers for fuzzy grading ---
const STOPWORDS = new Set([
  "a","an","and","are","as","at","be","but","by","for","from","has","have","he","in",
  "is","it","its","of","on","that","the","to","was","were","will","with","when","what","why","how"
]);

const norm = (s="") =>
  String(s).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const tokens = (s) => norm(s).split(" ").filter(w => w && !STOPWORDS.has(w) && w.length > 1);

const jaccard = (a, b) => {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (A.size === 0 || B.size === 0) return norm(a) === norm(b) ? 1 : 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = new Set([...A, ...B]).size;
  return inter / union;
};

const containsEither = (a, b) => {
  const A = norm(a), B = norm(b);
  if (!A || !B) return false;
  return A.includes(B) || B.includes(A);
};

const numericEqual = (a, b) => {
  const na = norm(a), nb = norm(b);
  return na === nb && !!na && /^\d+([.,]\d+)?$/.test(na);
};

const VisualLearningView = () => {
  const { id } = useParams();
  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewFull, setViewFull] = useState(false);
  const userId = localStorage.getItem("userId");
  const intervalRef = useRef(null);
  const [icon, setIcon] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackList, setFeedbackList] = useState([]);
  const [ratingValue, setRatingValue] = useState(5);
  const [learningType, setLearningType] = useState(null);

  // derive duration from video metadata (in minutes)
  const videoRef = useRef(null);
  const [durationMinutes, setDurationMinutes] = useState(null);

  // active PDF preview (if provided)
  const [activePdf, setActivePdf] = useState(null);

  // Q&A state
  const [qaList, setQaList] = useState([]);
  const [answers, setAnswers] = useState({});
  const [qaResults, setQaResults] = useState({});
  const [checking, setChecking] = useState(false);

  const hasFetched = useRef(false);

  // Completed lecture state
  const [isCompleted, setIsCompleted] = useState(false);
  const completionMarkedRef = useRef(false); // ensure single POST

  // ensure we only bump lectureCount once
  const lectureCountBumpedRef = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetchLecture();
    fetchQAs();
    ensureStudentPerformanceExists();
    fetchFeedbacks();
    ensureLearningTypeExists();
  }, []); // eslint-disable-line

  // Check if this lecture is already marked as completed for this user
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
        console.error("Failed to check completion:", e);
      }
    };
    checkCompleted();
  }, [userId, id]);

  // Minute ticker: totalStudyTime += weight (1, 1.2, 1.5) up to video duration
  useEffect(() => {
    if (!userId || !lecture || !Number.isFinite(durationMinutes)) return;

    const diffKey = (lecture.lectureDifficulty || 'Easy').toString().trim().toLowerCase();
    const weightMap = { easy: 1, medium: 1.2, hard: 1.5 };
    const weight = weightMap[diffKey] ?? 1;

    const maxMinutes = Math.max(1, Math.ceil(durationMinutes));
    let elapsedMinutes = 0;
    clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      elapsedMinutes += 1;
      try {
        if (elapsedMinutes <= maxMinutes) {
          const response = await apiClient.get(`/api/student-performance/user/${userId}`);
          const sp = response?.data || {};

          await apiClient.put(`/api/student-performance/user/${userId}`, {
            totalStudyTime: (sp.totalStudyTime ?? 0) + weight,
            totalScore: sp.totalScore ?? 0,
            paperCount: sp.paperCount ?? 0,
            averageScore: sp.averageScore ?? 0,
            lectureCount: sp.lectureCount ?? 0,
          });
        } else {
          clearInterval(intervalRef.current);
        }
      } catch (error) {
        console.error("Error updating weighted study time:", error);
      }
    }, 60000);

    return () => clearInterval(intervalRef.current);
  }, [lecture, userId, durationMinutes]);

  // Bump lectureCount by +1 once the lecture is loaded
  useEffect(() => {
    const bumpLectureCountOnce = async () => {
      if (!userId || !lecture || lectureCountBumpedRef.current) return;
      try {
        const res = await apiClient.get(`/api/student-performance/user/${userId}`);
        const sp = res?.data || {};
        await apiClient.put(`/api/student-performance/user/${userId}`, {
          totalStudyTime: sp.totalStudyTime ?? 0,
          totalScore: sp.totalScore ?? 0,
          paperCount: sp.paperCount ?? 0,
          averageScore: sp.averageScore ?? 0,
          lectureCount: (sp.lectureCount ?? 0) + 1,
        });
        lectureCountBumpedRef.current = true;
      } catch (e) {
        console.error("Error bumping lectureCount:", e);
      }
    };
    bumpLectureCountOnce();
  }, [lecture, userId]);

  const fetchLecture = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/visual/learning/${id}`);
      const data = response.data || {};
      setLecture({
        ...data,
        lectureTytle: data.title || "Visual Learning Lecture",
        lectureDifficulty: data.lectureDifficulty || "Easy",
        lectureType: data.lectureType ?? 1,
        description: data.description || "",
        pdfMaterials: Array.isArray(data.pdfMaterials) ? data.pdfMaterials : [],
      });
      if (Array.isArray(data?.pdfMaterials) && data.pdfMaterials.length > 0) {
        setActivePdf(data.pdfMaterials[0]);
      } else {
        setActivePdf(null);
      }
    } catch (error) {
      console.error("Error fetching visual lecture:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQAs = async () => {
    try {
      const res = await apiClient.get(`/api/visual/qanda/visualId/${id}`);
      const list = Array.isArray(res.data) ? res.data : [];
      setQaList(list);
      const initial = {};
      list.forEach(q => { initial[q._id] = ""; });
      setAnswers(initial);
      setQaResults({});
    } catch (err) {
      console.error("Error fetching Q&A:", err);
      setQaList([]);
      setAnswers({});
      setQaResults({});
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const res = await apiClient.get(`/api/feedbacks/video/${id}`);
      setFeedbackList(res.data);
    } catch {
      setFeedbackList([]);
    }
  };

  // Ensure baseline SP exists (no resourceScore here)
  const ensureStudentPerformanceExists = async () => {
    if (!userId) return;
    try {
      const response = await apiClient.get(`/api/student-performance/user/${userId}`);
      if (!response.data) {
        await apiClient.post("/api/student-performance", {
          userId,
          totalStudyTime: 0,
          totalScore: 0,
          paperCount: 0,
          averageScore: 0,
          lectureCount: 0,
        });
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        try {
          await apiClient.post("/api/student-performance", {
            userId,
            totalStudyTime: 0,
            totalScore: 0,
            paperCount: 0,
            averageScore: 0,
            lectureCount: 0,
          });
        } catch (e2) {
          console.error("Error creating baseline student performance:", e2);
        }
      } else {
        console.error("Error checking/updating student performance:", error);
      }
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    const tgId = lecture?.teacherGuideId?._id;

    if (!tgId) {
      Swal.fire({
        icon: 'warning',
        title: 'No Teacher Guide',
        text: 'This lecture has no attached teacher guide to leave feedback on.',
      });
      return;
    }
    if (!feedbackText.trim()) return;

    setSubmittingFeedback(true);
    try {
      await apiClient.post('/api/teacher-guide-feedbacks', {
        teacherGuideId: tgId,
        studentFeedback: feedbackText.trim(),
      });

      Swal.fire({
        icon: 'success',
        title: 'Thanks for your feedback!',
        showConfirmButton: false,
        timer: 1500,
      });
      setFeedbackText('');
      fetchFeedbacks();
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: 'Could not submit feedback. Please try again.',
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Mark this lecture as completed via API (idempotent on backend)
  const markThisLectureCompleted = async () => {
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
    } catch (e) {
      console.error("Failed to mark lecture completed:", e);
    }
  };

  // --- Q&A grading ---
  const handleCheckAnswers = async () => {
    setChecking(true);
    try {
      const results = {};
      let correctCount = 0;

      for (const q of qaList) {
        const userA = answers[q._id] || "";
        const gold = q.questionAnswer || "";

        let status = "incorrect";
        let sim = jaccard(userA, gold);

        if (numericEqual(userA, gold) || norm(userA) === norm(gold) || containsEither(userA, gold)) {
          status = "correct";
        } else if (sim >= 0.7) {
          status = "correct";
        } else if (sim >= 0.45) {
          status = "partial";
        } else {
          status = "incorrect";
        }

        if (status === "correct") correctCount += 1;
        results[q._id] = { status, similarity: Number(sim.toFixed(2)) };
      }

      setQaResults(results);

      const total = qaList.length;
      const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      const passed = percent > 75; // strictly "more than 75%"

      const title =
        correctCount === total
          ? "Perfect! 🎉"
          : passed
          ? "Great job! ✅"
          : correctCount > 0
          ? "Keep going! 💪"
          : "Let’s review 🔁";

      Swal.fire({
        icon: correctCount === total ? 'success' : passed ? 'success' : correctCount > 0 ? 'info' : 'warning',
        title,
        text: `You got ${correctCount} out of ${total} correct (${percent}%).`,
      });

      // Mark as completed if passed and not already marked
      if (passed && !isCompleted && !completionMarkedRef.current) {
        await markThisLectureCompleted();
      }

      // Update learning-type stats (count + percentage points)
      await updateVisualLearningProgress(correctCount, total);
    } finally {
      setChecking(false);
    }
  };

  const handleResetAnswers = () => {
    const cleared = {};
    qaList.forEach(q => { cleared[q._id] = ""; });
    setAnswers(cleared);
    setQaResults({});
  };

  const ensureLearningTypeExists = async () => {
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
  };

  // Update progress after a check/submit
  const updateVisualLearningProgress = async (correctCount, total) => {
    if (!userId) return;

    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    try {
      let lt = learningType;
      if (!lt?._id) {
        await ensureLearningTypeExists();
        lt = learningType;
        if (!lt?._id) {
          const refetched = await apiClient.get(`/api/learning-type/user/${userId}`).catch(() => null);
          lt = refetched?.data?._id ? refetched.data : lt;
        }
      }
      if (!lt?._id) return;

      const payload = {
        visualLearningCount: (lt.visualLearningCount ?? 0) + 1,
        visualLearningTotalPoint: (lt.visualLearningTotalPoint ?? 0) + percent,
      };

      const updated = await apiClient.put(`/api/learning-type/${lt._id}`, payload);
      setLearningType(updated?.data ?? { ...lt, ...payload });
    } catch (e) {
      console.error('Error updating learning-type progress:', e);
    }
  };

  const hasTeacherGuide = Boolean(lecture?.teacherGuideId?._id);

  if (loading) {
    return <div className="text-center p-5">Loading...</div>;
  }
  if (!lecture) {
    return <div className="text-center p-5">Lecture Not Found</div>;
  }

  return (
    <Fragment>
      <Header />
      <PageHeader title={lecture.lectureTytle || lecture.title || 'Visual Learning'} curPage={'Course View'} />

      <div className="course-view-section padding-tb section-bg">
        <div className="container">
          <div className="row">
            <div className="col-12">
              <div className="course-view">
                <div className="row justify-content-center">
                  <div className="col-lg-9 col-12">
                    <div className="video-part mb-4 mb-lg-0">
                      <div className="vp-title mb-4">
                        <h3>
                          {lecture.lectureTytle || lecture.title}
                          {isCompleted && <span className="badge bg-success ms-2 align-middle">Completed</span>}
                        </h3>
                      </div>

                      <div className="vp-video mb-4">
                        <video
                          ref={videoRef}
                          controls
                          onLoadedMetadata={() => {
                            if (videoRef.current && Number.isFinite(videoRef.current.duration)) {
                              setDurationMinutes(videoRef.current.duration / 60);
                            }
                          }}
                        >
                          <source src={lecture.videoUrl} type="video/mp4" />
                        </video>
                      </div>

                      <div className={`content-wrapper ${icon ? "open" : ""}`}>
                        <div className="content-icon d-lg-none" onClick={() => setIcon(!icon)}>
                          <i className="icofont-caret-down"></i>
                        </div>
                        {lecture.description ? (
                          <div className="vp-content mb-5">
                            <h4>Introduction</h4>
                            <p>{lecture.description}</p>
                          </div>
                        ) : null}
                      </div>

                      {/* Materials (PDF) */}
                      {Array.isArray(lecture.pdfMaterials) && lecture.pdfMaterials.length > 0 && (
                        <div className="card mt-4 p-3">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <h5 className="mb-0">Materials (PDF)</h5>
                          </div>

                          <ul className="list-unstyled mb-3">
                            {lecture.pdfMaterials.map((url) => (
                              <li key={url} className="d-flex align-items-center justify-content-between py-2 border-bottom">
                                <div className="me-2">
                                  <i className="icofont-file-pdf me-2"></i>
                                  <span className="text-break">{new URL(url).pathname.split('/').filter(Boolean).pop()}</span>
                                </div>
                                <div className="d-flex gap-2">
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${activePdf === url ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setActivePdf(url)}
                                    title="Preview"
                                  >
                                    Preview
                                  </button>
                                  <a className="btn btn-sm btn-outline-secondary" href={url} target="_blank" rel="noopener noreferrer" title="Open in new tab">
                                    Open
                                  </a>
                                  <a className="btn btn-sm btn-outline-success" href={url} target="_blank" rel="noopener noreferrer" download title="Download">
                                    Download
                                  </a>
                                </div>
                              </li>
                            ))}
                          </ul>

                          {activePdf && (
                            <div className="ratio ratio-16x9">
                              <iframe src={`${activePdf}#view=FitH`} title="PDF Preview" style={{ border: 0 }} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Practice Q&A */}
                      {qaList.length > 0 && (
                        <div className="card mt-4 p-3">
                          <div className="d-flex align-items-center justify-content-between">
                            <h5 className="mb-0">
                              Practice Q&A
                              {isCompleted && <span className="badge bg-success ms-2">Completed</span>}
                            </h5>
                            <div className="d-flex gap-2">
                              <button className="btn btn-sm btn-primary" onClick={handleCheckAnswers} disabled={checking}>
                                {checking ? 'Checking…' : 'Check Answers'}
                              </button>
                              <button className="btn btn-sm btn-outline-secondary" onClick={handleResetAnswers} disabled={checking}>
                                Reset
                              </button>
                            </div>
                          </div>
                          <small className="text-muted mt-1">Free-text answers accepted. We’ll auto-check using exact/substring and semantic overlap.</small>

                          <ol className="mt-3">
                            {qaList.map((q) => {
                              const res = qaResults[q._id];
                              const badge = res?.status === 'correct'
                                ? 'badge bg-success'
                                : res?.status === 'partial'
                                ? 'badge bg-warning text-dark'
                                : res?.status === 'incorrect'
                                ? 'badge bg-danger'
                                : 'badge bg-light text-dark';

                              const label =
                                res?.status === 'correct' ? 'Correct' :
                                res?.status === 'partial' ? 'Almost there' :
                                res?.status === 'incorrect' ? 'Incorrect' : 'Not checked';

                              return (
                                <li key={q._id} className="mb-3">
                                  <div className="d-flex align-items-start justify-content-between">
                                    <div className="me-2">
                                      <strong className="d-block mb-1">{q.questionTytle}</strong>
                                      <span className="text-muted small">
                                        Topic: {q.topicTag || 'general'} · Score: {q.score ?? 0}
                                      </span>
                                    </div>
                                    <span className={badge} title={res?.similarity != null ? `Similarity: ${res.similarity}` : ''}>
                                      {label}{res?.similarity != null ? ` (${res.similarity})` : ''}
                                    </span>
                                  </div>

                                  <textarea
                                    className="form-control mt-2"
                                    rows={3}
                                    value={answers[q._id] || ""}
                                    onChange={(e) => setAnswers(prev => ({ ...prev, [q._id]: e.target.value }))}
                                    placeholder="Type your answer..."
                                  />

                                  {res && res.status !== 'correct' && (
                                    <div className="alert alert-light border mt-2 mb-0">
                                      <div className="small text-muted">Reference answer</div>
                                      <div>{q.questionAnswer}</div>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ol>
                        </div>
                      )}

                      {/* Feedback form */}
                      <div className="card mt-4 p-3">
                        <h5>Leave Feedback {hasTeacherGuide && lecture.teacherGuideId?.coureInfo ? `for: ${lecture.teacherGuideId.coureInfo}` : ''}</h5>
                        {!hasTeacherGuide && (
                          <div className="alert alert-warning mb-3">
                            This lecture has no attached teacher guide, so feedback can’t be submitted.
                          </div>
                        )}
                        <form onSubmit={handleFeedbackSubmit}>
                          <textarea
                            className="form-control mb-2"
                            rows={3}
                            value={feedbackText}
                            onChange={e => setFeedbackText(e.target.value)}
                            placeholder="Write your feedback to the teacher/guide..."
                            disabled={submittingFeedback || !hasTeacherGuide}
                            required
                          />
                          <button
                            className="btn btn-success"
                            type="submit"
                            disabled={submittingFeedback || !feedbackText.trim() || !hasTeacherGuide}
                          >
                            {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                          </button>
                        </form>
                      </div>

                      {/* Previous feedbacks */}
                      {feedbackList.length > 0 && (
                        <div className="card mt-3 p-3">
                          <h6 className="mb-3">Feedback from Students</h6>
                          <ul className="list-unstyled">
                            {feedbackList.map((fb, idx) => (
                              <li key={idx} className="mb-2 border-bottom pb-2">
                                <strong>{fb.userId?.username || 'Student'}</strong>:
                                <br />
                                <span>
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <span
                                      key={star}
                                      style={{
                                        color: fb.rating >= star ? '#FFD700' : '#ddd',
                                        fontSize: '1.2em',
                                        marginRight: '1px'
                                      }}
                                    >
                                      ★
                                    </span>
                                  ))}
                                </span>
                                <br />
                                <span>{fb.feedback}</span>
                                <div style={{ fontSize: '0.8em', color: '#888' }}>
                                  {new Date(fb.createdAt).toLocaleString()}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overview-announce-section padding-tb">
        <div className="container">
          <div className="row">
            <div className="col-12">
              <div className="course-view-bottom">
                <div className="tab-content" id="myTabContent">
                  <div className="tab-pane fade show active" id="overview" role="tabpanel" aria-labelledby="overview-tab">
                    <div className="overview-area">
                      <div className="overview-head mb-4">
                        <h6 className="mb-0">About this Lecture</h6>
                      </div>
                      <div className="overview-body">
                        <ul className="lab-ul">
                          <li className="d-flex flex-wrap">
                            <div className="overview-left">
                              <p className="mb-0">More Details</p>
                            </div>
                            <div className="overview-right">
                              <div className="or-items d-flex flex-wrap">
                                <div className="or-left mr-3">Skill level</div>
                                <div className="or-right">{(lecture.lectureDifficulty || 'Easy')} Level</div>
                              </div>
                              <div className="or-items d-flex flex-wrap">
                                <div className="or-left mr-3">Lecture Type</div>
                                <div className="or-right">{typeLabels[lecture.lectureType] || 'Video Lectures'}</div>
                              </div>
                              <div className="or-items d-flex flex-wrap">
                                <div className="or-left mr-3">Languages</div>
                                <div className="or-right">English</div>
                              </div>
                              <div className="or-items d-flex flex-wrap">
                                <div className="or-left mr-3">Max Time</div>
                                <div className="or-right">
                                  {Number.isFinite(durationMinutes)
                                    ? `${Math.ceil(durationMinutes)} minute${Math.ceil(durationMinutes) === 1 ? '' : 's'}`
                                    : '—'}
                                </div>
                              </div>
                              <div className="or-items d-flex flex-wrap">
                                <div className="or-left mr-3">Created By</div>
                                <div className="or-right">{lecture.createby?.username || 'Unknown'}</div>
                              </div>
                              {lecture.teacherGuideId?.coureInfo && (
                                <div className="or-items d-flex flex-wrap">
                                  <div className="or-left mr-3">Teacher Guide</div>
                                  <div className="or-right">{lecture.teacherGuideId.coureInfo}</div>
                                </div>
                              )}
                            </div>
                          </li>

                          {(lecture.description && lecture.description.trim()) ? (
                            <li className={`d-flex flex-wrap rajib ${viewFull ? "fullview" : ""}`}>
                              <div className="overview-left">
                                <p className="mb-0">Description</p>
                              </div>
                              <div className="overview-right overview-description">
                                <p className="description mb-3">{lecture.description}</p>
                              </div>
                              <div className="view-details">
                                <span className="more" onClick={() => setViewFull(!viewFull)}>+ See More</span>
                                <span className="less" onClick={() => setViewFull(!viewFull)}>- See Less</span>
                              </div>
                            </li>
                          ) : null}
                        </ul>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </Fragment>
  );
};

export default VisualLearningView;
