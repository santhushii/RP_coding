import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import Dropdown from '@/components/shared/Dropdown';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import { BsArrowLeft, BsArrowRight, BsDot } from 'react-icons/bs';
import { FiExternalLink, FiRefreshCcw, FiCopy } from 'react-icons/fi';
import Swal from 'sweetalert2';

const TeacherGuideFeedbackTable = ({ title }) => {
  const { id } = useParams(); // teacherGuideId from route    
  const navigate = useNavigate();

  const [feedbacks, setFeedbacks] = useState([]); // list of feedback objects
  const [suggestions, setSuggestions] = useState({}); // feedbackId -> suggestion text
  const [loadingSuggestions, setLoadingSuggestions] = useState({}); // feedbackId -> boolean

  const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } =
    useCardTitleActions();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFeedbacks = feedbacks.slice(startIndex, endIndex);

  useEffect(() => {
    fetchFeedbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, id]);

  const fetchFeedbacks = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${BASE_URL}/teacher-guide-feedbacks/guideId/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setFeedbacks(list);

      // Kick off suggestions for all rows
      await generateSuggestions(list);
    } catch (err) {
      console.error('Failed to load feedbacks', err);
      Swal.fire('Error', 'Failed to load feedbacks.', 'error');
    }
  };

  const callSuggester = async ({ studentFeedback, guide }) => {
    const payload = {
      student_feedback: studentFeedback || '',
      course_info: guide?.coureInfo || '',
      original_teacher_guide: guide?.originalTeacherGuide || '',
    };
    const { data } = await axios.post(`http://127.0.0.1:5000/predict-suggester`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    return data?.suggestion || '';
  };

  const generateSuggestions = async (list) => {
    // Fetch suggestions for any rows we don't have yet
    const missing = list.filter((fb) => !suggestions[fb._id]);
    if (missing.length === 0) return;

    // Optimistic mark as loading
    const newLoading = {};
    missing.forEach((fb) => (newLoading[fb._id] = true));
    setLoadingSuggestions((prev) => ({ ...prev, ...newLoading }));

    try {
      const results = await Promise.all(
        missing.map(async (fb) => {
          try {
            const s = await callSuggester({
              studentFeedback: fb.studentFeedback,
              guide: fb.teacherGuideId,
            });
            return [fb._id, s];
          } catch (e) {
            console.error('Suggester failed for feedback', fb._id, e);
            return [fb._id, '(suggestion unavailable)'];
          }
        })
      );
      const map = Object.fromEntries(results);
      setSuggestions((prev) => ({ ...prev, ...map }));
    } finally {
      const cleared = {};
      missing.forEach((fb) => (cleared[fb._id] = false));
      setLoadingSuggestions((prev) => ({ ...prev, ...cleared }));
    }
  };

  const regenerateFor = async (fb) => {
    setLoadingSuggestions((prev) => ({ ...prev, [fb._id]: true }));
    try {
      const s = await callSuggester({
        studentFeedback: fb.studentFeedback,
        guide: fb.teacherGuideId,
      });
      setSuggestions((prev) => ({ ...prev, [fb._id]: s }));
    } catch (e) {
      Swal.fire('Error', 'Failed to regenerate suggestion.', 'error');
    } finally {
      setLoadingSuggestions((prev) => ({ ...prev, [fb._id]: false }));
    }
  };

  const copySuggestion = async (fbId) => {
    const text = suggestions[fbId] || '';
    try {
      await navigator.clipboard.writeText(text);
      Swal.fire({
        icon: 'success',
        title: 'Copied',
        text: 'Suggestion copied to clipboard.',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire('Error', 'Could not copy to clipboard.', 'error');
    }
  };

  const openGuide = (fb) => {
    const guideId = typeof fb?.teacherGuideId === 'string' ? fb.teacherGuideId : fb?.teacherGuideId?._id;
    if (guideId) navigate(`/admin/teacher-guides/edit/${guideId}`);
  };

  const getDropdownItems = (fb) => [
    {
      icon: <FiExternalLink />,
      label: 'View Guide',
      onClick: () => openGuide(fb),
    },
    {
      icon: <FiCopy />,
      label: 'Copy Suggestion',
      onClick: () => copySuggestion(fb._id),
    },
    {
      icon: <FiRefreshCcw />,
      label: 'Regenerate',
      onClick: () => regenerateFor(fb),
    },
  ];

  if (isRemoved) return null;

  const totalPages = Math.max(1, Math.ceil(feedbacks.length / itemsPerPage));

  const courseInfo =
    feedbacks[0]?.teacherGuideId?.coureInfo ||
    feedbacks.find((f) => f?.teacherGuideId?.coureInfo)?.teacherGuideId?.coureInfo ||
    '';

  // ✅ styles to show full suggestion text with preserved line breaks
  const suggestionCellStyle = { whiteSpace: 'pre-wrap', wordBreak: 'break-word' };

  return (
    <div className="col-xxl-12">
      <div className={`card stretch stretch-full ${isExpanded ? 'card-expand' : ''} ${refreshKey ? 'card-loading' : ''}`}>
        <CardHeader
          title={courseInfo ? `${title} — ${courseInfo}` : title}
          refresh={handleRefresh}
          remove={handleDelete}
          expanded={handleExpand}
        />

        <div className="card-body custom-card-action p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th style={{ minWidth: 160 }}>Student</th>
                  <th style={{ minWidth: 260 }}>Feedback</th>
                  <th>Suggestion</th> {/* full width */}
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFeedbacks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      No feedback found.
                    </td>
                  </tr>
                ) : (
                  paginatedFeedbacks.map((fb) => {
                    const studentName = fb?.studentId?.username || fb?.studentId?.email || '—';
                    const s = suggestions[fb._id];

                    return (
                      <tr key={fb._id}>
                        <td title={fb?.studentId?.email || ''}>{studentName}</td>
                        <td
                          title={fb?.studentFeedback || ''}
                          style={{ maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {fb?.studentFeedback || ''}
                        </td>
                        <td style={suggestionCellStyle}>
                          {loadingSuggestions[fb._id] ? (
                            <span className="text-muted">Generating...</span>
                          ) : (
                            s || <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-end">
                          <Dropdown dropdownItems={getDropdownItems(fb)} triggerClass="avatar-md ms-auto" triggerPosition="0,28" />
                        </td>
                      </tr>
                    );
                  })
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

export default TeacherGuideFeedbackTable;
