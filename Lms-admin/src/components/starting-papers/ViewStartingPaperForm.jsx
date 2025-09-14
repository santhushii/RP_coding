import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import Swal from 'sweetalert2';

const ViewStartingPaperForm = ({ title }) => {
  const { id } = useParams(); // starting-paper-titles _id
  const navigate = useNavigate();

  const [paper, setPaper] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingPaper, setLoadingPaper] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const {
    refreshKey,
    isRemoved,
    isExpanded,
    handleRefresh,
    handleExpand,
    handleDelete,
  } = useCardTitleActions();

  const authHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Load paper + questions
  useEffect(() => {
    const loadPaper = async () => {
      try {
        setLoadingPaper(true);
        const res = await axios.get(`${BASE_URL}/starting-paper-titles/${id}`, {
          headers: authHeaders(),
        });
        setPaper(res?.data || null);
      } catch (err) {
        console.error('Failed to load starting paper title', err);
        Swal.fire('Error', 'Failed to load starting paper title.', 'error');
      } finally {
        setLoadingPaper(false);
      }
    };

    const loadQuestions = async () => {
      try {
        setLoadingQuestions(true);
        const res = await axios.get(
          `${BASE_URL}/starting-paper-questions/by-paper/${id}`,
          { headers: authHeaders() }
        );
        const arr = Array.isArray(res?.data?.items) ? res.data.items : [];
        setQuestions(arr);
      } catch (err) {
        console.error('Failed to load questions', err);
        Swal.fire('Error', 'Failed to load questions.', 'error');
      } finally {
        setLoadingQuestions(false);
      }
    };

    loadPaper();
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshKey]);

  if (isRemoved) return null;

  const creator = paper?.createBy || {};
  const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

  return (
    <div className="col-xxl-12">
      <div className={`card stretch stretch-full ${isExpanded ? 'card-expand' : ''} ${refreshKey ? 'card-loading' : ''}`}>
        <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />

        <div className="card-body">
          {/* Top bar */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <button type="button" className="btn btn-light" onClick={() => navigate(-1)}>
              ← Back
            </button>
            <button type="button" className="btn btn-outline-primary" onClick={() => window.print()}>
              Print
            </button>
          </div>

          {/* Paper header */}
          <div className="text-center mb-4">
            <h3 className="mb-1" style={{ wordBreak: 'break-word' }}>
              {paper?.paperTytle || '—'}
            </h3>
            <div className="d-inline-flex align-items-center gap-2 mt-2">
              <span className="badge bg-soft-primary text-primary">Paper #{paper?.paperNumber ?? '—'}</span>
            </div>
          </div>

          {/* Meta */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="p-3 border rounded h-100">
                <div className="text-muted small">Created By</div>
                <div className="fw-semibold">{creator?.username || '—'}</div>
                <div className="small text-muted">{creator?.email || ''}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded h-100">
                <div className="text-muted small">Created</div>
                <div className="fw-semibold">{fmt(paper?.createdAt)}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded h-100">
                <div className="text-muted small">Updated</div>
                <div className="fw-semibold">{fmt(paper?.updatedAt)}</div>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Questions</h5>
            <span className="text-muted small">
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loadingPaper || loadingQuestions ? (
            <div className="text-muted">Loading…</div>
          ) : questions.length === 0 ? (
            <div className="text-muted">No questions available for this paper.</div>
          ) : (
            <ol className="ps-3">
              {questions.map((q, idx) => {
                const qid = q._id || `Q${String(idx + 1).padStart(2, '0')}`;
                return (
                  <li key={qid} className="mb-4">
                    <div className="d-flex justify-content-between align-items-start gap-3">
                      <div>
                        <h6 className="mb-1" style={{ wordBreak: 'break-word' }}>
                          {q.paperQuestionTitle || '—'}
                        </h6>
                        {q.paperQuestioncategory ? (
                          <span className="badge bg-soft-secondary text-secondary">
                            {q.paperQuestioncategory}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Options */}
                    <div className="mt-2">
                      <ul className="list-group">
                        {(q.answers || []).map((ans, i) => {
                          const isCorrect = ans === q.correctanser;
                          return (
                            <li
                              key={i}
                              className={`list-group-item d-flex justify-content-between align-items-start ${
                                isCorrect ? 'list-group-item-success' : ''
                              }`}
                              title={isCorrect ? 'Correct answer' : ''}
                              style={{ whiteSpace: 'pre-wrap' }}
                            >
                              <span>{ans}</span>
                              {isCorrect && <span className="badge bg-success">Correct</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* Timestamps (optional) */}
                    <div className="small text-muted mt-2">
                      Created: {fmt(q.createdAt)} • Updated: {fmt(q.updatedAt)}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <CardLoader refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default ViewStartingPaperForm;
