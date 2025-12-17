# Investment Portfolio Dashboard

A modern, responsive web dashboard for tracking investments and returns across multiple platforms.

![Dashboard Preview](screenshot.png)

## Features

- 📊 **Interactive Charts**: Visualize your investment distribution with bar charts and donut charts
- 💰 **KPI Cards**: Track total invested, received, yield, and top platform at a glance
- 📈 **Data Table**: Sortable, searchable table with detailed platform information
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- 🌓 **Dark Mode**: Automatic dark mode support based on system preferences
- 📁 **CSV Import**: Easy data import via CSV file upload
- 🎨 **Modern UI**: Clean, gradient-based design with smooth animations

## Demo

[View Live Demo](https://yourusername.github.io/investment-dashboard/)

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A CSV file with your investment data

### Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/investment-dashboard.git
cd investment-dashboard
```

2. Open `index.html` in your web browser:
```bash
# On macOS
open index.html

# On Linux
xdg-open index.html

# On Windows
start index.html
```

Or simply drag and drop the `index.html` file into your browser.

### GitHub Pages Deployment

1. Push your code to GitHub
2. Go to your repository settings
3. Navigate to "Pages" in the left sidebar
4. Under "Source", select "main" branch
5. Click "Save"
6. Your dashboard will be available at `https://yourusername.github.io/investment-dashboard/`

## CSV Format

The dashboard expects a CSV file with the following columns:

```csv
Platform,Invested (€),Received
Quanloop,€10.371,17,€131,15
Maclear,€6.805,08,€87,14
8lends,€6.289,23,€100,69
```

### Column Details

- **Platform**: Name of the investment platform (text)
- **Invested (€)**: Amount invested in euros (can use European format: €1.234,56)
- **Received**: Amount received/returned in euros

### Supported Number Formats

The dashboard supports multiple number formats:
- European format: `€1.234,56` or `1.234,56`
- US format: `$1,234.56` or `1234.56`
- Plain numbers: `1234.56`

## File Structure

```
investment-dashboard/
├── index.html          # Main HTML structure
├── styles.css          # All styling and responsive design
├── app.js              # JavaScript logic and chart rendering
└── README.md           # Documentation
```

## Technologies Used

- **HTML5**: Structure and semantics
- **CSS3**: Modern styling with CSS Grid, Flexbox, and gradients
- **JavaScript (ES6+)**: Data processing and chart rendering
- **Chart.js**: Beautiful, responsive charts
- **DataTables**: Advanced table features (sorting, searching, pagination)
- **PapaParse**: Robust CSV parsing

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

## Customization

### Changing Colors

Edit the CSS variables in `styles.css`:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --success-color: #10b981;
    /* ... */
}
```

### Adding New Metrics

1. Add a new KPI card in `index.html`
2. Create calculation logic in `app.js` in the `computeKpis()` function
3. Update the rendering in `renderKpis()`

### Chart Customization

Modify chart options in `app.js` in the `renderCharts()` function. See [Chart.js documentation](https://www.chartjs.org/docs/latest/) for all available options.

## Features Roadmap

- [ ] Historical data tracking (monthly comparison)
- [ ] Export to PDF/Excel
- [ ] Multiple currency support
- [ ] Performance metrics (ROI, IRR)
- [ ] Goal tracking
- [ ] Email reports

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Chart.js for the beautiful charts
- DataTables for table functionality
- PapaParse for CSV parsing
- Design inspiration from modern dashboard UIs

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/yourusername/investment-dashboard/issues) on GitHub.

---

Made with ❤️ for better investment tracking
