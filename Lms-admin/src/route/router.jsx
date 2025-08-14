import { createBrowserRouter } from "react-router-dom";
import RootLayout from "../layout/root";
import Home from "../pages/home";
import LayoutAuth from "../layout/layoutAuth";
import LoginCreative from "../pages/login-creative";
import ResetCreative from "../pages/reset-creative";

//--------------------------------------------------
import PrivateRoute from "../utils/PrivateRoute";
import TeacherGuide from "../pages/teacher-guide/teacher-guide";
import AddTeacherGuide from "../pages/teacher-guide/add-teacher-guide";
import UpdateTeacherGuide from "../pages/teacher-guide/update-teacher-guide";
import TeacherGuideFeedback from "../pages/teacher-guide/teacher-guide-feedback";
import PythonLecture from "../pages/python-lectures/python-lectures";
import AddPythonLectures from "../pages/python-lectures/add-python-lectures";
import UpdatePythonLectures from "../pages/python-lectures/update-python-lectures";
import PythonPapers from "../pages/python-papers/python-paper";
import AddPythonPapers from "../pages/python-papers/add-python-paper";
import UpdatePythonPapers from "../pages/python-papers/update-python-paper";
import ViewPythonPapers from "../pages/python-papers/view-python-paper";
import VisualLearning from "../pages/visual-learning/visual-learning";
import AddVisualLearning from "../pages/visual-learning/add-visual-learning";
import UpdateVisualLearning from "../pages/visual-learning/update-visual-learning";
import ViewVisualLearning from "../pages/visual-learning/view-visual-learning";
import AuditoryLearning from "../pages/auditory-learning/auditory-learning";
import AddAuditoryLearning from "../pages/auditory-learning/add-auditory-learning";
import UpdateAuditoryLearning from "../pages/auditory-learning/update-auditiry-learning";
import ViewAuditoryLearning from "../pages/auditory-learning/view-auditory-learning";
import ReadAndWrite from "../pages/read-and-write/read-write";
import AddReadAndWrite from "../pages/read-and-write/add--read-write";
import UpdateReadAndWrite from "../pages/read-and-write/update-read-write";
import ViewReadAndWrite from "../pages/read-and-write/view--read-write";
import Kinesthetic from "../pages/kinesthetic/kinesthetic";
import AddKinesthetic from "../pages/kinesthetic/add-kinesthetic";
import UpdateKinesthetic from "../pages/kinesthetic/update-kinesthetic";
import StartingPapers from "../pages/starting-papers/starting-paper";
import AddStartingPapers from "../pages/starting-papers/add-starting-paper";
import UpdateStartingPapers from "../pages/starting-papers/starting-python-paper";
import ViewStartingPapers from "../pages/starting-papers/view-starting-paper";
import UserDetails from "../pages/user/user-details";

export const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <PrivateRoute>
              <RootLayout />
            </PrivateRoute>
          ),
        children: [
            {
                path: "/",
                element: <Home />
            },
            {
                path: "/admin/teacher-guide",
                element: <TeacherGuide />
            },
            {
                path: "/admin/teacher-guide/create",
                element: <AddTeacherGuide />
            },
            {
                path: "/admin/teacher-guides/edit/:id",
                element: <UpdateTeacherGuide />
            },
            {
                path: "/admin/teacher-guides-feedback/:id",
                element: <TeacherGuideFeedback />
            },

            {
                path: "/admin/python-lectures",
                element: <PythonLecture />
            },
            {
                path: "/admin/python-lectures/create",
                element: <AddPythonLectures />
            },
            {
                path: "/admin/python-lectures/edit/:id",
                element: <UpdatePythonLectures />
            },
            
            {
                path: "/admin/python-papers",
                element: <PythonPapers />
            },
            {
                path: "/admin/python-papers/create",
                element: <AddPythonPapers />
            },
            {
                path: "/admin/python-papers/edit/:id",
                element: <UpdatePythonPapers />
            },
            {
                path: "/admin/python-papers/view/:id",
                element: <ViewPythonPapers />
            },

            {
                path: "/admin/visual-learning",
                element: <VisualLearning />
            },
            {
                path: "/admin/visual-learning/create",
                element: <AddVisualLearning />
            },
            {
                path: "/admin/visual-learning/edit/:id",
                element: <UpdateVisualLearning />
            },
            {
                path: "/admin/visual-learning/view/:id",
                element: <ViewVisualLearning />
            },

            {
                path: "/admin/auditory-learning",
                element: <AuditoryLearning />
            },
            {
                path: "/admin/auditory-learning/create",
                element: <AddAuditoryLearning />
            },
            {
                path: "/admin/auditory-learning/edit/:id",
                element: <UpdateAuditoryLearning />
            },
            {
                path: "/admin/auditory-learning/view/:id",
                element: <ViewAuditoryLearning />
            },

            {
                path: "/admin/read-and-write",
                element: <ReadAndWrite />
            },
            {
                path: "/admin/read-and-write/create",
                element: <AddReadAndWrite />
            },
            {
                path: "/admin/read-and-write/edit/:id",
                element: <UpdateReadAndWrite />
            },
            {
                path: "/admin/read-and-write/view/:id",
                element: <ViewReadAndWrite />
            },

            {
                path: "/admin/kinesthetic",
                element: <Kinesthetic />
            },
            {
                path: "/admin/kinesthetic/create",
                element: <AddKinesthetic />
            },
            {
                path: "/admin/kinesthetic/edit/:id",
                element: <UpdateKinesthetic />
            },

            {
                path: "/admin/starting-papers",
                element: <StartingPapers />
            },
            {
                path: "/admin/starting-papers/create",
                element: <AddStartingPapers />
            },
            {
                path: "/admin/starting-papers/edit/:id",
                element: <UpdateStartingPapers />
            },
            {
                path: "/admin/starting-papers/view/:id",
                element: <ViewStartingPapers />
            },

            {
                path: "/admin/user-list",
                element: <UserDetails />
            },
            
            
        ]
    },
    {
        path: "/",
        element: <LayoutAuth />,
        children: [
            {
                path: "/authentication/login/creative",
                element: <LoginCreative />
            },
            {
                path: "/authentication/reset/creative",
                element: <ResetCreative />
            },
        ]
    }
])