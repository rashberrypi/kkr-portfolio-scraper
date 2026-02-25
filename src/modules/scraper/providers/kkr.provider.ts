async scrape() {
  let allCompanies = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    // The URL you provided
    const url = `https://www.kkr.com/content/kkr/sites/global/en/invest/portfolio/jcr:content/root/main-par/bioportfoliosearch.bioportfoliosearch.json?page=${page}&sortParameter=name&sortingOrder=asc`;

    const response = await axios.get(url);
    const data = response.data;

    // KKR's JSON usually has a 'results' or 'items' array
    // Adjust 'data.results' based on the actual JSON keys
    const items = data.results || data.items || [];

    if (items.length === 0) {
      hasMore = false;
    } else {
      allCompanies.push(...items);
      page++;
      // Safety break to prevent infinite loops during testing
      if (page > 25) hasMore = false;
    }
  }
  return allCompanies;
}