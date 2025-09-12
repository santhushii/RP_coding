// src/pages/AuditoryLearning.jsx  (component: KinestheticLearning)
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

const LECTURE_TYPE_STRING = "kinesthetic";

const KinestheticLearning = () => {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);

  // completion state
  const [completedSet, setCompletedSet] = useState(() => new Set());
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  // filters (everything is Practical/Easy by default)
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 6;

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
    { value: 2, label: "Practical (Kinesthetic)" },
    { value: 1, label: "Audio Lessons" },
    { value: 3, label: "Reading" },
  ];

  useEffect(() => {
    fetchKinesthetic();
    fetchCompletedLectures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDifficulty, selectedType, activities]);

  // ---- Completed list (for gating) ----
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
      console.error("Error fetching completed kinesthetic:", e);
      setCompletedSet(new Set());
    } finally {
      setLoadingCompleted(false);
    }
  };

  // --- Load from API and normalize fields
  const fetchKinesthetic = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await apiClient.get("/api/kinesthetic/learning");
      const items = Array.isArray(res.data) ? res.data : [];

      const normalized = items
        // You can sort here to enforce a strict order for gating:
        // .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map((it) => ({
          _id: it._id,
          title: it.title || "Kinesthetic Activity",
          teacherGuide: it.TeacherGuideId?.coureInfo || "N/A",
          question: it.Question || "",
          instruction: it.Instructuion || "",
          answer: it.answer || "",
          createdAt: it.createdAt,
          lectureType: 2, // Practical
          lectureDifficulty: "Easy",
        }));

      setActivities(normalized);
      setFilteredActivities(normalized);
    } catch (err) {
      console.error("Error fetching Kinesthetic list:", err);
      setLoadError("Couldn't load kinesthetic activities. Please try again.");
      setActivities([]);
      setFilteredActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...activities];

    if (selectedDifficulty !== "all") {
      filtered = filtered.filter(
        (it) => it.lectureDifficulty === selectedDifficulty
      );
    }

    if (selectedType !== "all") {
      filtered = filtered.filter(
        (it) => Number(it.lectureType) === Number(selectedType)
      );
    }

    setFilteredActivities(filtered);
    setCurrentPage(1);
  };

  // ----- Gating logic: completed => unlocked; first incomplete => unlocked; rest => locked -----
  const gatedActivities = useMemo(() => {
    let firstIncompleteSeen = false;

    return filteredActivities.map((it) => {
      const completed = completedSet.has(String(it._id));
      if (completed) return { ...it, __completed: true, __locked: false };

      if (!firstIncompleteSeen) {
        firstIncompleteSeen = true; // first incomplete -> unlocked
        return { ...it, __completed: false, __locked: false };
      }

      return { ...it, __completed: false, __locked: true }; // later incomplete -> locked
    });
  }, [filteredActivities, completedSet]);

  // ----- Pagination on gated list -----
  const indexOfLast = currentPage * perPage;
  const indexOfFirst = indexOfLast - perPage;
  const currentItems = useMemo(
    () => gatedActivities.slice(indexOfFirst, indexOfLast),
    [gatedActivities, indexOfFirst, indexOfLast]
  );

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const showingFrom = gatedActivities.length === 0 ? 0 : indexOfFirst + 1;
  const showingTo = Math.min(indexOfLast, gatedActivities.length);

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
      <PageHeader title={"Kinesthetic Activities"} curPage={"Course Page"} />

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

                    {/* spacer cols */}
                    <div className="col">
                      {loadingCompleted && (
                        <small className="text-muted d-block mt-1">
                          Checking completed activities…
                        </small>
                      )}
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
                Showing {showingFrom} - {showingTo} of {gatedActivities.length}{" "}
                results
                {loading ? " (loading…)" : ""}
              </p>
            </div>

            <div className="row g-4 justify-content-center row-cols-xl-3 row-cols-md-2 row-cols-1">
              {currentItems.map((item) => {
                const isCompleted = item.__completed;
                const isLocked = item.__locked;

                return (
                  <div className="col" key={item._id}>
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
                          {isLocked ? (
                            <button
                              type="button"
                              onClick={handleLockedClick}
                              style={{ border: "none", background: "transparent", padding: 0, width: "100%" }}
                            >
                              <img
                                src={paperimg}
                                alt={item.title}
                                loading="lazy"
                                style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8 }}
                              />
                            </button>
                          ) : (
                            <Link to={`/KinestheticLearning-details/${item._id}`}>
                              <img
                                src={paperimg}
                                alt={item.title}
                                loading="lazy"
                                style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 8 }}
                              />
                            </Link>
                          )}
                        </div>

                        <div className="course-content">
                          <div className="course-category">
                            <div className="course-cate">
                              <span>
                                {
                                  (typeOptions.find(
                                    (t) => Number(t.value) === Number(item.lectureType)
                                  ) || { label: "Practical" }).label
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
                                {item.title}
                              </button>
                            ) : (
                              <Link to={`/KinestheticLearning-details/${item._id}`}>
                                {item.title}
                              </Link>
                            )}
                          </h4>

                          <div className="course-details">
                            <div className="couse-topic">
                              <i className="icofont-signal"></i>{" "}
                              {item.lectureDifficulty}
                            </div>
                            <div className="couse-count">
                              <i className="icofont-info"></i>{" "}
                              {item.teacherGuide}
                            </div>
                          </div>

                          {/* brief preview of Question/Instruction */}
                          <div className="mt-2" style={{ minHeight: 48 }}>
                            <div className="small text-muted">Question</div>
                            <div className="text-truncate" title={item.question}>
                              {item.question || "—"}
                            </div>
                            <div className="small text-muted mt-1">Instruction</div>
                            <div className="text-truncate" title={item.instruction}>
                              {item.instruction || "—"}
                            </div>
                          </div>

                          <div className="course-footer">
                            <div className="course-author">
                              <span className="ca-name">Unknown</span>
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
                                  to={`/KinestheticLearning-details/${item._id}`}
                                  className="lab-btn-text"
                                >
                                  View <i className="icofont-external-link"></i>
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

              {!loading && gatedActivities.length === 0 && (
                <div className="col-12 text-center text-muted py-5">
                  No activities found for the selected filters.
                </div>
              )}
            </div>

            <Pagination
              lecturesPerPage={perPage}
              totalLectures={gatedActivities.length}
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

export default KinestheticLearning;
