import React, { useState } from 'react';
import ResolutionAlert from '../resolutions/ResolutionAlert';
import MarketChart from '../charts/MarketChart';
import ActivityTabs from '../../components/tabs/ActivityTabs';
import ResolveModalButton from '../modals/resolution/ResolveModal';
import TradeCTA from '../TradeCTA';
import TradeTabs from '../../components/tabs/TradeTabs';
import { BetButton } from '../buttons/trade/BetButtons';
import formatResolutionDate from '../../helpers/formatResolutionDate';
import StewardTag, { stewardUsernameFor } from '../markets/StewardTag';
import MarketTagChips from '../markets/MarketTagChips';
import MarkdownLite from '../markdown/MarkdownLite';
import GroupedMarketDetailsLayout from './GroupedMarketDetailsLayout';
import { proposeMarketDescriptionAmendment } from '../../api/marketDescriptionAmendmentsApi';

const DEFAULT_CREATOR_EMOJI = '👤';

function MarketDetailsTable({
  market,
  creator,
  numUsers,
  totalVolume,
  marketDust,
  currentProbability,
  probabilityChanges,
  freshness,
  descriptionAmendments = [],
  marketId: marketIdProp,
  username,
  usertype,
  moderatorStatus,
  isLoggedIn,
  token,
  refetchData,
}) {
  const safeMarket = market ?? {};
  const safeCreator = creator ?? {};

  const resolvedMarketId =
    marketIdProp ?? safeMarket.id;

  const creatorUsername =
    safeMarket.creatorUsername ??
    safeCreator.username ??
    'unknown';

  const stewardUsername = stewardUsernameFor(
    safeMarket,
    creatorUsername
  );

  const creatorEmoji =
    safeCreator.personalEmoji ??
    DEFAULT_CREATOR_EMOJI;

  const marketDescription =
    safeMarket.description ?? '';

  const probability = Math.max(
    0,
    Math.min(
      100,
      Number(currentProbability || 0)
    )
  );

  const freshnessGeneratedAt =
    freshness?.generatedAt
      ? new Date(freshness.generatedAt)
      : null;

  const freshnessLabel =
    freshnessGeneratedAt &&
    !Number.isNaN(
      freshnessGeneratedAt.getTime()
    )
      ? freshnessGeneratedAt.toLocaleTimeString()
      : '';

  const [showFullDescription, setShowFullDescription] =
    useState(false);

  const [showBetModal, setShowBetModal] =
    useState(false);

  const [refreshTrigger, setRefreshTrigger] =
    useState(0);

  const [amendmentBody, setAmendmentBody] =
    useState('');

  const [amendmentReason, setAmendmentReason] =
    useState('');

  const [amendmentMessage, setAmendmentMessage] =
    useState('');

  const [amendmentError, setAmendmentError] =
    useState('');

  const [submittingAmendment, setSubmittingAmendment] =
    useState(false);

  const toggleBetModal = () => {
    setShowBetModal((prev) => !prev);
  };

  const handleMarketResolved = () => {
    if (refetchData) {
      refetchData();
    }

    setRefreshTrigger((prev) => prev + 1);
  };

  const handleTransactionSuccess = () => {
    setShowBetModal(false);

    if (refetchData) {
      refetchData();
    }

    setRefreshTrigger((prev) => prev + 1);
  };

  const shouldShowTradeButtons =
    !safeMarket.isResolved &&
    isLoggedIn &&
    safeMarket.resolutionDateTime &&
    new Date(safeMarket.resolutionDateTime) >
      new Date();

  const canResolveMarket =
    !safeMarket.isResolved &&
    String(username || '').trim() ===
      String(stewardUsername || '').trim();

  const canProposeDescriptionAmendment =
    isLoggedIn &&
    token &&
    !safeMarket.isResolved &&
    ['proposed', 'published', 'active', ''].includes(
      String(
        safeMarket.lifecycleStatus ||
          safeMarket.status ||
          ''
      ).toLowerCase()
    ) &&
    String(username || '').trim() ===
      String(stewardUsername || '').trim();

  const submitDescriptionAmendment = async (
    event
  ) => {
    event.preventDefault();

    setAmendmentMessage('');
    setAmendmentError('');
    setSubmittingAmendment(true);

    try {
      await proposeMarketDescriptionAmendment({
        token,
        marketId: resolvedMarketId,
        body: amendmentBody,
        submitReason: amendmentReason,
      });

      setAmendmentBody('');
      setAmendmentReason('');

      setAmendmentMessage(
        'Description amendment submitted for admin review.'
      );
    } catch (err) {
      setAmendmentError(
        err.message ||
          'Unable to submit description amendment.'
      );
    } finally {
      setSubmittingAmendment(false);
    }
  };

  if (safeMarket.marketGroup?.id) {
    return (
      <GroupedMarketDetailsLayout
        marketGroup={safeMarket.marketGroup}
        fallbackMarket={safeMarket}
        creator={safeCreator}
        isLoggedIn={isLoggedIn}
        token={token}
        username={username}
        usertype={usertype}
        moderatorStatus={moderatorStatus}
        refetchData={refetchData}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#f7f7f8] text-[#171719]">
      <div className="mx-auto w-full max-w-[1380px] px-3 py-5 sm:px-5 lg:px-8">

        {/* =========================================
            MARKET HEADER
        ========================================= */}

        <section className="mb-5 rounded-xl border border-[#e2e2e4] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] sm:p-6">

          <div className="flex flex-col gap-5">

            <div className="flex flex-wrap items-center gap-2">

              <span className="rounded-md border border-[#e3e3e5] bg-[#f7f7f8] px-2.5 py-1 text-[11px] font-medium text-[#77777c]">
                Market
              </span>

              {!safeMarket.isResolved && (
                <span className="rounded-md bg-[#eaf7ef] px-2.5 py-1 text-[11px] font-semibold text-[#187044]">
                  Active
                </span>
              )}

              {safeMarket.isResolved && (
                <span className="rounded-md bg-[#f0f0f1] px-2.5 py-1 text-[11px] font-semibold text-[#77777c]">
                  Resolved
                </span>
              )}

            </div>

            <h1
              className="max-w-5xl text-[25px] font-semibold leading-[1.25] tracking-[-0.5px] text-[#171719] sm:text-[32px] lg:text-[38px]"
              title={safeMarket.questionTitle}
            >
              {safeMarket.questionTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#77777c]">

              <a
                href={`/user/${creatorUsername}`}
                className="flex items-center gap-2 transition hover:text-[#171719]"
              >
                <span
                  role="img"
                  aria-label="Creator"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f0f1] text-sm"
                >
                  {creatorEmoji}
                </span>

                <span className="font-medium">
                  @{creatorUsername}
                </span>
              </a>

              <span className="text-[#c7c7ca]">
                •
              </span>

              <StewardTag
                username={stewardUsername}
                creatorUsername={creatorUsername}
              />

              <span className="text-[#c7c7ca]">
                •
              </span>

              <span className="font-semibold text-[#171719]">
                {probability.toFixed(2)}%
              </span>

            </div>

            <MarketTagChips
              tags={safeMarket.tags || []}
              className="mt-0"
            />

          </div>
        </section>

        {/* =========================================
            MAIN CONTENT
        ========================================= */}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_350px]">

          {/* =======================================
              LEFT COLUMN
          ======================================= */}

          <div className="min-w-0 space-y-5">

            {/* CHART */}

            <section className="overflow-hidden rounded-xl border border-[#e2e2e4] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.025)]">

              <div className="flex items-center justify-between border-b border-[#eeeeef] px-4 py-4 sm:px-5">

                <div>
                  <h2 className="text-base font-semibold text-[#171719] sm:text-lg">
                    Probability
                  </h2>

                  <p className="mt-1 text-xs text-[#88888d]">
                    Market probability over time
                  </p>
                </div>

                <div className="text-right">

                  <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#99999d]">
                    Current
                  </div>

                  <div className="mt-0.5 text-xl font-semibold tracking-tight text-[#171719]">
                    {probability.toFixed(1)}%
                  </div>

                </div>

              </div>

              <div className="p-2 sm:p-4">

                <div className="overflow-hidden rounded-lg border border-[#eeeeef] bg-[#fafafa] p-1 sm:p-2">

                  <MarketChart
                    data={probabilityChanges}
                    currentProbability={currentProbability}
                    title="Probability Changes"
                    className="w-full"
                    closeDateTime={
                      safeMarket.resolutionDateTime
                    }
                    yesLabel={safeMarket.yesLabel}
                    noLabel={safeMarket.noLabel}
                  />

                </div>

              </div>

            </section>

            {/* MARKET STATS */}

            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">

              {[
                {
                  label: 'Users',
                  value: `${numUsers ?? 0}`,
                  icon: 'Users',
                },
                {
                  label: 'Volume',
                  value: `${Math.round(
                    Number(totalVolume || 0)
                  )}`,
                  icon: 'Volume',
                },
                {
                  label: 'Comments',
                  value: '0',
                  icon: 'Comments',
                },
                {
                  label: 'Closes',
                  value: safeMarket.isResolved
                    ? 'Closed'
                    : formatResolutionDate(
                        safeMarket.resolutionDateTime
                      ),
                  icon: 'Closes',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[#e2e2e4] bg-white px-3 py-4"
                >

                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#99999d]">
                    {item.label}
                  </div>

                  <div className="truncate text-sm font-semibold text-[#171719]">
                    {item.value}
                  </div>

                </div>
              ))}

            </section>

            {/* MARKET DUST */}

            {marketDust > 0 && (
              <section className="rounded-xl border border-[#e2e2e4] bg-white p-4">

                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#99999d]">
                  Market Dust
                </div>

                <div className="text-lg font-semibold text-[#171719]">
                  {marketDust}
                </div>

              </section>
            )}

            {/* DESCRIPTION */}

            <section className="overflow-hidden rounded-xl border border-[#e2e2e4] bg-white">

              <button
                type="button"
                onClick={() =>
                  setShowFullDescription(
                    !showFullDescription
                  )
                }
                className="flex w-full items-center justify-between px-4 py-4 text-left transition hover:bg-[#fafafa] sm:px-5"
              >

                <div>

                  <div className="text-sm font-semibold text-[#171719]">
                    Market rules & description
                  </div>

                  <div className="mt-1 text-xs text-[#88888d]">
                    Read the full contract text and amendments
                  </div>

                </div>

                <span className="text-lg text-[#77777c]">
                  {showFullDescription
                    ? '⌃'
                    : '⌄'}
                </span>

              </button>

              {showFullDescription && (
                <div className="border-t border-[#eeeeef] bg-[#fafafa] p-4 sm:p-5">

                  <div
                    className="grid gap-6 text-sm leading-7 text-[#55555a]"
                    style={{
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      hyphens: 'auto',
                    }}
                  >

                    <section>

                      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#99999d]">
                        Description
                      </h2>

                      {marketDescription.trim() ? (
                        <p className="whitespace-pre-wrap">
                          {marketDescription}
                        </p>
                      ) : (
                        <p className="italic text-[#99999d]">
                          No description provided.
                        </p>
                      )}

                    </section>

                    {descriptionAmendments.length > 0 && (
                      <section className="grid gap-3">

                        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#99999d]">
                          Amendments
                        </h2>

                        {descriptionAmendments.map(
                          (amendment, index) => (
                            <article
                              key={
                                amendment.id ||
                                amendment.version ||
                                index
                              }
                              className="rounded-lg border border-[#e2e2e4] bg-white p-4"
                            >

                              <div className="mb-3 flex flex-wrap gap-2 text-xs text-[#88888d]">

                                <span>
                                  Amendment {index + 1}
                                </span>

                                <span>
                                  Submitted by @
                                  {amendment.createdBy}
                                </span>

                                {amendment.approvedAt && (
                                  <span>
                                    Approved{' '}
                                    {new Date(
                                      amendment.approvedAt
                                    ).toLocaleString()}
                                  </span>
                                )}

                              </div>

                              <MarkdownLite className="text-[#55555a]">
                                {amendment.body}
                              </MarkdownLite>

                            </article>
                          )
                        )}

                      </section>
                    )}

                  </div>

                </div>
              )}

            </section>

            {/* AMENDMENT */}

            {canProposeDescriptionAmendment && (
              <form
                onSubmit={submitDescriptionAmendment}
                className="grid gap-3 rounded-xl border border-[#dce8f3] bg-[#f7fbff] p-4 sm:p-5"
              >

                <div>

                  <p className="text-sm font-semibold text-[#171719]">
                    Propose Description Amendment
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#77777c]">
                    Titles are immutable. Description changes are
                    append-only, versioned, and require admin
                    approval.
                  </p>

                </div>

                {amendmentMessage && (
                  <div className="rounded-lg bg-[#eaf7ef] p-3 text-sm font-medium text-[#187044]">
                    {amendmentMessage}
                  </div>
                )}

                {amendmentError && (
                  <div className="rounded-lg bg-[#fff0f0] p-3 text-sm font-medium text-[#b13d3d]">
                    {amendmentError}
                  </div>
                )}

                <textarea
                  value={amendmentBody}
                  onChange={(event) =>
                    setAmendmentBody(event.target.value)
                  }
                  rows={5}
                  maxLength={2000}
                  placeholder="Append clarification using markdown-lite..."
                  className="rounded-lg border border-[#dedee1] bg-white px-3 py-3 text-sm text-[#171719] outline-none transition placeholder:text-[#aaaab0] focus:border-[#99999d]"
                  required
                />

                {amendmentBody && (
                  <div className="rounded-lg border border-[#e2e2e4] bg-white p-4">

                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#99999d]">
                      Preview
                    </p>

                    <MarkdownLite>
                      {amendmentBody}
                    </MarkdownLite>

                  </div>
                )}

                <input
                  type="text"
                  value={amendmentReason}
                  onChange={(event) =>
                    setAmendmentReason(event.target.value)
                  }
                  maxLength={500}
                  placeholder="Optional submit reason for admin review"
                  className="rounded-lg border border-[#dedee1] bg-white px-3 py-3 text-sm text-[#171719] outline-none placeholder:text-[#aaaab0] focus:border-[#99999d]"
                />

                <button
                  type="submit"
                  disabled={
                    submittingAmendment ||
                    !amendmentBody.trim()
                  }
                  className="w-fit rounded-lg bg-[#171719] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#303033] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submittingAmendment
                    ? 'Submitting...'
                    : 'Submit Amendment for Review'}
                </button>

              </form>
            )}

            {/* FRESHNESS */}

            {freshnessLabel && (
              <p className="px-2 text-center text-xs text-[#99999d]">
                Display widgets generated at {freshnessLabel}.
                Trade confirmations remain authoritative.
              </p>
            )}

            {/* ACTIVITY */}

            <section className="overflow-hidden rounded-xl border border-[#e2e2e4] bg-white">

              <div className="border-b border-[#eeeeef] px-4 py-4 sm:px-5">

                <h2 className="text-base font-semibold text-[#171719]">
                  Activity
                </h2>

                <p className="mt-1 text-xs text-[#88888d]">
                  Market activity and positions
                </p>

              </div>

              <div className="w-full">

                <ActivityTabs
                  marketId={resolvedMarketId}
                  market={safeMarket}
                  refreshTrigger={refreshTrigger}
                />

              </div>

            </section>

          </div>

          {/* =======================================
              RIGHT TRADE PANEL
          ======================================= */}

          <aside className="lg:sticky lg:top-5 lg:self-start">

            <div className="overflow-hidden rounded-xl border border-[#dcdcdf] bg-white shadow-[0_4px_18px_rgba(0,0,0,0.05)]">

              {/* TRADE HEADER */}

              <div className="p-5">

                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#99999d]">
                  Market probability
                </div>

                <div className="mt-2 flex items-end gap-2">

                  <span className="text-[38px] font-semibold leading-none tracking-[-1.5px] text-[#171719]">
                    {probability.toFixed(1)}%
                  </span>

                  <span className="pb-1 text-sm text-[#88888d]">
                    chance
                  </span>

                </div>

                {/* PROBABILITY BAR */}

                <div className="mt-5">

                  <div className="h-2 overflow-hidden rounded-full bg-[#eeeeef]">

                    <div
                      className="h-full rounded-full bg-[#171719] transition-all duration-500"
                      style={{
                        width: `${probability}%`,
                      }}
                    />

                  </div>

                  <div className="mt-2 flex justify-between text-[10px] text-[#99999d]">
                    <span>0%</span>
                    <span>100%</span>
                  </div>

                </div>

              </div>

              {/* TRADE */}

              {shouldShowTradeButtons && (
                <div className="border-t border-[#eeeeef] p-5">

                  <div className="mb-3 text-xs font-medium text-[#77777c]">
                    Trade this market
                  </div>

                  <div className="grid grid-cols-2 gap-2">

                    <button
                      type="button"
                      onClick={toggleBetModal}
                      className="rounded-lg border border-[#c7dfd2] bg-[#eff8f3] px-4 py-3 text-sm font-semibold text-[#12643c] transition hover:bg-[#e4f4eb]"
                    >
                      <span className="block">
                        Yes
                      </span>

                      <span className="mt-0.5 block text-xs font-normal opacity-75">
                        {probability.toFixed(1)}¢
                      </span>

                    </button>

                    <button
                      type="button"
                      onClick={toggleBetModal}
                      className="rounded-lg border border-[#dedee1] bg-[#f6f6f7] px-4 py-3 text-sm font-semibold text-[#55555a] transition hover:bg-[#eeeeef]"
                    >
                      <span className="block">
                        No
                      </span>

                      <span className="mt-0.5 block text-xs font-normal opacity-75">
                        {(100 - probability).toFixed(1)}¢
                      </span>

                    </button>

                  </div>

                  <div className="mt-3 hidden md:block">

                    <BetButton
                      onClick={toggleBetModal}
                    />

                  </div>

                </div>
              )}

              {!shouldShowTradeButtons && (
                <div className="border-t border-[#eeeeef] p-5">

                  <div className="rounded-lg border border-[#e5e5e7] bg-[#f8f8f9] p-4 text-center">

                    <div className="text-sm font-medium text-[#55555a]">
                      {safeMarket.isResolved
                        ? 'This market is closed'
                        : 'Trading is currently unavailable'}
                    </div>

                  </div>

                </div>
              )}

              {/* RESOLVE */}

              {canResolveMarket && (
                <div className="border-t border-[#eeeeef] p-5">

                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#99999d]">
                    Market management
                  </div>

                  <ResolveModalButton
                    marketId={resolvedMarketId}
                    token={token}
                    market={market}
                    onResolved={handleMarketResolved}
                    disabled={!token}
                    className="w-full text-xs"
                  />

                </div>
              )}

              {/* CLOSE DATE */}

              <div className="border-t border-[#eeeeef] px-5 py-4">

                <div className="flex items-center justify-between text-xs">

                  <span className="text-[#99999d]">
                    Closes
                  </span>

                  <span className="font-medium text-[#55555a]">
                    {safeMarket.isResolved
                      ? 'Closed'
                      : formatResolutionDate(
                          safeMarket.resolutionDateTime
                        )}
                  </span>

                </div>

              </div>

            </div>

          </aside>

        </div>

      </div>

      {/* =========================================
          MOBILE TRADE CTA
      ========================================= */}

      {shouldShowTradeButtons && (
        <TradeCTA
          onClick={toggleBetModal}
          disabled={!token}
        />
      )}

      <div className="h-28 md:hidden" />

      {/* =========================================
          TRADE MODAL
      ========================================= */}

      {showBetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">

          <div className="relative w-full max-w-[430px] overflow-hidden rounded-xl border border-[#dedee1] bg-white text-[#171719] shadow-2xl">

            <div className="border-b border-[#eeeeef] px-5 py-4">

              <div className="pr-10">

                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#99999d]">
                  Trade
                </div>

                <div className="mt-1 text-sm font-semibold text-[#171719]">
                  {safeMarket.questionTitle}
                </div>

              </div>

            </div>

            <div className="p-1">

              <TradeTabs
                marketId={resolvedMarketId}
                market={safeMarket}
                token={token}
                onTransactionSuccess={
                  handleTransactionSuccess
                }
              />

            </div>

            <button
              type="button"
              onClick={toggleBetModal}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-lg text-[#88888d] transition hover:bg-[#f1f1f2] hover:text-[#171719]"
              aria-label="Close"
            >
              ×
            </button>

          </div>

        </div>
      )}

    </div>
  );
}

export default MarketDetailsTable;