// netlify/functions/send-dispatch.js
// Receives dispatch data, sends branded email to driver + internal team via Resend
//
// Required Netlify environment variables:
//   RESEND_KEY     — Resend API key (re_...)
//   MONDAY_TOKEN   — monday.com API token (optional, for future monday integration)

const RESEND_KEY     = process.env.RESEND_KEY;
const FROM           = 'HANDS Logistics <concierge@handslogistics.com>';
const INTERNAL       = ['jon@handslogistics.com', 'charles@handslogistics.com'];
const GREEN          = '#a0d6b4';
const BLACK          = '#0a0a0a';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

async function resend(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: Array.isArray(to) ? to : [to], subject, html })
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Resend: ' + JSON.stringify(data));
  return data;
}

function stripe() {
  return '<tr><td style="height:3px;background:linear-gradient(90deg,' + BLACK + ' 68%,' + GREEN + ' 68%);font-size:0;">&nbsp;</td></tr>';
}

function stopBlock(stop, idx) {
  return '<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;margin-bottom:12px;">' +
    '<tr><td style="background:' + BLACK + ';padding:9px 16px;">' +
      '<span style="font-size:9px;letter-spacing:2px;color:' + GREEN + ';font-family:monospace;text-transform:uppercase;font-weight:700;">Stop ' + (idx + 1) + '</span>' +
      (stop.po ? '<span style="font-size:9px;color:#555;font-family:monospace;margin-left:12px;">PO# ' + stop.po + '</span>' : '') +
    '</td></tr>' +
    '<tr><td style="padding:14px 16px;">' +
      '<table width="100%" cellpadding="0" cellspacing="0">' +
        (stop.account    ? '<tr><td style="width:38%;font-size:10px;color:#999;font-family:monospace;text-transform:uppercase;padding:4px 0;">Account</td><td style="font-size:13px;color:#111;padding:4px 0;">' + stop.account + '</td></tr>' : '') +
        (stop.address    ? '<tr><td style="font-size:10px;color:#999;font-family:monospace;text-transform:uppercase;padding:4px 0;vertical-align:top;">Address</td><td style="font-size:13px;color:#111;padding:4px 0;">' + stop.address.replace(/\n/g, '<br>') + '</td></tr>' : '') +
        (stop.time       ? '<tr><td style="font-size:10px;color:#999;font-family:monospace;text-transform:uppercase;padding:4px 0;">Time</td><td style="font-size:13px;color:#111;padding:4px 0;">' + stop.time + '</td></tr>' : '') +
        (stop.contact    ? '<tr><td style="font-size:10px;color:#999;font-family:monospace;text-transform:uppercase;padding:4px 0;">Contact</td><td style="font-size:13px;color:#111;padding:4px 0;">' + stop.contact + '</td></tr>' : '') +
        (stop.items      ? '<tr><td style="font-size:10px;color:#999;font-family:monospace;text-transform:uppercase;padding:4px 0;vertical-align:top;">Items</td><td style="font-size:13px;color:#111;padding:4px 0;">' + stop.items + '</td></tr>' : '') +
        (stop.notes      ? '<tr><td style="font-size:10px;color:#999;font-family:monospace;text-transform:uppercase;padding:4px 0;vertical-align:top;">Notes</td><td style="font-size:12px;color:#666;padding:4px 0;">' + stop.notes + '</td></tr>' : '') +
      '</table>' +
    '</td></tr>' +
  '</table>';
}

function buildDriverEmail(d) {
  const stops = (d.stops || []).map((s, i) => stopBlock(s, i)).join('');
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
  '<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,sans-serif;">' +
  '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 16px;">' +
  '<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e0e0e0;max-width:600px;">' +

  // Header
  '<tr><td style="background:' + BLACK + ';padding:22px 32px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>' +
      '<td><div style="font-size:9px;letter-spacing:3px;color:#555;font-family:monospace;text-transform:uppercase;margin-bottom:3px;">Driver Dispatch</div>' +
      '<div style="font-size:20px;font-weight:700;letter-spacing:2px;color:' + GREEN + ';font-family:monospace;">HANDS LOGISTICS</div></td>' +
      '<td align="right" valign="middle"><div style="font-size:9px;color:#555;font-family:monospace;text-transform:uppercase;margin-bottom:3px;">Date</div>' +
      '<div style="font-size:13px;color:#fff;font-family:monospace;">' + (d.date || '—') + '</div></td>' +
    '</tr></table>' +
  '</td></tr>' +
  stripe() +

  // Greeting
  '<tr><td style="padding:22px 32px 10px;">' +
    '<p style="margin:0 0 10px;font-size:15px;color:#111;">Hi ' + (d.driverName || 'Driver') + ',</p>' +
    '<p style="margin:0;font-size:13px;color:#666;line-height:1.7;">Here are your dispatch details for today. Please review all stops and contact us if you have any questions.</p>' +
  '</td></tr>' +

  // Info band
  '<tr><td style="padding:0 32px 16px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border-radius:4px;padding:12px 16px;">' +
      '<tr>' +
        '<td style="width:33%"><div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;margin-bottom:3px;">Vehicle</div>' +
        '<div style="font-size:13px;color:#111;font-weight:600;">' + (d.vehicle || '—') + '</div></td>' +
        '<td style="width:33%"><div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;margin-bottom:3px;">Stops</div>' +
        '<div style="font-size:13px;color:#111;font-weight:600;">' + (d.stops ? d.stops.length : 0) + '</div></td>' +
        '<td style="width:33%"><div style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;margin-bottom:3px;">Dispatcher</div>' +
        '<div style="font-size:13px;color:#111;font-weight:600;">' + (d.dispatcher || '—') + '</div></td>' +
      '</tr>' +
    '</table>' +
  '</td></tr>' +

  // Stops
  '<tr><td style="padding:0 32px 22px;">' +
    '<div style="font-size:9px;letter-spacing:2px;color:#999;font-family:monospace;text-transform:uppercase;margin-bottom:10px;border-bottom:1px solid #eee;padding-bottom:6px;">Delivery Stops</div>' +
    stops +
  '</td></tr>' +

  stripe() +
  '<tr><td style="padding:14px 32px;background:' + BLACK + ';">' +
    '<div style="font-size:9px;letter-spacing:1px;color:#444;font-family:monospace;line-height:2;">' +
      'HANDS Logistics &nbsp;&middot;&nbsp; concierge&#64;handslogistics&#46;com &nbsp;&middot;&nbsp; handslogistics&#46;com<br>' +
      '8540 Dean Martin Drive, Suite 160 &nbsp;&middot;&nbsp; Las Vegas, NV 89139' +
    '</div>' +
  '</td></tr>' +
  '</table></td></tr></table></body></html>';
}

