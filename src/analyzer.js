// Analysis Logic

function analyzePage(document) {
    // 1. Scrape Reviews (Robust Selectors)
    const selectors = [
        'div[data-hook="review"]',
        '.check_all_reviews_btn',
        '.a-section.review',
        'div[id^="customer_review-"]'
    ];

    let reviewElements = [];
    for (const selector of selectors) {
        const found = document.querySelectorAll(selector);
        // Filter to ensure they are actual review blocks (sometimes buttons share classes)
        const filtered = Array.from(found).filter(el =>
            el.querySelector('span[data-hook="review-body"]') ||
            el.querySelector('.review-text-content')
        );

        if (filtered.length > 0) {
            reviewElements = filtered;
            console.log(`Amazon Review Pulse: Found ${reviewElements.length} reviews using selector: ${selector}`);
            break;
        }
    }

    // Extraction Logic
    const reviews = Array.from(reviewElements).map(el => {
        // Body
        let body = el.querySelector('span[data-hook="review-body"]')?.innerText;
        if (!body) body = el.querySelector('.review-text-content')?.innerText;

        // Title
        let title = el.querySelector('a[data-hook="review-title"]')?.innerText;
        if (!title) title = el.querySelector('.review-title')?.innerText;

        // Date
        const date = el.querySelector('span[data-hook="review-date"]')?.innerText || '';

        // Verified
        const verified = !!el.querySelector('span[data-hook="avp-badge"]');

        return { body: body || '', title: title || '', date, verified };
    });

    const totalReviews = reviews.length;

    // Return null if no reviews found so the caller (content.js) can retry
    if (totalReviews === 0) {
        return null;
    }

    // Heuristics:
    // Look for common "fail" keywords
    const failKeywords = ['stopped working', 'broke', 'fire', 'leak', 'died', 'junk', 'return', 'failed', 'trash', 'disappointed'];
    let failCount = 0;
    let failReasons = [];

    reviews.forEach(r => {
        const text = (r.body + r.title).toLowerCase();
        failKeywords.forEach(k => {
            if (text.includes(k)) {
                failCount++;
                // Extract the sentence containing the keyword for "Dealbreakers"
                const sentences = text.split(/[.!?]/);
                const match = sentences.find(s => s.includes(k));
                if (match && match.length < 80) failReasons.push(match.trim());
            }
        });
    });

    // Generate Dynamic "But" Summary
    const positiveVibe = "Users generally like the design";
    const percentFail = totalReviews > 0 ? Math.round((failCount / totalReviews) * 100) : 0;
    const negativeVibe = failCount > 0
        ? `BUT ${percentFail}% mention failure or quality issues.`
        : "BUT some mention minor inconsistencies.";

    const summary = `${positiveVibe}, <span class="arp-highlight">${negativeVibe}</span>`;

    // Extract detailed Dealbreakers (Top 3 unique ones)
    const uniqueDealbreakers = [...new Set(failReasons)].slice(0, 3);
    const dealbreakers = uniqueDealbreakers.length > 0 ? uniqueDealbreakers : [
        "Analysis pending details...",
        "Check 1-star reviews for safety claims",
        "Verify warranty terms before purchase"
    ];

    // Simple Longevity Heuristic
    // If many people say "stopped working after X", we'd parse X. 
    // Here we just mock based on failure rate.
    let longevity = "3+ Years";
    if (percentFail > 10) longevity = "6-12 Months";
    if (percentFail > 30) longevity = "< 3 Months";

    return {
        reviewCount: totalReviews,
        summary: summary,
        dealbreakers: dealbreakers,
        longevityScore: longevity
    };
}

// Export for module use if we use modules, but for chrome extension plain scripts:
window.analyzePage = analyzePage;
