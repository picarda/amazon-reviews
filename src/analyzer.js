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
        // Filter to ensure they are actual review blocks
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
        let verified = !!el.querySelector('span[data-hook="avp-badge"]');
        if (!verified) {
            // Fallback: Check identifying text (Safe language check)
            const reviewText = el.innerText || '';
            verified = reviewText.includes('Verified Purchase') || reviewText.includes('Verifizierter Kauf');
        }

        return { body: body || '', title: title || '', date, verified };
    });

    const totalReviews = reviews.length;

    // Return null if no reviews found so the caller (content.js) can retry
    if (totalReviews === 0) {
        return null;
    }

    // Logging for debug
    console.log(`Amazon Review Pulse: Analyzed ${totalReviews} reviews.`);

    // Heuristics:
    // Look for common "fail" keywords (Expanded list)
    const failKeywords = [
        'stopped working', 'broke', 'fire', 'leak', 'died', 'junk', 'return', 'failed', 'trash', 'disappointed',
        'poor quality', 'cheap', 'waste', 'horrible', 'useless', 'defective', 'breaks', 'warning', 'beware',
        'slow', 'noise', 'loud', 'hot', 'smell', 'pain', 'hard to use', 'complicated', 'doesn\'t work'
    ];
    let failCount = 0;
    let failReasons = [];

    reviews.forEach(r => {
        const text = (r.body + r.title);
        const lowerText = text.toLowerCase();

        failKeywords.forEach(k => {
            if (lowerText.includes(k)) {
                failCount++;
                // Extract the sentence containing the keyword for "Dealbreakers"
                // Split by logical sentence endings
                const sentences = text.split(/(?<=[.!?])\s+/);
                const match = sentences.find(s => s.toLowerCase().includes(k));
                if (match) {
                    // Clean up and truncate
                    let clean = match.trim();
                    if (clean.length > 5 && clean.length < 120) {
                        failReasons.push(clean);
                    }
                }
            }
        });
    });

    console.log(`Amazon Review Pulse: Found ${failReasons.length} fail reasons.`);

    // Generate Dynamic "But" Summary
    const percentFail = totalReviews > 0 ? Math.round((failCount / totalReviews) * 100) : 0;

    let positiveVibe = "Users generally like the product";
    if (percentFail < 5) positiveVibe = "Customers are highly satisfied";
    else if (percentFail > 40) positiveVibe = "Reception is mixed";

    const negativeVibe = failCount > 0
        ? `BUT ${percentFail > 0 ? percentFail : '<1'}% mention failure or quality issues.`
        : "BUT take note of the generic warnings below.";

    const summary = `${positiveVibe}, <span class="arp-highlight">${negativeVibe}</span>`;

    // Extract detailed Dealbreakers (Top 3 unique ones)
    const uniqueDealbreakers = [...new Set(failReasons)].slice(0, 3);
    const dealbreakers = uniqueDealbreakers.length > 0 ? uniqueDealbreakers : [
        "No major functional defects detected in current sample.",
        "Check 1-star reviews for edge cases.",
        "Read verified purchase reviews for detail."
    ];

    // Simple Longevity Heuristic
    let longevity = "3+ Years";
    if (percentFail > 10) longevity = "6-12 Months";
    if (percentFail > 30) longevity = "< 3 Months";

    // Authenticity / Trust Score Heuristic
    // Based on percentage of Verified Purchases in the sample
    const verifiedCount = reviews.filter(r => r.verified).length;
    const verifiedRatio = totalReviews > 0 ? (verifiedCount / totalReviews) : 0;

    let trustScore = "High";
    let trustColor = "green";

    if (verifiedRatio < 0.5) {
        trustScore = "Low";
        trustColor = "red";
    } else if (verifiedRatio < 0.8) {
        trustScore = "Medium";
        trustColor = "orange";
    }

    return {
        reviewCount: totalReviews,
        summary: summary,
        dealbreakers: dealbreakers,
        longevityScore: longevity,
        trustScore: {
            label: trustScore,
            color: trustColor,
            percent: Math.round(verifiedRatio * 100)
        }
    };
}

// Export for module use if we use modules, but for chrome extension plain scripts:
window.analyzePage = analyzePage;