function internalEmail(d) {
  const stops = (d.stops || []).map((s, i) => stopBlock(s, i)).join('');
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
  '<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">' +
  '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 16px;">' +
  '<table width="620" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e0e0e0;max-width:620px;">' +

  '<tr><td style="background:' + BLACK + ';padding:18px 28px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>' +
      '<td><div style="font-size:9px;letter-spacing:3px;color:#555;font-family:monospace;text-transform:uppercase;margin-bottom:3px;">Dispatch Sent</div>' +
      '<div style="font-size:18px;font-weight:700;letter-spacing:2px;color:' + GREEN + ';font-family:monospace;">HANDS LOGISTICS</div></td>' +
      '<td align="right" valign="middle"><div style="background:' + GREEN + ';color:' + BLACK + ';font-family:monospace;font-size:11px;font-weight:700;padding:6px 14px;letter-spacing:1px;display:inline-block;">' + (d.date || 'DISPATCH') + '</div></td>' +
    '</tr></table>' +
  '</td></tr>' +
  stripe() +

  // Driver + vehicle summary
  '<tr><td style="padding:20px 28px 0;">' +
    '<div style="font-size:10px;letter-spacing:2px;color:#999;font-family:monospace;text-transform:uppercase;border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:10px;">Driver Details</div>' +
    '<table width="100%" cellpadding="0" cellspacing="0">' +
      '<tr><td style="width:38%;font-size:10px;color:#999;font-family:monospace;text-transform:uppercase;padding:5px 0;">Driver</td><td style="font-size:13px;color:#111;padding:5px 0;">' + (d.driverName || '—') + '</td></tr>' +
      '<tr><td style="font-size:10px;color:#999;font-family:monospace;text-transform:uppercase;padding:5px 0;">Email</td><td style="font-size:13px;padding:5px 0;"><a href="mailto:' + (d.driverEmail || '') + '" style="color:' + GREEN + ';text-decoration:none;">' + (d.driverEmail || '—') + '</a></td></tr>' +
      '<tr><td style="font-size:10px;color:#999;font-family:monospace;text-transform:uppercase;padding:5px 0;">Vehicle</td><td style="font-size:13px;color:#111;padding:5px 0;">' + (d.vehicle || '—') + '</td></tr>' +
      '<tr><td style="font-size:10px;color:#999;font-family:monospace;text-transform:uppercase;padding:5px 0;">Dispatcher</td><td style="font-size:13px;color:#111;padding:5px 0;">' + (d.dispatcher || '—') + '</td></tr>' +
      '<tr><td style="font-size:10px;color:#999;font-family:monospace;text-transform:uppercase;padding:5px 0;">Date</td><td style="font-size:13px;color:#111;padding:5px 0;">' + (d.date || '—') + '</td></tr>' +
      '<tr><td style="font-size:10px;color:#999;font-family:monospace;text-transform:uppercase;padding:5px 0;">Total Stops</td><td style="font-size:13px;color:#111;padding:5px 0;">' + (d.stops ? d.stops.length : 0) + '</td></tr>' +
    '</table>' +
  '</td></tr>' +

  // Stops
  '<tr><td style="padding:18px 28px 22px;">' +
    '<div style="font-size:10px;letter-spacing:2px;color:#999;font-family:monospace;text-transform:uppercase;border-bottom:1px solid #eee;padding-bottom:6px;margin-bottom:10px;">Delivery Stops</div>' +
    stops +
  '</td></tr>' +

  stripe() +
  '<tr><td style="padding:14px 28px;background:' + BLACK + ';">' +
    '<div style="font-size:9px;letter-spacing:1px;color:#444;font-family:monospace;">' +
      'HANDS Logistics &nbsp;&middot;&nbsp; concierge&#64;handslogistics&#46;com &nbsp;&middot;&nbsp; Las Vegas, NV 89139' +
    '</div>' +
  '</td></tr>' +
  '</table></td></tr></table></body></html>';
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const d = JSON.parse(event.body);
    const { driverName, driverEmail, date, vehicle, dispatcher, stops = [] } = d;

    if (!driverEmail) throw new Error('Driver email is required');

    const driverSubject   = 'Your Dispatch — ' + (date || '') + ' · ' + (stops.length) + ' Stop' + (stops.length !== 1 ? 's' : '');
    const internalSubject = '[DISPATCH] ' + driverName + ' · ' + (date || '') + ' · ' + stops.length + ' stop' + (stops.length !== 1 ? 's' : '');

    await Promise.all([
      resend(driverEmail, driverSubject, buildDriverEmail(d)),
      resend(INTERNAL, internalSubject, internalEmail(d))
    ]);

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error('send-dispatch error:', err.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ success: false, error: err.message }) };
  }
};
