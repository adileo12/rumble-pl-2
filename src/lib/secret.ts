import { db } from "@/src/lib/db";
import type { PrismaClient } from "@prisma/client";

const ANIMALS = [
  "Aardvark","Albatross","Alligator","Alpaca","Ant","Anteater","Antelope","Armadillo","Baboon","Badger",
  "Barracuda","Bat","Bear","Beaver","Bison","Boar","Buffalo","Butterfly","Camel","Caribou",
  "Cat","Caterpillar","Cheetah","Chicken","Chimpanzee","Chinchilla","Cobra","Cougar","Coyote","Crab",
  "Crane","Crocodile","Crow","Deer","Dingo","Dinosaur","Dog","Dolphin","Donkey","Dove",
  "Dragonfly","Duck","Eagle","Echidna","Eel","Elephant","Elk","Emu","Falcon","Ferret",
  "Finch","Fish","Flamingo","Fox","Frog","Gazelle","Gecko","Giraffe","Goat","Goldfinch",
  "Goose","Gopher","Gorilla","Grasshopper","Grouse","Hamster","Hare","Hawk","Hedgehog","Heron",
  "Hippopotamus","Hornet","Horse","Hummingbird","Hyena","Ibis","Iguana","Impala","Jaguar","Jay",
  "Jellyfish","Kangaroo","Kingfisher","Kiwi","Koala","Komodo","Lark","Leopard","Lemming","Lemur",
  "Lion","Lizard","Llama","Lobster","Lynx","Macaw","Magpie","Mallard","Manatee","Mandrill",
  "Mantis","Meerkat","Mink","Mole","Moose","Mouse","Mule","Narwhal","Newt","Nightingale",
  "Octopus","Opossum","Orangutan","Orca","Osprey","Ostrich","Otter","Owl","Ox","Panda",
  "Panther","Parrot","Peacock","Pelican","Penguin","Pheasant","Pig","Pigeon","Pika","Piranha",
  "Platypus","PolarBear","Porcupine","Porpoise","Possum","PrairieDog","Puffin","Puma","Quail","Quokka",
  "Rabbit","Raccoon","Ram","Raven","RedPanda","Reindeer","Rhinoceros","Rooster","Salamander","Salmon",
  "Sandpiper","Scorpion","Seahorse","Seal","Shark","Sheep","Skunk","Sloth","Snail","Snake",
  "Sparrow","Spider","Squid","Squirrel","Stallion","Starling","Stingray","Stork","Swan","Tapir",
  "Termite","Tiger","Toad","Toucan","Trout","Turkey","Turtle","Viper","Vulture","Wallaby",
  "Walrus","Wasp","Weasel","Whale","Wildcat","Wildebeest","Wolf","Wolverine","Wombat","Woodpecker",
  "Yak","Zebra"
];

function rand(n: number) {
  return Math.floor(Math.random() * n);
}

export function generateSecretCode() {
  const animal = ANIMALS[rand(ANIMALS.length)];
  const num = String(rand(90) + 10); // 10..99
  return `${animal}${num}`;
}

export async function generateUniqueSecret(db: PrismaClient) {
  for (let i = 0; i < 8; i++) {
    const code = generateSecretCode();
    const exists = await db.user.findUnique({ where: { secretCode: code } });
    if (!exists) return code;
  }
  throw new Error("Could not generate a unique secret code. Try again.");
}
