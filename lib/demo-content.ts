export type Video = {
  id: number;
  title: string;
  channel: string;
  performer: string;
  actors: string[];
  views: string;
  viewCount: number;
  hoursAgo: number;
  age: string;
  duration: string;
  image: string;
  imageSmall: string;
  accent: string;
};

const covers = [
  ["/media/thumb-01-360x203.jpg", "/media/thumb-01-240x135.jpg"],
  ["/media/thumb-02-360x203.jpg", "/media/thumb-02-240x135.jpg"],
  ["/media/thumb-03-360x203.jpg", "/media/thumb-03-240x135.jpg"],
];

const demoChannelNames = [
  "Velvet Room", "Noir Studio", "Golden Hour", "Afterglow", "Blue Room",
  "Private Edit", "Studio Ember", "The Midnight Edit", "Luna House", "Modern Muse",
];

const entries: Array<[string, string, string, string]> = [
  ["A Weekend in the City Lights", "Maya Sol", "2.4M", "18:42"],
  ["After Hours at the Penthouse", "Lena Vale", "1.8M", "24:16"],
  ["The Art of a Slow Sunday", "Amara Voss", "1.6M", "16:08"],
  ["An Evening Made for Two", "Nico & Aria", "1.2M", "21:35"],
  ["Midnight Conversations", "Sofia Lane", "982K", "19:27"],
  ["A Private View of the City", "Jade Rivers", "941K", "27:04"],
  ["Soft Focus, Late Night", "Mila Hart", "896K", "14:52"],
  ["The Suite Upstairs", "Maya Sol", "842K", "22:18"],
  ["City Rain and Candlelight", "Lena Vale", "793K", "17:46"],
  ["A Little More Romance", "Amara Voss", "748K", "20:31"],
  ["The Last Table at the Bar", "Sofia Lane", "702K", "15:14"],
  ["After the Gallery Closes", "Jade Rivers", "671K", "25:09"],
  ["Warm Lights, Cool Evening", "Mila Hart", "638K", "18:20"],
  ["A Rooftop Kind of Night", "Maya Sol", "604K", "23:41"],
  ["The Blue Hour Session", "Lena Vale", "572K", "12:56"],
  ["One More Song Together", "Nico & Aria", "541K", "19:02"],
  ["A Night at the Rose Lounge", "Amara Voss", "518K", "26:33"],
  ["Slow Dancing in the Kitchen", "Sofia Lane", "493K", "16:44"],
  ["The City Never Quite Sleeps", "Jade Rivers", "468K", "22:07"],
  ["Room Service at One", "Mila Hart", "439K", "18:51"],
  ["Golden Hour, After Dark", "Maya Sol", "408K", "20:12"],
  ["The Long Way Home", "Lena Vale", "377K", "14:39"],
  ["A Quiet Night in Paris", "Amara Voss", "351K", "24:48"],
  ["Last Call at the Penthouse", "Sofia Lane", "329K", "17:23"],
];

const moreActors = ["Nico Vale", "Aria Moon", "Jules Hart", "Elise Mar", "Theo West", "Ivy Rose"];

function parseViewCount(label: string) {
  const amount = Number.parseFloat(label);
  if (label.endsWith("M")) return amount * 1_000_000;
  if (label.endsWith("K")) return amount * 1_000;
  return amount;
}

export const videos: Video[] = entries.map((entry, index) => {
  const [image, imageSmall] = covers[index % covers.length];
  const extraActorCount = index % 3 === 0 ? 3 : index % 3 === 1 ? 1 : 0;
  const extras = Array.from({ length: extraActorCount }, (_, offset) => moreActors[(index + offset) % moreActors.length]);
  const actors = [entry[1], ...extras];
  return {
    id: index,
    title: entry[0],
    channel: demoChannelNames[index % demoChannelNames.length],
    performer: entry[1],
    actors,
    views: entry[2],
    viewCount: parseViewCount(entry[2]),
    hoursAgo: (index * 7) % 24 + 1,
    age: `${index + 1} hours ago`,
    duration: entry[3],
    image,
    imageSmall,
    accent: ["rose", "violet", "amber"][index % 3],
  };
});

