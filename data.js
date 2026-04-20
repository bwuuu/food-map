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
    {
        "name": "萬大蟹殼黃、胡椒餅",
        "rank": "T0",
        "area": "Wanhua District",
        "address": "No. 124, Wanda Rd, Wanhua District, Taipei City, Taiwan 108",
        "cuisine": "Taiwanese",
        "type": "Street Food / Snack",
        "price": "$50-100 TWD",
        "notes": "Popular crab shell yellow cakes and pepper buns. Opens at 9:30. Phone: +886 2 2336 6063. Plus Code: 2GH2+R4",
        "lat": 25.0256,
        "lng": 121.4998,
        "plusCode": "2GH2+R4 Wanhua District, Taipei City"
    },
    {
        "name": "阿伯蛋包面 (A-Bo Egg Noodle)",
        "rank": "T0",
        "area": "Wanhua District",
        "address": "No. 88, Shuangyuan St, Wanhua District, Taipei City, Taiwan 108",
        "cuisine": "Taiwanese",
        "type": "Noodle Shop",
        "price": "$100-200 TWD",
        "notes": "Famous egg noodle shop. Open until 14:00. Phone: +886 2 2338 1439. Facebook: cuxi0517. Plus Code: 2FJV+86",
        "lat": 25.0286,
        "lng": 121.4998,
        "plusCode": "2FJV+86 Wanhua District, Taipei City"
    },
    {
        "name": "至せい-shisei-至誠 Taipei",
        "rank": "T0",
        "area": "Zhongshan District",
        "address": "No. 42號, Tianxiang Rd, Zhongshan District, Taipei City, Taiwan 10491",
        "cuisine": "Japanese",
        "type": "Izakaya",
        "price": "$400-800 TWD",
        "notes": "Japanese izakaya. Opens at 18:00. Phone: +886 2 2521 1700. Website: shisei-taipei.com. Plus Code: 3G6C+J9. LGBTQ Friendly.",
        "lat": 25.0657,
        "lng": 121.5346,
        "plusCode": "3G6C+J9 Zhongshan District, Taipei City"
    },
    {
        "name": "Chiara 義式料理",
        "rank": "T0",
        "area": "Banqiao District",
        "address": "No. 38, 1F, Alley 3, Lane 270, Section 1, Wenhua Rd, Banqiao District, New Taipei City, Taiwan 22041",
        "cuisine": "Italian",
        "type": "Italian Restaurant",
        "price": "$400-800 TWD",
        "notes": "Authentic Italian cuisine. Opens at 11:30. Phone: +886 2 2249 8479. Instagram: @chiarataiwan. Plus Code: 2FC9+5F",
        "lat": 25.0084,
        "lng": 121.4639,
        "plusCode": "2FC9+5F Banqiao District, New Taipei City"
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
