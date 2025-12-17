// ====== State Management ======
let chartShare = null;
let chartInvested = null;
let chartReceived = null;
let dataTable = null;

// ====== Utility Functions ======
function parseEuroToNumber(value) {
    if (value == null) return NaN;
    const str = String(value).trim();
    if (!str) return NaN;

    // Remove currency symbols and whitespace
    const noCurrency = str.replace(/[€$£¥\s]/g, '');

    // Handle European format: 1.234,56 -> 1234.56
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

        const yieldRate = (Number.isFinite(invested) && invested > 0 && Number.isFinite(received))
            ? (received / invested)
            : NaN;

        normalized.push({
            platform,
            invested: invested || 0,
            received: received || 0,
            yieldRate
        });
    }

    return normalized;
}

function computeKpis(data) {
    const totalInvested = data.reduce((sum, item) => sum + (item.invested || 0), 0);
    const totalReceived = data.reduce((sum, item) => sum + (item.received || 0), 0);
    const yieldRate = totalInvested > 0 ? totalReceived / totalInvested : NaN;

    const topPlatform = [...data].sort((a, b) => (b.invested || 0) - (a.invested || 0))[0];
    const topLabel = topPlatform
        ? `${topPlatform.platform} (${formatEuro(topPlatform.invested)})`
        : '—';

    return { totalInvested, totalReceived, yieldRate, topLabel };
}

// ====== Rendering Functions ======
function renderKpis(kpis) {
    document.getElementById('kpiInvested').textContent = formatEuro(kpis.totalInvested);
    document.getElementById('kpiReceived').textContent = formatEuro(kpis.totalReceived);
    document.getElementById('kpiYield').textContent = formatPercent(kpis.yieldRate);
    document.getElementById('kpiTop').textContent = kpis.topLabel;
}

function renderCharts(data) {
    const labels = data.map(d => d.platform);
    const invested = data.map(d => d.invested);
    const received = data.map(d => d.received);

    // Chart colors
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

    // Donut Chart - Investment Distribution
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
        return `
            <tr>
                <td>${escapeHtml(item.platform)}</td>
                <td>${formatEuro(item.invested)}</td>
                <td>${formatEuro(item.received)}</td>
                <td>${formatPercent(item.yieldRate)}</td>
                <td>${formatPercent(share)}</td>
            </tr>
        `;
    }).join('');

    if (dataTable) dataTable.destroy();

    dataTable = new DataTable('#tbl', {
        pageLength: 10,
        order: [[1, 'desc']],
        language: {
            search: 'Search:',
            lengthMenu: 'Show _MENU_ entries',
            info: 'Showing _START_ to _END_ of _TOTAL_ platforms',
            infoEmpty: 'No platforms available',
            infoFiltered: '(filtered from _MAX_ total platforms)',
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
    data.sort((a, b) => (b.invested || 0) - (a.invested || 0));

    if (data.length === 0) {
        setStatus('No valid data found in CSV');
        return;
    }

    const kpis = computeKpis(data);
    renderKpis(kpis);
    renderCharts(data);
    renderTable(data);

    setStatus(`✓ Loaded: ${filename} • ${data.length} platforms`);
}

// ====== Event Handlers ======
document.getElementById('fileInput').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('click', () => { fileInput.value = null; });


    setStatus('Reading CSV file...');

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

document.getElementById('demoBtn').addEventListener('click', () => {
    const demoCSV = `Platform,Invested (€),Received
Quanloop,"€10.371,17","€131,15"
Maclear,"€6.805,08","€87,14"
8lends,"€6.289,23","€100,69"
Scramble,"€4.141,68","€26,25"
Inter,"€1.279,06","€6,54"
Neon,"€1.251,45","€6,00"
Stocks,"€1.837,32","€0,40"
PeerBerry,"€519,73","€1,06"
Swaper,"€312,79","€0,12"
BTC/BCH,"€1.526,78","€0,00"
Mintos,"€1.208,47","€1,62"
Revolut,"€516,89","€1,68"
Monefit,"€2.037,64","€12,32"
VIAINVEST,"€252,06","€2,20"
NEXO,"€50,00","€0,30"
MetaMask,"€77,00","€0,00"`;

    setStatus('Loading demo data...');

    Papa.parse(demoCSV, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
            renderAll(results.data, 'Demo Data');
        }
    });
});

// ====== Initialization ======
console.log('Investment Portfolio Dashboard initialized');
setStatus('Ready to import CSV file');