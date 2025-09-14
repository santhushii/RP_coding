import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CardHeader from '@/components/shared/CardHeader';
import CardLoader from '@/components/shared/CardLoader';
import useCardTitleActions from '@/hooks/useCardTitleActions';
import axios from 'axios';
import BASE_URL from '../../config/apiConfig';
import { getToken } from '@/utils/token';
import Swal from 'sweetalert2';

const MAX_PDFS = 5;

const UpdatePythonLectureForm = ({ title }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    lectureType: '1',
    lectureTytle: '',
    lectureDifficulty: '',
    teacherGuideId: '',
    description: '',
  });

  const [videoFile, setVideoFile] = useState(null);     // optional replace
  const [videoPreview, setVideoPreview] = useState(''); // preview for new video
  const [pdfFiles, setPdfFiles] = useState([]);         // optional add
  const [pdfPreviews, setPdfPreviews] = useState([]);   // previews for new PDFs

  const [existingVideoUrl, setExistingVideoUrl] = useState('');
  const [existingPdfUrls, setExistingPdfUrls] = useState([]); // will mutate when removing

  const [teacherGuides, setTeacherGuides] = useState([]);
  const [tgLoading, setTgLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { refreshKey, isRemoved, isExpanded, handleRefresh, handleExpand, handleDelete } =
    useCardTitleActions();

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      pdfPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [videoPreview, pdfPreviews]);

  useEffect(() => {
    fetchLecture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const fetchLecture = async () => {
    try {
      const token = getToken();
      const res = await axios.get(`${BASE_URL}/python/video-lectures/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const lec = res.data || {};
      const tgId =
        typeof lec?.teacherGuideId === 'string'
          ? lec.teacherGuideId
          : lec?.teacherGuideId?._id || '';

      setFormData({
        lectureType: String(lec?.lectureType ?? '1'),
        lectureTytle: lec?.lectureTytle || lec?.lectureTitle || '',
        lectureDifficulty: lec?.lectureDifficulty || '',
        teacherGuideId: tgId,
        description: lec?.description || '',
      });

      setExistingVideoUrl(lec?.videoUrl || '');
      setExistingPdfUrls(Array.isArray(lec?.pdfMaterials) ? lec.pdfMaterials : []);
    } catch (err) {
      console.error('Error fetching video lecture', err);
      Swal.fire('Error', 'Could not fetch video lecture data', 'error');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    } else {
      setVideoPreview('');
    }
    setVideoFile(file);
  };

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview('');
    setVideoFile(null);
  };

  const handlePdfChange = (e) => {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;

    const onlyPdfs = picked.filter((f) => f.type === 'application/pdf');
    if (onlyPdfs.length !== picked.length) {
      Swal.fire('Notice', 'Only PDF files are allowed for materials.', 'info');
    }

    // Enforce total cap including existing
    const alreadyNew = pdfFiles.length;
    const availableSlots = Math.max(0, MAX_PDFS - existingPdfUrls.length - alreadyNew);
    if (availableSlots <= 0) {
      Swal.fire(
        'Limit reached',
        `You already have ${existingPdfUrls.length} existing PDFs. Max ${MAX_PDFS} total.`,
        'warning'
      );
      return;
    }

    const limited = onlyPdfs.slice(0, availableSlots);

    const newFiles = [...pdfFiles, ...limited];
    const newPreviews = [
      ...pdfPreviews,
      ...limited.map((f) => ({ url: URL.createObjectURL(f), name: f.name })),
    ];

    setPdfFiles(newFiles);
    setPdfPreviews(newPreviews);

    if (onlyPdfs.length > availableSlots) {
      Swal.fire(
        'Limit reached',
        `Only ${availableSlots} more PDF(s) can be added (max ${MAX_PDFS} total).`,
        'warning'
      );
    }
  };

  const removePdfAt = (idx) => {
    const removeUrl = pdfPreviews[idx]?.url;
    if (removeUrl) URL.revokeObjectURL(removeUrl);
    setPdfFiles((prev) => prev.filter((_, i) => i !== idx));
    setPdfPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // NEW: remove existing PDF (stage deletion locally)
  const removeExistingPdfAt = (idx) => {
    setExistingPdfUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = getToken();
      const fd = new FormData();

      fd.append('lectureType', formData.lectureType || '');
      fd.append('lectureTytle', formData.lectureTytle || '');
      fd.append('lectureDifficulty', formData.lectureDifficulty || '');
      if (formData.teacherGuideId) fd.append('teacherGuideId', formData.teacherGuideId);
      fd.append('description', formData.description || '');

      if (videoFile) fd.append('video', videoFile);
      pdfFiles.forEach((f) => fd.append('pdfMaterials', f));

      // Tell backend which existing PDFs to KEEP after removals
      fd.append('existingPdfUrls', JSON.stringify(existingPdfUrls));

      await axios.put(`${BASE_URL}/python/video-lectures/${id}`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      await Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Video lecture updated successfully!',
        timer: 1500,
        showConfirmButton: false,
      });

      navigate('/admin/python-lectures');
    } catch (err) {
      console.error('Update failed', err);
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to update video lecture';
      Swal.fire('Error', msg, 'error');
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
            <div className="row g-3">
              {/* Lecture Type */}
              <div className="col-md-4">
                <label className="form-label">Lecture Type</label>
                <select
                  className="form-select"
                  name="lectureType"
                  value={formData.lectureType}
                  onChange={handleChange}
                  required
                >
                  <option value="1">1 - Full content (video + PDFs)</option>
                  <option value="2">2 - Video only</option>
                  <option value="3">3 - PDF only</option>
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">Lecture Title</label>
                <input
                  type="text"
                  className="form-control"
                  name="lectureTytle"
                  value={formData.lectureTytle}
                  onChange={handleChange}
                  placeholder="Intro to Python"
                  required
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Difficulty</label>
                <input
                  type="text"
                  className="form-control"
                  name="lectureDifficulty"
                  value={formData.lectureDifficulty}
                  onChange={handleChange}
                  placeholder="Easy / Medium / Hard"
                  required
                />
              </div>

              {/* Teacher Guide selector */}
              <div className="col-md-6">
                <label className="form-label">Teacher Guide (optional)</label>
                <select
                  className="form-select"
                  name="teacherGuideId"
                  value={formData.teacherGuideId}
                  onChange={handleChange}
                  disabled={tgLoading}
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

              <div className="col-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="This is an introduction to Python basics..."
                  rows={6}
                  required
                />
              </div>

              {/* Existing + New Video */}
              <div className="col-md-6">
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
                <input type="file" className="form-control" accept="video/*" onChange={handleVideoChange} />
                {videoPreview && (
                  <div className="mt-2">
                    <video src={videoPreview} controls style={{ width: 260, height: 150, borderRadius: 6 }} />
                    <div>
                      <button type="button" className="btn btn-link p-0 small mt-1" onClick={clearVideo}>
                        Remove selected
                      </button>
                    </div>
                  </div>
                )}
                <small className="text-muted d-block">Leave empty to keep existing.</small>
              </div>

              {/* Existing PDFs (now removable) */}
              <div className="col-md-6">
                <label className="form-label">Existing PDFs ({existingPdfUrls.length})</label>
                {existingPdfUrls.length > 0 ? (
                  <div className="d-flex flex-wrap gap-2">
                    {existingPdfUrls.map((url, idx) => (
                      <div key={idx} className="border rounded p-1" style={{ width: 130 }}>
                        <iframe
                          src={url}
                          title={`existing-pdf-${idx}`}
                          style={{ width: '100%', height: 150, border: 'none', borderRadius: 4 }}
                        />
                        <div className="d-flex align-items-center justify-content-between mt-1">
                          <small className="text-truncate" title={url} style={{ maxWidth: 90 }}>
                            {url.split('/').pop()}
                          </small>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeExistingPdfAt(idx)}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted">No existing PDFs.</div>
                )}
                <small className="text-muted d-block mt-1">
                  Removed PDFs will be deleted when you save.
                </small>
              </div>

              {/* Add new PDFs with previews (cap = MAX_PDFS - existing) */}
              <div className="col-md-12">
                <label className="form-label d-flex justify-content-between">
                  <span>Add PDF Materials (max {MAX_PDFS} total)</span>
                  <span className="small text-muted">
                    New: {pdfFiles.length} | Existing: {existingPdfUrls.length} | Allowed total: {MAX_PDFS}
                  </span>
                </label>
                <input
                  type="file"
                  className="form-control"
                  accept="application/pdf"
                  multiple
                  onChange={handlePdfChange}
                />
                {pdfPreviews.length > 0 && (
                  <div className="mt-2 d-flex flex-wrap gap-2">
                    {pdfPreviews.map((p, idx) => (
                      <div key={idx} className="border rounded p-1" style={{ width: 130 }}>
                        <iframe
                          src={p.url}
                          title={`new-pdf-${idx}`}
                          style={{ width: '100%', height: 150, border: 'none', borderRadius: 4 }}
                        />
                        <div className="d-flex align-items-center justify-content-between mt-1">
                          <small className="text-truncate" title={p.name} style={{ maxWidth: 90 }}>
                            {p.name}
                          </small>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removePdfAt(idx)}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <small className="text-muted">
                  Existing PDFs are kept unless removed above. New PDFs will be added (if your backend supports append).
                </small>
              </div>
            </div>
          </div>

          <div className="card-footer d-flex justify-content-end">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Update Lecture'}
            </button>
          </div>
        </form>

        <CardLoader refreshKey={refreshKey} />
      </div>
    </div>
  );
};

export default UpdatePythonLectureForm;
