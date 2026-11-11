const ADJECTIVES = ["Vidám", "Álmos", "Bátor", "Csendes", "Mókás", "Éhes", "Fürge", "Lusta", "Kíváncsi", "Szeles"];
const ANIMALS = ["Panda", "Borz", "Sün", "Róka", "Bagoly", "Vidra", "Pingvin", "Mókus", "Koala", "Delfin"];

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/** Véletlen, könnyen megjegyezhető becenév, pl. „Vidám Panda 42”. */
export function randomName(): string {
  return `${pick(ADJECTIVES)} ${pick(ANIMALS)} ${Math.floor(Math.random() * 90) + 10}`;
}

/** Névből képzett stabil szín: minden eszközön ugyanaz a név ugyanazt a színt kapja. */
export function colorFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return `hsl(${h % 360} 60% 42%)`;
}

export function initial(name: string): string {
  return (Array.from(name)[0] ?? "?").toUpperCase();
}
