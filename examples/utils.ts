import https from "https";
import { 
    deduplicateEntries, 
    enrichWithHealth, 
    filterByHealth, 
    getHealthStatistics, 
    Playlist, 
    validatePlaylist,
} from "../src";

export type Url = string | https.RequestOptions | URL;

export interface FetchedPlaylist {
    url: string;
    text: string;
}

export async function fetchUrl(url: Url): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        reject(new Error(`Bad status code: ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        console.log(`Received ${chunk.length} bytes`);
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

export async function getPlaylists(urls: Url[]): Promise<FetchedPlaylist[]> {
  const results = await Promise.allSettled(
    urls.map(url => fetchUrl(url))
  );

  const playlists: FetchedPlaylist[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      playlists.push({ url: String(urls[index]), text: result.value });
    } else {
      console.error(`Error fetching source ${index} : ${result.reason.message}`);
    }
  });

  return playlists;
}

/**
 * Derive a source name from a URL by taking the last path segment and
 * stripping a trailing .m3u / .m3u8 extension.
 *
 * e.g. https://iptv-org.github.io/iptv/categories/sports.m3u  ->  sports
 *      https://iptv-org.github.io/iptv/languages/hin.m3u      ->  hin
 */
export function getSourceName(url: string): string {
    let pathname: string;
    try {
        pathname = new URL(url).pathname;
    } catch {
        pathname = url;
    }

    const segments = pathname.split("/").filter(Boolean);
    let last = segments[segments.length - 1] ?? "unknown";
    last = last.replace(/\?.*$/, ""); // drop any stray query string
    last = last.replace(/\.(m3u|m3u8)$/i, "");
    return last || "unknown";
}

/**
 * Regroup a playlist by source: removes all existing group information from
 * every entry and assigns a single group derived from the source name.
 */
export function regroupPlaylistBySource(playlist: Playlist, sourceName: string): Playlist {
    return {
        ...playlist,
        items: playlist.items.map((item) => {
            const { "group-title": _removed, ...restAttrs } = item.attrs;
            return {
                ...item,
                group: [sourceName],
                attrs: restAttrs,
            };
        }),
    };
}

export function cleanBadPatterns(m3uText: string) {
    const count = (m3uText.match(/",-1/g) || []).length;

    console.log(`Found ${count} occurences of ",-1 bad pattern`);

    return m3uText.replace(/",-1/g, '" ');
}

export async function aliveOnly(playlist: Playlist) {
    // Validate all streams with progress tracking
    const health = await validatePlaylist(playlist, {
        timeout: 5000,
        concurrency: 20,
        method: 'HEAD',
        retries: 1,
        onProgress: (done, total) => console.log(`Checking alive ${done}/${total}`)
    });

    // Get statistics
    const stats = getHealthStatistics(health);
    console.log(`Found ${stats.alive}/${stats.total} alive`);
    console.log(`Average latency: ${stats.averageLatency.toFixed(0)}ms`);

    // Filter to alive streams only
    const enriched = enrichWithHealth(playlist, health);
    return filterByHealth(enriched, true)
}

export function dedupe(playlist: Playlist) {
    return {
        ...playlist,
        items: deduplicateEntries(playlist.items),
    }
}