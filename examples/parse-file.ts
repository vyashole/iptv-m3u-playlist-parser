import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import {
    parsePlaylist,
    deduplicateEntries,
    validatePlaylist,
    getHealthStatistics,
    enrichWithHealth,
    filterByHealth,
    normalizePlaylist,
    generateM3U, Playlist
} from '../src';

console.log('Happy developing ✨')

// Download M3U playlist
const playlistUrl = 'https://raw.githubusercontent.com/abusaeeidx/IPTV-Scraper-Zilla/main/combined-playlist.m3u';
const outputDir = path.join(process.cwd(), 'data');
const outputFile = path.join(outputDir, 'list.json');
const outputM3uFile = path.join(outputDir, 'out.m3u');
const allowedGroupsFile = path.join(outputDir, 'allowed_groups.txt');
const allNamesFile = path.join(outputDir, 'names.txt');
const downloadedM3uFile = path.join(outputDir, 'hilaytv.m3u');

function downloadFile(url: string, dest: string) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

function cleanBadPatterns(m3uText: string) {
    const count = (m3uText.match(/",-1/g) || []).length;

    console.log(`Found ${count} occurences of ",-1 bad pattern`);

    const m3uTextClean = m3uText.replace(/",-1/g, '" ');

    console.log("Replaced bad occurences")
    return m3uTextClean;
}

export interface ZapdosOptions {
    dedupe?: boolean;
    cleanBadPatterns?: boolean;
    sillyFilter?: boolean;
    aliveOnly?: boolean;
}

function sillyFilter(playlist: Playlist) {
    const allowedGroups = fs.readFileSync(allowedGroupsFile, 'utf-8').split('\n')
    playlist = {
        ...playlist,
        items: playlist.items.filter((it) => {
            return it.group?.[0] && allowedGroups.includes(it.group?.[0])
        })
    }
    console.log(`Silly Filtered: ${playlist.items.length}`);
    return playlist;
}

async function aliveOnly(playlist: Playlist) {
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

export async function zapdos(inputUrl: string, options: ZapdosOptions) {
    try {
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

        await downloadFile(inputUrl, downloadedM3uFile);

        let m3uText = fs.readFileSync(downloadedM3uFile, 'utf8');

        if (options.cleanBadPatterns) {
            m3uText = cleanBadPatterns(m3uText);
        }

        let playlist = normalizePlaylist(parsePlaylist(m3uText));

        console.log(`Number of parsed items: ${playlist.items.length}`);

        if (options.dedupe) {
            playlist = {
                ...playlist,
                items: deduplicateEntries(playlist.items),
            }
            console.log(`Deduplicated: ${playlist.items.length}`);
        }

        if (options.sillyFilter) {
            playlist = sillyFilter(playlist);
        }

        if (options.aliveOnly) {
            playlist = await aliveOnly(playlist);
        }


        const outputM3u = generateM3U(playlist, {
          sortByGroup: true,
          format: 'm3u'
        })

        fs.writeFileSync(outputM3uFile, outputM3u)

        return outputM3u;

    } catch (err) {
        throw err;
    }
}

async function main () {
    await zapdos(playlistUrl, {
        dedupe: true,
        cleanBadPatterns: true,
        sillyFilter: false,
        aliveOnly: false,
    })
}

main().then()