import React, { useEffect, useState } from 'react';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import Dropdown from '@/components/shared/Dropdown';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import { FiEdit3, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const KinestheticTable = ({ title }) => {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);

  const {
    refreshKey,
    isRemoved,
    isExpanded,
    handleRefresh,
    handleExpand,
    handleDelete,
  } = useCardTitleActions();

  useEffect(() => {
    fetchKinesthetics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const fetchKinesthetics = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${BASE_URL}/kinesthetic/learning`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setItems(data);
    } catch (err) {
      console.error('Failed to load kinesthetic learning items', err);
      Swal.fire('Error', 'Failed to load kinesthetic learning items.', 'error');
    }
  };

  const handleDeletes = async (id) => {
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
        await axios.delete(`${BASE_URL}/kinesthetic/learning/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        Swal.fire('Deleted!', 'Kinesthetic learning item has been deleted.', 'success');
        fetchKinesthetics();
      } catch (err) {
        Swal.fire('Error!', 'Failed to delete kinesthetic learning item.', 'error');
      }
    }
  };

  const handleActionClick = (action, row) => {
    if (action === 'Delete') {
      handleDeletes(row._id);
    } else if (action === 'Edit') {
      navigate(`/admin/kinesthetic/edit/${row._id}`);
    }
  };

  const getDropdownItems = (row) => [
    {
      icon: <FiEdit3 />,
      label: 'Edit',
      onClick: () => handleActionClick('Edit', row),
    },
    { type: 'divider' },
    {
      icon: <FiTrash2 />,
      label: 'Delete',
      onClick: () => handleActionClick('Delete', row),
    },
  ];

  if (isRemoved) return null;

  // Common cell style: show ALL text (no truncation/ellipsis), wrap nicely
  const cellStyle = {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

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
                  <th>Title</th>
                  <th>Linked Teacher Guide</th>
                  <th>Question</th>
                  <th>Instruction</th>
                  <th>Answer</th>
                  <th>Created At</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      No kinesthetic learning items found.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const tg =
                      typeof row?.TeacherGuideId === 'string'
                        ? { _id: row.TeacherGuideId, coureInfo: row.TeacherGuideId }
                        : row?.TeacherGuideId ||
                          (typeof row?.teacherguideId === 'string'
                            ? { _id: row.teacherguideId, coureInfo: row.teacherguideId }
                            : row?.teacherguideId) ||
                          null;

                    const createdAt = row?.createdAt
                      ? new Date(row.createdAt).toLocaleString()
                      : '-';

                    return (
                      <tr key={row._id}>
                        <td style={cellStyle} title={row?.title || '-'}>
                          {row?.title || '-'}
                        </td>

                        <td style={cellStyle} title={tg?.coureInfo || '-'}>
                          {tg?.coureInfo || '-'}
                        </td>

                        <td style={cellStyle} title={row?.Question || '-'}>
                          {row?.Question || '-'}
                        </td>

                        <td
                          style={cellStyle}
                          title={row?.Instructuion || row?.Instruction || '-'}
                        >
                          {row?.Instructuion || row?.Instruction || '-'}
                        </td>

                        <td style={cellStyle} title={String(row?.answer ?? '-')}>
                          {String(row?.answer ?? '-')}
                        </td>

                        <td style={cellStyle}>{createdAt}</td>

                        <td className="text-end">
                          <Dropdown
                            dropdownItems={getDropdownItems(row)}
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

        {/* No pagination — show ALL rows */}
        <CardLoader refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default KinestheticTable;
