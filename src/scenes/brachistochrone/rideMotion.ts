/** People waiting on the holding road since the last boarding. */
export function queueWaiting(
  elapsed: number,
  boardedAt: number,
  spots: number,
  interval: number,
) {
  if (interval <= 0 || spots <= 0) return 0;
  return Math.min(spots, Math.max(0, Math.floor((elapsed - boardedAt) / interval)));
}

/** Stamp a boarding time that leaves `remaining` people in the queue now. */
export function afterQueueBoarding(elapsed: number, remaining: number, interval: number) {
  return elapsed - Math.max(0, remaining) * interval;
}

/** Winch distance with one-second acceleration and braking ramps. */
export function haulDuration(distance: number, speed: number) {
  return distance / speed + 1;
}
export function haulDistance(time: number, distance: number, speed: number) {
  const duration = haulDuration(distance, speed);
  const t = Math.max(0, Math.min(duration, time));
  if (t < 1) return speed * t * t / 2;
  if (t > duration - 1) return distance - speed * (duration - t) ** 2 / 2;
  return speed * (t - 0.5);
}

export type RailStation = { x: number; y: number };

/** Locate the physical centre along the monotonically eastward track. */
export function railArcAtX(line: RailStation[], table: number[], x: number) {
  let low = 0;
  let high = line.length - 1;
  while (low + 1 < high) {
    const mid = (low + high) >> 1;
    if (line[mid].x <= x) low = mid;
    else high = mid;
  }
  const span = line[high].x - line[low].x;
  const t = span > 1e-9 ? (x - line[low].x) / span : 0;
  return table[low] + t * (table[high] - table[low]);
}

/** Two axle contacts turn a sharp rail join into a continuous rigid-body pose. */
export function railCartPose(line: RailStation[], table: number[], arc: number, wheelbase = 0.58) {
  const sample = (distance: number) => {
    let low = 0;
    let high = line.length - 1;
    while (low + 1 < high) {
      const mid = (low + high) >> 1;
      if (table[mid] <= distance) low = mid;
      else high = mid;
    }
    const span = table[high] - table[low];
    const t = span > 1e-9 ? (distance - table[low]) / span : 0;
    return {
      x: line[low].x + (line[high].x - line[low].x) * t,
      y: line[low].y + (line[high].y - line[low].y) * t,
    };
  };
  const rear = sample(arc - wheelbase / 2);
  const front = sample(arc + wheelbase / 2);
  return {
    x: (rear.x + front.x) / 2,
    y: (rear.y + front.y) / 2,
    pitch: Math.atan2(front.y - rear.y, front.x - rear.x),
  };
}
