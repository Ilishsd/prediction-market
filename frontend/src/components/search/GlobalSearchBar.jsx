import React, { useState, useEffect } from 'react';
import { searchMarkets } from '../../api/marketsApi';

const GlobalSearchBar = ({
    onSearchResults,
    currentStatus,
    isSearching,
    setIsSearching,
    tagSlug = '',
    externalQuery,
    hideInput = false,
    onClear,
}) => {
    const [query, setQuery] = useState(externalQuery || '');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (externalQuery !== undefined) {
            setQuery(externalQuery);
        }
    }, [externalQuery]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.trim().length > 0) {
                performSearch(query.trim());
            } else {
                onSearchResults(null);
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query, currentStatus, tagSlug]);

    const performSearch = async (searchQuery) => {
        setLoading(true);
        setIsSearching(true);

        try {
            const results = await searchMarkets(searchQuery, currentStatus, 20, { tagSlug });
            onSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            onSearchResults({ error: 'جستجو انجام نشد. دوباره تلاش کنید.' });
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setQuery('');
        onSearchResults(null);
        setIsSearching(false);
        if (onClear) onClear();
    };

    return (
        <div className="w-full">
            {!hideInput && (
                <div className="relative mb-4">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="جستجوی بازارها"
                        className="w-full rounded-full border border-transparent bg-slate-100 py-3 pl-10 pr-11 text-sm text-slate-900 placeholder-slate-500 outline-none transition focus:border-slate-300 focus:bg-white"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
                            title="پاک کردن"
                        >
                            ✕
                        </button>
                    )}
                </div>
            )}
            {isSearching && query && (
                <div className="mb-3 flex items-center gap-3 py-2 text-sm text-slate-500">
                    <span>
                        نتایج جستجو برای <span className="font-semibold text-slate-900">«{query}»</span>
                        {tagSlug ? <> در برچسب <span className="font-semibold text-emerald-600">{tagSlug}</span></> : null}
                    </span>
                    {loading && (
                        <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-slate-500" />
                    )}
                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                        پاک کردن
                    </button>
                </div>
            )}
        </div>
    );
};

export default GlobalSearchBar;