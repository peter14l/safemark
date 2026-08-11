import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve((req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>SafeMark Pairing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            background-color: #0A0A0F;
            color: #FFFFFF;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            text-align: center;
            padding: 50px 20px;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 80vh;
          }
          .card {
            background-color: #1A1A2E;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 100%;
          }
          h2 { color: #FFFFFF; margin-bottom: 10px; }
          p { color: #8888AA; font-size: 14px; line-height: 1.5; margin-bottom: 20px; }
          .code {
            color: #6C63FF;
            font-family: monospace;
            font-size: 28px;
            letter-spacing: 4px;
            font-weight: bold;
            background-color: #0A0A0F;
            padding: 15px;
            border-radius: 12px;
            border: 1px solid #6C63FF30;
            margin: 20px 0;
          }
          .btn {
            display: inline-block;
            background-color: #6C63FF;
            color: white;
            padding: 14px 28px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: bold;
            transition: background-color 0.2s;
            margin-top: 10px;
          }
          .btn:hover { background-color: #5B52E0; }
        </style>
        <script>
          window.onload = function() {
            // Attempt to open the custom scheme
            window.location.href = "safemark://pair?code=${code}";
          }
        </script>
      </head>
      <body>
        <div class="card">
          <h2>Pairing Devices</h2>
          <p>We are opening the SafeMark app for you...</p>
          <div class="code">${code}</div>
          <p>If the app didn't open automatically, please tap the button below:</p>
          <a href="safemark://pair?code=${code}" class="btn">Open SafeMark</a>
        </div>
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
});
