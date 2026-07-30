// Текстовете на магазина: каталог, детайл на продукта и количка.
//
// Правно натоварените изречения (§312j BGB, §356 Abs. 5 BGB) са преведени
// като ИНФОРМАЦИЯ, не като правна форма: обвързващата версия е немската,
// а тя остава дословно каквато е. Ако юрист поиска друга формулировка,
// тя се сменя тук и на трите места наведнъж.

import type { Locale } from "@/lib/i18n/config";

const de = {
  list: {
    metaTitle: "Shop",
    metaDescription:
      "Lehrbücher, Arbeitshefte und digitale Materialien des NFI.",
    kicker: "Shop",
    title: "Lehrbücher und Materialien",
    lead:
      "Alle Preise inkl. MwSt. Versandkosten werden im Warenkorb berechnet.",
    empty: "Zurzeit sind keine Produkte verfügbar.",
    badgeDownload: "Download",
    badgeShipping: "Versand",
    vatNote: "inkl. MwSt.",
    details: "Details",
    detailsFor: (title: string) => `zu ${title}`,
    soldOut: "Ausverkauft",
  },

  product: {
    notFound: "Produkt nicht gefunden",
    breadcrumb: "Brotkrumen",
    shopLink: "Shop",
    badgeInstantDownload: "Sofort-Download",
    badgeShipping: "Versand",
    filesHeading: "Enthaltene Dateien",
    vatNote: "inkl. MwSt.",
    shippingFree: "keine Versandkosten",
    shippingCalculated: "zzgl. Versand, wird im Warenkorb berechnet",
    delivery: "Lieferung",
    deliveryDigital: "sofort per Download",
    deliveryPhysical: "2–4 Werktage",
    availability: "Verfügbarkeit",
    soldOut: "ausverkauft",
    inStock: (count: number) => `${count} auf Lager`,
    withdrawal: "Widerrufsrecht",
    withdrawalDays: (days: number) => `${days} Tage`,
    addToCart: "In den Warenkorb",
    soldOutButton: "Ausverkauft",
    digitalWithdrawalNote:
      "Bei digitalen Inhalten erlischt das Widerrufsrecht, sobald Sie dem sofortigen Beginn der Ausführung ausdrücklich zustimmen und den Verlust bestätigen. Die Zustimmung wird im Bestellvorgang eingeholt.",
  },

  cart: {
    metaTitle: "Warenkorb",
    title: "Warenkorb",
    empty: "Ihr Warenkorb ist leer.",
    toShop: "Zum Shop",
    positions: "Positionen",
    perPiece: (price: string) => `${price} · Stück`,
    lineDiscount: (amount: string) => `− ${amount} Rabatt`,
    quantity: "Menge",
    change: "Ändern",
    remove: "Entfernen",
    summary: "Zusammenfassung",
    subtotal: "Zwischensumme",
    discount: "Rabatt",
    shipping: "Versand",
    shippingFree: "kostenlos",
    shippingNone: "entfällt",
    total: "Gesamt",
    vatIncluded: (amount: string) => `inkl. ${amount} MwSt.`,
    checkout: "Zur Kasse",
    priceNote:
      "Alle Preise inkl. gesetzlicher MwSt. Versandkosten werden nach Eingabe der Lieferadresse endgültig berechnet.",
  },
};

type ShopCopy = typeof de;

