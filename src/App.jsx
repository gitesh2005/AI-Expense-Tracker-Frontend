import { useState, useEffect, useRef } from 'react';

import api from './api/axiosConfig';
import './App.css';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#795548'];

const CATEGORIES = [
  'Food',
  'Travel',
  'Shopping',
  'Bills',
  'Entertainment',
  'Health',
  'Other'
];

function App() {
  const [expenses, setExpenses] = useState([]);
  const [archives, setArchives] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const recognitionRef = useRef(null);

  useEffect(() => {
    fetchExpenses();
    fetchArchives();

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-IN';
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setDescription(transcript);
      };

      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  const fetchExpenses = () => {
    api.get('/expenses')
      .then((res) => setExpenses(res.data))
      .catch((err) => console.error('Failed to fetch expenses', err));
  };

  const fetchArchives = () => {
    api.get('/expenses/archives')
      .then((res) => setArchives(res.data))
      .catch((err) => console.error('Failed to fetch archives', err));
  };

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in this browser. Try Chrome.');
      return;
    }

    setIsListening(true);
    recognitionRef.current.start();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!description || !amount) return;

    setSubmitting(true);
    setError(null);

    api.post('/expenses', {
      description,
      amount: parseFloat(amount)
    })
      .then(() => {
        setDescription('');
        setAmount('');
        setSubmitting(false);
        fetchExpenses();
      })
      .catch((err) => {
        setError('Failed to add expense. Check backend.');
        setSubmitting(false);
        console.error(err);
      });
  };

  const handleDelete = (id) => {
    api.delete(`/expenses/${id}`)
      .then(() => fetchExpenses())
      .catch((err) => console.error('Failed to delete expense', err));
  };

  const handleScreenshotUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setUploadingScreenshot(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', file);

    api.post('/expenses/from-screenshot', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
      .then(() => {
        setUploadingScreenshot(false);
        fetchExpenses();
      })
      .catch((err) => {
        setError('Failed to read screenshot. Try again or add manually.');
        setUploadingScreenshot(false);
        console.error(err);
      });

    e.target.value = null;
  };

  const handleCategoryChange = (id, newCategory) => {
    api.put(`/expenses/${id}/category`, { category: newCategory })
      .then(() => {
        setEditingCategoryId(null);
        fetchExpenses();
      })
      .catch((err) => console.error('Failed to update category', err));
  };

  const handleClearAll = () => {
    if (
      !window.confirm(
        'This will delete ALL expenses. Use this at the start of a new month. Continue?'
      )
    ) {
      return;
    }

    api.delete('/expenses')
      .then(() => {
        fetchExpenses();
        fetchArchives();
        setSuggestion('');
      })
      .catch((err) => console.error('Failed to clear expenses', err));
  };

  const handleExport = () => {
    setExporting(true);

    api.get('/expenses/export', { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');

        link.href = url;
        link.setAttribute(
          'download',
          `expenses-${new Date().toISOString().split('T')[0]}.xlsx`
        );

        document.body.appendChild(link);
        link.click();
        link.remove();

        setExporting(false);
      })
      .catch((err) => {
        console.error('Failed to export', err);
        setExporting(false);
      });
  };

  const handleGetSuggestion = () => {
    setLoadingSuggestion(true);

    api.get('/expenses/insights')
      .then((res) => {
        setSuggestion(res.data.suggestion);
        setLoadingSuggestion(false);
      })
      .catch((err) => {
        console.error('Failed to get suggestion', err);
        setLoadingSuggestion(false);
      });
  };

  const categoryTotals = expenses.reduce((acc, exp) => {
    const cat = exp.category || 'Other';
    acc[cat] = (acc[cat] || 0) + parseFloat(exp.amount);
    return acc;
  }, {});

  const chartData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value
  }));

  const totalSpent = expenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount),
    0
  );

  return (
    <div className="app-container">
      <header className="header">
        <h1>💰 AI Expense Tracker</h1>
        <p className="subtitle">Just type or speak — AI sorts it out</p>
      </header>

      <div className="total-card">
        <div>
          <span className="total-label">Total Spent</span>
          <span className="total-value">₹{totalSpent.toFixed(2)}</span>
        </div>

        <div className="header-actions">
          <button
            className="export-btn"
            onClick={handleExport}
            disabled={exporting || expenses.length === 0}
          >
            {exporting ? 'Exporting...' : '📊 Export Excel'}
          </button>

          <button
            className="clear-btn"
            onClick={handleClearAll}
            disabled={expenses.length === 0}
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="expense-form">
        <div className="input-with-mic">
          <input
            type="text"
            placeholder="What did you spend on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <button
            type="button"
            className={`mic-btn ${isListening ? 'listening' : ''}`}
            onClick={handleMicClick}
            title="Speak your expense"
          >
            {isListening ? '🔴' : '🎤'}
          </button>
        </div>

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <button
          type="submit"
          className="add-btn"
          disabled={submitting}
        >
          {submitting ? 'Categorizing...' : 'Add Expense'}
        </button>

        <label className="upload-btn">
          {uploadingScreenshot ? '📤 Reading...' : '📸 Upload Screenshot'}

          <input
            type="file"
            accept="image/*"
            onChange={handleScreenshotUpload}
            disabled={uploadingScreenshot}
            style={{ display: 'none' }}
          />
        </label>
      </form>

      {error && <p className="error-text">{error}</p>}

      {isListening && (
        <p className="listening-text">
          🎙️ Listening... speak now
        </p>
      )}

      <div className="suggestion-section">
        <button
          className="suggestion-btn"
          onClick={handleGetSuggestion}
          disabled={loadingSuggestion || expenses.length === 0}
        >
          {loadingSuggestion
            ? 'Analyzing your spending...'
            : '💡 Where should I spend less?'}
        </button>

        {suggestion && (
          <div className="suggestion-card">
            <p>{suggestion}</p>
          </div>
        )}
      </div>

      <div className="content-section">
        <div className="chart-box">
          <h2>Spending by Category</h2>

          {chartData.length === 0 ? (
            <p className="empty-text">
              No expenses yet. Add one to see the breakdown.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart
                margin={{ top: 20, right: 40, bottom: 20, left: 40 }}
              >
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  label={({ percent }) =>
                    `${(percent * 100).toFixed(0)}%`
                  }
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip formatter={(value) => `₹${value}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="list-box">
          <h2>Recent Expenses</h2>

          <ul className="expense-list">
            {[...expenses].reverse().map((exp) => (
              <li key={exp.id} className="expense-item">
                <div className="exp-left">
                  <span className="exp-desc">
                    {exp.description}
                  </span>

                  {editingCategoryId === exp.id ? (
                    <select
                      className="category-select"
                      value={exp.category}
                      onChange={(e) =>
                        handleCategoryChange(exp.id, e.target.value)
                      }
                      onBlur={() => setEditingCategoryId(null)}
                      autoFocus
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`exp-category cat-${(
                        exp.category || 'other'
                      ).toLowerCase()}`}
                      onClick={() => setEditingCategoryId(exp.id)}
                      title="Click to change category"
                    >
                      {exp.category} ✎
                    </span>
                  )}
                </div>

                <div className="exp-right">
                  <span className="exp-amount">
                    ₹{exp.amount}
                  </span>

                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(exp.id)}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {archives.length > 0 && (
        <div className="archive-section">
          <h2>Monthly History</h2>

          <div className="archive-cards">
            {[...archives].reverse().map((arc, index) => {
              const prevArchive = archives[archives.length - index - 2];

              const diff = prevArchive
                ? (
                    ((arc.totalAmount - prevArchive.totalAmount) /
                      prevArchive.totalAmount) *
                    100
                  ).toFixed(1)
                : null;

              return (
                <div key={arc.id} className="archive-card">
                  <h3>{arc.monthLabel}</h3>

                  <p className="archive-total">
                    ₹{arc.totalAmount}
                  </p>

                  {diff !== null && (
                    <p
                      className={`archive-diff ${
                        diff > 0 ? 'up' : 'down'
                      }`}
                    >
                      {diff > 0 ? '↑' : '↓'} {Math.abs(diff)}% vs previous month
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;