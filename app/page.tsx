export default function HomePage() {
  return (
    <main>
      <div className="card">
        <h1 className="h1">WhatsApp + Google Sheets Bot</h1>
        <p className="p">
          This service exposes a WhatsApp webhook and queries a Google Sheet for order status and inventory. Configure your environment variables and set your webhook URL in WhatsApp Business settings to <span className="code">/api/whatsapp</span>.
        </p>
        <p className="p">
          Health check: <a className="code" href="/api/health">/api/health</a>
        </p>
      </div>
    </main>
  );
}
