// ============================================================
// 🔑 SUPABASE & API CONFIGURATION
// ============================================================
const SUPABASE_URL = "https://vtwcjyyjzvyznezzbydq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0d2NqeXlqenZ5em5lenpieWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5OTk2NDIsImV4cCI6MjA5MjU3NTY0Mn0.Q_XXJJWldMCw4EScC7u-DLY0oW7uwt8NqRJxfYUJxUk";
const YOUTUBE_API_KEY = "AIzaSyCTW69xlCOgtjonm_WdtWjMfoyGg29mI10";
const SOUNDCLOUD_API_URL = "https://kaizenapi.my.id/api/downloader/soundcloud";

// ============================================================
// 📦 GLOBAL VARIABLES
// ============================================================
let posts = [];
let comments = {};
let currentMoodMenf = '';
let menfAnonState = true;
let songAnonState = true;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let isOpen = false;
let openCommentPostId = null;
let toastTimer;
let selectedSongData = null;

// ============================================================
// 📡 DATABASE FUNCTIONS
// ============================================================
async function loadPosts() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/posts?select=*&order=created_at.desc`, {
            headers: { 
                "apikey": SUPABASE_ANON_KEY, 
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}` 
            }
        });
        if (!response.ok) throw new Error("Gagal load data");
        const data = await response.json();
        posts = data;
        await loadAllComments();
        renderFeed();
        updateFeedCount();
    } catch (error) {
        console.error(error);
        showToast("Gagal load data", "fas fa-exclamation-circle");
    }
}

async function loadAllComments() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/comments?order=created_at.asc`, {
            headers: { 
                "apikey": SUPABASE_ANON_KEY, 
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}` 
            }
        });
        if (!response.ok) throw new Error("Gagal load comments");
        const data = await response.json();
        comments = {};
        data.forEach(comment => {
            if (!comments[comment.post_id]) comments[comment.post_id] = [];
            comments[comment.post_id].push(comment);
        });
    } catch (error) {
        console.error(error);
    }
}

async function saveComment(postId, commentText, fromUser) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "apikey": SUPABASE_ANON_KEY, 
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}` 
            },
            body: JSON.stringify({ 
                post_id: postId, 
                comment: commentText, 
                from_user: fromUser 
            })
        });
        if (!response.ok) throw new Error("Gagal simpan komentar");
        
        const currentCount = posts.find(p => p.id === postId)?.comment_count || 0;
        await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${postId}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json", 
                "apikey": SUPABASE_ANON_KEY, 
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}` 
            },
            body: JSON.stringify({ comment_count: currentCount + 1 })
        });
        
        showToast("Komentar terkirim!", "fas fa-check-circle");
        await loadPosts();
        return true;
    } catch (error) {
        console.error(error);
        showToast("Gagal kirim komentar", "fas fa-exclamation-circle");
        return false;
    }
}

