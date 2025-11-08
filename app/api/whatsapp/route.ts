import { env } from '../../../lib/env';
import { findInventoryBySku, findOrderById } from '../../../lib/sheets';
import { sendWhatsAppText } from '../../../lib/whatsapp';

export const runtime = 'nodejs';

function verifyToken(params: URLSearchParams) {
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');
  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN()) {
    return new Response(challenge || '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

function extractMessage(body: any): { from: string; text: string } | null {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages?.[0];
    const from = messages?.from;
    const text = messages?.text?.body ?? '';
    if (from && typeof text === 'string') return { from, text };
    return null;
  } catch {
    return null;
  }
}

function parseQuery(text: string): { kind: 'order' | 'inventory'; key: string } | null {
  const t = text.trim();
  const lower = t.toLowerCase();
  const orderMatch = lower.match(/^(order|status|track)\s*[:#\-]?\s*(\w[\w\-]*)/);
  if (orderMatch) {
    return { kind: 'order', key: orderMatch[2] };
  }
  const invMatch = lower.match(/^(inventory|stock|sku)\s*[:#\-]?\s*(\w[\w\-]*)/);
  if (invMatch) {
    return { kind: 'inventory', key: invMatch[2] };
  }
  return null;
}

async function handleOrder(from: string, id: string) {
  const rec = await findOrderById(id);
  if (!rec) {
    await sendWhatsAppText(from, `Order ${id} not found.`);
    return;
  }
  const lines = [
    `Order ${rec.orderId}`,
    `Status: ${rec.status || 'N/A'}`,
    rec.eta ? `ETA: ${rec.eta}` : undefined,
    rec.customer ? `Customer: ${rec.customer}` : undefined,
    rec.notes ? `Notes: ${rec.notes}` : undefined,
  ].filter(Boolean) as string[];
  await sendWhatsAppText(from, lines.join('\n'));
}

async function handleInventory(from: string, sku: string) {
  const rec = await findInventoryBySku(sku);
  if (!rec) {
    await sendWhatsAppText(from, `SKU ${sku} not found.`);
    return;
  }
  const lines = [
    `SKU ${rec.sku}`,
    rec.name ? `Name: ${rec.name}` : undefined,
    rec.inStock ? `In Stock: ${rec.inStock}` : undefined,
    rec.location ? `Location: ${rec.location}` : undefined,
    rec.updatedAt ? `Updated: ${rec.updatedAt}` : undefined,
  ].filter(Boolean) as string[];
  await sendWhatsAppText(from, lines.join('\n'));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return verifyToken(url.searchParams);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const msg = extractMessage(body);
    if (!msg) return new Response('ok', { status: 200 });
    const parsed = parseQuery(msg.text);
    if (!parsed) {
      await sendWhatsAppText(
        msg.from,
        'Send "order 12345" or "inventory SKU123" to get details.'
      );
      return new Response('ok', { status: 200 });
    }
    if (parsed.kind === 'order') {
      await handleOrder(msg.from, parsed.key);
    } else {
      await handleInventory(msg.from, parsed.key);
    }
    return new Response('ok', { status: 200 });
  } catch (e) {
    return new Response('ok', { status: 200 });
  }
}
