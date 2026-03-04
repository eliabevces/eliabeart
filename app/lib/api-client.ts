import { Foto } from "@/app/types/Foto";

/**
 * Client-side: fetch random photo via internal API route.
 */
export const random_photo = async (): Promise<Foto | null> => {
  try {
    const response = await fetch("/api/random-photo", {
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`Failed to fetch random photo: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
};
