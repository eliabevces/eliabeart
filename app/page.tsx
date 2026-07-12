import React from "react";
import AlbumList from "./components/AlbumList";
import { get_albuns } from "@lib/api";
import ScrollableContainer from "./components/ScrollableContainer";

// ISR: regenerate at most once every 60s, matching config.CACHE_TTL
export const revalidate = 60;

export default async function Home() {
  const albuns = await get_albuns();

  return (
    <ScrollableContainer className="grid grid-rows-[auto_1fr_auto] items-center justify-items-center min-h-[80vh] p-8 pb-20 gap-16 sm:p-20 font-sans w-full max-w-[90vw] mx-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <AlbumList albuns={albuns} />
      </main>
    </ScrollableContainer>
  );
}
