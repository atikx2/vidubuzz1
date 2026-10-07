export type Video = {
  title: string;
  channel: string;
  performer: string;
  actors: string[];
  views: string;
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

const entries: Array<[string, string, string, string, string]> = [
  ["A Weekend in the City Lights", "Velvet Room", "Maya Sol", "2.4M", "18:42"],
  ["After Hours at the Penthouse", "Noir Studio", "Lena Vale", "1.8M", "24:16"],
  ["The Art of a Slow Sunday", "Golden Hour", "Amara Voss", "1.6M", "16:08"],
  ["An Evening Made for Two", "Velvet Room", "Nico & Aria", "1.2M", "21:35"],
  ["Midnight Conversations", "Noir Studio", "Sofia Lane", "982K", "19:27"],
  ["A Private View of the City", "Afterglow", "Jade Rivers", "941K", "27:04"],
  ["Soft Focus, Late Night", "Golden Hour", "Mila Hart", "896K", "14:52"],
  ["The Suite Upstairs", "Velvet Room", "Maya Sol", "842K", "22:18"],
  ["City Rain and Candlelight", "Noir Studio", "Lena Vale", "793K", "17:46"],
  ["A Little More Romance", "Afterglow", "Amara Voss", "748K", "20:31"],
  ["The Last Table at the Bar", "Golden Hour", "Sofia Lane", "702K", "15:14"],
  ["After the Gallery Closes", "Velvet Room", "Jade Rivers", "671K", "25:09"],
  ["Warm Lights, Cool Evening", "Noir Studio", "Mila Hart", "638K", "18:20"],
  ["A Rooftop Kind of Night", "Afterglow", "Maya Sol", "604K", "23:41"],
  ["The Blue Hour Session", "Golden Hour", "Lena Vale", "572K", "12:56"],
  ["One More Song Together", "Velvet Room", "Nico & Aria", "541K", "19:02"],
  ["A Night at the Rose Lounge", "Noir Studio", "Amara Voss", "518K", "26:33"],
  ["Slow Dancing in the Kitchen", "Afterglow", "Sofia Lane", "493K", "16:44"],
  ["The City Never Quite Sleeps", "Golden Hour", "Jade Rivers", "468K", "22:07"],
  ["Room Service at One", "Velvet Room", "Mila Hart", "439K", "18:51"],
  ["Golden Hour, After Dark", "Noir Studio", "Maya Sol", "408K", "20:12"],
  ["The Long Way Home", "Afterglow", "Lena Vale", "377K", "14:39"],
  ["A Quiet Night in Paris", "Golden Hour", "Amara Voss", "351K", "24:48"],
  ["Last Call at the Penthouse", "Velvet Room", "Sofia Lane", "329K", "17:23"],
];

const moreActors = ["Nico Vale", "Aria Moon", "Jules Hart", "Elise Mar", "Theo West", "Ivy Rose"];

export const videos: Video[] = entries.map((entry, index) => {
  const [image, imageSmall] = covers[index % covers.length];
  const extraActorCount = index % 3 === 0 ? 3 : index % 3 === 1 ? 1 : 0;
  const extras = Array.from({ length: extraActorCount }, (_, offset) => moreActors[(index + offset) % moreActors.length]);
  const actors = [entry[2], ...extras];
  return {
    title: entry[0],
    channel: entry[1],
    performer: entry[2],
    actors,
    views: entry[3],
    age: `${index + 1} hours ago`,
    duration: entry[4],
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
