function filterListings(listings, { ville, prixMin, prixMax }) {
  return listings.filter((listing) => {
    const correspondVille =
      !ville || listing.ville.toLowerCase() === ville.toLowerCase();
    const correspondPrixMin =
      prixMin === undefined || listing.prixParNuit >= prixMin;
    const correspondPrixMax =
      prixMax === undefined || listing.prixParNuit <= prixMax;

    return correspondVille && correspondPrixMin && correspondPrixMax;
  });
}

export { filterListings };
