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
                <span className="shrink-0 text-lg text-gray-400" aria-hidden="true">âŒ•</span>

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
                        Ã—
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
                    {' '}for <span className="font-semibold text-gray-900">â€œ{query}â€</span>
                </div>
            )}
        </div>
    );
};

export default GlobalSearchBar;
