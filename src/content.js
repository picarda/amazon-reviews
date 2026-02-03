// Amazon Review Pulse - Content Script

console.log('Amazon Review Pulse: Loaded');

// --- Icons (SVG Strings) ---
const ICONS = {
    fire: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-2.246-3.664-4.991-5.465a.519.519 0 0 1-.09-.728c.32-.387.653-.618.918-.734A12.96 12.96 0 0 0 12 0C7.294 0 2.5 4.794 2.5 12a1 1 0 0 0 1 1h5z"/><path d="M15.5 14.5A2.5 2.5 0 0 1 13 12c0-1.38.5-2 1-3 1.072-2.143 2.246-3.664 4.991-5.465a.519.519 0 0 0 .09-.728c-.32-.387-.653-.618-.918-.734A12.96 12.96 0 0 1 12 0c4.706 0 9.5 4.794 9.5 12a1 1 0 0 1-1 1h-5z"/><line x1="12" y1="14" x2="12" y2="24"/></svg>`,
    alert: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
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
        
        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(255, 59, 48, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 59, 48, 0); }
        }

        .arp-content {
            padding: 16px;
            max-height: 400px;
            overflow-y: auto;
        }

        .arp-section {
            margin-bottom: 16px;
        }
        
        .arp-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #888;
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
            background: #f5f5f7;
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
            background: #111;
            color: #fff;
            border: none;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
            border-top: 1px solid #eee;
        }
        
        .arp-button:hover {
            background: #000;
        }
    `;

    // Structure
    const container = document.createElement('div');
    container.className = 'arp-widget';

    // Run initial analysis (Mock for now)
    const analysis = analyzePage(document);

    container.innerHTML = `
        <div class="arp-header">
            <div class="arp-title">
                <div class="arp-pulse-dot"></div>
                Review Pulse
            </div>
            <div style="font-size: 10px; color: #999;">${analysis.reviewCount} reviews analyzed</div>
        </div>
        <div class="arp-content">
            <div class="arp-section">
                <div class="arp-label">The "But" Summary</div>
                <div class="arp-summary-text">
                    ${analysis.summary}
                </div>
            </div>
            
            <div class="arp-section">
                <div class="arp-label">Top Dealbreakers</div>
                <ul class="arp-dealbreakers">
                    ${analysis.dealbreakers.map(d => `
                        <li class="arp-dealbreaker-item">
                            <span class="arp-icon-warn">${ICONS.alert}</span>
                            ${d}
                        </li>
                    `).join('')}
                </ul>
            </div>

            <div class="arp-section">
                <div class="arp-label">Estimated Longevity</div>
                <div class="arp-longevity">
                    <div class="arp-score">${analysis.longevityScore}</div>
                    <div class="arp-score-label">Average Lifespan<br>based on users</div>
                </div>
            </div>
        </div>
        <button class="arp-button">Full Report</button>
    `;

    shadow.appendChild(style);
    shadow.appendChild(container);
}

// Start
init();
