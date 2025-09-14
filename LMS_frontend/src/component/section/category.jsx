import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import apiClient from "../../api";

const subTitle = "Popular Category";
const title = "Popular Category For Learning";
const btnText = "Browse All Categories";

const Category = () => {
    const [videoLectureCount, setVideoLectureCount] = useState(0);
    const [paperCount, setPaperCount] = useState(0);

    useEffect(() => {
        fetchPapers();
        fetchVideoLectures();
    }, []);

    const fetchVideoLectures = async () => {
        try {
            const response = await apiClient.get("api/python/video-lectures");
            setVideoLectureCount(response.data.length);
        } catch (error) {
            console.error("Error fetching video lectures:", error);
        }
    };


    const fetchPapers = async () => {
        try {
            const response = await apiClient.get("/api/python/papers");
            setPaperCount(response.data.length);
        } catch (error) {
            console.error("Error fetching:", error);
        }
    };  
      

    const categoryList = [
        {
            imgUrl: 'assets/images/category/icon/01.jpg',
            imgAlt: 'category',
            title: 'Python Lecture videos',
            count: `${videoLectureCount} Videos`,
            url: '/python-lectures',
        },
        {
            imgUrl: 'assets/images/category/icon/02.jpg',
            imgAlt: 'category',
            title: 'Python Lecture Papers',
            count: `${paperCount} Activities`,
            url: '/paperlist',
        },
        {
            imgUrl: 'assets/images/category/icon/03.jpg',
            imgAlt: 'category',
            title: 'Pre - Guide Categories',
            count: `4 Categories`,
            url: '/pre-guide',
        },
        {
            imgUrl: 'assets/images/category/icon/16.jpg',
            imgAlt: 'category',
            title: 'Python Fun Games',
            count: `2 Games`,
            url: '/game-launch',
        },
    ];

    return (
        <div className="category-section padding-tb">
            <div className="container">
                <div className="section-header text-center">
                    <span className="subtitle">{subTitle}</span>
                    <h2 className="title">{title}</h2>
                </div>
                <div className="section-wrapper">
                    <div className="row g-2 justify-content-center row-cols-xl-6 row-cols-md-3 row-cols-sm-2 row-cols-1">
                        {categoryList.map((val, i) => (
                            <div className="col" key={i}>
                                <div className="category-item text-center">
                                    <div className="category-inner" style={{ minHeight: "280px" }}>
                                        <div className="category-thumb">
                                            <img src={`${val.imgUrl}`} alt={val.imgAlt} />
                                        </div>
                                        <div className="category-content">
                                            <Link to={val.url}>
                                                <h6>{val.title}</h6>
                                            </Link>
                                            <span>{val.count}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* <div className="text-center mt-5">
                        <Link to="/course" className="lab-btn">
                            <span>{btnText}</span>
                        </Link>
                    </div> */}
                </div>
            </div>
        </div>
    );
};

export default Category;
