// Restaurant Data - Add your own restaurants here!
const foodData = [
    // ===== MUST TRY =====
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
        "plusCode": "3G2F+8C Zhongshan District, Taipei City",
        "source": "IG",
        "sourceDetail": "@foodie_account",
        "status": "Not Tried",
        "inspirationLink": "",
        "inspirationImage": "",
        "whyTry": "Cozy izakaya vibe with handmade soba",
        "dishRecommendations": "Cold soba with dipping sauce, tempura",
        "mood": "Date night, Intimate dinner",
        "bestFor": "Dinner, Weekend"
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
        "plusCode": "2GH2+R4 Wanhua District, Taipei City",
        "source": "Friend",
        "sourceDetail": "小明",
        "status": "Not Tried",
        "inspirationLink": "",
        "inspirationImage": "",
        "whyTry": "Traditional Taiwanese street snack",
        "dishRecommendations": "Crab shell yellow cake, pepper bun",
        "mood": "Quick bite, Take away",
        "bestFor": "Breakfast, Snack"
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
        "plusCode": "2FJV+86 Wanhua District, Taipei City",
        "source": "IG",
        "sourceDetail": "@taipei_food",
        "status": "Not Tried",
        "inspirationLink": "",
        "inspirationImage": "",
        "whyTry": "Famous egg-wrapped noodles, people queue for this",
        "dishRecommendations": "Egg wrapped noodles, chili sauce",
        "mood": "Casual, Quick lunch",
        "bestFor": "Lunch, Early afternoon"
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
        "plusCode": "3G6C+J9 Zhongshan District, Taipei City",
        "source": "Magazine",
        "sourceDetail": "食尚玩家",
        "status": "Not Tried",
        "inspirationLink": "",
        "inspirationImage": "",
        "whyTry": "Authentic Japanese izakaya experience, LGBTQ friendly",
        "dishRecommendations": "Grilled skewers, sake selection, seasonal dishes",
        "mood": "Date night, Group dinner, Celebrations",
        "bestFor": "Dinner, Late night"
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
        "plusCode": "2FC9+5F Banqiao District, New Taipei City",
        "source": "IG",
        "sourceDetail": "@foodie_account",
        "status": "Not Tried",
        "inspirationLink": "https://www.instagram.com/p/DXMeLh4geME/",
        "inspirationImage": "",
        "whyTry": "From the same IG post that mentioned other spots - looks like a cozy brunch place in Songshan",
        "dishRecommendations": "Brunch items, coffee - need to check the post again for specifics",
        "mood": "Brunch, Weekend morning, Casual hangout",
        "bestFor": "Weekend brunch, Late morning"
    },
    {
        "name": "芮秋 Rachel",
        "rank": "T1",
        "area": "Songshan District",
        "address": "No. 405號, Fujin St, Songshan District, Taipei City, Taiwan 105",
        "cuisine": "European Brunch / Natural Wine",
        "type": "Brunch Restaurant",
        "price": "$400-600 TWD",
        "notes": "Minsheng Community natural wine brunch spot. Hours: Mon-Fri 09:00-17:00, Sat-Sun 08:00-21:00. Phone: +886 2 2760 0182. Line: @689elaci. Plus Code: 3H66+83. Founder team from 立秋餐酒館, head chef with 10+ years Taiwanese Western cuisine experience.",
        "lat": 25.0608,
        "lng": 121.5602,
        "plusCode": "3H66+83 Songshan District, Taipei City",
        "source": "IG",
        "sourceDetail": "@foodie_account (same post)",
        "status": "Not Tried",
        "inspirationLink": "https://www.instagram.com/p/DXMeLh4geME/",
        "inspirationImage": "./images/rachel_screenshot.jpg",
        "whyTry": "Screenshot shows their signature iron skillet Dutch baby pancake - took nearly a year to perfect, with crispy edges and fluffy center with egg aroma, topped with slow-cooked silk cheese and house-cured pork belly",
        "dishRecommendations": "Iron skillet Dutch baby pancake (鐵鍋寶貝鬆餅) with silk cheese and house-cured pork belly, paired with natural wine",
        "mood": "Morning energy boost with natural wine and European cuisine, Chill brunch vibes",
        "bestFor": "Weekend morning 08:00, Afternoon wine session until 21:00 on weekends"
    }
];

/*
TEMPLATE for adding new restaurants:

{
    "name": "Restaurant Name",
    "rank": "T0", // T0=Must Try, T1=Highly Recommended, T2=Interested, T3=Maybe Later
    "area": "District/Neighborhood",
    "address": "Full address for Google Maps",
    "cuisine": "Cuisine type",
    "type": "Dining style",
    "price": "Price range",
    "notes": "Personal notes, hours, phone, etc.",
    "lat": 25.0330,  // Latitude - find on Google Maps
    "lng": 121.5654, // Longitude - find on Google Maps
    "plusCode": "Plus Code (optional)",
    "source": "IG/Friend/Blog/Magazine/Random",  // Where you discovered it
    "sourceDetail": "@instagram_handle or friend's name",  // Specific account or person
    "status": "Not Tried",  // Not Tried, Tried, Want to Return
    
    // NEW: Rich Context Fields (what GMaps doesn't store!)
    "inspirationLink": "https://instagram.com/p/XXXXX",  // Link to IG post/blog that inspired you
    "inspirationImage": "./images/restaurant_screenshot.jpg",  // Screenshot or saved image (optional)
    "whyTry": "What caught your eye - the vibe? A specific dish? The decor?",  // WHY you saved it
    "dishRecommendations": "Specific dishes to order based on source post",  // What to order
    "mood": "Date night, Casual hangout, Solo dining, Group celebration",  // Best occasions
    "bestFor": "Lunch, Dinner, Weekend brunch, Late night"  // Best timing
}

SOURCES:
- IG = Instagram
- Friend = Friend recommendation
- Blog = Food blog
- Magazine = TV show or magazine
- Random = Random discovery

STATUS:
- Not Tried = Haven't been yet
- Tried = Already visited
- Want to Return = Loved it, want to go back

NEW CONTEXT FIELDS:
- inspirationLink: Save the exact IG post, blog link, or article that inspired you
- inspirationImage: Screenshot or photo that shows why you want to try it
- whyTry: Your personal note about what caught your attention
- dishRecommendations: Specific dishes mentioned in the source
- mood: What kind of occasion is this place good for
- bestFor: Best time to visit (lunch vs dinner, weekday vs weekend)

This solves the GMaps problem: "I saved it but forgot why"
*/
