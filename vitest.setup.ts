// Vitest не чете .env.local сам (Vite зарежда само VITE_ префикси).
// Интеграционните тестове се нуждаят от DATABASE_URL, затова е тук.
import { config } from "dotenv";

config({ path: ".env.local" });
