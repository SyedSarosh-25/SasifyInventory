// Set WEBHOOK_SECRET, NAYAPAY_SIGNING_KEY and NAYAPAY_SENDER in Apps Script > Project Settings > Script Properties.
// WEBHOOK_SECRET must match the server setting. Never publish this script as a web app.
const WEBHOOK_URL = 'https://www.sasifysolutions.com/api/nayapay/email-webhook';

function checkNayaPayEmails() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    const secret = props.getProperty('WEBHOOK_SECRET');
    const sender = props.getProperty('NAYAPAY_SENDER');
    const signingKey = props.getProperty('NAYAPAY_SIGNING_KEY');
    if (!secret || !sender || !signingKey) throw new Error('Set the three required Script Properties.');
    const threads = GmailApp.search('from:(' + sender + ') subject:("You got Rs.") newer_than:7d', 0, 100);
    const started = Date.now();
    for (const thread of threads) {
      for (const message of thread.getMessages()) {
        if (Date.now() - started > 240000) return;
        const id = 'sasify-payment-v4-' + message.getId();
        if (props.getProperty(id)) continue;
        const from = message.getFrom();
        const address = (from.match(/<([^>]+)>/) || [null,from])[1];
        if (address.toLowerCase() !== sender.toLowerCase() || !/^You got Rs\./.test(message.getSubject())) continue;
        try {
          const payload = { subject:message.getSubject(),text:message.getPlainBody(),html:message.getBody(),to:message.getTo(),from:from,date:message.getDate().toISOString(),messageId:message.getId(),sentAt:String(Date.now()),source:'gmail-apps-script',secret:secret };
          const signed = JSON.stringify([payload.messageId,payload.date,payload.from,payload.subject,payload.text,payload.sentAt,payload.html || '',payload.to || '']);
          payload.signature = Utilities.computeHmacSha256Signature(signed,signingKey,Utilities.Charset.UTF_8).map((b) => ('0'+((b+256)%256).toString(16)).slice(-2)).join('');
          const response = UrlFetchApp.fetch(WEBHOOK_URL, {
            method:'post', contentType:'application/json', muteHttpExceptions:true,
            payload:JSON.stringify(payload)
          });
          const code = response.getResponseCode();
          if (code >= 200 && code < 300) {
            const result = JSON.parse(response.getContentText());
            if (result.ok && ['recorded','duplicate'].includes(result.status)) props.setProperty(id,String(Date.now()));
          }
          console.log('Payment email processed: HTTP ' + code);
        } catch(error) { console.log('Payment email retry scheduled for next run.'); }
      }
    }
    const cutoff = Date.now()-8*86400000;
    const saved = props.getProperties();
    Object.keys(saved).filter((key) => key.indexOf('sasify-payment-') === 0 && Number(saved[key]) < cutoff).forEach((key) => props.deleteProperty(key));
  } finally { lock.releaseLock(); }
}
