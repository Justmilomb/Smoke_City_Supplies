export type DictionaryTerm = {
  term: string;
  definition: string;
};

export const bikeTerms: DictionaryTerm[] = [
  {
    term: "Drivetrain",
    definition: "The complete system that transfers power from your pedals to the rear wheel. Includes chain, cassette, chainring, crankset, and derailleurs.",
  },
  {
    term: "Cassette",
    definition: "The cluster of gears on the rear wheel hub. The number of gears (like 10-speed or 11-speed) determines your gear range.",
  },
  {
    term: "Chainring",
    definition: "The front gears attached to the crankset. Usually 1-3 chainrings that work with the cassette to create gear combinations.",
  },
  {
    term: "Crankset",
    definition: "The component that includes the chainrings and crank arms. This is what your pedals attach to.",
  },
  {
    term: "Derailleur",
    definition: "The mechanism that moves the chain between gears. Front derailleur shifts chainrings, rear derailleur shifts the cassette.",
  },
  {
    term: "Chain",
    definition: "The metal links that connect the chainring to the cassette, transferring power from pedals to wheel.",
  },
  {
    term: "Rotor",
    definition: "The metal disc attached to the wheel hub that brake pads squeeze to stop the bike. Common sizes: 140mm, 160mm, 180mm, 203mm.",
  },
  {
    term: "Brake Pad",
    definition: "The friction material that presses against the rotor to create stopping power. Wears down over time and needs replacement.",
  },
  {
    term: "Caliper",
    definition: "The brake mechanism that holds the brake pads and squeezes them against the rotor when you pull the brake lever.",
  },
  {
    term: "Tubeless",
    definition: "A tire setup without an inner tube. The tire seals directly to the rim with sealant, reducing flats and allowing lower tire pressure.",
  },
  {
    term: "Inner Tube",
    definition: "The inflatable rubber tube inside traditional tires that holds air. Comes in different valve types (Schrader or Presta).",
  },
  {
    term: "Tire",
    definition: "The outer rubber casing that contacts the ground. Size is marked like 700×25c (road) or 29×2.3 (mountain bike).",
  },
  {
    term: "Rim",
    definition: "The outer edge of the wheel that holds the tire. Can be made of aluminum, carbon fiber, or steel.",
  },
  {
    term: "Hub",
    definition: "The center of the wheel that contains bearings and attaches to the frame via the axle.",
  },
  {
    term: "Spoke",
    definition: "The thin metal rods that connect the hub to the rim, creating the wheel structure.",
  },
  {
    term: "Fork",
    definition: "The front suspension component that connects the front wheel to the frame. Can be rigid or have suspension.",
  },
  {
    term: "Shock",
    definition: "The rear suspension component that absorbs bumps and impacts. Found on full-suspension mountain bikes.",
  },
  {
    term: "Stem",
    definition: "The component that connects the handlebar to the fork steerer tube. Adjusts handlebar height and reach.",
  },
  {
    term: "Handlebar",
    definition: "The bar you hold while riding. Different types: drop bars (road), flat bars (mountain), riser bars.",
  },
  {
    term: "Grips",
    definition: "The rubber or foam covering on handlebars that provide grip and comfort. Can be lock-on or slide-on.",
  },
  {
    term: "Saddle",
    definition: "The bike seat. Comes in various widths and shapes to match your riding style and anatomy.",
  },
  {
    term: "Seatpost",
    definition: "The tube that connects the saddle to the frame. Can be rigid or dropper (adjustable height).",
  },
  {
    term: "Pedal",
    definition: "The platform your feet rest on. Can be flat pedals or clipless pedals that attach to special shoes.",
  },
  {
    term: "Bottom Bracket",
    definition: "The bearing system that allows the crankset to rotate smoothly. Located in the frame where the crankset attaches.",
  },
  {
    term: "Headset",
    definition: "The bearing system that allows the fork to turn smoothly inside the frame's head tube.",
  },
  {
    term: "Axle",
    definition: "The rod that goes through the hub and attaches the wheel to the frame. Can be quick-release or thru-axle.",
  },
  {
    term: "Disc Brake",
    definition: "A braking system using a rotor and caliper. Provides consistent stopping power in all weather conditions.",
  },
  {
    term: "Rim Brake",
    definition: "A braking system where pads squeeze directly against the rim. Lighter but less powerful than disc brakes.",
  },
];

