import React, { useEffect, useState } from 'react';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import Dropdown from '@/components/shared/Dropdown';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import { BsArrowLeft, BsArrowRight, BsDot } from 'react-icons/bs';
import { FiEdit3, FiTrash2, FiEye } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const StartingPaperTable = ({ title }) => {
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
      const res = await axios.get(`${BASE_URL}/starting-paper-titles`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = Array.isArray(res.data) ? res.data : [];
      setPapers(data);
    } catch (err) {
      console.error('Failed to load starting paper titles', err);
      Swal.fire('Error', 'Failed to load starting paper titles.', 'error');
    }
  };

  const handleDeleteTitle = async (paperId) => {
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
        await axios.delete(`${BASE_URL}/starting-paper-titles/${paperId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        Swal.fire('Deleted!', 'Starting paper title has been deleted.', 'success');
        fetchPapers();
      } catch (err) {
        Swal.fire('Error!', 'Failed to delete starting paper title.', 'error');
      }
    }
  };

  const handleActionClick = (action, paper) => {
    if (action === 'Delete') {
      handleDeleteTitle(paper._id);
    } else if (action === 'Edit') {
      navigate(`/admin/starting-papers/edit/${paper._id}`);
    } else if (action === 'View') {
      navigate(`/admin/starting-papers/view/${paper._id}`);
    }
  };

  const getDropdownItems = (paper) => [
    {
      icon: <FiEye />,
      label: 'View Title',
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
                  <th>Paper #</th>
                  <th>Created By</th>
                  <th>Created At</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPapers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      No starting paper titles found.
                    </td>
                  </tr>
                ) : (
                  paginatedPapers.map((p) => {
                    // API returns "paperTytle" (typo) — keep both just in case
                    const titleTxt = p?.paperTytle || p?.paperTitle || '-';
                    const paperNumber = p?.paperNumber ?? '-';
                    const creator = p?.createBy || p?.createby || p?.createBY || {};
                    const createdAt = p?.createdAt ? new Date(p.createdAt).toLocaleString() : '-';

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
                            {paperNumber}
                          </span>
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

export default StartingPaperTable;
