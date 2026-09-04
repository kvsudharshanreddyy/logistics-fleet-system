/**
 * Deterministic Pricing Engine
 *
 * Cost = Base Rate + Distance Component + Weight Component + Type Surcharge
 *
 * Distance slabs (per km):
 *   0–50 km:    ₹10/km
 *   51–200 km:  ₹8/km
 *   201–500 km: ₹6/km
 *   500+ km:    ₹4/km
 *
 * Weight slabs (per kg):
 *   0–10 kg:    ₹5/kg
 *   11–50 kg:   ₹3/kg
 *   51–200 kg:  ₹2/kg
 *   200+ kg:    ₹1/kg
 *
 * Shipment type surcharges:
 *   STANDARD: 0%
 *   EXPRESS:  +30%
 *   FRAGILE:  +20%
 *   BULK:     +10%
 *
 * Base rate: ₹50 (handling fee)
 */

const BASE_RATE = 50;

const DISTANCE_SLABS = [
  { upTo: 50, rate: 10 },
  { upTo: 200, rate: 8 },
  { upTo: 500, rate: 6 },
  { upTo: Infinity, rate: 4 },
];

const WEIGHT_SLABS = [
  { upTo: 10, rate: 5 },
  { upTo: 50, rate: 3 },
  { upTo: 200, rate: 2 },
  { upTo: Infinity, rate: 1 },
];

const TYPE_SURCHARGES = {
  STANDARD: 0,
  EXPRESS: 0.3,
  FRAGILE: 0.2,
  BULK: 0.1,
};

/**
 * Calculate cost for a given distance, weight and type.
 * Returns detailed breakdown for transparency.
 */
const calculatePrice = (distance, weight, shipmentType = 'STANDARD') => {
  if (distance <= 0 || weight <= 0) {
    throw new Error('Distance and weight must be positive numbers');
  }

  // Distance component
  let distanceCost = 0;
  let remainingDist = distance;
  let prevLimit = 0;
  for (const slab of DISTANCE_SLABS) {
    if (remainingDist <= 0) break;
    const slabSize = slab.upTo === Infinity ? remainingDist : Math.min(remainingDist, slab.upTo - prevLimit);
    distanceCost += slabSize * slab.rate;
    remainingDist -= slabSize;
    prevLimit = slab.upTo === Infinity ? prevLimit : slab.upTo;
  }

  // Weight component
  let weightCost = 0;
  let remainingWeight = weight;
  let prevWeightLimit = 0;
  for (const slab of WEIGHT_SLABS) {
    if (remainingWeight <= 0) break;
    const slabSize =
      slab.upTo === Infinity
        ? remainingWeight
        : Math.min(remainingWeight, slab.upTo - prevWeightLimit);
    weightCost += slabSize * slab.rate;
    remainingWeight -= slabSize;
    prevWeightLimit = slab.upTo === Infinity ? prevWeightLimit : slab.upTo;
  }

  const subtotal = BASE_RATE + distanceCost + weightCost;
  const surchargeRate = TYPE_SURCHARGES[shipmentType] || 0;
  const surchargeAmount = subtotal * surchargeRate;
  const totalCost = Math.round((subtotal + surchargeAmount) * 100) / 100;

  return {
    baseRate: BASE_RATE,
    distanceCost: Math.round(distanceCost * 100) / 100,
    weightCost: Math.round(weightCost * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    surchargeRate: surchargeRate,
    surchargeAmount: Math.round(surchargeAmount * 100) / 100,
    totalCost,
    breakdown: {
      distance,
      weight,
      shipmentType,
    },
  };
};

module.exports = { calculatePrice, BASE_RATE, DISTANCE_SLABS, WEIGHT_SLABS, TYPE_SURCHARGES };
