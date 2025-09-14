import React, { useState } from 'react';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import Swal from 'sweetalert2';

const blankQuestion = () => ({
  paperQuestionTitle: '',
  paperQuestioncategory: '',
  answers: ['', '', '', ''], // 4 options by default
  correctIndex: 0,           // which answer is correct
});

const AddStartingPaperForm = ({ title }) => {
  const [formData, setFormData] = useState({
    paperTytle: '',
    paperNumber: 1,
  });

  const [questions, setQuestions] = useState([blankQuestion()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    refreshKey,
    isRemoved,
    isExpanded,
    handleRefresh,
    handleExpand,
    handleDelete,
  } = useCardTitleActions();

  const onFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'paperNumber' ? Number(value) : value }));
  };

  // Questions handlers
  const addQuestion = () => setQuestions((prev) => [...prev, blankQuestion()]);

  const removeQuestion = (idx) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const onQuestionChange = (idx, field, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  };

  const onAnswerChange = (qIdx, aIdx, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const answers = [...q.answers];
        answers[aIdx] = value;
        return { ...q, answers };
      })
    );
  };

  const onCorrectPick = (qIdx, aIdx) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIdx ? { ...q, correctIndex: aIdx } : q))
    );
  };

  const validate = () => {
    if (!formData.paperTytle.trim()) {
      Swal.fire('Required', 'Paper title is required.', 'info');
      return false;
    }
    if (!Number.isFinite(formData.paperNumber) || formData.paperNumber < 1) {
      Swal.fire('Required', 'Paper # must be a positive number.', 'info');
      return false;
    }
    if (questions.length === 0) {
      Swal.fire('Required', 'Add at least one question.', 'info');
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.paperQuestionTitle.trim()) {
        Swal.fire('Required', `Question #${i + 1}: title is required.`, 'info');
        return false;
      }
      if (!q.paperQuestioncategory.trim()) {
        Swal.fire('Required', `Question #${i + 1}: category is required.`, 'info');
        return false;
      }
      const trimmedAnswers = q.answers.map((a) => a.trim());
      const nonEmpty = trimmedAnswers.filter(Boolean);
      if (nonEmpty.length < 2) {
        Swal.fire(
          'Required',
          `Question #${i + 1}: provide at least two non-empty answer options.`,
          'info'
        );
        return false;
      }
      const correct = trimmedAnswers[q.correctIndex] || '';
      if (!correct) {
        Swal.fire('Required', `Question #${i + 1}: pick a non-empty correct answer.`, 'info');
        return false;
      }
    }
    return true;
  };

  const submitPaperAndQuestions = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const token = getToken();
      const headers = token
        ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };

      // 1) Create Starting Paper Title
      const titlePayload = {
        paperTytle: formData.paperTytle.trim(),
        paperNumber: Number(formData.paperNumber),
      };

      const titleRes = await axios.post(
        `${BASE_URL}/starting-paper-titles`,
        titlePayload,
        { headers }
      );

      const paperId = titleRes?.data?._id;
      if (!paperId) {
        throw new Error('Title created but _id missing in response.');
      }

      // 2) Create all questions (one by one)
      const results = await Promise.allSettled(
        questions.map((q) => {
          const trimmedAnswers = q.answers.map((a) => a.trim());
          const correctanser = trimmedAnswers[q.correctIndex]; // NOTE: API expects "correctanser" (typo)
          return axios.post(
            `${BASE_URL}/starting-paper-questions`,
            {
              paperQuestionId: paperId,
              paperQuestionTitle: q.paperQuestionTitle.trim(),
              paperQuestioncategory: q.paperQuestioncategory.trim(),
              answers: trimmedAnswers,
              correctanser, // exact key as API
            },
            { headers }
          );
        })
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.length - successCount;

      if (failCount === 0) {
        await Swal.fire({
          icon: 'success',
          title: 'Created!',
          text: `Starting paper title + ${successCount} question(s) created successfully.`,
          timer: 1700,
          showConfirmButton: false,
        });
      } else if (successCount > 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Partial success',
          text: `Title created. ${successCount} question(s) added, ${failCount} failed.`,
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Questions failed',
          text: 'The title was created but adding questions failed.',
        });
      }

      // Reset UI
      setFormData({ paperTytle: '', paperNumber: 1 });
      setQuestions([blankQuestion()]);
      handleRefresh();
    } catch (err) {
      console.error('Creation failed:', err?.response?.data || err);
      Swal.fire({
        icon: 'error',
        title: 'Oops…',
        text:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to create starting paper title or questions.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRemoved) return null;

  return (
    <div className="col-xxl-12">
      <div className={`card stretch stretch-full ${isExpanded ? 'card-expand' : ''} ${refreshKey ? 'card-loading' : ''}`}>
        <CardHeader
          title={title}
          refresh={handleRefresh}
          remove={handleDelete}
          expanded={handleExpand}
        />

        <form onSubmit={submitPaperAndQuestions}>
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
                />
              </div>
            </div>

            {/* Questions */}
            <hr className="my-4" />
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="mb-0">Questions ({questions.length})</h6>
              <button type="button" className="btn btn-sm btn-outline-primary" onClick={addQuestion}>
                + Add Question
              </button>
            </div>

            {questions.map((q, idx) => (
              <div key={idx} className="border rounded p-3 mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Question #{idx + 1}</strong>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeQuestion(idx)}
                    disabled={questions.length === 1}
                    title={questions.length === 1 ? 'At least one question is required' : 'Remove'}
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
                      onChange={(e) => onQuestionChange(idx, 'paperQuestionTitle', e.target.value)}
                      placeholder="Pseudocode: READ n; total = 0; FOR k FROM 1 TO n ..."
                      required
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Category</label>
                    <input
                      type="text"
                      className="form-control"
                      value={q.paperQuestioncategory}
                      onChange={(e) => onQuestionChange(idx, 'paperQuestioncategory', e.target.value)}
                      placeholder="Error Detection"
                      required
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label d-block">Answers (pick the correct one)</label>

                    {q.answers.map((a, aIdx) => (
                      <div key={aIdx} className="input-group mb-2">
                        <div className="input-group-text">
                          <input
                            type="radio"
                            name={`correct-${idx}`}
                            checked={q.correctIndex === aIdx}
                            onChange={() => onCorrectPick(idx, aIdx)}
                            aria-label={`Mark option ${aIdx + 1} as correct`}
                          />
                        </div>
                        <input
                          type="text"
                          className="form-control"
                          value={a}
                          onChange={(e) => onAnswerChange(idx, aIdx, e.target.value)}
                          placeholder={`Option ${aIdx + 1}`}
                          required={aIdx < 2} // require at least first two
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
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Create Title & Questions'}
            </button>
          </div>
        </form>

        <CardLoader refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default AddStartingPaperForm;
