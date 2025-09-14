import React from "react";
import { Link } from "react-router-dom";
import Rating from "../sidebar/rating";

import Avatar1 from "../../assets/images/users/avishka.png";
import Avatar2 from "../../assets/images/users/santhushi.png";
import Avatar3 from "../../assets/images/users/dihan.png";
import Avatar4 from "../../assets/images/users/avishka.png";

const subTitle = "World-class Instructors";
const title = "Classes Taught By Real Creators";

// Static list of 4 instructors
const STATIC_INSTRUCTORS = [
  {
    _id: "instructor-1",
    firstName: "Avishka",
    lastName: "Perera",
    expertise: "Beginner Python",
    imgUrl: Avatar1,
  },
  {
    _id: "instructor-2",
    firstName: "Santhushi",
    lastName: "Nallaperuma",
    expertise: "Data Structures",
    imgUrl: Avatar2,
  },
  {
    _id: "instructor-3",
    firstName: "Dihan",
    lastName: "Hansaja",
    expertise: "Algorithms",
    imgUrl: Avatar3,
  },
  {
    _id: "instructor-4",
    firstName: "Naduka",
    lastName: "De Silva",
    expertise: "Problem Solving",
    imgUrl: Avatar4,
  },
];

const Instructor = () => {
  const instructors = STATIC_INSTRUCTORS;

  return (
    <div className="instructor-section padding-tb section-bg">
      <div className="container">
        <div className="section-header text-center">
          <span className="subtitle">{subTitle}</span>
          <h2 className="title">{title}</h2>
        </div>

        <div className="section-wrapper">
          <div className="row g-4 justify-content-center row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4">
            {instructors.length > 0 ? (
              instructors.map((instructor) => (
                <div className="col" key={instructor._id}>
                  <div className="instructor-item">
                    <div className="instructor-inner">
                      <div className="instructor-thumb">
                        <img
                          src={instructor.imgUrl || "https://img.freepik.com/premium-vector/man-avatar-profile-picture-vector-illustration_268834-538.jpg"}
                          alt={`${instructor.firstName} ${instructor.lastName}`}
                        />
                      </div>
                      <div className="instructor-content">
                        <Link to="/team-single">
                          <h4>{`${instructor.firstName} ${instructor.lastName}`}</h4>
                        </Link>
                        <p>Expert in {instructor.expertise}</p>
                        <Rating />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center">No instructors available.</p>
            )}
          </div>

          <div className="text-center footer-btn">
            <p>
              Want to help people learn, grow and achieve more in life?
              {/* <Link to="/team"> Become an instructor</Link> */}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Instructor;
