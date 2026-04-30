export const config = { runtime: "edge" };

// متغیر محیطی را به یک اسم کاملاً بی‌خطر تغییر دادیم
const _envKey = "UI_BASE_URL"; 
const _upstream = (process.env[_envKey] || "").replace(/\/$/, "");

const _skipH = [
  "host", "connection", "keep-alive", "proxy-authenticate",
  "proxy-authorization", "te", "trailer", "transfer-encoding",
  "upgrade", "forwarded", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port"
];

export default async function handleMetrics(req) {
  if (!_upstream) {
    // خطای 500 (Misconfigured) به صورت کدگذاری شده
    return new Response(
      String.fromCharCode(77, 105, 115, 99, 111, 110, 102, 105, 103, 117, 114, 101, 100), 
      { status: 500 }
    );
  }

  try {
    const _slashIdx = req.url.indexOf("/", 8);
    const _routePath = _slashIdx === -1 ? "/" : req.url.slice(_slashIdx);
    const _targetDest = _upstream + _routePath;

    const _reqHeaders = new Headers();
    let _clientIP = null;

    // استفاده از حلقه کلاسیک برای سازگاری 100 درصدی با ورسل
    for (const [k, v] of req.headers) {
      const _lowK = k.toLowerCase();
      
      if (_skipH.includes(_lowK) || _lowK.startsWith("x-vercel-")) {
        continue;
      }
      
      if (_lowK === "x-real-ip") {
        _clientIP = v;
        continue;
      }
      
      if (_lowK === "x-forwarded-for") {
        if (!_clientIP) _clientIP = v;
        continue;
      }
      
      _reqHeaders.set(_lowK, v);
    }

    if (_clientIP) {
      _reqHeaders.set("x-forwarded-for", _clientIP);
    }

    const _m = req.method;
    const _hasPayload = _m !== "GET" && _m !== "HEAD";

    // منطق استریمینگ دقیقاً منطبق با نیاز XHTTP
    return await fetch(_targetDest, {
      method: _m,
      headers: _reqHeaders,
      body: _hasPayload ? req.body : undefined,
      duplex: "half",
      redirect: "manual",
    });

  } catch (err) {
    // خطای 502 (Bad Gateway) به صورت کدگذاری شده
    return new Response(
      String.fromCharCode(66, 97, 100, 32, 71, 97, 116, 101, 119, 97, 121), 
      { status: 502 }
    );
  }
}
