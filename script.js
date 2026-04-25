// ============================================================
// 🔑 KONFIGURASI TAMBAHAN
// ============================================================
const SUPABASE_URL = "https://vtwcjyyjzvyznezzbydq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0d2NqeXlqenZ5em5lenpieWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5OTk2NDIsImV4cCI6MjA5MjU3NTY0Mn0.Q_XXJJWldMCw4EScC7u-DLY0oW7uwt8NqRJxfYUJxUk";
const SOUNDCLOUD_API_URL = "https://kaizenapi.my.id/api/downloader/soundcloud";
const CORS_PROXY = "https://cors-anywhere.herokuapp.com/"; // Bisa diganti

// ============================================================
// 🎵 FUNGSI DOWNLOAD & UPLOAD
// ============================================================

// Fungsi buat download file dari URL
async function downloadSong(streamUrl, title) {
    try {
        showToast(`Mendownload "${title}"...`, 'fas fa-download fa-spin');
        
        // Pake CORS proxy biar bisa download
        const response = await fetch(`${CORS_PROXY}${streamUrl}`);
        if (!response.ok) throw new Error("Gagal download");
        
        const blob = await response.blob();
        
        // Buat nama file unik
        const fileName = `songs/${Date.now()}_${title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
        
        // Upload ke Supabase Storage
        const formData = new FormData();
        formData.append('file', blob, fileName);
        
        const uploadResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/songs/${fileName.split('/').pop()}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'apikey': SUPABASE_ANON_KEY
            },
            body: blob
        });
        
        if (!uploadResponse.ok) throw new Error("Gagal upload");
        
        // Dapetin public URL
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/songs/${fileName.split('/').pop()}`;
        
        showToast(`Berhasil menyimpan "${title}"`, 'fas fa-check-circle');
        return publicUrl;
        
    } catch (error) {
        console.error("Download/upload error:", error);
        showToast(`Gagal menyimpan lagu, pake stream_url biasa`, 'fas fa-exclamation-circle');
        return null;
    }
}

// ============================================================
// 🎵 FUNGSI SOUNDCLOUD (DENGAN UPLOAD)
// ============================================================

async function searchSoundCloud(query) {
    try {
        showToast(`Mencari "${query}"...`, 'fas fa-circle-notch fa-spin');
        
        const response = await fetch(`${SOUNDCLOUD_API_URL}?query=${encodeURIComponent(query)}`, {
            headers: { "accept": "application/json" }
        });
        
        if (!response.ok) throw new Error("Gagal mencari lagu");
        
        const data = await response.json();
        
        if (!data.status || !data.result || data.result.length === 0) {
            throw new Error("Lagu tidak ditemukan");
        }
        
        return data.result;
    } catch (error) {
        console.error(error);
        showToast(`Gagal mencari: ${error.message}`, 'fas fa-exclamation-circle');
        return [];
    }
}

function selectSong(song) {
    const permalink = song.url || song.permalink_url || song.link || song.permalink;
    
    selectedSongData = {
        title: song.title,
        artist: song.artist,
        stream_url: song.stream_url,
        artwork: song.artwork,
        duration_seconds: song.duration_seconds,
        permalink_url: permalink,
        need_upload: true  // Tandain perlu diupload nanti
    };
    
    document.getElementById('songTitle').value = song.title;
    document.getElementById('songArtist').value = song.artist;
    
    showToast(`Lagu "${song.title}" dipilih!`, 'fas fa-check-circle');
}

