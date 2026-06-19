document.addEventListener('DOMContentLoaded', () => {
    // State variables
    let allReleases = [];
    let selectedItemId = null;
    let selectedItemObj = null;
    let activeFilter = 'all';
    let searchQuery = '';

    // DOM Elements
    const feedContainer = document.getElementById('feed-container');
    const loadingContainer = document.getElementById('loading-container');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    
    const btnRefresh = document.getElementById('btn-refresh');
    const btnRetry = document.getElementById('btn-retry');
    const refreshIcon = document.getElementById('refresh-icon');
    const lastUpdatedText = document.getElementById('last-updated-text');
    
    // Stats elements
    const statTotalDays = document.getElementById('stat-total-days');
    const statTotalUpdates = document.getElementById('stat-total-updates');
    const statFeatures = document.getElementById('stat-features');
    const statAnnouncements = document.getElementById('stat-announcements');
    
    // Search & Filter elements
    const searchInput = document.getElementById('search-input');
    const searchClearBtn = document.getElementById('search-clear-btn');
    const filterPills = document.querySelectorAll('.filter-pill');
    
    // Tweet Dock elements
    const tweetDock = document.getElementById('tweet-dock');
    const btnCloseDock = document.getElementById('btn-close-dock');
    const selectedItemInfo = document.getElementById('selected-item-info');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const btnResetTweet = document.getElementById('btn-reset-tweet');
    const btnSendTweet = document.getElementById('btn-send-tweet');

    // Initialize application
    init();

    function init() {
        fetchReleases();
        setupEventListeners();
    }

    // Set up interactive DOM Event Listeners
    function setupEventListeners() {
        // Refresh & Retry action
        btnRefresh.addEventListener('click', fetchReleases);
        btnRetry.addEventListener('click', fetchReleases);

        // Search inputs
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            if (searchQuery.length > 0) {
                searchClearBtn.style.display = 'block';
            } else {
                searchClearBtn.style.display = 'none';
            }
            renderReleases();
        });

        searchClearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchQuery = '';
            searchClearBtn.style.display = 'none';
            searchInput.focus();
            renderReleases();
        });

        // Filter categories pills
        filterPills.forEach(pill => {
            pill.addEventListener('click', (e) => {
                filterPills.forEach(p => p.classList.remove('active'));
                
                // Get active pill (climb up if clicked inner elements)
                const targetPill = e.target.closest('.filter-pill');
                targetPill.classList.add('active');
                
                activeFilter = targetPill.dataset.type;
                renderReleases();
            });
        });

        // Close Tweet Dock
        btnCloseDock.addEventListener('click', deselectAllItems);

        // Character count in Tweet textarea
        tweetTextarea.addEventListener('input', () => {
            updateCharCount();
        });

        // Reset Tweet Draft text
        btnResetTweet.addEventListener('click', () => {
            if (selectedItemObj) {
                const defaultText = generateDefaultTweetText(selectedItemObj.date, selectedItemObj.item);
                tweetTextarea.value = defaultText;
                updateCharCount();
            }
        });

        // Send Tweet intent
        btnSendTweet.addEventListener('click', () => {
            const tweetText = encodeURIComponent(tweetTextarea.value);
            const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
            window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        });
    }

    // Fetch releases from Python backend
    async function fetchReleases() {
        showLoading(true);
        btnRefresh.classList.add('loading');
        
        try {
            const response = await fetch('/api/releases');
            const data = await response.json();
            
            if (data.success) {
                allReleases = data.releases;
                showError(false);
                
                // Format current time as Last Refreshed time
                const now = new Date();
                const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                lastUpdatedText.textContent = `Refreshed at ${timeString}`;
                
                calculateAndRenderStats();
                renderReleases();
            } else {
                showError(true, data.error || 'Server returned failure status.');
            }
        } catch (err) {
            showError(true, 'Failed to fetch release notes from local server. Ensure the Flask server is running.');
            console.error('Error fetching releases:', err);
        } finally {
            showLoading(false);
            btnRefresh.classList.remove('loading');
        }
    }

    // Process & calculate total, features, announcements counts
    function calculateAndRenderStats() {
        let totalDays = allReleases.length;
        let totalUpdates = 0;
        let featureCount = 0;
        let announcementCount = 0;

        allReleases.forEach(release => {
            totalUpdates += release.items.length;
            release.items.forEach(item => {
                const type = item.type.toLowerCase();
                if (type.includes('feature')) featureCount++;
                if (type.includes('announcement')) announcementCount++;
            });
        });

        // Animating stats counters
        animateCounter(statTotalDays, totalDays);
        animateCounter(statTotalUpdates, totalUpdates);
        animateCounter(statFeatures, featureCount);
        animateCounter(statAnnouncements, announcementCount);
    }

    // Animated number counter utility
    function animateCounter(element, targetValue) {
        let start = 0;
        const duration = 800; // ms
        const stepTime = Math.abs(Math.floor(duration / targetValue)) || 20;
        
        if (targetValue === 0) {
            element.textContent = '0';
            return;
        }

        const timer = setInterval(() => {
            start += Math.ceil(targetValue / 15);
            if (start >= targetValue) {
                element.textContent = targetValue;
                clearInterval(timer);
            } else {
                element.textContent = start;
            }
        }, stepTime);
    }

    // Filter and render release entries on the page
    function renderReleases() {
        feedContainer.innerHTML = '';
        let matchCount = 0;

        allReleases.forEach((release) => {
            const dateStr = release.date;
            
            // Filter the individual items under this date
            const filteredItems = release.items.filter((item, index) => {
                const itemType = item.type.toLowerCase();
                const itemBodyText = stripHtmlTags(item.body).toLowerCase();
                
                // 1. Category Filter Match
                let categoryMatch = false;
                if (activeFilter === 'all') {
                    categoryMatch = true;
                } else if (activeFilter === 'feature' && itemType.includes('feature')) {
                    categoryMatch = true;
                } else if (activeFilter === 'announcement' && itemType.includes('announcement')) {
                    categoryMatch = true;
                } else if (activeFilter === 'deprecation' && itemType.includes('deprecation')) {
                    categoryMatch = true;
                } else if (activeFilter === 'fix' && itemType.includes('fix')) {
                    categoryMatch = true;
                } else if (activeFilter === 'other' && 
                           !itemType.includes('feature') && 
                           !itemType.includes('announcement') && 
                           !itemType.includes('deprecation') && 
                           !itemType.includes('fix')) {
                    categoryMatch = true;
                }

                // 2. Search Query Match (Date string, type, or body content)
                let queryMatch = true;
                if (searchQuery) {
                    queryMatch = dateStr.toLowerCase().includes(searchQuery) ||
                                 item.type.toLowerCase().includes(searchQuery) ||
                                 itemBodyText.includes(searchQuery);
                }

                return categoryMatch && queryMatch;
            });

            // Only render the date block if it contains matching items
            if (filteredItems.length > 0) {
                matchCount += filteredItems.length;

                // Create date-card wrapper
                const dateCard = document.createElement('div');
                dateCard.className = 'date-card';

                // Create header for date block
                const dateHeader = document.createElement('div');
                dateHeader.className = 'date-header';
                
                const dateTitle = document.createElement('h3');
                dateTitle.className = 'date-title';
                dateTitle.textContent = dateStr;
                
                const dateDivider = document.createElement('div');
                dateDivider.className = 'date-divider';

                dateHeader.appendChild(dateTitle);
                dateHeader.appendChild(dateDivider);
                dateCard.appendChild(dateHeader);

                // Inject child release items
                filteredItems.forEach((item) => {
                    // Generate a unique ID for this specific sub-item
                    const uniqueId = `${release.id || dateStr}-${item.type}-${item.body.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}`;
                    const isSelected = selectedItemId === uniqueId;

                    const itemCard = document.createElement('div');
                    itemCard.className = `release-item ${isSelected ? 'selected' : ''}`;
                    itemCard.setAttribute('id', uniqueId);
                    
                    // Header of item
                    const itemHeader = document.createElement('div');
                    itemHeader.className = 'release-item-header';
                    
                    const badgeClass = getBadgeClassForType(item.type);
                    const typeBadge = document.createElement('span');
                    typeBadge.className = `category-badge ${badgeClass}`;
                    typeBadge.innerHTML = `<i class="${getBadgeIconForType(item.type)}"></i> ${item.type}`;
                    
                    itemHeader.appendChild(typeBadge);

                    // Selection Indicator
                    const selectionIndicator = document.createElement('div');
                    selectionIndicator.className = 'selection-indicator';
                    selectionIndicator.innerHTML = '<i class="fa-solid fa-check"></i>';
                    itemCard.appendChild(selectionIndicator);

                    // Body description HTML
                    const itemBody = document.createElement('div');
                    itemBody.className = 'release-item-body';
                    itemBody.innerHTML = item.body;

                    // Hover/Footer tweet button inside card
                    const tweetBtn = document.createElement('button');
                    tweetBtn.className = 'release-item-tweet-btn';
                    tweetBtn.innerHTML = `<i class="fa-brands fa-x-twitter"></i> Select & Compose Tweet`;

                    itemCard.appendChild(itemHeader);
                    itemCard.appendChild(itemBody);
                    itemCard.appendChild(tweetBtn);

                    // Make item interactive: Click toggles selection
                    itemCard.addEventListener('click', (e) => {
                        // Prevent triggering if clicked on hyperlinks inside body
                        if (e.target.tagName === 'A') return;
                        
                        toggleItemSelection(uniqueId, {
                            id: uniqueId,
                            date: dateStr,
                            item: item
                        });
                    });

                    dateCard.appendChild(itemCard);
                });

                feedContainer.appendChild(dateCard);
            }
        });

        // Show empty state if no matches
        if (matchCount === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'loading-container';
            emptyState.innerHTML = `
                <i class="fa-solid fa-folder-open" style="font-size: 3rem; color: var(--text-dim);"></i>
                <h3 style="margin-top: 1rem;">No matching updates found</h3>
                <p style="color: var(--text-dim);">Try tweaking your search term or selection category filter.</p>
            `;
            feedContainer.appendChild(emptyState);
        }
    }

    // Toggle selected card
    function toggleItemSelection(id, itemData) {
        // If already selected, deselect it
        if (selectedItemId === id) {
            deselectAllItems();
        } else {
            // Remove selection class from old card
            if (selectedItemId) {
                const oldSelectedCard = document.getElementById(selectedItemId);
                if (oldSelectedCard) oldSelectedCard.classList.remove('selected');
            }
            
            // Set new selection
            selectedItemId = id;
            selectedItemObj = itemData;
            
            const newSelectedCard = document.getElementById(id);
            if (newSelectedCard) newSelectedCard.classList.add('selected');
            
            // Show Composer Dock
            openTweetComposer(itemData);
        }
    }

    // Deselect active cards and collapse Composer
    function deselectAllItems() {
        if (selectedItemId) {
            const selectedCard = document.getElementById(selectedItemId);
            if (selectedCard) selectedCard.classList.remove('selected');
        }
        selectedItemId = null;
        selectedItemObj = null;
        tweetDock.classList.remove('active');
    }

    // Compose Tweet and slide in Composer bottom dock
    function openTweetComposer(itemData) {
        selectedItemInfo.textContent = `${itemData.date} • ${itemData.item.type}`;
        
        // Generate pre-populated text draft
        const draftText = generateDefaultTweetText(itemData.date, itemData.item);
        tweetTextarea.value = draftText;
        
        updateCharCount();
        
        // Slide in from bottom
        tweetDock.classList.add('active');
        
        // Scroll composer into view if needed (or focus)
        tweetTextarea.focus();
    }

    // Formats a clean tweet text draft under 280 characters limit
    function generateDefaultTweetText(date, item) {
        const typePrefix = `BigQuery Update [${item.type}] (${date}): `;
        const linkSuffix = ` #GoogleCloud #BigQuery`;
        
        // Extract clean readable text from HTML body
        const rawContent = stripHtmlTags(item.body);
        
        // Calculate max allowed body length to fit constraints
        // 280 - (prefix length) - (suffix length)
        const budget = 280 - typePrefix.length - linkSuffix.length;
        
        let bodySnippet = rawContent;
        if (rawContent.length > budget) {
            bodySnippet = rawContent.substring(0, budget - 4) + '...';
        }
        
        return `${typePrefix}${bodySnippet}${linkSuffix}`;
    }

    // Utility: Character Count updates with visual warnings
    function updateCharCount() {
        const count = tweetTextarea.value.length;
        charCount.textContent = count;
        
        if (count >= 250) {
            charCount.parentElement.classList.add('warning');
        } else {
            charCount.parentElement.classList.remove('warning');
        }
    }

    // Helper: Strip HTML tags to make clean text snippets
    function stripHtmlTags(html) {
        let tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Remove pre/code tags from snippet to avoid code snippets cluttering tweet text
        const codeElements = tempDiv.querySelectorAll('pre, code');
        codeElements.forEach(el => el.remove());
        
        let text = tempDiv.textContent || tempDiv.innerText || "";
        // Clean double spaces and linebreaks
        return text.replace(/\s+/g, ' ').trim();
    }

    // Helper: Match CSS color classes to categories
    function getBadgeClassForType(type) {
        const t = type.toLowerCase();
        if (t.includes('feature')) return 'feature';
        if (t.includes('announcement')) return 'announcement';
        if (t.includes('deprecation')) return 'deprecation';
        if (t.includes('fix')) return 'fix';
        return 'other';
    }

    // Helper: Match FontAwesome icon classes to categories
    function getBadgeIconForType(type) {
        const t = type.toLowerCase();
        if (t.includes('feature')) return 'fa-solid fa-wand-magic-sparkles';
        if (t.includes('announcement')) return 'fa-solid fa-bullhorn';
        if (t.includes('deprecation')) return 'fa-solid fa-triangle-exclamation';
        if (t.includes('fix')) return 'fa-solid fa-wrench';
        return 'fa-solid fa-circle-info';
    }

    // UI View State Helpers
    function showLoading(isLoading) {
        if (isLoading) {
            loadingContainer.classList.remove('hidden');
            feedContainer.classList.add('hidden');
        } else {
            loadingContainer.classList.add('hidden');
            feedContainer.classList.remove('hidden');
        }
    }

    function showError(isError, msg = '') {
        if (isError) {
            errorMessage.textContent = msg;
            errorContainer.classList.remove('hidden');
            feedContainer.classList.add('hidden');
            loadingContainer.classList.add('hidden');
        } else {
            errorContainer.classList.add('hidden');
        }
    }
});
