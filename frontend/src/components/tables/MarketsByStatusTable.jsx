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
                        <div className="mt-0.5 text-xl font-bold text-emerald-700">{probability}Â¢</div>
                    </div>

                    <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-red-500">No</span>
                            <span className="text-[10px] font-semibold text-red-400">BUY</span>
                        </div>
                        <div className="mt-0.5 text-xl font-bold text-red-600">{noProbability}Â¢</div>
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