// Update submit handler pake upload
document.getElementById('submitSongfes').addEventListener('click', async () => {
    let title = document.getElementById('songTitle').value.trim();
    const artist = document.getElementById('songArtist').value.trim();
    
    if (!title) { 
        showToast('Judul lagu harus diisi!', 'fas fa-exclamation-circle'); 
        return; 
    }
    
    const from = songAnonState ? 'Anonim' : (document.getElementById('songName').value.trim() || 'Anonim');
    const msg = document.getElementById('songMsgReq').value.trim();
    const to = document.getElementById('songTo').value.trim();
    
    let finalStreamUrl = selectedSongData?.stream_url;
    let uploadUrl = null;
    
    // Kalo perlu upload, lakukan download & upload ke storage
    if (selectedSongData && selectedSongData.need_upload && selectedSongData.stream_url) {
        uploadUrl = await downloadSong(selectedSongData.stream_url, title);
        if (uploadUrl) {
            finalStreamUrl = uploadUrl;
        }
    }
    
    const post = { 
        type: 'songfes', 
        from, 
        to: to || null, 
        msg: msg || null, 
        mood: null, 
        title, 
        artist: artist || null, 
        reactions: { '❤️': 0, '💬': 0, '🎧': 0 },
        soundcloud_data: selectedSongData ? {
            stream_url: finalStreamUrl,
            artwork: selectedSongData.artwork,
            duration: selectedSongData.duration_seconds,
            permalink_url: selectedSongData.permalink_url,
            is_uploaded: uploadUrl ? true : false  // Tandain udah diupload
        } : null
    };
    
    await savePost(post);
    
    document.getElementById('songTitle').value = ''; 
    document.getElementById('songArtist').value = ''; 
    document.getElementById('songMsgReq').value = ''; 
    document.getElementById('songTo').value = ''; 
    document.getElementById('songMsgChar').textContent = '0/280'; 
    document.getElementById('songName').value = '';
    selectedSongData = null;
});

// Fungsi play pake uploaded file
function playSongFromPost(post, buttonElement = null) {
    if (!post.soundcloud_data || !post.soundcloud_data.stream_url) {
        showToast("Data lagu tidak tersedia", "fas fa-exclamation-circle");
        return;
    }
    
    const streamUrl = post.soundcloud_data.stream_url;
    const title = post.title;
    const artist = post.artist;
    const isUploaded = post.soundcloud_data.is_uploaded;
    
    // Kalo udah diupload ke storage, langsung play (pasti permanen)
    if (isUploaded) {
        playDirectUrl(streamUrl, title, artist, buttonElement);
    } else {
        // Kalo belum, coba refresh stream_url dulu
        playStreamUrl(streamUrl, title, artist, buttonElement, post.soundcloud_data.permalink_url);
    }
}

function playDirectUrl(streamUrl, title, artist, buttonElement = null) {
    if (!streamUrl) {
        showToast("Stream URL tidak tersedia", "fas fa-exclamation-circle");
        return;
    }
    
    if (currentAudio && !currentAudio.paused && currentAudio.src === streamUrl) {
        currentAudio.pause();
        if (activePlayButton) {
            activePlayButton.innerHTML = '<i class="fas fa-play"></i> Putar';
        }
        activePlayButton = null;
        showToast(`⏸️ Dipause: ${title}`, 'fas fa-pause');
        return;
    }
    
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.remove();
        if (activePlayButton) {
            activePlayButton.innerHTML = '<i class="fas fa-play"></i> Putar';
        }
        currentAudio = null;
    }
    
    const audio = new Audio(streamUrl);
    audio.autoplay = true;
    currentAudio = audio;
    
    if (buttonElement) {
        buttonElement.innerHTML = '<i class="fas fa-pause"></i> Pause';
        activePlayButton = buttonElement;
    }
    
    audio.addEventListener('ended', () => {
        audio.remove();
        if (currentAudio === audio) currentAudio = null;
        if (activePlayButton) {
            activePlayButton.innerHTML = '<i class="fas fa-play"></i> Putar';
            activePlayButton = null;
        }
        showToast(`🎵 Selesai: ${title}`, 'fas fa-check');
    });
    
    audio.addEventListener('error', (e) => {
        console.error("Audio error:", e);
        showToast("Gagal memutar lagu", "fas fa-exclamation-circle");
        audio.remove();
        if (currentAudio === audio) currentAudio = null;
        if (activePlayButton) {
            activePlayButton.innerHTML = '<i class="fas fa-play"></i> Putar';
            activePlayButton = null;
        }
    });
    
    document.body.appendChild(audio);
    showToast(`🎵 Memutar: ${title} (Permanen)`, 'fas fa-play');
}