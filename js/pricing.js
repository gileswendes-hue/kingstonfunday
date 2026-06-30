/**
 * KFD camping pricing calculator.
 * Matches the published rate card:
 * - £12 per pitch per night (up to 4 people)
 * - £3 per extra adult (17+) per night beyond included occupancy
 * - Children under 16 are free
 * - £3 flat printing & postage per booking
 */

const RATES = {
  pitchPerNight: 12,
  extraAdultPerNight: 3,
  postage: 3,
  maxPeople: 6,
  includedPeople: 4,
};

function formatGBP(amount) {
  return `£${amount.toFixed(2)}`;
}

function calculateCampingPrice({ nights, adults, children }) {
  const n = Math.max(1, Number(nights) || 1);
  const a = Math.max(0, Number(adults) || 0);
  const c = Math.max(0, Number(children) || 0);
  const totalPeople = a + c;

  const pitchFee = n * RATES.pitchPerNight;

  let freeSlots = RATES.includedPeople;
  const childrenInFree = Math.min(c, freeSlots);
  freeSlots -= childrenInFree;
  const adultsInFree = Math.min(a, freeSlots);
  const chargeableAdults = a - adultsInFree;
  const extraAdultFee = chargeableAdults * n * RATES.extraAdultPerNight;

  const postage = RATES.postage;
  const total = pitchFee + extraAdultFee + postage;

  const breakdown = [
    { label: `Pitch (${n} night${n === 1 ? '' : 's'} × £${RATES.pitchPerNight})`, amount: pitchFee },
  ];

  if (chargeableAdults > 0) {
    breakdown.push({
      label: `Extra adults (${chargeableAdults} × ${n} night${n === 1 ? '' : 's'} × £${RATES.extraAdultPerNight})`,
      amount: extraAdultFee,
    });
  }

  breakdown.push({ label: 'Printing & postage', amount: postage });

  return {
    nights: n,
    adults: a,
    children: c,
    totalPeople,
    chargeableAdults,
    pitchFee,
    extraAdultFee,
    postage,
    total,
    breakdown,
    valid: totalPeople >= 1 && totalPeople <= RATES.maxPeople && a >= 1,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RATES, calculateCampingPrice, formatGBP };
}