async function savePost(post) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "apikey": SUPABASE_ANON_KEY, 
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}` 
            },
            body: JSON.stringify({ ...post, comment_count: 0 })
        });
        if (!response.ok) throw new Error("Gagal simpan");
        showToast("Berhasil disimpan!", "fas fa-check-circle");
        await loadPosts();
        return true;
    } catch (error) {
        console.error(error);
        showToast("Gagal menyimpan", "fas fa-exclamation-circle");
        return false;
    }
}

async function updateReactions(id, reactions) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${id}`, {
            method: "PATCH",
            headers: { 
                "Content-Type": "application/json", 
                "apikey": SUPABASE_ANON_KEY, 
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}` 
            },
            body: JSON.stringify({ reactions: reactions })
        });
        return true;
    } catch (error) {
        console.error(error);
        return false;
    }
}

// ============================================================
// 🎨 UI HELPER FUNCTIONS
// ============================================================
function formatTime(createdAt) {
    if (!createdAt) return "Baru saja";
    const date = new Date(createdAt);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff} detik lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function escapeHtml(str) { 
    if (!str) return ''; 
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\n/g, '<br>'); 
}

function showToast(msg, icon = 'fas fa-check-circle') {
    const toast = document.getElementById('globalToast');
    const iconEl = toast.querySelector('i');
    iconEl.className = icon;
    document.getElementById('toastText').textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById(page + 'Page').classList.add('active-page');
    document.querySelector(`.nav-item[data-nav="${page}"]`).classList.add('active');
    if (page === 'feed') renderFeed();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateFeedCount() {
    document.getElementById('feedCountBadge').textContent = posts.length + ' postingan';
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// ============================================================
// 🎵 SOUNDCLOUD FUNCTIONS
// ============================================================
async function searchSoundCloud(query) {
    try {
        showToast(`Mencari "${query}" di SoundCloud...`, 'fas fa-circle-notch fa-spin');
        
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

function showSongSelectionModal(songs, query) {
    const modal = document.createElement('div');
    modal.id = 'songSelectionModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        backdrop-filter: blur(8px);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.2s ease;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        max-width: 500px;
        width: 100%;
        max-height: 80vh;
        background: white;
        border-radius: 24px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;
    
    modalContent.innerHTML = `
        <div style="padding: 16px 20px; background: linear-gradient(135deg, #2563eb, #0891b2); color: white;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 1.1rem;">
                    <i class="fas fa-headphones"></i> Pilih Lagu
                </h3>
                <button id="closeModalBtn" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            <p style="margin: 5px 0 0; font-size: 0.75rem; opacity: 0.9;">Hasil pencarian: "${query}"</p>
        </div>
        <div id="songListContainer" style="overflow-y: auto; padding: 16px;">
            ${songs.map((song, index) => `
                <div class="song-search-item" data-index="${index}" style="
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    margin-bottom: 10px;
                    background: #eef0f7;
                    border-radius: 16px;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid #dde1ef;
                ">
                    <img src="${song.artwork}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/50?text=No+Image'">
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 0.85rem; color: #1e1e2e;">${escapeHtml(song.title)}</div>
                        <div style="font-size: 0.7rem; color: #64748b;">${escapeHtml(song.artist)}</div>
                        <div style="font-size: 0.6rem; color: #64748b; margin-top: 4px;">
                            <i class="fas fa-play"></i> ${formatDuration(song.duration_seconds)} &nbsp;|&nbsp;
                            <i class="fas fa-headphones"></i> ${formatNumber(song.plays)}
                        </div>
                    </div>
                    <button class="preview-song-btn" data-url="${song.stream_url}" data-title="${escapeHtml(song.title)}" data-artist="${escapeHtml(song.artist)}" style="
                        background: linear-gradient(135deg, #2563eb, #0891b2);
                        border: none;
                        color: white;
                        padding: 8px 12px;
                        border-radius: 40px;
                        font-size: 0.7rem;
                        cursor: pointer;
                    ">
                        <i class="fas fa-play"></i> Preview
                    </button>
                </div>
            `).join('')}
        </div>
        <div style="padding: 12px 16px; border-top: 1px solid #dde1ef; display: flex; gap: 10px;">
            <button id="cancelSelectSong" style="flex: 1; padding: 10px; border-radius: 40px; border: 1px solid #dde1ef; background: white; cursor: pointer;">Batal</button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    const closeModal = () => modal.remove();
    
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    document.getElementById('cancelSelectSong')?.addEventListener('click', closeModal);
    
    document.querySelectorAll('.song-search-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('preview-song-btn')) return;
            const index = parseInt(item.dataset.index);
            const song = songs[index];
            selectSong(song);
            closeModal();
        });
    });
    
    document.querySelectorAll('.preview-song-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const streamUrl = btn.dataset.url;
            const title = btn.dataset.title;
            const artist = btn.dataset.artist;
            playStreamUrl(streamUrl, title, artist);
        });
    });
    
    if (!document.querySelector('#modalAnimStyle')) {
        const style = document.createElement('style');
        style.id = 'modalAnimStyle';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

function selectSong(song) {
    selectedSongData = song;
    
    document.getElementById('songTitle').value = song.title;
    document.getElementById('songArtist').value = song.artist;
    
    showToast(`Lagu "${song.title}" dipilih!`, 'fas fa-check-circle');
    
    addPreviewButton(song);
}

function addPreviewButton(song) {
    const songTitleField = document.getElementById('songTitle').parentElement;
    const existingPreview = document.getElementById('inlinePreviewBtn');
    if (existingPreview) existingPreview.remove();
    
    const previewBtn = document.createElement('button');
    previewBtn.id = 'inlinePreviewBtn';
    previewBtn.innerHTML = '<i class="fas fa-play"></i> Preview';
    previewBtn.style.cssText = `
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: linear-gradient(135deg, #2563eb, #0891b2);
        border: none;
        color: white;
        padding: 4px 12px;
        border-radius: 40px;
        font-size: 0.7rem;
        cursor: pointer;
    `;
    
    previewBtn.onclick = () => {
        if (song.stream_url) {
            playStreamUrl(song.stream_url, song.title, song.artist);
        } else {
            searchAndPlay(song.title, song.artist);
        }
    };
    
    songTitleField.style.position = 'relative';
    songTitleField.appendChild(previewBtn);
}

function playStreamUrl(streamUrl, title, artist) {
    const iframe = document.getElementById('musicIframe');
    const info = document.getElementById('musicInfo');
    const musicIcon = document.getElementById('musicIcon');
    
    const existingAudio = document.getElementById('soundcloudAudio');
    if (existingAudio) existingAudio.remove();
    
    const audio = document.createElement('audio');
    audio.id = 'soundcloudAudio';
    audio.src = streamUrl;
    audio.controls = true;
    audio.autoplay = true;
    audio.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 12px;
        width: 260px;
        z-index: 1001;
        background: #1a1a2e;
        border-radius: 18px;
        padding: 8px;
    `;
    
    iframe.src = '';
    info.innerHTML = `<i class="fas fa-music"></i> ${title} ${artist ? `- ${artist}` : ''} (SoundCloud)`;
    
    document.body.appendChild(audio);
    
    if (!isOpen) openPlayer();
    musicIcon.classList.add('playing');
    showToast(`Memutar: ${title}`, 'fas fa-play');
    
    audio.addEventListener('ended', () => {
        audio.remove();
        info.innerHTML = 'Belum ada lagu diputar';
    });
}

function playSoundCloudStream(streamUrl, title, artist) {
    const iframe = document.getElementById('musicIframe');
    const info = document.getElementById('musicInfo');
    const musicIcon = document.getElementById('musicIcon');
    
    const existingAudio = document.getElementById('soundcloudAudio');
    if (existingAudio) existingAudio.remove();
    
    const audio = document.createElement('audio');
    audio.id = 'soundcloudAudio';
    audio.src = streamUrl;
    audio.controls = true;
    audio.autoplay = true;
    
    iframe.src = '';
    info.innerHTML = `<i class="fas fa-music"></i> ${title} ${artist ? `- ${artist}` : ''} (SoundCloud)`;
    
    document.body.appendChild(audio);
    if (!isOpen) openPlayer();
    musicIcon.classList.add('playing');
    showToast(`Memutar: ${title}`, 'fas fa-play');
    
    audio.addEventListener('ended', () => {
        audio.remove();
        info.innerHTML = 'Belum ada lagu diputar';
    });
}

// ============================================================
// 🎵 MUSIC PLAYER FUNCTIONS
// ============================================================
function openPlayer() {
    const musicIcon = document.getElementById('musicIcon');
    const musicPlayerCard = document.getElementById('musicPlayerCard');
    musicIcon.classList.add('hidden');
    musicPlayerCard.classList.remove('hidden');
    isOpen = true;
}

function closePlayer() {
    const musicIcon = document.getElementById('musicIcon');
    const musicPlayerCard = document.getElementById('musicPlayerCard');
    const audio = document.getElementById('soundcloudAudio');
    if (audio) audio.remove();
    musicIcon.classList.remove('hidden');
    musicPlayerCard.classList.add('hidden');
    isOpen = false;
}

function playVideoInPlayer(videoId, title, artist) {
    const iframe = document.getElementById('musicIframe');
    const info = document.getElementById('musicInfo');
    const musicIcon = document.getElementById('musicIcon');
    const audio = document.getElementById('soundcloudAudio');
    if (audio) audio.remove();
    
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    info.innerHTML = `<i class="fas fa-play"></i> ${title} ${artist ? `- ${artist}` : ''}`;
    
    if (!isOpen) openPlayer();
    musicIcon.classList.add('playing');
    showToast(`Memutar: ${title}`, 'fas fa-play');
}

async function searchAndPlay(title, artist) {
    showToast(`Mencari "${title}"...`, 'fas fa-circle-notch fa-spin');
    let searchQuery = `${title} ${artist || ''} official audio`;
    
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(searchQuery)}&type=video&key=${YOUTUBE_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);
        if (!data.items || data.items.length === 0) throw new Error('Video tidak ditemukan');
        
        const videoId = data.items[0].id.videoId;
        playVideoInPlayer(videoId, title, artist);
    } catch (error) {
        showToast(`Gagal: ${error.message}`, 'fas fa-exclamation-triangle');
    }
}

// ============================================================
// 💬 COMMENTS FUNCTIONS
// ============================================================
function toggleComments(postId) {
    openCommentPostId = openCommentPostId === postId ? null : postId;
    renderFeed();
}

async function submitComment(postId) {
    const input = document.getElementById(`commentInput_${postId}`);
    const commentText = input.value.trim();
    if (!commentText) { 
        showToast("Tulis komentar dulu!", "fas fa-exclamation-circle"); 
        return; 
    }
    await saveComment(postId, commentText, "Anonim");
    input.value = '';
    openCommentPostId = postId;
    await loadPosts();
}

function renderCommentSection(postId, commentCount) {
    const postComments = comments[postId] || [];
    const isCommentOpen = openCommentPostId === postId;
    let commentsHtml = '';
    
    if (isCommentOpen) {
        commentsHtml = `
            <div class="comment-list">
                ${postComments.map(c => `
                    <div class="comment-item">
                        <div class="comment-header">
                            <span class="comment-name">${escapeHtml(c.from_user)}</span>
                            <span>${formatTime(c.created_at)}</span>
                        </div>
                        <div class="comment-text">${escapeHtml(c.comment)}</div>
                    </div>
                `).join('')}
                ${postComments.length === 0 ? '<div style="text-align:center; padding:12px; color:#64748b; font-size:0.7rem;">Belum ada komentar. Jadi yang pertama!</div>' : ''}
            </div>
            <div class="comment-input-area">
                <input type="text" class="comment-input" id="commentInput_${postId}" placeholder="Tulis komentar anonim...">
                <button class="comment-submit" onclick="submitComment(${postId})"><i class="fas fa-paper-plane"></i></button>
            </div>
        `;
    }
    
    return `
        <div class="comments-section">
            <button class="comment-btn" onclick="toggleComments(${postId})">
                <i class="fas fa-comment"></i> Komentar (${commentCount || 0})
            </button>
            ${commentsHtml}
        </div>
    `;
}

// ============================================================
// 📝 RENDER FEED
// ============================================================
function renderFeed() {
    const list = document.getElementById('feedList');
    updateFeedCount();
    
    if (!posts.length) { 
        list.innerHTML = '<div class="empty-feed"><i class="fas fa-inbox"></i><p>Belum ada suara.<br>Yuk kirim menfess atau request lagu pertama!</p></div>'; 
        return; 
    }
    
    list.innerHTML = posts.map((post) => {
        const reacts = post.reactions || { '❤️': 0, '💬': 0, '🎧': 0 };
        const timeDisplay = formatTime(post.created_at);
        const commentCount = post.comment_count || 0;
        
        if (post.type === 'menfes') {
            return `
                <div class="post-card" data-id="${post.id}">
                    <div class="badge-type"><i class="fas fa-envelope"></i> Menfess PNC</div>
                    <div class="post-meta">
                        <span class="sender"><i class="fas fa-user-secret"></i> ${escapeHtml(post.from)}${post.to ? ` → <strong>${escapeHtml(post.to)}</strong>` : ''}</span>
                        <span class="post-time">${timeDisplay}</span>
                    </div>
                    <div class="message-text">${escapeHtml(post.msg)}</div>
                    ${post.mood ? `<div><span class="mood-tag">${post.mood}</span></div>` : ''}
                    <div class="reaction-row">
                        <button class="reaction" data-emoji="❤️">❤️ ${reacts['❤️'] || 0}</button>
                        <button class="reaction" data-emoji="💬">💬 ${reacts['💬'] || 0}</button>
                        <button class="reaction" data-emoji="🎧">🎧 ${reacts['🎧'] || 0}</button>
                    </div>
                    ${renderCommentSection(post.id, commentCount)}
                </div>
            `;
        } else {
            const hasSoundCloud = post.soundcloud_data && post.soundcloud_data.stream_url;
            const playHandler = hasSoundCloud 
                ? `playSoundCloudStream('${post.soundcloud_data.stream_url}', '${escapeHtml(post.title)}', '${escapeHtml(post.artist || '')}')`
                : `searchAndPlay('${escapeHtml(post.title)}', '${escapeHtml(post.artist || '')}')`;
            
            return `
                <div class="post-card" data-id="${post.id}">
                    <div class="badge-type badge-song"><i class="fas fa-music"></i> Songfess PNC</div>
                    <div class="post-meta">
                        <span class="sender"><i class="fas fa-user-secret"></i> ${escapeHtml(post.from)}${post.to ? ` → <strong>${escapeHtml(post.to)}</strong>` : ''}</span>
                        <span class="post-time">${timeDisplay}</span>
                    </div>
                    <div class="song-preview">
                        <div class="song-info">
                            ${hasSoundCloud && post.soundcloud_data.artwork ? 
                                `<img src="${post.soundcloud_data.artwork}" style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover;">` :
                                `<div class="song-icon-wrap"><i class="fas fa-music"></i></div>`
                            }
                            <div>
                                <div class="song-title-text">${escapeHtml(post.title)}</div>
                                ${post.artist ? `<div class="song-artist-text">${escapeHtml(post.artist)}</div>` : ''}
                            </div>
                        </div>
                        <button class="btn-play" onclick="${playHandler}">
                            <i class="fas fa-play"></i> Putar
                        </button>
                    </div>
                    ${post.msg ? `<div class="message-text" style="font-size:0.8rem; color:#64748b;">"${escapeHtml(post.msg)}"</div>` : ''}
                    <div class="reaction-row">
                        <button class="reaction" data-emoji="❤️">❤️ ${reacts['❤️'] || 0}</button>
                        <button class="reaction" data-emoji="💬">💬 ${reacts['💬'] || 0}</button>
                        <button class="reaction" data-emoji="🎧">🎧 ${reacts['🎧'] || 0}</button>
                    </div>
                    ${renderCommentSection(post.id, commentCount)}
                </div>
            `;
        }
    }).join('');
    
    document.querySelectorAll('.reaction').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const card = btn.closest('.post-card');
            const id = parseInt(card.dataset.id);
            const emoji = btn.dataset.emoji;
            const post = posts.find(p => p.id === id);
            if (post) {
                const newReactions = { ...post.reactions };
                newReactions[emoji] = (newReactions[emoji] || 0) + 1;
                await updateReactions(id, newReactions);
                await loadPosts();
            }
        });
    });
}

// ============================================================
// 🎛️ INITIALIZATION & EVENT LISTENERS
// ============================================================
function initToggle(toggleId, nameWrapId, stateRef, setStateFn) {
    const toggle = document.getElementById(toggleId);
    toggle.addEventListener('click', () => {
        const newState = !stateRef();
        setStateFn(newState);
        toggle.classList.toggle('on', newState);
        document.getElementById(nameWrapId).style.display = newState ? 'none' : 'block';
    });
}

function setupCounter(inputId, counterId, max) {
    const el = document.getElementById(inputId);
    const out = document.getElementById(counterId);
    el.addEventListener('input', () => out.textContent = `${el.value.length}/${max}`);
}

function addSearchButton() {
    const songTitleField = document.getElementById('songTitle').parentElement;
    const searchBtn = document.createElement('button');
    searchBtn.id = 'searchSoundCloudBtn';
    searchBtn.innerHTML = '<i class="fas fa-search"></i> Cari di SoundCloud';
    searchBtn.style.cssText = `
        margin-top: 8px;
        background: linear-gradient(135deg, #ff7700, #ff4400);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 40px;
        font-size: 0.75rem;
        cursor: pointer;
        width: 100%;
        font-weight: 600;
    `;
    
    searchBtn.onclick = async () => {
        const query = document.getElementById('songTitle').value.trim();
        if (!query) {
            showToast('Masukkan judul lagu terlebih dahulu!', 'fas fa-exclamation-circle');
            return;
        }
        
        const results = await searchSoundCloud(query);
        if (results.length > 0) {
            showSongSelectionModal(results, query);
        } else {
            showToast('Lagu tidak ditemukan di SoundCloud', 'fas fa-exclamation-circle');
        }
    };
    
    songTitleField.appendChild(searchBtn);
}

// Initialize toggles
initToggle('menfAnonToggle', 'menfNameWrap', () => menfAnonState, (v) => menfAnonState = v);
initToggle('songAnonToggle', 'songNameWrap', () => songAnonState, (v) => songAnonState = v);

// Mood chips selection
document.querySelectorAll('#moodContainerMenf .mood-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('#moodContainerMenf .mood-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        currentMoodMenf = chip.dataset.mood;
    });
});

// Character counters
setupCounter('menfMsg', 'menfChar', 500);
setupCounter('songMsgReq', 'songMsgChar', 280);

// Submit handlers
document.getElementById('submitMenfess').addEventListener('click', async () => {
    const msg = document.getElementById('menfMsg').value.trim();
    if (!msg) { 
        showToast('Pesan tidak boleh kosong!', 'fas fa-exclamation-circle'); 
        return; 
    }
    const from = menfAnonState ? 'Anonim' : (document.getElementById('menfName').value.trim() || 'Anonim');
    const to = document.getElementById('menfTo').value.trim();
    const mood = currentMoodMenf || '';
    const post = { 
        type: 'menfes', 
        from, 
        to: to || null, 
        msg, 
        mood: mood || null, 
        title: null, 
        artist: null, 
        reactions: { '❤️': 0, '💬': 0, '🎧': 0 } 
    };
    await savePost(post);
    
    document.getElementById('menfMsg').value = ''; 
    document.getElementById('menfTo').value = ''; 
    document.getElementById('menfChar').textContent = '0/500'; 
    document.getElementById('menfName').value = '';
    document.querySelectorAll('#moodContainerMenf .mood-chip').forEach(c => c.classList.remove('selected')); 
    currentMoodMenf = '';
});

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
            stream_url: selectedSongData.stream_url,
            artwork: selectedSongData.artwork,
            duration: selectedSongData.duration_seconds
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
    
    const inlinePreview = document.getElementById('inlinePreviewBtn');
    if (inlinePreview) inlinePreview.remove();
});

// Navigation
document.querySelectorAll('.nav-item').forEach(btn => 
    btn.addEventListener('click', () => navigateTo(btn.dataset.nav))
);

// Music player drag functionality
const musicFloat = document.getElementById('musicFloat');
const musicIcon = document.getElementById('musicIcon');
const closePlayerBtn = document.getElementById('closePlayerBtn');

musicIcon.addEventListener('click', openPlayer);
closePlayerBtn.addEventListener('click', closePlayer);

musicFloat.addEventListener('mousedown', (e) => {
    if (e.target.closest('.player-controls')) return;
    if (e.target.closest('#closePlayerBtn')) return;
    isDragging = true;
    const rect = musicFloat.getBoundingClientRect();
    dragStartX = e.clientX - rect.left;
    dragStartY = e.clientY - rect.top;
    musicFloat.style.cursor = 'grabbing';
    e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    let newLeft = e.clientX - dragStartX;
    let newTop = e.clientY - dragStartY;
    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - musicFloat.offsetWidth));
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - musicFloat.offsetHeight));
    musicFloat.style.left = newLeft + 'px';
    musicFloat.style.right = 'auto';
    musicFloat.style.top = newTop + 'px';
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    musicFloat.style.cursor = '';
});

// Add search button when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    addSearchButton();
});

// Make functions globally accessible
window.toggleComments = toggleComments;
window.submitComment = submitComment;
window.playSoundCloudStream = playSoundCloudStream;
window.searchAndPlay = searchAndPlay;

// Initial load
loadPosts();
navigateTo('menfess');