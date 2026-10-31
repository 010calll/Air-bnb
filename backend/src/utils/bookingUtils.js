const MILLISECONDS_PER_NIGHT = 24 * 60 * 60 * 1000;

function parseDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const timestamp = Date.parse(`${date}T00:00:00.000Z`);

  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== date
  ) {
    return null;
  }

  return timestamp;
}

function hasDateConflict(bookings, listingId, dateArrivee, dateDepart) {
  return bookings.some((booking) => {
    if (booking.listingId !== listingId) {
      return false;
    }

    const arriveeExistante = parseDate(booking.dateArrivee);
    const departExistant = parseDate(booking.dateDepart);

    return (
      arriveeExistante !== null &&
      departExistant !== null &&
      dateArrivee < departExistant &&
      dateDepart > arriveeExistante
    );
  });
}

function countNights(dateArrivee, dateDepart) {
  return (dateDepart - dateArrivee) / MILLISECONDS_PER_NIGHT;
}

export { countNights, hasDateConflict, parseDate };
