import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useRef } from 'react';
import { Play } from '@phosphor-icons/react/Play';
import { PlayCircle } from '@phosphor-icons/react/PlayCircle';
import { Pause } from '@phosphor-icons/react/Pause';
import { Radio } from '@phosphor-icons/react/Radio';
import { SpeakerHigh } from '@phosphor-icons/react/SpeakerHigh';
import { SpeakerSlash } from '@phosphor-icons/react/SpeakerSlash';
import { CloudArrowDown } from '@phosphor-icons/react/CloudArrowDown';
import { CheckCircle } from '@phosphor-icons/react/CheckCircle';
import { CircleNotch } from '@phosphor-icons/react/CircleNotch';
import { Broadcast } from '@phosphor-icons/react/Broadcast';
import { Rss } from '@phosphor-icons/react/Rss';
import { MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass';
import { useTranslation } from 'react-i18next';
import { useAudio } from '../contexts/AudioContext';
import { useDownloadQueue } from '../contexts/DownloadQueueContext';
import { useContentSources } from '../contexts/ContentSourcesContext';
import { isAudioCached } from '../lib/audioCache';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import * as api from '../lib/api';
const { API_BASE } = api;

interface PodcastItem {
  id: string;
  title: string;
  description?: string;
  episode?: string;
  category?: string;
  duration?: string;
  audio_url?: string;
  published?: string;
}

interface RadioStation {
  id: string;
  name?: string;
  country?: string;
  bitrate?: number;
  [key: string]: unknown;
}

interface CountryItem {
  code: string;
  flag?: string;
}

interface PodcastCategory {
  id: string;
  name: string;
}

const DiscoverPage = () => {
  const { t } = useTranslation();
  const [podcastSort, setPodcastSort] = useState<'latest' | 'popular'>('latest');
  const [mobileTab, setMobileTab] = useState<'radio' | 'podcasts'>('radio');
  const [podcasts, setPodcasts] = useState<PodcastItem[]>([]);
  const [podcastLoading, setPodcastLoading] = useState(true);
  const [podcastSearch, setPodcastSearch] = useState('');
  const [podcastCategory, setPodcastCategory] = useState('all');
  const [podcastCategories, setPodcastCategories] = useState<PodcastCategory[]>([]);
  const [expandedPodcast, setExpandedPodcast] = useState<string | null>(null);
  const [, setTrendingTopics] = useState<unknown[]>([]);
  const [cachedPodcasts, setCachedPodcasts] = useState<Record<string, boolean>>({});
  const { playTrack, playRadioStation, togglePlay, currentTrack, isPlaying, volume, setVolume } = useAudio();
  const { addToQueue, addSingleToQueue, queue, isProcessing } = useDownloadQueue();
  const { getTotalSources, getBroadcastSources } = useContentSources();

  const [radioStations, setRadioStations] = useState<RadioStation[]>([]);
  const [radioLoading, setRadioLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState('NG');
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);

  const checkCachedPodcasts = async (podcastList: PodcastItem[]) => {
    const cached: Record<string, boolean> = {};
    for (const podcast of podcastList) {
      cached[podcast.id] = await isAudioCached(podcast.id);
    }
    setCachedPodcasts(cached);
  };

  useEffect(() => {
    api.get('api/radio/countries')
      .then(res => res.json())
      .then((data: CountryItem[]) => setCountries(data))
      .catch(console.error);

    api.get('api/discover/trending')
      .then(res => res.json())
      .then(setTrendingTopics)
      .catch(console.error);

    api.get('api/podcasts/categories')
      .then(res => res.json())
      .then((data: PodcastCategory[]) => setPodcastCategories(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setPodcastLoading(true);
    api.get(`api/podcasts?sort=${podcastSort}&limit=8`)
      .then(res => res.json())
      .then((data: PodcastItem[]) => {
        setPodcasts(data);
        checkCachedPodcasts(data);
        setPodcastLoading(false);
      })
      .catch(() => setPodcastLoading(false));
  }, [podcastSort]);

  useEffect(() => {
    setRadioLoading(true);
    api.get(`api/radio/stations?country=${selectedCountry}&limit=10`)
      .then(res => res.json())
      .then((data: RadioStation[]) => {
        setRadioStations(data);
        if (data.length > 0) {
          setCurrentStation(data[0]);
        }
        setRadioLoading(false);
      })
      .catch(() => setRadioLoading(false));
  }, [selectedCountry]);

  const handlePlayPodcast = (podcast: PodcastItem) => {
    playTrack({ id: podcast.id, title: podcast.title, summary: podcast.description });
  };

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePodcastSearch = (q: string) => {
    setPodcastSearch(q);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!q.trim()) return;
    searchTimeoutRef.current = setTimeout(() => {
      setPodcastLoading(true);
      api.get(`api/podcasts/search?q=${encodeURIComponent(q)}&limit=10`)
        .then(res => res.json())
        .then((data: PodcastItem[]) => { setPodcasts(data); checkCachedPodcasts(data); setPodcastLoading(false); })
        .catch(() => setPodcastLoading(false));
    }, 500);
  };

  const displayedPodcasts = podcastCategory === 'all'
    ? podcasts
    : podcasts.filter(p => (p.category || '').toLowerCase() === podcastCategory);

  const isInQueue = (podcastId: string) => {
    return queue.some(item => item.id === podcastId && item.status !== 'complete' && item.status !== 'failed');
  };

  const getQueueProgress = (podcastId: string) => {
    const item = queue.find(item => item.id === podcastId);
    return item?.progress ?? 0;
  };

  const handleDownloadPodcast = async (podcast: PodcastItem) => {
    if (!podcast.audio_url) {
      alert('This podcast does not have a downloadable audio file yet.');
      return;
    }
    const proxyUrl = `${API_BASE}/api/podcasts/${podcast.id}/audio`;
    addSingleToQueue({
      id: podcast.id,
      audioUrl: proxyUrl,
      title: podcast.title,
      source: podcast.episode,
      duration: podcast.duration,
      type: 'podcast',
    });
  };

  const handleDownloadAll = async () => {
    const podcastsToDownload = podcasts.filter(p => p.audio_url && !cachedPodcasts[p.id] && !isInQueue(p.id));
    if (podcastsToDownload.length === 0) return;
    const items = podcastsToDownload.map(podcast => ({
      id: podcast.id,
      audioUrl: `${API_BASE}/api/podcasts/${podcast.id}/audio`,
      title: podcast.title,
      source: podcast.episode,
      duration: podcast.duration,
      type: 'podcast' as const,
    }));
    addToQueue(items);
  };

  useEffect(() => {
    const completedIds = queue.filter(item => item.status === 'complete').map(item => item.id);
    if (completedIds.length > 0) {
      setCachedPodcasts(prev => {
        const updated = { ...prev };
        completedIds.forEach(id => { updated[id] = true; });
        return updated;
      });
    }
  }, [queue]);

  const isRadioActive = isPlaying && currentTrack?.type === 'radio';
  const activeStationId = currentTrack?.type === 'radio' ? currentTrack?.station?.id : null;

  const playRadio = (station: RadioStation) => {
    setCurrentStation(station);
    playRadioStation(station as Parameters<typeof playRadioStation>[0]);
  };

  const toggleRadio = () => {
    if (!currentStation) return;
    if (isRadioActive && activeStationId === currentStation.id) {
      togglePlay();
      return;
    }
    playRadioStation(currentStation as Parameters<typeof playRadioStation>[0]);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
  };

  return (
    <main className="flex-1 flex flex-col bg-background-dark relative min-h-0 overflow-hidden" data-testid="discover-page">
      <Helmet>
        <title>Discover — NARVO</title>
        <meta property="og:title" content="Discover — NARVO" />
        <meta property="og:description" content="Explore trending stories, podcasts, and radio across Africa." />
        <meta name="twitter:card" content="summary" />
      </Helmet>
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll pb-32 md:pb-0">
        <header className="shrink-0 px-4 md:px-8 py-4 narvo-border-b bg-background-dark">
          <h1 className="font-display text-lg md:text-xl font-bold uppercase tracking-tight text-content hidden lg:block">
            {t('discover.title', 'DISCOVER')}
          </h1>
          <div className="lg:hidden flex items-center narvo-border">
            <button
              onClick={() => setMobileTab('radio')}
              className={`flex-1 h-10 flex items-center justify-center gap-2 mono-ui text-[11px] font-bold transition-colors ${
                mobileTab === 'radio' ? 'bg-primary text-background-dark' : 'text-forest hover:text-content'
              }`}
              data-testid="tab-radio"
            >
              <Radio className="w-3.5 h-3.5" /> RADIO
            </button>
            <button
              onClick={() => setMobileTab('podcasts')}
              className={`flex-1 h-10 flex items-center justify-center gap-2 mono-ui text-[11px] font-bold transition-colors ${
                mobileTab === 'podcasts' ? 'bg-primary text-background-dark' : 'text-forest hover:text-content'
              }`}
              data-testid="tab-podcasts"
            >
              <Rss className="w-3.5 h-3.5" /> PODCASTS
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3">
          <div className={`lg:col-span-2 lg:narvo-border-r h-full ${mobileTab !== 'podcasts' ? 'hidden lg:block' : ''}`}>
            <div className="flex flex-col gap-3 p-4 md:p-8 narvo-border-b bg-surface/10 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg md:text-2xl font-bold uppercase text-content tracking-tight">{t('discover.deep_dive_podcasts')}</h3>
                <div className="flex items-center gap-2 md:gap-4">
                  {podcasts.some(p => p.audio_url && !cachedPodcasts[p.id] && !isInQueue(p.id)) && (
                    <button
                      onClick={handleDownloadAll}
                      disabled={isProcessing}
                      className={`flex items-center gap-1.5 px-3 py-1 mono-ui text-[10px] md:text-[11px] font-bold narvo-border ${isProcessing ? 'text-forest cursor-wait' : 'text-primary hover:bg-primary hover:text-background-dark'} transition-colors`}
                      data-testid="download-all-btn"
                    >
                      <CloudArrowDown className="w-3 h-3" />
                      <span className="hidden sm:inline">DOWNLOAD ALL</span>
                    </button>
                  )}
                  <div className="flex items-center gap-1 md:gap-2 p-1 narvo-border bg-background-dark">
                    <button
                      onClick={() => { setPodcastSort('latest'); setPodcastSearch(''); }}
                      className={`px-2 md:px-4 py-1 mono-ui text-[11px] md:text-[12px] font-bold ${podcastSort === 'latest' ? 'bg-primary text-background-dark' : 'text-forest hover:text-content'}`}
                    >
                      {t('discover.latest')}
                    </button>
                    <button
                      onClick={() => { setPodcastSort('popular'); setPodcastSearch(''); }}
                      className={`px-2 md:px-4 py-1 mono-ui text-[11px] md:text-[12px] ${podcastSort === 'popular' ? 'bg-primary text-background-dark font-bold' : 'text-forest hover:text-content'}`}
                    >
                      {t('discover.popular')}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-forest" />
                  <input
                    type="text"
                    value={podcastSearch}
                    onChange={(e) => handlePodcastSearch(e.target.value)}
                    placeholder="SEARCH_EPISODES..."
                    className="w-full h-8 pl-8 pr-3 narvo-border bg-background-dark mono-ui text-[11px] text-content placeholder:text-forest/40 focus:border-primary focus:outline-none"
                    data-testid="podcast-search-input"
                  />
                </div>
                <div className="flex gap-1 overflow-x-auto custom-scroll pb-1">
                  <button
                    onClick={() => setPodcastCategory('all')}
                    className={`px-2 py-1 mono-ui text-[10px] font-bold whitespace-nowrap shrink-0 ${podcastCategory === 'all' ? 'bg-primary text-background-dark' : 'narvo-border text-forest hover:text-content'}`}
                    data-testid="podcast-cat-all"
                  >ALL</button>
                  {podcastCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setPodcastCategory(cat.id)}
                      className={`px-2 py-1 mono-ui text-[10px] font-bold whitespace-nowrap shrink-0 ${podcastCategory === cat.id ? 'bg-primary text-background-dark' : 'narvo-border text-forest hover:text-content'}`}
                      data-testid={`podcast-cat-${cat.id}`}
                    >{cat.name.toUpperCase()}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[1px] bg-forest/20">
              {podcastLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-background-dark p-4 md:p-8 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <Skeleton className="w-16 h-5" />
                      <Skeleton className="w-12 h-4" />
                    </div>
                    <Skeleton variant="text" className="w-full h-6" />
                    <Skeleton variant="text" className="w-3/4 h-4" />
                    <Skeleton variant="text" className="w-1/2 h-4" />
                  </div>
                ))
              ) : displayedPodcasts.length === 0 ? (
                <div className="col-span-2 p-8 text-center">
                  <EmptyState
                    variant={podcastSearch ? 'search' : 'default'}
                    title={podcastSearch ? "NO RESULTS FOUND" : "NO PODCASTS AVAILABLE"}
                    description={podcastSearch ? `No episodes match "${podcastSearch}"` : "Check back later for new content"}
                  />
                </div>
              ) : (
                displayedPodcasts.map((podcast) => {
                  const inQueue = isInQueue(podcast.id);
                  const isCached = cachedPodcasts[podcast.id];
                  const downloadProgress = getQueueProgress(podcast.id);
                  const isExpanded = expandedPodcast === podcast.id;

                  return (
                    <button
                      type="button"
                      key={podcast.id}
                      className={`bg-background-dark p-4 md:p-8 flex flex-col gap-4 md:gap-6 transition-colors group cursor-pointer border border-transparent w-full text-left ${isExpanded ? 'bg-primary/5 border-primary/30 col-span-1 md:col-span-2' : 'hover:bg-surface/40 hover:border-forest/50'}`}
                      onClick={() => setExpandedPodcast(isExpanded ? null : podcast.id)}
                      aria-label={isExpanded ? `Collapse ${podcast.title}` : `Expand ${podcast.title}`}
                      data-testid={`podcast-${podcast.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="mono-ui text-[10px] md:text-[11px] text-primary border border-primary/30 px-1.5 md:px-2 py-0.5 bg-primary/10 font-bold">
                            {podcast.episode}
                          </span>
                          {isCached && (
                            <span className="flex items-center gap-1 mono-ui text-[9px] text-green-500">
                              <CheckCircle weight="fill" className="w-3 h-3" />
                              OFFLINE
                            </span>
                          )}
                        </div>
                        <span className="mono-ui text-[10px] md:text-[11px] text-forest">{podcast.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="mono-ui text-[9px] text-forest bg-surface/50 px-1.5 py-0.5 uppercase">{podcast.category}</span>
                      </div>
                      <h4 className="font-display text-base md:text-xl font-bold uppercase tracking-tight text-content leading-tight group-hover:text-primary transition-colors">
                        {podcast.title}
                      </h4>
                      <p className="text-[12px] md:text-xs text-forest font-mono leading-relaxed opacity-70 line-clamp-3">
                        {podcast.description}
                      </p>
                      {isExpanded && (
                        <div className="narvo-border bg-surface/10 p-4 space-y-3" data-testid={`podcast-detail-${podcast.id}`}>
                          <div className="flex flex-wrap gap-3 mono-ui text-[10px] text-forest">
                            <span>CATEGORY: <span className="text-primary">{(podcast.category || 'GENERAL').toUpperCase()}</span></span>
                            <span>DURATION: <span className="text-content">{podcast.duration}</span></span>
                            {podcast.published && <span>PUBLISHED: <span className="text-content">{podcast.published}</span></span>}
                          </div>
                          <p className="mono-ui text-[11px] text-forest/80 leading-relaxed">{podcast.description}</p>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePlayPodcast(podcast); }}
                              className="flex items-center gap-2 bg-primary text-background-dark px-4 py-2 mono-ui text-[11px] font-bold hover:bg-white transition-colors"
                              data-testid={`play-detail-${podcast.id}`}
                            >
                              <Play className="w-4 h-4" fill="currentColor" />
                              PLAY_NOW
                            </button>
                            {podcast.audio_url && !isCached && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDownloadPodcast(podcast); }}
                                disabled={inQueue}
                                className="flex items-center gap-2 narvo-border px-4 py-2 mono-ui text-[11px] font-bold text-forest hover:text-primary hover:border-primary transition-colors"
                              >
                                <CloudArrowDown className="w-4 h-4" />
                                {inQueue ? `${downloadProgress}%` : 'DOWNLOAD'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="mt-auto pt-4 md:pt-6 flex items-center justify-between">
                        <button
                          onClick={() => handlePlayPodcast(podcast)}
                          className="flex items-center gap-2 md:gap-3 text-primary mono-ui text-[11px] md:text-[12px] font-bold hover:text-content transition-colors"
                          data-testid={`play-podcast-${podcast.id}`}
                        >
                          <PlayCircle className="w-5 h-5 md:w-6 md:h-6" />
                          <span>[ LISTEN_CMD ]</span>
                        </button>
                        {podcast.audio_url && !isCached && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadPodcast(podcast); }}
                            disabled={inQueue}
                            className={`flex items-center gap-1.5 mono-ui text-[10px] md:text-[11px] ${inQueue ? 'text-primary cursor-wait' : 'text-forest hover:text-primary'} transition-colors`}
                            data-testid={`download-podcast-${podcast.id}`}
                            title="Download for offline"
                          >
                            {inQueue ? (
                              <>
                                <CircleNotch className="w-4 h-4 animate-spin" />
                                <span>{downloadProgress}%</span>
                              </>
                            ) : (
                              <>
                                <CloudArrowDown className="w-4 h-4" />
                                <span className="hidden md:inline">OFFLINE</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className={`lg:col-span-1 flex flex-col h-full bg-surface/5 ${mobileTab !== 'radio' ? 'hidden lg:flex' : ''}`}>
            <div className="p-4 md:p-8 narvo-border-b bg-background-dark sticky top-0 z-10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-lg md:text-2xl font-bold uppercase text-content tracking-tight">{t('discover.radio_garden')}</h3>
                <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] mono-ui text-primary font-bold bg-primary/10 px-1.5 md:px-2 py-0.5 narvo-border">
                  <span className={`w-1.5 h-1.5 ${isRadioActive ? 'bg-primary animate-pulse' : 'bg-forest'}`} />
                  {isRadioActive ? 'LIVE' : 'STANDBY'}
                </div>
              </div>
              <p className="mono-ui text-[11px] md:text-[12px] text-forest">AFRICAN_BROADCAST_RELAY_v2.1</p>
            </div>

            <div className="p-4 narvo-border-b flex flex-wrap gap-2">
              {countries.slice(0, 6).map(c => (
                <button
                  key={c.code}
                  onClick={() => setSelectedCountry(c.code)}
                  className={`px-2 py-1 mono-ui text-[10px] md:text-[11px] font-bold transition-all ${
                    selectedCountry === c.code
                      ? 'bg-primary text-background-dark'
                      : 'narvo-border text-forest hover:text-content hover:border-white'
                  }`}
                  data-testid={`radio-country-${c.code}`}
                >
                  {c.flag} {c.code}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll pb-32 md:pb-4">
              {radioLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-3 narvo-border bg-surface/10">
                      <Skeleton variant="text" className="w-32 h-4 mb-2" />
                      <Skeleton variant="text" className="w-24 h-3" />
                    </div>
                  ))}
                </div>
              ) : radioStations.length === 0 ? (
                <div className="p-4 flex flex-col items-center justify-center min-h-[200px]">
                  <div className="narvo-border bg-surface/10 p-6 text-center">
                    <Radio className="w-8 h-8 text-forest mx-auto mb-3 opacity-50" />
                    <h4 className="font-display text-sm font-bold text-content uppercase mb-2">NO STATIONS FOUND</h4>
                    <p className="mono-ui text-[11px] text-forest">Try selecting another country.</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {radioStations.map(station => (
                    <button
                      key={station.id}
                      onClick={() => playRadio(station)}
                      className={`w-full p-3 narvo-border text-left transition-all group ${
                        station.id === activeStationId && isRadioActive
                          ? 'bg-primary/10 border-primary'
                          : 'bg-surface/10 hover:bg-surface/30 hover:border-forest'
                      }`}
                      data-testid={`radio-station-${station.id}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-display text-xs md:text-sm font-bold uppercase truncate ${
                          station.id === activeStationId && isRadioActive ? 'text-primary' : 'text-content'
                        }`}>
                          {station.name}
                        </span>
                        {station.id === activeStationId && isRadioActive && (
                          <Radio className="w-3 h-3 text-primary animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mono-ui text-[10px] text-forest">
                        <span>{station.country}</span>
                        {(station.bitrate ?? 0) > 0 && <span>• {station.bitrate}kbps</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 md:p-6 bg-background-dark/90 backdrop-blur-md narvo-border-t">
              <div className="flex items-center justify-between mb-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <span className="mono-ui text-[10px] md:text-[11px] text-forest font-bold block">{t('discover.now_playing')}</span>
                  <p className="mono-ui text-[12px] md:text-xs text-content font-bold uppercase truncate">
                    {currentStation?.name || t('discover.select_station')}
                  </p>
                  <p className="mono-ui text-[10px] text-forest">
                    {currentStation?.country || '--'} {currentStation?.bitrate ? `// ${currentStation.bitrate}kbps` : ''}
                  </p>
                </div>
                <button
                  onClick={toggleRadio}
                  disabled={!currentStation}
                  className={`w-12 h-12 md:w-14 md:h-14 narvo-border flex items-center justify-center transition-colors ${
                    currentStation
                      ? 'bg-primary text-background-dark hover:bg-white'
                      : 'bg-surface/20 text-forest cursor-not-allowed'
                  }`}
                  data-testid="radio-play-btn"
                >
                  {isRadioActive && activeStationId === currentStation?.id ? (
                    <Pause className="w-5 h-5 md:w-6 md:h-6" />
                  ) : (
                    <Play className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <SpeakerSlash className="w-4 h-4 text-forest" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-1 bg-forest/30 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary"
                  data-testid="radio-volume"
                />
                <SpeakerHigh className="w-4 h-4 text-primary" />
              </div>
            </div>
          </div>
        </div>

        <section className="px-4 md:px-8 py-3 narvo-border-t bg-surface/5">
          <div className="flex items-center justify-center gap-4 md:gap-8 mono-ui text-[10px] md:text-[11px] text-forest">
            <span className="flex items-center gap-1.5">
              <Rss className="w-3 h-3 text-primary" />
              {getTotalSources()} FEEDS
            </span>
            <span className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-primary" />
              {(getBroadcastSources() as { type?: string }[]).filter(s => s.type === 'Radio').length} RADIO
            </span>
            <span className="flex items-center gap-1.5">
              <Broadcast className="w-3 h-3 text-primary" />
              {(getBroadcastSources() as { type?: string }[]).filter(s => s.type === 'TV').length} TV
            </span>
          </div>
        </section>
      </div>
    </main>
  );
};

export default DiscoverPage;
