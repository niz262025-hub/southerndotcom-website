import { serverServiceKey } from './service-key.js';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

// Sandbox only. The host is a constant so live ToyyibPay cannot be reached by configuration.
const SANDBOX = 'https://dev.toyyibpay.com';
// Only these plans can be purchased. Two-app (RM49), all-app (RM79) and Business plans are
// proposed and stay disabled here and in the database until the owner approves them.
const PLANS = ['founders_lifetime', 'single_app_monthly'];
const SLUG = /^[a-z0-9_]{1,32}$/;
const REF = /^MYOPS-[A-Za-z0-9_-]{8,64}$/;
const BILL = /^[A-Za-z0-9]{4,32}$/;
const SAFE_TEXT = /^[A-Za-z0-9._:@ -]{1,64}$/;

export const founderEventKey = ({ billcode, order_id: orderId, refno, status }) =>
  createHash('sha256').update([billcode, orderId, refno, status].join('|')).digest('hex');

const safeEqualHex = (a, b) => {
  const left = Buffer.from(String(a).toLowerCase());
  const right = Buffer.from(String(b).toLowerCase());
  return left.length === right.length && timingSafeEqual(left, right);
};

const toCents = (value) => {
  const text = String(value ?? '').trim();
  return /^\d{1,7}(\.\d{1,2})?$/.test(text) ? Math.round(Number(text) * 100) : null;
};

