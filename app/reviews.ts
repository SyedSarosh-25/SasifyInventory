export type CustomerReview = {
  name: string;
  quote: string;
  language: 'ur-Latn' | 'en';
  rating: number;
  excerpt: boolean;
  sourceUrl: string;
  profileUrl: string;
  photoUrl: string;
};

// Read directly from the Google Maps listing with automatic translation switched off.
export const reviewsVerifiedAt = '2026-09-02';
export const reviews: CustomerReview[] = [
  {
    name: 'Pak Tv',
    quote: 'Mera sasify k sath buhat acha Response raha mainy multiple service  ly hai insy Sabi Mai quality service mily Hai',
    language: 'ur-Latn', rating: 5, excerpt: true,
    sourceUrl: 'https://maps.app.goo.gl/Q1fZf59YHo6XkYeg8',
    profileUrl: 'https://www.google.com/maps/contrib/102685183417402336435/reviews?hl=en',
    photoUrl: 'https://lh3.googleusercontent.com/a-/ALV-UjU2x_cmOklanH5a6e-2hickrou8W-y4p1OmA0W1hc5P8etxeERm=w45-h45-p-rp-mo-br100',
  },
  {
    name: 'ZaYn Ali',
    quote: 'Meri in k sath deal rahi hai aur honestly experience bohat acha raha. Banda bohat professional, cooperative aur committed hai.',
    language: 'ur-Latn', rating: 5, excerpt: true,
    sourceUrl: 'https://maps.app.goo.gl/JoWi3P1zypwVDMDm9',
    profileUrl: 'https://www.google.com/maps/contrib/102703850365111014376/reviews?hl=en',
    photoUrl: 'https://lh3.googleusercontent.com/a/ACg8ocJqP8Uk48FSUfVG9Iaave1-hy8YRMlEIwxWcYEFeHRZMocN3g=w45-h45-p-rp-mo-br100',
  },
  {
    name: 'Abdulrehman Jamil',
    quote: 'Honest aur Trusted banda hai sarosh\nmaine unse Chatgpt plus liya plus Gemini pro 18 month liya',
    language: 'ur-Latn', rating: 5, excerpt: true,
    sourceUrl: 'https://maps.app.goo.gl/efS9nz913C23k838A',
    profileUrl: 'https://www.google.com/maps/contrib/102865231170218305988/reviews?hl=en',
    photoUrl: 'https://lh3.googleusercontent.com/a-/ALV-UjXJZs7kuOFHc5cMyxGejXhlQmWB-8-_wWJCRqgJW8JIbHpl8XJqMA=w45-h45-p-rp-mo-ba12-br100',
  },
  {
    name: 'AQIB IJAZ',
    quote: 'A very trustable man. I have been using their services from previous few months. Highly satisfying',
    language: 'en', rating: 5, excerpt: false,
    sourceUrl: 'https://maps.app.goo.gl/L8FNVVC7gMj6yV2S7',
    profileUrl: 'https://www.google.com/maps/contrib/113729102562578452636/reviews?hl=en',
    photoUrl: 'https://lh3.googleusercontent.com/a-/ALV-UjX0MVfYBE8c_DjDIRDTbRSLAOp4-_LN0TWUPeB1ZVnq6KuAYL2D=w45-h45-p-rp-mo-br100',
  },
  {
    name: 'Asim Ali',
    quote: 'Genuine person and excellent service with affordable price, highly recommended',
    language: 'en', rating: 5, excerpt: false,
    sourceUrl: 'https://maps.app.goo.gl/kHYXfjGG18L5fzTN8',
    profileUrl: 'https://www.google.com/maps/contrib/100700733301348018730/reviews?hl=en',
    photoUrl: 'https://lh3.googleusercontent.com/a-/ALV-UjUpJF0SWmlb6spUgmACihW7JIcfo3xnuuXFxfF2vLy8JoojBSYp=w45-h45-p-rp-mo-br100',
  },
  {
    name: 'alex',
    quote: 'Very trusted and reliable, delivered exactly what was finalized. Great service, recommended.',
    language: 'en', rating: 5, excerpt: false,
    sourceUrl: 'https://maps.app.goo.gl/dA5TxTVttKXLGcqs9',
    profileUrl: 'https://www.google.com/maps/contrib/107068706401332092825/reviews?hl=en',
    photoUrl: 'https://lh3.googleusercontent.com/a/ACg8ocJbQLCl_9ZILHmMvWGZSCDcDRLJatzIyWGVaflkRuK-WUSeIg=w45-h45-p-rp-mo-br100',
  },
];
