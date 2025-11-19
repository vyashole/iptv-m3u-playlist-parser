import { Playlist } from '../src';
import fs from 'node:fs';
import path from 'node:path';
import {
    FILTER_GROUPS_FILE,
    OUTPUT_DIR
} from './config.ts'

export function filterGroupsIDontLike(playlist: Playlist) { 
    const groupsIDontLikeFile = path.join(process.cwd(), OUTPUT_DIR, FILTER_GROUPS_FILE);

    const groupsIDontLike = fs.readFileSync(groupsIDontLikeFile, 'utf-8').split('\n').filter(line => line.length > 0);

    playlist = {
        ...playlist,
        items: playlist.items.filter((it) => {
            return groupsIDontLike.every(badGroup => !it.group?.includes(badGroup));
        })
    }
    
    return playlist;
}