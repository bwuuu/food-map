// Restaurant Data - Add your own restaurants here!
const foodData = [
    // ===== TIER 0: Must Try =====
    {
        "name": "手工蕎麥麵 蕎菜",
        "rank": "T0",
        "area": "Zhongshan District",
        "address": "No. 15-2號, Lane 105, Section 1, Zhongshan N Rd, Zhongshan District, Taipei City, 10491",
        "cuisine": "Japanese",
        "type": "Izakaya",
        "price": "$400-600 TWD",
        "notes": "Authentic handmade soba, opens at 18:00. Must try their soba! Phone: +886 2 2541 9992",
        "lat": 25.0623,
        "lng": 121.5235,
        "plusCode": "3G2F+8C Zhongshan District, Taipei City"
    },
    
    // ===== TIER 1: Excellent =====
    {
        "name": "Sample Restaurant - T1",
        "rank": "T1",
        "area": "Da'an District",
        "address": "123 Main St, Taipei",
        "cuisine": "Italian",
        "type": "Casual",
        "price": "$300-500 TWD",
        "notes": "Great pasta, cozy atmosphere",
        "lat": 25.0330,
        "lng": 121.5654
    },
    
    // ===== TIER 2: Good =====
    {
        "name": "Sample Restaurant - T2",
        "rank": "T2",
        "area": "Xinyi District",
        "address": "456 Oak Ave, Taipei",
        "cuisine": "Japanese",
        "type": "Ramen",
        "price": "$200-300 TWD",
        "notes": "Good ramen, quick service",
        "lat": 25.0410,
        "lng": 121.5500
    }
];

/*
TEMPLATE for adding new restaurants:

{
    "name": "Restaurant Name",
    "rank": "T0", // T0=Must Try, T1=Excellent, T2=Good, T3=Average, T4=Below Average, T5=Skip
    "area": "District/Neighborhood",
    "address": "Full address for Google Maps",
    "cuisine": "Cuisine type",
    "type": "Dining style",
    "price": "Price range",
    "notes": "Personal notes",
    "lat": 25.0330,  // Latitude - find on Google Maps
    "lng": 121.5654, // Longitude - find on Google Maps
    "plusCode": "Plus Code (optional)"
}

To find coordinates:
1. Go to https://maps.google.com
2. Find your restaurant
3. Right-click → "What's here?" → copy coordinates
4. Or use: https://www.gps-coordinates.org/
*/
