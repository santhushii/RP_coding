import { BrowserRouter, Routes, Route } from "react-router-dom";
import 'swiper/css';
import ScrollToTop from "./component/layout/ScrollToTop";
import ProtectedRoute from "./ProtectedRoute"; 
import ErrorPage from "./page/404";
import AboutPage from "./page/about";
import ContactPage from "./page/contact";
import ForgetPass from "./page/forgetpass";
import Home from "./page/home";
import LoginPage from "./page/login";
import SearchNone from "./page/search-none";
import SearchPage from "./page/search-page";
import SignupPage from "./page/signup";
import PaperList from "./page/PaperList";
import PaperDetails from "./page/PaperDetails";
import StudentProfile from "./page/StudentProfile";
import GameLaunch from "./page/GameLaunch";
import AutoCapture from "./page/CameraCapturing";
import PythonLectures from "./page/PythonLectures";
import PythonLectureView from "./page/PythonLecture-view";
import CodingCompiler from "./page/CodingCompiler";
import PreGuide from "./page/Pre-Guide";
import VisualLearning from "./page/VisualLearning";
import VisualLearningView from "./page/VisualLearningView";
import AuditoryLearning from "./page/AuditoryLearning";
import AuditoryLearningView from "./page/AuditoryLearningView";
import KinestheticLearning from "./page/KinestheticLearning";
import KinestheticLearningDetails from "./page/KinestheticLearningDetails";
import ReadAndWriteLearning from "./page/ReadAndWriteLearning";
import ReadAndWriteLearningDetails from "./page/ReadAndWriteLearningDetails";
import StartingPaper from "./page/StartingPaper";

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
        <AutoCapture />
      <Routes>
        {/* Public Routes */}
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="forgetpass" element={<ForgetPass />} />
        

        {/* Protected Routes: Requires Login */}
        <Route element={<ProtectedRoute />}>

          <Route path="starting-paper/" element={<StartingPaper />} />
          
          <Route path="python-lectures" element={<PythonLectures />} />
          <Route path="python-view/:id" element={<PythonLectureView />} />

          <Route path="compiler" element={<CodingCompiler />} />

          <Route path="paperlist" element={<PaperList />} />
          <Route path="paper-details/:paperId" element={<PaperDetails />} />

          <Route path="pre-guide" element={<PreGuide />} />

          <Route path="VisualLearning" element={<VisualLearning />} />
          <Route path="VisualLearning-details/:id" element={<VisualLearningView />} />

          <Route path="AuditoryLearning" element={<AuditoryLearning />} />
          <Route path="AuditoryLearning-details/:id" element={<AuditoryLearningView />} />

          <Route path="KinestheticLearning" element={<KinestheticLearning />} />
          <Route path="KinestheticLearning-details/:id" element={<KinestheticLearningDetails />} />

          <Route path="ReadAndWriteLearning" element={<ReadAndWriteLearning />} />
          <Route path="readwrite-details/:id" element={<ReadAndWriteLearningDetails />} />


          <Route path="studentprofile" element={<StudentProfile />} />

          <Route path="/" element={<Home />} />

          <Route path="game-launch" element={<GameLaunch />} />

          <Route path="search-page/:name" element={<SearchPage />} />

          <Route path="about" element={<AboutPage />} />
          
          
          <Route path="search-none" element={<SearchNone />} />
          <Route path="contact" element={<ContactPage />} />


        </Route>

        {/* 404 Page */}
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
