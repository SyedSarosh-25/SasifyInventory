// Set WEBHOOK_SECRET and NAYAPAY_SIGNING_KEY in Apps Script > Project Settings > Script Properties.
const WEBHOOK_URL = 'https://www.sasifysolutions.com/api/nayapay/email-webhook';
const SCAN_INTERVAL_MINUTES = 5;
const MIN_SCAN_GAP_MS = (SCAN_INTERVAL_MINUTES - 1) * 60 * 1000;
const MAX_THREADS_PER_SCAN = 100;

function checkNayaPayEmails() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    const now = Date.now();
    const lastScan = Number(props.getProperty('NAYAPAY_LAST_SCAN_MS') || 0);
    // The guard also protects the project if an old 1-minute trigger is still installed.
    if (lastScan && now - lastScan < MIN_SCAN_GAP_MS) return;
    props.setProperty('NAYAPAY_LAST_SCAN_MS', String(now));
    const secret = props.getProperty('WEBHOOK_SECRET');
    const signingKey = props.getProperty('NAYAPAY_SIGNING_KEY');
    if (!secret || !signingKey) throw new Error('Set WEBHOOK_SECRET and NAYAPAY_SIGNING_KEY in Script Properties.');
    const query = 'from:(nayapay) newer_than:7d {subject:("You got Rs.") subject:("You got PKR")}';
    const threads = GmailApp.search(query, 0, MAX_THREADS_PER_SCAN);
    let attempted = 0;
    if (!threads.length) return;
    // Fetch all messages in one Gmail service call instead of calling getMessages per thread.
    GmailApp.getMessagesForThreads(threads).forEach((messages) => {
      messages.forEach((message) => {
        // Keep the same marker across trigger changes so old receipts are not
        // sent again. The server also deduplicates by message and transaction ID.
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
  ScriptApp.newTrigger('checkNayaPayEmails').timeBased().everyMinutes(SCAN_INTERVAL_MINUTES).create();
}
