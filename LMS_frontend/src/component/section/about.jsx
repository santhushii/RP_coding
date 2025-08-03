const subTitle = "Welcome to Codingඉස්කෝලේ";
const title = "Empowering Young Minds to Master Python";
const desc =
  "Learn Python the fun way—with bite-size lessons, hands-on projects, an in-browser code runner, and clear progress tracking. Perfect for beginners, students, and curious makers.";

const aboutList = [
  {
    imgUrl: 'assets/images/about/icon/01.jpg',
    imgAlt: 'about icon learn by building',
    title: 'Learn by Building',
    desc: 'Create small apps, games, and automations while mastering Python basics step by step. Each lesson focuses on writing real code and understanding why it works.',
  },
//   {
//     imgUrl: 'assets/images/about/icon/02.jpg',
//     imgAlt: 'about icon earn certificates',
//     title: 'Badges & Certificates',
//     desc: 'Hit milestones, collect badges, and earn shareable certificates that reflect your Python skills—from variables and loops to functions and problem solving.',
//   },
  {
    imgUrl: 'assets/images/about/icon/03.jpg',
    imgAlt: 'about icon interactive playground',
    title: 'Interactive Python Playground',
    desc: 'Run code right in your browser, get instant feedback, and practice with guided challenges. No setup needed—just type, run, and learn.',
  },
];

const About = () => {
  return (
    <div className="about-section">
      <div className="container">
        <div className="row justify-content-center row-cols-xl-2 row-cols-1 align-items-end flex-row-reverse">
          <div className="col">
            <div className="about-right padding-tb">
              <div className="section-header">
                <span className="subtitle">{subTitle}</span>
                <h2 className="title">{title}</h2>
                <p>{desc}</p>
              </div>
              <div className="section-wrapper">
                <ul className="lab-ul">
                  {aboutList.map((val, i) => (
                    <li key={i}>
                      <div className="sr-left">
                        <img src={`${val.imgUrl}`} alt={`${val.imgAlt}`} />
                      </div>
                      <div className="sr-right">
                        <h5>{val.title}</h5>
                        <p>{val.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="col">
            <div className="about-left">
              <div className="about-thumb">
                <img src="assets/images/about/01.png" alt="about" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
