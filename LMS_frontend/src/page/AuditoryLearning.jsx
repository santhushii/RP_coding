// src/pages/AuditoryLearning.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../component/layout/footer";
import Header from "../component/layout/header";
import PageHeader from "../component/layout/pageheader";
import Pagination from "../component/sidebar/pagination";
import Rating from "../component/sidebar/rating";
import apiClient from "../api";
import Swal from "sweetalert2";
import "../assets/css/LatestCourse.css";
import paperimg from "../assets/images/papers/paperimg.jpg";

const LECTURE_TYPE_STRING = "auditory"; // must match CompletedLecture.lectureType

const AuditoryLearning = () => {
  const [audioLectures, setAudioLectures] = useState([]);
  const [filteredLectures, setFilteredLectures] = useState([]);

  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedTime, setSelectedTime] = useState("all");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const lecturesPerPage = 6;

  // completion/gating state
  const [completedSet, setCompletedSet] = useState(() => new Set());
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  const userId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  const difficultyOptions = [
    { value: "all", label: "All Difficulties" },
    { value: "Easy", label: "Easy" },
    { value: "Medium", label: "Medium" },
    { value: "Hard", label: "Hard" },
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: 1, label: "Audio Lessons" },
    { value: 2, label: "Practical" },
    { value: 3, label: "Reading" },
  ];

  const timeFilters = [
    { value: "all", label: "All Durations" },
    { value: "less10", label: "Less than 10 min" },
    { value: "less20", label: "Less than 20 min" },
    { value: "less40", label: "Less than 40 min" },
    { value: "more40", label: "More than 40 min" },
  ];

  useEffect(() => {
    fetchAudioLectures();
    fetchCompletedLectures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDifficulty, selectedType, selectedTime, audioLectures]);

  // ----- Fetchers -----
  const fetchCompletedLectures = async () => {
    if (!userId) {
      setCompletedSet(new Set());
      return;
    }
    setLoadingCompleted(true);
    try {
      const res = await apiClient.get("/api/completed-lectures", {
        params: { userId, lectureType: LECTURE_TYPE_STRING },
      });
      const list = Array.isArray(res.data) ? res.data : [];
      const set = new Set(list.map((x) => String(x.lectureId)));
      setCompletedSet(set);
    } catch (e) {
      console.error("Error fetching completed lectures:", e);
      setCompletedSet(new Set());
    } finally {
      setLoadingCompleted(false);
    }
  };

  const fetchAudioLectures = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await apiClient.get("/api/auditory/learning");
      const items = Array.isArray(res.data) ? res.data : [];

      // Normalize shape for UI
      const normalized = items
        // Optional: sort by created date ascending for consistent gating order
        // .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map((it) => ({
          _id: it._id,
          audioUrl: it.AudioUrl,
          title: it.title || it.teacherGuideId?.coureInfo || "Auditory Lesson",
          teacherGuide: it.teacherGuideId?.coureInfo || "N/A",
          lectureType: 1, // treat as Audio Lessons
          lectureDifficulty: "Easy",
          createdAt: it.createdAt,
          createby: it.createby,
        }));

      const withDurations = await enrichDurations(normalized);
      setAudioLectures(withDurations);
      setFilteredLectures(withDurations);
    } catch (err) {
      console.error("Error fetching Auditory Learning list:", err);
      setLoadError("Couldn't load audio lessons. Please try again.");
      setAudioLectures([]);
      setFilteredLectures([]);
    } finally {
      setLoading(false);
    }
  };

  const enrichDurations = async (list) => {
    const getDurationMins = (url) =>
      new Promise((resolve) => {
        if (!url) return resolve(null);
        const a = document.createElement("audio");
        a.preload = "metadata";
        a.crossOrigin = "anonymous";
        a.src = url;

        const cleanup = () => {
          a.removeAttribute("src");
          a.load();
        };

        const done = (mins) => {
          cleanup();
          resolve(mins);
        };

        a.onloadedmetadata = () => {
          const secs = Number(a.duration);
          if (Number.isFinite(secs) && secs > 0) {
            done(Math.round(secs / 60));
          } else {
            done(null);
          }
        };
        a.onerror = () => done(null);
        setTimeout(() => done(null), 7000); // safety timeout
      });

    const results = await Promise.all(
      list.map(async (it) => ({
        ...it,
        durationMins: await getDurationMins(it.audioUrl),
      }))
    );
    return results;
  };

  // ----- Filters -----
  const applyFilters = () => {
    let filtered = [...audioLectures];

    if (selectedDifficulty !== "all") {
      filtered = filtered.filter(
        (lecture) => lecture.lectureDifficulty === selectedDifficulty
      );
    }

    if (selectedType !== "all") {
      filtered = filtered.filter(
        (lecture) => Number(lecture.lectureType) === Number(selectedType)
      );
    }

    if (selectedTime !== "all") {
      filtered = filtered.filter((lecture) => {
        const mins = lecture.durationMins;
        if (mins == null) return false;
        if (selectedTime === "less10") return mins < 10;
        if (selectedTime === "less20") return mins < 20;
        if (selectedTime === "less40") return mins < 40;
        if (selectedTime === "more40") return mins >= 40;
        return true;
      });
    }

    setFilteredLectures(filtered);
    setCurrentPage(1);
  };

  // ----- Gating logic: completed => unlocked; first incomplete => unlocked; rest => locked -----
  const gatedLectures = useMemo(() => {
    let firstIncompleteSeen = false;

    return filteredLectures.map((lec) => {
      const isCompleted = completedSet.has(String(lec._id));

      if (isCompleted) {
        return { ...lec, __completed: true, __locked: false };
      }

      if (!firstIncompleteSeen) {
        firstIncompleteSeen = true;
        return { ...lec, __completed: false, __locked: false }; // first incomplete -> unlocked
      }

      return { ...lec, __completed: false, __locked: true }; // later incomplete -> locked
    });
  }, [filteredLectures, completedSet]);

  // ----- Pagination on gated list -----
  const indexOfLastLecture = currentPage * lecturesPerPage;
  const indexOfFirstLecture = indexOfLastLecture - lecturesPerPage;
  const currentLectures = useMemo(
    () => gatedLectures.slice(indexOfFirstLecture, indexOfLastLecture),
    [gatedLectures, indexOfFirstLecture, indexOfLastLecture]
  );

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const showingFrom = gatedLectures.length === 0 ? 0 : indexOfFirstLecture + 1;
  const showingTo = Math.min(indexOfLastLecture, gatedLectures.length);

  // ----- UI helpers -----
  const handleLockedClick = () => {
    Swal.fire({
      icon: "info",
      title: "Locked",
      text: "You need to complete the previous one.",
    });
  };

  return (
    <>
      <Header />
      <PageHeader title={"Python Auditory Lessons"} curPage={"Course Page"} />

      {/* Filters */}
      <div className="group-select-section">
        <div className="container">
          <div className="section-wrapper">
            <div className="row align-items-center g-4">
              <div className="col-md-1">
                <div className="group-select-left">
                  <i className="icofont-abacus-alt"></i>
                  <span>Filters</span>
                </div>
              </div>
              <div className="col-md-11">
                <div className="group-select-right">
                  <div className="row g-2 row-cols-lg-4 row-cols-sm-2 row-cols-1">
                    {/* Type */}
                    <div className="col">
                      <div className="select-item">
                        <select
                          className="form-select"
                          value={selectedType}
                          onChange={(e) => setSelectedType(e.target.value)}
                        >
                          {typeOptions.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Difficulty */}
                    <div className="col">
                      <div className="select-item">
                        <select
                          className="form-select"
                          value={selectedDifficulty}
                          onChange={(e) =>
                            setSelectedDifficulty(e.target.value)
                          }
                        >
                          {difficultyOptions.map((diff) => (
                            <option key={diff.value} value={diff.value}>
                              {diff.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="col">
                      <div className="select-item">
                        <select
                          className="form-select"
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                        >
                          {timeFilters.map((time) => (
                            <option key={time.value} value={time.value}>
                              {time.label}
                            </option>
                          ))}
                        </select>
                        {(selectedTime !== "all" || loadingCompleted) && (
                          <small className="text-muted d-block mt-1">
                            {loadingCompleted
                              ? "Checking completed lessons…"
                              : "Duration auto-detected from audio metadata."}
                          </small>
                        )}
                      </div>
                    </div>

                    <div className="col"></div>
                  </div>
                </div>
              </div>
            </div>

            {loadError && (
              <div className="alert alert-danger mt-3">{loadError}</div>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="course-section padding-tb section-bg">
        <div className="container">
          <div className="section-wrapper">
            <div className="course-showing-part">
              <p>
                Showing {showingFrom} - {showingTo} of {gatedLectures.length} results
                {loading ? " (loading…)" : ""}
              </p>
            </div>

            <div className="row g-4 justify-content-center row-cols-xl-3 row-cols-md-2 row-cols-1">
              {currentLectures.map((lecture) => {
                const isCompleted = lecture.__completed;
                const isLocked = lecture.__locked;

                return (
                  <div className="col" key={lecture._id}>
                    <div className={`course-item ${isLocked ? "opacity-75" : ""}`}>
                      <div className="course-inner position-relative">
                        {/* Badges */}
                        <div className="position-absolute" style={{ top: 8, left: 8, zIndex: 2 }}>
                          {isCompleted && (
                            <span className="badge bg-success">Completed</span>
                          )}
                          {!isCompleted && isLocked && (
                            <span className="badge bg-secondary">
                              <i className="icofont-lock me-1"></i> Locked
                            </span>
                          )}
                        </div>

                        <div className="course-thumb" style={{ position: "relative" }}>
                          {/* If locked, clicking image triggers SweetAlert */}
                          {isLocked ? (
                            <button
                              type="button"
                              onClick={handleLockedClick}
                              style={{ border: "none", background: "transparent", padding: 0, width: "100%" }}
                            >
                              <img
                                src={paperimg}
                                alt={lecture.title}
                                loading="lazy"
                                style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8 }}
                              />
                            </button>
                          ) : (
                            <Link to={`/AuditoryLearning-details/${lecture._id}`}>
                              <img
                                src={paperimg}
                                alt={lecture.title}
                                loading="lazy"
                                style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8 }}
                              />
                            </Link>
                          )}

                          {/* Duration chip */}
                          {typeof lecture.durationMins === "number" && (
                            <span
                              style={{
                                position: "absolute",
                                bottom: 8,
                                right: 8,
                                background: "rgba(0,0,0,0.6)",
                                color: "#fff",
                                padding: "2px 8px",
                                borderRadius: 12,
                                fontSize: 12,
                              }}
                              title="Duration"
                            >
                              {lecture.durationMins} min
                            </span>
                          )}

                          {/* Inline audio preview disabled for locked items */}
                          <div style={{ paddingTop: 8 }}>
                            {isLocked ? (
                              <div
                                className="text-muted small"
                                style={{
                                  background: "rgba(0,0,0,0.04)",
                                  padding: "8px 10px",
                                  borderRadius: 6,
                                }}
                              >
                                Preview locked until you complete the previous one.
                              </div>
                            ) : (
                              <audio controls preload="metadata" style={{ width: "100%" }}>
                                <source src={lecture.audioUrl} />
                                Your browser does not support the audio element.
                              </audio>
                            )}
                          </div>
                        </div>

                        <div className="course-content">
                          <div className="course-category">
                            <div className="course-cate">
                              <span>
                                {
                                  (typeOptions.find(
                                    (t) => Number(t.value) === Number(lecture.lectureType)
                                  ) || { label: "Audio Lessons" }).label
                                }
                              </span>
                            </div>
                            <div className="course-reiew">
                              <Rating />
                              <span className="ratting-count"> 0 reviews</span>
                            </div>
                          </div>

                          {/* Title: link if unlocked; button -> alert if locked */}
                          <h4 className="mt-1">
                            {isLocked ? (
                              <button
                                type="button"
                                className="btn btn-link p-0 text-start"
                                onClick={handleLockedClick}
                                style={{ textDecoration: "none" }}
                              >
                                {lecture.title}
                              </button>
                            ) : (
                              <Link to={`/AuditoryLearning-details/${lecture._id}`}>
                                {lecture.title}
                              </Link>
                            )}
                          </h4>

                          <div className="course-details">
                            <div className="couse-topic">
                              <i className="icofont-signal"></i>{" "}
                              {lecture.lectureDifficulty}
                            </div>
                            <div className="couse-count">
                              <i className="icofont-info"></i>{" "}
                              {lecture.teacherGuide}
                            </div>
                            {typeof lecture.durationMins === "number" && (
                              <div className="couse-count">
                                <i className="icofont-clock-time"></i>{" "}
                                {lecture.durationMins} min
                              </div>
                            )}
                          </div>

                          <div className="course-footer">
                            <div className="course-author">
                              <span className="ca-name">
                                {lecture.createby?.username || "Unknown"}
                              </span>
                            </div>
                            <div className="course-btn">
                              {isLocked ? (
                                <button
                                  type="button"
                                  className="lab-btn-text btn btn-outline-secondary"
                                  onClick={handleLockedClick}
                                >
                                  Locked <i className="icofont-lock"></i>
                                </button>
                              ) : (
                                <Link
                                  to={`/AuditoryLearning-details/${lecture._id}`}
                                  className="lab-btn-text"
                                >
                                  Listen <i className="icofont-external-link"></i>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!loading && gatedLectures.length === 0 && (
                <div className="col-12 text-center text-muted py-5">
                  No lessons found for the selected filters.
                </div>
              )}
            </div>

            <Pagination
              lecturesPerPage={lecturesPerPage}
              totalLectures={gatedLectures.length}
              paginate={paginate}
              currentPage={currentPage}
            />
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default AuditoryLearning;
