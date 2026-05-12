import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { createBudget, getBudgets, addExpense, deleteExpense, deleteBudget } from '../api/api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import './BudgetPage.css';

const CATEGORIES = [
  'accommodation', 'food', 'transport', 'activities', 'shopping', 
  'health', 'flights', 'visa', 'education', 'entertainment', 
  'gadgets', 'investment', 'other'
];
const CAT_ICONS = {
  accommodation: '🏨',
  food: '🍜',
  transport: '🚌',
  activities: '🎯',
  shopping: '🛍️',
  health: '💊',
  flights: '✈️',
  visa: '🛂',
  education: '🎓',
  entertainment: '🎮',
  gadgets: '💻',
  investment: '📈',
  other: '📦'
};
const CAT_COLORS = {
  accommodation: '#6366f1', food: '#10b981', transport: '#06b6d4',
  activities: '#f59e0b', shopping: '#8b5cf6', health: '#ef4444', other: '#64748b'
};

// Custom label for the pie chart showing percentage
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.05) return null; // Hide label if slice is too small
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'MYR', 'JPY', 'AUD', 'CAD', 'SGD', 'THB', 'KRW'];

export default function BudgetPage() {
  const [budgets, setBudgets] = useState([]);
  const [activeBudget, setActiveBudget] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [newBudget, setNewBudget] = useState({ tripName: '', totalBudget: '', currency: 'MYR' });
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'food', date: '' });

  useEffect(() => { fetchBudgets(); }, []);

  const fetchBudgets = async () => {
    try {
      const { data } = await getBudgets();
      setBudgets(data);
      if (data.length > 0 && !activeBudget) setActiveBudget(data[0]);
    } catch { /* silent */ }
  };

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await createBudget(newBudget);
      setBudgets(prev => [data.budget, ...prev]);
      setActiveBudget(data.budget);
      setNewBudget({ tripName: '', totalBudget: '', currency: 'USD' });
      setShowCreateForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create budget');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!activeBudget) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await addExpense(activeBudget._id, newExpense);
      const updated = data.budget;
      setBudgets(prev => prev.map(b => b._id === updated._id ? updated : b));
      setActiveBudget(updated);
      setNewExpense({ description: '', amount: '', category: 'food', date: '' });
      setShowExpenseForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!activeBudget) return;
    try {
      const { data } = await deleteExpense(activeBudget._id, expenseId);
      const updated = data.budget;
      setBudgets(prev => prev.map(b => b._id === updated._id ? updated : b));
      setActiveBudget(updated);
    } catch { /* silent */ }
  };

  const handleDeleteBudget = async (id) => {
    if (!confirm('Delete this budget and all its expenses?')) return;
    try {
      await deleteBudget(id);
      const remaining = budgets.filter(b => b._id !== id);
      setBudgets(remaining);
      setActiveBudget(remaining[0] || null);
    } catch { /* silent */ }
  };

  const totalSpent = activeBudget?.expenses?.reduce((s, e) => s + e.amount, 0) || 0;
  const totalBudget = activeBudget?.totalBudget || 0;
  const remaining = totalBudget - totalSpent;
  const pct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const isOverBudget = totalSpent > totalBudget;

  const catTotals = CATEGORIES.map(cat => ({
    cat,
    total: activeBudget?.expenses?.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0) || 0
  })).filter(c => c.total > 0);

  return (
    <div className="page-container">
      <Navbar />
      <div className="content-wrapper fade-in">

        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 className="page-title"> Budget Tracker</h1>
            <p className="page-subtitle">Track every penny of your travel spending</p>
          </div>
          <button id="create-budget-btn" className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? '✕ Cancel' : '+ New Budget'}
          </button>
        </div>

        {error && <div className="alert alert-error"><span>⚠️</span>{error}</div>}

        {/* Create Budget Form */}
        {showCreateForm && (
          <div className="glass-card fade-in" style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>🆕 Create New Budget</h3>
            <form onSubmit={handleCreateBudget} id="create-budget-form">
              <div className="grid-3" style={{ gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Trip Name</label>
                  <input
                    id="budget-trip-name"
                    className="form-input"
                    placeholder="e.g. Tokyo Adventure"
                    value={newBudget.tripName}
                    onChange={e => setNewBudget({ ...newBudget, tripName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Total Budget</label>
                  <input
                    id="budget-total"
                    type="number" min="0"
                    className="form-input"
                    placeholder="e.g. 3000"
                    value={newBudget.totalBudget}
                    onChange={e => setNewBudget({ ...newBudget, totalBudget: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Currency</label>
                  <select
                    id="budget-currency"
                    className="form-select"
                    value={newBudget.currency}
                    onChange={e => setNewBudget({ ...newBudget, currency: e.target.value })}
                  >
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button
                id="create-budget-submit"
                type="submit"
                className="btn btn-success"
                style={{ marginTop: 16 }}
                disabled={loading}
              >
                {loading ? <><span className="spinner spinner-sm" /> Creating...</> : ' Create Budget'}
              </button>
            </form>
          </div>
        )}

        {budgets.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="empty-icon">💰</div>
            <h3>No budgets yet</h3>
            <p>Create your first trip budget to start tracking expenses</p>
          </div>
        ) : (
          <div className="budget-layout">
            {/* Budget List Sidebar */}
            <div className="budget-sidebar">
              {budgets.map(b => {
                const spent = b.expenses?.reduce((s, e) => s + e.amount, 0) || 0;
                const p = b.totalBudget > 0 ? Math.min((spent / b.totalBudget) * 100, 100) : 0;
                return (
                  <div
                    key={b._id}
                    className={`budget-list-item glass-card ${activeBudget?._id === b._id ? 'active' : ''}`}
                    onClick={() => setActiveBudget(b)}
                  >
                    <div className="bli-header">
                      <span className="bli-name">✈️ {b.tripName}</span>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleDeleteBudget(b._id); }}
                        title="Delete budget"
                      >🗑️</button>
                    </div>
                    <div className="bli-amounts">
                      <span className="bli-spent">{b.currency} {spent.toFixed(2)}</span>
                      <span className="bli-total">/ {b.totalBudget.toLocaleString()}</span>
                    </div>
                    <div className="progress-container" style={{ marginTop: 8 }}>
                      <div
                        className={`progress-bar ${p > 90 ? 'warning' : 'safe'}`}
                        style={{ width: `${p}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Budget Detail */}
            {activeBudget && (
              <div className="budget-detail">
                {/* Summary Card */}
                <div className="glass-card budget-summary">
                  <div className="bs-header">
                    <h2 className="bs-title">✈️ {activeBudget.tripName}</h2>
                    <span className="badge badge-primary">{activeBudget.currency}</span>
                  </div>

                  <div className="bs-amounts">
                    <div className="bs-amount-item">
                      <div className="bs-amount-label">Total Budget</div>
                      <div className="bs-amount-value">{activeBudget.currency} {activeBudget.totalBudget?.toLocaleString()}</div>
                    </div>
                    <div className="bs-amount-item">
                      <div className="bs-amount-label">Spent</div>
                      <div className="bs-amount-value spent">{activeBudget.currency} {totalSpent.toFixed(2)}</div>
                    </div>
                    <div className="bs-amount-item">
                      <div className="bs-amount-label">Remaining</div>
                      <div className={`bs-amount-value ${isOverBudget ? 'over' : 'remaining'}`}>
                        {isOverBudget ? '-' : ''}{activeBudget.currency} {Math.abs(remaining).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span>Budget used</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="progress-container" style={{ height: 14 }}>
                      <div className={`progress-bar ${pct > 90 ? 'warning' : 'safe'}`} style={{ width: `${pct}%` }} />
                    </div>
                    {isOverBudget && (
                      <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginTop: 8 }}>
                        ⚠️ You've exceeded your budget!
                      </p>
                    )}
                  </div>
                </div>

                {/* Category Breakdown */}
                {catTotals.length > 0 && (
                  <div className="glass-card" style={{ padding: 28, display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center' }}>
                    {/* Bar breakdown */}
                    <div style={{ flex: '1 1 260px' }}>
                      <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 20, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        📊 Spending Breakdown
                      </h3>
                      <div className="cat-breakdown">
                        {catTotals.map(({ cat, total }) => {
                          const pct = totalSpent > 0 ? ((total / totalSpent) * 100).toFixed(1) : 0;
                          return (
                            <div key={cat} className="cat-row">
                              <div className="cat-label">
                                <span className="cat-icon" style={{ background: `${CAT_COLORS[cat]}22`, color: CAT_COLORS[cat] }}>
                                  {CAT_ICONS[cat]}
                                </span>
                                <span className="cat-name" style={{ textTransform: 'capitalize' }}>{cat}</span>
                              </div>
                              <div className="cat-bar-wrap">
                                <div className="progress-container" style={{ flex: 1 }}>
                                  <div
                                    className="progress-bar"
                                    style={{
                                      width: `${pct}%`,
                                      background: CAT_COLORS[cat]
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: CAT_COLORS[cat], minWidth: 38, textAlign: 'right' }}>{pct}%</span>
                                <span className="cat-amount">{activeBudget.currency} {total.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Donut Chart with center label */}
                    <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }} className="fade-in">
                      <div style={{ position: 'relative', width: '100%', height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={catTotals}
                              dataKey="total"
                              nameKey="cat"
                              cx="50%"
                              cy="50%"
                              innerRadius={80}
                              outerRadius={115}
                              paddingAngle={4}
                              stroke="none"
                              labelLine={false}
                              label={renderCustomLabel}
                            >
                              {catTotals.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CAT_COLORS[entry.cat]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value, name) => [`${activeBudget.currency} ${Number(value).toFixed(2)} (${totalSpent > 0 ? ((value/totalSpent)*100).toFixed(1) : 0}%)`, name]}
                              contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '0.85rem', padding: '10px 14px' }}
                              itemStyle={{ textTransform: 'capitalize', color: '#f1f5f9' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Center label */}
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                            {activeBudget.currency} {totalSpent.toFixed(0)}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            Total Spent
                          </div>
                        </div>
                      </div>

                      {/* Color Legend */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', justifyContent: 'center' }}>
                        {catTotals.map(({ cat }) => (
                          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: CAT_COLORS[cat], flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{cat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Add Expense */}
                <div className="glass-card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>🧾 Expenses</h3>
                    <button
                      id="add-expense-btn"
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowExpenseForm(!showExpenseForm)}
                    >
                      {showExpenseForm ? '✕ Cancel' : '+ Add Expense'}
                    </button>
                  </div>

                  {showExpenseForm && (
                    <form onSubmit={handleAddExpense} id="add-expense-form" className="expense-form fade-in">
                      <div className="grid-2" style={{ gap: 12 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Description</label>
                          <input
                            id="expense-desc"
                            className="form-input"
                            placeholder="e.g. Hotel night"
                            value={newExpense.description}
                            onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Amount</label>
                          <input
                            id="expense-amount"
                            type="number" min="0" step="0.01"
                            className="form-input"
                            placeholder="0.00"
                            value={newExpense.amount}
                            onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Category</label>
                          <select
                            id="expense-category"
                            className="form-select"
                            value={newExpense.category}
                            onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                          >
                            {CATEGORIES.map(c => (
                              <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Date</label>
                          <input
                            id="expense-date"
                            type="date"
                            className="form-input"
                            value={newExpense.date}
                            onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                          />
                        </div>
                      </div>
                      <button
                        id="add-expense-submit"
                        type="submit"
                        className="btn btn-success"
                        style={{ marginTop: 12 }}
                        disabled={loading}
                      >
                        {loading ? <><span className="spinner spinner-sm" /> Adding...</> : '✅ Add Expense'}
                      </button>
                    </form>
                  )}

                  {/* Expense List */}
                  {activeBudget.expenses?.length === 0 ? (
                    <div className="empty-state" style={{ padding: '30px 0' }}>
                      <div className="empty-icon" style={{ fontSize: '2rem' }}>🧾</div>
                      <p>No expenses yet. Add your first one!</p>
                    </div>
                  ) : (
                    <div className="expense-list">
                      {[...activeBudget.expenses].reverse().map(exp => (
                        <div key={exp._id} className="expense-item">
                          <div
                            className="exp-cat-icon"
                            style={{ background: `${CAT_COLORS[exp.category]}22`, color: CAT_COLORS[exp.category] }}
                          >
                            {CAT_ICONS[exp.category]}
                          </div>
                          <div className="exp-info">
                            <div className="exp-desc">{exp.description}</div>
                            <div className="exp-meta">
                              <span className="badge badge-primary" style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>
                                {exp.category}
                              </span>
                              {exp.date && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                  {new Date(exp.date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="exp-amount">
                            {activeBudget.currency} {Number(exp.amount).toFixed(2)}
                          </div>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteExpense(exp._id)}
                            title="Remove expense"
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
