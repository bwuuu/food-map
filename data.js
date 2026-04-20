// Restaurant Data - Add your own restaurants here!
const foodData = [
    // ===== TIER 0: Must Try =====
    {
        "name": "Sample Restaurant - T0",
        "rank": "T0",
        "area": "Downtown",
        "address": "123 Main St, Your City",
        "cuisine": "Italian",
        "type": "Fine Dining",
        "price": "$30-50",
        "notes": "Best pasta in town",
        "lat": 25.0330,
        "lng": 121.5654
    },
    
    // ===== TIER 1: Excellent =====
    {
        "name": "Sample Restaurant - T1",
        "rank": "T1",
        "area": "Midtown",
        "address": "456 Oak Ave, Your City",
        "cuisine": "Japanese",
        "type": "Casual",
        "price": "$20-30",
        "notes": "Great ramen",
        "lat": 25.0410,
        "lng": 121.5500
    },
    
    // ===== TIER 2: Good =====
    {
        "name": "Sample Restaurant - T2",
        "rank": "T2",
        "area": "Uptown",
        "address": "789 Pine Rd, Your City",
        "cuisine": "Mexican",
        "type": "Fast Casual",
        "price": "$10-20",
        "notes": "Good tacos",
        "lat": 25.0500,
        "lng": 121.5400
    }
];

/*
TEMPLATE for adding new restaurants:

{
    "name": "Restaurant Name",
    "rank": "T0", // T0=Must Try, T1=Excellent, T2=Good, T3=Average, T4=Below Average, T5=Skip
    "area": "Neighborhood/District",
    "address": "Full address for Google Maps",
    "cuisine": "Type of cuisine (Italian, Japanese, etc.)",
    "type": "Fine Dining, Casual, Fast Food, etc.",
    "price": "Price range ($10-20, $20-30, etc.)",
    "notes": "Any special notes about the place",
    "lat": 25.0330,  // Latitude
    "lng": 121.5654  // Longitude
}

To find coordinates:
1. Go to Google Maps
2. Find your restaurant
3. Right-click and select coordinates
4. Or use: https://www.gps-coordinates.org/
*/
