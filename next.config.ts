import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ОБЩ ФАЙЛ (замразен след К1) — промяна тук се обяснява в commit-а.
  //
  // Server actions приемат тела до 1 MB по подразбиране — под всяка
  // реална снимка. Качването в медийната библиотека (задача 17m-b)
  // минава през server action, защото presigned PUT не се доказва без
  // реален bucket; 8 MB е таванът от MEDIA_LIMITS.uploadBytes, а с
  // включен JavaScript браузърът и без това смалява до 2560 px.
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
