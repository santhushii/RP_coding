import React, { useEffect, useState } from 'react';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import Dropdown from '@/components/shared/Dropdown';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import { BsArrowLeft, BsArrowRight, BsDot } from 'react-icons/bs';
import { FiEdit3, FiTrash2, FiMessageSquare } from 'react-icons/fi'; // <-- NEW icon
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const TeacherGuideTable = ({ title }) => {
  const navigate = useNavigate();
  const [guides, setGuides] = useState([]);
  const [feedbackCounts, setFeedbackCounts] = useState({}); // guideId -> count
  const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } = useCardTitleActions();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGuides = guides.slice(startIndex, endIndex);

  useEffect(() => {
    fetchGuidesAndFeedbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const fetchGuidesAndFeedbacks = async () => {
    try {
      const token = getToken();
      const [guidesRes, feedbacksRes] = await Promise.all([
        axios.get(`${BASE_URL}/teacher-guides`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${BASE_URL}/teacher-guide-feedbacks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const guidesData = Array.isArray(guidesRes.data) ? guidesRes.data : [];
      const feedbacks = Array.isArray(feedbacksRes.data) ? feedbacksRes.data : [];

      const counts = feedbacks.reduce((acc, fb) => {
        const gid = typeof fb?.teacherGuideId === 'string'
          ? fb.teacherGuideId
          : fb?.teacherGuideId?._id;
        if (gid) acc[gid] = (acc[gid] || 0) + 1;
        return acc;
      }, {});

      setGuides(guidesData);
      setFeedbackCounts(counts);
    } catch (err) {
      console.error('Failed to load teacher guides or feedbacks', err);
      Swal.fire('Error', 'Failed to load teacher guides or feedbacks.', 'error');
    }
  };

  const handleDeleteGuide = async (guideId) => {
    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
    });

    if (confirm.isConfirmed) {
      try {
        const token = getToken();
        await axios.delete(`${BASE_URL}/teacher-guides/${guideId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire('Deleted!', 'Teacher guide has been deleted.', 'success');
        fetchGuidesAndFeedbacks();
      } catch (err) {
        Swal.fire('Error!', 'Failed to delete teacher guide.', 'error');
      }
    }
  };

  const handleActionClick = (action, guideId) => {
    if (action === 'Delete') {
      handleDeleteGuide(guideId);
    } else if (action === 'Edit') {
      navigate(`/admin/teacher-guides/edit/${guideId}`);
    } else if (action === 'Suggestions') {
      // <-- NEW route
      navigate(`/admin/teacher-guides-feedback/${guideId}`);
    }
  };

  const getDropdownItems = (guideId) => [
    {
      icon: <FiEdit3 />,
      label: 'Edit',
      onClick: () => handleActionClick('Edit', guideId),
    },
    {
      icon: <FiMessageSquare />, // <-- NEW item
      label: 'See Suggestions',
      onClick: () => handleActionClick('Suggestions', guideId),
    },
    { type: 'divider' },
    {
      icon: <FiTrash2 />,
      label: 'Delete',
      onClick: () => handleActionClick('Delete', guideId),
    },
  ];

  if (isRemoved) return null;

  const totalPages = Math.max(1, Math.ceil(guides.length / itemsPerPage));

  return (
    <div className="col-xxl-12">
      <div className={`card stretch stretch-full ${isExpanded ? 'card-expand' : ''} ${refreshKey ? 'card-loading' : ''}`}>
        <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />

        <div className="card-body custom-card-action p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Course Info</th>
                  <th>Original Teacher Guide</th>
                  <th>Created By</th>
                  <th>Created At</th>
                  <th>Feedbacks</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGuides.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      No teacher guides found.
                    </td>
                  </tr>
                ) : (
                  paginatedGuides.map((g) => (
                    <tr key={g._id}>
                      <td
                        style={{ minWidth: '160px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={g.coureInfo}
                      >
                        {g.coureInfo}
                      </td>
                      <td
                        style={{ minWidth: '220px', maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={g.originalTeacherGuide}
                      >
                        {g.originalTeacherGuide}
                      </td>
                      <td>
                        <div className="d-flex flex-column">
                          <span>{g?.createBy?.username || '-'}</span>
                          <small className="text-muted">{g?.createBy?.email || ''}</small>
                        </div>
                      </td>
                      <td>{g?.createdAt ? new Date(g.createdAt).toLocaleString() : '-'}</td>
                      <td>
                        {/* Make the badge a quick link to Suggestions page */}
                        <button
                          type="button"
                          className="badge bg-soft-primary text-primary border-0"
                          onClick={() => navigate(`/admin/teacher-guides-feedback/${g._id}`)}
                          title="See Suggestions"
                          style={{ cursor: 'pointer' }}
                        >
                          {feedbackCounts[g._id] || 0}
                        </button>
                      </td>
                      <td className="text-end">
                        <Dropdown
                          dropdownItems={getDropdownItems(g._id)}
                          triggerClass="avatar-md ms-auto"
                          triggerPosition="0,28"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-footer">
          <ul className="list-unstyled d-flex align-items-center gap-2 mb-0 pagination-common-style">
            <li>
              <Link
                to="#"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className={currentPage === 1 ? 'disabled' : ''}
              >
                <BsArrowLeft size={16} />
              </Link>
            </li>
            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1;
              const shouldShow = page === 1 || page === totalPages || Math.abs(currentPage - page) <= 1;

              if (!shouldShow && (page === 2 || page === totalPages - 1)) {
                return (
                  <li key={`dots-${index}`}>
                    <Link to="#" onClick={(e) => e.preventDefault()}>
                      <BsDot size={16} />
                    </Link>
                  </li>
                );
              }

              return shouldShow ? (
                <li key={index}>
                  <Link to="#" onClick={() => setCurrentPage(page)} className={currentPage === page ? 'active' : ''}>
                    {page}
                  </Link>
                </li>
              ) : null;
            })}
            <li>
              <Link
                to="#"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className={currentPage === totalPages ? 'disabled' : ''}
              >
                <BsArrowRight size={16} />
              </Link>
            </li>
          </ul>
        </div>

        <CardLoader refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default TeacherGuideTable;
