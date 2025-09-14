import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../component/layout/footer";
import Header from "../component/layout/header";
import PageHeader from "../component/layout/pageheader";
import Pagination from "../component/sidebar/pagination";
import paperimg from "../assets/images/papers/paperimg.jpg";
import apiClient from "../api";

const PaperList = () => {
  const [papers, setPapers] = useState([]);
  const [filteredPapers, setFilteredPapers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPapers();
  }, []);

  useEffect(() => {
    handleSearch();
  }, [searchQuery, papers]);

  const fetchPapers = async () => {
    try {
      const response = await apiClient.get("/api/python/papers");
      setPapers(response.data);
      setFilteredPapers(response.data);
      setLoading(false);
    } catch (error) {
      setError("Failed to fetch papers.");
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const filtered = papers.filter((paper) =>
      paper.paperTytle.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPapers(filtered);
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  return (
    <Fragment>
      <Header />
      <PageHeader title={"Available Papers"} curPage={"Papers"} />
      <div className="blog-section padding-tb section-bg">
        <div className="container">
          <div className="row justify-content-center">
            {/* Sidebar */}
            <div className="col-lg-3 col-12">
              <aside>
                <div className="widget widget-search">
                  <form className="search-wrapper" onSubmit={(e) => e.preventDefault()}>
                    <input
                      type=""
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={handleInputChange}
                    />
                    <button type="submit">
                      <i className="icofont-search-2"></i>
                    </button>
                  </form>
                </div>
                <div className="widget widget-category">
                  <div className="widget-header">
                    <h5 className="title">Paper List</h5>
                  </div>
                  <ul className="widget-wrapper">
                    {filteredPapers.map((paper) => (
                      <li key={paper._id}>
                        <Link
                          to={`/paper-details/${paper._id}`}
                          className="d-flex flex-wrap justify-content-between"
                        >
                          <span>
                            <i className="icofont-double-right"></i>{" "}
                            {paper.paperTytle}
                          </span>
                        </Link>
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
                <p>{error}</p>
              ) : filteredPapers.length > 0 ? (
                <article>
                  <div className="section-wrapper">
                    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 justify-content-center g-4">
                      {filteredPapers.map((paper) => (
                        <div className="col" key={paper._id}>
                          <div className="post-item">
                            <div className="post-inner">
                              <div className="post-thumb">
                                <Link to={`/paper-details/${paper._id}`}>
                                  <img src={paperimg} alt="Paper Thumbnail" />
                                </Link>
                              </div>
                              <div className="post-content" style={{ minHeight: "230px" }}>
                                <Link to={`/paper-details/${paper._id}`}>
                                  <h4>{paper.paperTytle}</h4>
                                </Link>
                                <div className="meta-post">
                                  <ul className="lab-ul">
                                    <li>
                                      <i className="icofont-calendar"></i>{" "}
                                      {new Date(paper.createdAt).toLocaleDateString()}
                                    </li>
                                    <li>
                                      <i className="icofont-graduate-alt"></i>{" "}
                                      {paper.teacherGuideId?.coureInfo}
                                    </li>
                                  </ul>
                                </div>
                                <p>
                                  Difficulty: {paper.paperDifficulty}
                                </p>
                              </div>
                              <div className="post-footer">
                                <div className="pf-left">
                                  <Link
                                    to={`/paper-details/${paper._id}`}
                                    className="lab-btn-text"
                                  >
                                    View Paper <i className="icofont-external-link"></i>
                                  </Link>
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

export default PaperList;
