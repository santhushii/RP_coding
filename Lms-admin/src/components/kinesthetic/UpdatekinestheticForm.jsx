import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import Swal from 'sweetalert2';

const UpdatekinestheticForm = ({ title }) => {
  const { id } = useParams(); // kinesthetic learning id
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    teacherGuideId: '',
    question: '',
    instruction: '',
    answer: '',
  });

  const [teacherGuides, setTeacherGuides] = useState([]);
  const [tgLoading, setTgLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    refreshKey,
    isRemoved,
    isExpanded,
    handleRefresh,
    handleExpand,
    handleDelete,
  } = useCardTitleActions();

  // Load kinesthetic item
  useEffect(() => {
    const loadKinesthetic = async () => {
      try {
        setLoadingItem(true);
        const token = getToken();
        const res = await axios.get(`${BASE_URL}/kinesthetic/learning/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const k = res?.data || {};

        // Teacher guide id can be either a string or an object
        const tgId =
          typeof k?.TeacherGuideId === 'string'
            ? k.TeacherGuideId
            : k?.TeacherGuideId?._id ||
              (typeof k?.teacherguideId === 'string'
                ? k.teacherguideId
                : k?.teacherguideId?._id) ||
              '';

        setFormData({
          title: k?.title || '',
          teacherGuideId: tgId,
          question: k?.Question || '',
          instruction: k?.Instructuion || k?.Instruction || '',
          answer: k?.answer ?? '',
        });
      } catch (err) {
        console.error('Failed to load kinesthetic item', err);
        Swal.fire('Error', 'Failed to load kinesthetic activity.', 'error');
      } finally {
        setLoadingItem(false);
      }
    };

    loadKinesthetic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const onFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Submit (update)
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      Swal.fire('Required', 'Title is required.', 'info');
      return;
    }
    if (!formData.teacherGuideId) {
      Swal.fire('Required', 'Please select a teacher guide.', 'info');
      return;
    }
    if (!formData.question.trim()) {
      Swal.fire('Required', 'Question is required.', 'info');
      return;
    }
    if (!formData.instruction.trim()) {
      Swal.fire('Required', 'Instruction is required.', 'info');
      return;
    }
    if (!formData.answer.trim()) {
      Swal.fire('Required', 'Answer is required.', 'info');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getToken();

      // Backend expects JSON with these exact keys (including the "Instructuion" typo)
      const payload = {
        TeacherGuideId: formData.teacherGuideId,
        Question: formData.question.trim(),
        Instructuion: formData.instruction.trim(),
        answer: formData.answer.trim(),
        title: formData.title.trim(),
      };

      await axios.put(`${BASE_URL}/kinesthetic/learning/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      await Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Kinesthetic activity updated.',
        timer: 1300,
        showConfirmButton: false,
      });

      navigate('/admin/kinesthetic');
    } catch (err) {
      console.error('Update kinesthetic failed:', err?.response?.data || err);
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: err?.response?.data?.message || err?.response?.data?.error || 'Failed to update kinesthetic activity.',
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
                  placeholder="e.g., Center of Gravity Demo"
                  required
                  disabled={loadingItem}
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">Teacher Guide</label>
                <select
                  className="form-select"
                  name="teacherGuideId"
                  value={formData.teacherGuideId}
                  onChange={onFieldChange}
                  disabled={tgLoading || loadingItem}
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
                  {tgLoading ? 'Loading teacher guides…' : 'Link this activity to a teacher guide.'}
                </small>
              </div>

              <div className="col-12">
                <label className="form-label">Question (what students should do)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  name="question"
                  value={formData.question}
                  onChange={onFieldChange}
                  placeholder="Build a model demonstrating center of gravity."
                  required
                  disabled={loadingItem}
                />
              </div>

              <div className="col-12">
                <label className="form-label">Instruction</label>
                <textarea
                  className="form-control"
                  rows={4}
                  name="instruction"
                  value={formData.instruction}
                  onChange={onFieldChange}
                  placeholder="Use a ruler, clay, and a coin; shift the mass and observe balance points."
                  required
                  disabled={loadingItem}
                />
              </div>

              <div className="col-12">
                <label className="form-label">Answer / Expected Outcome</label>
                <textarea
                  className="form-control"
                  rows={3}
                  name="answer"
                  value={formData.answer}
                  onChange={onFieldChange}
                  placeholder="The object balances when its center of gravity is directly over the support."
                  required
                  disabled={loadingItem}
                />
              </div>
            </div>
          </div>

          <div className="card-footer d-flex justify-content-end">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || loadingItem}>
              {isSubmitting ? 'Saving…' : 'Update Kinesthetic Activity'}
            </button>
          </div>
        </form>

        <CardLoader refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default UpdatekinestheticForm;
