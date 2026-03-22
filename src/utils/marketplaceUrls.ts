/** Поиск по названию монитора на маркетплейсах (как в примерах). */

export function ozonSearchUrl(query: string): string {
  const q = query.trim();
  const text = encodeURIComponent(q).replace(/%20/g, '+');
  return `https://www.ozon.ru/search/?text=${text}&from_global=true`;
}

export function wildberriesSearchUrl(query: string): string {
  return `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(query.trim())}`;
}

export function yandexMarketSearchUrl(query: string): string {
  const text = encodeURIComponent(query.trim()).replace(/%20/g, '+');
  return `https://market.yandex.ru/search?text=${text}&cvredirect=1`;
}
