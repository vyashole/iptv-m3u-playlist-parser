import fs from "node:fs";
import path from "node:path";
import { generateM3U, mergePlaylists, normalizePlaylist, parsePlaylist, Playlist } from "../src";
import { ALIVE_ONLY_DEFAULT, CLEAN_BAD_PATTERNS_DEFAULT, DEDUPE_DEFAULT, FILTER_GROUPS_I_DONT_LIKE_DEFAULT, OUTPUT_DIR, OUTPUT_FILE, REGROUP_BY_SOURCE_DEFAULT, SOURCES } from "./config";
import { aliveOnly, cleanBadPatterns, dedupe, getPlaylists, regroupPlaylistBySource, getSourceName, Url } from "./utils";
import { filterGroupsIDontLike } from "./group_filter";

export interface ZapdosOptions {
    cleanBadPatterns?: boolean;
    dedupe?: boolean;
    aliveOnly?: boolean;
    filterGroupsIDontLike?: boolean;
    regroupBySource?: boolean;
}

export async function zapdos(urls: Url[], options: ZapdosOptions) {

    console.log(`Fetching playlists from ${urls.length} sources...`);
    const fetched = await getPlaylists(urls);
    console.log(`Fetched ${fetched.length} playlists from ${urls.length} sources`);

    const playlists = fetched.map(({ url, text }) => {
        let m3uText = text;
        if (options.cleanBadPatterns) {
            m3uText = cleanBadPatterns(m3uText);
        }
        let playlist = normalizePlaylist(parsePlaylist(m3uText));
        if (options.regroupBySource) {
            const sourceName = getSourceName(url);
            playlist = regroupPlaylistBySource(playlist, sourceName);
            console.log(`Regrouped source ${url} -> group "${sourceName}"`);
        }
        return playlist;
    });

    let playlist = mergePlaylists(playlists);
    console.log(`Number of parsed items: ${playlist.items.length}`);

    if (options.dedupe) {
        playlist = dedupe(playlist);
        console.log(`Deduplicated: ${playlist.items.length}`);
    }

    if (options.aliveOnly) {
        playlist = await aliveOnly(playlist);
        console.log(`Alive only: ${playlist.items.length}`);
    }

    if (options.filterGroupsIDontLike) {
        playlist = filterGroupsIDontLike(playlist);
        console.log(`Groups I don't like filtered: ${playlist.items.length}`);
    }

    return generateM3U(playlist, {
      sortByGroup: true,
      format: 'm3u'
    });

}

async function main () {
    const playlistM3u = await zapdos(SOURCES, {
        dedupe: DEDUPE_DEFAULT,
        cleanBadPatterns: CLEAN_BAD_PATTERNS_DEFAULT,
        aliveOnly: ALIVE_ONLY_DEFAULT,
        filterGroupsIDontLike: FILTER_GROUPS_I_DONT_LIKE_DEFAULT,
        regroupBySource: REGROUP_BY_SOURCE_DEFAULT
    });

    const outputDir = path.join(process.cwd(), OUTPUT_DIR);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const outputM3uFile = path.join(outputDir, OUTPUT_FILE);

    fs.writeFileSync(outputM3uFile, playlistM3u);
    
    console.log(`Saved output to ${outputM3uFile}`);
}

main().then()
