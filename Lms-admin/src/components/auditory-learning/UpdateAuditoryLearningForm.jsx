import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import Swal from 'sweetalert2';

const UpdateAuditoryLearningForm = ({ title }) => {
  const { id } = useParams(); // auditory learning id
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    teacherGuideId: '',
  });

  const [audioFile, setAudioFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState('');
  const [existingAudioUrl, setExistingAudioUrl] = useState('');

  // Existing questions
  const [existingQuestions, setExistingQuestions] = useState([]);
  const [savingQuestionId, setSavingQuestionId] = useState(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);

  // New questions
  const [questions, setQuestions] = useState([
    { questionTytle: '', questionAnswer: '', topicTag: '', score: 1 },
  ]);

  const [teacherGuides, setTeacherGuides] = useState([]);
  const [tgLoading, setTgLoading] = useState(false);
  const [loadingAuditory, setLoadingAuditory] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    refreshKey,
    isRemoved,
    isExpanded,
    handleRefresh,
    handleExpand,
    handleDelete,
  } = useCardTitleActions();

  // Load auditory meta
  useEffect(() => {
    const loadAuditory = async () => {
      try {
        setLoadingAuditory(true);
        const token = getToken();
        const res = await axios.get(`${BASE_URL}/auditory/learning/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const a = res?.data || {};
        const tgId =
          typeof a?.teacherGuideId === 'string'
            ? a.teacherGuideId
            : a?.teacherGuideId?._id || '';

        setFormData({
          title: a?.title || '',
          teacherGuideId: tgId,
        });
        setExistingAudioUrl(a?.AudioUrl || '');
      } catch (err) {
        console.error('Failed to load auditory item', err);
        Swal.fire('Error', 'Failed to load auditory item.', 'error');
      } finally {
        setLoadingAuditory(false);
      }
    };

    const loadQuestions = async () => {
      try {
        setLoadingQuestions(true);
        const token = getToken();
        const res = await axios.get(
          `${BASE_URL}/auditory/qanda/auditoryId/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // NEW: API returns a paged object { total, page, pageSize, items: [...] }
        const raw = Array.isArray(res?.data?.items)
          ? res.data.items
          : Array.isArray(res?.data)
          ? res.data
          : [];

        setExistingQuestions(
          raw.map((q) => ({
            _id: q._id,
            questionTytle: q.questionTytle || '',
            questionAnswer: q.questionAnswer || '',
            topicTag: q.topicTag || '',
            score: typeof q.score === 'number' ? q.score : 0,
          }))
        );
      } catch (err) {
        console.error('Failed to load questions', err);
        Swal.fire('Error', 'Failed to load existing questions.', 'error');
      } finally {
        setLoadingQuestions(false);
      }
    };

    loadAuditory();
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Teacher guides
  useEffect(() => {
    const loadTeacherGuides = async () => {
      try {
        setTgLoading(true);
        const token = getToken();
        const res = await axios.get(`${BASE_URL}/teacher-guides`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTeacherGuides(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to load teacher guides', err);
        Swal.fire('Error', 'Failed to load teacher guides.', 'error');
      } finally {
        setTgLoading(false);
      }
    };
    loadTeacherGuides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (audioPreview) URL.revokeObjectURL(audioPreview);
    };
  }, [audioPreview]);

  const onFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onAudioChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    if (file) setAudioPreview(URL.createObjectURL(file));
    else setAudioPreview('');
    setAudioFile(file);
  };

  const clearAudio = () => {
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioPreview('');
    setAudioFile(null);
  };

  // ----- Existing Q&A handlers -----
  const onExistingChange = (idx, field, value) => {
    setExistingQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const saveExistingQuestion = async (idx) => {
    const q = existingQuestions[idx];
    if (!q?._id) return;
    if (!q.questionTytle.trim() || !q.questionAnswer.trim() || String(q.score).trim() === '') {
      Swal.fire('Required', 'Question title, answer, and score are required.', 'info');
      return;
    }
    try {
      setSavingQuestionId(q._id);
      const token = getToken();
      await axios.put(
        `${BASE_URL}/auditory/qanda/${q._id}`,
        {
          questionTytle: q.questionTytle.trim(),
          questionAnswer: q.questionAnswer.trim(),
          topicTag: (q.topicTag || '').trim(),
          score: Number(q.score) || 0,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      Swal.fire({ icon: 'success', title: 'Saved', text: 'Question updated.', timer: 900, showConfirmButton: false });
    } catch (err) {
      console.error('Update question failed', err);
      Swal.fire('Error', 'Failed to update question.', 'error');
    } finally {
      setSavingQuestionId(null);
    }
  };

  const deleteExistingQuestion = async (idx) => {
    const q = existingQuestions[idx];
    if (!q?._id) return;

    const confirm = await Swal.fire({
      title: 'Delete this question?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Delete',
    });
    if (!confirm.isConfirmed) return;

    try {
      setDeletingQuestionId(q._id);
      const token = getToken();
      await axios.delete(`${BASE_URL}/auditory/qanda/${q._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExistingQuestions((prev) => prev.filter((_, i) => i !== idx));
      Swal.fire({ icon: 'success', title: 'Deleted', text: 'Question removed.', timer: 900, showConfirmButton: false });
    } catch (err) {
      console.error('Delete question failed', err);
      Swal.fire('Error', 'Failed to delete question.', 'error');
    } finally {
      setDeletingQuestionId(null);
    }
  };

  // ----- New Q&A handlers -----
  const addQuestion = () => {
    setQuestions((prev) => [...prev, { questionTytle: '', questionAnswer: '', topicTag: '', score: 1 }]);
  };
  const removeQuestion = (idx) => setQuestions((prev) => prev.filter((_, i) => i !== idx));
  const onQuestionChange = (idx, field, value) =>
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));

  // ----- Submit meta + add new Q&A -----
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      Swal.fire('Required', 'Title is required.', 'info');
      return;
    }

    // Only add new rows with any content
    const filled = questions.filter(
      (q) => q.questionTytle.trim() || q.questionAnswer.trim() || q.topicTag.trim()
    );
    const invalid = filled.find(
      (q) => !q.questionTytle.trim() || !q.questionAnswer.trim() || String(q.score).trim() === ''
    );
    if (invalid) {
      Swal.fire('Required', 'Each added question must have a title, an answer, and a score.', 'info');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getToken();

      // 1) Update auditory item (multipart/form-data)
      const fd = new FormData();
      fd.append('title', formData.title.trim());
      if (formData.teacherGuideId) fd.append('teacherGuideId', formData.teacherGuideId);
      if (audioFile) fd.append('audio', audioFile); // optional replace

      await axios.put(`${BASE_URL}/auditory/learning/${id}`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      // 2) Add new questions (if any)
      let successCount = 0;
      let failCount = 0;

      if (filled.length > 0) {
        const results = await Promise.allSettled(
          filled.map((q) =>
            axios.post(
              `${BASE_URL}/auditory/qanda`,
              {
                AuditoryLearningId: id, // required field name
                questionTytle: q.questionTytle.trim(),
                questionAnswer: q.questionAnswer.trim(),
                topicTag: (q.topicTag || '').trim(),
                score: Number(q.score) || 0,
              },
              {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              }
            )
          )
        );
        successCount = results.filter((r) => r.status === 'fulfilled').length;
        failCount = results.length - successCount;
      }

      if (failCount === 0) {
        await Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: filled.length ? `Auditory item updated and ${successCount} new question(s) added.` : 'Auditory item updated.',
          timer: 1500,
          showConfirmButton: false,
        });
      } else if (successCount > 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Partial success',
          text: `Auditory item updated. ${successCount} question(s) added, ${failCount} failed.`,
        });
      } else {
        await Swal.fire({ icon: 'error', title: 'Questions failed', text: 'Auditory updated, but adding questions failed.' });
      }

      navigate('/admin/auditory-learning');
    } catch (err) {
      console.error('Update auditory failed:', err?.response?.data || err);
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: err?.response?.data?.message || err?.response?.data?.error || 'Failed to update auditory.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRemoved) return null;

  return (
    <div className="col-xxl-12">
      <div className={`card stretch stretch-full ${isExpanded ? 'card-expand' : ''} ${refreshKey ? 'card-loading' : ''}`}>
        <CardHeader title={title} refresh={handleRefresh} remove={handleDelete} expanded={handleExpand} />

        <form onSubmit={handleSubmit}>
          <div className="card-body">
            {/* Meta */}
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-control"
                  name="title"
                  value={formData.title}
                  onChange={onFieldChange}
                  placeholder="e.g., Python Loops — Listening Exercise"
                  required
                  disabled={loadingAuditory}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Teacher Guide (optional)</label>
                <select
                  className="form-select"
                  name="teacherGuideId"
                  value={formData.teacherGuideId}
                  onChange={onFieldChange}
                  disabled={tgLoading || loadingAuditory}
                >
                  <option value="">— None —</option>
                  {teacherGuides.map((tg) => (
                    <option key={tg._id} value={tg._id}>
                      {tg.coureInfo}
                    </option>
                  ))}
                </select>
                <small className="text-muted">
                  {tgLoading ? 'Loading teacher guides…' : 'Link this auditory item to a teacher guide (optional).'}
                </small>
              </div>

              {/* Current + replace audio */}
              <div className="col-md-12">
                <label className="form-label d-flex justify-content-between">
                  <span>Audio (replace)</span>
                  {existingAudioUrl ? (
                    <a href={existingAudioUrl} target="_blank" rel="noopener noreferrer" className="small">
                      Current audio
                    </a>
                  ) : (
                    <span className="small text-muted">No current audio</span>
                  )}
                </label>
                <input type="file" className="form-control" accept="audio/*" onChange={onAudioChange} />
                {audioPreview && (
                  <div className="mt-2">
                    <audio controls style={{ width: 320 }}>
                      <source src={audioPreview} />
                      Your browser does not support the audio element.
                    </audio>
                    <div>
                      <button type="button" className="btn btn-link p-0 small mt-1" onClick={clearAudio}>
                        Remove selected
                      </button>
                    </div>
                  </div>
                )}
                <small className="text-muted d-block">Leave empty to keep existing.</small>
              </div>
            </div>

            {/* Existing Questions (editable) */}
            <hr className="my-4" />
            <h6 className="mb-3">Existing Questions</h6>
            {loadingQuestions ? (
              <div className="text-muted mb-3">Loading questions…</div>
            ) : existingQuestions.length === 0 ? (
              <div className="text-muted mb-3">No questions yet.</div>
            ) : (
              existingQuestions.map((q, idx) => (
                <div key={q._id} className="border rounded p-3 mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>Q#{idx + 1}</strong>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => saveExistingQuestion(idx)}
                        disabled={savingQuestionId === q._id || deletingQuestionId === q._id}
                      >
                        {savingQuestionId === q._id ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteExistingQuestion(idx)}
                        disabled={savingQuestionId === q._id || deletingQuestionId === q._id}
                      >
                        {deletingQuestionId === q._id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label">Question Title</label>
                      <input
                        type="text"
                        className="form-control"
                        value={q.questionTytle}
                        onChange={(e) => onExistingChange(idx, 'questionTytle', e.target.value)}
                        placeholder="Explain what you heard about …"
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Score</label>
                      <input
                        type="number"
                        className="form-control"
                        min={0}
                        max={100}
                        value={q.score}
                        onChange={(e) => onExistingChange(idx, 'score', e.target.value)}
                        placeholder="e.g., 5"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Answer</label>
                      <textarea
                        className="form-control"
                        rows={4}
                        value={q.questionAnswer}
                        onChange={(e) => onExistingChange(idx, 'questionAnswer', e.target.value)}
                        placeholder="Suggested model answer…"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Topic Tags (comma-separated)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={q.topicTag}
                        onChange={(e) => onExistingChange(idx, 'topicTag', e.target.value)}
                        placeholder="tags,comma,separated"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Add new Questions */}
            <div className="d-flex align-items-center justify-content-between mb-2 mt-4">
              <h6 className="mb-0">Add New Questions (optional)</h6>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addQuestion} disabled={loadingAuditory}>
                + Add Question
              </button>
            </div>

            {questions.map((q, idx) => (
              <div key={idx} className="border rounded p-3 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>New Q#{idx + 1}</strong>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeQuestion(idx)}
                    disabled={questions.length === 1 || loadingAuditory}
                    title={questions.length === 1 ? 'Keep at least one row or clear it' : 'Remove'}
                  >
                    Remove
                  </button>
                </div>

                <div className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label">Question Title</label>
                    <input
                      type="text"
                      className="form-control"
                      value={q.questionTytle}
                      onChange={(e) => onQuestionChange(idx, 'questionTytle', e.target.value)}
                      placeholder="testing question 1"
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Score</label>
                    <input
                      type="number"
                      className="form-control"
                      min={0}
                      max={100}
                      value={q.score}
                      onChange={(e) => onQuestionChange(idx, 'score', e.target.value)}
                      placeholder="e.g., 10"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Answer</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={q.questionAnswer}
                      onChange={(e) => onQuestionChange(idx, 'questionAnswer', e.target.value)}
                      placeholder="Model answer…"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Topic Tags (comma-separated)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={q.topicTag}
                      onChange={(e) => onQuestionChange(idx, 'topicTag', e.target.value)}
                      placeholder="python basics,list,loops"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card-footer d-flex justify-content-end">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || loadingAuditory}>
              {isSubmitting ? 'Saving…' : 'Update Auditory & Add Questions'}
            </button>
          </div>
        </form>

        <CardLoader refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default UpdateAuditoryLearningForm;
