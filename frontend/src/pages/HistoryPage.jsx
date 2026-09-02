import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { AlertCircle, CalendarDays, Flame, Search, Trash2, Weight } from 'lucide-react';
import { safeFetch, SERVER_ISSUE_MESSAGE } from '../utils/safeFetch';

const API_BASE = '/api';

function formatCalories(value) {
  return typeof value === 'number' && !Number.isNaN(value) ? `${value.toFixed(0)} kcal` : '--';
}

function formatWeight(value) {
  return typeof value === 'number' && !Number.isNaN(value) ? `${value.toFixed(0)}g` : '--';
}

function matchesSearch(prediction, query) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const fields = [
    prediction.food_name,
    prediction.message,
    ...(prediction.top_predictions || []).map((item) => item.name),
  ];

  return fields.some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
}

export default function HistoryPage() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const payload = await safeFetch(`${API_BASE}/history`);
    if (!payload.success) {
      setPredictions([]);
      toast.error(SERVER_ISSUE_MESSAGE);
      setLoading(false);
      return;
    }

    setPredictions(payload.data?.predictions || []);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    const payload = await safeFetch(`${API_BASE}/history/${id}`, { method: 'DELETE' });
    if (!payload.success) {
      toast.error(SERVER_ISSUE_MESSAGE);
      return;
    }

    setPredictions((current) => current.filter((item) => item.id !== id));
    toast.success('Scan removed.');
  };

  const filteredPredictions = useMemo(
    () => predictions.filter((prediction) => matchesSearch(prediction, searchQuery)),
    [predictions, searchQuery]
  );

  return (
    <div className="page-wrapper savora-history">
      <div className="glow-orb savora-glow savora-glow-right" />
      <div className="glow-orb savora-glow savora-glow-left" />

      <div className="container-main relative z-10 pt-28 pb-16">
        <div className="savora-history-head">
          <div>
            <span className="savora-kicker">Scan history</span>
            <h1>Previous nutrition scans</h1>
            <p>Every analyzed image is stored with its weight and calorie estimate.</p>
          </div>

          <label className="savora-search">
            <Search size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search food"
            />
          </label>
        </div>

        {loading ? (
          <div className="savora-history-grid">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="glass-card savora-history-card animate-pulse">
                <div className="savora-history-image-placeholder" />
                <div className="savora-history-lines">
                  <div className="savora-line savora-line-lg" />
                  <div className="savora-line" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPredictions.length === 0 ? (
          <div className="glass-card savora-empty-state">
            <div className="savora-empty-icon">
              <Flame size={28} />
            </div>
            <h3>No scans yet</h3>
            <p>Your analyzed meals will appear here.</p>
          </div>
        ) : (
          <div className="savora-history-grid">
            {filteredPredictions.map((prediction, index) => {
              const isLowConfidence = Boolean(prediction.message);
              const foodName = String(prediction.food_name || '').trim();
              const isUnknownFood = !foodName || foodName.toLowerCase() === 'unknown';
              return (
              <motion.article
                key={prediction.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                className="glass-card savora-history-card"
              >
                <div className="savora-history-image">
                  {prediction.image_filename ? (
                    <img src={`${API_BASE}/uploads/${prediction.image_filename}`} alt={prediction.food_name} />
                  ) : (
                    <div className="savora-history-image-placeholder" />
                  )}
                  <button type="button" className="savora-delete" onClick={() => handleDelete(prediction.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="savora-history-body">
                  <div className="savora-history-title-row">
                    <h2 className="savora-history-title">{foodName || 'Unknown food'}</h2>
                    <span className={`savora-history-confidence ${isLowConfidence ? 'savora-history-confidence-low' : ''}`}>
                      {Math.round((prediction.confidence || 0) * 100)}%
                    </span>
                  </div>

                  <div className="savora-history-status-slot">
                    {isUnknownFood ? (
                      <div className="savora-history-unknown">
                        <AlertCircle size={14} />
                        <span>Unable to identify this meal confidently.</span>
                      </div>
                    ) : (
                      <div className="savora-history-unknown savora-history-unknown-placeholder" aria-hidden="true">
                        <AlertCircle size={14} />
                        <span>Placeholder</span>
                      </div>
                    )}
                  </div>

                  <div className="savora-history-stats">
                    <div className="savora-history-stat">
                      <Flame size={15} />
                      <span>{isLowConfidence ? 'Nutrition hidden' : formatCalories(prediction.calories)}</span>
                    </div>
                    <div className="savora-history-stat">
                      <Weight size={15} />
                      <span>{formatWeight(prediction.weight)}</span>
                    </div>
                  </div>

                  {isLowConfidence && (
                    <div className="savora-feedback-stack savora-feedback-stack-fixed">
                      <div className="savora-message savora-message-warn">{prediction.message}</div>
                      <div className="savora-alt-block">
                        <div className="savora-alt-head">Alternative predictions</div>
                        <div className="savora-alt-row">
                          {(prediction.top_predictions || []).slice(0, 3).map((item, altIndex) => (
                            <div key={`${prediction.id}-${item.name}-${altIndex}`} className="savora-pill">
                              <AlertCircle size={14} />
                              <span>{item.name}</span>
                              <strong>{Math.round((item.confidence || 0) * 100)}%</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="savora-history-date">
                    <CalendarDays size={14} />
                    <span>
                      {new Date(prediction.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
