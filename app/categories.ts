export const storefrontCategories = [
  { slug: 'ai-research', name: 'AI Assistants & Research', title: 'AI & research', description: 'Write, research and explore ideas.', symbol: 'sparkles' },
  { slug: 'creative', name: 'AI Video, Image & Creative', title: 'Design & creative', description: 'Create visuals, video and content.', symbol: 'palette' },
  { slug: 'coding', name: 'AI Coding & Development', title: 'Coding & developer tools', description: 'Build, debug and bring ideas to life.', symbol: 'code' },
  { slug: 'productivity', name: 'Productivity & Business', title: 'Productivity & business', description: 'Organize your work and get more done.', symbol: 'briefcase' },
  { slug: 'api-credits', name: 'API & Credit Packages', title: 'API & Credit Packages', description: 'Explore credits and developer access.', symbol: 'layers' },
  { slug: 'security', name: 'VPN & Privacy', title: 'Privacy & security', description: 'Find tools for more private browsing.', symbol: 'shield' },
  { slug: 'learning', name: 'Education & Learning', title: 'Learn & grow', description: 'Make room for your next skill.', symbol: 'graduation' },
  { slug: 'entertainment', name: 'Entertainment & Streaming', title: 'Entertainment', description: 'Discover your next watch or listen.', symbol: 'play' },
  { slug: 'career', name: 'Professional & Career', title: 'Professional & Career', description: 'Tools for your next career move.', symbol: 'briefcase' },
  { slug: 'other', name: 'Other Tools', title: 'Other Tools', description: 'Explore the rest of the collection.', symbol: 'layers' },
] as const;
export function findStorefrontCategory(slug: string) { return storefrontCategories.find(category => category.slug === slug); }
