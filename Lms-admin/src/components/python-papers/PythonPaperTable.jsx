import React, { useEffect, useState } from 'react';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import Dropdown from '@/components/shared/Dropdown';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import { BsArrowLeft, BsArrowRight, BsDot } from 'react-icons/bs';
import { FiEdit3, FiTrash2, FiEye } from 'react-icons/fi'; // <-- NEW
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const PythonPaperTable = ({ title }) => {
  const navigate = useNavigate();

  const [papers, setPapers] = useState([]);

  const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } =
    useCardTitleActions();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPapers = papers.slice(startIndex, endIndex);

  useEffect(() => {
    fetchPapers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const fetchPapers = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${BASE_URL}/python/papers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = Array.isArray(res.data) ? res.data : [];
      setPapers(data);
    } catch (err) {
      console.error('Failed to load papers', err);
      Swal.fire('Error', 'Failed to load papers.', 'error');
    }
  };

  const handleDeletePaper = async (paperId) => {
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
        await axios.delete(`${BASE_URL}/python/papers/${paperId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire('Deleted!', 'Paper has been deleted.', 'success');
        fetchPapers();
      } catch (err) {
        Swal.fire('Error!', 'Failed to delete paper.', 'error');
      }
    }
  };

  const handleActionClick = (action, paper) => {
    if (action === 'Delete') {
      handleDeletePaper(paper._id);
    } else if (action === 'Edit') {
      navigate(`/admin/python-papers/edit/${paper._id}`);
    } else if (action === 'View') { // <-- NEW
      navigate(`/admin/python-papers/view/${paper._id}`);
    }
  };

  const getDropdownItems = (paper) => [
    {
      icon: <FiEye />,            // <-- NEW
      label: 'View Full Paper',   // <-- NEW
      onClick: () => handleActionClick('View', paper),
    },
    {
      icon: <FiEdit3 />,
      label: 'Edit',
      onClick: () => handleActionClick('Edit', paper),
    },
    { type: 'divider' },
    {
      icon: <FiTrash2 />,
      label: 'Delete',
      onClick: () => handleActionClick('Delete', paper),
    },
  ];

  if (isRemoved) return null;

  const totalPages = Math.max(1, Math.ceil(papers.length / itemsPerPage));

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
                  <th>Paper Title</th>
                  <th>Difficulty</th>
                  <th>Linked Teacher Guide</th>
                  <th>Created By</th>
                  <th>Created At</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPapers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4">
                      No papers found.
                    </td>
                  </tr>
                ) : (
                  paginatedPapers.map((p) => {
                    const titleTxt = p?.paperTytle || p?.paperTitle || '-';
                    const difficulty = p?.paperDifficulty || '-';
                    const tg =
                      typeof p?.teacherGuideId === 'string'
                        ? { _id: p.teacherGuideId, coureInfo: p.teacherGuideId }
                        : p?.teacherGuideId || null;
                    const creator = p?.createby || p?.createBy || {};
                    const createdAt = p?.createdAt
                      ? new Date(p.createdAt).toLocaleString()
                      : '-';

                    return (
                      <tr key={p._id}>
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
                          <div className="d-flex flex-column">
                            <span>{creator?.username || '-'}</span>
                            <small className="text-muted">{creator?.email || ''}</small>
                          </div>
                        </td>

                        <td>{createdAt}</td>

                        <td className="text-end">
                          <Dropdown
                            dropdownItems={getDropdownItems(p)}
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

export default PythonPaperTable;
