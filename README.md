# Közös Mozi

YouTube videók közös nézése, szerver nélkül. React + Vite + TypeScript, yarnnal.

## Indítás

```bash
yarn install
yarn dev          # http://localhost:5173 (LAN-ról is elérhető: host: true)
yarn build        # éles build a dist/ mappába
yarn preview
```

## Működés

- A lista csak memóriában él (oldalfrissítésig), nincs tárolás.
- Beágyazás: `https://www.youtube-nocookie.com/embed/{id}?enablejsapi=1`
- A lejátszó vezérlése a YouTube iframe `postMessage` felületén megy, külső script nélkül.
- Szoba:
  - **Helyi**: `BroadcastChannel`, ugyanazon böngésző fülei között (tesztelésre ideális).
  - **P2P**: WebRTC DataChannel, kézi jelzéscserével (meghívó kód → válasz kód). A host továbbítja az üzeneteket a vendégek között.

## Chat

- Az üzenetek csak memóriában élnek, oldalfrissítéskor eltűnnek. Az újonnan csatlakozó nem látja a korábbiakat.
- Mindenki kap egy véletlen becenevet (pl. „Vidám Panda 42”), ami a chat fejlécében átírható. A név színe és az avatar kezdőbetűje a névből képződik, így minden eszközön ugyanaz.
- P2P szobában a feladó nevét a **host** írja az üzenetre a kapcsolat alapján, a vendég nem adhatja ki magát másnak. Csatlakozás, kilépés és névváltás rendszersorként jelenik meg.
- Ha a chat panel összecsukott, a fejlécén olvasatlan számláló látszik.

## Reakciók

- A lejátszó alatti gombokkal (👍 ❤️ 😂 😮 👏 🔥 👀) emoji küldhető, ami mindenkinél felúszik a lejátszó fölött. Csak az emoji jelenik meg, név nélkül.
- Csak a fix lista (`REACTIONS` a `protocol.ts`-ben) fogadható el, bármi mást a `parseMsg` eldob.
- Korlát: küldőnként legfeljebb 5 reakció/másodperc (a host a vendégeket is korlátozza), és legfeljebb 30 egyidejű lebegő emoji.
- A réteg a beágyazott YouTube-lejátszó fölött van, ezért a lejátszó saját teljes képernyős módjában nem látszik.

## Struktúra

```
src/
  App.tsx                    lista + szinkron logika összefogása
  components/                Header, AddBar, Player, Queue, Chat, Reactions, RoomDialog, Toasts
  hooks/
    useYouTubePlayer.ts      iframe vezérlés, események, visszacsatolás-védelem
    useRoom.ts               BroadcastChannel + WebRTC
    useToasts.ts, useTheme.ts
  lib/
    youtube.ts               linkfeldolgozás, embed URL
    identity.ts              becenév, névből képzett szín
    protocol.ts              üzenettípusok és validálás
```

## Később

Ha szerveres jelzéscserét szeretnél (kód másolgatás helyett), elég a `useRoom.ts`-ben a `hostInvite` / `hostFinish` / `guestAnswer`
hármast egy WebSocket vagy PeerJS alapú szobakódos megoldásra cserélni; a többi réteg (`send`, `onMessage`) változatlan marad.

## Tudnivalók

- Ne `file://`-ról nyisd, mert a YouTube hivatkozó (referrer) nélkül hibát (153) adhat. A `yarn dev` jó.
- Az autoplay böngészőtől függően blokkolódhat, ilyenkor egyszer rá kell kattintani a lejátszóra.