export const scooterTerms: DictionaryTerm[] = [
  {
    term: "Controller",
    definition: "The electronic brain of an electric scooter that controls motor power, speed, and acceleration. Determines top speed and acceleration curves.",
  },
  {
    term: "Motor",
    definition: "The electric motor that powers the scooter. Can be hub motor (in wheel) or belt-driven. Measured in watts (250W, 500W, 1000W+).",
  },
  {
    term: "Battery",
    definition: "The power source for electric scooters. Measured in voltage (36V, 48V, 52V) and amp-hours (Ah). Determines range.",
  },
  {
    term: "BMS",
    definition: "Battery Management System. Protects the battery from overcharging, over-discharging, and overheating.",
  },
  {
    term: "Throttle",
    definition: "The control mechanism (thumb throttle or twist throttle) that regulates motor power and speed.",
  },
  {
    term: "Regenerative Braking",
    definition: "A system that converts braking energy back into battery power, extending range slightly.",
  },
  {
    term: "Inner Tube",
    definition: "The inflatable rubber tube inside pneumatic tires that holds air. Common sizes: 8.5×2, 10×2.5, 10×3.0.",
  },
  {
    term: "Solid Tire",
    definition: "A tire made of solid rubber or foam. No flats but less comfortable ride than pneumatic tires.",
  },
  {
    term: "Pneumatic Tire",
    definition: "A tire filled with air (using an inner tube). Provides better shock absorption and grip than solid tires.",
  },
  {
    term: "Brake Lever",
    definition: "The handlebar lever you pull to activate brakes. Can control front brake, rear brake, or both.",
  },
  {
    term: "Disc Brake",
    definition: "A braking system using a rotor and caliper. Standard on most modern scooters for reliable stopping power.",
  },
  {
    term: "Drum Brake",
    definition: "A braking system where brake shoes press outward against a drum inside the wheel hub. Low maintenance.",
  },
  {
    term: "Fork",
    definition: "The front suspension component that connects the front wheel to the deck. Can be rigid, spring, or hydraulic.",
  },
  {
    term: "Suspension",
    definition: "The system that absorbs bumps and impacts. Can be front-only or dual suspension (front and rear).",
  },
  {
    term: "Deck",
    definition: "The platform you stand on. Usually made of aluminum or composite material. Size affects stability.",
  },
  {
    term: "Stem",
    definition: "The component that connects the handlebar to the deck. Can be fixed or folding for portability.",
  },
  {
    term: "Handlebar",
    definition: "The bar you hold while riding. Usually adjustable height. Can fold down for storage.",
  },
  {
    term: "Grips",
    definition: "The rubber covering on handlebars for comfort and grip. Should be replaced if worn or damaged.",
  },
  {
    term: "Fender",
    definition: "The plastic or metal guard over wheels that prevents water and debris from splashing up.",
  },
  {
    term: "Kickstand",
    definition: "The retractable leg that holds the scooter upright when parked. Can be center or side-mounted.",
  },
  {
    term: "Folding Mechanism",
    definition: "The system that allows the scooter to fold for storage. Usually involves stem and sometimes handlebar.",
  },
  {
    term: "Axle",
    definition: "The rod that goes through the wheel hub and attaches the wheel to the fork or rear mount.",
  },
  {
    term: "Hub Motor",
    definition: "An electric motor built into the wheel hub. More efficient and quieter than external motors.",
  },
  {
    term: "Wattage",
    definition: "Motor power rating. Higher wattage means more power and speed. Common: 250W (legal limit), 500W, 1000W+.",
  },
  {
    term: "Voltage",
    definition: "Battery voltage determines power output. Higher voltage = more power. Common: 36V, 48V, 52V.",
  },
  {
    term: "Range",
    definition: "How far the scooter can travel on a single battery charge. Affected by speed, weight, terrain, and battery capacity.",
  },
  {
    term: "Charger",
    definition: "The device that charges the battery. Usually 2A or 3A output. Fast chargers (5A+) reduce charging time.",
  },
  {
    term: "Display",
    definition: "The screen on the handlebar showing speed, battery level, mode, and other information.",
  },
  {
    term: "Speed Modes",
    definition: "Different power/speed settings (Eco, Normal, Sport). Lower modes extend battery life.",
  },
];
