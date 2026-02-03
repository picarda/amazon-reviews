// Amazon Review Pulse - Content Script

console.log('Amazon Review Pulse: Loaded');

// --- Icons (SVG Strings) ---
const ICONS = {
    fire: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-2.246-3.664-4.991-5.465a.519.519 0 0 1-.09-.728c.32-.387.653-.618.918-.734A12.96 12.96 0 0 0 12 0C7.294 0 2.5 4.794 2.5 12a1 1 0 0 0 1 1h5z"/><path d="M15.5 14.5A2.5 2.5 0 0 1 13 12c0-1.38.5-2 1-3 1.072-2.143 2.246-3.664 4.991-5.465a.519.519 0 0 0 .09-.728c-.32-.387-.653-.618-.918-.734A12.96 12.96 0 0 1 12 0c4.706 0 9.5 4.794 9.5 12a1 1 0 0 1-1 1h-5z"/><line x1="12" y1="14" x2="12" y2="24"/></svg>`,
    alert: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    refresh: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`
};

function init() {
    // Basic check to ensure we are on a product page
    // Amazon product pages usually have an element with id 'dp' (Detail Page)
    const productPage = document.getElementById('dp');
    if (!productPage) {
        console.log('Amazon Review Pulse: Not a product page, aborting.');
        return;
    }

    injectStyles();
    injectWidget();
}

function injectStyles() {
    // We will inject styles into the shadow DOM later, but global integration styles go here if needed.
}

function injectWidget() {
    // Check if widget already exists
    if (document.getElementById('arp-container')) return;

    // Create host element
    const host = document.createElement('div');
    host.id = 'arp-container';

    // Position it fixed for now, or append to a specific location
    // Append to body effectively acts as an overlay
    document.body.appendChild(host);

    // Create Shadow DOM
    const shadow = host.attachShadow({ mode: 'open' });

    // CSS
    const style = document.createElement('style');
    style.textContent = `
        :host {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #333;
        }
        
        .arp-widget {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.12);
            width: 320px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: all 0.3s ease;
        }

        .arp-header {
            background: #fff;
            padding: 16px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .arp-title {
            font-weight: 700;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            color: #111;
        }
        
        .arp-pulse-dot {
            width: 8px;
            height: 8px;
            background: #ff3b30;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }

        .arp-reload-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            color: #888;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 8px;
        }

        .arp-reload-btn:hover {
            background: #f0f0f0;
            color: #333;
        }
        
        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(255, 59, 48, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 59, 48, 0); }
        }

        .arp-content {
            padding: 16px;
            max-height: 400px;
            overflow-y: auto;
            background: #00000010;
        }

        .arp-section {
            margin-bottom: 16px;
        }
        
        .arp-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #000;
            margin-bottom: 6px;
            font-weight: 600;
        }

        .arp-summary-text {
            font-size: 13px;
            line-height: 1.4;
            color: #444;
        }
        
        .arp-highlight {
            font-weight: 600;
            color: #111;
            background: #fff8dc;
            padding: 0 2px;
        }

        .arp-dealbreakers {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .arp-dealbreaker-item {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin-bottom: 8px;
            font-size: 13px;
            color: #d32f2f;
            background: #ffebee;
            padding: 8px;
            border-radius: 6px;
        }

        .arp-icon-warn {
            flex-shrink: 0;
            width: 14px;
            height: 14px;
            margin-top: 1px;
        }

        .arp-longevity {
            display: flex;
            align-items: center;
            gap: 12px;
            background: #ffffff;
            padding: 10px;
            border-radius: 8px;
        }
        
        .arp-score {
            font-size: 24px;
            font-weight: 800;
            color: #333;
        }
        
        .arp-score-label {
            font-size: 11px;
            color: #666;
            line-height: 1.2;
        }

        .arp-button {
            width: 100%;
            padding: 10px;
            background: #ffce12;
            color: #111;
            border: none;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            border-top: 1px solid #eee;
        }
        
        .arp-button:hover {
            background: #e6b800;
        }
    `;

    // Structure
    const container = document.createElement('div');
    container.className = 'arp-widget';

    // Run initial analysis
    // Retry a few times if reviews aren't loaded yet (dynamic loading)
    let attempts = 0;
    const maxAttempts = 10;

    const runAnalysis = () => {
        // Reset attempts if manually triggered
        if (attempts >= maxAttempts) attempts = 0;

        const analysis = analyzePage(document);

        if (!analysis && attempts < maxAttempts) {
            attempts++;
            console.log(`Amazon Review Pulse: Waiting for reviews... (Attempt ${attempts})`);

            // Show loading state
            updateUIState(container, {
                reviewCount: 0,
                summary: "Analyzing reviews...",
                dealbreakers: ["Scanning page content..."],
                longevityScore: "..."
            }, runAnalysis);

            setTimeout(runAnalysis, 1500); // Retry every 1.5s
            return;
        }

        if (analysis) {
            updateUIState(container, analysis, runAnalysis);
        } else {
            updateUIState(container, {
                reviewCount: 0,
                summary: "Could not find reviews on this page.",
                dealbreakers: ["Try scrolling down to load reviews", "Or click reload after loading more"],
                longevityScore: "?"
            }, runAnalysis);
        }
    };

    // Initial render with loading state
    container.innerHTML = getTemplate({
        reviewCount: 0,
        summary: "Initializing...",
        dealbreakers: [],
        longevityScore: "-"
    });

    shadow.appendChild(style);
    shadow.appendChild(container);

    // Kicks off the loop
    runAnalysis();
}

function updateUIState(container, data, onReload) {
    container.innerHTML = getTemplate(data);
    const reloadBtn = container.querySelector('.arp-reload-btn');
    if (reloadBtn && onReload) {
        reloadBtn.addEventListener('click', () => {
            console.log('Amazon Review Pulse: Manual reload triggered');
            // Show loading state immediately
            container.innerHTML = getTemplate({
                reviewCount: 0,
                summary: "Reloading...",
                dealbreakers: ["Re-scanning page..."],
                longevityScore: "..."
            });
            // Short timeout then reload
            setTimeout(onReload, 100);
        });
    }
}

function getTemplate(data) {
    return `
        <div class="arp-header">
            <div class="arp-title">
                <div class="arp-pulse-dot"></div>
                <div>
                    <div>Review Pulse</div>
                    <a href="https://alainpicard.ca" target="_blank" style="font-size: 10px; color: #999; text-decoration: none; font-weight: 400; display: block; line-height: 1; margin-top: 2px;">by alainpicard.ca</a>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="font-size: 10px; color: #999;">${data.reviewCount} reviews</div>
                <button class="arp-reload-btn" title="Reload Analysis">
                    ${ICONS.refresh}
                </button>
            </div>
        </div>
        <div class="arp-content">
            <div class="arp-section">
                <div class="arp-label">The "But" Summary</div>
                <div class="arp-summary-text">
                    ${data.summary}
                </div>
            </div>
            
            <div class="arp-section">
                <div class="arp-label">Top Dealbreakers</div>
                <ul class="arp-dealbreakers">
                    ${data.dealbreakers.map(d => `
                        <li class="arp-dealbreaker-item">
                            ${d.includes('Scanning') || d.includes('loading') || d.includes('pending') ? '' : '<span class="arp-icon-warn"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span>'}
                            ${d}
                        </li>
                    `).join('')}
                </ul>
            </div>

            <div class="arp-section" style="display: flex; gap: 12px;">
                <div style="flex: 1;">
                    <div class="arp-label">Longevity Est.</div>
                    <div class="arp-longevity">
                        <div class="arp-score">${data.longevityScore}</div>
                    </div>
                </div>
                <div style="flex: 1;">
                    <div class="arp-label">Trust Score</div>
                    <div class="arp-longevity">
                         ${data.trustScore ? `
                            <div class="arp-score" style="color: ${data.trustScore.color}; font-size: 18px;">${data.trustScore.label}</div>
                            <div class="arp-score-label">${data.trustScore.percent}% Verified<br>Purchases</div>
                         ` : '<div class="arp-score-label">Calculating...</div>'}
                    </div>
                </div>
            </div>
        </div>
        <div class="arp-button" style="text-align: center; cursor: default;">The Report</div>
    `;
}

// Start
let lastUrl = location.href;
init();

// Watch for SPA URL changes
setInterval(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log('Amazon Review Pulse: URL changed, re-initializing...');

        // Remove old widget to ensure fresh state
        const oldContainer = document.getElementById('arp-container');
        if (oldContainer) oldContainer.remove();

        // Re-run init
        init();
    }
}, 1000);
