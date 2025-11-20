import { HttpsProxyAgent } from "https-proxy-agent";

const PROXY_URL = "http://36.110.143.55:8080";

const agent = new HttpsProxyAgent(PROXY_URL);


//    {hostname: "hilay.tv", path: "/play.m3u", agent },

export const SOURCES = [
    'https://raw.githubusercontent.com/abusaeeidx/IPTV-Scraper-Zilla/main/combined-playlist.m3u',
    'https://iptv-org.github.io/iptv/categories/sports.m3u',
]

export const ALIVE_ONLY_DEFAULT = false;
export const DEDUPE_DEFAULT = true;
export const CLEAN_BAD_PATTERNS_DEFAULT = true;
export const OUTPUT_FILE = 'out.m3u';
export const OUTPUT_DIR = 'data';
export const FILTER_GROUPS_I_DONT_LIKE_DEFAULT = true;
export const FILTER_GROUPS_FILE = 'groups_i_dont_like.txt';
