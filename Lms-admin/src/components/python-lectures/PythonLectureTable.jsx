import React, { useEffect, useState } from 'react';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import Dropdown from '@/components/shared/Dropdown';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import { BsArrowLeft, BsArrowRight, BsDot } from 'react-icons/bs';
import { FiEdit3, FiTrash2 } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const PythonLectureTable = ({ title }) => {
  const navigate = useNavigate();

  // lectures list from /python/video-lectures
  const [lectures, setLectures] = useState([]);

  const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } =
    useCardTitleActions();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLectures = lectures.slice(startIndex, endIndex);

  useEffect(() => {
    fetchLectures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const fetchLectures = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${BASE_URL}/python/video-lectures`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = Array.isArray(res.data) ? res.data : [];
      setLectures(data);
    } catch (err) {
      console.error('Failed to load video lectures', err);
      Swal.fire('Error', 'Failed to load video lectures.', 'error');
    }
  };

  const handleDeleteLecture = async (lectureId) => {
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
        await axios.delete(`${BASE_URL}/python/video-lectures/${lectureId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire('Deleted!', 'Video lecture has been deleted.', 'success');
        fetchLectures();
      } catch (err) {
        Swal.fire('Error!', 'Failed to delete video lecture.', 'error');
      }
    }
  };

  const handleActionClick = (action, lecture) => {
    if (action === 'Delete') {
      handleDeleteLecture(lecture._id);
    } else if (action === 'Edit') {
      // adjust as per your routes
      navigate(`/admin/python-lectures/edit/${lecture._id}`);
    }
  };

  const getDropdownItems = (lecture) => [
    {
      icon: <FiEdit3 />,
      label: 'Edit',
      onClick: () => handleActionClick('Edit', lecture),
    },
    { type: 'divider' },
    {
      icon: <FiTrash2 />,
      label: 'Delete',
      onClick: () => handleActionClick('Delete', lecture),
    },
  ];

  const openMaterials = (materials = []) => {
    if (!materials.length) {
      Swal.fire('Materials', 'No PDF materials attached.', 'info');
      return;
    }
    const htmlList = `<ul style="text-align:left;margin-left:1rem;">
      ${materials
        .map(
          (url, idx) =>
            `<li><a href="${url}" target="_blank" rel="noopener noreferrer">Material ${idx + 1}</a></li>`
        )
        .join('')}
    </ul>`;
    Swal.fire({
      title: 'Materials',
      html: htmlList,
      icon: 'info',
      confirmButtonText: 'Close',
      width: 700,
    });
  };

  if (isRemoved) return null;

  const totalPages = Math.max(1, Math.ceil(lectures.length / itemsPerPage));

  return (
    <div className="col-xxl-12">
      <div
        className={`card stretch stretch-full ${isExpanded ? 'card-expand' : ''} ${
          refreshKey ? 'card-loading' : ''
        }`}
      >
        <CardHeader
          title={title}
          refresh={handleRefresh}
          remove={handleDelete}
          expanded={handleExpand}
        />

        <div className="card-body custom-card-action p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th>Lecture Title</th>
                  <th>Difficulty</th>
                  <th>Linked Teacher Guide</th>
                  <th>Video</th>
                  <th>Materials</th>
                  <th>Created By</th>
                  <th>Created At</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLectures.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      No video lectures found.
                    </td>
                  </tr>
                ) : (
                  paginatedLectures.map((lec) => {
                    const titleTxt = lec?.lectureTytle || lec?.lectureTitle || '-';
                    const difficulty = lec?.lectureDifficulty || '-';
                    const tg =
                      typeof lec?.teacherGuideId === 'string'
                        ? { _id: lec.teacherGuideId, coureInfo: lec.teacherGuideId }
                        : lec?.teacherGuideId || null;
                    const creator = lec?.createby || lec?.createBy || {};
                    const createdAt = lec?.createdAt
                      ? new Date(lec.createdAt).toLocaleString()
                      : '-';
                    const materialsCount = Array.isArray(lec?.pdfMaterials)
                      ? lec.pdfMaterials.length
                      : 0;

                    return (
                      <tr key={lec._id}>
                        <td
                          style={{
                            minWidth: '220px',
                            maxWidth: '420px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={titleTxt}
                        >
                          {titleTxt}
                        </td>

                        <td>
                          <span className="badge bg-soft-primary text-primary">
                            {difficulty}
                          </span>
                        </td>

                        <td
                          style={{
                            minWidth: '160px',
                            maxWidth: '260px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={tg?.coureInfo || '-'}
                        >
                          {tg?.coureInfo || '-'}
                        </td>

                        <td>
                          {lec?.videoUrl ? (
                            <a
                              href={lec.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-outline-primary"
                              title="Open video"
                            >
                              Play
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="badge bg-soft-primary text-primary border-0"
                            onClick={() => openMaterials(lec?.pdfMaterials)}
                            title="See Materials"
                            style={{ cursor: 'pointer' }}
                          >
                            {materialsCount}
                          </button>
                        </td>

                        <td>
                          <div className="d-flex flex-column">
                            <span>{creator?.username || '-'}</span>
                            <small className="text-muted">{creator?.email || ''}</small>
                          </div>
                        </td>

                        <td>{createdAt}</td>

                        <td className="text-end">
                          <Dropdown
                            dropdownItems={getDropdownItems(lec)}
                            triggerClass="avatar-md ms-auto"
                            triggerPosition="0,28"
                          />
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
              const shouldShow =
                page === 1 || page === totalPages || Math.abs(currentPage - page) <= 1;

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
                  <Link
                    to="#"
                    onClick={() => setCurrentPage(page)}
                    className={currentPage === page ? 'active' : ''}
                  >
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

export default PythonLectureTable;
