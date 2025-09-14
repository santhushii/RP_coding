// src/pages/VisualLearning.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../component/layout/footer";
import Header from "../component/layout/header";
import PageHeader from "../component/layout/pageheader";
import Pagination from "../component/sidebar/pagination";
import Rating from "../component/sidebar/rating";
import apiClient from "../api";
import Swal from "sweetalert2";
import "../assets/css/LatestCourse.css";

const LECTURE_TYPE_STRING = "visual"; // must match what you save in CompletedLecture. Keep consistent!

const VisualLearning = () => {
  const [videoLectures, setVideoLectures] = useState([]);
  const [filteredLectures, setFilteredLectures] = useState([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedTime, setSelectedTime] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [completedSet, setCompletedSet] = useState(() => new Set()); // set of lectureId strings
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  const lecturesPerPage = 6;

  const difficultyOptions = [
    { value: "all", label: "All Difficulties" },
    { value: "Easy", label: "Easy" },
    { value: "Medium", label: "Medium" },
    { value: "Hard", label: "Hard" },
  ];

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: 1, label: "Video Lectures" },
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
    // Load lectures and completed status (in parallel is fine)
    fetchVideoLectures();
    fetchCompletedLectures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute filtered list when filters or data change
  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDifficulty, selectedType, selectedTime, videoLectures]);

  const fetchCompletedLectures = async () => {
    if (!userId) {
      setCompletedSet(new Set());
      return;
    }
    setLoadingCompleted(true);
    try {
      // Limit by lectureType to this page's content
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

  // Fetch visual learning list and enrich with durations (for time filters)
  const fetchVideoLectures = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await apiClient.get("/api/visual/learning");
      const items = Array.isArray(res.data) ? res.data : [];

      // Normalize shape
      const normalized = items.map((it) => ({
        _id: it._id,
        videoUrl: it.videoUrl,
        title: it.title || it.teacherGuideId?.coureInfo || "Visual Learning Lecture",
        teacherGuide: it.teacherGuideId?.coureInfo || "N/A",
        lectureType: it.lectureType ?? 1,
        lectureDifficulty: it.lectureDifficulty ?? "Easy",
        createdAt: it.createdAt,
        createby: it.createby,
      }));

      const withDurations = await enrichDurations(normalized);
      setVideoLectures(withDurations);
      setFilteredLectures(withDurations);
    } catch (err) {
      console.error("Error fetching Visual Learning list:", err);
      setLoadError("Couldn't load lectures. Please try again.");
      setVideoLectures([]);
      setFilteredLectures([]);
    } finally {
      setLoading(false);
    }
  };

  // Load video metadata to estimate duration (minutes)
  const enrichDurations = async (list) => {
    const getDurationMins = (url) =>
      new Promise((resolve) => {
        if (!url) return resolve(null);
        const v = document.createElement("video");
        v.preload = "metadata";
        v.crossOrigin = "anonymous";
        v.src = url;

        const cleanup = () => {
          v.removeAttribute("src");
          v.load();
        };

        const done = (mins) => {
          cleanup();
          resolve(mins);
        };

        v.onloadedmetadata = () => {
          const secs = Number(v.duration);
          if (Number.isFinite(secs) && secs > 0) {
            done(Math.round(secs / 60));
          } else {
            done(null);
          }
        };
        v.onerror = () => done(null);

        // Avoid hanging forever
        setTimeout(() => done(null), 7000);
      });

    const results = await Promise.all(
      list.map(async (it) => ({
        ...it,
        durationMins: await getDurationMins(it.videoUrl),
      }))
    );
    return results;
  };

  const applyFilters = () => {
    let filtered = [...videoLectures];

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
        if (mins == null) return false; // unknown durations won't match
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

  // Build the gated list with status flags: isCompleted & isLocked
  const gatedLectures = useMemo(() => {
    let firstIncompleteSeen = false;

    return filteredLectures.map((lec) => {
      const completed = completedSet.has(String(lec._id));

      // Completed: always unlocked
      if (completed) {
        return { ...lec, __completed: true, __locked: false };
      }

      // Not completed: unlock only the FIRST incomplete in sequence
      if (!firstIncompleteSeen) {
        firstIncompleteSeen = true;
        return { ...lec, __completed: false, __locked: false }; // first incomplete -> unlocked
      }

      // Any further incomplete lectures are locked
      return { ...lec, __completed: false, __locked: true };
    });
  }, [filteredLectures, completedSet]);

  const indexOfLastLecture = currentPage * lecturesPerPage;
  const indexOfFirstLecture = indexOfLastLecture - lecturesPerPage;
  const currentLectures = useMemo(
    () => gatedLectures.slice(indexOfFirstLecture, indexOfLastLecture),
    [gatedLectures, indexOfFirstLecture, indexOfLastLecture]
  );

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const showingFrom = gatedLectures.length === 0 ? 0 : indexOfFirstLecture + 1;
  const showingTo = Math.min(indexOfLastLecture, gatedLectures.length);

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
      <PageHeader title={"Python Lectures"} curPage={"Course Page"} />

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
                    {/* Lecture Type */}
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
                          onChange={(e) => setSelectedDifficulty(e.target.value)}
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
                        {selectedTime !== "all" && (
                          <small className="text-muted d-block mt-1">
                            Duration detection runs automatically from video metadata.
                          </small>
                        )}
                      </div>
                    </div>

                    <div className="col"></div>
                  </div>
                </div>
              </div>
            </div>

            {(loadError || loadingCompleted) && (
              <div className="mt-3">
                {loadError && <div className="alert alert-danger">{loadError}</div>}
                {loadingCompleted && (
                  <div className="text-muted small">Checking completed lectures…</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course List */}
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

                        <div className="course-thumb">
                          <video width="100%" controls preload="metadata">
                            <source src={lecture.videoUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        </div>

                        <div className="course-content">
                          <div className="course-category">
                            <div className="course-cate">
                              <span>
                                {
                                  (typeOptions.find(
                                    (t) => Number(t.value) === Number(lecture.lectureType)
                                  ) || { label: "Video Lectures" }).label
                                }
                              </span>
                            </div>
                            <div className="course-reiew">
                              <Rating />
                              <span className="ratting-count"> 0 reviews</span>
                            </div>
                          </div>

                          <h4 className="mt-1">
                            {/* If locked, don't allow navigation via title */}
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
                              <Link to={`/VisualLearning-details/${lecture._id}`}>
                                {lecture.title}
                              </Link>
                            )}
                          </h4>

                          <div className="course-details">
                            <div className="couse-topic">
                              <i className="icofont-signal"></i> {lecture.lectureDifficulty}
                            </div>
                            <div className="couse-count">
                              <i className="icofont-info"></i> {lecture.teacherGuide}
                            </div>
                            {typeof lecture.durationMins === "number" && (
                              <div className="couse-count">
                                <i className="icofont-clock-time"></i> {lecture.durationMins} min
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
                                  to={`/VisualLearning-details/${lecture._id}`}
                                  className="lab-btn-text"
                                >
                                  Read More <i className="icofont-external-link"></i>
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
                  No lectures found for the selected filters.
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

export default VisualLearning;
