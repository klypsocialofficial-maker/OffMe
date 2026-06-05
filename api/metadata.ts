import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req: Request, res: Response) {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  let targetUrl = url;
  if (!targetUrl.startsWith('http')) {
    targetUrl = `https://${targetUrl}`;
  }

  // Detect YouTube video
  const ytRegex = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = targetUrl.match(ytRegex);
  const ytVideoId = (match && match[2] && match[2].length === 11) ? match[2] : null;

  if (ytVideoId) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      try {
        const ytApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ytVideoId}&key=${apiKey}`;
        const ytResponse = await axios.get(ytApiUrl, { timeout: 4000 });
        if (ytResponse.data && ytResponse.data.items && ytResponse.data.items.length > 0) {
          const item = ytResponse.data.items[0];
          const snippet = item.snippet;
          const stats = item.statistics;
          const thumbUrl = snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`;
          
          return res.json({
            title: snippet.title || 'YouTube Video',
            description: snippet.description || '',
            image: thumbUrl,
            url: targetUrl,
            siteName: 'YouTube',
            isVideo: true,
            videoId: ytVideoId,
            views: stats?.viewCount || '',
            likes: stats?.likeCount || '',
            channelTitle: snippet.channelTitle || '',
          });
        }
      } catch (err) {
        console.error('Error fetching from YouTube Data API, falling back...', err);
      }
    }

    // Try YouTube oEmbed as fallback
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytVideoId}&format=json`;
      const oembedResponse = await axios.get(oembedUrl, { timeout: 3000 });
      const data = oembedResponse.data;
      return res.json({
        title: data.title || 'YouTube Video',
        description: `Uploaded by ${data.author_name || 'YouTube'}`,
        image: data.thumbnail_url || `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`,
        url: targetUrl,
        siteName: 'YouTube',
        isVideo: true,
        videoId: ytVideoId,
        channelTitle: data.author_name || 'YouTube',
      });
    } catch (e) {
      // Basic fallback metadata
      return res.json({
        title: 'YouTube Video',
        description: 'Watch this video on YouTube.',
        image: `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`,
        url: targetUrl,
        siteName: 'YouTube',
        isVideo: true,
        videoId: ytVideoId,
      });
    }
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
      },
      timeout: 5000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const metadata = {
      title: $('meta[property="og:title"]').attr('content') || $('title').text() || '',
      description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || '',
      url: targetUrl,
      siteName: $('meta[property="og:site_name"]').attr('content') || '',
    };

    res.json(metadata);
  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
}
