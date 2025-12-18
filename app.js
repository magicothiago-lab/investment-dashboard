// ====== State Management ======
let chartShare = null;
let chartInvested = null;
let chartReceived = null;
let chartHistorical = null;
let dataTable = null;
let allData = []; // Store all historical data
let currentGoal = null;

// ====== Utility Functions ======
function parseEuroToNumber(value) {
    if (value == null) return NaN;
    const str = String(value).trim();
    if (!str) return NaN;

    const noCurrency = str.replace(/[€$£¥\s]/g, '');
    const normalized = noCurrency.replace(/\./g, '').replace(',', '.');
    const num = Number(normalized);
    return Number.isFinite(num) ? num : NaN;
}

function formatEuro(num) {
    if (!Number.isFinite(num)) return '—';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR'
    }).format(num);
}

function formatPercent(num) {
    if (!Number.isFinite(num)) return '—';
    return (num * 100).toFixed(2) + '%';
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function setStatus(message) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
}

function parseMonth(monthStr) {
    if (!monthStr) return null;
    const str = String(monthStr).trim();
    // Support YYYY-MM or YYYY/MM format
    const match = str.match(/^(\d{4})[-/](\d{1,2})$/);
    if (match) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, 1);
    }
    return null;
}

// ====== Data Processing ======
function normalizeRows(rows) {
    const normalized = [];

    for (const row of rows) {
        const platform = (row['Platform'] || row['platform'] || '').toString().trim();
        if (!platform) continue;

        const invested = parseEuroToNumber(
            row['Invested (€)'] || row['Invested'] || row['Invested (€) ']
        );
        const received = parseEuroToNumber(
            row['Received'] || row['Received (€)'] || row['Received ']
        );

        if (!Number.isFinite(invested) && !Number.isFinite(received)) continue;

        const month = parseMonth(row['Month'] || row['month']);
        const yieldRate = (Number.isFinite(invested) && invested > 0 && Number.isFinite(received))
            ? (received / invested)
            : NaN;

        const profitLoss = (Number.isFinite(invested) && Number.isFinite(received))
            ? (received - invested)
            : NaN;

        const roi = (Number.isFinite(invested) && invested > 0 && Number.isFinite(profitLoss))
            ? (profitLoss / invested)
            : NaN;

        normalized.push({
            platform,
            invested: invested || 0,
            received: received || 0,
            yieldRate,
            profitLoss,
            roi,
            month
        });
    }

    return normalized;
}

function aggregateByMonth(data) {
    const monthlyData = {};

    data.forEach(item => {
        if (!item.month) return;

        const key = item.month.toISOString().substring(0, 7);
        if (!monthlyData[key]) {
            monthlyData[key] = {
                date: item.month,
                invested: 0,
                received: 0,
                platforms: new Set()
            };
        }

        monthlyData[key].invested += item.invested;
        monthlyData[key].received += item.received;
        monthlyData[key].platforms.add(item.platform);
    });

    return Object.values(monthlyData).sort((a, b) => a.date - b.date);
}

function getLatestData(data) {
    const byPlatform = {};

    data.forEach(item => {
        const key = item.platform;
        if (!byPlatform[key] || !item.month ||
            (byPlatform[key].month && item.month > byPlatform[key].month)) {
            byPlatform[key] = item;
        } else if (!byPlatform[key].month && !item.month) {
            byPlatform[key] = item;
        }
    });

    return Object.values(byPlatform);
}

function computeKpis(data, previousData = null) {
    const totalInvested = data.reduce((sum, item) => sum + (item.invested || 0), 0);
    const totalReceived = data.reduce((sum, item) => sum + (item.received || 0), 0);
    const yieldRate = totalInvested > 0 ? totalReceived / totalInvested : NaN;
    const profitLoss = totalReceived - totalInvested;
    const roi = totalInvested > 0 ? profitLoss / totalInvested : NaN;

    const topPlatform = [...data].sort((a, b) => (b.invested || 0) - (a.invested || 0))[0];
    const topLabel = topPlatform
        ? `${topPlatform.platform} (${formatEuro(topPlatform.invested)})`
        : '—';

    let changes = { invested: null, received: null, yield: null };

    if (previousData) {
        const prevInvested = previousData.reduce((sum, item) => sum + (item.invested || 0), 0);
        const prevReceived = previousData.reduce((sum, item) => sum + (item.received || 0), 0);
        const prevYield = prevInvested > 0 ? prevReceived / prevInvested : 0;

        changes.invested = totalInvested - prevInvested;
        changes.received = totalReceived - prevReceived;
        changes.yield = yieldRate - prevYield;
    }

    return { totalInvested, totalReceived, yieldRate, profitLoss, roi, topLabel, changes };
}

