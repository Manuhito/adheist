import React, { useState, useEffect, useRef } from "react";
import { Input } from "./input";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Send,
    BarChart2,
    Globe,
    Video,
    PlaneTakeoff,
    AudioLines,
    Plus,
} from "lucide-react";

function useDebounce(value, delay = 500) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

const allActions = [
    {
        id: "1",
        label: "Book tickets",
        icon: <PlaneTakeoff className="h-4 w-4 text-blue-500" />,
        description: "Operator",
        short: "⌘K",
        end: "Agent",
    },
    {
        id: "2",
        label: "Summarize",
        icon: <BarChart2 className="h-4 w-4 text-orange-500" />,
        description: "gpt-4o",
        short: "⌘cmd+p",
        end: "Command",
    },
    {
        id: "3",
        label: "Screen Studio",
        icon: <Video className="h-4 w-4 text-purple-500" />,
        description: "gpt-4o",
        short: "",
        end: "Application",
    },
    {
        id: "4",
        label: "Talk to Jarvis",
        icon: <AudioLines className="h-4 w-4 text-green-500" />,
        description: "gpt-4o voice",
        short: "",
        end: "Active",
    },
    {
        id: "5",
        label: "Translate",
        icon: <Globe className="h-4 w-4 text-blue-500" />,
        description: "gpt-4o",
        short: "",
        end: "Command",
    },
];

const FAVICON_STATUS_STORAGE_KEY = "discover_favicon_status";
const ICON_PREFETCH_LIMIT = 12;

const loadStoredStatuses = () => {
    if (typeof window === "undefined") {
        return [];
    }

    try {
        const stored = window.sessionStorage.getItem(FAVICON_STATUS_STORAGE_KEY);
        if (!stored) {
            return [];
        }
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
            return parsed;
        }
        return [];
    } catch (error) {
        console.warn("Failed to parse favicon status cache", error);
        return [];
    }
};

const faviconStatusCache = new Map(loadStoredStatuses());

const persistStatuses = () => {
    if (typeof window === "undefined") {
        return;
    }
    const entries = Array.from(faviconStatusCache.entries());
    try {
        window.sessionStorage.setItem(
            FAVICON_STATUS_STORAGE_KEY,
            JSON.stringify(entries)
        );
    } catch (error) {
        console.warn("Failed to persist favicon status cache", error);
    }
};

const getLabelInitial = (label) => {
    if (!label || typeof label !== "string") {
        return "";
    }
    const trimmed = label.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : "";
};

