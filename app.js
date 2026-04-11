document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatHistory = document.getElementById('chatHistory');
  
  const heroTitle = document.getElementById('heroTitle');
  const heroSubtitle = document.getElementById('heroSubtitle');
  const tracksContainer = document.getElementById('tracksContainer');
  
  const mainPlayBtn = document.getElementById('mainPlayBtn');
  const playerCover = document.getElementById('playerCover');
  const playerTitle = document.getElementById('playerTitle');
  const playerArtist = document.getElementById('playerArtist');
  // Removed audioElement since we use YT Player
  const mainLikeBtn = document.getElementById('mainLikeBtn');
  
  const progressBarBg = document.getElementById('progressBarBg');
  const progressBarFill = document.getElementById('progressBarFill');
  const currentTimeEl = document.getElementById('currentTime');
  const totalTimeEl = document.getElementById('totalTime');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeFill = document.getElementById('volumeFill');
  const muteBtn = document.getElementById('muteBtn');

  // Navigation & Auth Elements
  const loginOverlay = document.getElementById('loginOverlay');
  const loginForm = document.getElementById('loginForm');
  const loginEmail = document.getElementById('loginEmail');
  const mainAppLayout = document.getElementById('mainAppLayout');
  const bottomPlayer = document.getElementById('bottomPlayer');
  const logoutBtn = document.getElementById('logoutBtn');
  const userAvatar = document.getElementById('userAvatar');
  const navDiscover = document.getElementById('navDiscover');
  const navLibrary = document.getElementById('navLibrary');
  const chatContainer = document.getElementById('chatContainer');
  const createPlaylistBtn = document.getElementById('createPlaylistBtn');
  const createPlaylistOverlay = document.getElementById('createPlaylistOverlay');
  const createPlaylistForm = document.getElementById('createPlaylistForm');
  const playlistNameInput = document.getElementById('playlistNameInput');
  const cancelPlaylistBtn = document.getElementById('cancelPlaylistBtn');
  const playlistList = document.getElementById('playlistList');
  const addToPlaylistDropdown = document.getElementById('addToPlaylistDropdown');
  const dropdownPlaylistList = document.getElementById('dropdownPlaylistList');

  // State
  let isPlaying = false;
  let currentTrack = null;
  let updateProgressInterval;
  let moodyLibrary = JSON.parse(localStorage.getItem('moody_library')) || [];
  let moodyPlaylists = JSON.parse(localStorage.getItem('moody_playlists')) || [];
  let trackToAddToPlaylist = null;
  
  // YouTube API
  const YT_API_KEY = 'AIzaSyD20YYAYoxsj1b5FEugnGGRWzz7OGnZcDQ';
  let ytPlayer = null;
  let ytPlayerReady = false;

  window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('yt-player', {
      height: '1',
      width: '1',
      videoId: '',
      playerVars: {
        'playsinline': 1,
        'controls': 0,
        'disablekb': 1
      },
      events: {
        'onReady': () => { 
          ytPlayerReady = true; 
          ytPlayer.setVolume(70);
        },
        'onStateChange': onPlayerStateChange
      }
    });
  };

  function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
      isPlaying = false;
      updatePlayPauseButton();
      progressBarFill.style.width = '0%';
      currentTimeEl.textContent = "0:00";
    }
  }

  // --- Authentication Logic ---
  
  // Check session on load
  function checkSession() {
    const token = localStorage.getItem('moody_token');
    const userEmail = localStorage.getItem('moody_user');
    
    if (token && userEmail) {
      // User is logged in
      loginOverlay.style.display = 'none';
      mainAppLayout.style.display = 'flex';
      bottomPlayer.style.display = 'flex';
      
      // Update avatar
      const name = userEmail.split('@')[0];
      userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6c5ce7&color=fff`;
      
      // Load initial generic discovery tracks if empty
      if (tracksContainer.innerHTML.includes('No tracks yet')) {
        loadInitialTracks();
      }
    } else {
      // User is not logged in
      loginOverlay.style.display = 'flex';
      mainAppLayout.style.display = 'none';
      bottomPlayer.style.display = 'none';
    }
  }

  // Initial check
  checkSession();
  
  // Save Library Helper
  function saveLibrary() {
    localStorage.setItem('moody_library', JSON.stringify(moodyLibrary));
  }
  
  // Toggle Like Track logic
  function toggleLikeTrack(track, btnElement, isMainButton = false) {
    const existsIndex = moodyLibrary.findIndex(t => t.src === track.src);
    if (existsIndex > -1) {
      moodyLibrary.splice(existsIndex, 1);
      btnElement.classList.remove('liked');
      btnElement.innerHTML = '<i class="ph ph-heart"></i>';
    } else {
      moodyLibrary.push(track);
      btnElement.classList.add('liked');
      btnElement.innerHTML = '<i class="ph-fill ph-heart"></i>';
    }
    saveLibrary();
    
    // Sync main bottom player heart if changing inline
    if (currentTrack && track.src === currentTrack.src && !isMainButton) {
      updateMainLikeBtnState();
    }
  }
  
  function updateMainLikeBtnState() {
    if (!currentTrack) return;
    const isLiked = moodyLibrary.some(t => t.src === currentTrack.src);
    if (isLiked) {
      mainLikeBtn.classList.add('liked');
      mainLikeBtn.innerHTML = '<i class="ph-fill ph-heart"></i>';
    } else {
      mainLikeBtn.classList.remove('liked');
      mainLikeBtn.innerHTML = '<i class="ph ph-heart"></i>';
    }
  }

  mainLikeBtn.addEventListener('click', () => {
    if (!currentTrack) return;
    toggleLikeTrack(currentTrack, mainLikeBtn, true);
    // Refresh library view if we are on it
    if (navLibrary.classList.contains('active')) {
      renderTracks(moodyLibrary);
    }
  });

  // Navigation Logic
  navDiscover.addEventListener('click', () => {
    navDiscover.classList.add('active');
    navLibrary.classList.remove('active');
    document.querySelectorAll('.playlist-list li').forEach(el => el.classList.remove('active'));
    chatContainer.style.display = 'flex';
    heroTitle.textContent = 'Awaiting Your Vibe';
    heroSubtitle.textContent = 'Chat in English, Hindi, or Hinglish to generate a curated playlist.';
    tracksContainer.innerHTML = '<div class="empty-state"><i class="ph ph-music-notes-simple"></i><p>Discover something new via chat!</p></div>';
    setTheme('#6c5ce7'); // Brand color
  });
  
  navLibrary.addEventListener('click', () => {
    navLibrary.classList.add('active');
    navDiscover.classList.remove('active');
    document.querySelectorAll('.playlist-list li').forEach(el => el.classList.remove('active'));
    chatContainer.style.display = 'none';
    heroTitle.textContent = 'My Library';
    heroSubtitle.textContent = 'Your personally curated collection of favorites.';
    setTheme('#ff7675'); // Salmon red vibe for library
    
    if (moodyLibrary.length > 0) {
      renderTracks(moodyLibrary);
    } else {
      tracksContainer.innerHTML = '<div class="empty-state"><i class="ph ph-heart-break"></i><p>Your library is empty. Go like some tracks!</p></div>';
    }
  });

  // Playlists Logic
  function savePlaylists() {
    localStorage.setItem('moody_playlists', JSON.stringify(moodyPlaylists));
  }
  
  function renderSidebarPlaylists() {
    playlistList.innerHTML = '';
    moodyPlaylists.forEach((pl) => {
      const li = document.createElement('li');
      
      const titleSpan = document.createElement('span');
      titleSpan.innerHTML = `<i class="ph ph-playlist" style="margin-right:8px; vertical-align:middle;"></i> ${pl.name}`;
      
      const deleteBtn = document.createElement('i');
      deleteBtn.className = 'ph ph-trash delete-playlist-btn';
      deleteBtn.title = 'Delete Playlist';
      
      li.appendChild(titleSpan);
      li.appendChild(deleteBtn);
      li.title = pl.name;
      
      li.addEventListener('click', (e) => {
        if(e.target === deleteBtn || e.target.classList.contains('delete-playlist-btn')) {
           moodyPlaylists = moodyPlaylists.filter(p => p.id !== pl.id);
           savePlaylists();
           renderSidebarPlaylists();
           if (heroTitle.textContent === pl.name) {
             navDiscover.click();
           }
           return;
        }

        // Active state toggles
        document.querySelectorAll('.sidebar-nav li').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.playlist-list li').forEach(el => el.classList.remove('active'));
        li.classList.add('active');
        
        chatContainer.style.display = 'none';
        heroTitle.textContent = pl.name;
        heroSubtitle.textContent = `Playlist • ${pl.tracks.length} tracks`;
        setTheme('#00b894'); // Mint green vibe for custom playlists
        
        if (pl.tracks.length > 0) {
          renderTracks(pl.tracks);
        } else {
          tracksContainer.innerHTML = '<div class="empty-state"><i class="ph ph-music-notes-plus"></i><p>This playlist is empty. Add some tracks!</p></div>';
        }
      });
      playlistList.appendChild(li);
    });
  }
  renderSidebarPlaylists(); // Execute on load
  
  createPlaylistBtn.addEventListener('click', () => {
    createPlaylistOverlay.classList.remove('hidden');
    playlistNameInput.focus();
  });
  cancelPlaylistBtn.addEventListener('click', () => {
    createPlaylistOverlay.classList.add('hidden');
    createPlaylistForm.reset();
  });
  createPlaylistForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = playlistNameInput.value.trim();
    if (name) {
      moodyPlaylists.push({ id: Date.now().toString(), name: name, tracks: [] });
      savePlaylists();
      renderSidebarPlaylists();
      createPlaylistOverlay.classList.add('hidden');
      createPlaylistForm.reset();
    }
  });

  // Dropdown UI Dismiss
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#addToPlaylistDropdown') && !e.target.closest('.add-to-playlist-btn')) {
      addToPlaylistDropdown.classList.add('hidden');
    }
  });

  // Handle Login
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginEmail.value.trim();
    if (!email) return;
    
    // Simulate API Auth Request
    loginForm.querySelector('.login-btn').innerHTML = '<i class="ph ph-spinner ph-spin"></i> Logging in...';
    
    setTimeout(() => {
      // Store token
      localStorage.setItem('moody_token', 'mock_jwt_token_12345');
      localStorage.setItem('moody_user', email);
      
      // Hide modal gracefully
      loginOverlay.classList.add('hidden');
      setTimeout(() => {
        loginForm.querySelector('.login-btn').innerHTML = 'Log In';
        checkSession();
      }, 500); // match css transition
      
    }, 1000);
  });

  // Handle Logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('moody_token');
    localStorage.removeItem('moody_user');
    
    // Reset App State
    if (isPlaying) togglePlay();
    chatHistory.innerHTML = '<div class="message-bubble ai animate-in"><p>Hey! How are you feeling today? (e.g. "I\'m stressed", "aaj bhut maza aa raha hai", "padhai karni hai")</p></div>';
    tracksContainer.innerHTML = '<div class="empty-state"><i class="ph ph-music-notes-simple"></i><p>No tracks yet. Tell the AI how you feel!</p></div>';
    heroTitle.textContent = 'Awaiting Your Vibe';
    heroSubtitle.textContent = 'Chat in English, Hindi or Hinglish to generate a curated playlist.';
    
    loginOverlay.classList.remove('hidden');
    checkSession();
  });

  // ----------------------------

  // Mock Database based on moods
  const moodDatabase = {
    chill: {
      color: '#00cec9', // Cyan
      hero: "Desi Chill",
      sub: "Slow Bollywood beats to relax and unwind.",
      searchTerm: "bollywood chill lofi"
    },
    workout: {
      color: '#ff7675', // Salmon Red
      hero: "Desi Beast Mode",
      sub: "High energy Punjabi & Hindi tracks to get you moving.",
      searchTerm: "punjabi workout hype"
    },
    focus: {
      color: '#6c5ce7', // Blue-violet
      hero: "Deep Focus",
      sub: "Instrumental and soft Hindi tracks for deep working.",
      searchTerm: "bollywood instrumental focus"
    },
    happy: {
      color: '#fdcb6e', // Yellow
      hero: "Party Times",
      sub: "Upbeat Bollywood tracks to keep the smile on.",
      searchTerm: "bollywood party upbeat desi"
    }
  };

  // Helper: Advanced NLP Mood Scorer (Supports English, Hindi, Hinglish combinations)
  function getDynamicMood(text) {
    const textLower = text.toLowerCase();
    
    // Categorized Keyword Dictionaries
    const categories = {
      chill: {
        keywords: ['chill', 'relax', 'stress', 'aaram', 'sukoon', 'shant', 'sad', 'udaas', 'bore', 'शांत', 'आराम', 'सुकून', 'depressed', 'lonely', 'akela', 'thak'],
        data: moodDatabase['chill']
      },
      workout: {
        keywords: ['work', 'gym', 'pump', 'josh', 'energy', 'taqat', 'bhag', 'dod', 'body', 'कसरत', 'व्यायाम', 'जोश', 'ऊर्जा', 'ताकत', 'hype', 'beast'],
        data: moodDatabase['workout']
      },
      focus: {
        keywords: ['focus', 'study', 'code', 'padhai', 'dhyan', 'kaam', 'exam', 'office', 'ध्यान', 'पढ़ाई', 'काम', 'work', 'hustle'],
        data: moodDatabase['focus']
      },
      happy: {
        keywords: ['happy', 'good', 'party', 'khush', 'maza', 'anand', 'mast', 'masti', 'bhangra', 'nach', 'खुश', 'मज़ा', 'पार्टी', 'dance', 'vibe', 'fun', 'upbeat'],
        data: moodDatabase['happy']
      }
    };
    
    let scores = { chill: 0, workout: 0, focus: 0, happy: 0 };
    let bestMatch = null;
    let highestScore = 0;
    
    // Algorithm: Score the sentence based on semantic weights
    for (let cat in categories) {
      categories[cat].keywords.forEach(keyword => {
        if (textLower.includes(keyword)) {
          // Weight exact word boundaries higher than simple substrings
          const regex = new RegExp(`\\b${keyword}\\b`, 'g');
          const exactMatchCount = (textLower.match(regex) || []).length;
          scores[cat] += exactMatchCount > 0 ? 2 : 1; 
        }
      });
      
      if (scores[cat] > highestScore) {
        highestScore = scores[cat];
        bestMatch = categories[cat].data;
      }
    }
    
    if (bestMatch && highestScore > 0) {
      return bestMatch;
    }
    
    // Dynamic Fallback - literally search anything they type!
    return {
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
      hero: "Vibe: " + text.charAt(0).toUpperCase() + text.slice(1).substring(0, 15),
      sub: "AI generated playlist based on your unique mood.",
      searchTerm: text
    };
  }

  // Psychological Time-Based Engine
  function getTimeBasedMood() {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      // Early Morning (5am - 12pm)
      return {
        color: '#e17055', // Sunrise Orange
        hero: "Good Morning",
        sub: "Start your day with positive energy.",
        searchTerm: "morning upbeat positive bollywood"
      };
    } else if (hour >= 12 && hour < 17) {
      // Afternoon (12pm - 5pm)
      return {
        color: '#0984e3', // Cool Blue
        hero: "Afternoon Focus",
        sub: "Deep concentration and chill vibes.",
        searchTerm: "lofi chill study focus"
      };
    } else if (hour >= 17 && hour < 21) {
      // Evening (5pm - 9pm)
      return {
        color: '#ff7675', // Sunset Salmon
        hero: "Evening Vibes",
        sub: "Leaving work, gym hype, and pre-party relaxation.",
        searchTerm: "punjabi hype party dance hindi"
      };
    } else {
      // Late Night (9pm - 5am)
      return {
        color: '#6c5ce7', // Midnight Violet
        hero: "Late Night Sukoon",
        sub: "Satisfying, emotional, and deep night rhythms.",
        searchTerm: "midnight sad emotional sukoon lofi hindi"
      };
    }
  }

  // Load initial discover page tracks
  async function loadInitialTracks() {
    try {
      tracksContainer.innerHTML = '<div class="empty-state"><p>Analyzing time & mood...</p></div>';
      
      const timeMood = getTimeBasedMood();
      
      // Update UI to specifically match the time profile
      setTheme(timeMood.color);
      heroTitle.textContent = timeMood.hero;
      heroSubtitle.textContent = timeMood.sub;
      
      const q = encodeURIComponent(timeMood.searchTerm);
      const response = await fetch(`https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=30`);
      const data = await response.json();
      
      const tracks = data.results.filter(t => t.previewUrl).map((t, index) => ({
        id: index,
        title: t.trackName,
        artist: t.artistName,
        album: t.collectionName || 'Unknown Album',
        time: formatTime(t.trackTimeMillis / 1000),
        img: t.artworkUrl100 || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=100&h=100&q=80',
        src: t.previewUrl
      }));
      
      if (tracks.length > 0) {
        renderTracks(tracks);
      } else {
        tracksContainer.innerHTML = '<div class="empty-state"><p>Failed to find mood tracks.</p></div>';
      }
    } catch (e) {
      tracksContainer.innerHTML = '<div class="empty-state"><p>Network error loading tracks.</p></div>';
    }
  }

  // Update Theme Color
  function setTheme(color) {
    document.documentElement.style.setProperty('--theme-color', color);
    
    // Convert hex to rgb for glow
    let c = color.substring(1); 
    let rgb = parseInt(c, 16);
    let r = (rgb >> 16) & 0xff;
    let g = (rgb >>  8) & 0xff;
    let b = (rgb >>  0) & 0xff;
    
    document.documentElement.style.setProperty('--theme-glow', `rgba(${r}, ${g}, ${b}, 0.3)`);
  }

  // Render Tracks
  function renderTracks(tracks) {
    tracksContainer.innerHTML = `
      <div class="track-header">
        <span>#</span>
        <span>Title</span>
        <span>Album</span>
        <span><i class="ph ph-clock"></i></span>
        <span></span>
      </div>
    `;
    
    tracks.forEach((track, index) => {
      const isLiked = moodyLibrary.some(t => t.src === track.src);
      const row = document.createElement('div');
      row.className = 'track-item animate-in';
      row.style.animationDelay = `${index * 0.1}s`;
      if (currentTrack && currentTrack.src === track.src) {
        row.classList.add('playing');
      }
      
      row.innerHTML = `
        <div class="track-num">${index + 1}</div>
        <div class="track-info-col">
          <img src="${track.img}" alt="${track.title}">
          <div class="details">
            <span class="title">${track.title}</span>
            <span class="artist">${track.artist}</span>
          </div>
        </div>
        <div class="track-album">${track.album}</div>
        <div class="track-duration">${track.time}</div>
        <button class="icon-btn like-btn ${isLiked ? 'liked' : ''}"><i class="ph${isLiked ? '-fill' : ''} ph-heart"></i></button>
        <button class="icon-btn add-to-playlist-btn"><i class="ph ph-list-plus"></i></button>
      `;
      
      row.addEventListener('click', (e) => {
        if(e.target.closest('.like-btn') || e.target.closest('.add-to-playlist-btn')) return;
        playTrack(track, row);
      });
      
      const likeBtn = row.querySelector('.like-btn');
      likeBtn.addEventListener('click', () => toggleLikeTrack(track, likeBtn));

      const addBtn = row.querySelector('.add-to-playlist-btn');
      addBtn.addEventListener('click', (e) => {
        trackToAddToPlaylist = track;
        dropdownPlaylistList.innerHTML = '';
        
        if (moodyPlaylists.length === 0) {
          dropdownPlaylistList.innerHTML = '<li style="color:#a1a1aa; cursor:default;">No playlists created</li>';
        } else {
          moodyPlaylists.forEach(pl => {
            const li = document.createElement('li');
            li.textContent = pl.name;
            li.addEventListener('click', () => {
              if (!pl.tracks.some(t => t.src === track.src)) {
                pl.tracks.push(track);
                savePlaylists();
                // If we are currently viewing this playlist, refresh view
                if (heroTitle.textContent === pl.name) renderTracks(pl.tracks);
              }
              addToPlaylistDropdown.classList.add('hidden');
            });
            dropdownPlaylistList.appendChild(li);
          });
        }
        
        const btnRect = addBtn.getBoundingClientRect();
        addToPlaylistDropdown.style.left = `${btnRect.left - 160}px`;
        addToPlaylistDropdown.style.top = `${btnRect.bottom}px`;
        addToPlaylistDropdown.classList.remove('hidden');
      });
      
      tracksContainer.appendChild(row);
    });
  }

  // Play Track logic
  async function playTrack(track, rowElement) {
    currentTrack = track;
    
    // UI Updates
    document.querySelectorAll('.track-item').forEach(el => el.classList.remove('playing'));
    if (rowElement) {
      rowElement.classList.add('playing');
    }
    
    playerTitle.textContent = track.title;
    playerArtist.textContent = 'Loading Full Song...';
    playerCover.src = track.img;
    updateMainLikeBtnState();
    
    if (!ytPlayerReady) return;

    try {
      // Search YouTube for full length video
      const q = encodeURIComponent(`${track.title} ${track.artist} audio`);
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${q}&type=video&key=${YT_API_KEY}`);
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const videoId = data.items[0].id.videoId;
        ytPlayer.loadVideoById(videoId);
        
        playerArtist.textContent = track.artist;
        isPlaying = true;
        updatePlayPauseButton();
        startProgressInterval();
      } else {
        playerArtist.textContent = 'Song not found on YouTube';
      }
    } catch (e) {
      console.error(e);
      playerArtist.textContent = 'Error loading song';
    }
  }

  // Play/Pause toggle
  function togglePlay() {
    if (!currentTrack || !ytPlayerReady) return;
    
    if (isPlaying) {
      ytPlayer.pauseVideo();
    } else {
      ytPlayer.playVideo();
    }
    isPlaying = !isPlaying;
    updatePlayPauseButton();
  }
  
  function updatePlayPauseButton() {
    const icon = mainPlayBtn.querySelector('i');
    if (isPlaying) {
      icon.className = 'ph-fill ph-pause-circle';
    } else {
      icon.className = 'ph-fill ph-play-circle';
    }
  }
  
  mainPlayBtn.addEventListener('click', togglePlay);

  // Formatting time
  function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // Progress Bar
  function startProgressInterval() {
    clearInterval(updateProgressInterval);
    updateProgressInterval = setInterval(() => {
      if (!ytPlayerReady || !ytPlayer.getDuration) return;
      
      const dur = ytPlayer.getDuration();
      const cur = ytPlayer.getCurrentTime();
      if (dur > 0) {
        currentTimeEl.textContent = formatTime(cur);
        totalTimeEl.textContent = formatTime(dur);
        progressBarFill.style.width = `${(cur / dur) * 100}%`;
        const handle = progressBarBg.querySelector('.progress-handle');
        if (handle) {
          handle.style.left = `${(cur / dur) * 100}%`;
        }
      }
    }, 500);
  }
  
  // Audio seeking
  progressBarBg.addEventListener('click', (e) => {
    if (!currentTrack || !ytPlayerReady || !ytPlayer.getDuration) return;
    const dur = ytPlayer.getDuration();
    if (dur <= 0) return;
    
    const rect = progressBarBg.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    ytPlayer.seekTo(percent * dur, true);
    progressBarFill.style.width = `${percent * 100}%`;
  });
  
  // Volume Controls
  let currentVolume = 70;
  let isMuted = false;

  volumeSlider.addEventListener('click', (e) => {
    if (!ytPlayerReady || !ytPlayer.setVolume) return;
    const rect = volumeSlider.getBoundingClientRect();
    let percent = (e.clientX - rect.left) / rect.width;
    if (percent < 0) percent = 0;
    if (percent > 1) percent = 1;
    
    currentVolume = Math.round(percent * 100);
    volumeFill.style.width = `${currentVolume}%`;
    
    if (isMuted && currentVolume > 0) {
      isMuted = false;
      ytPlayer.unMute();
      muteBtn.querySelector('i').className = 'ph ph-speaker-high';
    } else if (currentVolume === 0) {
      isMuted = true;
      ytPlayer.mute();
      muteBtn.querySelector('i').className = 'ph ph-speaker-slash';
    }
    
    ytPlayer.setVolume(currentVolume);
  });

  muteBtn.addEventListener('click', () => {
    if (!ytPlayerReady || !ytPlayer.setVolume) return;
    const icon = muteBtn.querySelector('i');
    
    if (isMuted) {
      isMuted = false;
      ytPlayer.unMute();
      ytPlayer.setVolume(currentVolume || 70);
      volumeFill.style.width = `${currentVolume || 70}%`;
      icon.className = 'ph ph-speaker-high';
    } else {
      isMuted = true;
      ytPlayer.mute();
      volumeFill.style.width = '0%';
      icon.className = 'ph ph-speaker-slash';
    }
  });

  // Handle Chat Submit
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userInput = chatInput.value.trim();
    if (!userInput) return;
    
    // Add user message
    addMessage(userInput, 'user');
    chatInput.value = '';
    
    // Determine mood dynamically!
    const moodData = getDynamicMood(userInput);
    
    // Update UI Themes
    setTheme(moodData.color);
    heroTitle.textContent = moodData.hero;
    heroSubtitle.textContent = moodData.sub;
    
    // AI Searching Feedback
    let aiResponseText = `I feel that vibe! Finding songs related to "${userInput}" for you...`;
    addMessage(aiResponseText, 'ai');
    
    tracksContainer.innerHTML = '<div class="empty-state"><p>Searching for songs...</p></div>';
    
    try {
      const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(moodData.searchTerm)}&media=music&entity=song&limit=40`);
      const data = await response.json();
      
      const tracks = data.results.filter(t => t.previewUrl).map((t, index) => ({
        id: index,
        title: t.trackName,
        artist: t.artistName,
        album: t.collectionName || 'Unknown Album',
        time: formatTime(t.trackTimeMillis / 1000),
        img: t.artworkUrl100 || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=100&h=100&q=80',
        src: t.previewUrl
      }));
      
      if (tracks.length > 0) {
        renderTracks(tracks);
      } else {
        tracksContainer.innerHTML = '<div class="empty-state"><p>No tracks found for this mood.</p></div>';
      }
    } catch (error) {
      console.error(error);
      tracksContainer.innerHTML = '<div class="empty-state"><p>Error fetching songs. Please try again.</p></div>';
    }
  });

  // Add Message helper
  function addMessage(text, sender) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${sender} animate-in`;
    
    const p = document.createElement('p');
    p.textContent = text;
    bubble.appendChild(p);
    
    chatHistory.appendChild(bubble);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  // Global Live Search Engine
  const topSearchInput = document.getElementById('topSearchInput');
  let searchTimeout;

  if (topSearchInput) {
    topSearchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      clearTimeout(searchTimeout);
      
      if (!query) {
        if (heroTitle.textContent.startsWith('Search Results')) {
           navDiscover.click(); // Bounce back to discover naturally
        }
        return; 
      }
      
      searchTimeout = setTimeout(async () => {
        // Clear Active States
        document.querySelectorAll('.sidebar-nav li').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.playlist-list li').forEach(el => el.classList.remove('active'));
        
        chatContainer.style.display = 'none';
        
        heroTitle.textContent = `Search Results for: "${query}"`;
        heroSubtitle.textContent = 'Global API live matches';
        setTheme('#b2bec3'); // Neutral slate styling for direct search
        
        tracksContainer.innerHTML = '<div class="empty-state"><p>Running Global Search...</p></div>';
        
        try {
          const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=40`);
          const data = await response.json();
          
          const tracks = data.results.filter(t => t.previewUrl).map((t, index) => ({
            id: index,
            title: t.trackName,
            artist: t.artistName,
            album: t.collectionName || 'Single',
            time: formatTime(t.trackTimeMillis / 1000),
            img: t.artworkUrl100 || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=100&h=100&q=80',
            src: t.previewUrl
          }));
          
          if (tracks.length > 0) {
            renderTracks(tracks);
          } else {
            tracksContainer.innerHTML = '<div class="empty-state"><p>No matches found globally.</p></div>';
          }
        } catch (err) {
          console.error(err);
          tracksContainer.innerHTML = '<div class="empty-state"><p>Error fetching search results.</p></div>';
        }
      }, 500); // 500ms Debouncer Delay
    });
  }

  // Widget Logic (Time & Weather)
  function initEnvWidget() {
    const timeDisplay = document.getElementById('timeDisplay');
    const weatherDisplay = document.getElementById('weatherDisplay');
    
    if (!timeDisplay || !weatherDisplay) return;
    
    setInterval(() => {
      const now = new Date();
      timeDisplay.innerHTML = `<i class="ph ph-clock"></i> ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }, 1000);
    timeDisplay.innerHTML = `<i class="ph ph-clock"></i> ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    
    async function fetchWeather() {
      try {
        const locRes = await fetch('https://ipapi.co/json/');
        const locData = await locRes.json();
        const lat = locData.latitude;
        const lon = locData.longitude;
        
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const weatherData = await weatherRes.json();
        
        if (weatherData && weatherData.current_weather) {
          const temp = Math.round(weatherData.current_weather.temperature);
          if (locData.city) {
            weatherDisplay.innerHTML = `<i class="ph ph-map-pin"></i> ${locData.city} &nbsp;<i class="ph ph-thermometer"></i> ${temp}°C`;
          } else {
            weatherDisplay.innerHTML = `<i class="ph ph-thermometer"></i> ${temp}°C`;
          }
        }
      } catch (e) {
        weatherDisplay.style.display = 'none';
      }
    }
    fetchWeather();
  }
  
  initEnvWidget();
});
