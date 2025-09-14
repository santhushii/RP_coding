import React, { Fragment, useEffect, useState, useRef } from 'react';
import { useParams } from "react-router-dom";
import Footer from "../component/layout/footer";
import Header from "../component/layout/header";
import PageHeader from "../component/layout/pageheader";
import apiClient from "../api";
import Swal from "sweetalert2";

const typeLabels = {
  1: "Audio Lesson",
  2: "Practical",
  3: "Reading",
};

// use weighted minutes: 1 / 1.2 / 1.5
const difficultyWeight = { Easy: 1, Medium: 1.2, Hard: 1.5 };
const LECTURE_TYPE = "auditory"; // <-- CompletedLecture.lectureType string

const AuditoryLearningView = () => {
  const { id } = useParams();
  const [learningType, setLearningType] = useState(null);

  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);

  // audio
  const audioRef = useRef(null);
  const [durationMinutes, setDurationMinutes] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playBlocked, setPlayBlocked] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

  // Q&A (PaperDetails style)
  const [qaList, setQaList] = useState([]);
  const [studentAnswers, setStudentAnswers] = useState({});
  const [evaluationResults, setEvaluationResults] = useState({});
  const [totalCorrectMarks, setTotalCorrectMarks] = useState(0);
  const [totalAvailableMarks, setTotalAvailableMarks] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // feedback
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackList, setFeedbackList] = useState([]);

  const hasFetched = useRef(false);
  const userId = localStorage.getItem("userId");
  const intervalRef = useRef(null);

  // ensure we only add +1 lectureCount once
  const lectureCountBumpedRef = useRef(false);

  // completed lecture state
  const [isCompleted, setIsCompleted] = useState(false);
  const completionMarkedRef = useRef(false); // ensures single POST

  // initial fetch
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchLecture();
    fetchQAs();
    fetchFeedbacks();
    ensureStudentPerformance();
    ensureLearningTypeExists();
  }, []); // eslint-disable-line

  // check completion status on mount / id change
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

  // study-time ticker (add +weight per minute, no resourceScore here)
  useEffect(() => {
    if (!userId || !lecture || !Number.isFinite(durationMinutes)) return;

    const weight =
      difficultyWeight[lecture.lectureDifficulty || "Easy"] ?? 1;

    const maxMinutes = Math.max(1, Math.floor(durationMinutes));
    let elapsedTime = 0;

    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      elapsedTime += 1;
      try {
        if (elapsedTime <= maxMinutes) {
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
      } catch (e) {
        console.error("Study time update failed:", e);
      }
    }, 60000);

    return () => clearInterval(intervalRef.current);
  }, [lecture, userId, durationMinutes]);

  // bump lectureCount +1 once when lecture loads
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
        console.error("Failed to bump lectureCount:", e);
      }
    };
    bumpLectureCountOnce();
  }, [lecture, userId]);

  // fetchers
  const fetchLecture = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/auditory/learning/${id}`);
      const data = res.data || {};
      setLecture({
        ...data,
        lectureTytle: data.title || "Auditory Lesson",
        lectureDifficulty: data.lectureDifficulty || "Easy",
        lectureType: 1,
        description: data.description || "",
        audioUrl: data.AudioUrl,
      });

      // autoplay once per audio per user
      const completedKey = `auditory_completed_${id}`;
      const autoplayKey = `auditory_autoplayed_${id}`;
      const completed = localStorage.getItem(completedKey) === "1";
      setHasPlayedOnce(completed);

      if (!completed && !localStorage.getItem(autoplayKey)) {
        setTimeout(async () => {
          try {
            if (audioRef.current) {
              await audioRef.current.play();
              setIsPlaying(true);
              localStorage.setItem(autoplayKey, "1");
            }
          } catch {
            setPlayBlocked(true);
          }
        }, 150);
      }
    } catch (e) {
      console.error("Fetch auditory lecture failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchQAs = async () => {
    try {
      const res = await apiClient.get(`/api/auditory/qanda/auditoryId/${id}`);
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      setQaList(items);
      const totalAvail = items.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
      setTotalAvailableMarks(totalAvail);
      const init = {};
      items.forEach(q => { init[q._id] = ""; });
      setStudentAnswers(init);
      setEvaluationResults({});
      setIsSubmitted(false);
      setTotalCorrectMarks(0);
      setPercentage(0);
    } catch (e) {
      console.error("Fetch Q&A failed:", e);
      setQaList([]);
      setStudentAnswers({});
      setEvaluationResults({});
      setIsSubmitted(false);
      setTotalAvailableMarks(0);
      setTotalCorrectMarks(0);
      setPercentage(0);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const res = await apiClient.get(`/api/feedbacks/video/${id}`); // reuse
      setFeedbackList(res.data || []);
    } catch {
      setFeedbackList([]);
    }
  };

  const ensureStudentPerformance = async () => {
    if (!userId) return;
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
    } catch {
      // ignore; backend may 404 when not found which is fine
    }
  };

  // audio handlers
  const fmt = (s) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const onLoadedMeta = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
    setDurationMinutes((audioRef.current.duration || 0) / 60);
  };
  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrent(audioRef.current.currentTime || 0);
  };
  const onEnded = () => {
    setIsPlaying(false);
    setHasPlayedOnce(true);
    if (audioRef.current) {
      audioRef.current.currentTime = audioRef.current.duration || 0;
    }
    localStorage.setItem(`auditory_completed_${id}`, "1");
    Swal.fire({
      icon: 'success',
      title: 'Great listening! 🎧',
      text: 'You completed this audio.',
      timer: 1500,
      showConfirmButton: false
    });
  };
  const togglePlay = async () => {
    if (hasPlayedOnce) return;
    if (!audioRef.current) return;
    try {
      if (audioRef.current.paused) {
        await audioRef.current.play();
        setIsPlaying(true);
        setPlayBlocked(false);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } catch {
      setPlayBlocked(true);
    }
  };
  const onSeek = (e) => {
    if (!audioRef.current || hasPlayedOnce) return;
    const val = Number(e.target.value);
    const t = (val / 100) * (duration || 1);
    audioRef.current.currentTime = t;
    setCurrent(t);
  };

  // feedback submit
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    const tgId = lecture?.teacherGuideId?._id;
    if (!tgId) {
      Swal.fire({ icon: 'warning', title: 'No Teacher Guide', text: 'This lecture has no attached teacher guide to leave feedback on.' });
      return;
    }
    if (!feedbackText.trim()) return;
    setSubmittingFeedback(true);
    try {
      await apiClient.post('/api/teacher-guide-feedbacks', {
        teacherGuideId: tgId,
        studentFeedback: feedbackText.trim(),
      });
      Swal.fire({ icon: 'success', title: 'Thanks for your feedback!', timer: 1500, showConfirmButton: false });
      setFeedbackText('');
      fetchFeedbacks();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Failed', text: 'Could not submit feedback. Please try again.' });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // mark this lecture as completed (idempotent backend)
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
      Swal.fire({
        icon: 'success',
        title: 'Passed! ✅',
        text: 'You scored above 75%. This lecture is now marked as completed.',
        timer: 1600,
        showConfirmButton: false
      });
    } catch (e) {
      console.error("Failed to mark lecture completed:", e);
    }
  };

  // === PaperDetails-style grading ===
  const handleAnswerChange = (questionId, value) => {
    setStudentAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const submitAnswers = async () => {
    if (isSubmitted) return;

    let results = {};
    let correctMarks = 0;

    qaList.forEach((q) => {
      const student = (studentAnswers[q._id] || "").trim().toLowerCase();
      const correctAns = (q.questionAnswer || "").trim().toLowerCase();
      const isCorrect = student !== "" && student === correctAns;

      results[q._id] = isCorrect;
      if (isCorrect) correctMarks += Number(q.score) || 0;
    });

    const pct = totalAvailableMarks > 0 ? (correctMarks / totalAvailableMarks) * 100 : 0;

    setEvaluationResults(results);
    setTotalCorrectMarks(Number(correctMarks.toFixed(2)));
    setPercentage(Number(pct.toFixed(2)));
    setIsSubmitted(true);

    // NEW: update auditory learning stats
    await updateAuditoryLearningProgress(pct);

    // NEW: mark completed if > 75% and not already completed
    if (pct > 75 && !isCompleted && !completionMarkedRef.current) {
      await markThisLectureCompleted();
    }

    // keep your existing student-performance update
    await updateStudentPerformance(correctMarks);
  };

  const updateStudentPerformance = async (correctScore) => {
    if (!userId) return;
    try {
      const response = await apiClient.get(`/api/student-performance/user/${userId}`);
      if (response.data) {
        const sp = response.data;
        await apiClient.put(`/api/student-performance/user/${userId}`, {
          totalStudyTime: sp.totalStudyTime ?? 0,
          totalScore: (sp.totalScore ?? 0) + Number(correctScore),
          paperCount: (sp.paperCount ?? 0) + 1,
          averageScore: sp.averageScore ?? 0,
          lectureCount: sp.lectureCount ?? 0,
        });
        Swal.fire({
          title: "Success!",
          text: `Your score has been updated! New total: ${((sp.totalScore ?? 0) + Number(correctScore)).toFixed(2)}`,
          icon: "success",
          confirmButtonText: "OK",
        });
      } else {
        await apiClient.post("/api/student-performance", {
          userId,
          totalStudyTime: 0,
          totalScore: Number(correctScore),
          paperCount: 1,
          averageScore: 0,
          lectureCount: 0,
        });
        Swal.fire({
          title: "Success!",
          text: `New performance record created. Initial total: ${Number(correctScore).toFixed(2)}`,
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

  // Ensure a learning-type record exists
  const ensureLearningTypeExists = async () => {
    if (!userId) return;
    try {
      const res = await apiClient.get(`/api/learning-type/user/${userId}`);
      if (res?.data?._id) {
        setLearningType(res.data);
      } else {
        // No record -> create
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

  // Update auditory progress after a submission
  const updateAuditoryLearningProgress = async (attemptPercent) => {
    if (!userId) return;
    try {
      // make sure record exists
      let lt = learningType;
      if (!lt?._id) {
        await ensureLearningTypeExists();
        // re-fetch to avoid stale state in closure
        const refetched = await apiClient.get(`/api/learning-type/user/${userId}`).catch(() => null);
        lt = refetched?.data?._id ? refetched.data : learningType;
      }
      if (!lt?._id) return;

      const payload = {
        auditoryLearningCount: (lt.auditoryLearningCount ?? 0) + 1,
        // add this attempt's percentage (e.g., 5/10 -> 50)
        auditoryLearningTotalPoint: (lt.auditoryLearningTotalPoint ?? 0) + Math.round(attemptPercent),
      };

      const updated = await apiClient.put(`/api/learning-type/${lt._id}`, payload);
      setLearningType(updated?.data ?? { ...lt, ...payload });
    } catch (e) {
      console.error('Error updating learning-type (auditory):', e);
    }
  };

  if (loading) return <div className="text-center p-5">Loading...</div>;
  if (!lecture) return <div className="text-center p-5">Lecture Not Found</div>;

  const percent = duration ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
  const disableControls = hasPlayedOnce;

  return (
    <Fragment>
      <Header />
      <PageHeader title={lecture.lectureTytle || lecture.title || 'Auditory Learning'} curPage={'Course View'} />

      <div className="course-view-section padding-tb section-bg">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-9 col-12">
              <div className="mb-4">
                <h3 className="mb-3">
                  {lecture.lectureTytle || lecture.title}
                  {isCompleted && (
                    <span className="badge bg-success ms-2 align-middle">Completed</span>
                  )}
                </h3>

                {/* ✨ Kid-friendly audio player */}
                <div style={{
                  background: 'linear-gradient(135deg,#fde68a 0%, #a7f3d0 50%, #bfdbfe 100%)',
                  padding: 20, borderRadius: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
                }}>
                  <audio
                    ref={audioRef}
                    src={lecture.audioUrl}
                    preload="metadata"
                    onLoadedMetadata={() => {
                      if (!audioRef.current) return;
                      setDuration(audioRef.current.duration || 0);
                      setDurationMinutes((audioRef.current.duration || 0) / 60);
                    }}
                    onTimeUpdate={() => {
                      if (!audioRef.current) return;
                      setCurrent(audioRef.current.currentTime || 0);
                    }}
                    onEnded={() => {
                      setIsPlaying(false);
                      setHasPlayedOnce(true);
                      if (audioRef.current) {
                        audioRef.current.currentTime = audioRef.current.duration || 0;
                      }
                      localStorage.setItem(`auditory_completed_${id}`, "1");
                      Swal.fire({ icon: 'success', title: 'Great listening! 🎧', text: 'You completed this audio.', timer: 1500, showConfirmButton: false });
                    }}
                    style={{ display: 'none' }}
                    crossOrigin="anonymous"
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 36 }} role="img" aria-label="headphones">🎧</div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 18 }}>
                        {[0,1,2,3,4].map(i => (
                          <span key={i} style={{
                            width: 6,
                            height: isPlaying ? 6 + (i%3)*6 : 6,
                            borderRadius: 3,
                            background: '#111827',
                            opacity: 0.9,
                            animation: isPlaying ? `barBounce 1s ${0.1*i}s infinite ease-in-out` : 'none'
                          }}/>
                        ))}
                      </div>
                    </div>

                    <button
                      className="btn"
                      onClick={async () => {
                        if (hasPlayedOnce) return;
                        if (!audioRef.current) return;
                        try {
                          if (audioRef.current.paused) {
                            await audioRef.current.play();
                            setIsPlaying(true);
                            setPlayBlocked(false);
                          } else {
                            audioRef.current.pause();
                            setIsPlaying(false);
                          }
                        } catch {
                          setPlayBlocked(true);
                        }
                      }}
                      disabled={disableControls}
                      style={{
                        width: 64, height: 64, borderRadius: 999,
                        background: disableControls ? '#d1d5db' : '#111827',
                        color: '#fff', fontSize: 28, lineHeight: '64px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 6px 14px rgba(0,0,0,0.2)'
                      }}
                      title={disableControls ? 'Completed' : (isPlaying ? 'Pause' : 'Play')}
                    >
                      {disableControls ? '✓' : (isPlaying ? '❚❚' : '►')}
                    </button>

                    <div style={{ flexGrow: 1, minWidth: 220 }}>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={percent}
                        onChange={(e) => {
                          if (!audioRef.current || hasPlayedOnce) return;
                          const val = Number(e.target.value);
                          const t = (val / 100) * (duration || 1);
                          audioRef.current.currentTime = t;
                          setCurrent(t);
                        }}
                        disabled={disableControls}
                        style={{ width: '100%' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#111827' }}>
                        <span>{(() => {
                          const s = current;
                          const m = Math.floor(s / 60);
                          const sec = Math.floor(s % 60);
                          return `${m}:${sec.toString().padStart(2, "0")}`;
                        })()}</span>
                        <span>{(() => {
                          const s = duration;
                          const m = Math.floor(s / 60);
                          const sec = Math.floor(s % 60);
                          return `${m}:${sec.toString().padStart(2, "0")}`;
                        })()}</span>
                      </div>
                    </div>
                  </div>

                  {playBlocked && !isPlaying && !hasPlayedOnce && (
                    <div className="mt-2" style={{
                      background: 'rgba(17,24,39,0.08)', padding: '8px 12px',
                      borderRadius: 10, display: 'inline-block'
                    }}>
                      <strong>Tap the play button</strong> to start the lesson 🎵
                    </div>
                  )}
                  {hasPlayedOnce && (
                    <div className="mt-2" style={{
                      background: 'rgba(16,185,129,0.15)', padding: '8px 12px',
                      borderRadius: 10, display: 'inline-block', color: '#065f46'
                    }}>
                      Completed — plays only once ✅
                    </div>
                  )}
                </div>
              </div>

              {/* Intro */}
              {lecture.description ? (
                <div className="vp-content mb-4">
                  <h4>Introduction</h4>
                  <p>{lecture.description}</p>
                </div>
              ) : null}

              {/* ===== Questions ===== */}
              <div className="d-flex align-items-center justify-content-between">
                <h5 className="mb-0">Questions</h5>
                <small className="text-muted">
                  {qaList.length} item{qaList.length === 1 ? '' : 's'} · Total marks: {totalAvailableMarks}
                </small>
              </div>

              <div className="question-section mt-3" style={{ maxHeight: 520, overflow: 'auto' }}>
                {qaList.length > 0 ? (
                  <ul className="question-list">
                    {qaList.map((q, idx) => (
                      <li key={q._id} className="mb-4">
                        <p className="mb-2">
                          <strong>Q{idx + 1}:</strong> {q.questionTytle}{' '}
                          <span className="text-muted">({q.score} marks)</span>
                        </p>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter your answer..."
                          value={studentAnswers[q._id] || ""}
                          onChange={(e) => setStudentAnswers(prev => ({ ...prev, [q._id]: e.target.value }))}
                          disabled={isSubmitted}
                        />
                        {evaluationResults[q._id] !== undefined && (
                          <p className={evaluationResults[q._id] ? "text-success mt-1" : "text-danger mt-1"}>
                            {evaluationResults[q._id] ? "Correct ✅" : "Incorrect ❌"}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-0">No questions available.</p>
                )}
              </div>

              <div className="text-center mt-3">
                <button
                  className="btn btn-primary"
                  onClick={submitAnswers}
                  disabled={isSubmitted || qaList.length === 0}
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

              {/* Feedback form */}
              <div className="mt-4 p-3" style={{backgroundColor: "white"}}>
                <h5>
                  Leave Feedback {lecture?.teacherGuideId?.coureInfo ? `for: ${lecture.teacherGuideId.coureInfo}` : ''}
                </h5>
                {!lecture?.teacherGuideId?._id && (
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
                    disabled={submittingFeedback || !lecture?.teacherGuideId?._id}
                    required
                  />
                  <button
                    className="btn btn-success"
                    type="submit"
                    disabled={submittingFeedback || !feedbackText.trim() || !lecture?.teacherGuideId?._id}
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
                              style={{ color: fb.rating >= star ? '#FFD700' : '#ddd', fontSize: '1.2em', marginRight: '1px' }}
                            >
                              ★
                            </span>
                          ))}
                        </span>
                        <br />
                        <span>{fb.feedback}</span>
                        <div style={{ fontSize: '0.8em', color: '#888' }}>{new Date(fb.createdAt).toLocaleString()}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <style>{`
        @keyframes barBounce {
          0%, 100% { transform: scaleY(0.8); }
          50% { transform: scaleY(1.6); }
        }
      `}</style>
    </Fragment>
  );
};

export default AuditoryLearningView;
