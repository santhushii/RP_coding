import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import Swal from 'sweetalert2';

const UpdateVisualLearningForm = ({ title }) => {
  const { id } = useParams(); // visual learning id
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    teacherGuideId: '',
  });

  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [existingVideoUrl, setExistingVideoUrl] = useState('');

  // Existing questions for this visual
  const [existingQuestions, setExistingQuestions] = useState([]);
  const [savingQuestionId, setSavingQuestionId] = useState(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);

  // New questions to add
  const [questions, setQuestions] = useState([
    { questionTytle: '', questionAnswer: '', topicTag: '', score: 1 },
  ]);

  const [teacherGuides, setTeacherGuides] = useState([]);
  const [tgLoading, setTgLoading] = useState(false);
  const [loadingVisual, setLoadingVisual] = useState(false);
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

  // Load visual meta
  useEffect(() => {
    const loadVisual = async () => {
      try {
        setLoadingVisual(true);
        const token = getToken();
        const res = await axios.get(`${BASE_URL}/visual/learning/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const v = res?.data || {};
        const tgId =
          typeof v?.teacherGuideId === 'string'
            ? v.teacherGuideId
            : v?.teacherGuideId?._id || '';

        setFormData({
          title: v?.title || '',
          teacherGuideId: tgId,
        });
        setExistingVideoUrl(v?.videoUrl || '');
      } catch (err) {
        console.error('Failed to load visual', err);
        Swal.fire('Error', 'Failed to load visual item.', 'error');
      } finally {
        setLoadingVisual(false);
      }
    };

    const loadQuestions = async () => {
      try {
        setLoadingQuestions(true);
        const token = getToken();
        const res = await axios.get(`${BASE_URL}/visual/qanda/visualId/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const arr = Array.isArray(res.data) ? res.data : [];
        setExistingQuestions(
          arr.map((q) => ({
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

    loadVisual();
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
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [videoPreview]);

  const onFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onVideoChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (file) setVideoPreview(URL.createObjectURL(file));
    else setVideoPreview('');
    setVideoFile(file);
  };

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview('');
    setVideoFile(null);
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
        `${BASE_URL}/visual/qanda/${q._id}`,
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
      await axios.delete(`${BASE_URL}/visual/qanda/${q._id}`, {
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

      // 1) Update visual (multipart/form-data)
      const fd = new FormData();
      fd.append('title', formData.title.trim());
      if (formData.teacherGuideId) fd.append('teacherGuideId', formData.teacherGuideId);
      if (videoFile) fd.append('video', videoFile);

      await axios.put(`${BASE_URL}/visual/learning/${id}`, fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      // 2) Add new questions (if any)
      let successCount = 0;
      let failCount = 0;

      if (filled.length > 0) {
        const results = await Promise.allSettled(
          filled.map((q) =>
            axios.post(
              `${BASE_URL}/visual/qanda`,
              {
                // NOTE: backend key uses this exact spelling:
                visualLerningId: id,
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
          text: filled.length ? `Visual updated and ${successCount} new question(s) added.` : 'Visual updated.',
          timer: 1500,
          showConfirmButton: false,
        });
      } else if (successCount > 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Partial success',
          text: `Visual updated. ${successCount} question(s) added, ${failCount} failed.`,
        });
      } else {
        await Swal.fire({ icon: 'error', title: 'Questions failed', text: 'Visual updated, but adding questions failed.' });
      }

      navigate('/admin/visual-learning');
    } catch (err) {
      console.error('Update visual failed:', err?.response?.data || err);
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: err?.response?.data?.message || err?.response?.data?.error || 'Failed to update visual.',
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
            {/* Visual meta */}
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-control"
                  name="title"
                  value={formData.title}
                  onChange={onFieldChange}
                  placeholder="e.g., Python Lists — Visual Primer"
                  required
                  disabled={loadingVisual}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Teacher Guide (optional)</label>
                <select
                  className="form-select"
                  name="teacherGuideId"
                  value={formData.teacherGuideId}
                  onChange={onFieldChange}
                  disabled={tgLoading || loadingVisual}
                >
                  <option value="">— None —</option>
                  {teacherGuides.map((tg) => (
                    <option key={tg._id} value={tg._id}>
                      {tg.coureInfo}
                    </option>
                  ))}
                </select>
                <small className="text-muted">
                  {tgLoading ? 'Loading teacher guides…' : 'Link this visual to a teacher guide (optional).'}
                </small>
              </div>

              {/* Current + replace video */}
              <div className="col-md-12">
                <label className="form-label d-flex justify-content-between">
                  <span>Video (replace)</span>
                  {existingVideoUrl ? (
                    <a href={existingVideoUrl} target="_blank" rel="noopener noreferrer" className="small">
                      Current video
                    </a>
                  ) : (
                    <span className="small text-muted">No current video</span>
                  )}
                </label>
                <input type="file" className="form-control" accept="video/*" onChange={onVideoChange} />
                {videoPreview && (
                  <div className="mt-2">
                    <video src={videoPreview} controls style={{ width: 320, height: 180, borderRadius: 6 }} />
                    <div>
                      <button type="button" className="btn btn-link p-0 small mt-1" onClick={clearVideo}>
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
                        placeholder="Explain the video concept…"
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
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addQuestion} disabled={loadingVisual}>
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
                    disabled={questions.length === 1 || loadingVisual}
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
                      placeholder="What is overfitting?"
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
                      placeholder="e.g., 5"
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
                      placeholder="ml-basics,python basics"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card-footer d-flex justify-content-end">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || loadingVisual}>
              {isSubmitting ? 'Saving…' : 'Update Visual & Add Questions'}
            </button>
          </div>
        </form>

        <CardLoader refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default UpdateVisualLearningForm;
