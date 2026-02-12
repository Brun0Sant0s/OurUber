export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // raio da terra em km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

const toRad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

export const estimateArrivalTime = (distanceKm: number): number => {
  const AVERAGE_SPEED_KMH = 30; 
  const timeHours = distanceKm / AVERAGE_SPEED_KMH;
  const timeMinutes = Math.ceil(timeHours * 60);

  return Math.max(1, Math.min(timeMinutes, 60));
};


export const calculateEstimatedPickupTime = (
  driverLat: number,
  driverLon: number,
  clientLat: number,
  clientLon: number
): number => {
  const distance = calculateDistance(driverLat, driverLon, clientLat, clientLon);
  return estimateArrivalTime(distance);
};
