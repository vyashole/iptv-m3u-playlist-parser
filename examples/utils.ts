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

export async function fetchUrl(url: Url): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        reject(new Error(`Bad status code: ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        const urlString = typeof url === 'string' ? url : url.hostname || 'unknown';
        console.log(`Received ${chunk.length} bytes from ${urlString}`);
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

export async function getPlaylists(urls: Url[]): Promise<string[]> {
  const results = await Promise.allSettled(
    urls.map(url => fetchUrl(url))
  );

  const playlists: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      playlists.push(result.value);
    } else {
      console.error(`Error fetching ${urls[index]}: ${result.reason.message}`);
    }
  });

  return playlists;
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