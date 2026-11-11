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

## Struktúra

```
src/
  App.tsx                    lista + szinkron logika összefogása
  components/                Header, AddBar, Player, Queue, RoomDialog, Toasts
  hooks/
    useYouTubePlayer.ts      iframe vezérlés, események, visszacsatolás-védelem
    useRoom.ts               BroadcastChannel + WebRTC
    useToasts.ts, useTheme.ts
  lib/
    youtube.ts               linkfeldolgozás, embed URL
    protocol.ts              üzenettípusok és validálás
```

## Később

Ha szerveres jelzéscserét szeretnél (kód másolgatás helyett), elég a `useRoom.ts`-ben a `hostInvite` / `hostFinish` / `guestAnswer`
hármast egy WebSocket vagy PeerJS alapú szobakódos megoldásra cserélni; a többi réteg (`send`, `onMessage`) változatlan marad.

## Tudnivalók

- Ne `file://`-ról nyisd, mert a YouTube hivatkozó (referrer) nélkül hibát (153) adhat. A `yarn dev` jó.
- Az autoplay böngészőtől függően blokkolódhat, ilyenkor egyszer rá kell kattintani a lejátszóra.
