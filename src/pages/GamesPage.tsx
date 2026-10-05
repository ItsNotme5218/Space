import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import localforage from "localforage";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { Loading } from "../components/Loading";
import { ItemGrid, type GridItem } from "../components/grid";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { resolveNavigation } from "../runtime/navigation";
import { SpaceGames } from "../utils/games";
import { emptySavedGamesState, normalizeComparableUrl } from "../utils/playback";

type GameSource = "local" | "imported" | "saved";

interface GameItem {
  id: string;
  title: string;
  image: string;
  url: string;
  tags: string[];
  source: GameSource;
  hostLabel: string;
  searchValue: string;
}

interface RawGame {
  id: string;
  name: string;
  image?: string;
  url?: string;
  tags?: string[];
}

const importedMapBatchSize = 600;
const pillStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
};

const spaceGames = new SpaceGames();
let cachedLocalGames: GameItem[] | null = null;
let cachedImportedGames: GameItem[] | null = null;
let localGamesPromise: Promise<GameItem[]> | null = null;
let importedGamesPromise: Promise<GameItem[]> | null = null;
let importedGamesCachePromise: Promise<GameItem[] | null> | null = null;

const importedGamesCacheStore = localforage.createInstance({
  name: "space-games-cache",
  storeName: "imported-games",
});
const importedGamesCacheKey = "mapped-imported-games-v1";

interface ImportedGamesCachePayload {
  items: GameItem[];
  updatedAt: number;
}

const categoryConfig = [
  { id: "all", label: "All" },
  { id: "popular", label: "Popular" },
  { id: "multiplayer", label: "Multiplayer" },
  { id: "horror", label: "Horror" },
  { id: "emulator", label: "Emulators" },
] as const;

const normalizeImage = (image?: string) => {
  switch (true) {
    case !image:
      return "";
    case image!.startsWith("//"):
      return `https:${image}`;
    default:
      return image!;
  }
};

const normalizeTagValue = (tag: string) => {
  const value = tag.trim().toLowerCase();

  switch (true) {
    case value.includes("featured"):
    case value.includes("trending"):
    case value.includes("popular"):
    case value.includes("top rated"):
    case value.includes("top-rated"):
    case value === "hot":
      return "popular";
    case value.includes("multiplayer"):
    case value.includes("multi-player"):
    case value.includes("multi player"):
    case value.includes("co-op"):
    case value.includes("coop"):
    case value.includes("versus"):
    case value.includes("2 player"):
    case value.includes("two player"):
    case value.includes(".io"):
      return "multiplayer";
    case value.includes("horror"):
    case value.includes("scary"):
    case value.includes("spooky"):
    case value.includes("creepy"):
    case value.includes("haunted"):
    case value.includes("zombie"):
      return "horror";
    case value.includes("emulator"):
    case value.includes("emulation"):
    case value.includes("retro"):
    case value.includes("arcade"):
    case value.includes("game boy"):
    case value.includes("gameboy"):
    case value.includes("nintendo"):
    case value.includes("nes"):
    case value.includes("snes"):
    case value.includes("n64"):
    case value.includes("gba"):
    case value.includes("gbc"):
    case value.includes("sega"):
    case value.includes("playstation"):
    case value.includes("ps1"):
      return "emulator";
    default:
      return value;
  }
};

const inferGameTags = (game: RawGame) => {
  const sourceValues = [game.name ?? "", game.url ?? "", ...(game.tags ?? [])];
  const nextTags: string[] = [];

  for (const value of sourceValues) {
    const normalizedValue = normalizeTagValue(value);

    switch (normalizedValue) {
      case "popular":
      case "multiplayer":
      case "horror":
      case "emulator":
        nextTags.push(normalizedValue);
        break;
      default:
        break;
    }
  }

  return Array.from(new Set(nextTags));
};

const normalizeTags = (tags?: string[]) =>
  Array.from(
    new Set(["all", ...(tags ?? [])].filter(Boolean).map((tag) => normalizeTagValue(tag))),
  );

const getHostLabel = (url: string) => {
  switch (true) {
    case !url:
      return "library";
    default:
      try {
        return new URL(url).hostname.replace(/^www\./, "");
      } catch {
        return "library";
      }
  }
};

