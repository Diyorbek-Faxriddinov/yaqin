import { demoId } from "./ids";

export type DemoDistrict = {
  id: string;
  slug: string;
  name: { uz: string; ru: string };
  center: { lat: number; lng: number };
};

// Toshkent shahrining 12 tumani; markaz koordinatalari taxminiy
const RAW: Array<[slug: string, uz: string, ru: string, lat: number, lng: number]> = [
  ["bektemir", "Bektemir", "Бектемир", 41.209, 69.3347],
  ["chilonzor", "Chilonzor", "Чиланзар", 41.2755, 69.2042],
  ["mirobod", "Mirobod", "Мирабад", 41.287, 69.281],
  ["mirzo-ulugbek", "Mirzo Ulugʻbek", "Мирзо-Улугбек", 41.338, 69.335],
  ["olmazor", "Olmazor", "Алмазар", 41.348, 69.213],
  ["sergeli", "Sergeli", "Сергели", 41.227, 69.219],
  ["shayxontohur", "Shayxontohur", "Шайхантахур", 41.326, 69.228],
  ["uchtepa", "Uchtepa", "Учтепа", 41.29, 69.17],
  ["yakkasaroy", "Yakkasaroy", "Яккасарай", 41.286, 69.256],
  ["yangihayot", "Yangihayot", "Янгихаёт", 41.2, 69.24],
  ["yashnobod", "Yashnobod", "Яшнабад", 41.295, 69.33],
  ["yunusobod", "Yunusobod", "Юнусабад", 41.364, 69.286],
];

export const DISTRICTS: DemoDistrict[] = RAW.map(([slug, uz, ru, lat, lng]) => ({
  id: demoId(`district:${slug}`),
  slug,
  name: { uz, ru },
  center: { lat, lng },
}));