// ====== Goal Management ======
function saveGoal() {
    const targetValue = parseFloat(document.getElementById('targetValue').value);
    const targetDate = document.getElementById('targetDate').value;

    if (!targetValue || !targetDate) {
        alert('Please enter both target value and date');
        return;
    }

    currentGoal = { targetValue, targetDate: new Date(targetDate) };
    localStorage.setItem('portfolioGoal', JSON.stringify(currentGoal));

    updateGoalProgress();
    checkGoalNotification();
}

function loadGoal() {
    const saved = localStorage.getItem('portfolioGoal');
    if (saved) {
        currentGoal = JSON.parse(saved);
        currentGoal.targetDate = new Date(currentGoal.targetDate);

        document.getElementById('targetValue').value = currentGoal.targetValue;
        document.getElementById('targetDate').value = currentGoal.targetDate.toISOString().split('T')[0];

        updateGoalProgress();
    }
}

function updateGoalProgress() {
    if (!currentGoal || allData.length === 0) {
        document.getElementById('goalProgress').style.display = 'none';
        return;
    }

    const latestData = getLatestData(allData);
    const kpis = computeKpis(latestData);
    const currentValue = kpis.totalInvested;

    const progress = Math.min((currentValue / currentGoal.targetValue) * 100, 100);
    const remaining = Math.max(currentGoal.targetValue - currentValue, 0);
    const daysLeft = Math.ceil((currentGoal.targetDate - new Date()) / (1000 * 60 * 60 * 24));

    document.getElementById('goalProgress').style.display = 'block';
    document.getElementById('goalPercentage').textContent = progress.toFixed(1) + '%';
    document.getElementById('goalProgressBar').style.width = progress + '%';
    document.getElementById('goalRemaining').textContent = formatEuro(remaining) + ' remaining';
    document.getElementById('goalDaysLeft').textContent = daysLeft > 0
        ? `${daysLeft} days left`
        : 'Goal date passed';

    if (progress >= 100) {
        document.getElementById('goalDaysLeft').textContent = '🎉 Goal achieved!';
        document.getElementById('goalDaysLeft').style.color = 'var(--success-color)';
    }
}

function checkGoalNotification() {
    if (!currentGoal || !('Notification' in window)) return;

    const latestData = getLatestData(allData);
    const kpis = computeKpis(latestData);
    const progress = (kpis.totalInvested / currentGoal.targetValue) * 100;

    const lastNotified = localStorage.getItem('lastGoalNotification');
    const milestones = [25, 50, 75, 100];

    milestones.forEach(milestone => {
        if (progress >= milestone && (!lastNotified || parseFloat(lastNotified) < milestone)) {
            sendNotification(`Portfolio Goal: ${milestone}% Complete!`,
                `You've reached ${milestone}% of your ${formatEuro(currentGoal.targetValue)} goal!`);
            localStorage.setItem('lastGoalNotification', milestone.toString());
        }
    });
}

// ====== Push Notifications ======
function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert('This browser does not support notifications');
        return;
    }

    if (Notification.permission === 'granted') {
        alert('Notifications are already enabled!');
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            sendNotification('Notifications Enabled!',
                'You will receive updates when you reach portfolio goals');
        }
    });
}

function sendNotification(title, body) {
    if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body,
            icon: './icon-192.png',
            badge: './icon-192.png',
            tag: 'portfolio-goal',
            requireInteraction: false
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };
    }
}

