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
                                <div className="mt-0.5 text-lg font-bold text-emerald-700">{probability}Â¢</div>
                            </div>
                            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                                <div className="text-[11px] font-bold uppercase tracking-wide text-red-500">No</div>
                                <div className="mt-0.5 text-lg font-bold text-red-600">{100 - probability}Â¢</div>
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
