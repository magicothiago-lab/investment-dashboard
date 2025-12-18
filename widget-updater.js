// Widget Data Updater
// This file generates the widget-data.json for home screen widgets

function updateWidgetData() {
    // Get latest portfolio data from localStorage or indexedDB
    const portfolioData = getLatestPortfolioData();

    if (!portfolioData) {
        return {
            totalInvested: "€0.00",
            totalReceived: "€0.00",
            profitLoss: "€0.00",
            profitLossColor: "default",
            roi: "0.00%",
            roiColor: "default",
            lastUpdate: new Date().toLocaleString()
        };
    }

    const { totalInvested, totalReceived } = portfolioData;
    const profitLoss = totalReceived - totalInvested;
    const roi = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

    const widgetData = {
        totalInvested: formatEuro(totalInvested),
        totalReceived: formatEuro(totalReceived),
        profitLoss: formatEuro(profitLoss),
        profitLossColor: profitLoss >= 0 ? "good" : "attention",
        roi: roi.toFixed(2) + "%",
        roiColor: roi >= 0 ? "good" : "attention",
        lastUpdate: new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    };

    // Save to file (this would be done server-side in production)
    localStorage.setItem('widgetData', JSON.stringify(widgetData));

    // Notify widget to update (if supported)
    if ('widgets' in navigator) {
        navigator.widgets.updateByTag('portfolio-widget', widgetData);
    }

    return widgetData;
}

function getLatestPortfolioData() {
    // Try to get data from localStorage
    const stored = localStorage.getItem('latestPortfolioKPIs');
    if (stored) {
        return JSON.parse(stored);
    }
    return null;
}

function formatEuro(num) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { updateWidgetData };
}