import { Hono } from 'hono';
import { uploadPhoto } from '../services/photo-storage.js';

const checkinRouter = new Hono();

checkinRouter.post('/photo', async (c) => {
  const body = await c.req.parseBody();
  const file = body['photo'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No photo file attached', code: 'MISSING_PHOTO' }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop() || 'jpg';
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `checkin-${dateStr}.${ext}`;

  const photoKey = await uploadPhoto(buffer, filename);

  return c.json({ success: true, photo_key: photoKey });
});

export { checkinRouter };
