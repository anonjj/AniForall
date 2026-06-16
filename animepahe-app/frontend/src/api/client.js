import axios from 'axios';

const client = axios.create({ baseURL: '/api' });

export const searchAnime    = (q, page = 1) => client.get(`/search?q=${encodeURIComponent(q)}&page=${page}`);
export const getAiring      = (page = 1)    => client.get(`/airing?page=${page}`);
export const getSeries      = (session)     => client.get(`/series/${session}`);
export const getEpisodes    = (session, sort = 'episode_asc', page = 1) =>
                                               client.get(`/episodes/${session}?sort=${sort}&page=${page}`);
export const getStream      = (animeSession, epSession) =>
                                               client.get(`/stream/${animeSession}/${epSession}`);
export const getWatchlist   = ()            => client.get('/watchlist');
export const addToWatchlist = (data)        => client.post('/watchlist', data);
export const updateWatchlistStatus = (session, status) =>
                                               client.patch(`/watchlist/${session}`, { status });
export const removeFromWatchlist = (session) => client.delete(`/watchlist/${session}`);
export const getProgress    = (seriesSession) => client.get(`/progress/${seriesSession}`);
export const getProgressSummary = ()          => client.get('/progress/summary');
export const updateProgress = (data)          => client.post('/progress', data);

export const getAnimeMetadata = (session, title) =>
                                               client.get(`/metadata/${session}?title=${encodeURIComponent(title)}`);

export const getCookieStatus  = ()       => client.get('/admin/cookies');
export const injectCookies    = (cookies) => client.post('/admin/cookies', { cookies });
export const clearCookies     = ()       => client.delete('/admin/cookies');
