/** Resize quiz uploads before storing/transmitting them. No external service needed. */
export async function prepareQuizImage(file: File): Promise<string> {
  if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) throw new Error('Choose a PNG, JPEG, WebP or GIF image.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose an image under 20 MB.');
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(file);
  });
  // Keep small animated GIFs intact.
  if (file.type === 'image/gif' && source.length <= 512 * 1024) return source;
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const value = new Image(); value.onload = () => resolve(value);
    value.onerror = () => reject(new Error('Could not open this image.'));
    value.src = source;
  });
  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, 1280 / Math.max(image.width, image.height));
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image processing is unavailable in this browser.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.8, 0.65, 0.5]) {
    const result = canvas.toDataURL('image/webp', quality);
    if (result.length <= 512 * 1024) return result;
  }
  throw new Error('This image is too detailed. Resize it before uploading.');
}
