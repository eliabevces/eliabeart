import { ImageData } from "@/app/lib/images";

export interface UploadResult {
  fileName: string;
  status: "success" | "error";
  error?: string;
  image?: ImageData;
}
