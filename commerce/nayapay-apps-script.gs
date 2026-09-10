// Set WEBHOOK_SECRET and NAYAPAY_SIGNING_KEY in Apps Script > Project Settings > Script Properties.
const WEBHOOK_URL = 'https://www.sasifysolutions.com/api/nayapay/email-webhook';

function checkNayaPayEmails() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    const secret = props.getProperty('WEBHOOK_SECRET');
    const signingKey = props.getProperty('NAYAPAY_SIGNING_KEY');
    if (!secret || !signingKey) throw new Error('Set WEBHOOK_SECRET and NAYAPAY_SIGNING_KEY in Script Properties.');
    const query = 'from:(nayapay) subject:("You got Rs.") newer_than:2d';
    const threads = GmailApp.search(query, 0, 20);
    let attempted = 0;
    threads.forEach((thread) => {
      thread.getMessages().forEach((message) => {
        // Rotate the local marker when recovering from an interrupted webhook
        // migration. The server also deduplicates by message and transaction ID.
        const id = 'v3-' + message.getId();
        if (props.getProperty(id)) return;
        try {
          attempted += 1;
          const payload = { subject:message.getSubject(),text:message.getPlainBody(),html:message.getBody(),to:message.getTo(),from:message.getFrom(),date:message.getDate().toISOString(),messageId:message.getId(),sentAt:String(Date.now()),source:'gmail-apps-script',secret:secret };
          const signed = JSON.stringify([payload.messageId,payload.date,payload.from,payload.subject,payload.text,payload.sentAt,payload.html || '',payload.to || '']);
          payload.signature = Utilities.computeHmacSha256Signature(signed,signingKey,Utilities.Charset.UTF_8).map((b) => ('0'+((b+256)%256).toString(16)).slice(-2)).join('');
          const response = UrlFetchApp.fetch(WEBHOOK_URL, {
            method:'post', contentType:'application/json', muteHttpExceptions:true,
            payload:JSON.stringify(payload)
          });
          const code = response.getResponseCode();
          const body = response.getContentText();
          console.log('Webhook response', code, body);
          if (code >= 200 && code < 300) {
            const result = JSON.parse(body);
            if (result.ok && result.status !== 'rejected') props.setProperty(id,new Date().toISOString());
          }
        } catch(error) { console.log('Payment email retry scheduled for next run.'); }
      });
    });
    if (attempted) console.log('Payment emails attempted', attempted);
  } finally { lock.releaseLock(); }
}

function installPaymentTrigger() {
  ScriptApp.getProjectTriggers().filter((trigger) => trigger.getHandlerFunction() === 'checkNayaPayEmails').forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('checkNayaPayEmails').timeBased().everyMinutes(1).create();
}
