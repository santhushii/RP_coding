import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import {
  FiUsers,
  FiMessageSquare,
  FiPlayCircle,
  FiFileText,
  FiEye,
  FiHeadphones,
  FiActivity,
  FiEdit3,
} from 'react-icons/fi';

const SiteOverviewStatistics = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    feedbackCount: 0,
    pythonLectures: 0,
    pythonPapers: 0,
    visualCount: 0,
    auditoryCount: 0,
    kinestheticCount: 0,
    readWriteCount: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const requests = [
        axios.get(`${BASE_URL}/users/`, { headers }),                          // users
        axios.get(`${BASE_URL}/teacher-guide-feedbacks/`, { headers }),        // feedbacks
        axios.get(`${BASE_URL}/python/video-lectures/`, { headers }),          // python lectures
        axios.get(`${BASE_URL}/python/papers`, { headers }),                   // python papers
        axios.get(`${BASE_URL}/visual/learning/`, { headers }),                // visual
        axios.get(`${BASE_URL}/auditory/learning/`, { headers }),              // auditory
        axios.get(`${BASE_URL}/kinesthetic/learning/`, { headers }),           // kinesthetic
        axios.get(`${BASE_URL}/readwrite/learning/`, { headers }),             // read & write
      ];

      try {
        const results = await Promise.allSettled(requests);

        const safeLen = (idx) =>
          results[idx].status === 'fulfilled' && Array.isArray(results[idx].value?.data)
            ? results[idx].value.data.length
            : 0;

        setStats({
          totalUsers: safeLen(0),
          feedbackCount: safeLen(1),
          pythonLectures: safeLen(2),
          pythonPapers: safeLen(3),
          visualCount: safeLen(4),
          auditoryCount: safeLen(5),
          kinestheticCount: safeLen(6),
          readWriteCount: safeLen(7),
        });
      } catch {
        setStats({
          totalUsers: 0,
          feedbackCount: 0,
          pythonLectures: 0,
          pythonPapers: 0,
          visualCount: 0,
          auditoryCount: 0,
          kinestheticCount: 0,
          readWriteCount: 0,
        });
      }
    };

    fetchStats();
  }, []);

  const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

  const data = [
    {
      id: 1,
      icon: <FiUsers />,
      title: 'Users',
      count: stats.totalUsers,
      label: plural(stats.totalUsers, 'User'),
    },
    {
      id: 2,
      icon: <FiMessageSquare />,
      title: 'Feedbacks',
      count: stats.feedbackCount,
      label: plural(stats.feedbackCount, 'Feedback'),
    },
    {
      id: 3,
      icon: <FiPlayCircle />,
      title: 'Python Lectures',
      count: stats.pythonLectures,
      label: plural(stats.pythonLectures, 'Lecture'),
    },
    {
      id: 4,
      icon: <FiFileText />,
      title: 'Python Papers',
      count: stats.pythonPapers,
      label: plural(stats.pythonPapers, 'Paper'),
    },
    {
      id: 5,
      icon: <FiEye />,
      title: 'Visual Learning',
      count: stats.visualCount,
      label: plural(stats.visualCount, 'Record'),
    },
    {
      id: 6,
      icon: <FiHeadphones />,
      title: 'Auditory Learning',
      count: stats.auditoryCount,
      label: plural(stats.auditoryCount, 'Record'),
    },
    {
      id: 7,
      icon: <FiActivity />,
      title: 'Kinesthetic Learning',
      count: stats.kinestheticCount,
      label: plural(stats.kinestheticCount, 'Record'),
    },
    {
      id: 8,
      icon: <FiEdit3 />,
      title: 'Read & Write Learning',
      count: stats.readWriteCount,
      label: plural(stats.readWriteCount, 'Record'),
    },
  ];

  return (
    <>
      {data.map(({ id, icon, title, count, label }) => (
        <div key={id} className="col-xxl-3 col-md-6">
          <div className="card stretch stretch-full short-info-card">
            <div className="card-body">
              <div className="d-flex align-items-center gap-3 mb-2">
                <div className="avatar-text avatar-lg bg-gray-200 icon">
                  {React.cloneElement(icon, { size: 24 })}
                </div>
                <div>
                  <div className="fs-2 fw-bold text-dark">{count}</div>
                  <div className="fs-14 fw-semibold text-truncate-1-line">{title}</div>
                </div>
              </div>
              <div className="text-end pt-2">
                <span className="fs-12 text-muted">{label}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default SiteOverviewStatistics;