const getTagLabel = (tag: string) => {
  switch (tag) {
    case "popular":
      return "Popular";
    case "multiplayer":
      return "Multiplayer";
    case "horror":
      return "Horror";
    case "emulator":
      return "Emulator";
    case "all":
      return "All";
    default:
      return tag.charAt(0).toUpperCase() + tag.slice(1);
  }
};

const mapGame = (game: RawGame, source: GameSource): GameItem => {
  const url = game.url ?? "";
  const tags = normalizeTags([...(game.tags ?? []), ...inferGameTags(game)]);
  const hostLabel = getHostLabel(url);

  return {
    id: game.id,
    title: game.name,
    image: normalizeImage(game.image),
    url,
    tags,
    source,
    hostLabel,
    searchValue: [game.name, url, source, hostLabel, ...tags].join(" ").toLowerCase(),
  };
};

const toGridItem = (game: GameItem): GridItem => ({
  id: game.id,
  title: game.title,
  url: game.url,
  image: game.image,
  categories: game.tags.filter((tag) => tag !== "all").map(getTagLabel),
  sourceLabel: game.source,
  source: game.source === "saved" ? "saved" : "default",
});

const waitForIdle = () =>
  new Promise<void>((resolve) => {
    switch (typeof window.requestIdleCallback) {
      case "function":
        window.requestIdleCallback(() => resolve(), {
          timeout: 120,
        });
        return;
      default:
        window.setTimeout(resolve, 16);
    }
  });

const filterImportedGames = (games: GameItem[], existingIds: Set<string>) =>
  games.filter((game) => !existingIds.has(game.id));

const readMappedImportedGamesCache = (existingIds: Set<string>) => {
  switch (Boolean(cachedImportedGames)) {
    case true:
      return Promise.resolve(filterImportedGames(cachedImportedGames!, existingIds));
    default:
      break;
  }

  switch (Boolean(importedGamesCachePromise)) {
    case true:
      return importedGamesCachePromise!.then((games) =>
        games ? filterImportedGames(games, existingIds) : null,
      );
    default:
      break;
  }

  importedGamesCachePromise = importedGamesCacheStore
    .getItem<ImportedGamesCachePayload>(importedGamesCacheKey)
    .then((payload) => {
      importedGamesCachePromise = null;

      switch (Array.isArray(payload?.items)) {
        case true:
          cachedImportedGames = payload!.items;
          return cachedImportedGames;
        default:
          return null;
      }
    })
    .catch((error) => {
      importedGamesCachePromise = null;
      console.warn("[GamesPage] imported games cache read failed", error);
      return null;
    });

  return importedGamesCachePromise.then((games) =>
    games ? filterImportedGames(games, existingIds) : null,
  );
};

const writeMappedImportedGamesCache = (games: GameItem[]) => {
  const payload: ImportedGamesCachePayload = {
    items: games,
    updatedAt: Date.now(),
  };

  return importedGamesCacheStore.setItem(importedGamesCacheKey, payload).catch((error) => {
    console.warn("[GamesPage] imported games cache write failed", error);
  });
};

const fetchMappedLocalGames = () => {
  switch (Boolean(cachedLocalGames)) {
    case true:
      return Promise.resolve(cachedLocalGames!);
    default:
      break;
  }

  switch (Boolean(localGamesPromise)) {
    case true:
      return localGamesPromise!;
    default:
      break;
  }

  localGamesPromise = spaceGames
    .fetchLocalGamesList()
    .then((localList) => {
      cachedLocalGames = localList.map((game) => mapGame(game, "local"));
      return cachedLocalGames;
    })
    .catch((error) => {
      localGamesPromise = null;
      throw error;
    });

  return localGamesPromise;
};

