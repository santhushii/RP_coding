import React, { useEffect, useState } from 'react';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import Swal from 'sweetalert2';

const AddAuditoryLearningForm = ({ title }) => {
  const [formData, setFormData] = useState({
    title: '',
    teacherGuideId: '',
  });

  const [audioFile, setAudioFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState('');

  const [questions, setQuestions] = useState([
    { questionTytle: '', questionAnswer: '', topicTag: '', score: 1 },
  ]);

  const [teacherGuides, setTeacherGuides] = useState([]);
  const [tgLoading, setTgLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    refreshKey,
    isRemoved,
    isExpanded,
    handleRefresh,
    handleExpand,
    handleDelete,
  } = useCardTitleActions();

  // Load teacher guides
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

  // Cleanup object URLs
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
    const f = e.target.files?.[0];
    if (!f) return;
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioFile(f);
    setAudioPreview(URL.createObjectURL(f));
  };

  const clearAudio = () => {
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioPreview('');
    setAudioFile(null);
  };

  // Questions handlers
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

  const submitAudioAndQnA = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.title.trim()) {
      Swal.fire('Required', 'Title is required.', 'info');
      return;
    }
    if (!formData.teacherGuideId) {
      Swal.fire('Required', 'Please select a teacher guide.', 'info');
      return;
    }
    if (!audioFile) {
      Swal.fire('Required', 'Please select an audio file.', 'info');
      return;
    }
    const invalid = questions.find(
      (q) =>
        !q.questionTytle.trim() ||
        !q.questionAnswer.trim() ||
        String(q.score).trim() === ''
    );
    if (invalid) {
      Swal.fire(
        'Required',
        'Each question must have a title, an answer, and a score.',
        'info'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const token = getToken();

      // 1) Create Auditory Learning item (multipart/form-data)
      //    Keys must match your backend: teacherGuideId, title, audio
      const fd = new FormData();
      fd.append('teacherGuideId', formData.teacherGuideId);
      fd.append('title', formData.title.trim());
      fd.append('audio', audioFile);

      const auRes = await axios.post(`${BASE_URL}/auditory/learning`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const auditoryId = auRes?.data?._id;
      if (!auditoryId) {
        throw new Error('Auditory item created but _id missing in response.');
      }

      // 2) Create Q&A for that auditory item (JSON)
      //    Field name per your API: AuditoryLearningId (note capitalization)
      const results = await Promise.allSettled(
        questions.map((q) =>
          axios.post(
            `${BASE_URL}/auditory/qanda`,
            {
              AuditoryLearningId: auditoryId,
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

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.length - successCount;

      if (failCount === 0) {
        await Swal.fire({
          icon: 'success',
          title: 'Created!',
          text: `Auditory learning item created and ${successCount} question(s) added.`,
          timer: 1700,
          showConfirmButton: false,
        });
      } else if (successCount > 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Partial success',
          text: `Auditory item created. ${successCount} question(s) added, ${failCount} failed.`,
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Questions failed',
          text: 'Auditory item created, but adding questions failed.',
        });
      }

      // Reset
      setFormData({ title: '', teacherGuideId: '' });
      clearAudio();
      setQuestions([{ questionTytle: '', questionAnswer: '', topicTag: '', score: 1 }]);
      handleRefresh();
    } catch (err) {
      console.error('Auditory learning creation failed:', err?.response?.data || err);
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to create auditory learning item or questions.',
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

        <form onSubmit={submitAudioAndQnA}>
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
                  placeholder="Enter a short, descriptive title"
                  required
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Teacher Guide</label>
                <select
                  className="form-select"
                  name="teacherGuideId"
                  value={formData.teacherGuideId}
                  onChange={onFieldChange}
                  disabled={tgLoading}
                  required
                >
                  <option value="">— Select a teacher guide —</option>
                  {teacherGuides.map((tg) => (
                    <option key={tg._id} value={tg._id}>
                      {tg.coureInfo}
                    </option>
                  ))}
                </select>
                <small className="text-muted">
                  {tgLoading ? 'Loading teacher guides…' : 'Link this auditory item to a teacher guide.'}
                </small>
              </div>

              {/* Audio + preview */}
              <div className="col-md-12">
                <label className="form-label d-flex justify-content-between">
                  <span>Audio (required)</span>
                  {audioPreview ? (
                    <button type="button" className="btn btn-link p-0 small" onClick={clearAudio}>
                      Remove
                    </button>
                  ) : null}
                </label>
                <input
                  type="file"
                  className="form-control"
                  accept="audio/*"
                  onChange={onAudioChange}
                  required
                />
                {audioPreview && (
                  <div className="mt-2">
                    <audio controls style={{ width: 320 }}>
                      <source src={audioPreview} />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            </div>

            {/* Questions */}
            <hr className="my-4" />
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="mb-0">Q&A for this Auditory Item ({questions.length})</h6>
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
                      required
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
                      required
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Answer</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={q.questionAnswer}
                      onChange={(e) => onQuestionChange(idx, 'questionAnswer', e.target.value)}
                      placeholder="Your answer text…"
                      required
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Topic Tags (comma-separated)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={q.topicTag}
                      onChange={(e) => onQuestionChange(idx, 'topicTag', e.target.value)}
                      placeholder="python basics,loops,functions"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card-footer d-flex justify-content-end">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Create Auditory & Q&A'}
            </button>
          </div>
        </form>

        <CardLoader refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default AddAuditoryLearningForm;
