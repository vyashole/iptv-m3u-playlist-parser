const SOURCES = process.env.SOURCES
    ? process.env.SOURCES.split(",").map(s => s.trim())
    : [];

export { SOURCES };

export const ALIVE_ONLY_DEFAULT = false;
export const DEDUPE_DEFAULT = true;
export const CLEAN_BAD_PATTERNS_DEFAULT = true;
export const OUTPUT_FILE = 'out.m3u';
export const OUTPUT_DIR = 'data';
export const FILTER_GROUPS_I_DONT_LIKE_DEFAULT = true;
export const FILTER_GROUPS_FILE = 'groups_i_dont_like.txt';