const fetchMappedImportedGames = (
  existingIds: Set<string>,
  options: { forceRefresh?: boolean } = {},
) => {
  switch (Boolean(cachedImportedGames) && !options.forceRefresh) {
    case true:
      return Promise.resolve(filterImportedGames(cachedImportedGames!, existingIds));
    default:
      break;
  }

  switch (Boolean(importedGamesPromise)) {
    case true:
      return importedGamesPromise!;
    default:
      break;
  }

  importedGamesPromise = (async () => {
    const importedList = await spaceGames.fetchImportedGamesList(existingIds);
    const nextImportedGames: GameItem[] = [];

    for (let startIndex = 0; startIndex < importedList.length; startIndex += importedMapBatchSize) {
      nextImportedGames.push(
        ...importedList
          .slice(startIndex, startIndex + importedMapBatchSize)
          .map((game) => mapGame(game, "imported")),
      );
      await waitForIdle();
    }

    cachedImportedGames = nextImportedGames;
    void writeMappedImportedGamesCache(nextImportedGames);
    return filterImportedGames(nextImportedGames, existingIds);
  })()
    .catch((error) => {
      importedGamesPromise = null;
      throw error;
    })
    .then((games) => {
      importedGamesPromise = null;
      return games;
    });

  return importedGamesPromise;
};

export const dispatchGameLaunch = (item: GridItem) => {
  if (!item.url) return;
  const target = resolveNavigation(item.url, window.location.origin);
  window.dispatchEvent(
    new CustomEvent("space:navigate", {
      detail: {
        url: target.url,
        target: "new",
        title: item.title,
        image: item.image,
        tags: item.categories,
        kind: "game",
        librarySource: item.source === "saved" ? "custom" : "default",
      },
    }),
  );
};

