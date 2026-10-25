import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import api from './api/axiosConfig';
import { clearStoredAuth, getStoredAuth, saveStoredAuth } from './api/authStorage';
import './App.css';

const COLORS = ['#79e2b0', '#7aa7ff', '#f6b86b', '#ef87a7', '#b393ff', '#70d7e5', '#c49b84'];
const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'];
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

function formatMoney(value) {
  return currency.format(Number.isFinite(value) ? value : 0);
}

function formatCompactMoney(value) {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}k`;
  }
  return `₹${Math.round(value)}`;
}

function getErrorMessage(error, fallback) {
  const response = error?.response?.data;
  if (response?.fieldErrors && typeof response.fieldErrors === 'object') {
    return Object.values(response.fieldErrors).join(' ');
  }
  if (response?.message) {
    return response.message;
  }
  if (error?.code === 'ERR_NETWORK' || (error?.request && !error?.response)) {
    return 'Unable to reach the API. Check that the backend is running and try again.';
  }
  return error?.message || fallback;
}

function getDateForExpense(expense) {
  const value = expense?.expenseDate || expense?.date;
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date, short = false) {
  return new Intl.DateTimeFormat('en-IN', {
    month: short ? 'short' : 'long',
    year: 'numeric',
  }).format(date);
}

function AuthScreen({ onAuthenticated, notice }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isRegistering = mode === 'register';

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError('Enter your email and password to continue.');
      return;
    }

    if (isRegistering && password.length < 8) {
      setError('Your password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await api.post(`/auth/${isRegistering ? 'register' : 'login'}`, {
        email: normalizedEmail,
        password,
      });
      const auth = response.data;

      if (!auth?.token) {
        throw new Error('The server did not return a session token.');
      }

      saveStoredAuth(auth);
      onAuthenticated(auth);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to sign in right now. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setPassword('');
  };

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="brand-mark">₹</div>
        <p className="eyebrow">AI expense tracker</p>
        <h1>Clarity for every rupee.</h1>
        <p className="auth-copy">
          Capture spending in seconds, understand your habits, and make your next money move with confidence.
        </p>
        <div className="auth-highlights">
          <span>◈ AI categorization</span>
          <span>◷ Monthly insights</span>
          <span>↗ Private by account</span>
        </div>
      </section>

      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-card-header">
          <p className="eyebrow">Welcome back</p>
          <h2 id="auth-title">{isRegistering ? 'Create your account' : 'Sign in to your dashboard'}</h2>
          <p>{isRegistering ? 'Start building a clearer view of your spending.' : 'Your spending snapshot is waiting for you.'}</p>
        </div>

        {notice && <div className="notice-box">{notice}</div>}
        {error && <div className="form-error" role="alert">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="auth-email">Email address</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <div className="label-row">
            <label htmlFor="auth-password">Password</label>
            {isRegistering && <span>8+ characters</span>}
          </div>
          <input
            id="auth-password"
            type="password"
            autoComplete={isRegistering ? 'new-password' : 'current-password'}
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={isRegistering ? 8 : undefined}
            required
          />

          <button className="primary-button auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Connecting…' : isRegistering ? 'Create account' : 'Sign in'}
            {!submitting && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <p className="auth-switch">
          {isRegistering ? 'Already have an account?' : 'New to Expense Tracker?'}{' '}
          <button type="button" onClick={() => changeMode(isRegistering ? 'login' : 'register')}>
            {isRegistering ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </section>
    </main>
  );
}

function App() {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [expenses, setExpenses] = useState([]);
  const [archives, setArchives] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(() => Boolean(getStoredAuth()?.token));
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const recognitionRef = useRef(null);

  const fetchExpenses = useCallback(async () => {
    const response = await api.get('/expenses');
    setExpenses(Array.isArray(response.data) ? response.data : []);
  }, []);

  const fetchArchives = useCallback(async () => {
    const response = await api.get('/expenses/archives');
    setArchives(Array.isArray(response.data) ? response.data : []);
  }, []);

  useEffect(() => {
    const handleAuthLogout = () => {
      setAuth(null);
      setExpenses([]);
      setArchives([]);
      setSuggestion('');
      setLoadingData(false);
      setError('Your session expired. Please sign in again.');
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, []);

  useEffect(() => {
    if (!auth?.token) {
      return undefined;
    }

    let active = true;
    const loadData = () => {
      Promise.all([fetchExpenses(), fetchArchives()])
        .catch((requestError) => {
          if (active && requestError.response?.status !== 401) {
            setError(getErrorMessage(requestError, 'Could not load your expenses. Please refresh and try again.'));
          }
        })
        .finally(() => {
          if (active) {
            setLoadingData(false);
          }
        });
    };
    const loadTimer = window.setTimeout(loadData, 0);

    return () => {
      active = false;
      window.clearTimeout(loadTimer);
    };
  }, [auth, fetchArchives, fetchExpenses]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.onresult = (event) => setDescription(event.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const metrics = useMemo(() => {
    const now = new Date();
    const currentKey = monthKey(now);
    const categoryTotals = {};
    const monthlyTotals = {};
    let totalSpent = 0;
    let currentMonthTotal = 0;

    expenses.forEach((expense) => {
      const value = Number.parseFloat(expense.amount);
      if (!Number.isFinite(value)) {
        return;
      }

      const category = expense.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + value;
      totalSpent += value;

      const date = getDateForExpense(expense);
      if (date) {
        const key = monthKey(date);
        monthlyTotals[key] = (monthlyTotals[key] || 0) + value;
        if (key === currentKey) {
          currentMonthTotal += value;
        }
      }
    });

    const chartData = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const topCategory = chartData[0];
    const monthlyData = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: monthKey(date),
        label: monthLabel(date, true),
        value: monthlyTotals[monthKey(date)] || 0,
      };
    });

    return {
      chartData,
      currentMonthTotal,
      monthlyData,
      topCategory,
      totalSpent,
      averageTransaction: expenses.length ? totalSpent / expenses.length : 0,
    };
  }, [expenses]);

  const handleAuthenticated = (nextAuth) => {
    setLoadingData(true);
    setAuth(nextAuth);
    setError(null);
  };

  const handleLogout = () => {
    clearStoredAuth();
    setAuth(null);
    setExpenses([]);
    setArchives([]);
    setSuggestion('');
    setLoadingData(false);
  };

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      window.alert('Voice input is not supported in this browser. Try Chrome.');
      return;
    }

    setIsListening(true);
    try {
      recognitionRef.current.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a description and a positive amount.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.post('/expenses', { description: description.trim(), amount: numericAmount });
      setDescription('');
      setAmount('');
      await fetchExpenses();
    } catch (requestError) {
      if (requestError.response?.status !== 401) {
        setError(getErrorMessage(requestError, 'Failed to add expense. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/expenses/${id}`);
      await fetchExpenses();
    } catch (requestError) {
      if (requestError.response?.status !== 401) {
        setError(getErrorMessage(requestError, 'Failed to delete that expense.'));
      }
    }
  };

  const handleDeleteArchive = async (id) => {
    if (!window.confirm('Delete this monthly record permanently?')) {
      return;
    }

    try {
      await api.delete(`/expenses/archives/${id}`);
      await fetchArchives();
    } catch (requestError) {
      if (requestError.response?.status !== 401) {
        setError(getErrorMessage(requestError, 'Failed to delete the monthly record.'));
      }
    }
  };

  const handleScreenshotUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    if (!SUPPORTED_IMAGE_TYPES.has(file.type) || file.size > MAX_SCREENSHOT_BYTES) {
      setError('Choose a PNG, JPEG, or WebP image no larger than 5 MB.');
      event.target.value = null;
      return;
    }

    setUploadingScreenshot(true);
    setError(null);
    const formData = new FormData();
    formData.append('image', file);

    try {
      // Axios/browser adds the multipart boundary automatically for FormData.
      await api.post('/expenses/from-screenshot', formData);
      await fetchExpenses();
    } catch (requestError) {
      if (requestError.response?.status !== 401) {
        setError(getErrorMessage(requestError, 'Failed to read the screenshot. Try again or add it manually.'));
      }
    } finally {
      setUploadingScreenshot(false);
      event.target.value = null;
    }
  };

  const handleCategoryChange = async (id, newCategory) => {
    try {
      await api.put(`/expenses/${id}/category`, { category: newCategory });
      setEditingCategoryId(null);
      await fetchExpenses();
    } catch (requestError) {
      if (requestError.response?.status !== 401) {
        setError(getErrorMessage(requestError, 'Failed to update the category.'));
      }
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('This will delete ALL expenses and archive this month. Continue?')) {
      return;
    }

    try {
      await api.delete('/expenses');
      await Promise.all([fetchExpenses(), fetchArchives()]);
      setSuggestion('');
    } catch (requestError) {
      if (requestError.response?.status !== 401) {
        setError(getErrorMessage(requestError, 'Failed to clear expenses.'));
      }
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/expenses/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      if (requestError.response?.status !== 401) {
        setError(getErrorMessage(requestError, 'Failed to export your expenses.'));
      }
    } finally {
      setExporting(false);
    }
  };

  const handleGetSuggestion = async () => {
    setLoadingSuggestion(true);
    try {
      const response = await api.get('/expenses/insights');
      setSuggestion(response.data.suggestion);
    } catch (requestError) {
      if (requestError.response?.status !== 401) {
        setError(getErrorMessage(requestError, 'Could not generate an insight right now.'));
      }
    } finally {
      setLoadingSuggestion(false);
    }
  };

  if (!auth?.token) {
    return <AuthScreen onAuthenticated={handleAuthenticated} notice={error} />;
  }

  const recentExpenses = [...expenses].reverse();
  const maxMonthlyValue = Math.max(...metrics.monthlyData.map((item) => item.value), 1);
  const userEmail = auth.user?.email || 'Your account';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark small">₹</div>
          <div>
            <strong>Expense<span>AI</span></strong>
            <small>Personal finance, simplified</small>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="account-email" title={userEmail}>{userEmail}</span>
          <button className="ghost-button" type="button" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="app-container">
        <section className="dashboard-heading">
          <div>
            <p className="eyebrow">Your overview</p>
            <h1>Make every expense count.</h1>
            <p className="page-subtitle">A calm, clear view of where your money is going.</p>
          </div>
          <div className="data-status">{loadingData ? 'Syncing your data…' : '● Data is up to date'}</div>
        </section>

        {error && <div className="app-error" role="alert">{error}<button type="button" onClick={() => setError(null)}>×</button></div>}

        <section className="metric-grid" aria-label="Spending summary">
          <article className="metric-card metric-featured">
            <div className="metric-icon">₹</div>
            <div>
              <p>Total spent</p>
              <strong>{formatMoney(metrics.totalSpent)}</strong>
              <span>Across {expenses.length} {expenses.length === 1 ? 'transaction' : 'transactions'}</span>
            </div>
          </article>
          <article className="metric-card">
            <div className="metric-icon blue">◷</div>
            <div>
              <p>This month</p>
              <strong>{formatMoney(metrics.currentMonthTotal)}</strong>
              <span>{monthLabel(new Date())}</span>
            </div>
          </article>
          <article className="metric-card">
            <div className="metric-icon orange">↗</div>
            <div>
              <p>Average transaction</p>
              <strong>{formatMoney(metrics.averageTransaction)}</strong>
              <span>Per expense</span>
            </div>
          </article>
          <article className="metric-card">
            <div className="metric-icon purple">✦</div>
            <div>
              <p>Top category</p>
              <strong>{metrics.topCategory?.name || '—'}</strong>
              <span>{metrics.topCategory ? formatMoney(metrics.topCategory.value) : 'Add an expense to begin'}</span>
            </div>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="panel monthly-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Spending trend</p>
                <h2>Monthly activity</h2>
              </div>
              <span className="panel-caption">Last 6 months</span>
            </div>
            {expenses.length === 0 ? (
              <p className="empty-text">Your monthly trend will appear here after your first expense.</p>
            ) : (
              <div className="monthly-bars" aria-label="Monthly spending totals">
                {metrics.monthlyData.map((item) => (
                  <div className="month-column" key={item.key}>
                    <div className="bar-track">
                      <div
                        className={`month-bar ${item.key === monthKey(new Date()) ? 'current' : ''}`}
                        style={{ height: `${item.value ? Math.max((item.value / maxMonthlyValue) * 100, 8) : 3}%` }}
                        title={`${item.label}: ${formatMoney(item.value)}`}
                      >
                        {item.value > 0 && <span>{formatCompactMoney(item.value)}</span>}
                      </div>
                    </div>
                    <small>{item.label}</small>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="panel category-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Where it goes</p>
                <h2>Category mix</h2>
              </div>
              <span className="panel-caption">All time</span>
            </div>
            {metrics.chartData.length === 0 ? (
              <p className="empty-text">No categories yet. Add an expense to see your mix.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={metrics.chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={3}>
                    {metrics.chartData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </article>
        </section>

        <section className="entry-panel panel">
          <div className="panel-heading entry-heading">
            <div>
              <p className="eyebrow">Quick capture</p>
              <h2>Add an expense</h2>
            </div>
            <span className="panel-caption">Type, speak, or upload a receipt</span>
          </div>
          <form onSubmit={handleSubmit} className="expense-form">
            <div className="input-with-mic">
              <input type="text" placeholder="What did you spend on?" value={description} onChange={(event) => setDescription(event.target.value)} />
              <button type="button" className={`mic-btn ${isListening ? 'listening' : ''}`} onClick={handleMicClick} title="Speak your expense" aria-label="Speak your expense">
                {isListening ? '🔴' : '🎤'}
              </button>
            </div>
            <input type="number" placeholder="Amount (₹)" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <button type="submit" className="primary-button add-btn" disabled={submitting}>{submitting ? 'Categorizing…' : 'Add expense'}</button>
            <label className="upload-btn">
              {uploadingScreenshot ? '📤 Reading…' : '📸 Receipt'}
               <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleScreenshotUpload} disabled={uploadingScreenshot} />
            </label>
          </form>
          {isListening && <p className="listening-text">🎙️ Listening… speak now</p>}
        </section>

        <section className="insight-row">
          <div className="insight-copy">
            <span className="insight-icon">✦</span>
            <div><p className="eyebrow">Smart coaching</p><h2>Find your next saving opportunity</h2></div>
          </div>
          <button className="insight-button" type="button" onClick={handleGetSuggestion} disabled={loadingSuggestion || expenses.length === 0}>
            {loadingSuggestion ? 'Analyzing…' : 'Get an insight →'}
          </button>
          {suggestion && <p className="suggestion-card">{suggestion}</p>}
        </section>

        <section className="content-section">
          <article className="panel list-box">
            <div className="panel-heading">
              <div><p className="eyebrow">Your activity</p><h2>Recent expenses</h2></div>
              <span className="panel-caption">{expenses.length} total</span>
            </div>
            {recentExpenses.length === 0 ? <p className="empty-text">No expenses yet. Your latest activity will show up here.</p> : (
              <ul className="expense-list">
                {recentExpenses.map((expense) => (
                  <li key={expense.id} className="expense-item">
                    <div className="exp-left">
                      <span className="exp-desc">{expense.description}</span>
                      <div className="expense-meta">
                        <span className={`exp-category cat-${(expense.category || 'other').toLowerCase()}`} onClick={() => setEditingCategoryId(expense.id)} title="Click to change category">{expense.category || 'Other'} · edit</span>
                        {getDateForExpense(expense) && <time dateTime={expense.expenseDate}>{getDateForExpense(expense).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</time>}
                      </div>
                      {editingCategoryId === expense.id && <select className="category-select" value={expense.category || 'Other'} onChange={(event) => handleCategoryChange(expense.id, event.target.value)} onBlur={() => setEditingCategoryId(null)} autoFocus>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select>}
                    </div>
                    <div className="exp-right"><span className="exp-amount">{formatMoney(Number(expense.amount))}</span><button className="delete-btn" type="button" onClick={() => handleDelete(expense.id)} title="Delete expense">×</button></div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="panel archive-box">
            <div className="panel-heading"><div><p className="eyebrow">Saved snapshots</p><h2>Monthly history</h2></div><span className="panel-caption">{archives.length} archived</span></div>
            {archives.length === 0 ? <p className="empty-text">When you clear a month, its snapshot will be saved here.</p> : (
              <div className="archive-cards">
                {[...archives].reverse().map((archive, index, visibleArchives) => {
                  const previous = visibleArchives[index + 1];
                  const diff = previous?.totalAmount ? (((archive.totalAmount - previous.totalAmount) / previous.totalAmount) * 100).toFixed(1) : null;
                  return <div key={archive.id} className="archive-card"><button className="archive-delete-btn" type="button" onClick={() => handleDeleteArchive(archive.id)} title="Delete this record">×</button><h3>{archive.monthLabel}</h3><p className="archive-total">{formatMoney(Number(archive.totalAmount))}</p>{diff !== null && <p className={`archive-diff ${Number(diff) > 0 ? 'up' : 'down'}`}>{Number(diff) > 0 ? '↑' : '↓'} {Math.abs(diff)}% vs previous</p>}</div>;
                })}
              </div>
            )}
            <button className="clear-btn" type="button" onClick={handleClearAll} disabled={expenses.length === 0}>Archive & clear current month</button>
          </article>
        </section>

        <div className="footer-actions"><span>Your data is scoped to your account.</span><button className="export-btn" type="button" onClick={handleExport} disabled={exporting || expenses.length === 0}>{exporting ? 'Preparing export…' : '↓ Export Excel'}</button></div>
      </main>
    </div>
  );
}

export default App;
