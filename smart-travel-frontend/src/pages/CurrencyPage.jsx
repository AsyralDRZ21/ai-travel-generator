import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import './CurrencyPage.css';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'KRW', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'VND', name: 'Vietnamese Dong', flag: '🇻🇳' },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'MEX', name: 'Mexican Peso', flag: '🇲🇽' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'SEK', name: 'Swedish Krona', flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone', flag: '🇳🇴' },
  { code: 'DKK', name: 'Danish Krone', flag: '🇩🇰' },
  { code: 'PLN', name: 'Polish Zloty', flag: '🇵🇱' },
  { code: 'CZK', name: 'Czech Koruna', flag: '🇨🇿' },
  { code: 'HUF', name: 'Hungarian Forint', flag: '🇭🇺' },
];

const POPULAR_PAIRS = [
  { from: 'USD', to: 'MYR' }, { from: 'USD', to: 'JPY' },
  { from: 'EUR', to: 'USD' }, { from: 'GBP', to: 'USD' },
  { from: 'USD', to: 'THB' }, { from: 'USD', to: 'SGD' },
];

export default function CurrencyPage() {
  const [amount, setAmount] = useState('100');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('MYR');
  const [rate, setRate] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [popularRates, setPopularRates] = useState({});

  // Auto-convert on mount and when from/to changes
  useEffect(() => {
    if (from && to) fetchRate();
  }, [from, to]);

  // Fetch popular rates on mount
  useEffect(() => {
    fetchPopularRates();
  }, []);

  const fetchRate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
      if (!res.ok) throw new Error('Rate fetch failed');
      const data = await res.json();
      const r = data.rates[to];
      setRate(r);
      const val = parseFloat(amount) || 0;
      setResult((val * r).toFixed(to === 'JPY' || to === 'KRW' || to === 'IDR' || to === 'VND' ? 0 : 2));
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setError('Failed to fetch exchange rates. Using estimated rates.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPopularRates = async () => {
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (!res.ok) return;
      const data = await res.json();
      // Filter only the currencies we want to show in sidebar
      const filteredRates = {
        MYR: data.rates.MYR,
        JPY: data.rates.JPY,
        EUR: data.rates.EUR,
        GBP: data.rates.GBP,
        SGD: data.rates.SGD,
        THB: data.rates.THB
      };
      setPopularRates(filteredRates);
    } catch { /* silent */ }
  };

  const handleConvert = (e) => {
    e.preventDefault();
    if (rate) {
      const val = parseFloat(amount) || 0;
      setResult((val * rate).toFixed(to === 'JPY' || to === 'KRW' || to === 'IDR' || to === 'VND' ? 0 : 2));
    } else {
      fetchRate();
    }
  };

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
    setRate(null);
    setResult(null);
  };

  const fromCurr = CURRENCIES.find(c => c.code === from);
  const toCurr = CURRENCIES.find(c => c.code === to);

  return (
    <div className="page-container">
      <Navbar />
      <div className="content-wrapper fade-in">

        <div className="page-header">
          <h1 className="page-title"> Currency Converter</h1>
          <p className="page-subtitle">Live exchange rates powered by ExchangeRate-API · Updated in real time</p>
        </div>

        <div className="currency-layout">
          {/* Main converter */}
          <div className="currency-main">
            <div className="glass-card converter-card">
              {error && <div className="alert alert-error"><span>⚠️</span>{error}</div>}

              <form onSubmit={handleConvert} id="currency-form">
                {/* Amount */}
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input
                    id="currency-amount"
                    type="number"
                    className="form-input currency-amount-input"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="0"
                    step="any"
                    required
                  />
                </div>

                {/* From / Swap / To */}
                <div className="currency-selectors">
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">From</label>
                    <select
                      id="currency-from"
                      className="form-select"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    id="currency-swap-btn"
                    className="swap-btn"
                    onClick={handleSwap}
                    title="Swap currencies"
                  >
                    ⇄
                  </button>

                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">To</label>
                    <select
                      id="currency-to"
                      className="form-select"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  id="currency-convert-btn"
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: 16 }}
                  disabled={loading}
                >
                  {loading ? <><span className="spinner spinner-sm" /> Getting rates...</> : '💱 Convert'}
                </button>
              </form>

              {/* Result */}
              {result !== null && rate !== null && !loading && (
                <div className="conversion-result fade-in">
                  <div className="result-from">
                    <span className="result-flag">{fromCurr?.flag}</span>
                    <span className="result-number">{parseFloat(amount).toLocaleString()}</span>
                    <span className="result-code">{from}</span>
                  </div>
                  <div className="result-equals">=</div>
                  <div className="result-to">
                    <span className="result-flag">{toCurr?.flag}</span>
                    <span className="result-number result-big">{Number(result).toLocaleString()}</span>
                    <span className="result-code">{to}</span>
                  </div>
                  <div className="result-rate">
                    <span>1 {from} = {rate} {to}</span>
                    {lastUpdated && <span className="rate-time">· Updated {lastUpdated}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Quick pairs */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16 }}>
                🔗 QUICK CONVERT
              </h3>
              <div className="quick-pairs">
                {POPULAR_PAIRS.map(pair => (
                  <button
                    key={`${pair.from}-${pair.to}`}
                    className={`quick-pair ${from === pair.from && to === pair.to ? 'active' : ''}`}
                    onClick={() => { setFrom(pair.from); setTo(pair.to); }}
                  >
                    {pair.from} → {pair.to}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Popular rates table */}
          <div className="currency-sidebar">
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16 }}>
                📊 USD LIVE RATES
              </h3>
              {Object.keys(popularRates).length > 0 ? (
                <div className="rates-table">
                  {Object.entries(popularRates).map(([code, r]) => {
                    const curr = CURRENCIES.find(c => c.code === code);
                    return (
                      <div
                        key={code}
                        className="rate-row"
                        onClick={() => { setFrom('USD'); setTo(code); }}
                      >
                        <div className="rate-currency">
                          <span className="rate-flag">{curr?.flag || '🌐'}</span>
                          <div>
                            <div className="rate-code">{code}</div>
                            <div className="rate-name">{curr?.name}</div>
                          </div>
                        </div>
                        <div className="rate-value">{r.toFixed(code === 'JPY' || code === 'KRW' ? 2 : 4)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </div>
              )}
              <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 16 }}>
                Source: ExchangeRate-API · Click to convert
              </p>
            </div>

            {/* Travel money tip */}
            <div className="glass-card money-tip-card" style={{ padding: 24 }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>💡</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>Travel Money Tips</h3>
              <ul className="money-tips">
                <li>Always compare rates before exchanging</li>
                <li>Use credit cards with no foreign transaction fees</li>
                <li>Withdraw larger amounts to minimize ATM fees</li>
                <li>Keep some cash for local markets</li>
                <li>Notify your bank before travelling abroad</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
