import { db } from "@/src/lib/db";

const animals = [
  "Lion","Tiger","Cheetah","Panther","Leopard","Jaguar","Wolf","Fox","Bear","Eagle",
  "Falcon","Hawk","Shark","Dolphin","Whale","Rhino","Hippo","Gorilla","Puma","Lynx",
  "Bison","Otter","Badger","Moose","Raven","Cobra","Viper","Cougar","Owl","Bat",
  "Camel","Giraffe","Elephant","Zebra","Kangaroo","Koala","Panda","Sloth","Armadillo",
  "Porcupine","Hedgehog","Wolverine","Alligator","Crocodile","Monitor","Gecko",
  "Chameleon","Toad","Frog","Salamander","Newt","Parrot","Macaw","Canary","Finch",
  "Sparrow","Peacock","Penguin","Seagull","Heron","Crane","Flamingo","Stork","Puffin",
  "Seal","Walrus","SeaLion","Manatee","Orca","Swordfish","Marlin","Barracuda",
  "Piranha","Goldfish","Carp","Salmon","Trout","Catfish","Stingray","Octopus",
  "Squid","Lobster","Crab","Shrimp","Starfish","Jellyfish","Coral","Butterfly",
  "Bee","Wasp","Hornet","Dragonfly","Grasshopper","Cricket","Ant","Termite","Scorpion",
  "Tarantula","Spider","Moth","Firefly","Beetle","Ladybug"
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateSecretCode() {
  const animal = animals[randomInt(0, animals.length - 1)];
  const num = String(randomInt(0, 99)).padStart(2, '0'); // ensures two digits
  return `${animal}${num}`;
}
