$ErrorActionPreference = 'Stop'

# Run this script from the frontend folder, or place it inside the frontend folder.
$frontend = (Get-Location).Path
$src = Join-Path $frontend 'src'

if (-not (Test-Path (Join-Path $src 'pages\markets\Markets.jsx'))) {
    throw "Could not find the frontend project. Run this from: C:\Users\bime\Downloads\socialpredict-main\socialpredict-main\frontend"
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $frontend ".redesign-backups\$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

$files = @{
    'src\pages\markets\Markets.jsx' = @'
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import GlobalSearchBar from '../../components/search/GlobalSearchBar';
import MarketsByStatusTable from '../../components/tables/MarketsByStatusTable';
import SearchResultsTable from '../../components/tables/SearchResultsTable';
import { marketTagChipClassFor } from '../../components/markets/MarketTagChips';
import { TAB_TO_STATUS } from '../../utils/statusMap';
import { apiRequest } from '../../api/httpClient';
import { listMarketTags } from '../../api/marketTagsApi';

const defaultDiscoveryLayout = {
    title: 'Markets',
    description: '',
    featuredTopicsEnabled: false,
    featuredMarketsEnabled: false,
    recommendationLimit: 20,
    primaryTagSlug: '',
    searchScope: 'all',
    pins: [],
};

const MARKET_LIST_PAGE_SIZE = 20;

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const sortBySortOrder = (items = []) =>
    [...items].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

const slugTitle = (slug = '') =>
    slug
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

const normalizeDiscoveryLayout = (layout, fallback = {}) => ({
    ...defaultDiscoveryLayout,
    ...fallback,
    ...layout,
    pins: sortBySortOrder(layout?.pins || []),
});

const attachTagsToPins = (pins = [], tagsBySlug = {}) =>
    sortBySortOrder(pins).map((pin) =>
        pin.pinType === 'discovery_page'
            ? { ...pin, tag: tagsBySlug[pin.targetPageSlug] || pin.tag }
            : pin
    );

const DiscoveryBadge = ({ children, tag }) => {
    const className = tag
        ? marketTagChipClassFor(tag)
        : 'border-gray-200 bg-gray-50 text-gray-700';

    return (
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
            {children}
        </span>
    );
};

function TopicNav({ topicPins = [] }) {
    if (!topicPins.length) return null;

    return (
        <div className="overflow-x-auto pb-1">
            <nav className="flex min-w-max items-center gap-2" aria-label="Market topics">
                <Link
                    to="/markets"
                    className="rounded-full bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-black"
                >
                    All
                </Link>
                {topicPins.map((pin) => (
                    <Link
                        key={`topic-${pin.id || pin.targetPageSlug || pin.sortOrder}`}
                        to={pin.targetPageSlug ? `/markets/topic/${pin.targetPageSlug}` : '/markets'}
                        className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition hover:brightness-95 ${marketTagChipClassFor(pin.tag)}`}
                        title={pin.tag?.description || pin.label || pin.targetPageSlug}
                    >
                        {pin.label || slugTitle(pin.targetPageSlug) || 'Topic'}
                    </Link>
                ))}
            </nav>
        </div>
    );
}

function FeaturedMarketPins({ marketPins = [], discoverySlug = 'markets' }) {
    const [pinnedMarkets, setPinnedMarkets] = useState([]);

    const pinKey = marketPins
        .map((pin) => `${pin.id || ''}:${pin.marketId || ''}:${pin.sortOrder || ''}`)
        .join('|');

    useEffect(() => {
        let ignore = false;
        const pinsWithIds = marketPins.filter((pin) => Number(pin.marketId) > 0);

        if (!pinsWithIds.length) {
            setPinnedMarkets([]);
            return () => { ignore = true; };
        }

        apiRequest(`/v0/read/market-discovery/${encodeURIComponent(discoverySlug || 'markets')}?limit=20&offset=0`, {
            fallbackMessage: 'Failed to load pinned market read model',
        })
            .then((data) => {
                if (ignore) return;
                const rows = Array.isArray(data?.pinnedMarkets) ? data.pinnedMarkets : [];
                setPinnedMarkets(
                    rows
                        .map((item) => ({ pin: item.pin, details: item.details }))
                        .filter((item) => item?.details?.market)
                );
            })
            .catch(() => {
                if (!ignore) setPinnedMarkets([]);
            });

        return () => { ignore = true; };
    }, [discoverySlug, pinKey]);

    if (!pinnedMarkets.length) return null;

    return (
        <section className="grid gap-3 md:grid-cols-2" aria-label="Featured markets">
            {pinnedMarkets.slice(0, 4).map(({ pin, details }) => {
                const market = details.market || {};
                const marketId = market.id || pin?.marketId;
                const probabilityRaw = toNumber(
                    details?.lastProbability ?? market?.lastProbability,
                    0.5
                );
                const probability = Math.round(
                    Math.max(0, Math.min(1, probabilityRaw <= 1 ? probabilityRaw : probabilityRaw / 100)) * 100
                );
                const volume = toNumber(details?.totalVolume ?? market?.totalVolume, 0);
                const volumeLabel = volume >= 1000000
                    ? `$${(volume / 1000000).toFixed(1)}M`
                    : volume >= 1000
                        ? `$${(volume / 1000).toFixed(1)}K`
                        : `$${Math.round(volume)}`;

                return (
                    <Link
                        key={`featured-${pin?.id || marketId}`}
                        to={marketId ? `/markets/${marketId}` : '/markets'}
                        className="group rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-md"
                    >
                        <div className="mb-3 flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-700">
                                ?
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                        Featured
                                    </span>
                                    <span className="text-xs font-medium text-gray-400">
                                        {volumeLabel} Vol.
                                    </span>
                                </div>
                                <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-gray-900 group-hover:text-black">
                                    {market.questionTitle || pin?.label || 'Market'}
                                </h3>
                            </div>
                        </div>

                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <div className="text-3xl font-bold tracking-tight text-gray-950">
                                    {probability}%
                                </div>
                                <div className="text-xs text-gray-400">chance</div>
                            </div>
                            <div className="w-28 shrink-0 pb-1">
                                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                    <div
                                        className="h-full rounded-full bg-emerald-500 transition-all"
                                        style={{ width: `${probability}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                                <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">Yes</div>
                                <div className="mt-0.5 text-lg font-bold text-emerald-700">{probability}¢</div>
                            </div>
                            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                                <div className="text-[11px] font-bold uppercase tracking-wide text-red-500">No</div>
                                <div className="mt-0.5 text-lg font-bold text-red-600">{100 - probability}¢</div>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </section>
    );
}

function Markets() {
    const { slug: topicSlugParam } = useParams();
    const topicSlug = topicSlugParam || '';
    const isTopicPage = Boolean(topicSlug);
    const discoverySlug = isTopicPage ? topicSlug : 'markets';

    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab, setActiveTab] = useState('Active');
    const [sortBy, setSortBy] = useState('volume');
    const [discoveryLayout, setDiscoveryLayout] = useState(defaultDiscoveryLayout);
    const [persistentTopicPins, setPersistentTopicPins] = useState([]);
    const [marketTagsBySlug, setMarketTagsBySlug] = useState({});

    useEffect(() => {
        let ignore = false;

        listMarketTags()
            .then((result) => {
                if (ignore) return;
                const bySlug = {};
                (result.tags || []).forEach((tag) => {
                    if (tag.slug) bySlug[tag.slug] = tag;
                });
                setMarketTagsBySlug(bySlug);
            })
            .catch(() => {
                if (!ignore) setMarketTagsBySlug({});
            });

        return () => { ignore = true; };
    }, []);

    useEffect(() => {
        let ignore = false;
        const fallback = isTopicPage
            ? {
                title: slugTitle(topicSlug) || 'Topic Markets',
                description: 'Browse and search markets in this topic.',
                primaryTagSlug: topicSlug,
                searchScope: 'tag',
                featuredMarketsEnabled: true,
                recommendationLimit: 5,
            }
            : {};

        setSearchResults(null);
        setIsSearching(false);

        const loadDiscovery = async () => {
            try {
                const [layout, topLayout] = await Promise.all([
                    apiRequest(`/v0/content/market-discovery/${discoverySlug}`, {
                        fallbackMessage: 'Failed to load market discovery layout',
                    }),
                    isTopicPage
                        ? apiRequest('/v0/content/market-discovery/markets', {
                            fallbackMessage: 'Failed to load market topic navigation',
                        })
                        : Promise.resolve(null),
                ]);

                if (ignore) return;

                const normalizedLayout = normalizeDiscoveryLayout(layout, fallback);
                const enrichedLayout = {
                    ...normalizedLayout,
                    pins: attachTagsToPins(normalizedLayout.pins, marketTagsBySlug),
                };
                const topNavLayout = isTopicPage
                    ? normalizeDiscoveryLayout(topLayout || {}, {})
                    : enrichedLayout;
                const topTopicPins = topNavLayout.featuredTopicsEnabled
                    ? attachTagsToPins(topNavLayout.pins || [], marketTagsBySlug)
                        .filter((pin) => pin.pinType === 'discovery_page')
                    : [];

                setDiscoveryLayout(enrichedLayout);
                setPersistentTopicPins(topTopicPins);
            } catch {
                if (!ignore) {
                    setDiscoveryLayout(normalizeDiscoveryLayout({}, fallback));
                    setPersistentTopicPins([]);
                }
            }
        };

        loadDiscovery();
        return () => { ignore = true; };
    }, [isTopicPage, topicSlug, discoverySlug, marketTagsBySlug]);

    const tagScope = isTopicPage
        ? topicSlug
        : discoveryLayout.searchScope === 'tag'
            ? discoveryLayout.primaryTagSlug
            : '';

    const tagScopeLabel = marketTagsBySlug[tagScope]?.displayName || slugTitle(tagScope) || tagScope;
    const topicPins = persistentTopicPins.length
        ? persistentTopicPins
        : sortBySortOrder(discoveryLayout.pins || []).filter((pin) => pin.pinType === 'discovery_page');
    const marketPins = sortBySortOrder(discoveryLayout.pins || []).filter((pin) => pin.pinType === 'market');

    const tabs = useMemo(
        () => ['Active', 'Closed', 'Resolved', 'All'],
        []
    );

    const handleTabChange = (tabLabel) => {
        setActiveTab(tabLabel);
    };

    return (
        <div className="min-h-screen bg-[#f7f7f8] text-[#111111]">
            <div className="border-b border-gray-200 bg-white">
                <div className="mx-auto flex max-w-[1450px] items-center gap-4 px-4 py-3 sm:px-6">
                    <Link to="/" className="shrink-0 text-lg font-black tracking-tight text-gray-950">
                        SocialPredict
                    </Link>
                    <div className="hidden h-6 w-px bg-gray-200 sm:block" />
                    <div className="text-sm font-semibold text-gray-900">
                        {isTopicPage ? (discoveryLayout.title || tagScopeLabel || 'Markets') : 'All markets'}
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-[1450px] px-4 pb-16 pt-5 sm:px-6 lg:pt-7">
                <div className="mb-5">
                    <GlobalSearchBar
                        onSearchResults={setSearchResults}
                        currentStatus={TAB_TO_STATUS[activeTab]}
                        isSearching={isSearching}
                        setIsSearching={setIsSearching}
                        tagSlug={tagScope}
                    />
                </div>

                {!isSearching && <TopicNav topicPins={topicPins} />}

                <section className="mt-5">
                    <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-[28px]">
                                {isTopicPage ? (discoveryLayout.title || tagScopeLabel || 'Markets') : 'All markets'}
                            </h1>
                            <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                {isTopicPage
                                    ? (discoveryLayout.description || 'Trade on what you think will happen next.')
                                    : 'Trade on real-world outcomes with live probabilities and market volume.'}
                            </p>
                        </div>
                        {tagScope && (
                            <DiscoveryBadge tag={marketTagsBySlug[tagScope]}>{tagScopeLabel}</DiscoveryBadge>
                        )}
                    </div>

                    {!isSearching && (discoveryLayout.featuredMarketsEnabled || marketPins.length > 0) && (
                        <div className="my-5">
                            <FeaturedMarketPins
                                marketPins={marketPins}
                                discoverySlug={discoverySlug}
                            />
                        </div>
                    )}

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => handleTabChange(tab)}
                                    className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition sm:text-sm ${
                                        activeTab === tab
                                            ? 'bg-gray-900 text-white shadow-sm'
                                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
                            Sort
                            <select
                                value={sortBy}
                                onChange={(event) => setSortBy(event.target.value)}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none transition focus:border-gray-400"
                            >
                                <option value="volume">Volume</option>
                                <option value="probability">Probability</option>
                                <option value="newest">Newest</option>
                            </select>
                        </label>
                    </div>

                    <div className="mt-4">
                        {isSearching ? (
                            <SearchResultsTable searchResults={searchResults} />
                        ) : (
                            <MarketsByStatusTable
                                status={TAB_TO_STATUS[activeTab] || 'active'}
                                limit={MARKET_LIST_PAGE_SIZE}
                                tagSlug={tagScope}
                                discoverySlug={discoverySlug}
                                sortBy={sortBy}
                            />
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

export default Markets;
'@

    'src\components\search\GlobalSearchBar.jsx' = @'
import React, { useEffect, useState } from 'react';
import { searchMarkets } from '../../api/marketsApi';

const GlobalSearchBar = ({
    onSearchResults,
    currentStatus,
    isSearching,
    setIsSearching,
    tagSlug = '',
}) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const trimmed = query.trim();

            if (!trimmed) {
                onSearchResults(null);
                setIsSearching(false);
                return;
            }

            performSearch(trimmed);
        }, 300);

        return () => clearTimeout(timeoutId);
        // Search is intentionally re-run when status/tag changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, currentStatus, tagSlug]);

    const performSearch = async (searchQuery) => {
        setLoading(true);
        setIsSearching(true);

        try {
            const results = await searchMarkets(searchQuery, currentStatus, 20, { tagSlug });
            onSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            onSearchResults({ error: 'Search failed. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setQuery('');
        onSearchResults(null);
        setIsSearching(false);
    };

    return (
        <div className="w-full">
            <div className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-2.5 shadow-sm transition ${
                isSearching ? 'border-gray-400 shadow-md' : 'border-gray-200 hover:border-gray-300'
            }`}>
                <span className="shrink-0 text-lg text-gray-400" aria-hidden="true">⌕</span>

                <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search markets"
                    aria-label="Search markets"
                    className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />

                {loading && (
                    <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" aria-label="Searching" />
                )}

                {!loading && query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
                        title="Clear search"
                        aria-label="Clear search"
                    >
                        ×
                    </button>
                )}

                <span className="hidden shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-400 sm:inline-flex">
                    /
                </span>
            </div>

            {isSearching && query && (
                <div className="mt-2 px-1 text-xs text-gray-500">
                    Searching <span className="font-semibold text-gray-900">{currentStatus}</span> markets
                    {tagSlug ? <> in <span className="font-semibold text-gray-900">{tagSlug}</span></> : null}
                    {' '}for <span className="font-semibold text-gray-900">“{query}”</span>
                </div>
            )}
        </div>
    );
};

export default GlobalSearchBar;
'@

    'src\components\tables\MarketsByStatusTable.jsx' = @'
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api/httpClient';
import formatResolutionDate from '../../helpers/formatResolutionDate';
import { groupMarketRows, marketDisplayRoute } from '../../helpers/marketGroups';

const DEFAULT_LIMIT = 20;

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeMarketOverview = (raw) => {
    if (!raw || typeof raw !== 'object') return null;

    const market = raw.market ?? raw;

    return {
        market,
        creator: raw.creator ?? { username: market.creatorUsername ?? 'unknown' },
        lastProbability: toNumber(raw.lastProbability ?? market.lastProbability, 0.5),
        numUsers: toNumber(raw.numUsers ?? market.numUsers, 0),
        totalVolume: toNumber(raw.totalVolume ?? market.totalVolume, 0),
    };
};

const formatVolume = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${Math.round(value)}`;
};

const getProbability = (marketData) => {
    const raw = toNumber(
        marketData?.lastProbability ?? marketData?.market?.lastProbability,
        0.5
    );
    const probability = raw <= 1 ? raw * 100 : raw;
    return Math.min(100, Math.max(0, Math.round(probability)));
};

const getMarketDate = (market) => {
    const value = market?.createdAt ?? market?.CreatedAt ?? market?.resolutionDateTime;
    if (!value) return 0;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
};

const MarketCard = ({ marketData }) => {
    const market = marketData?.market ?? {};
    const route = marketDisplayRoute(marketData);
    const probability = getProbability(marketData);
    const noProbability = 100 - probability;
    const totalVolume = toNumber(marketData?.totalVolume);
    const numUsers = toNumber(marketData?.numUsers);
    const resolutionDate = market.resolutionDateTime;
    const isResolved = typeof market.isResolved === 'boolean'
        ? market.isResolved
        : String(market.status ?? '').toLowerCase() === 'resolved';

    const category = market.category
        || market.primaryTag
        || market.primaryTagSlug
        || market.tagSlug
        || 'Market';

    return (
        <Link
            to={route}
            className="group block rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg"
        >
            <article className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-sm font-black text-gray-500">
                        ?
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex items-center gap-2">
                            <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                {category}
                            </span>
                            <span className="ml-auto shrink-0 text-[11px] font-medium text-gray-400">
                                {isResolved ? 'Resolved' : 'Live'}
                            </span>
                        </div>

                        <h3 className="line-clamp-3 text-[15px] font-semibold leading-[1.35] tracking-[-0.01em] text-gray-950">
                            {market.questionTitle ?? 'Untitled market'}
                        </h3>
                    </div>
                </div>

                <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                        <div className="text-[28px] font-bold leading-none tracking-tight text-gray-950">
                            {probability}%
                        </div>
                        <div className="mt-1 text-xs text-gray-400">chance</div>
                    </div>
                    <div className="w-28 shrink-0 pb-1 sm:w-36">
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                            <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${probability}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">Yes</span>
                            <span className="text-[10px] font-semibold text-emerald-500">BUY</span>
                        </div>
                        <div className="mt-0.5 text-xl font-bold text-emerald-700">{probability}¢</div>
                    </div>

                    <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-red-500">No</span>
                            <span className="text-[10px] font-semibold text-red-400">BUY</span>
                        </div>
                        <div className="mt-0.5 text-xl font-bold text-red-600">{noProbability}¢</div>
                    </div>
                </div>
            </article>

            <footer className="border-t border-gray-100 bg-gray-50/80 px-4 py-3 sm:px-5">
                <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="font-semibold text-gray-600">{formatVolume(totalVolume)} Vol.</span>
                    <span className="text-gray-400">{numUsers} traders</span>
                    <span className="truncate text-right text-gray-400">
                        {resolutionDate ? formatResolutionDate(resolutionDate) : 'Open'}
                    </span>
                </div>
            </footer>
        </Link>
    );
};

function MarketsByStatusTable({
    status = 'all',
    limit = DEFAULT_LIMIT,
    tagSlug,
    discoverySlug,
    sortBy = 'volume',
}) {
    const [markets, setMarkets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchMarkets = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set('limit', String(limit));
            if (tagSlug) params.set('tagSlug', tagSlug);
            if (discoverySlug) params.set('discoverySlug', discoverySlug);

            const path = status === 'all'
                ? `/v0/markets?${params.toString()}`
                : `/v0/markets/${status}?${params.toString()}`;

            const data = await apiRequest(path, {
                fallbackMessage: 'Failed to load markets.',
            });

            const rawMarkets = Array.isArray(data)
                ? data
                : data?.markets ?? data?.items ?? data?.data ?? [];

            const normalized = rawMarkets
                .map(normalizeMarketOverview)
                .filter((item) => item && (item.market?.id || item.market?.marketId));

            setMarkets(normalized);
        } catch (err) {
            console.error('Failed to load markets:', err);
            setError(err?.message || 'Failed to load markets.');
        } finally {
            setLoading(false);
        }
    }, [status, limit, tagSlug, discoverySlug]);

    useEffect(() => {
        fetchMarkets();
    }, [fetchMarkets]);

    const groupedMarkets = useMemo(() => {
        const grouped = groupMarketRows(markets);
        return [...grouped].sort((left, right) => {
            const leftVolume = toNumber(left?.totalVolume ?? left?.market?.totalVolume);
            const rightVolume = toNumber(right?.totalVolume ?? right?.market?.totalVolume);
            const leftProbability = getProbability(left);
            const rightProbability = getProbability(right);

            if (sortBy === 'probability') {
                return rightProbability - leftProbability;
            }
            if (sortBy === 'newest') {
                return getMarketDate(right?.market) - getMarketDate(left?.market);
            }
            return rightVolume - leftVolume;
        });
    }, [markets, sortBy]);

    if (loading) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-[330px] animate-pulse rounded-2xl border border-gray-200 bg-white" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-200 bg-white p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">!</div>
                <h3 className="mt-4 font-semibold text-gray-950">Unable to load markets</h3>
                <p className="mt-2 text-sm text-gray-500">{error}</p>
                <button
                    type="button"
                    onClick={fetchMarkets}
                    className="mt-5 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
                >
                    Try again
                </button>
            </div>
        );
    }

    if (!groupedMarkets.length) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-xl font-bold text-gray-400">?</div>
                <h3 className="mt-5 text-lg font-bold text-gray-900">No markets found</h3>
                <p className="mt-2 text-sm text-gray-500">There are no markets available for this category yet.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groupedMarkets.map((marketData, index) => (
                <MarketCard
                    key={marketData?.market?.id ?? marketData?.id ?? index}
                    marketData={marketData}
                />
            ))}
        </div>
    );
}

export default MarketsByStatusTable;
'@
}

foreach ($relative in $files.Keys) {
    $target = Join-Path $frontend $relative
    $backup = Join-Path $backupRoot $relative
    $backupDir = Split-Path $backup -Parent
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    Copy-Item $target $backup -Force
    Set-Content -Path $target -Value $files[$relative] -Encoding UTF8
    Write-Host "Updated: $relative" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done. Backup created at:" -ForegroundColor Cyan
Write-Host $backupRoot -ForegroundColor Yellow
Write-Host ""
Write-Host "Now run: npm start" -ForegroundColor Cyan
