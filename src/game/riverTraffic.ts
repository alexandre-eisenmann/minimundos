// Closed routes keep craft away from the cascades and pass beside bridge piers.
export function riverBoatPose(time: number, channel: number, phase: number) {
  const angle = time * 0.055 + phase;
  const dx = -9.5 * Math.sin(angle);
  const dz = 0.72 * Math.cos(angle);
  return {
    x: 9.5 * Math.cos(angle),
    z: channel + 0.72 * Math.sin(angle),
    yaw: Math.atan2(-dz, dx),
  };
}
