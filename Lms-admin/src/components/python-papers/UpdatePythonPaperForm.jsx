import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import Swal from 'sweetalert2';

const UpdatePythonPaperForm = ({ title }) => {
  const { id } = useParams(); // paper id
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    paperTytle: '',
    paperDifficulty: 'Easy',
    teacherGuideId: '',
  });

  // NEW: existing questions for this paper
  const [existingQuestions, setExistingQuestions] = useState([]);
  const [savingQuestionId, setSavingQuestionId] = useState(null); // per-row loading
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);

  // New questions to add during update
  const [questions, setQuestions] = useState([
    { questionTytle: '', questionAnswer: '', topicTag: '', score: 1 },
  ]);

  const [teacherGuides, setTeacherGuides] = useState([]);
  const [tgLoading, setTgLoading] = useState(false);
  const [loadingPaper, setLoadingPaper] = useState(false);
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

  // Prefill paper details
  useEffect(() => {
    const loadPaper = async () => {
      try {
        setLoadingPaper(true);
        const token = getToken();
        const res = await axios.get(`${BASE_URL}/python/papers/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const p = res?.data || {};
        const tgId =
          typeof p?.teacherGuideId === 'string'
            ? p.teacherGuideId
            : p?.teacherGuideId?._id || '';

        setFormData({
          paperTytle: p?.paperTytle || p?.paperTitle || '',
          paperDifficulty: p?.paperDifficulty || 'Easy',
          teacherGuideId: tgId,
        });
      } catch (err) {
        console.error('Failed to load paper', err);
        Swal.fire('Error', 'Failed to load paper details.', 'error');
      } finally {
        setLoadingPaper(false);
      }
    };

    const loadQuestions = async () => {
      try {
        setLoadingQuestions(true);
        const token = getToken();
        const res = await axios.get(`${BASE_URL}/python/qanda/paper/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const arr = Array.isArray(res.data) ? res.data : [];
        // Normalize to editable shape
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

    loadPaper();
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch teacher guides
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

  const onFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---------- Existing Questions (edit/delete) ----------
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
        `${BASE_URL}/python/qanda/${q._id}`,
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
      Swal.fire({
        icon: 'success',
        title: 'Saved',
        text: 'Question updated.',
        timer: 900,
        showConfirmButton: false,
      });
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
      await axios.delete(`${BASE_URL}/python/qanda/${q._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExistingQuestions((prev) => prev.filter((_, i) => i !== idx));
      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Question removed.',
        timer: 900,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error('Delete question failed', err);
      Swal.fire('Error', 'Failed to delete question.', 'error');
    } finally {
      setDeletingQuestionId(null);
    }
  };

  // ---------- New Questions (add) ----------
  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { questionTytle: '', questionAnswer: '', topicTag: '', score: 1 },
    ]);
  };

  const removeQuestion = (idx) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const onQuestionChange = (idx, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  // ---------- Submit: update paper + add new questions ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.paperTytle.trim()) {
      Swal.fire('Required', 'Paper title is required.', 'info');
      return;
    }

    // Only add new questions that have any content
    const filled = questions.filter(
      (q) => q.questionTytle.trim() || q.questionAnswer.trim() || q.topicTag.trim()
    );
    const invalid = filled.find(
      (q) => !q.questionTytle.trim() || !q.questionAnswer.trim() || String(q.score).trim() === ''
    );
    if (invalid) {
      Swal.fire(
        'Required',
        'Each added question must have a title, an answer, and a score.',
        'info'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const token = getToken();

      // 1) Update the paper (PUT)
      const payload = {
        paperTytle: formData.paperTytle.trim(),
        paperDifficulty: formData.paperDifficulty,
        ...(formData.teacherGuideId
          ? { teacherGuideId: formData.teacherGuideId }
          : { teacherGuideId: '' }),
      };

      await axios.put(`${BASE_URL}/python/papers/${id}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // 2) Add new questions (if any were filled)
      let successCount = 0;
      let failCount = 0;

      if (filled.length > 0) {
        const results = await Promise.allSettled(
          filled.map((q) =>
            axios.post(
              `${BASE_URL}/python/qanda`,
              {
                paperId: id,
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
          text:
            filled.length > 0
              ? `Paper updated and ${successCount} new question(s) added.`
              : 'Paper updated successfully.',
          timer: 1500,
          showConfirmButton: false,
        });
      } else if (successCount > 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Partial success',
          text: `Paper updated. ${successCount} question(s) added, ${failCount} failed.`,
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Questions failed',
          text: 'Paper updated, but adding new questions failed.',
        });
      }

      navigate('/admin/python-papers');
    } catch (err) {
      console.error('Update paper failed:', err?.response?.data || err);
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to update paper.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRemoved) return null;

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

        <form onSubmit={handleSubmit}>
          <div className="card-body">
            {/* Paper meta */}
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Paper Title</label>
                <input
                  type="text"
                  className="form-control"
                  name="paperTytle"
                  value={formData.paperTytle}
                  onChange={onFieldChange}
                  placeholder="Functions & Loops – Practice Paper"
                  required
                  disabled={loadingPaper}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Difficulty</label>
                <select
                  className="form-select"
                  name="paperDifficulty"
                  value={formData.paperDifficulty}
                  onChange={onFieldChange}
                  required
                  disabled={loadingPaper}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label">Teacher Guide (optional)</label>
                <select
                  className="form-select"
                  name="teacherGuideId"
                  value={formData.teacherGuideId}
                  onChange={onFieldChange}
                  disabled={tgLoading || loadingPaper}
                >
                  <option value="">— None —</option>
                  {teacherGuides.map((tg) => (
                    <option key={tg._id} value={tg._id}>
                      {tg.coureInfo}
                    </option>
                  ))}
                </select>
                <small className="text-muted">
                  {tgLoading ? 'Loading teacher guides…' : 'Link to an existing teacher guide (optional).'}
                </small>
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
                        placeholder="Explain Python list comprehensions with an example"
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
                        placeholder="List comprehensions provide a concise way to create lists…"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Topic Tags (comma-separated)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={q.topicTag}
                        onChange={(e) => onExistingChange(idx, 'topicTag', e.target.value)}
                        placeholder="lists,comprehension,basics"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Questions to ADD (optional) */}
            <div className="d-flex align-items-center justify-content-between mb-2 mt-4">
              <h6 className="mb-0">Add New Questions (optional)</h6>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={addQuestion}
                disabled={loadingPaper}
              >
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
                    disabled={questions.length === 1 || loadingPaper}
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
                      placeholder="What is Python's list 'append' vs 'extend'?"
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
                      placeholder="e.g., 3"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Answer</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={q.questionAnswer}
                      onChange={(e) => onQuestionChange(idx, 'questionAnswer', e.target.value)}
                      placeholder="append() adds a single element; extend() adds elements from an iterable…"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Topic Tags (comma-separated)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={q.topicTag}
                      onChange={(e) => onQuestionChange(idx, 'topicTag', e.target.value)}
                      placeholder="list,append,extend,methods"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card-footer d-flex justify-content-end">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || loadingPaper}>
              {isSubmitting ? 'Saving...' : 'Update Paper'}
            </button>
          </div>
        </form>

        <CardLoader refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default UpdatePythonPaperForm;
