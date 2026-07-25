export async function GET() {
  return Response.json({ ok: true, service: 'onstore', stage: 1 });
}
