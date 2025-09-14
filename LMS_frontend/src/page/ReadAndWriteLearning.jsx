import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../component/layout/footer";
import Header from "../component/layout/header";
import PageHeader from "../component/layout/pageheader";
import Pagination from "../component/sidebar/pagination";
import paperimg from "../assets/images/papers/paperimg.jpg";
import apiClient from "../api";
import Swal from "sweetalert2";

const LECTURE_TYPE = "readwrite";

const ReadAndWriteLearning = () => {
  const [papers, setPapers] = useState([]);
  const [filteredPapers, setFilteredPapers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // completion state
  const [completedSet, setCompletedSet] = useState(() => new Set());
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  const userId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  useEffect(() => {
    fetchPapers();
    fetchCompleted(); // load completion for gating
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, papers]);

  const fetchPapers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.get("/api/readwrite/learning");
      const list = Array.isArray(res.data) ? res.data : [];

      // You can sort to enforce order; uncomment next line if desired
      // list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const normalized = list.map((it) => ({
        _id: String(it._id),
        title: it.paperTytle || "Untitled Paper",
        description: it.Description || "",
        guide: it.teacherguideId?.coureInfo || "—",
        createdAt: it.createdAt,
      }));

      setPapers(normalized);
      setFilteredPapers(normalized);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch papers.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompleted = async () => {
    if (!userId) {
      setCompletedSet(new Set());
      return;
    }
    setLoadingCompleted(true);
    try {
      const res = await apiClient.get("/api/completed-lectures", {
        params: { userId, lectureType: LECTURE_TYPE },
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      const set = new Set(rows.map((r) => String(r.lectureId)));
      setCompletedSet(set);
    } catch (e) {
      console.error("Failed to fetch completed papers:", e);
      setCompletedSet(new Set());
    } finally {
      setLoadingCompleted(false);
    }
  };

  const handleSearch = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setFilteredPapers(papers);
      return;
    }
    const filtered = papers.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
    setFilteredPapers(filtered);
  };

  const handleInputChange = (e) => setSearchQuery(e.target.value);
  const detailsPath = (id) => `/readwrite-details/${id}`;

  // ----- Gating logic: completed => unlocked; first incomplete => unlocked; later incomplete => locked
  const gatedPapers = useMemo(() => {
    let firstIncompleteSeen = false;
    return filteredPapers.map((p) => {
      const completed = completedSet.has(String(p._id));
      if (completed) return { ...p, __completed: true, __locked: false };
      if (!firstIncompleteSeen) {
        firstIncompleteSeen = true;
        return { ...p, __completed: false, __locked: false };
      }
      return { ...p, __completed: false, __locked: true };
    });
  }, [filteredPapers, completedSet]);

  const onLockedClick = () => {
    Swal.fire({
      icon: "info",
      title: "Locked",
      text: "You need to complete the previous one.",
    });
  };

  return (
    <Fragment>
      <Header />
      <PageHeader title={"Read & Write Learning"} curPage={"Read & Write Learning"} />

      <div className="blog-section padding-tb section-bg">
        <div className="container">
          <div className="row justify-content-center">
            {/* Sidebar */}
            <div className="col-lg-3 col-12">
              <aside>
                <div className="widget widget-search">
                  <form
                    className="search-wrapper"
                    onSubmit={(e) => e.preventDefault()}
                  >
                    <input
                      type="text"
                      placeholder="Search by title or description…"
                      value={searchQuery}
                      onChange={handleInputChange}
                    />
                    <button type="submit">
                      <i className="icofont-search-2"></i>
                    </button>
                  </form>
                  {loadingCompleted && (
                    <small className="text-muted d-block mt-2">
                      Checking completed…
                    </small>
                  )}
                </div>

                <div className="widget widget-category">
                  <div className="widget-header">
                    <h5 className="title">Paper List</h5>
                  </div>
                  <ul className="widget-wrapper">
                    {gatedPapers.map((paper) => (
                      <li key={paper._id}>
                        {paper.__locked ? (
                          <button
                            type="button"
                            onClick={onLockedClick}
                            className="d-flex flex-wrap justify-content-between btn btn-link p-0 text-start w-100"
                            style={{ textDecoration: "none" }}
                          >
                            <span>
                              <i className="icofont-lock me-1" />
                              {paper.title}
                            </span>
                            {!paper.__completed && <span className="badge bg-secondary">Locked</span>}
                          </button>
                        ) : (
                          <Link
                            to={detailsPath(paper._id)}
                            className="d-flex flex-wrap justify-content-between"
                          >
                            <span>
                              {paper.__completed ? (
                                <i className="icofont-check-circled text-success me-1" />
                              ) : (
                                <i className="icofont-double-right me-1" />
                              )}
                              {paper.title}
                            </span>
                            {paper.__completed && (
                              <span className="badge bg-success">Completed</span>
                            )}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>

            {/* Main Content */}
            <div className="col-lg-9 col-12">
              {loading ? (
                <p>Loading papers...</p>
              ) : error ? (
                <p className="text-danger">{error}</p>
              ) : gatedPapers.length > 0 ? (
                <article>
                  <div className="section-wrapper">
                    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 justify-content-center g-4">
                      {gatedPapers.map((paper) => (
                        <div className="col" key={paper._id}>
                          <div className={`post-item ${paper.__locked ? "opacity-75" : ""}`}>
                            <div className="post-inner position-relative">
                              {/* badges */}
                              <div className="position-absolute" style={{ top: 8, left: 8, zIndex: 2 }}>
                                {paper.__completed && (
                                  <span className="badge bg-success">Completed</span>
                                )}
                                {!paper.__completed && paper.__locked && (
                                  <span className="badge bg-secondary">
                                    <i className="icofont-lock me-1"></i>Locked
                                  </span>
                                )}
                              </div>

                              <div className="post-thumb">
                                {paper.__locked ? (
                                  <button
                                    type="button"
                                    onClick={onLockedClick}
                                    className="p-0 border-0 bg-transparent"
                                    style={{ width: "100%" }}
                                  >
                                    <img src={paperimg} alt="Paper Thumbnail" />
                                  </button>
                                ) : (
                                  <Link to={detailsPath(paper._id)}>
                                    <img src={paperimg} alt="Paper Thumbnail" />
                                  </Link>
                                )}
                              </div>

                              <div
                                className="post-content"
                                style={{ minHeight: "250px" }}
                              >
                                {paper.__locked ? (
                                  <button
                                    type="button"
                                    className="btn btn-link p-0 text-start"
                                    onClick={onLockedClick}
                                    style={{ textDecoration: "none" }}
                                  >
                                    <h4 className="mb-1">{paper.title}</h4>
                                  </button>
                                ) : (
                                  <Link to={detailsPath(paper._id)}>
                                    <h4 className="mb-1">{paper.title}</h4>
                                  </Link>
                                )}

                                <div className="meta-post">
                                  <ul className="lab-ul">
                                    <li>
                                      <i className="icofont-calendar"></i>{" "}
                                      {paper.createdAt
                                        ? new Date(paper.createdAt).toLocaleDateString()
                                        : "—"}
                                    </li>
                                    <li>
                                      <i className="icofont-graduate-alt"></i>{" "}
                                      {paper.guide}
                                    </li>
                                  </ul>
                                </div>

                                {/* short description preview */}
                                {paper.description && (
                                  <p className="mb-0">
                                    {paper.description.length > 120
                                      ? paper.description.slice(0, 120) + "…"
                                      : paper.description}
                                  </p>
                                )}
                              </div>

                              <div className="post-footer">
                                <div className="pf-left">
                                  {paper.__locked ? (
                                    <button
                                      type="button"
                                      className="lab-btn-text btn btn-outline-secondary"
                                      onClick={onLockedClick}
                                    >
                                      Locked <i className="icofont-lock"></i>
                                    </button>
                                  ) : (
                                    <Link
                                      to={detailsPath(paper._id)}
                                      className="lab-btn-text"
                                    >
                                      View Paper <i className="icofont-external-link"></i>
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Pagination />
                  </div>
                </article>
              ) : (
                <p>No papers match your search.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </Fragment>
  );
};

export default ReadAndWriteLearning;