export function createPayments({ env, transport, adminFactory, project }) {
  const gatewayConfigured = () => Boolean(env.TOYYIBPAY_SANDBOX_SECRET_KEY && /^[A-Za-z0-9]{4,40}$/.test(env.TOYYIBPAY_SANDBOX_CATEGORY_CODE || ''));
  const adminKey = () => serverServiceKey(env.MYOPS_SERVICE_ROLE_KEY, project);
  const admin = () => {
    const key = adminKey();
    return key ? adminFactory(project, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  };
  const rpc = async (client, name, args) => {
    const { data, error } = await client.rpc(name, args);
    if (error) throw new Error('rpc_failed');
    return data;
  };

  async function gatewayForm(path, fields) {
    let response;
    try {
    response = await transport(`${SANDBOX}/index.php/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString(),
      signal: AbortSignal.timeout(8000),
    });
    } catch (error) {
      const code = error?.cause?.code;
      if (['ETIMEDOUT','ENOTFOUND','ECONNRESET','ECONNREFUSED','UND_ERR_CONNECT_TIMEOUT'].includes(code)) throw new Error('gateway_' + code);
      throw new Error(error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'gateway_timeout' : 'gateway_network');
    }
    if (!response.ok) throw new Error('gateway_http_' + response.status);
    try { return await response.json(); } catch { throw new Error('gateway_invalid_json'); }
  }

  async function createBill({ orderRef, origin, cents, name }) {
    const result = await gatewayForm('createBill', {
      userSecretKey: env.TOYYIBPAY_SANDBOX_SECRET_KEY,
      categoryCode: env.TOYYIBPAY_SANDBOX_CATEGORY_CODE,
      billName: name,
      billDescription: `${name} sandbox`,
      billPriceSetting: '1',
      billPayorInfo: '0',
      billAmount: String(cents),
      billReturnUrl: `${origin}/?payment=return`,
      billCallbackUrl: `${origin}/api/toyyibpay-callback`,
      billExternalReferenceNo: orderRef,
      billTo: 'MYOPS customer',
      billEmail: 'sandbox@example.invalid',
      billPhone: '0000000000',
      billPaymentChannel: '2',
    });
    const code = Array.isArray(result) ? result[0]?.BillCode : null;
    if (typeof code !== 'string' || !BILL.test(code)) {
      // Never log provider bodies: they can echo credentials or payer details.
      const msg = typeof result?.msg === 'string' ? result.msg : '';
      const field = ['userSecretKey','categoryCode','billName','billDescription','billEmail','billPhone','billAmount','billPaymentChannel'].find(key => msg.startsWith(key + ' '));
      throw new Error(field ? 'gateway_field_' + field : 'gateway_bill');
    }
    return code;
  }

  // Independent server-to-server confirmation: a callback alone never grants anything.
  async function confirmPaid({ billCode, orderRef }) {
    const rows = await gatewayForm('getBillTransactions', {
      billCode, billpaymentStatus: '1',
    });
    if (!Array.isArray(rows)) throw new Error('gateway_shape');
    const row = rows.find((item) => item?.billExternalReferenceNo === orderRef && String(item?.billpaymentStatus) === '1');
    if (!row) return null;
    const cents = toCents(row.billpaymentAmount);
    const ref = typeof row.billpaymentInvoiceNo === 'string' && SAFE_TEXT.test(row.billpaymentInvoiceNo) ? row.billpaymentInvoiceNo : null;
    return { cents, ref };
  }

  // Insert-only server-owned profile; failure never blocks signup and never edits an existing type.
  async function provisionProfile({ userId, displayName, accountType }) {
    const client = admin();
    if (!client || typeof userId !== 'string') return false;
    try {
      await rpc(client, 'myops_provision_profile', { p_user_id: userId, p_display_name: displayName, p_account_type: accountType });
      return true;
    } catch { return false; }
  }

  async function founders() {
    const client = admin();
    if (!client) return { available: false };
    const status = await rpc(client, 'myops_founders_status', {});
    return { capacity: status.capacity, allocated: status.allocated, remaining: status.remaining, available: status.remaining > 0 };
  }

  async function checkout({ userId, plan, product, origin }) {
    const client = admin();
    if (!client || !gatewayConfigured()) return { status: 503, body: { error: 'Sandbox checkout is not configured for this Preview.' } };
    if (!PLANS.includes(plan)) return { status: 403, body: { error: 'This plan is not available yet.' } };
    if ((plan === 'single_app_monthly') !== (product !== undefined && product !== null)
        || (product !== undefined && product !== null && !(typeof product === 'string' && SLUG.test(product)))) {
      return { status: 400, body: { error: plan === 'single_app_monthly' ? 'Select one application.' : 'Invalid request.' } };
    }
    const ref = `MYOPS-${randomBytes(12).toString('base64url')}`;
    const created = await rpc(client, 'myops_create_payment', { p_user_id: userId, p_plan: plan, p_product_slug: product ?? null, p_order_ref: ref, p_reservation_minutes: 30 });
    const refused = {
      unconfirmed_user: [403, 'Confirm your email before purchasing.'],
      already_lifetime: [409, 'You already have lifetime access.'],
      sold_out: [409, 'All Founders 100 places are taken.'],
      reserved_out: [409, 'Remaining Founders 100 places are temporarily reserved. Try again shortly.'],
      founders_available: [409, 'Founders 100 places are still available.'],
      not_eligible: [403, 'Founders 100 and single-app plans are available to verified Individual accounts only.'],
      plan_disabled: [403, 'This plan is not available yet.'],
      invalid_product: [400, 'Select an available application.'],
    }[created.status];
    if (refused) return { status: refused[0], body: { error: refused[1] } };
    if (!['created', 'existing'].includes(created.status) || !REF.test(created.order_ref || '')
        || !Number.isInteger(created.amount_cents) || created.amount_cents <= 0) throw new Error('rpc_shape');
    let billCode = created.bill_code;
    if (!billCode) {
      try {
        billCode = await createBill({ orderRef: created.order_ref, origin, cents: created.amount_cents,
          name: plan === 'founders_lifetime' ? 'MYOPS Founders 100' : 'MYOPS single app' });
      } catch (error) {
        const reason = error instanceof Error && /^(gateway_(timeout|network|invalid_json|ETIMEDOUT|ENOTFOUND|ECONNRESET|ECONNREFUSED|UND_ERR_CONNECT_TIMEOUT|http_[1-5][0-9]{2})|gateway_bill|gateway_field_(userSecretKey|categoryCode|billName|billDescription|billEmail|billPhone|billAmount|billPaymentChannel))$/.test(error.message) ? error.message : 'gateway_transport';
        console.error('myops_sandbox_checkout_failed', reason);
        await rpc(client, 'myops_abort_checkout', { p_order_ref: created.order_ref });
        return { status: 502, body: { error: 'Payment gateway is unavailable. Try again later.' } };
      }
      const attached = await rpc(client, 'myops_attach_bill', { p_order_ref: created.order_ref, p_bill_code: billCode });
      if (!attached) return { status: 502, body: { error: 'Checkout could not be started. Try again.' } };
    }
    if (!BILL.test(billCode)) throw new Error('bill_shape');
    return { status: 200, body: { next: `${SANDBOX}/${billCode}` } };
  }

  async function audit({ userId }) {
    const ids = String(env.MYOPS_ADMIN_USER_IDS || '').split(',').map((id) => id.trim()).filter(Boolean);
    if (!ids.includes(userId)) return { status: 403, body: { error: 'Not authorised.' } };
    const client = admin();
    if (!client) return { status: 503, body: { error: 'Audit is not configured.' } };
    return { status: 200, body: await rpc(client, 'myops_admin_audit', { p_limit: 200 }) };
  }

  // Webhook entry. Returns { status, body }; 5xx makes the gateway retry.
  async function callback(fields) {
    const client = admin();
    if (!client || !gatewayConfigured()) return { status: 503, body: { error: 'not_configured' } };
    const f = {};
    for (const key of ['refno', 'status', 'reason', 'billcode', 'order_id', 'amount', 'transaction_id', 'hash']) {
      const value = fields?.[key];
      if (value !== undefined && (typeof value !== 'string' || value.length > 200)) return { status: 400, body: { error: 'invalid' } };
      f[key] = value;
    }
    if (!['1', '2', '3'].includes(f.status) || !REF.test(f.order_id || '') || !BILL.test(f.billcode || '')) {
      return { status: 400, body: { error: 'invalid' } };
    }
    const expected = createHash('md5').update(`${env.TOYYIBPAY_SANDBOX_SECRET_KEY}${f.status}${f.order_id}${f.refno ?? ''}ok`).digest('hex');
    const hashOk = typeof f.hash === 'string' && safeEqualHex(expected, f.hash);
    // A supplied hash must match. Failure/cancel is only accepted with a valid hash; success
    // is additionally confirmed with the gateway API below.
    if (f.hash !== undefined && !hashOk) return { status: 400, body: { error: 'invalid' } };
    if (f.status === '2') return { status: 200, body: { status: 'pending_ignored' } };
    if (f.status === '3' && !hashOk) return { status: 400, body: { error: 'invalid' } };

    const payment = await rpc(client, 'myops_get_payment', { p_order_ref: f.order_id });
    if (!payment || payment.gateway_bill_code !== f.billcode) return { status: 400, body: { error: 'invalid' } };

    const key = founderEventKey(f);
    let outcome = 'failed';
    let cents = 0;
    let txn = f.transaction_id && SAFE_TEXT.test(f.transaction_id) ? f.transaction_id : `${f.order_id}`;
    if (f.status === '3') {
      if (/cancel/i.test(f.reason || '')) outcome = 'canceled';
    } else {
      let paid;
      try {
        paid = await confirmPaid({ billCode: f.billcode, orderRef: f.order_id });
      } catch {
        return { status: 502, body: { error: 'verification_unavailable' } };
      }
      if (!paid || paid.cents === null) return { status: 400, body: { error: 'unverified' } };
      outcome = 'succeeded';
      cents = paid.cents;
      if (paid.ref) txn = paid.ref;
    }
    const result = await rpc(client, 'myops_settle_payment', {
      p_order_ref: f.order_id, p_bill_code: f.billcode, p_txn_ref: txn, p_amount_cents: cents, p_outcome: outcome, p_event_key: key,
    });
    const ok = ['settled', 'already_settled', 'failed', 'canceled'].includes(result.status);
    return { status: ok ? 200 : 400, body: { status: result.status } };
  }

  async function reconcile({ userId }) {
    if (env.VERCEL_ENV !== 'preview') return {status:404,body:{error:'Preview-only.'}};
    const client = admin();
    if (!client || !gatewayConfigured()) return {status:503,body:{error:'Sandbox checkout is not configured.'}};
    const {data:payment,error} = await client.from('myops_payments')
      .select('order_ref,gateway_bill_code,status').eq('user_id',userId)
      .eq('gateway','toyyibpay_sandbox').eq('status','pending')
      .order('created_at',{ascending:false}).limit(1).maybeSingle();
    if(error) return {status:503,body:{error:'Payment could not be checked.'}};
    if(!payment?.gateway_bill_code) return {status:200,body:{message:'No pending sandbox payment found.'}};
    // Browser return parameters cannot grant access. Reuse independent gateway verification.
    const result = await callback({status:'1',order_id:payment.order_ref,billcode:payment.gateway_bill_code});
    return {status:result.status,body:result.status===200
      ?{message:'Sandbox payment verified. Refresh your account to view access.'}
      :{error:'Payment is not verified yet. Please try again later.'}};
  }
  return { founders, checkout, audit, callback, provisionProfile, reconcile };
}
