import { useState } from "react";
import { useNavigate } from "react-router-dom";
import girl3 from '../../assets/images/banner/girl3.png';
const subTitle = "Online Python education";
const title = <h2 className="title"><span className="d-lg-block">Learn The</span>Python Skills You Need <span className="d-lg-block">To Succeed</span></h2>;
const desc = "Best Free Python lerning Platform's in the World";


const catagoryList = [
    {
        name: 'Coding Papers',
        link: '/paperlist',
    },
    {
        name: 'Coding Lectures',
        link: '/python-lectures',
    },
    {
        name: 'Games',
        link: '/game-launch',
    },
    {
        name: 'Pre-Guide',
        link: '/pre-guide',
    },
]


const shapeList = [
    {
        name: '100% Students Satisfaction',
        link: '#',
        className: 'ccl-shape shape-1',
    },
    {
        name: '100+ Total Python Courses',
        link: '#',
        className: 'ccl-shape shape-2',
    },
    {
        name: '99% Successful Students',
        link: '#',
        className: 'ccl-shape shape-3',
    },
    {
        name: '100+ Learners',
        link: '#',
        className: 'ccl-shape shape-4',
    },
    // {
    //     name: '36+ Languages',
    //     link: '#',
    //     className: 'ccl-shape shape-5',
    // },
]

const Banner = () => {

    const [searchQuery, setSearchQuery] = useState("");
    const navigate = useNavigate();

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search-page/${searchQuery.trim()}`);
        }
    };


    return (
        <section className="banner-section">
            <div className="container">
                <div className="section-wrapper">
                    <div className="row align-items-center">
                        <div className="col-xxl-5 col-xl-6 col-lg-10">
                            <div className="banner-content">
                                <h6 className="subtitle text-uppercase fw-medium">{subTitle}</h6>
                                {title}
                                <p className="desc">{desc}</p>
                                <form onSubmit={handleSearchSubmit}>
                                    <div className="banner-icon">
                                        <i className="icofont-search"></i>
                                    </div>
                                    <input
                                        type=""
                                        // type="text"
                                        placeholder="Search Python Lectures"
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                    />
                                    <button type="submit">Search</button>
                                </form>
                                <div className="banner-catagory d-flex flex-wrap">
                                    <p>Most Popular : </p>
                                    <ul className="lab-ul d-flex flex-wrap">
                                        {catagoryList.map((val, i) => (
                                            <li key={i}><a href={val.link}>{val.name}</a></li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="col-xxl-7 col-xl-6">
                            <div className="banner-thumb">
                                <img src="assets/images/banner/01.png" alt="img" />
                                {/* <img src={girl3} alt="img" style={{marginLeft:"100px", height:"700px"}}/> */}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="all-shapes"></div>
            <div className="cbs-content-list d-none">
                <ul className="lab-ul">
                    {shapeList.map((val, i) => (
                        <li className={val.className} key={i}><a href={val.link}>{val.name}</a></li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
 
export default Banner;