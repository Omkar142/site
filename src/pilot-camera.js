// Perspective and a shallow camera arc create depth through real parallax.
export function frameCamera(camera, width, height, progress = 0, dolly = 1) {
  const aspect = Math.max(0.2, width / height);
  const distance = Math.max(1, 1 / aspect) * dolly;
  const angle = 0.34 + (progress - 0.5) * 0.13;
  camera.aspect = aspect;
  camera.position.set(
    Math.sin(angle) * 8.4 * distance,
    (2.85 - 1.45) * distance + 1.45,
    Math.cos(angle) * 8.4 * distance,
  );
  camera.lookAt(0, 1.45, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}
