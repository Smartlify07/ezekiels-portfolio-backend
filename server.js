// server.js
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

const app = express();
app.use(cors());

async function refreshAccessToken() {
  const authHeader = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    }),
  });

  const data = await response.json();
  return data.access_token;
}

app.get('/currently-playing', async (req, res) => {
  try {
    const accessToken = await refreshAccessToken();
    console.log('Access Token:', accessToken); // Debugging line to check the access token
    const nowPlaying = await fetch(
      'https://api.spotify.com/v1/me/player/currently-playing',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (nowPlaying.status === 204) {
      return res.json({ isPlaying: false });
    }

    if (!nowPlaying.ok) {
      const errorText = await nowPlaying.text();
      return res.status(nowPlaying.status).json({
        error: errorText || 'Failed to fetch currently playing track',
      });
    }

    const song = await nowPlaying.json();
    res.json({
      isPlaying: song.is_playing,
      title: song.item.name,
      artist: song.item.artists.map((a) => a.name).join(', '),
      albumArt: song.item.album.images[0].url,
      trackUrl: song.item.external_urls.spotify,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
