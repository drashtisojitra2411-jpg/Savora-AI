import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  Check,
  Flame,
  ImagePlus,
  LoaderCircle,
  Sparkles,
  Wheat,
  Drumstick,
  Droplets,
  Scale,
  Info,
} from 'lucide-react';
import LoaderAnimation from '../components/LoaderAnimation';
import { MacroBarChart, MacroPieChart } from '../components/NutritionChart';
import { safeFetch, SERVER_ISSUE_MESSAGE } from '../utils/safeFetch';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_URL = `${API_BASE_URL}/predict`;
const QUICK_WEIGHTS = [100, 200, 300];

const EMPTY_RESULT = {
  food_name: '',
  confidence: 0,
  top_predictions: [],
  weight: 100,
  calories: null,
  protein: null,
  carbs: null,
  fat: null,
  message: '',
  health_tip: '',
  image_filename: '',
  is_low_confidence: false,
  confidence_threshold: 0.4,
  predicted_class: '',
  portion: '',
};

const macroCards = [
  { key: 'protein', label: 'Protein', icon: Drumstick, accent: '#ff9558', suffix: 'g' },
  { key: 'carbs', label: 'Carbs', icon: Wheat, accent: '#ff5d73', suffix: 'g' },
  { key: 'fat', label: 'Fat', icon: Droplets, accent: '#ffb347', suffix: 'g' },
  { key: 'weight', label: 'Portion', icon: Scale, accent: '#ffd1a1', suffix: 'g' },
];

