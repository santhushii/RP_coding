import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import Swal from 'sweetalert2';

const UpdateTeacherGuideForm = ({ title }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    courseInfo: '',
    originalTeacherGuide: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } =
    useCardTitleActions();

  useEffect(() => {
    fetchGuide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchGuide = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${BASE_URL}/teacher-guides/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // API returns: { coureInfo, originalTeacherGuide }
      setFormData({
        courseInfo: res.data?.coureInfo || '',
        originalTeacherGuide: res.data?.originalTeacherGuide || '',
      });
    } catch (err) {
      console.error('Error fetching teacher guide', err);
      Swal.fire('Error', 'Could not fetch teacher guide data', 'error');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = getToken();
      const payload = {
        // map UI -> API keys (keep API’s "coureInfo" spelling)
        coureInfo: formData.courseInfo.trim(),
        originalTeacherGuide: formData.originalTeacherGuide.trim(),
      };

      await axios.put(`${BASE_URL}/teacher-guides/${id}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      await Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Teacher guide updated successfully!',
        timer: 1500,
        showConfirmButton: false,
      });

      navigate('/admin/teacher-guide');
    } catch (err) {
      console.error('Update failed', err);
      Swal.fire('Error', 'Failed to update teacher guide', 'error');
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
            <div className="mb-3">
              <label className="form-label">Teacher Guide Title</label>
              <input
                type="text"
                className="form-control"
                name="courseInfo"
                value={formData.courseInfo}
                onChange={handleChange}
                placeholder="e.g., Python 101 - Week 3"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Teacher Guide</label>
              <textarea
                className="form-control"
                name="originalTeacherGuide"
                value={formData.originalTeacherGuide}
                onChange={handleChange}
                placeholder="Objectives, activities, notes..."
                rows={6}
                required
              />
            </div>
          </div>

          <div className="card-footer d-flex justify-content-end">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Update Teacher Guide'}
            </button>
          </div>
        </form>

        <CardLoader refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default UpdateTeacherGuideForm;
