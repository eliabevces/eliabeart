import { Foto } from "@/app/types/Foto";

export interface RandomStrip {
  frames: Foto[];
  featuredIndex: number;
}

/**
 * Client-side: fetch a random photo together with its neighbours on the roll.
 */
export const random_strip = async (
  radius = 2
): Promise<RandomStrip | null> => {
  try {
    const response = await fetch(`/api/images/random/strip?radius=${radius}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`Failed to fetch random strip: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
};

/**
 * Client-side: fetch random photo via internal API route.
 */
export const random_photo = async (): Promise<Foto | null> => {
  try {
    const response = await fetch("/api/images/random", {
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
