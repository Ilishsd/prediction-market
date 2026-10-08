import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api/httpClient';
import formatResolutionDate from '../../helpers/formatResolutionDate';
import {
  groupMarketRows,
  marketDisplayRoute,
} from '../../helpers/marketGroups';

const DEFAULT_LIMIT = 20;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeMarketOverview = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const market = raw.market ?? raw;

  return {
    market,
    creator: raw.creator ?? {
      username: market.creatorUsername ?? 'unknown',
    },
    lastProbability: toNumber(
      raw.lastProbability ?? market.lastProbability,
      0.5
    ),
    numUsers: toNumber(
      raw.numUsers ?? market.numUsers,
      0
    ),
    totalVolume: toNumber(
      raw.totalVolume ?? market.totalVolume,
      0
    ),
  };
};

const formatVolume = (value) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }

  return `$${Math.round(value)}`;
};

const getProbability = (marketData) => {
  const raw = toNumber(
    marketData?.lastProbability ??
      marketData?.market?.lastProbability,
    0.5
  );

  const probability = raw <= 1 ? raw * 100 : raw;

  return Math.min(
    100,
    Math.max(0, Math.round(probability))
  );
};

const MarketCard = ({ marketData }) => {
  const market = marketData?.market ?? {};
  const route = marketDisplayRoute(marketData);

  const probability = getProbability(marketData);
  const noProbability = 100 - probability;

  const questionTitle =
    market.questionTitle ?? 'Untitled market';

  const totalVolume = toNumber(
    marketData?.totalVolume
  );

  const numUsers = toNumber(
    marketData?.numUsers
  );

  const resolutionDate =
    market.resolutionDateTime;

  const isResolved =
    typeof market.isResolved === 'boolean'
      ? market.isResolved
      : String(market.status ?? '').toLowerCase() ===
        'resolved';

  return (
    <Link
      to={route}
      className='group block overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl'
    >
      {/* Card content */}
      <div className='p-5'>
        {/* Top */}
        <div className='flex items-start gap-3'>
          <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-lg'>
            📊
          </div>

          <div className='min-w-0 flex-1'>
            <div className='mb-1 flex items-center justify-between gap-2'>
              <span className='text-[10px] font-bold uppercase tracking-widest text-gray-400'>
                Prediction market
              </span>

              <span
                className={
                  isResolved
                    ? 'rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-500'
                    : 'rounded-full bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-600'
                }
              >
                {isResolved ? 'Resolved' : 'Live'}
              </span>
            </div>

            <h3 className='line-clamp-3 text-[15px] font-semibold leading-6 text-gray-900'>
              {questionTitle}
            </h3>
          </div>
        </div>

        {/* Probability */}
        <div className='mt-6'>
          <div className='mb-2 flex items-end justify-between'>
            <div>
              <span className='text-3xl font-bold tracking-tight text-gray-950'>
                {probability}%
              </span>

              <span className='ml-2 text-xs text-gray-400'>
                chance
              </span>
            </div>
          </div>

          <div className='h-2 overflow-hidden rounded-full bg-gray-100'>
            <div
              className='h-full rounded-full bg-green-500'
              style={{
                width: `${probability}%`,
              }}
            />
          </div>
        </div>

        {/* YES / NO */}
        <div className='mt-5 grid grid-cols-2 gap-2'>
          <div className='rounded-xl border border-green-100 bg-green-50 px-4 py-3'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-bold uppercase tracking-wide text-green-600'>
                YES
              </span>

              <span className='text-[10px] font-medium text-green-500'>
                BUY
              </span>
            </div>

            <div className='mt-1 text-xl font-bold text-green-700'>
              {probability}¢
            </div>
          </div>

          <div className='rounded-xl border border-red-100 bg-red-50 px-4 py-3'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-bold uppercase tracking-wide text-red-500'>
                NO
              </span>

              <span className='text-[10px] font-medium text-red-400'>
                BUY
              </span>
            </div>

            <div className='mt-1 text-xl font-bold text-red-600'>
              {noProbability}¢
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='border-t border-gray-100 bg-gray-50 px-5 py-3.5'>
        <div className='flex items-center justify-between gap-3 text-xs'>
          <span className='font-medium text-gray-500'>
            {formatVolume(totalVolume)} volume
          </span>

          <span className='text-gray-400'>
            {numUsers} traders
          </span>

          <span className='text-gray-400'>
            {resolutionDate
              ? formatResolutionDate(resolutionDate)
              : 'Open'}
          </span>
        </div>
      </div>
    </Link>
  );
};

function MarketsByStatusTable({
  status = 'all',
  limit = DEFAULT_LIMIT,
  tagSlug,
  discoverySlug,
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

      if (tagSlug) {
        params.set('tagSlug', tagSlug);
      }

      if (discoverySlug) {
        params.set(
          'discoverySlug',
          discoverySlug
        );
      }

      const path =
        status === 'all'
          ? `/v0/markets?${params.toString()}`
          : `/v0/markets/${status}?${params.toString()}`;

      const data = await apiRequest(path, {
        fallbackMessage:
          'Failed to load markets.',
      });

      const rawMarkets = Array.isArray(data)
        ? data
        : data?.markets ??
          data?.items ??
          data?.data ??
          [];

      const normalized = rawMarkets
        .map(normalizeMarketOverview)
        .filter(
          (item) =>
            item &&
            (item.market?.id || item.market?.marketId)
        );

      setMarkets(normalized);
    } catch (err) {
      console.error(
        'Failed to load markets:',
        err
      );

      setError(
        err?.message ||
          'Failed to load markets.'
      );
    } finally {
      setLoading(false);
    }
  }, [
    status,
    limit,
    tagSlug,
    discoverySlug,
  ]);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  /* Loading */
  if (loading) {
    return (
      <div className='grid gap-5 sm:grid-cols-2 xl:grid-cols-3'>
        {Array.from({ length: 6 }).map(
          (_, index) => (
            <div
              key={index}
              className='h-[350px] animate-pulse rounded-2xl border border-gray-200 bg-white'
            />
          )
        )}
      </div>
    );
  }

  /* Error */
  if (error) {
    return (
      <div className='rounded-2xl border border-red-100 bg-red-50 p-8 text-center'>
        <div className='mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100'>
          ⚠️
        </div>

        <h3 className='mt-4 font-semibold text-red-800'>
          Unable to load markets
        </h3>

        <p className='mt-2 text-sm text-red-500'>
          {error}
        </p>

        <button
          type='button'
          onClick={fetchMarkets}
          className='mt-5 rounded-xl bg-gray-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800'
        >
          Try again
        </button>
      </div>
    );
  }

  /* Empty */
  if (!markets.length) {
    return (
      <div className='rounded-2xl border border-gray-200 bg-white p-12 text-center'>
        <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl'>
          📊
        </div>

        <h3 className='mt-5 text-lg font-bold text-gray-900'>
          No markets found
        </h3>

        <p className='mt-2 text-sm text-gray-500'>
          There are no markets available for
          this category yet.
        </p>
      </div>
    );
  }

  const groupedMarkets = groupMarketRows(
    markets
  );

  return (
    <div className='grid gap-5 sm:grid-cols-2 xl:grid-cols-3'>
      {groupedMarkets.map(
        (marketData, index) => (
          <MarketCard
            key={
              marketData?.market?.id ??
              marketData?.id ??
              index
            }
            marketData={marketData}
          />
        )
      )}
    </div>
  );
}

export default MarketsByStatusTable;