import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { categories, markets, formatChange } from './mockMarkets';
import LoginModal from '../../components/modals/login/LoginModal';
import { useAuth } from '../../helpers/AuthContent';
import './Home.css';

const NO_FILTER = ['Trending', 'Breaking', 'New'];

function Sparkline({ probability, change }) {
  // small decorative trend line derived from the probability
  const base = probability - change;
  const pts = [base, base + change * 0.2, base + change * 0.1, base + change * 0.6, base + change * 0.5, probability];
  const min = Math.min(...pts) - 2;
  const max = Math.max(...pts) + 2;
  const d = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * 100;
      const y = 28 - ((p - min) / (max - min)) * 28;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg className="pm-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="none" strokeWidth="1.8" vectorEffect="non-scaling-stroke" className={change >= 0 ? 'up' : 'down'} />
    </svg>
  );
}

function LoginButton() {
  const [open, setOpen] = useState(false);
  const { login } = useAuth();
  const history = useHistory();

  return (
    <>
      <button type="button" className="pm-login" onClick={() => setOpen(true)}>
        Log in
      </button>
      {open && (
        <LoginModal
          isOpen={open}
          onClose={() => setOpen(false)}
          onLogin={login}
          redirectAfterLogin={history.location.pathname}
        />
      )}
    </>
  );
}

function MarketCard({ market }) {
  const history = useHistory();
  const yes = market.probability;
  const no = 100 - yes;

  const open = () => history.push(`/markets/${market.id}`);
  const trade = (e, side) => {
    e.stopPropagation();
    history.push(`/markets/${market.id}`, { tradeSide: side });
  };

  return (
    <article
      className="pm-card"
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
    >
      <div className="pm-card-head">
        <div className="pm-icon">{market.image}</div>
        <h3 className="pm-card-title">{market.title}</h3>
        <div className="pm-gauge" title={`${yes}% chance`}>
          <svg viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" className="pm-gauge-bg" />
            <circle
              cx="18"
              cy="18"
              r="15.5"
              className="pm-gauge-fg"
              strokeDasharray={`${(yes / 100) * 97.4} 97.4`}
              transform="rotate(-90 18 18)"
            />
          </svg>
          <span>{yes}%</span>
        </div>
      </div>

      <Sparkline probability={yes} change={market.change} />

      <div className="pm-outcomes">
        <button type="button" className="pm-btn pm-yes" onClick={(e) => trade(e, 'yes')}>
          Yes <strong>{yes}¢</strong>
        </button>
        <button type="button" className="pm-btn pm-no" onClick={(e) => trade(e, 'no')}>
          No <strong>{no}¢</strong>
        </button>
      </div>

      <div className="pm-card-foot">
        <span>{market.volume} Vol.</span>
        <span className={market.change >= 0 ? 'positive' : 'negative'}>
          {market.change >= 0 ? '▲' : '▼'} {formatChange(market.change)}
        </span>
      </div>
    </article>
  );
}

export default function Home() {
  const history = useHistory();
  const [activeCategory, setActiveCategory] = useState('Trending');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = [...markets];

    if (!NO_FILTER.includes(activeCategory)) {
      result = result.filter((m) => m.category.toLowerCase() === activeCategory.toLowerCase());
    }
    if (activeCategory === 'Trending') {
      result.sort((a, b) => b.volumeNum - a.volumeNum);
    }
    if (activeCategory === 'New') {
      result.sort((a, b) => Number(b.id) - Number(a.id));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) => m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeCategory, search]);

  return (
    <div className="pm-page">
      <header className="pm-header">
        <div className="pm-header-inner">
          <button type="button" className="pm-logo" onClick={() => history.push('/')}>
            Social<span>Predict</span>
          </button>

          <div className="pm-search">
            <span className="pm-search-icon">⌕</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search markets"
              aria-label="Search markets"
            />
            <kbd>/</kbd>
          </div>

          <nav className="pm-nav">
            <button type="button" onClick={() => history.push('/markets')}>Markets</button>
            <button type="button" onClick={() => history.push('/stats')}>Stats</button>
            <button type="button" onClick={() => history.push('/profile')}>Portfolio</button>
            <button type="button" className="pm-balance" onClick={() => history.push('/profile')}>
              $0.00
            </button>
            <LoginButton />
          </nav>
        </div>

        <div className="pm-cats">
          <div className="pm-cats-scroll">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`pm-cat ${activeCategory === c ? 'active' : ''}`}
                onClick={() => setActiveCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="pm-main">
        <div className="pm-section-head">
          <h1>{activeCategory === 'Trending' ? 'All markets' : activeCategory}</h1>
          <span>{filtered.length} markets</span>
        </div>

        {filtered.length > 0 ? (
          <div className="pm-grid">
            {filtered.map((m) => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
        ) : (
          <div className="pm-empty">
            <h3>No markets found</h3>
            <p>Try another category or search term.</p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('Trending');
                setSearch('');
              }}
            >
              Clear filters
            </button>
          </div>
        )}

        <section className="pm-cta">
          <div>
            <h2>Create your own prediction market</h2>
            <p>Have a question about the future? Turn it into a market.</p>
          </div>
          <button type="button" onClick={() => history.push('/create')}>
            Create market
          </button>
        </section>
      </main>
    </div>
  );
}