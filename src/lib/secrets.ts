import { db } from "@/src/lib/db";

const animals = [
  "Lion","Tiger","Leopard","Cheetah","Panther","Jaguar","Falcon","Eagle","Wolf",
  "Hawk","Shark","Puma","Cougar","Bison","Bear","Viper","Python","Cobra","Rhino",
  "Buffalo","Osprey","Raven","Lynx","Moose","Orca","Stallion","Mustang","Badger",
  "Otter","Gorilla","Ox","Yak","Mamba","Heron","Ibex","Koala","Kangaroo","Panda",
  "Pelican","Toucan","Crane","Goose","Swan","Cormorant","Seal","Walrus","Marten",
  "Wombat","Gannet"
];

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function twoDigits() { return String(Math.floor(10 + Math.random() * 90)); }

export async function generateUniqueSecret(): Promise<string> {
  // try a few times to avoid a rare collision
  for (let i = 0; i < 8; i++) {
    const candidate = `${pick(animals)}${twoDigits()}`;
    const exists = await db.user.findFirst({ where: { secretCode: candidate } });
    if (!exists) return candidate;
  }
  // ultra-rare fallback: add more randomness
  return `${pick(animals)}${twoDigits()}${twoDigits()}`;
}
