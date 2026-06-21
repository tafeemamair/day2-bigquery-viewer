/**
 * BigQuery Release Notes Tracker - Client Script
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    let releaseNotes = [];
    let selectedUpdate = null;
    let currentTheme = localStorage.getItem('theme') || 'dark';
    let activeCategory = 'all';
    let searchQuery = '';

    // DOM Elements
    const feedContainer = document.getElementById('feed-container');
    const feedLoading = document.getElementById('feed-loading');
    const feedEmpty = document.getElementById('feed-empty');
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const spinnerIcon = refreshBtn.querySelector('.spinner-icon');
    const syncStatus = document.getElementById('sync-status');
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');
    
    // Filters Count DOM
    const countAll = document.getElementById('count-all');
    const countFeature = document.getElementById('count-feature');
    const countAnnouncement = document.getElementById('count-announcement');
    const countIssue = document.getElementById('count-issue');
    const countBreaking = document.getElementById('count-breaking');
    const countChange = document.getElementById('count-change');

    // Tweet Panel DOM
    const tweetPanel = document.getElementById('tweet-panel');
    const closeTweetBtn = document.getElementById('close-tweet-btn');
    const tweetBadge = document.getElementById('tweet-badge');
    const tweetDate = document.getElementById('tweet-date');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const charProgress = document.getElementById('char-progress');
    const sendTweetBtn = document.getElementById('send-tweet-btn');

    // Setup Theme
    setTheme(currentTheme);

    // Initial Fetch
    fetchNotes(false);

    // --- EVENT LISTENERS ---

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    // Refresh Button
    refreshBtn.addEventListener('click', () => {
        fetchNotes(true);
    });

    // Search Input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        searchClearBtn.style.display = searchQuery.length > 0 ? 'block' : 'none';
        renderFeed();
    });

    // Clear Search
    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClearBtn.style.display = 'none';
        searchInput.focus();
        renderFeed();
    });

    // Category Filters
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeCategory = pill.getAttribute('data-category');
            renderFeed();
        });
    });

    // Close Tweet Panel
    closeTweetBtn.addEventListener('click', () => {
        deselectCard();
    });

    // Tweet Textarea Typing
    tweetTextarea.addEventListener('input', () => {
        updateTweetCharCount();
    });

    // Post to Twitter (X)
    sendTweetBtn.addEventListener('click', () => {
        if (!selectedUpdate) return;
        const text = tweetTextarea.value;
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank', 'noopener,noreferrer');
        
        // Show success notification toast
        showToast('Redirected to Twitter to publish your tweet!');
    });

    // Close panel on Esc key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !tweetPanel.classList.contains('hidden')) {
            deselectCard();
        }
    });

    // --- FUNCTIONS ---

    // Theme management
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        currentTheme = theme;
        if (theme === 'dark') {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    }

    // Fetch Release Notes from API
    async function fetchNotes(forceRefresh = false) {
        setSyncStatus('loading', forceRefresh ? 'Refreshing feed...' : 'Fetching release notes...');
        feedLoading.style.display = 'block';
        feedContainer.style.display = 'none';
        feedEmpty.style.display = 'none';
        spinnerIcon.classList.add('spinning');
        refreshBtn.disabled = true;

        try {
            const response = await fetch(`/api/release-notes?refresh=${forceRefresh}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            
            if (result.success) {
                releaseNotes = result.data;
                const formattedTime = new Date(result.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setSyncStatus('live', `Synced at ${formattedTime}`);
                
                // Show notification if manual refresh succeeded
                if (forceRefresh) {
                    showToast('Release notes successfully refreshed!');
                }
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Failed to fetch release notes:', error);
            setSyncStatus('error', 'Sync failed');
            showToast('Error fetching updates. Serving offline/stale copy.', 'error');
        } finally {
            feedLoading.style.display = 'none';
            spinnerIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
            
            // Build stats first, then render
            calculateCategoryCounts();
            renderFeed();
        }
    }

    // Update status badge
    function setSyncStatus(status, text) {
        syncStatus.className = `sync-status status-${status}`;
        syncStatus.querySelector('.status-text').textContent = text;
    }

    // Calculate update counts for category filters
    function calculateCategoryCounts() {
        let total = 0;
        const counts = {
            'Feature': 0,
            'Announcement': 0,
            'Issue': 0,
            'Breaking': 0,
            'Change': 0
        };

        releaseNotes.forEach(entry => {
            entry.updates.forEach(update => {
                total++;
                const cat = update.category;
                if (counts[cat] !== undefined) {
                    counts[cat]++;
                }
            });
        });

        // Set counts in UI
        countAll.textContent = total;
        countFeature.textContent = counts['Feature'];
        countAnnouncement.textContent = counts['Announcement'];
        countIssue.textContent = counts['Issue'];
        countBreaking.textContent = counts['Breaking'];
        countChange.textContent = counts['Change'];
    }

    // Render feed items dynamically
    function renderFeed() {
        feedContainer.innerHTML = '';
        let matchCount = 0;

        // Process release notes
        releaseNotes.forEach(entry => {
            // Filter updates within this date entry
            const filteredUpdates = entry.updates.filter(update => {
                const categoryMatch = activeCategory === 'all' || update.category.toLowerCase() === activeCategory.toLowerCase();
                const searchMatch = !searchQuery || 
                                    update.text.toLowerCase().includes(searchQuery) || 
                                    update.category.toLowerCase().includes(searchQuery) ||
                                    entry.date.toLowerCase().includes(searchQuery);
                return categoryMatch && searchMatch;
            });

            if (filteredUpdates.length === 0) return;

            // Date Group Header
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';

            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';

            const dateTitle = document.createElement('h3');
            dateTitle.className = 'date-title';
            dateTitle.textContent = entry.date;

            const dateRelative = document.createElement('span');
            dateRelative.className = 'date-relative';
            dateRelative.textContent = getRelativeTime(entry.updated);

            dateHeader.appendChild(dateTitle);
            dateHeader.appendChild(dateRelative);
            dateGroup.appendChild(dateHeader);

            // Add update cards
            filteredUpdates.forEach(update => {
                matchCount++;
                const card = document.createElement('article');
                
                // Add category-specific CSS class
                const categoryClass = `cat-${update.category.toLowerCase()}`;
                card.className = `update-card ${categoryClass}`;
                if (selectedUpdate && selectedUpdate.id === update.id) {
                    card.classList.add('selected');
                }

                // Inline HTML structure of card
                card.innerHTML = `
                    <div class="update-card-header">
                        <span class="badge badge-${update.category.toLowerCase()}">${update.category}</span>
                        <div class="card-actions">
                            <div class="card-select-indicator">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <button class="btn-tweet-small" title="Tweet this update">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="update-card-content">
                        ${update.content}
                    </div>
                `;

                // Card clicking logic (Selects card for Tweeting)
                card.addEventListener('click', (e) => {
                    // If small tweet button inside the card was clicked, tweet immediately
                    if (e.target.closest('.btn-tweet-small')) {
                        e.stopPropagation();
                        selectCard(update, entry.date, entry.link);
                        // Trigger immediate tweet click behavior
                        sendTweetBtn.click();
                        return;
                    }
                    
                    if (card.classList.contains('selected')) {
                        deselectCard();
                    } else {
                        selectCard(update, entry.date, entry.link);
                    }
                });

                dateGroup.appendChild(card);
            });

            feedContainer.appendChild(dateGroup);
        });

        // Show/hide empty state
        if (matchCount === 0) {
            feedEmpty.style.display = 'flex';
            feedContainer.style.display = 'none';
        } else {
            feedEmpty.style.display = 'none';
            feedContainer.style.display = 'flex';
        }
    }

    // Select a card and show floating composer
    function selectCard(update, date, link) {
        selectedUpdate = update;
        
        // Remove selection from all cards
        document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
        
        // Add selected class to corresponding card DOM element
        const cardElements = document.querySelectorAll('.update-card');
        cardElements.forEach(card => {
            const badge = card.querySelector('.badge');
            if (badge && badge.parentNode.parentNode.querySelector('.update-card-content').innerHTML.includes(update.content)) {
                card.classList.add('selected');
            }
        });

        // Re-render feed handles highlighting cleanly, but simple selector is faster. 
        // For simplicity let's re-run renderFeed or selectively apply selection class.
        renderFeed();

        // Populate Floating Tweet Panel
        tweetBadge.className = `badge badge-${update.category.toLowerCase()}`;
        tweetBadge.textContent = update.category;
        tweetDate.textContent = date;
        
        // Compose default tweet text
        const cleanText = update.text;
        const prefix = `BigQuery Release (${date}) [${update.category}]: `;
        const suffix = `\nSource: ${link}`;
        
        // Character counts calculations
        const maxTextLen = 280 - prefix.length - suffix.length;
        let tweetContent = cleanText;
        if (tweetContent.length > maxTextLen) {
            tweetContent = tweetContent.substring(0, maxTextLen - 3) + '...';
        }
        
        tweetTextarea.value = `${prefix}${tweetContent}${suffix}`;
        
        // Show panel
        tweetPanel.classList.remove('hidden');
        updateTweetCharCount();
        tweetTextarea.focus();
    }

    // Deselect active card
    function deselectCard() {
        selectedUpdate = null;
        document.querySelectorAll('.update-card').forEach(c => c.classList.remove('selected'));
        tweetPanel.classList.add('hidden');
    }

    // Character counter updates
    function updateTweetCharCount() {
        const text = tweetTextarea.value;
        const len = text.length;
        charCount.textContent = `${len}/280`;

        // Update progress ring stroke-dashoffset
        const circle = charProgress;
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        
        // Calculate progress percentage, capped at 100%
        const percent = Math.min((len / 280) * 100, 100);
        const offset = circumference - (percent / 100) * circumference;
        circle.style.strokeDashoffset = offset;

        // Change color based on limits
        if (len > 280) {
            circle.style.stroke = 'var(--color-breaking)';
            charCount.style.color = 'var(--color-breaking)';
            sendTweetBtn.disabled = true;
        } else if (len >= 260) {
            circle.style.stroke = 'var(--color-issue)';
            charCount.style.color = 'var(--color-issue)';
            sendTweetBtn.disabled = false;
        } else {
            circle.style.stroke = 'var(--primary-color)';
            charCount.style.color = 'var(--text-secondary)';
            sendTweetBtn.disabled = false;
        }
    }

    // Toast notifications utility
    function showToast(message, type = 'success') {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = `toast`;
        if (type === 'error') {
            toast.style.borderColor = 'var(--color-breaking)';
        }
        
        const successCheck = `
            <svg viewBox="0 0 24 24" fill="none" stroke="${type === 'error' ? 'var(--color-breaking)' : 'var(--color-feature)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                <circle cx="12" cy="12" r="10"></circle>
                ${type === 'error' ? '<line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' : '<polyline points="16 8 11 17 8 14"></polyline>'}
            </svg>
        `;

        toast.innerHTML = `
            ${successCheck}
            <span>${message}</span>
        `;

        document.body.appendChild(toast);
        
        // Trigger reflow for animation
        toast.offsetHeight;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // Helper: Relative time string
    function getRelativeTime(isoString) {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                return 'Today';
            } else if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays < 30) {
                return `${diffDays} days ago`;
            } else {
                return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            }
        } catch (e) {
            return '';
        }
    }
});
