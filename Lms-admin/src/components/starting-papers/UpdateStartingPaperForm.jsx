import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import Swal from 'sweetalert2';

const blankMCQ = () => ({
  paperQuestionTitle: '',
  paperQuestioncategory: '',
  answers: ['', '', '', ''], // 4 options
  correctIndex: 0,
});

const UpdateStartingPaperForm = ({ title }) => {
  const { id } = useParams(); // starting-paper-titles _id
  const navigate = useNavigate();

  // ---- Form: title meta ----
  const [formData, setFormData] = useState({
    paperTytle: '',
    paperNumber: 1,
  });

  // ---- Existing questions (editable) ----
  const [existingQuestions, setExistingQuestions] = useState([]); // [{_id, paperQuestionTitle, paperQuestioncategory, answers[], correctIndex}]
  const [savingQuestionId, setSavingQuestionId] = useState(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState(null);

  // ---- New questions to add ----
  const [newQuestions, setNewQuestions] = useState([blankMCQ()]);

  const [loadingTitle, setLoadingTitle] = useState(false);
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

  const authHeaders = () => {
    const token = getToken();
    return token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  };

  // ---------- Load title ----------
  useEffect(() => {
    const loadTitle = async () => {
      try {
        setLoadingTitle(true);
        const res = await axios.get(`${BASE_URL}/starting-paper-titles/${id}`, {
          headers: authHeaders(),
        });
        const p = res?.data || {};
        setFormData({
          paperTytle: p?.paperTytle || '',
          paperNumber: Number(p?.paperNumber ?? 1),
        });
      } catch (err) {
        console.error('Failed to load starting paper title', err);
        Swal.fire('Error', 'Failed to load starting paper title.', 'error');
      } finally {
        setLoadingTitle(false);
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
        // Map API -> editable shape with correctIndex derived from correctanser
        const normalized = arr.map((q) => {
          const answers = Array.isArray(q?.answers) ? q.answers : [];
          const correctIndex = Math.max(
            0,
            answers.findIndex((a) => a === q?.correctanser)
          );
          return {
            _id: q?._id,
            paperQuestionTitle: q?.paperQuestionTitle || '',
            paperQuestioncategory: q?.paperQuestioncategory || '',
            answers: answers.length ? answers : ['', '', '', ''],
            correctIndex: correctIndex >= 0 ? correctIndex : 0,
          };
        });
        setExistingQuestions(normalized);
      } catch (err) {
        console.error('Failed to load questions', err);
        Swal.fire('Error', 'Failed to load existing questions.', 'error');
      } finally {
        setLoadingQuestions(false);
      }
    };

    loadTitle();
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---------- Title handlers ----------
  const onFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'paperNumber' ? Number(value) : value,
    }));
  };

  // ---------- Existing Questions (edit/delete) ----------
  const onExistingChange = (idx, field, value) => {
    setExistingQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const onExistingAnswerChange = (qIdx, aIdx, value) => {
    setExistingQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const answers = [...q.answers];
        answers[aIdx] = value;
        return { ...q, answers };
      })
    );
  };

  const onExistingCorrectPick = (qIdx, aIdx) => {
    setExistingQuestions((prev) =>
      prev.map((q, i) => (i === qIdx ? { ...q, correctIndex: aIdx } : q))
    );
  };

  const validateQuestion = (q, label) => {
    if (!q.paperQuestionTitle.trim()) {
      Swal.fire('Required', `${label}: title is required.`, 'info');
      return false;
    }
    if (!q.paperQuestioncategory.trim()) {
      Swal.fire('Required', `${label}: category is required.`, 'info');
      return false;
    }
    const trimmedAnswers = q.answers.map((a) => a.trim());
    const nonEmpty = trimmedAnswers.filter(Boolean);
    if (nonEmpty.length < 2) {
      Swal.fire(
        'Required',
        `${label}: provide at least two non-empty answer options.`,
        'info'
      );
      return false;
    }
    const correct = trimmedAnswers[q.correctIndex] || '';
    if (!correct) {
      Swal.fire('Required', `${label}: pick a non-empty correct answer.`, 'info');
      return false;
    }
    return true;
  };

  const saveExistingQuestion = async (idx) => {
    const q = existingQuestions[idx];
    if (!q?._id) return;
    if (!validateQuestion(q, `Question #${idx + 1}`)) return;

    try {
      setSavingQuestionId(q._id);
      const trimmedAnswers = q.answers.map((a) => a.trim());
      const payload = {
        paperQuestionTitle: q.paperQuestionTitle.trim(),
        paperQuestioncategory: q.paperQuestioncategory.trim(),
        answers: trimmedAnswers,
        correctanser: trimmedAnswers[q.correctIndex], // API expects "correctanser"
      };

      await axios.put(
        `${BASE_URL}/starting-paper-questions/${q._id}`,
        payload,
        { headers: authHeaders() }
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
      await axios.delete(`${BASE_URL}/starting-paper-questions/${q._id}`, {
        headers: authHeaders(),
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
  const addQuestion = () => setNewQuestions((prev) => [...prev, blankMCQ()]);
  const removeQuestion = (idx) =>
    setNewQuestions((prev) => prev.filter((_, i) => i !== idx));

  const onNewChange = (idx, field, value) => {
    setNewQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const onNewAnswerChange = (qIdx, aIdx, value) => {
    setNewQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const answers = [...q.answers];
        answers[aIdx] = value;
        return { ...q, answers };
      })
    );
  };

  const onNewCorrectPick = (qIdx, aIdx) => {
    setNewQuestions((prev) =>
      prev.map((q, i) => (i === qIdx ? { ...q, correctIndex: aIdx } : q))
    );
  };

  // ---------- Submit: update title + add new questions ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.paperTytle.trim()) {
      Swal.fire('Required', 'Paper title is required.', 'info');
      return;
    }
    if (!Number.isFinite(formData.paperNumber) || formData.paperNumber < 1) {
      Swal.fire('Required', 'Paper # must be a positive number.', 'info');
      return;
    }

    // Only submit new questions that have any content
    const filled = newQuestions.filter(
      (q) =>
        q.paperQuestionTitle.trim() ||
        q.paperQuestioncategory.trim() ||
        q.answers.some((a) => a.trim())
    );

    for (let i = 0; i < filled.length; i++) {
      if (!validateQuestion(filled[i], `New Question #${i + 1}`)) return;
    }

    setIsSubmitting(true);
    try {
      // 1) Update title
      await axios.put(
        `${BASE_URL}/starting-paper-titles/${id}`,
        {
          paperTytle: formData.paperTytle.trim(),
          paperNumber: Number(formData.paperNumber),
        },
        { headers: authHeaders() }
      );

      // 2) Add new questions
      let successCount = 0;
      let failCount = 0;

      if (filled.length > 0) {
        const results = await Promise.allSettled(
          filled.map((q) => {
            const trimmedAnswers = q.answers.map((a) => a.trim());
            return axios.post(
              `${BASE_URL}/starting-paper-questions`,
              {
                paperQuestionId: id,
                paperQuestionTitle: q.paperQuestionTitle.trim(),
                paperQuestioncategory: q.paperQuestioncategory.trim(),
                answers: trimmedAnswers,
                correctanser: trimmedAnswers[q.correctIndex], // important typo key
              },
              { headers: authHeaders() }
            );
          })
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
              ? `Title updated and ${successCount} new question(s) added.`
              : 'Title updated successfully.',
          timer: 1500,
          showConfirmButton: false,
        });
      } else if (successCount > 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Partial success',
          text: `Title updated. ${successCount} question(s) added, ${failCount} failed.`,
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Questions failed',
          text: 'Title updated, but adding new questions failed.',
        });
      }

      // Navigate back to your list page (adjust route if different)
      navigate('/admin/starting-paper-titles');
    } catch (err) {
      console.error('Update title failed:', err?.response?.data || err);
      Swal.fire({
        icon: 'error',
        title: 'Oops…',
        text:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to update starting paper.',
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
            {/* Title meta */}
            <div className="row g-3">
              <div className="col-md-8">
                <label className="form-label">Paper Title</label>
                <input
                  type="text"
                  className="form-control"
                  name="paperTytle"
                  value={formData.paperTytle}
                  onChange={onFieldChange}
                  placeholder="Python starting paper 1"
                  required
                  disabled={loadingTitle}
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Paper #</label>
                <input
                  type="number"
                  className="form-control"
                  name="paperNumber"
                  min={1}
                  value={formData.paperNumber}
                  onChange={onFieldChange}
                  placeholder="e.g., 1"
                  required
                  disabled={loadingTitle}
                />
              </div>
            </div>

            {/* Existing Questions (editable MCQ) */}
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
                        value={q.paperQuestionTitle}
                        onChange={(e) =>
                          onExistingChange(idx, 'paperQuestionTitle', e.target.value)
                        }
                        placeholder="Pseudocode… what is wrong?"
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Category</label>
                      <input
                        type="text"
                        className="form-control"
                        value={q.paperQuestioncategory}
                        onChange={(e) =>
                          onExistingChange(idx, 'paperQuestioncategory', e.target.value)
                        }
                        placeholder="Error Detection"
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label d-block">Answers (select the correct one)</label>
                      {q.answers.map((a, aIdx) => (
                        <div key={aIdx} className="input-group mb-2">
                          <div className="input-group-text">
                            <input
                              type="radio"
                              name={`correct-existing-${idx}`}
                              checked={q.correctIndex === aIdx}
                              onChange={() => onExistingCorrectPick(idx, aIdx)}
                              aria-label={`Mark option ${aIdx + 1} as correct`}
                            />
                          </div>
                          <input
                            type="text"
                            className="form-control"
                            value={a}
                            onChange={(e) =>
                              onExistingAnswerChange(idx, aIdx, e.target.value)
                            }
                            placeholder={`Option ${aIdx + 1}`}
                          />
                        </div>
                      ))}
                      <small className="text-muted">
                        At least 2 options required. The selected radio is sent as{' '}
                        <code>correctanser</code>.
                      </small>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Add New Questions */}
            <div className="d-flex align-items-center justify-content-between mb-2 mt-4">
              <h6 className="mb-0">Add New Questions (optional)</h6>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addQuestion}>
                + Add Question
              </button>
            </div>

            {newQuestions.map((q, idx) => (
              <div key={idx} className="border rounded p-3 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>New Q#{idx + 1}</strong>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeQuestion(idx)}
                    disabled={newQuestions.length === 1}
                    title={newQuestions.length === 1 ? 'Keep at least one row or clear it' : 'Remove'}
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
                      value={q.paperQuestionTitle}
                      onChange={(e) => onNewChange(idx, 'paperQuestionTitle', e.target.value)}
                      placeholder="Pseudocode… what is wrong?"
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Category</label>
                    <input
                      type="text"
                      className="form-control"
                      value={q.paperQuestioncategory}
                      onChange={(e) => onNewChange(idx, 'paperQuestioncategory', e.target.value)}
                      placeholder="Error Detection"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label d-block">Answers (pick the correct one)</label>
                    {q.answers.map((a, aIdx) => (
                      <div key={aIdx} className="input-group mb-2">
                        <div className="input-group-text">
                          <input
                            type="radio"
                            name={`correct-new-${idx}`}
                            checked={q.correctIndex === aIdx}
                            onChange={() => onNewCorrectPick(idx, aIdx)}
                            aria-label={`Mark option ${aIdx + 1} as correct`}
                          />
                        </div>
                        <input
                          type="text"
                          className="form-control"
                          value={a}
                          onChange={(e) => onNewAnswerChange(idx, aIdx, e.target.value)}
                          placeholder={`Option ${aIdx + 1}`}
                          required={aIdx < 2}
                        />
                      </div>
                    ))}
                    <small className="text-muted">
                      Provide 2–4 options. The selected radio is sent as <code>correctanser</code>.
                    </small>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card-footer d-flex justify-content-end">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || loadingTitle}>
              {isSubmitting ? 'Saving...' : 'Update Title & Add Questions'}
            </button>
          </div>
        </form>

        <CardLoader refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default UpdateStartingPaperForm;
