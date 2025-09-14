import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import Swal from 'sweetalert2';

const ViewAuditoryLearningForm = ({ title }) => {
  const { id } = useParams(); // auditory learning id
  const navigate = useNavigate();

  const [auditory, setAuditory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingAuditory, setLoadingAuditory] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Analysis state
  const [threshold, setThreshold] = useState(4.0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const {
    refreshKey,
    isRemoved,
    isExpanded,
    handleRefresh,
    handleExpand,
    handleDelete,
  } = useCardTitleActions();

  // ---- helpers
  const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;
  const round = (v, d = 1) => (v || v === 0 ? Number(v).toFixed(d) : '—');
  const fmt = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

  const belowBadgeClass = (p) => {
    if (p >= 0.5) return 'badge bg-soft-danger text-danger';
    if (p >= 0.25) return 'badge bg-soft-warning text-warning';
    return 'badge bg-soft-success text-success';
  };
  const verdictText = (p) => (p >= 0.5 ? 'Needs re-teach' : p >= 0.25 ? 'Review recommended' : 'Healthy');

  // ---- load auditory + questions
  useEffect(() => {
    const loadAuditory = async () => {
      try {
        setLoadingAuditory(true);
        const token = getToken();
        const res = await axios.get(`${BASE_URL}/auditory/learning/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAuditory(res?.data || null);
      } catch (err) {
        console.error('Failed to load auditory item', err);
        Swal.fire('Error', 'Failed to load auditory learning item.', 'error');
      } finally {
        setLoadingAuditory(false);
      }
    };

    const loadQuestions = async () => {
      try {
        setLoadingQuestions(true);
        const token = getToken();
        const res = await axios.get(`${BASE_URL}/auditory/qanda/auditoryId/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // API returns a paged object { total, page, pageSize, items: [...] }
        const rows = Array.isArray(res?.data?.items)
          ? res.data.items
          : Array.isArray(res?.data)
          ? res.data
          : [];

        setQuestions(rows);
        setAnalysis(null); // clear old analysis if list changed
      } catch (err) {
        console.error('Failed to load questions', err);
        Swal.fire('Error', 'Failed to load questions for this auditory item.', 'error');
      } finally {
        setLoadingQuestions(false);
      }
    };

    loadAuditory();
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshKey]);

  // ---- derived
  const totalScore = useMemo(
    () => questions.reduce((sum, q) => sum + (typeof q.score === 'number' ? q.score : 0), 0),
    [questions]
  );

  const tgTitle = useMemo(() => {
    if (!auditory) return '—';
    const tg = typeof auditory?.teacherGuideId === 'string' ? null : auditory?.teacherGuideId;
    return tg?.coureInfo || '—';
  }, [auditory]);

  const creator = useMemo(() => {
    if (!auditory) return {};
    return auditory?.createby || auditory?.createBy || {};
  }, [auditory]);

  // Map for quick per-question lookups
  const qStatMap = useMemo(() => {
    const m = new Map();
    if (analysis?.QuestionStats) {
      for (const row of analysis.QuestionStats) m.set(row.QuestionID, row);
    }
    return m;
  }, [analysis]);

  // Tiny summary numbers
  const summary = useMemo(() => {
    const qs = analysis?.QuestionStats || [];
    const confusing = analysis?.ConfusingQuestions || [];
    const weak = analysis?.WeakTopics || [];
    const avg =
      qs.length > 0
        ? qs.reduce((a, b) => a + (Number(b.AvgScore) || 0), 0) / qs.length
        : null;
    const avgBelow =
      qs.length > 0
        ? qs.reduce((a, b) => a + (Number(b.PctBelowThresh) || 0), 0) / qs.length
        : null;
    return {
      avgScore: avg,
      avgBelow,
      confusingCount: confusing.length,
      weakCount: weak.length,
      workingThreshold: analysis?.WorkingThreshold ?? threshold,
    };
  }, [analysis, threshold]);

  // ---- analyzer payload + call
  const buildAnalyzePayload = () =>
    questions.map((q, idx) => {
      const qid = q._id || `Q${String(idx + 1).padStart(2, '0')}`;
      const tags = (q.topicTag || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const asHash = tags.map((t) => `#${t}`).join(' ');
      return {
        StudentID: '',
        QuestionID: qid,
        EssayQuestion: `${q.questionTytle || ''}${asHash ? ' ' + asHash : ''}`,
        TopicTags: tags.join(','),
        StudentAnswer: q.questionAnswer || '',
        Score: typeof q.score === 'number' ? q.score : 0,
        Threshold: Number(threshold),
      };
    });

  const runAnalysis = async () => {
    if (!questions.length) {
      Swal.fire('No questions', 'There are no questions to analyze.', 'info');
      return;
    }
    try {
      setAnalyzing(true);
      setAnalysis(null);
      const payload = buildAnalyzePayload();
      const res = await axios.post('http://127.0.0.1:5000/analyze', payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      setAnalysis(res?.data || null);
    } catch (err) {
      console.error('Analyze failed', err);
      Swal.fire('Error', 'Failed to analyze this auditory item.', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  if (isRemoved) return null;

  return (
    <div className="col-xxl-12">
      <div className={`card stretch stretch-full ${isExpanded ? 'card-expand' : ''} ${refreshKey ? 'card-loading' : ''}`}>
        <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />

        <div className="card-body">
          {/* Top bar */}
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <label className="form-label mb-0">Threshold</label>
              <input
                type="number"
                className="form-control"
                style={{ width: 120 }}
                value={threshold}
                step="0.1"
                min="0"
                onChange={(e) => setThreshold(e.target.value)}
                title="Scores below this are considered 'below threshold'"
              />
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={runAnalysis}
                disabled={analyzing || loadingAuditory || loadingQuestions}
              >
                {analyzing ? 'Analyzing…' : 'Analyze'}
              </button>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-light" onClick={() => navigate(-1)}>← Back</button>
              <button type="button" className="btn btn-outline-primary" onClick={() => window.print()}>Print</button>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-4">
            <h3 className="mb-1" style={{ wordBreak: 'break-word' }}>
              {auditory?.title || '—'}
            </h3>
            <div className="d-inline-flex align-items-center gap-3 mt-2">
              <span className="text-muted">Total Marks: {totalScore}</span>
              {auditory?.AudioUrl ? (
                <audio controls style={{ height: 28 }}>
                  <source src={auditory.AudioUrl} />
                  Your browser does not support the audio element.
                </audio>
              ) : null}
            </div>
          </div>

          {/* Meta */}
          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <div className="p-3 border rounded h-100">
                <div className="text-muted small">Teacher Guide</div>
                <div className="fw-semibold" title={tgTitle}>{tgTitle}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded h-100">
                <div className="text-muted small">Created By</div>
                <div className="fw-semibold">{creator?.username || '—'}</div>
                <div className="small text-muted">{creator?.email || ''}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="p-3 border rounded h-100">
                <div className="text-muted small">Dates</div>
                <div className="small">Created: {fmt(auditory?.createdAt)}</div>
                <div className="small">Updated: {fmt(auditory?.updatedAt)}</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="alert alert-light border small mb-3">
            <strong>Legend:</strong> <span className="ms-1">Avg</span> = average score, <span>Conf</span> = confusion score (0–1, higher = more confusion), <span>% Below</span> = % of responses under threshold.
          </div>

          {/* Analysis summary */}
          {analysis && (
            <>
              <div className="row g-3 mb-4">
                <div className="col-md-3">
                  <div className="p-3 border rounded text-center">
                    <div className="text-muted small">Questions</div>
                    <div className="fs-4 fw-bold">{questions.length}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="p-3 border rounded text-center">
                    <div className="text-muted small">Confusing Questions</div>
                    <div className="fs-4 fw-bold">{summary.confusingCount}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="p-3 border rounded text-center">
                    <div className="text-muted small">Weak Topics</div>
                    <div className="fs-4 fw-bold">{summary.weakCount}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="p-3 border rounded text-center">
                    <div className="text-muted small">Working Threshold</div>
                    <div className="fs-4 fw-bold">{summary.workingThreshold}</div>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-lg-6">
                  <div className="p-3 border rounded h-100">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong>Confusing Questions</strong>
                      <span className="small text-muted">Higher “Conf” → trickier item</span>
                    </div>
                    {analysis.ConfusingQuestions?.length ? (
                      <div className="table-responsive">
                        <table className="table table-sm mb-0">
                          <thead>
                            <tr>
                              <th>QID</th>
                              <th>Avg</th>
                              <th>Conf</th>
                              <th>% Below</th>
                              <th>Resp.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysis.ConfusingQuestions.map((row) => (
                              <tr key={row.QuestionID}>
                                <td title={row.EssayQuestion}>{row.QuestionID}</td>
                                <td>{round(row.AvgScore, 2)}</td>
                                <td>{round(row.ConfusionScore, 2)}</td>
                                <td>{pct(row.PctBelowThresh)}</td>
                                <td>{row.Responses}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-muted">No confusion detected.</div>
                    )}
                  </div>
                </div>

                <div className="col-lg-6">
                  <div className="p-3 border rounded h-100">
                    <strong className="d-block mb-2">Topic Stats</strong>
                    {analysis.TopicStats?.length ? (
                      <div className="table-responsive">
                        <table className="table table-sm mb-0">
                          <thead>
                            <tr>
                              <th>Topic</th>
                              <th>Avg</th>
                              <th>% Below</th>
                              <th>Resp.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysis.TopicStats.map((t) => (
                              <tr key={t.Topic}>
                                <td>{t.Topic}</td>
                                <td>{round(t.AvgScore, 2)}</td>
                                <td>{pct(t.PctBelowThresh)}</td>
                                <td>{t.Responses}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-muted">No topic stats.</div>
                    )}
                  </div>
                </div>

                <div className="col-12">
                  <div className="p-3 border rounded h-100">
                    <strong className="d-block mb-2">Weak Topics</strong>
                    {analysis.WeakTopics?.length ? (
                      <div className="d-flex flex-wrap gap-2">
                        {analysis.WeakTopics.map((t) => (
                          <span key={t.Topic} className={belowBadgeClass(t.PctBelowThresh)}>
                            {t.Topic} • Avg {round(t.AvgScore)} • {pct(t.PctBelowThresh)} below
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted">No weak topics.</div>
                    )}
                  </div>
                </div>

                {analysis.Recommendations?.length ? (
                  <div className="col-12">
                    <div className="p-3 border rounded h-100">
                      <strong className="d-block mb-2">Recommendations</strong>
                      <div className="row g-3">
                        {analysis.Recommendations.map((rec, i) => (
                          <div className="col-md-6" key={i}>
                            <div className="border rounded p-3 h-100">
                              <div className="fw-semibold mb-1">
                                {rec.Topic} • Avg {round(rec.AvgScore)} • {pct(rec.PctBelowThreshold)} below
                              </div>
                              {rec.ActionPlan?.length ? (
                                <ul className="mb-2">
                                  {rec.ActionPlan.map((a, idx) => (
                                    <li key={idx}>{a}</li>
                                  ))}
                                </ul>
                              ) : null}
                              {rec.FocusQuestions?.length ? (
                                <>
                                  <div className="fw-semibold small mb-1">Focus Questions</div>
                                  <ul className="mb-0 small">
                                    {rec.FocusQuestions.map((fq, j) => (
                                      <li key={j}>
                                        <span className="fw-semibold">{fq.QuestionID}</span>: {fq.EssayQuestion}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}

          <hr className="my-4" />

          {/* Questions (read-only) */}
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Questions</h5>
              <span className="text-muted small">
                {questions.length} question{questions.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingAuditory || loadingQuestions ? (
              <div className="text-muted">Loading…</div>
            ) : questions.length === 0 ? (
              <div className="text-muted">No questions available for this auditory item.</div>
            ) : (
              <ol className="ps-3">
                {questions.map((q, idx) => {
                  const qid = q._id || `Q${String(idx + 1).padStart(2, '0')}`;
                  const stat = qStatMap.get(qid);
                  const below = stat?.PctBelowThresh ?? null;
                  const verdict = below !== null ? verdictText(below) : null;

                  return (
                    <li key={qid} className="mb-4">
                      <div className="d-flex justify-content-between align-items-start gap-3">
                        <h6 className="mb-2" style={{ wordBreak: 'break-word' }}>
                          {q.questionTytle || '—'}
                        </h6>
                        <div className="d-flex flex-wrap gap-1">
                          <span className="badge bg-light text-dark" title="Assigned mark for this item">
                            Score: {q.score ?? 0}
                          </span>
                          {stat && (
                            <>
                              <span className="badge bg-soft-primary text-primary" title="Average score across responses">
                                Avg {round(stat.AvgScore)}
                              </span>
                              <span className="badge bg-soft-warning text-warning" title="Confusion score (0–1)">
                                Conf {round(stat.ConfusionScore, 2)}
                              </span>
                              <span className={belowBadgeClass(below)} title="% of responses below the threshold">
                                {pct(below)} below
                              </span>
                              <span className="badge bg-soft-secondary text-secondary" title="Number of responses used">
                                n={stat.Responses}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {q.topicTag ? (
                        <div className="mb-2">
                          {q.topicTag.split(',').map((tag, i) => (
                            <span key={i} className="badge bg-soft-primary text-primary me-1">
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {stat && (
                        <div className="mb-2">
                          <div className="progress" style={{ height: 6 }}>
                            <div
                              className={`progress-bar ${below >= 0.5 ? 'bg-danger' : below >= 0.25 ? 'bg-warning' : 'bg-success'}`}
                              role="progressbar"
                              style={{ width: pct(below) }}
                              aria-valuenow={Math.round((below ?? 0) * 100)}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            />
                          </div>
                          <div className="small text-muted mt-1">
                            {verdict} at threshold {summary.workingThreshold}.
                          </div>
                        </div>
                      )}

                      <div className="p-3 border rounded" style={{ whiteSpace: 'pre-wrap' }}>
                        {q.questionAnswer || '—'}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        <CardLoader refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default ViewAuditoryLearningForm;
