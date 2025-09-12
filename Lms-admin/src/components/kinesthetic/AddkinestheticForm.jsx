import React, { useEffect, useState } from 'react';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import Swal from 'sweetalert2';

const AddkinestheticForm = ({ title }) => {
  const [formData, setFormData] = useState({
    title: '',
    teacherGuideId: '',
  });

  // Kinesthetic-specific fields
  const [question, setQuestion] = useState('');
  const [instruction, setInstruction] = useState('');
  const [answer, setAnswer] = useState('');

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

  const onFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submitKinesthetic = async (e) => {
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
    if (!question.trim()) {
      Swal.fire('Required', 'Question is required.', 'info');
      return;
    }
    if (!instruction.trim()) {
      Swal.fire('Required', 'Instruction is required.', 'info');
      return;
    }
    if (!answer.trim()) {
      Swal.fire('Required', 'Answer is required.', 'info');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = getToken();

      // Create Kinesthetic Learning item (JSON)
      // NOTE: backend expects specific keys including the typo "Instructuion"
      const payload = {
        TeacherGuideId: formData.teacherGuideId,
        Question: question.trim(),
        Instructuion: instruction.trim(), // backend field spelling
        answer: answer.trim(),
        title: formData.title.trim(),
      };

      await axios.post(`${BASE_URL}/kinesthetic/learning`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      await Swal.fire({
        icon: 'success',
        title: 'Created!',
        text: 'Kinesthetic activity created successfully.',
        timer: 1500,
        showConfirmButton: false,
      });

      // Reset
      setFormData({ title: '', teacherGuideId: '' });
      setQuestion('');
      setInstruction('');
      setAnswer('');
      handleRefresh();
    } catch (err) {
      console.error('Kinesthetic creation failed:', err?.response?.data || err);
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text:
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Failed to create kinesthetic activity.',
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

        <form onSubmit={submitKinesthetic}>
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
                  {tgLoading ? 'Loading teacher guides…' : 'Link this activity to a teacher guide.'}
                </small>
              </div>

              {/* Kinesthetic fields */}
              <div className="col-12">
                <label className="form-label">Question (what students should do)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., Build a model demonstrating center of gravity."
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Instruction</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="e.g., Use a ruler, clay, and a coin; shift the mass and observe balance points."
                  required
                />
              </div>

              <div className="col-12">
                <label className="form-label">Answer / Expected Outcome</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="e.g., The object balances when its center of gravity is directly over the support."
                  required
                />
              </div>
            </div>
          </div>

          <div className="card-footer d-flex justify-content-end">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Create Kinesthetic Activity'}
            </button>
          </div>
        </form>

        <CardLoader refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default AddkinestheticForm;
