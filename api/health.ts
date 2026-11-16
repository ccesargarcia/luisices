export default function handler(_req: unknown, res: {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
}) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    runtime: 'vercel-functions',
    region: process.env.VERCEL_REGION || 'unknown',
    timestamp: new Date().toISOString(),
  });
}
