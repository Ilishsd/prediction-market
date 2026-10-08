import React, { useMemo, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { markets, formatChange } from './mockMarkets';
import './MarketDetail.css';

const RANGES = ['1H', '6H', '1D', '1W', '1M', 'ALL'];
const POINTS = { '1H': 24, '6H': 36, '1D': 48, '1W': 56, '1M': 64, ALL: 80 };

// deterministic pseudo-random history ending at the current probability
function buildHistory(seed, current, change, count) {
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const start = Math.max(3, Math.min(97, current - change * 1.5 - 4));
  const data = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const trend = start + (current - start) * t;
    const noise = (rnd() - 0.5) * 7 * (1 - t * 0.6);
    data.push(Math.max(2, Math.min(98, trend + noise)));
  }
  data[count - 1] = current;
  return data;
}

function Chart({ data, up }) {
  const W = 700;
  const H = 280;
  const pad = { l: 8, r: 44, t: 12, b: 12 };
  const [hover, setHover] = useState(null);

  const x = (i) => pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);

  const path = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const idx = hover === null ? data.length - 1 : hover;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((rel - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  return (
    <div className="md-chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="md-chart"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} className="md-grid" />
            <text x={W - pad.r + 6} y={y(g) + 4} className="md-axis">
              {g}%
            </text>
          </g>
        ))}
        <path d={path} className={`md-line ${up ? 'up' : 'down'}`} />
        <line x1={x(idx)} x2={x(idx)} y1={pad.t} y2={H - pad.b} className="md-cursor" />
        <circle cx={x(idx)} cy={y(data[idx])} r="5" className="md-dot" />
      </svg>
      <div className="md-chart-readout">{Math.round(data[idx])}% chance</div>
    </div>
  );
}

export default function MarketDetail() {
  const history = useHistory();
  const location = useLocation();
  const { id } = useParams();

  const market = markets.find((m) => m.id === String(id)) || markets[1];

  const [side, setSide] = useState(
    location.state && location.state.tradeSide === 'no' ? 'NO' : 'YES'
  );
  const [mode, setMode] = useState('Buy');
  const [amount, setAmount] = useState('');
  const [range, setRange] = useState('1D');
  const [tab, setTab] = useState('Rules');

  const yes = market.probability;
  const no = 100 - yes;
  const price = side === 'YES' ? yes : no;

  const data = useMemo(
    () => buildHistory(Number(market.id), yes, market.change, POINTS[range]),
    [market.id, yes, market.change, range]
  );

  const amt = Number(amount) || 0;
  const shares = price ? amt / (price / 100) : 0;
  const payout = shares; // each winning share pays $1
  const profit = payout - amt;

  const quick = (n) => setAmount(String((Number(amount) || 0) + n));

  return (
    <div className="md-page">
      <div className="md-top">
        <button type="button" className="md-back" onClick={() => history.goBack()}>
          ← Back
        </button>
        <span className="md-crumb">{market.category}</span>
      </div>

      <main className="md-container">
        <section className="md-left">
          <div className="md-title-row">
            <div className="md-icon">{market.image}</div>
            <div>
              <h1>{market.title}</h1>
              <div className="md-meta">
                <span>{market.category}</span>
                <span>·</span>
                <span>Ends {market.ends}</span>
              </div>
            </div>
          </div>

          <div className="md-prob-row">
            <div className="md-prob">
              {yes}% <small>chance</small>
            </div>
            <span className={market.change >= 0 ? 'positive' : 'negative'}>
              {market.change >= 0 ? '▲' : '▼'} {formatChange(market.change)}
            </span>
          </div>

          <Chart data={data} up={market.change >= 0} />

          <div className="md-ranges">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                className={range === r ? 'active' : ''}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="md-stats">
            <div>
              <span>Volume</span>
              <strong>{market.volume}</strong>
            </div>
            <div>
              <span>24h Volume</span>
              <strong>{market.volume24h}</strong>
            </div>
            <div>
              <span>Liquidity</span>
              <strong>{market.liquidity}</strong>
            </div>
            <div>
              <span>Ends</span>
              <strong>{market.ends}</strong>
            </div>
          </div>

          <div className="md-tabs">
            {['Rules', 'Comments', 'Activity'].map((t) => (
              <button
                key={t}
                type="button"
                className={tab === t ? 'active' : ''}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="md-tab-body">
            {tab === 'Rules' && (
              <>
                <h3>Resolution rules</h3>
                <p>{market.rules}</p>
              </>
            )}
            {tab === 'Comments' && <p className="md-muted">No comments yet. Be the first to share your view.</p>}
            {tab === 'Activity' && <p className="md-muted">No recent trades to show.</p>}
          </div>
        </section>

        <aside className="md-trade">
          <div className="md-trade-modes">
            {['Buy', 'Sell'].map((m) => (
              <button
                key={m}
                type="button"
                className={mode === m ? 'active' : ''}
                onClick={() => setMode(m)}
              >
                {m}
              </button>
            ))}
            <span className="md-balance">Balance $0.00</span>
          </div>

          <div className="md-sides">
            <button
              type="button"
              className={`yes ${side === 'YES' ? 'selected' : ''}`}
              onClick={() => setSide('YES')}
            >
              Yes {yes}¢
            </button>
            <button
              type="button"
              className={`no ${side === 'NO' ? 'selected' : ''}`}
              onClick={() => setSide('NO')}
            >
              No {no}¢
            </button>
          </div>

          <label className="md-label">Amount</label>
          <div className="md-amount">
            <span>$</span>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="md-quick">
            {[1, 10, 100].map((n) => (
              <button key={n} type="button" onClick={() => quick(n)}>
                +${n}
              </button>
            ))}
            <button type="button" onClick={() => setAmount('')}>
              Clear
            </button>
          </div>

          <div className="md-summary">
            <div>
              <span>Avg price</span>
              <strong>{price}¢</strong>
            </div>
            <div>
              <span>Shares</span>
              <strong>{shares ? shares.toFixed(2) : '0.00'}</strong>
            </div>
            <div>
              <span>Potential payout</span>
              <strong className="positive">
                ${payout.toFixed(2)}
                {amt > 0 && <em> (+${profit.toFixed(2)})</em>}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className={`md-submit ${side === 'YES' ? 'yes' : 'no'}`}
            disabled={amt <= 0}
          >
            {mode} {side === 'YES' ? 'Yes' : 'No'}
          </button>

          <p className="md-warning">
            Trading involves risk. Prices represent the current market probability.
          </p>
        </aside>
      </main>
    </div>
  );
}