const bg: ShopCopy = {
  list: {
    metaTitle: "Магазин",
    metaDescription:
      "Учебници, тетрадки и електронни материали на НФИ.",
    kicker: "Магазин",
    title: "Учебници и материали",
    lead: "Всички цени са с ДДС. Доставката се начислява в количката.",
    empty: "В момента няма налични продукти.",
    badgeDownload: "Изтегляне",
    badgeShipping: "Доставка",
    vatNote: "с ДДС",
    details: "Подробности",
    detailsFor: (title: string) => `за ${title}`,
    soldOut: "Изчерпан",
  },

  product: {
    notFound: "Продуктът не е намерен",
    breadcrumb: "Път до страницата",
    shopLink: "Магазин",
    badgeInstantDownload: "Веднага за изтегляне",
    badgeShipping: "Доставка",
    filesHeading: "Включени файлове",
    vatNote: "с ДДС",
    shippingFree: "без разходи за доставка",
    shippingCalculated: "плюс доставка, начислява се в количката",
    delivery: "Доставка",
    deliveryDigital: "веднага за изтегляне",
    deliveryPhysical: "2–4 работни дни",
    availability: "Наличност",
    soldOut: "изчерпан",
    inStock: (count: number) => `${count} в наличност`,
    withdrawal: "Право на отказ",
    withdrawalDays: (days: number) => `${days} дни`,
    addToCart: "В количката",
    soldOutButton: "Изчерпан",
    digitalWithdrawalNote:
      "При електронно съдържание правото на отказ отпада, щом изрично се съгласиш изпълнението да започне веднага и потвърдиш, че така губиш това право. Съгласието се взима по време на поръчката.",
  },

  cart: {
    metaTitle: "Количка",
    title: "Количка",
    empty: "Количката ти е празна.",
    toShop: "Към магазина",
    positions: "Позиции",
    perPiece: (price: string) => `${price} / бр.`,
    lineDiscount: (amount: string) => `− ${amount} отстъпка`,
    quantity: "Количество",
    change: "Промени",
    remove: "Премахни",
    summary: "Обобщение",
    subtotal: "Междинна сума",
    discount: "Отстъпка",
    shipping: "Доставка",
    shippingFree: "безплатна",
    shippingNone: "не се начислява",
    total: "Общо",
    vatIncluded: (amount: string) => `включено ДДС ${amount}`,
    checkout: "Към плащане",
    priceNote:
      "Всички цени са с включено ДДС по закон. Доставката се изчислява окончателно след въвеждане на адреса.",
  },
};

const en: ShopCopy = {
  list: {
    metaTitle: "Shop",
    metaDescription:
      "Coursebooks, workbooks and digital materials from the NFI.",
    kicker: "Shop",
    title: "Coursebooks and materials",
    lead: "All prices include VAT. Shipping is calculated in the cart.",
    empty: "No products are available at the moment.",
    badgeDownload: "Download",
    badgeShipping: "Shipped",
    vatNote: "incl. VAT",
    details: "Details",
    detailsFor: (title: string) => `for ${title}`,
    soldOut: "Sold out",
  },

  product: {
    notFound: "Product not found",
    breadcrumb: "Breadcrumb",
    shopLink: "Shop",
    badgeInstantDownload: "Instant download",
    badgeShipping: "Shipped",
    filesHeading: "Files included",
    vatNote: "incl. VAT",
    shippingFree: "no shipping costs",
    shippingCalculated: "plus shipping, calculated in the cart",
    delivery: "Delivery",
    deliveryDigital: "instant download",
    deliveryPhysical: "2–4 working days",
    availability: "Availability",
    soldOut: "sold out",
    inStock: (count: number) => `${count} in stock`,
    withdrawal: "Right of withdrawal",
    withdrawalDays: (days: number) => `${days} days`,
    addToCart: "Add to cart",
    soldOutButton: "Sold out",
    digitalWithdrawalNote:
      "For digital content the right of withdrawal ends as soon as you expressly agree that we begin performance immediately and confirm that you thereby lose that right. We ask for this consent during checkout.",
  },

  cart: {
    metaTitle: "Cart",
    title: "Cart",
    empty: "Your cart is empty.",
    toShop: "To the shop",
    positions: "Items",
    perPiece: (price: string) => `${price} each`,
    lineDiscount: (amount: string) => `− ${amount} discount`,
    quantity: "Quantity",
    change: "Update",
    remove: "Remove",
    summary: "Summary",
    subtotal: "Subtotal",
    discount: "Discount",
    shipping: "Shipping",
    shippingFree: "free",
    shippingNone: "not applicable",
    total: "Total",
    vatIncluded: (amount: string) => `incl. ${amount} VAT`,
    checkout: "Checkout",
    priceNote:
      "All prices include statutory VAT. Shipping is calculated finally once you enter the delivery address.",
  },
};

const COPY: Record<Locale, ShopCopy> = { de, bg, en };

export function shopCopy(locale: Locale): ShopCopy {
  return COPY[locale] ?? COPY.de;
}