function LazyFavicon({ iconUrl, labelInitial, forceLoad }) {
    const containerRef = useRef(null);
    const cachedStatus = faviconStatusCache.get(iconUrl);
    const [status, setStatus] = useState(cachedStatus || "idle");
    const [shouldLoad, setShouldLoad] = useState(() => {
        if (!iconUrl) {
            return false;
        }
        if (cachedStatus === "loaded") {
            return true;
        }
        return Boolean(forceLoad);
    });

    useEffect(() => {
        if (forceLoad) {
            setShouldLoad(true);
        }
    }, [forceLoad]);

    useEffect(() => {
        if (!iconUrl || shouldLoad || status === "loaded" || status === "error") {
            return;
        }

        const node = containerRef.current;
        if (!node) {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            const [entry] = entries;
            if (entry && entry.isIntersecting) {
                setShouldLoad(true);
                observer.disconnect();
            }
        }, { rootMargin: "64px" });

        observer.observe(node);

        return () => observer.disconnect();
    }, [iconUrl, shouldLoad, status]);

    useEffect(() => {
        if (!iconUrl || !shouldLoad || status === "loaded" || status === "error") {
            return;
        }

        setStatus("loading");
    }, [iconUrl, shouldLoad, status]);

    const handleLoad = () => {
        faviconStatusCache.set(iconUrl, "loaded");
        persistStatuses();
        setStatus("loaded");
    };

    const handleError = () => {
        faviconStatusCache.set(iconUrl, "error");
        persistStatuses();
        setStatus("error");
    };

    if (!iconUrl || status === "error") {
        return (
            <div
                ref={containerRef}
                className="w-6 h-6 rounded-sm overflow-hidden bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground"
            >
                {labelInitial}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="w-6 h-6 rounded-sm overflow-hidden bg-muted flex items-center justify-center"
        >
            {(status === "loaded" || shouldLoad) ? (
                <img
                    src={iconUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    onLoad={handleLoad}
                    onError={handleError}
                />
            ) : (
                <span className="text-xs font-medium text-muted-foreground">
                    {labelInitial}
                </span>
            )}
        </div>
    );
}

function ActionSearchBar({ actions = allActions, onSearch, onActionSelect, onKeywordSearch, onRequestAdvertiser, hideIcons = false, clearInput = false, placeholder = "Search for a brand name or keywords...." }) {
    const [query, setQuery] = useState("");
    const [result, setResult] = useState(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [selectedAction, setSelectedAction] = useState(null);
    const debouncedQuery = useDebounce(query, 200);

    // Clear input when clearInput prop changes to true
    useEffect(() => {
        if (clearInput) {
            setQuery("");
            setIsFocused(false);
            setResult(null);
        }
    }, [clearInput]);

    useEffect(() => {
        if (!isFocused) {
            setResult(null);
            return;
        }

        if (!debouncedQuery) {
            setResult({ actions: actions });
            return;
        }

        const normalizedQuery = debouncedQuery.toLowerCase().trim();
        const filteredActions = actions.filter((action) => {
            const searchableText = action.label.toLowerCase();
            return searchableText.includes(normalizedQuery);
        });

        // Create keyword search item as first option
        const keywordSearchItem = {
            id: "keyword-search",
            label: `"${debouncedQuery}" keyword search`,
            icon: <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />,
            description: "",
            short: "",
            end: "Search",
            isKeywordSearch: true
        };

        // Create "Request a new advertiser" item when no results
        const requestAdvertiserItem = {
            id: "request-advertiser",
            label: "Request a new advertiser",
            icon: <Plus className="h-4 w-4 text-gray-400 dark:text-gray-500" />,
            description: "",
            short: "",
            end: "",
            isRequestAdvertiser: true
        };

        // Combine keyword search with filtered actions, add request button if no results
        const allResults = filteredActions.length === 0
            ? [keywordSearchItem, requestAdvertiserItem]
            : [keywordSearchItem, ...filteredActions];
        setResult({ actions: allResults });

        // Notify parent component about search
        if (onSearch) {
            onSearch(debouncedQuery);
        }
    }, [debouncedQuery, isFocused, onSearch, actions]);

    const handleInputChange = (e) => {
        setQuery(e.target.value);
        setIsTyping(true);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && query.trim() && onKeywordSearch) {
            e.preventDefault();
            onKeywordSearch(query.trim());
            setIsFocused(false);
        }
    };

    const container = {
        hidden: { opacity: 0, height: 0 },
        show: {
            opacity: 1,
            height: "auto",
            transition: {
                height: {
                    duration: 0.2,
                },
                // staggerChildren removed for faster rendering
            },
        },
        exit: {
            opacity: 0,
            height: 0,
            transition: {
                height: {
                    duration: 0.2,
                },
                opacity: {
                    duration: 0.15,
                },
            },
        },
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.15,
            },
        },
        exit: {
            opacity: 0,
            y: -5,
            transition: {
                duration: 0.1,
            },
        },
    };

    // Reset selectedAction when focusing the input
    const handleFocus = () => {
        setSelectedAction(null);
        setIsFocused(true);
    };

    return (
        <div className="w-full max-w-xl mx-auto">
            <div className="relative flex flex-col justify-start items-center">
                <div className="w-full max-w-sm sticky top-0 bg-background z-10 pt-2 pb-1">
                    <div className="relative">
                        <Input
                            type="text"
                            placeholder={placeholder}
                            value={query}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onFocus={handleFocus}
                            onBlur={() =>
                                setTimeout(() => setIsFocused(false), 200)
                            }
                            className="pl-3 pr-9 py-1.5 h-9 text-sm rounded-lg focus-visible:ring-offset-0"
                        />
                        {!hideIcons && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4">
                                <AnimatePresence mode="popLayout">
                                    {query.length > 0 ? (
                                        <motion.div
                                            key="send"
                                            initial={{ y: -20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: 20, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Send className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="search"
                                            initial={{ y: -20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: 20, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full max-w-sm relative">
                    <AnimatePresence>
                        {isFocused && result && !selectedAction && (
                            <motion.div
                                className="absolute top-0 left-0 w-full border rounded-md shadow-lg overflow-hidden dark:border-gray-800 bg-white dark:bg-black mt-1 z-[9999] max-h-80"
                                style={{ zIndex: 9999 }}
                                variants={container}
                                initial="hidden"
                                animate="show"
                                exit="exit"
                            >
                                <motion.ul className="overflow-y-auto max-h-80">
                                    {result.actions.map((action, index) => (
                                        <React.Fragment key={action.id}>
                                            <motion.li
                                                className="px-3 py-2 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-zinc-900 cursor-pointer rounded-md"
                                                variants={item}
                                                layout
                                                onClick={() => {
                                                    // Handle "Request a new advertiser" click
                                                    if (action.isRequestAdvertiser) {
                                                        if (onRequestAdvertiser) {
                                                            onRequestAdvertiser();
                                                        }
                                                        return;
                                                    }

                                                    setSelectedAction(action);
                                                    if (onActionSelect) {
                                                        onActionSelect(action);
                                                    } else if (onSearch) {
                                                        onSearch(action.label);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center gap-2 justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className={action.isKeywordSearch ? "text-gray-400 dark:text-gray-500" : "text-gray-500"}>
                                                            {action.isKeywordSearch ? (
                                                                <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                            ) : action.icon ? (
                                                                action.icon
                                                            ) : action.iconUrl ? (
                                                                <LazyFavicon
                                                                    iconUrl={action.iconUrl}
                                                                    labelInitial={action.labelInitial || getLabelInitial(action.label)}
                                                                    forceLoad={index < ICON_PREFETCH_LIMIT}
                                                                />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-sm overflow-hidden bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                                                                    {action.labelInitial || getLabelInitial(action.label)}
                                                                </div>
                                                            )}
                                                        </span>
                                                        <span className={action.isKeywordSearch
                                                            ? "text-xs text-gray-500 dark:text-gray-400"
                                                            : "text-sm font-medium text-gray-900 dark:text-gray-100"
                                                        }>
                                                            {action.label}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {action.description}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400">
                                                        {action.short}
                                                    </span>
                                                    <span className={action.isKeywordSearch
                                                        ? "text-xs text-gray-400 dark:text-gray-500 text-right"
                                                        : "text-xs text-gray-400 text-right"
                                                    }>
                                                        {action.end}
                                                    </span>
                                                </div>
                                            </motion.li>
                                            {/* Add separator after keyword search item or request advertiser item */}
                                            {(action.isKeywordSearch || action.isRequestAdvertiser) && index < result.actions.length - 1 && (
                                                <div className="border-t border-gray-200 dark:border-gray-700 mx-2 my-1"></div>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </motion.ul>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export { ActionSearchBar, allActions };
