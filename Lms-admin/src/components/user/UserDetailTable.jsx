import React, { useEffect, useState } from 'react';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import { BsArrowLeft, BsArrowRight, BsDot } from 'react-icons/bs';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { FiAlertTriangle } from 'react-icons/fi';

const UserDetailTable = ({ title }) => {
  const [users, setUsers] = useState([]);
  const [riskFlags, setRiskFlags] = useState({}); // { [userId]: true|false }

  const {
    refreshKey,
    isRemoved,
    isExpanded,
    handleRefresh,
    handleExpand,
    handleDelete,
  } = useCardTitleActions();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = users.slice(startIndex, endIndex);

  const authHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // After users load, fetch learning-type flags
  useEffect(() => {
    if (!users.length) return;
    fetchRiskFlags(users);
  }, [users]);

  const fetchUsers = async () => {
    try {
      const userRes = await axios.get(`${BASE_URL}/users`, { headers: authHeaders() });
      const data = Array.isArray(userRes.data) ? userRes.data : [];
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users', err);
      Swal.fire('Error', 'Failed to load users.', 'error');
    }
  };

  // Compute averages manually and set risk flag if all < 60
  const fetchRiskFlags = async (userList) => {
    try {
      const results = await Promise.allSettled(
        userList.map((u) =>
          axios.get(`${BASE_URL}/learning-type/user/${u._id}`, { headers: authHeaders() })
        )
      );

      const flags = {};
      results.forEach((res, idx) => {
        const u = userList[idx];
        if (res.status !== 'fulfilled' || !res.value?.data) {
          flags[u._id] = false;
          return;
        }
        const d = res.value.data;

        // Manually compute averages per category with safe division
        const avg = (total, count) => (count && count > 0 ? total / count : 0);

        const v = avg(d.visualLearningTotalPoint ?? 0, d.visualLearningCount ?? 0);
        const a = avg(d.auditoryLearningTotalPoint ?? 0, d.auditoryLearningCount ?? 0);
        const k = avg(d.kinestheticLearningTotalPoint ?? 0, d.kinestheticLearningCount ?? 0);
        const r = avg(d.readAndWriteLearningTotalPoint ?? 0, d.readAndWriteLearningCount ?? 0);

        flags[u._id] = v < 60 && a < 60 && k < 60 && r < 60;
      });

      setRiskFlags(flags);
    } catch (err) {
      console.error('Failed to load learning-type flags', err);
      // Non-fatal: leave riskFlags as-is
    }
  };

  if (isRemoved) return null;

  const totalPages = Math.max(1, Math.ceil(users.length / itemsPerPage));

  return (
    <div className="col-xxl-12">
      <div
        className={`card stretch stretch-full ${isExpanded ? 'card-expand' : ''} ${
          refreshKey ? 'card-loading' : ''
        }`}
      >
        <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />

        <div className="card-body custom-card-action p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th style={{ display: 'none' }}>ID</th>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Entrance Test</th>
                  <th>Role</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const fullName =
                      `${user.firstName || user.firstname || ''} ${user.lastName || user.lastname || ''}`.trim() ||
                      '-';
                    const username = user.username || '-';
                    const email = user.email || '-';
                    const phone = user.phoneNumber || user.contactNumber || '-';
                    const entrance = Number(user.entranceTest) === 1 ? 'Completed' : 'Pending';
                    const roleName = user?.role?.name || 'User';

                    const isOrange = Number(user.suitabilityForCoding) === 0;
                    const rowClass = isOrange ? 'table-warning' : '';

                    const showRisk = !!riskFlags[user._id];

                    return (
                      <tr key={user._id} className={rowClass}>
                        <td style={{ display: 'none' }}>{user._id}</td>
                        <td>{fullName}</td>
                        <td>{username}</td>
                        <td>{email}</td>
                        <td>{phone}</td>
                        <td>
                          <span
                            className={`badge ${
                              entrance === 'Completed'
                                ? 'bg-soft-success text-success'
                                : 'bg-soft-warning text-warning'
                            }`}
                          >
                            {entrance}
                          </span>
                        </td>

                        {/* Role (read-only) */}
                        <td>{roleName}</td>

                        {/* Risk column */}
                        <td>
                          {showRisk ? (
                            <span className="text-warning" title="All learning-type averages < 60">
                              <FiAlertTriangle size={18} />
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
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

export default UserDetailTable;