export const performers = [
  { name: "Maya Sol", videos: "128 videos", tone: "portrait-one" },
  { name: "Lena Vale", videos: "94 videos", tone: "portrait-two" },
  { name: "Amara Voss", videos: "76 videos", tone: "portrait-three" },
  { name: "Sofia Lane", videos: "63 videos", tone: "portrait-two" },
  { name: "Jade Rivers", videos: "51 videos", tone: "portrait-one" },
  { name: "Mila Hart", videos: "47 videos", tone: "portrait-three" },
];

export const channels = [
  { name: "Velvet Room", videos: "284 videos", mark: "VR", tone: "channel-rose" },
  { name: "Noir Studio", videos: "196 videos", mark: "N", tone: "channel-violet" },
  { name: "Golden Hour", videos: "152 videos", mark: "GH", tone: "channel-amber" },
  { name: "Afterglow", videos: "121 videos", mark: "A", tone: "channel-blue" },
  { name: "Blue Room", videos: "89 videos", mark: "BR", tone: "channel-blue" },
  { name: "Private Edit", videos: "74 videos", mark: "PE", tone: "channel-rose" },
];

export type DirectoryChannel = {
  id: number;
  slug: string;
  name: string;
  videos: string;
  videoCount: number;
  totalViews: string;
  image: string;
  description: string;
  seoDescription: string;
};

type ChannelAdminFields = Omit<DirectoryChannel, "id" | "videos" | "seoDescription">;

function channelDescription(name: string) {
  return `Explore ${name} on Vidubuzz, a curated adult video channel featuring popular uploads and creator collaborations. Browse standout titles, revisit favorite performers, and discover new releases selected from the ${name} collection. This channel page brings together the latest additions and most-watched picks, with quick access to related channels and featured performers.`;
}

// These are the editable channel fields that can later be supplied by an admin-managed source.
const channelDirectoryEntries: ChannelAdminFields[] = [
  { slug: "velvet-room", name: "Velvet Room", videoCount: 284, totalViews: "4.8M", image: "/media/thumb-01-240x135.jpg", description: channelDescription("Velvet Room") },
  { slug: "noir-studio", name: "Noir Studio", videoCount: 196, totalViews: "3.6M", image: "/media/thumb-02-240x135.jpg", description: channelDescription("Noir Studio") },
  { slug: "golden-hour", name: "Golden Hour", videoCount: 152, totalViews: "2.9M", image: "/media/thumb-03-240x135.jpg", description: channelDescription("Golden Hour") },
  { slug: "afterglow", name: "Afterglow", videoCount: 121, totalViews: "2.1M", image: "/media/thumb-01-240x135.jpg", description: channelDescription("Afterglow") },
  { slug: "blue-room", name: "Blue Room", videoCount: 89, totalViews: "1.7M", image: "/media/thumb-02-240x135.jpg", description: channelDescription("Blue Room") },
  { slug: "private-edit", name: "Private Edit", videoCount: 74, totalViews: "1.3M", image: "/media/thumb-03-240x135.jpg", description: channelDescription("Private Edit") },
  { slug: "studio-ember", name: "Studio Ember", videoCount: 61, totalViews: "982K", image: "/media/thumb-01-240x135.jpg", description: channelDescription("Studio Ember") },
  { slug: "the-midnight-edit", name: "The Midnight Edit", videoCount: 48, totalViews: "744K", image: "/media/thumb-02-240x135.jpg", description: channelDescription("The Midnight Edit") },
  { slug: "luna-house", name: "Luna House", videoCount: 35, totalViews: "528K", image: "/media/thumb-03-240x135.jpg", description: channelDescription("Luna House") },
  { slug: "modern-muse", name: "Modern Muse", videoCount: 24, totalViews: "391K", image: "/media/thumb-01-240x135.jpg", description: channelDescription("Modern Muse") },
];

export const channelDirectory: DirectoryChannel[] = channelDirectoryEntries.map((channel, id) => ({
  ...channel,
  id,
  videos: `${channel.videoCount} videos`,
  seoDescription: `${channel.name} features a curated collection of adult videos on Vidubuzz. Browse popular uploads, view channel statistics, and discover featured performers and similar channels.`,
}));

const channelSlugs = channelDirectory.map((channel) => channel.slug);
if (channelSlugs.some((slug) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) || new Set(channelSlugs).size !== channelSlugs.length) {
  throw new Error("Channel slugs must be unique flat slugs in lowercase kebab case.");
}
