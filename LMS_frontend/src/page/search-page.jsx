import { Fragment, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Footer from "../component/layout/footer";
import Header from "../component/layout/header";
import PageHeader from "../component/layout/pageheader";
import apiClient from "../api";

const SearchPage = () => {
  const { name } = useParams(); // /search-page/:name
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState(decodeURIComponent(name || ""));
  const [videoLectures, setVideoLectures] = useState([]);
  const [filteredLectures, setFilteredLectures] = useState([]);
  const [papers, setPapers] = useState([]);
  const [filteredPapers, setFilteredPapers] = useState([]);

  // keep local state in sync when the route param changes
  useEffect(() => {
    setSearchQuery(decodeURIComponent(name || ""));
  }, [name]);

  useEffect(() => {
    fetchVideoLectures();
    fetchPapers();
  }, []);

  useEffect(() => {
    filterResults();
  }, [searchQuery, videoLectures, papers]);

  const fetchVideoLectures = async () => {
    try {
      const { data } = await apiClient.get("/api/python/video-lectures/");
      const items = Array.isArray(data) ? data : [];
      setVideoLectures(items);
      setFilteredLectures(items);
    } catch (error) {
      console.error("Error fetching video lectures:", error);
      setVideoLectures([]);
      setFilteredLectures([]);
    }
  };

  const fetchPapers = async () => {
    try {
      const { data } = await apiClient.get("/api/python/papers");
      const items = Array.isArray(data) ? data : [];
      setPapers(items);
      setFilteredPapers(items);
    } catch (error) {
      console.error("Failed to fetch papers:", error);
      setPapers([]);
      setFilteredPapers([]);
    }
  };

  const safeText = (v) => String(v || "").toLowerCase();

  const filterResults = () => {
    if (!searchQuery?.trim()) {
      setFilteredLectures(videoLectures);
      setFilteredPapers(papers);
      return;
    }

    const q = searchQuery.toLowerCase().trim();

    // Match across title, description, teacher guide, difficulty
    const lectures = videoLectures.filter((lecture) => {
      const title = safeText(lecture.lectureTytle);
      const desc = safeText(lecture.description);
      const guide = safeText(lecture.teacherGuideId?.coureInfo);
      const diff = safeText(lecture.lectureDifficulty);
      return (
        title.includes(q) ||
        desc.includes(q) ||
        guide.includes(q) ||
        diff.includes(q)
      );
    });

    // Match across title, teacher guide, difficulty
    const ps = papers.filter((paper) => {
      const title = safeText(paper.paperTytle);
      const guide = safeText(paper.teacherGuideId?.coureInfo);
      const diff = safeText(paper.paperDifficulty);
      return title.includes(q) || guide.includes(q) || diff.includes(q);
    });

    setFilteredLectures(lectures);
    setFilteredPapers(ps);
  };

  const handleSearchChange = (e) => setSearchQuery(e.target.value);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const next = encodeURIComponent(searchQuery.trim());
    navigate(`/search-page/${next}`);
  };

  return (
    <Fragment>
      <Header />
      <PageHeader
        title={`Search Results for: ${searchQuery || "All"}`}
        curPage={"Search Result"}
      />
      <div className="blog-section padding-tb section-bg">
        <div className="container">
          <div className="row justify-content-center">
            {/* Results */}
            <div className="col-lg-8 col-12">
              <article>
                <div className="section-wrapper">
                  <div className="row row-cols-1 justify-content-center g-4">
                    {/* Video Lectures */}
                    <div className="col-12">
                      <h4 className="mb-3">Video Lectures</h4>
                    </div>
                    {filteredLectures.length > 0 ? (
                      filteredLectures.map((lecture) => (
                        <div className="col" key={lecture._id}>
                          <div className="post-item style-2">
                            <div className="post-inner">
                              <div className="post-content">
                                <Link to={`/python-lectures/${lecture._id}`}>
                                  <h3>{lecture.lectureTytle}</h3>
                                </Link>

                                <div className="meta-post">
                                  <ul className="lab-ul">
                                    <li>
                                      <i className="icofont-calendar"></i>{" "}
                                      {lecture.createdAt
                                        ? new Date(lecture.createdAt).toDateString()
                                        : "—"}
                                    </li>
                                    <li>
                                      <i className="icofont-ui-user"></i>{" "}
                                      {lecture.createby?.username || "Unknown"}
                                    </li>
                                    <li>
                                      <i className="icofont-signal"></i>{" "}
                                      {lecture.lectureDifficulty || "N/A"}
                                    </li>
                                    <li>
                                      <i className="icofont-paperclip"></i>{" "}
                                      {(lecture.pdfMaterials?.length ?? 0)} PDF
                                      {(lecture.pdfMaterials?.length ?? 0) === 1 ? "" : "s"}
                                    </li>
                                    {lecture.teacherGuideId?.coureInfo && (
                                      <li>
                                        <i className="icofont-book-alt"></i>{" "}
                                        {lecture.teacherGuideId.coureInfo}
                                      </li>
                                    )}
                                  </ul>
                                </div>

                                {lecture.description && (
                                  <p className="mb-2">
                                    {lecture.description.length > 220
                                      ? lecture.description.slice(0, 220) + "…"
                                      : lecture.description}
                                  </p>
                                )}

                                <Link to={`/python-lectures/${lecture._id}`} className="lab-btn">
                                  <span>
                                    Read More <i className="icofont-external-link"></i>
                                  </span>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center">No video lectures found.</p>
                    )}

                    {/* Papers */}
                    <div className="col-12 mt-4">
                      <h4 className="mb-3">Papers</h4>
                    </div>
                    {filteredPapers.length > 0 ? (
                      filteredPapers.map((paper) => (
                        <div className="col" key={paper._id}>
                          <div className="post-item style-2">
                            <div className="post-inner">
                              <div className="post-content">
                                <Link to={`/paper-details/${paper._id}`}>
                                  <h3>{paper.paperTytle}</h3>
                                </Link>

                                <div className="meta-post">
                                  <ul className="lab-ul">
                                    <li>
                                      <i className="icofont-calendar"></i>{" "}
                                      {paper.createdAt
                                        ? new Date(paper.createdAt).toDateString()
                                        : "—"}
                                    </li>
                                    <li>
                                      <i className="icofont-signal"></i>{" "}
                                      {paper.paperDifficulty || "N/A"}
                                    </li>
                                    {paper.teacherGuideId?.coureInfo && (
                                      <li>
                                        <i className="icofont-book-alt"></i>{" "}
                                        {paper.teacherGuideId.coureInfo}
                                      </li>
                                    )}
                                  </ul>
                                </div>

                                <Link to={`/paper-details/${paper._id}`} className="lab-btn">
                                  <span>
                                    Read More <i className="icofont-external-link"></i>
                                  </span>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center">No papers found.</p>
                    )}
                  </div>
                </div>
              </article>
            </div>

            {/* Sidebar search */}
            <div className="col-lg-4 col-12">
              <aside>
                <div className="widget widget-search">
                  <h4>Need a new search?</h4>
                  <p>If you didn't find what you were looking for, try a new search!</p>
                  <form className="search-wrapper" onSubmit={handleSearchSubmit}>
                    <input
                      type="text"
                      name="s"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                    />
                    <button type="submit">
                      <i className="icofont-search-2"></i>
                    </button>
                  </form>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </Fragment>
  );
};

export default SearchPage;