function formatMetric(value, suffix = '') {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)}${suffix}`;
}

export default function Dashboard() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [weightInput, setWeightInput] = useState('100');
  const [result, setResult] = useState(EMPTY_RESULT);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  const activeWeight = useMemo(() => {
    const parsed = Number.parseFloat(weightInput);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
  }, [weightInput]);

  const updatePreview = useCallback((file) => {
    setErrorMessage('');

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!file) {
      setSelectedImage(null);
      setPreviewUrl('');
      setResult(EMPTY_RESULT);
      return;
    }

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(EMPTY_RESULT);
    console.log('Image selected for upload', {
      name: file.name,
      size: file.size,
      type: file.type,
    });
  }, [previewUrl]);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) {
      return;
    }

    updatePreview(file);
  }, [updatePreview]);

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    noClick: true,
    onDropRejected: () => {
      setErrorMessage('Upload a JPG, PNG, or WebP image under 10MB.');
      toast.error('Upload a JPG, PNG, or WebP image under 10MB.');
    },
  });

  const normalizeWeight = useCallback(() => {
    const parsed = Number.parseFloat(weightInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setWeightInput('100');
      return 100;
    }
    const normalized = Math.round(parsed * 100) / 100;
    setWeightInput(String(normalized));
    return normalized;
  }, [weightInput]);

  const handleAnalyze = async () => {
    console.log('Function running: handleAnalyze');

    if (!selectedImage) {
      console.log('Analyze aborted: no image selected');
      setErrorMessage('Choose an image before analyzing.');
      toast.error('Choose an image before analyzing.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    const normalizedWeight = normalizeWeight();

    try {
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('weight', String(normalizedWeight));

      console.log('Preparing API request', {
        apiUrl: API_URL,
        fileName: selectedImage.name,
        weight: normalizedWeight,
      });

      const payload = await safeFetch(API_URL, { method: 'POST', body: formData });
      console.log('FULL RESPONSE:', payload);
      if (!payload.success) {
        console.log('API request failed before UI update', payload);
        setErrorMessage('');
        toast.error(SERVER_ISSUE_MESSAGE);
        return;
      }

      const data = payload.data ?? {};
      console.log('RESULT:', data);
      if (!payload.data || typeof payload.data !== 'object') {
        setErrorMessage('Invalid response from server.');
        toast.error('Invalid response from server.');
        return;
      }

      setResult({
        ...EMPTY_RESULT,
        ...data,
        fat: data.fat ?? null,
        top_predictions: data.top_predictions ?? [],
      });

      if (data.is_low_confidence) {
        const lowConfidenceMessage = data.message || 'Low confidence prediction. Try another image.';
        setErrorMessage(lowConfidenceMessage);
        toast(lowConfidenceMessage);
      } else if (data.calories == null) {
        const nutritionMissingMessage = data.message || 'Nutrition data not available.';
        setErrorMessage(nutritionMissingMessage);
        toast(nutritionMissingMessage);
      } else {
        setErrorMessage('');
        toast.success('Analysis complete.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetSelection = () => {
    updatePreview(null);
    setWeightInput('100');
    setResult(EMPTY_RESULT);
    setErrorMessage('');
  };

  const confidencePercent = Math.round((result.confidence || 0) * 100);
  const isLowConfidence = Boolean(result.is_low_confidence);
  const hasResult = Boolean(result.food_name);

  return (
    <div className="savora-page-scroll">
      <div className="glow-orb savora-glow savora-glow-right" />
      <div className="glow-orb savora-glow savora-glow-left" />

      <div className="main-container">
        <motion.section initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} className="glass-card savora-card upload-card">
            {/* Image Preview / Dropzone */}
            <div className="upload-preview">
              {previewUrl ? (
                <img src={previewUrl} alt="Food preview" />
              ) : (
                <div {...getRootProps()} className={`savora-dropzone ${isDragActive ? 'savora-dropzone-active' : ''}`}>
                  <input {...getInputProps()} />
                  <div className="savora-dropzone-empty">
                    <div className="savora-drop-icon">
                      <ImagePlus size={28} />
                    </div>
                    <h3>Drag & drop or click to upload food image</h3>
                    <p>Use a clear top-view meal photo for better detection accuracy.</p>
                    <div className="savora-drop-placeholder" aria-hidden="true">
                      <div className="savora-drop-placeholder-image">
                        <Flame size={18} />
                      </div>
                      <span className="savora-drop-placeholder-text">Preview appears here</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="savora-upload-helper">
              <h4>Tips for better results</h4>
              <p>Use bright lighting, keep the dish centered, and avoid heavy blur for higher confidence.</p>
            </div>

            <div className="savora-controls">
              <div className="savora-weight-card">
                <label htmlFor="weight" className="savora-input-label">Portion size</label>
                <input
                  id="weight"
                  type="number"
                  min="1"
                  step="1"
                  value={weightInput}
                  onChange={(event) => setWeightInput(event.target.value)}
                  onBlur={normalizeWeight}
                  className="savora-input"
                  placeholder="100"
                />
                <div className="savora-chip-row">
                  {QUICK_WEIGHTS.map((weight) => (
                    <button
                      key={weight}
                      type="button"
                      className={`savora-chip ${activeWeight === weight ? 'savora-chip-active' : ''}`}
                      onClick={() => setWeightInput(String(weight))}
                    >
                      {weight}g
                    </button>
                  ))}
                </div>
              </div>

              <div className="savora-action-row">
                <button type="button" className="btn-secondary savora-button" onClick={open}>
                  <ImagePlus size={18} />
                  Choose File
                </button>
                <button
                  type="button"
                  className="btn-primary savora-button"
                  onClick={() => {
                    console.log('Analyze button clicked');
                    handleAnalyze();
                  }}
                  disabled={!selectedImage || isLoading}
                >
                  {isLoading ? <LoaderCircle size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  {isLoading ? 'Analyzing...' : 'Analyze Image'}
                </button>
              </div>

              {previewUrl && (
                <button type="button" className="savora-text-button savora-reset-button" onClick={resetSelection}>
                  Reset selection
                </button>
              )}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="glass-card savora-card results-card"
          >
          {!previewUrl && !hasResult ? (
            <>
              <div className="savora-card-head">
                <span className="savora-panel-label">Results</span>
                <h2>Nutrition breakdown</h2>
                <p className="savora-card-desc">Upload and analyze to see your results here.</p>
              </div>
              <div className="savora-empty-state">
                <div className="savora-empty-icon">
                  <Flame size={28} />
                </div>
                <h3>Ready for analysis</h3>
                <p>Upload a meal photo to see calories, macros, and alternate predictions.</p>
              </div>
            </>
          ) : (
            <div className="savora-results-body">
              {isLoading ? (
                <div className="savora-results-loading">
                  <LoaderAnimation message="Analyzing..." />
                  <div className="savora-skeleton-stack" aria-hidden="true">
                    <div className="savora-skeleton-card savora-skeleton-hero" />
                    <div className="savora-skeleton-row">
                      <div className="savora-skeleton-card" />
                      <div className="savora-skeleton-card" />
                    </div>
                    <div className="savora-skeleton-row">
                      <div className="savora-skeleton-card savora-skeleton-pill" />
                      <div className="savora-skeleton-card savora-skeleton-pill" />
                      <div className="savora-skeleton-card savora-skeleton-pill" />
                    </div>
                  </div>
                </div>
              ) : hasResult ? (
                <div className="results-section">
                  {/* Section 1 — Food image */}
                  {previewUrl && (
                    <div className="savora-inner-card result-image">
                      <img src={previewUrl} alt="Analyzed food" />
                    </div>
                  )}

                  {/* Section 2 — Food name + confidence + calories */}
                  <div className="savora-inner-card result-header">
                    <div className="savora-result-header-left">
                      <span className="savora-panel-label">{isLowConfidence ? 'Detection status' : 'Detected food'}</span>
                      <h3 className="savora-result-food-name">{result.food_name}</h3>
                      {result.portion && (
                        <p className="savora-result-portion">Portion: {result.portion}</p>
                      )}
                      
                      <div className="savora-confidence-row">
                        <span className="savora-confidence-label">Confidence</span>
                        <span className={`savora-confidence-badge savora-confidence-badge-strong ${confidencePercent >= 85 ? 'savora-confidence-badge--high' : confidencePercent >= 60 ? 'savora-confidence-badge--medium' : 'savora-confidence-badge--low'}`}>
                          {confidencePercent}%
                        </span>
                      </div>
                      <div className="savora-confidence-meter" role="progressbar" aria-valuenow={confidencePercent} aria-valuemin="0" aria-valuemax="100" aria-label="Detection confidence">
                        <span className="savora-confidence-meter-fill" style={{ width: `${confidencePercent}%` }} />
                      </div>
                      
                      {confidencePercent < 70 && (
                        <p className="savora-confidence-note">
                          <span aria-hidden="true">⚠️</span>
                          Low confidence - result may be inaccurate
                        </p>
                      )}
                    </div>
                    
                    {!isLowConfidence && (
                      <div className="savora-cal-strip-main">
                        <Flame size={22} className="savora-cal-icon" />
                        <strong>{formatMetric(result.calories)}</strong>
                        <span>kcal</span>
                      </div>
                    )}
                  </div>

                  {!isLowConfidence ? (
                    <>
                      {/* Section 3 — Macros */}
                      <div className="macro-row">
                        {macroCards.map(({ key, label, icon: Icon, accent, suffix }) => (
                          <div key={key} className="savora-inner-card savora-macro-item">
                            <div className="savora-macro-item-icon" style={{ color: accent, background: `${accent}18` }}>
                              <Icon size={14} />
                            </div>
                            <div className="savora-macro-item-data">
                              <span className="savora-macro-item-label">{label}</span>
                              <strong>{formatMetric(result[key], suffix)}</strong>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Section 4 — Charts */}
                      <div className="chart-row">
                        <div className="savora-inner-card savora-chart-compact">
                          <div className="savora-chart-head">Macro distribution</div>
                          <MacroPieChart protein={result.protein ?? 0} carbs={result.carbs ?? 0} fats={result.fat ?? 0} />
                        </div>
                        <div className="savora-inner-card savora-chart-compact">
                          <div className="savora-chart-head">Macro comparison</div>
                          <MacroBarChart protein={result.protein ?? 0} carbs={result.carbs ?? 0} fats={result.fat ?? 0} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="savora-inner-card savora-low-conf-block">
                      <div className="savora-unknown-card">
                        <div className="savora-unknown-icon">
                          <AlertCircle size={18} />
                        </div>
                        <div>
                          <h4>Food not confidently identified</h4>
                          <p>Try another angle or improve lighting for a more reliable result.</p>
                        </div>
                      </div>
                      <div className="savora-message savora-message-warn">
                        {result.message || 'Food not recognized. Try another image.'}
                      </div>
                      <p className="savora-low-conf-hint">
                        Model confidence is below {Math.round((result.confidence_threshold || 0.6) * 100)}% — nutrition data hidden.
                      </p>
                    </div>
                  )}

                  {/* Section 5 — Top predictions */}
                  <div className="savora-inner-card savora-predictions-section">
                    <span className="savora-section-label">{isLowConfidence ? 'Alternatives' : 'Top predictions'}</span>
                    <div className="result-predictions">
                      {(result.top_predictions || []).slice(0, 3).map((prediction, index) => (
                        <div key={`${prediction.name}-${index}`} className={`savora-pred-pill ${index === 0 && !isLowConfidence ? 'savora-pred-pill--top' : ''}`}>
                          {index === 0 && !isLowConfidence ? <Check size={13} /> : <AlertCircle size={13} />}
                          <span>{prediction.name}</span>
                          <strong>{Math.round((prediction.confidence || 0) * 100)}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 6 — Health note */}
                  <div className="savora-inner-card result-note">
                    {errorMessage && (
                      <p className={`savora-health-msg ${isLowConfidence ? 'savora-health-msg--warn' : 'savora-health-msg--error'}`}>
                        {errorMessage}
                      </p>
                    )}
                    
                    {confidencePercent >= 70 && result.health_tip ? (
                      <p className="savora-health-tip">
                        <Sparkles size={14} />
                        {result.health_tip}
                      </p>
                    ) : (
                      <p className="savora-health-tip savora-health-tip-muted">
                        <Info size={14} />
                        Displaying standard nutritional macro estimations. Verify with exact ingredients if accuracy is critical.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="savora-empty-inline">
                  <p>Use the upload panel to start a scan.</p>
                </div>
              )}
            </div>
          )}
          </motion.section>
      </div>
    </div>
  );
}