export const GamesPage = () => {
  const [localGames, setLocalGames] = useState<GameItem[]>(() => cachedLocalGames ?? []);
  const [importedGames, setImportedGames] = useState<GameItem[]>(() => cachedImportedGames ?? []);
  const [isLoading, setIsLoading] = useState(() => !cachedLocalGames);
  const [isImportedLoading, setIsImportedLoading] = useState(() => !cachedImportedGames);
  const [searchValue, setSearchValue] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [savedGamesState, setSavedGamesState] = useLocalStorage(
    "savedGamesState",
    emptySavedGamesState,
  );

  const deferredSearchValue = useDeferredValue(searchValue.trim().toLowerCase());
  const isInitialLibraryLoading = isLoading && localGames.length === 0;

  const removedGameUrls = useMemo(
    () => new Set(savedGamesState.removedGameUrls.map((url) => normalizeComparableUrl(url))),
    [savedGamesState.removedGameUrls],
  );
  const savedUrls = useMemo(
    () => new Set(savedGamesState.customGames.map((game) => normalizeComparableUrl(game.url))),
    [savedGamesState.customGames],
  );
  const savedGames = useMemo(
    () =>
      savedGamesState.customGames
        .filter((game) => game.url)
        .map((game) =>
          mapGame(
            {
              id: game.id,
              name: game.name,
              image: game.image,
              url: game.url,
              tags: game.tags,
            },
            "saved",
          ),
        ),
    [savedGamesState.customGames],
  );

  useEffect(() => {
    let cancelled = false;

    fetchMappedLocalGames()
      .then((nextLocalGames) => {
        switch (cancelled) {
          case true:
            return;
          default:
            break;
        }

        setLocalGames(nextLocalGames);
        setIsLoading(false);

        const localIds = new Set(nextLocalGames.map((game) => game.id));
        readMappedImportedGamesCache(localIds)
          .then((cachedImported) => {
            switch (cancelled) {
              case true:
                return null;
              default:
                break;
            }

            switch (cachedImported !== null) {
              case true:
                startTransition(() => {
                  setImportedGames(cachedImported!);
                });
                setIsImportedLoading(false);
                break;
              default:
                setIsImportedLoading(true);
            }

            return fetchMappedImportedGames(localIds, {
              forceRefresh: cachedImported !== null,
            });
          })
          .then((nextImportedGames) => {
            switch (cancelled) {
              case true:
                return;
              default:
                switch (Boolean(nextImportedGames)) {
                  case false:
                    return;
                  default:
                    break;
                }
                startTransition(() => {
                  setImportedGames(nextImportedGames!);
                });
                setIsImportedLoading(false);
            }
          })
          .catch((error) => {
            switch (cancelled) {
              case true:
                return;
              default:
                console.warn("[GamesPage] imported games failed", error);
                setIsImportedLoading(false);
            }
          });
      })
      .catch((error) => {
        switch (cancelled) {
          case true:
            return;
          default:
            console.error("[GamesPage] local games failed", error);
            setLocalGames([]);
            setImportedGames([]);
            setIsLoading(false);
            setIsImportedLoading(false);
            break;
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const allGames = useMemo(() => {
    const merged = [...savedGames, ...localGames, ...importedGames];
    return merged.filter((game) => !removedGameUrls.has(normalizeComparableUrl(game.url)));
  }, [importedGames, localGames, removedGameUrls, savedGames]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const game of allGames) {
      for (const tag of game.tags) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }

    return counts;
  }, [allGames]);

  const visibleCategories = useMemo(
    () =>
      categoryConfig.filter(
        (category) => category.id === "all" || (categoryCounts[category.id] ?? 0) > 0,
      ),
    [categoryCounts],
  );

  const items = useMemo<GridItem[]>(() => {
    const byCategory =
      activeCategoryId === "all"
        ? allGames
        : allGames.filter((game) => game.tags.includes(activeCategoryId));

    const searched =
      deferredSearchValue.length > 0
        ? byCategory.filter((game) => game.searchValue.includes(deferredSearchValue))
        : byCategory;

    return searched.map(toGridItem);
  }, [activeCategoryId, allGames, deferredSearchValue]);

  const isItemSaved = useCallback(
    (item: GridItem) => Boolean(item.url) && savedUrls.has(normalizeComparableUrl(item.url!)),
    [savedUrls],
  );

  const handleLaunch = useCallback((item: GridItem) => {
    dispatchGameLaunch(item);
  }, []);

  const handleToggleSave = useCallback(
    (item: GridItem) => {
      if (!item.url) return;
      const url = item.url;
      const normalized = normalizeComparableUrl(url);

      setSavedGamesState((previous) => {
        const alreadySaved = previous.customGames.some(
          (game) => normalizeComparableUrl(game.url) === normalized,
        );

        if (alreadySaved) {
          return {
            ...previous,
            customGames: previous.customGames.filter(
              (game) => normalizeComparableUrl(game.url) !== normalized,
            ),
          };
        }

        return {
          customGames: [
            {
              id: `${item.id}-${Date.now()}`,
              name: item.title,
              url,
              image: item.image,
              tags: item.categories,
              addedAt: Date.now(),
            },
            ...previous.customGames,
          ],
          removedGameUrls: previous.removedGameUrls.filter(
            (removed) => normalizeComparableUrl(removed) !== normalized,
          ),
        };
      });
    },
    [setSavedGamesState],
  );

  const header = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/92 md:text-3xl">Games</h1>
          <p className="mt-0.5 text-sm text-white/42">
            {items.length.toLocaleString()} games ready to play.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-56 items-center gap-2 rounded-full px-3" style={pillStyle}>
            <Search className="h-4 w-4 shrink-0 text-white/40" />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search games"
              spellCheck={false}
              className="w-full bg-transparent text-[13px] text-white/85 outline-none placeholder:text-white/30"
                style={{ caretColor: "var(--color-primary)" }}
            />
            {searchValue ? (
              <button
                onClick={() => setSearchValue("")}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white/40 transition-colors hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div
            className="flex h-9 items-center rounded-full px-3"
            style={pillStyle}
            title={isImportedLoading ? "Loading imported games" : "Library ready"}
          >
            <span
              className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background: isImportedLoading ? "#fbbf24" : "#34d399",
              }}
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
              {allGames.length.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {visibleCategories.map((category) => {
          const isActive = category.id === activeCategoryId;

          return (
            <button
              key={category.id}
              onClick={() => setActiveCategoryId(category.id)}
              className="rounded-full px-3 py-1 text-[12px] font-medium transition-colors"
              style={{
                background: isActive ? "var(--color-primary)" : "var(--color-surface)",
                border: `1px solid ${isActive ? "var(--color-primary)" : "var(--color-border)"}`,
                color: isActive ? "#ffffff" : "rgba(255,255,255,0.6)",
              }}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (isInitialLibraryLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        <div className="relative h-20 w-full">
          <Loading />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="h-full w-full overflow-hidden"
    >
      <ItemGrid
        resetKey={`${activeCategoryId}-${deferredSearchValue}`}
        items={items}
        onLaunchItem={handleLaunch}
        onToggleSaveItem={handleToggleSave}
        isItemSaved={isItemSaved}
        header={header}
      />
    </motion.div>
  );
};
