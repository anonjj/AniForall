const https = require('https');

const QUERY = `
query ($search: String) {
  Media(search: $search, type: ANIME) {
    id
    coverImage { extraLarge color }
    bannerImage
    averageScore
    genres
  }
}
`;

function post(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: 'graphql.anilist.co',
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function searchAnilistByTitle(title) {
  const json = await post({ query: QUERY, variables: { search: title } });
  const media = json?.data?.Media;
  if (!media) return null;
  return {
    anilist_id:   media.id,
    cover_image:  media.coverImage?.extraLarge || null,
    banner_image: media.bannerImage || null,
    accent_color: media.coverImage?.color || null,
    score:        media.averageScore || null,
    genres:       (media.genres || []).join(','),
  };
}

module.exports = { searchAnilistByTitle };
