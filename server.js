const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Spotify credentials
const CLIENT_ID = 'ad7ddc4c765f4937b0acb69dce60b299';
const CLIENT_SECRET = '798fdb9ee6fe461381f058423c91d626';

// Fungsi buat dapetin access token
async function getSpotifyToken() {
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            'grant_type=client_credentials', {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
                }
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting token:', error.response?.data || error.message);
        throw error;
    }
}

// Endpoint search lagu
app.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const token = await getSpotifyToken();
        
        const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                q: query,
                type: 'track',
                limit: 1
            }
        });

        const track = response.data.tracks.items[0];
        if (!track || !track.preview_url) {
            return res.json({ 
                success: false, 
                message: 'Preview tidak tersedia untuk lagu ini' 
            });
        }

        res.json({
            success: true,
            title: track.name,
            artist: track.artists[0].name,
            preview_url: track.preview_url,
            spotify_url: track.external_urls.spotify
        });

    } catch (error) {
        console.error('Search error:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            error: error.response?.data?.error?.message || 'Internal server error' 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});