// ====== Rendering Functions ======
function renderKpis(kpis) {
    document.getElementById('kpiInvested').textContent = formatEuro(kpis.totalInvested);
    document.getElementById('kpiReceived').textContent = formatEuro(kpis.totalReceived);
    document.getElementById('kpiYield').textContent = formatPercent(kpis.yieldRate);
    document.getElementById('kpiProfitLoss').textContent = formatEuro(kpis.profitLoss);
    document.getElementById('kpiROI').textContent = 'ROI: ' + formatPercent(kpis.roi);

    // Show changes if available
    if (kpis.changes.invested !== null) {
        const investedChange = document.getElementById('kpiInvestedChange');
        const sign = kpis.changes.invested >= 0 ? '+' : '';
        investedChange.textContent = `${sign}${formatEuro(kpis.changes.invested)} vs last period`;
        investedChange.className = 'kpi-change ' + (kpis.changes.invested >= 0 ? 'positive' : 'negative');

        const receivedChange = document.getElementById('kpiReceivedChange');
        const signR = kpis.changes.received >= 0 ? '+' : '';
        receivedChange.textContent = `${signR}${formatEuro(kpis.changes.received)} vs last period`;
        receivedChange.className = 'kpi-change ' + (kpis.changes.received >= 0 ? 'positive' : 'negative');

        const yieldChange = document.getElementById('kpiYieldChange');
        const signY = kpis.changes.yield >= 0 ? '+' : '';
        yieldChange.textContent = `${signY}${formatPercent(kpis.changes.yield)} vs last period`;
        yieldChange.className = 'kpi-change ' + (kpis.changes.yield >= 0 ? 'positive' : 'negative');
    }
}

function renderHistoricalChart(monthlyData) {
    if (monthlyData.length === 0) {
        document.getElementById('historicalSection').style.display = 'none';
        return;
    }

    document.getElementById('historicalSection').style.display = 'block';

    const labels = monthlyData.map(d => d.date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
    }));
    const invested = monthlyData.map(d => d.invested);
    const received = monthlyData.map(d => d.received);
    const profitLoss = monthlyData.map(d => d.received - d.invested);

    const ctx = document.getElementById('chartHistorical');
    if (chartHistorical) chartHistorical.destroy();

    chartHistorical = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Invested',
                    data: invested,
                    borderColor: 'rgba(102, 126, 234, 1)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Received',
                    data: received,
                    borderColor: 'rgba(245, 87, 108, 1)',
                    backgroundColor: 'rgba(245, 87, 108, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Profit/Loss',
                    data: profitLoss,
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${formatEuro(context.parsed.y)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatEuro(value)
                    }
                }
            }
        }
    });
}

