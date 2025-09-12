import React, { useEffect, useState } from 'react';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import Swal from 'sweetalert2';

const AddVisualLearningForm = ({ title }) => {
  const [formData, setFormData] = useState({
    title: '',
    teacherGuideId: '',
  });

  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');

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
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [videoPreview]);

  const onFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onVideoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(f);
    setVideoPreview(URL.createObjectURL(f));
  };

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview('');
    setVideoFile(null);
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

  const submitVisualAndQnA = async (e) => {
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
    if (!videoFile) {
      Swal.fire('Required', 'Please select a video file.', 'info');
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

      // 1) Create Visual Learning item (multipart/form-data)
      const fd = new FormData();
      fd.append('teacherGuideId', formData.teacherGuideId);
      fd.append('title', formData.title.trim());
      fd.append('video', videoFile);

      const vlRes = await axios.post(`${BASE_URL}/visual/learning`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const visualId = vlRes?.data?._id;
      if (!visualId) {
        throw new Error('Visual created but id missing in response.');
      }

      // 2) Create Q&A for that visual (JSON)
      // NOTE: API expects the *typo* key: "visualLerningId"
      const results = await Promise.allSettled(
        questions.map((q) =>
          axios.post(
            `${BASE_URL}/visual/qanda`,
            {
              visualLerningId: visualId, // ← keep the backend field name as given
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
          text: `Visual learning item created and ${successCount} question(s) added.`,
          timer: 1700,
          showConfirmButton: false,
        });
      } else if (successCount > 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Partial success',
          text: `Visual created. ${successCount} question(s) added, ${failCount} failed.`,
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Questions failed',
          text: 'Visual created, but adding questions failed.',
        });
      }

      // Reset
      setFormData({ title: '', teacherGuideId: '' });
      clearVideo();
      setQuestions([{ questionTytle: '', questionAnswer: '', topicTag: '', score: 1 }]);
      handleRefresh();
    } catch (err) {
      console.error('Visual learning creation failed:', err?.response?.data || err);
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to create visual learning item or questions.',
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

        <form onSubmit={submitVisualAndQnA}>
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
                  {tgLoading ? 'Loading teacher guides…' : 'Link this visual to a teacher guide.'}
                </small>
              </div>

              {/* Video + preview */}
              <div className="col-md-12">
                <label className="form-label d-flex justify-content-between">
                  <span>Video (required)</span>
                  {videoPreview ? (
                    <button type="button" className="btn btn-link p-0 small" onClick={clearVideo}>
                      Remove
                    </button>
                  ) : null}
                </label>
                <input type="file" className="form-control" accept="video/*" onChange={onVideoChange} required />
                {videoPreview && (
                  <div className="mt-2">
                    <video
                      src={videoPreview}
                      controls
                      style={{ width: 320, height: 180, borderRadius: 6 }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Questions */}
            <hr className="my-4" />
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h6 className="mb-0">Q&A for this Visual ({questions.length})</h6>
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
                      placeholder="What is overfitting?"
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
                      placeholder="e.g., 5"
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
                      placeholder="Your model memorizes training data; use more data, regularization, or cross-validation…"
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
              {isSubmitting ? 'Saving…' : 'Create Visual & Q&A'}
            </button>
          </div>
        </form>

        <CardLoader refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default AddVisualLearningForm;
