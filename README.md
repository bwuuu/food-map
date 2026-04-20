# 🍝 Food Map

A personal restaurant tracking map built with Leaflet.js and pure HTML/CSS/JS. Inspired by the [Taipei Burger Map](https://hsieh-george.github.io/taipei-burger-map/).

![screenshot](screenshot.png)

## ✨ Features

- 🗺️ **Interactive Map** - Powered by Leaflet.js with OpenStreetMap tiles
- ⭐ **Tier Rating System** - T0 (Must Try) to T5 (Skip)
- 🔍 **Filter by Rank & Area** - Find exactly what you want
- 💰 **Price Range Display** - Know what to expect
- 📤 **Google Maps Navigation** - One-click directions
- 📱 **Mobile Responsive** - Works on all devices

## 🚀 Quick Start

### 1. Clone this repo
```bash
git clone https://github.com/YOUR_USERNAME/food-map.git
cd food-map
```

### 2. Add your restaurants
Edit `data.js` and add your restaurants following the template:

```javascript
{
    "name": "Your Restaurant Name",
    "rank": "T0",  // T0-T5 rating
    "area": "Downtown",
    "address": "123 Main St, Your City",
    "cuisine": "Italian",
    "type": "Fine Dining",
    "price": "$30-50",
    "notes": "Best pasta in town",
    "lat": 25.0330,  // Find on Google Maps
    "lng": 121.5654
}
```

### 3. Find coordinates
- Go to [Google Maps](https://maps.google.com)
- Find your restaurant
- Right-click → "What's here?" → copy coordinates
- Or use: [gps-coordinates.org](https://www.gps-coordinates.org/)

### 4. Test locally
Open `index.html` in your browser:
```bash
# Using Python
python -m http.server 8000

# Or using Node.js
npx serve
```

### 5. Deploy to GitHub Pages
1. Push to GitHub
2. Go to Settings → Pages
3. Select "Deploy from a branch" → Select "master/main"
4. Your site will be at: `https://YOUR_USERNAME.github.io/food-map/`

## 🔧 Customization

### Change the Rating System
Edit the `tierColors` object in `index.html`:

```javascript
const tierColors = {
    'T0': '#e63946',  // Must Try
    'T1': '#f4a261',  // Excellent
    'T2': '#e9c46a',  // Good
    'T3': '#a8dadc',  // Average
    'T4': '#457b9d',  // Below Average
    'T5': '#6c757d',  // Skip
};
```

### Change Map Style
The default uses CARTO dark tiles. To change:

```javascript
// In index.html, change the tileLayer URL:
// Light mode:
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')

// Satellite:
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}')
```

## 📝 Data Template

```javascript
{
    "name": "Restaurant Name (required)",
    "rank": "T0-T5 (required)",
    "area": "Neighborhood (required)",
    "address": "Full address (required for navigation)",
    "cuisine": "Cuisine type (optional)",
    "type": "Dining type (optional)",
    "price": "Price range (optional)",
    "notes": "Personal notes (optional)",
    "lat": 0.0000,  // Latitude (required)
    "lng": 0.0000   // Longitude (required)
}
```

## 🚀 Deployment Options

1. **GitHub Pages** (Free, easiest)
2. **Netlify** (Free, drag-and-drop)
3. **Vercel** (Free, Git integration)
4. **Firebase Hosting** (Free, Google ecosystem)
5. **Static host** (Any web server)

## 👥 Contributing

This is a personal project template. Fork it and make it your own!

## 📄 License

MIT License - feel free to use and modify.

---

Made with ❤️ and 🍝
