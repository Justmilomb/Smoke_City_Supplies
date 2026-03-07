export type BikeModel = {
  model: string;
  cc: string[];
  years: string[];
};

export type BikeMake = {
  make: string;
  models: BikeModel[];
};

function yearRange(start: number, end: number): string[] {
  const arr: string[] = [];
  for (let y = start; y <= end; y++) arr.push(String(y));
  return arr;
}

export const BIKE_DATA: BikeMake[] = [
  {
    make: "Honda",
    models: [
      { model: "CB125R", cc: ["125"], years: yearRange(2018, 2025) },
      { model: "CB300R", cc: ["286"], years: yearRange(2018, 2025) },
      { model: "CB500F", cc: ["471"], years: yearRange(2013, 2025) },
      { model: "CB500X", cc: ["471"], years: yearRange(2013, 2025) },
      { model: "CB650R", cc: ["649"], years: yearRange(2019, 2025) },
      { model: "CBR500R", cc: ["471"], years: yearRange(2013, 2025) },
      { model: "CBR650R", cc: ["649"], years: yearRange(2019, 2025) },
      { model: "CBR1000RR-R Fireblade", cc: ["999"], years: yearRange(2020, 2025) },
      { model: "CRF300L", cc: ["286"], years: yearRange(2021, 2025) },
      { model: "CRF1100L Africa Twin", cc: ["1084"], years: yearRange(2020, 2025) },
      { model: "NC750X", cc: ["745"], years: yearRange(2014, 2025) },
      { model: "NT1100", cc: ["1084"], years: yearRange(2022, 2025) },
      { model: "XL750 Transalp", cc: ["755"], years: yearRange(2023, 2025) },
      { model: "GL1800 Gold Wing", cc: ["1833"], years: yearRange(2018, 2025) },
      { model: "CMX500 Rebel", cc: ["471"], years: yearRange(2017, 2025) },
      { model: "MSX125 Grom", cc: ["125"], years: yearRange(2013, 2025) },
      { model: "PCX125", cc: ["125"], years: yearRange(2010, 2025) },
      { model: "SH125i", cc: ["125"], years: yearRange(2013, 2025) },
      { model: "Forza 125", cc: ["125"], years: yearRange(2015, 2025) },
      { model: "Forza 350", cc: ["330"], years: yearRange(2021, 2025) },
    ],
  },
  {
    make: "Yamaha",
    models: [
      { model: "MT-07", cc: ["689"], years: yearRange(2014, 2025) },
      { model: "MT-09", cc: ["890"], years: yearRange(2014, 2025) },
      { model: "MT-10", cc: ["998"], years: yearRange(2016, 2025) },
      { model: "MT-125", cc: ["125"], years: yearRange(2014, 2025) },
      { model: "YZF-R1", cc: ["998"], years: yearRange(2015, 2024) },
      { model: "YZF-R6", cc: ["599"], years: yearRange(2017, 2023) },
      { model: "YZF-R7", cc: ["689"], years: yearRange(2022, 2025) },
      { model: "YZF-R125", cc: ["125"], years: yearRange(2014, 2025) },
      { model: "Tracer 7", cc: ["689"], years: yearRange(2016, 2025) },
      { model: "Tracer 9", cc: ["890"], years: yearRange(2015, 2025) },
      { model: "Tenere 700", cc: ["689"], years: yearRange(2019, 2025) },
      { model: "XSR700", cc: ["689"], years: yearRange(2016, 2025) },
      { model: "XSR900", cc: ["890"], years: yearRange(2016, 2025) },
      { model: "NMAX 125", cc: ["125"], years: yearRange(2015, 2025) },
      { model: "XMAX 300", cc: ["292"], years: yearRange(2017, 2025) },
      { model: "TMAX 560", cc: ["562"], years: yearRange(2020, 2025) },
    ],
  },
  {
    make: "Kawasaki",
    models: [
      { model: "Z650", cc: ["649"], years: yearRange(2017, 2025) },
      { model: "Z900", cc: ["948"], years: yearRange(2017, 2025) },
      { model: "Z900RS", cc: ["948"], years: yearRange(2018, 2025) },
      { model: "Z1000", cc: ["1043"], years: yearRange(2014, 2020) },
      { model: "Z H2", cc: ["998"], years: yearRange(2020, 2025) },
      { model: "Ninja 400", cc: ["399"], years: yearRange(2018, 2025) },
      { model: "Ninja 650", cc: ["649"], years: yearRange(2017, 2025) },
      { model: "Ninja ZX-6R", cc: ["636"], years: yearRange(2019, 2025) },
      { model: "Ninja ZX-10R", cc: ["998"], years: yearRange(2016, 2025) },
      { model: "Versys 650", cc: ["649"], years: yearRange(2015, 2025) },
      { model: "Versys 1000", cc: ["1043"], years: yearRange(2015, 2025) },
      { model: "Vulcan S", cc: ["649"], years: yearRange(2015, 2025) },
      { model: "KLX300", cc: ["292"], years: yearRange(2021, 2025) },
      { model: "Ninja 125", cc: ["125"], years: yearRange(2019, 2025) },
      { model: "Z125", cc: ["125"], years: yearRange(2019, 2025) },
    ],
  },
  {
    make: "Suzuki",
    models: [
      { model: "GSX-S750", cc: ["749"], years: yearRange(2017, 2022) },
      { model: "GSX-S1000", cc: ["999"], years: yearRange(2015, 2025) },
      { model: "GSX-R600", cc: ["599"], years: yearRange(2011, 2023) },
      { model: "GSX-R750", cc: ["750"], years: yearRange(2011, 2023) },
      { model: "GSX-R1000", cc: ["999"], years: yearRange(2017, 2025) },
      { model: "SV650", cc: ["645"], years: yearRange(2016, 2025) },
      { model: "V-Strom 650", cc: ["645"], years: yearRange(2012, 2025) },
      { model: "V-Strom 1050", cc: ["1037"], years: yearRange(2020, 2025) },
      { model: "Hayabusa", cc: ["1340"], years: yearRange(2021, 2025) },
      { model: "Katana", cc: ["999"], years: yearRange(2019, 2025) },
      { model: "GSX-S125", cc: ["125"], years: yearRange(2017, 2025) },
      { model: "Burgman 400", cc: ["400"], years: yearRange(2017, 2025) },
    ],
  },
  {
    make: "BMW",
    models: [
      { model: "R 1250 GS", cc: ["1254"], years: yearRange(2019, 2025) },
      { model: "R 1250 GS Adventure", cc: ["1254"], years: yearRange(2019, 2025) },
      { model: "R 1250 RT", cc: ["1254"], years: yearRange(2019, 2025) },
      { model: "R 1300 GS", cc: ["1300"], years: yearRange(2024, 2025) },
      { model: "S 1000 R", cc: ["999"], years: yearRange(2014, 2025) },
      { model: "S 1000 RR", cc: ["999"], years: yearRange(2019, 2025) },
      { model: "S 1000 XR", cc: ["999"], years: yearRange(2015, 2025) },
      { model: "F 750 GS", cc: ["853"], years: yearRange(2018, 2025) },
      { model: "F 850 GS", cc: ["853"], years: yearRange(2018, 2025) },
      { model: "F 900 R", cc: ["895"], years: yearRange(2020, 2025) },
      { model: "F 900 XR", cc: ["895"], years: yearRange(2020, 2025) },
      { model: "G 310 R", cc: ["313"], years: yearRange(2017, 2025) },
      { model: "G 310 GS", cc: ["313"], years: yearRange(2017, 2025) },
      { model: "R nineT", cc: ["1170"], years: yearRange(2014, 2025) },
      { model: "C 400 GT", cc: ["350"], years: yearRange(2019, 2025) },
    ],
  },
  {
    make: "Triumph",
    models: [
      { model: "Street Triple 765", cc: ["765"], years: yearRange(2017, 2025) },
      { model: "Speed Triple 1200", cc: ["1160"], years: yearRange(2021, 2025) },
      { model: "Tiger 900", cc: ["888"], years: yearRange(2020, 2025) },
      { model: "Tiger 1200", cc: ["1160"], years: yearRange(2022, 2025) },
      { model: "Trident 660", cc: ["660"], years: yearRange(2021, 2025) },
      { model: "Bonneville T120", cc: ["1200"], years: yearRange(2016, 2025) },
      { model: "Bonneville T100", cc: ["900"], years: yearRange(2017, 2025) },
      { model: "Street Twin", cc: ["900"], years: yearRange(2016, 2023) },
      { model: "Speed Twin 900", cc: ["900"], years: yearRange(2023, 2025) },
      { model: "Speed Twin 1200", cc: ["1200"], years: yearRange(2019, 2025) },
      { model: "Rocket 3", cc: ["2458"], years: yearRange(2020, 2025) },
      { model: "Scrambler 900", cc: ["900"], years: yearRange(2017, 2025) },
      { model: "Scrambler 1200", cc: ["1200"], years: yearRange(2019, 2025) },
      { model: "Daytona 660", cc: ["660"], years: yearRange(2024, 2025) },
    ],
  },
  {
    make: "KTM",
    models: [
      { model: "125 Duke", cc: ["125"], years: yearRange(2017, 2025) },
      { model: "200 Duke", cc: ["200"], years: yearRange(2020, 2025) },
      { model: "390 Duke", cc: ["373"], years: yearRange(2017, 2025) },
      { model: "790 Duke", cc: ["799"], years: yearRange(2018, 2021) },
      { model: "890 Duke R", cc: ["890"], years: yearRange(2020, 2025) },
      { model: "1290 Super Duke R", cc: ["1301"], years: yearRange(2020, 2025) },
      { model: "390 Adventure", cc: ["373"], years: yearRange(2020, 2025) },
      { model: "890 Adventure", cc: ["890"], years: yearRange(2021, 2025) },
      { model: "1290 Super Adventure", cc: ["1301"], years: yearRange(2021, 2025) },
      { model: "RC 390", cc: ["373"], years: yearRange(2017, 2025) },
    ],
  },
  {
    make: "Ducati",
    models: [
      { model: "Monster", cc: ["937"], years: yearRange(2021, 2025) },
      { model: "Monster SP", cc: ["937"], years: yearRange(2023, 2025) },
      { model: "Panigale V2", cc: ["955"], years: yearRange(2020, 2025) },
      { model: "Panigale V4", cc: ["1103"], years: yearRange(2018, 2025) },
      { model: "Streetfighter V2", cc: ["955"], years: yearRange(2022, 2025) },
      { model: "Streetfighter V4", cc: ["1103"], years: yearRange(2020, 2025) },
      { model: "Multistrada V4", cc: ["1158"], years: yearRange(2021, 2025) },
      { model: "Multistrada V2", cc: ["937"], years: yearRange(2022, 2025) },
      { model: "Scrambler 800", cc: ["803"], years: yearRange(2015, 2025) },
      { model: "DesertX", cc: ["937"], years: yearRange(2022, 2025) },
      { model: "Diavel V4", cc: ["1158"], years: yearRange(2023, 2025) },
      { model: "Hypermotard 950", cc: ["937"], years: yearRange(2019, 2025) },
    ],
  },
  {
    make: "Harley-Davidson",
    models: [
      { model: "Street Bob 114", cc: ["1868"], years: yearRange(2018, 2025) },
      { model: "Fat Bob 114", cc: ["1868"], years: yearRange(2018, 2025) },
      { model: "Sportster S", cc: ["1252"], years: yearRange(2021, 2025) },
      { model: "Nightster", cc: ["975"], years: yearRange(2022, 2025) },
      { model: "Iron 883", cc: ["883"], years: yearRange(2014, 2022) },
      { model: "Road Glide", cc: ["1923"], years: yearRange(2017, 2025) },
      { model: "Street Glide", cc: ["1923"], years: yearRange(2017, 2025) },
      { model: "Pan America 1250", cc: ["1252"], years: yearRange(2021, 2025) },
      { model: "Fat Boy 114", cc: ["1868"], years: yearRange(2018, 2025) },
      { model: "Low Rider ST", cc: ["1923"], years: yearRange(2022, 2025) },
    ],
  },
  {
    make: "Royal Enfield",
    models: [
      { model: "Classic 350", cc: ["349"], years: yearRange(2021, 2025) },
      { model: "Meteor 350", cc: ["349"], years: yearRange(2020, 2025) },
      { model: "Hunter 350", cc: ["349"], years: yearRange(2022, 2025) },
      { model: "Continental GT 650", cc: ["648"], years: yearRange(2018, 2025) },
      { model: "INT650", cc: ["648"], years: yearRange(2018, 2025) },
      { model: "Super Meteor 650", cc: ["648"], years: yearRange(2023, 2025) },
      { model: "Himalayan", cc: ["411", "452"], years: yearRange(2016, 2025) },
      { model: "Scram 411", cc: ["411"], years: yearRange(2022, 2025) },
    ],
  },
  {
    make: "Aprilia",
    models: [
      { model: "RS 660", cc: ["659"], years: yearRange(2021, 2025) },
      { model: "Tuono 660", cc: ["659"], years: yearRange(2021, 2025) },
      { model: "RSV4", cc: ["1099"], years: yearRange(2021, 2025) },
      { model: "Tuono V4", cc: ["1077"], years: yearRange(2021, 2025) },
      { model: "RS 125", cc: ["125"], years: yearRange(2017, 2025) },
      { model: "Tuareg 660", cc: ["659"], years: yearRange(2022, 2025) },
      { model: "SR GT 200", cc: ["174"], years: yearRange(2022, 2025) },
    ],
  },
  {
    make: "Husqvarna",
    models: [
      { model: "Svartpilen 401", cc: ["373"], years: yearRange(2018, 2025) },
      { model: "Vitpilen 401", cc: ["373"], years: yearRange(2018, 2025) },
      { model: "Norden 901", cc: ["890"], years: yearRange(2022, 2025) },
      { model: "Svartpilen 125", cc: ["125"], years: yearRange(2021, 2025) },
    ],
  },
];

/** Get all unique make names, sorted alphabetically */
export function getBikeMakes(): string[] {
  return BIKE_DATA.map((b) => b.make).sort();
}

/** Get models for a given make */
export function getBikeModels(make: string): BikeModel[] {
  const found = BIKE_DATA.find((b) => b.make.toLowerCase() === make.toLowerCase());
  return found?.models ?? [];
}

/** Get CCs for a specific make + model */
export function getBikeCCs(make: string, model: string): string[] {
  const models = getBikeModels(make);
  const found = models.find((m) => m.model.toLowerCase() === model.toLowerCase());
  return found?.cc ?? [];
}

/** Get years for a specific make + model */
export function getBikeYears(make: string, model: string): string[] {
  const models = getBikeModels(make);
  const found = models.find((m) => m.model.toLowerCase() === model.toLowerCase());
  return found?.years ? [...found.years].reverse() : [];
}
