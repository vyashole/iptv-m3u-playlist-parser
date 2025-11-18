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
    generateM3U
} from '../src/index.ts';

console.log('Happy developing ✨')

// Download M3U playlist
const playlistUrl = 'https://hilay.tv/play.m3u';
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

    const m3uTextClean = m3uText.replaceAll('",-1', '" ');

    console.log("Replaced bad occurences")
    return m3uTextClean;
}

async function main() {
    try {
        await downloadFile(playlistUrl, downloadedM3uFile);

        const m3uText = fs.readFileSync(downloadedM3uFile, 'utf8');

        const m3uTextClean = cleanBadPatterns(m3uText);


        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

        const parsed = normalizePlaylist(parsePlaylist(m3uTextClean));
        console.log(`Number of parsed items: ${parsed.items.length}`);

        const deduped = {
            ...parsed,
            items: deduplicateEntries(parsed.items)
        }

        console.log(...deduped.warnings)
        console.log(`Deduplicated: ${deduped.items.length}`);

        const allowedGroups = fs.readFileSync(allowedGroupsFile, 'utf-8').split('\n')

        const groupsFiltered = {
          ...deduped,
          items: deduped.items.filter((it) => {
            return it.group?.[0] && allowedGroups.includes(it.group?.[0])
          })
        }

        console.log(`Filtered: ${groupsFiltered.items.length}`);



        // // Validate all streams with progress tracking
        // const health = await validatePlaylist(deduped, {
        //     timeout: 5000,
        //     concurrency: 20,
        //     method: 'HEAD',
        //     retries: 1,
        //     onProgress: (done, total) => console.log(`Checking alive ${done}/${total}`)
        // });

        // // Get statistics
        // const stats = getHealthStatistics(health);
        // console.log(`Found ${stats.alive}/${stats.total} alive`);
        // console.log(`Average latency: ${stats.averageLatency.toFixed(0)}ms`);

        // // Filter to alive streams only
        // const enriched = enrichWithHealth(deduped, health);
        // const aliveOnly = filterByHealth(enriched, true)

        fs.writeFileSync(outputFile, JSON.stringify(groupsFiltered, null, 2));
        console.log(`Parsed playlist written to ${outputFile}`);

        const outputM3u = generateM3U(groupsFiltered, {
          sortByGroup: true,
          format: 'm3u'
        })

        fs.writeFileSync(outputM3uFile, outputM3u)

    } catch (err) {
        console.error('Error:', err);
    }
}

main().then(() => {
});