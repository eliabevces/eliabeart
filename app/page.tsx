import React from "react";
import AlbumList from "./components/AlbumList";
import { get_albuns } from "@lib/api";

// ISR: regenerate at most once every 60s, matching config.CACHE_TTL
export const revalidate = 60;

export default async function Home() {
  const albuns = await get_albuns();

  return (
    <main className="pt-9 px-11 pb-3">
      <AlbumList albuns={albuns} />
    </main>
  );
}