function renderCharts(data) {
    const labels = data.map(d => d.platform);
    const invested = data.map(d => d.invested);
    const received = data.map(d => d.received);

    const colors = {
        primary: 'rgba(102, 126, 234, 0.8)',
        secondary: 'rgba(245, 87, 108, 0.8)',
        gradient: [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(240, 147, 251, 0.8)',
            'rgba(245, 87, 108, 0.8)',
            'rgba(79, 172, 254, 0.8)',
            'rgba(0, 242, 254, 0.8)',
            'rgba(250, 112, 154, 0.8)',
            'rgba(254, 225, 64, 0.8)'
        ]
    };

    // Invested Bar Chart
    const ctxInvested = document.getElementById('chartInvested');
    if (chartInvested) chartInvested.destroy();

    chartInvested = new Chart(ctxInvested, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Invested (€)',
                data: invested,
                backgroundColor: colors.primary,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Invested: ${formatEuro(context.parsed.y)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatEuro(value)
                    }
                }
            }
        }
    });

    // Received Bar Chart
    const ctxReceived = document.getElementById('chartReceived');
    if (chartReceived) chartReceived.destroy();

    chartReceived = new Chart(ctxReceived, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Received (€)',
                data: received,
                backgroundColor: colors.secondary,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Received: ${formatEuro(context.parsed.y)}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => formatEuro(value)
                    }
                }
            }
        }
    });

    // Donut Chart
    const ctxShare = document.getElementById('chartShareInvested');
    if (chartShare) chartShare.destroy();

    const totalInvested = invested.reduce((sum, val) => sum + val, 0);

    chartShare = new Chart(ctxShare, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                label: 'Investment Share',
                data: invested,
                backgroundColor: colors.gradient,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const value = context.parsed;
                            const percentage = totalInvested > 0 ? (value / totalInvested) : 0;
                            const name = context.label || '';
                            return `${name}: ${formatEuro(value)} (${(percentage * 100).toFixed(2)}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderTable(data) {
    const totalInvested = data.reduce((sum, item) => sum + (item.invested || 0), 0);

    const tbody = document.querySelector('#tbl tbody');
    tbody.innerHTML = data.map(item => {
        const share = totalInvested > 0 ? (item.invested / totalInvested) : NaN;
        const plClass = item.profitLoss >= 0 ? 'positive-value' : 'negative-value';
        const roiClass = item.roi >= 0 ? 'positive-value' : 'negative-value';

        return `
            <tr>
                <td>${escapeHtml(item.platform)}</td>
                <td>${formatEuro(item.invested)}</td>
                <td>${formatEuro(item.received)}</td>
                <td class="${plClass}">${formatEuro(item.profitLoss)}</td>
                <td class="${roiClass}">${formatPercent(item.roi)}</td>
                <td>${formatPercent(item.yieldRate)}</td>
                <td>${formatPercent(share)}</td>
            </tr>
        `;
    }).join('');

    if (dataTable) dataTable.destroy();

    dataTable = new DataTable('#tbl', {
        pageLength: 10,
        order: [[3, 'desc']],
        language: {
            search: 'Search:',
            lengthMenu: 'Show _MENU_ entries',
            info: 'Showing _START_ to _END_ of _TOTAL_ platforms',
            infoEmpty: 'No platforms available',
            paginate: {
                first: 'First',
                last: 'Last',
                next: 'Next',
                previous: 'Previous'
            }
        }
    });
}

function renderAll(rawRows, filename = 'CSV') {
    const data = normalizeRows(rawRows);

    if (data.length === 0) {
        setStatus('No valid data found in CSV');
        return;
    }

    allData = [...allData, ...data];

    const latestData = getLatestData(allData);
    latestData.sort((a, b) => (b.invested || 0) - (a.invested || 0));

    const monthlyData = aggregateByMonth(allData);
    let previousMonthData = null;

    if (monthlyData.length > 1) {
        const prevMonth = monthlyData[monthlyData.length - 2];
        previousMonthData = allData.filter(item =>
            item.month && item.month.getTime() === prevMonth.date.getTime()
        );
    }

    const kpis = computeKpis(latestData, previousMonthData);
    renderKpis(kpis);
    renderHistoricalChart(monthlyData);
    renderCharts(latestData);
    renderTable(latestData);
    updateGoalProgress();
    checkGoalNotification();

    // Save KPIs for widget
    saveKPIsForWidget(kpis);

    const hasMonthData = data.some(item => item.month !== null);
    setStatus(`✓ Loaded: ${filename} • ${latestData.length} platforms` +
        (hasMonthData ? ' • Historical data detected' : ''));
}

// ====== Widget Data Management ======
function saveKPIsForWidget(kpis) {
    const widgetData = {
        totalInvested: kpis.totalInvested,
        totalReceived: kpis.totalReceived,
        profitLoss: kpis.profitLoss,
        roi: kpis.roi,
        lastUpdate: new Date().toISOString()
    };

    localStorage.setItem('latestPortfolioKPIs', JSON.stringify(widgetData));

    // Update widget if API available
    if ('setAppBadge' in navigator) {
        // Show portfolio value in app badge (if supported)
        const badge = Math.floor(kpis.totalInvested / 1000); // Show in thousands
        navigator.setAppBadge(badge).catch(() => { });
    }
}

// ====== Export to PDF ======
async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(102, 126, 234);
    pdf.text('Investment Portfolio Report', 20, 20);

    // Date
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 28);

    // KPIs
    const latestData = getLatestData(allData);
    const kpis = computeKpis(latestData);

    pdf.setFontSize(14);
    pdf.setTextColor(0);
    pdf.text('Portfolio Summary', 20, 40);

    pdf.setFontSize(11);
    let y = 48;
    pdf.text(`Total Invested: ${formatEuro(kpis.totalInvested)}`, 20, y);
    pdf.text(`Total Received: ${formatEuro(kpis.totalReceived)}`, 20, y + 7);
    pdf.text(`Profit/Loss: ${formatEuro(kpis.profitLoss)}`, 20, y + 14);
    pdf.text(`ROI: ${formatPercent(kpis.roi)}`, 20, y + 21);
    pdf.text(`Yield: ${formatPercent(kpis.yieldRate)}`, 20, y + 28);

    // Platform Details Table
    y = 90;
    pdf.setFontSize(14);
    pdf.text('Platform Details', 20, y);

    y += 8;
    pdf.setFontSize(9);

    // Table headers
    pdf.setFillColor(102, 126, 234);
    pdf.setTextColor(255);
    pdf.rect(20, y, 170, 7, 'F');
    pdf.text('Platform', 22, y + 5);
    pdf.text('Invested', 70, y + 5);
    pdf.text('Received', 100, y + 5);
    pdf.text('P&L', 130, y + 5);
    pdf.text('ROI', 160, y + 5);

    y += 7;
    pdf.setTextColor(0);

    // Table rows
    latestData.forEach((item, i) => {
        if (y > 270) {
            pdf.addPage();
            y = 20;
        }

        const bgColor = i % 2 === 0 ? 245 : 255;
        pdf.setFillColor(bgColor);
        pdf.rect(20, y, 170, 7, 'F');

        pdf.text(item.platform.substring(0, 20), 22, y + 5);
        pdf.text(formatEuro(item.invested), 70, y + 5);
        pdf.text(formatEuro(item.received), 100, y + 5);

        const plColor = item.profitLoss >= 0 ? [16, 185, 129] : [239, 68, 68];
        pdf.setTextColor(...plColor);
        pdf.text(formatEuro(item.profitLoss), 130, y + 5);
        pdf.text(formatPercent(item.roi), 160, y + 5);
        pdf.setTextColor(0);

        y += 7;
    });

    // Footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`Page ${i} of ${pageCount}`, 190, 287, { align: 'right' });
    }

    pdf.save('investment-portfolio-report.pdf');
    setStatus('✓ PDF exported successfully');
}

// ====== Event Handlers ======
document.getElementById('fileInput').addEventListener('change', (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setStatus('Reading CSV file(s)...');

    Array.from(files).forEach(file => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            complete: (results) => {
                if (results.errors?.length) {
                    console.warn('CSV parsing warnings:', results.errors);
                }
                renderAll(results.data, file.name);
            },
            error: (error) => {
                console.error('CSV parsing error:', error);
                setStatus('❌ Error reading CSV file');
            }
        });
    });
});

document.getElementById('demoBtn').addEventListener('click', () => {
    const demoCSV = `Platform,Invested (€),Received,Month
Quanloop,€10.371.17,€131.15,2024-12
Maclear,€6.805.08,€87.14,2024-12
8lends,€6.289.23,€100.69,2024-12
Scramble,€4.141.68,€26.25,2024-12
Quanloop,€9.500.00,€115.00,2024-11
Maclear,€6.500.00,€75.00,2024-11
8lends,€6.000.00,€85.00,2024-11
Quanloop,€8.800.00,€95.00,2024-10
Maclear,€6.200.00,€65.00,2024-10`;

    setStatus('Loading demo data...');
    allData = []; // Reset for demo

    Papa.parse(demoCSV, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
            renderAll(results.data, 'Demo Data (with history)');
        }
    });
});

document.getElementById('saveGoalBtn').addEventListener('click', saveGoal);
document.getElementById('notificationBtn').addEventListener('click', requestNotificationPermission);
document.getElementById('exportBtn').addEventListener('click', exportToPDF);

// Period filter for historical chart
document.querySelectorAll('.btn-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-pill').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // Filter logic would go here
        const period = e.target.dataset.period;
        console.log('Filter by period:', period);
    });
});

// ====== Initialization ======
console.log('Investment Portfolio Dashboard initialized');
loadGoal();
setStatus('Ready to import CSV file');
