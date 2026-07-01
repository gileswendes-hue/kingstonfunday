/**
 * KFD camping pricing calculator.
 * - £15 per pitch per night (2 people included per pitch)
 * - £4 per extra adult (17+) per night beyond included occupancy
 * - Children under 16 are free (fill remaining included capacity after adults)
 * - £2 flat printing & postage per booking
 * - Max 6 people per pitch — extra pitches added automatically
 * - Max 6 dogs per booking
 */

const RATES = {
  pitchPerNight: 15,
  extraAdultPerNight: 4,
  postage: 2,
  maxPeoplePerPitch: 6,
  includedPeople: 2,
  maxDogs: 6,
};

function formatGBP(amount) {
  return `£${amount.toFixed(2)}`;
}

function calculateCampingPrice({ nights, adults, children, dogs }) {
  const n = Math.max(1, Number(nights) || 1);
  const a = Math.max(0, Number(adults) || 0);
  const c = Math.max(0, Number(children) || 0);
  const d = Math.max(0, Number(dogs) || 0);
  const totalPeople = a + c;
  const pitchCount = Math.max(1, Math.ceil(totalPeople / RATES.maxPeoplePerPitch));

  const pitchFee = pitchCount * n * RATES.pitchPerNight;

  const includedTotal = pitchCount * RATES.includedPeople;
  // Adults use included places first; children are free and never trigger extra-adult fees.
  const chargeableAdults = Math.max(0, a - Math.min(a, includedTotal));
  const extraAdultFee = chargeableAdults * n * RATES.extraAdultPerNight;

  const postage = RATES.postage;
  const total = pitchFee + extraAdultFee + postage;

  const breakdown = [
    {
      label: `${pitchCount} pitch${pitchCount === 1 ? '' : 'es'} (${n} night${n === 1 ? '' : 's'} × £${RATES.pitchPerNight})`,
      amount: pitchFee,
    },
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
    dogs: d,
    totalPeople,
    pitchCount,
    chargeableAdults,
    pitchFee,
    extraAdultFee,
    postage,
    total,
    breakdown,
    valid: totalPeople >= 1 && a >= 1 && d <= RATES.maxDogs,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RATES, calculateCampingPrice, formatGBP };
}

window.KFD_RATES = RATES;
