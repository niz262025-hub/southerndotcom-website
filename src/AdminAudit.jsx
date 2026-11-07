import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { authRequest } from './authRequest';

const short = (value) => (value ? `${String(value).slice(0, 8)}…` : '—');
const time = (value) => (value ? new Date(value).toISOString().replace('T', ' ').slice(0, 19) : '—');

function Table({ title, rows, columns }) {
  return (
    <section>
      <h2>{title} ({rows.length})</h2>
      <div className="audit-scroll">
        <table className="audit-table">
          <thead><tr>{columns.map(([label]) => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.order_ref || row.id || row.slot_number || index}>
                {columns.map(([label, render]) => <td key={label}>{render(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

Table.propTypes = {
  title: PropTypes.string.isRequired,
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  columns: PropTypes.arrayOf(PropTypes.array).isRequired,
};

// Read-only. The server rejects non-admins; hiding this page is not the control.
export function AdminAudit() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('Loading…');
  useEffect(() => {
    authRequest('admin_audit').then((result) => { setData(result); setMessage(''); })
      .catch((error) => setMessage(error.status === 401 ? 'Sign in with an administrator account.' : error.message));
  }, []);
  return (
    <section className="content-section">
      <div className="container">
        <h1>MYOPS Admin — Payments & Income</h1>
        {message && <p role="status">{message}</p>}
        {data && (
          <>
            {data.founders && <p>Allocated {data.founders.allocated} of {data.founders.capacity} · reserved {data.founders.reserved} · remaining {data.founders.remaining}</p>}
            <p>Showing the latest 200 payment records. Bundle payments are shown separately and are not counted again under individual apps. {data.environment === 'production' ? 'Live records. Revenue excludes unpaid and failed payments.' : 'Preview records are sandbox data.'}</p>
            <Table title="Income by app / bundle (shown payments only)" rows={Object.values(data.payments.filter(r => r.status === 'succeeded').reduce((result, r) => { const key = (r.product_slug || 'Bundle / all apps') + ':' + r.currency; const row = result[key] || { app: r.product_slug || 'Bundle / all apps', currency: r.currency, cents: 0, count: 0 }; row.cents += Number(r.amount_cents) || 0; row.count += 1; result[key] = row; return result; }, {}))} columns={[
              ['App / package', r => r.app], ['Currency', r => r.currency], ['Income', r => (r.cents / 100).toFixed(2)], ['Payments', r => r.count]]} />
            {data.subscriptions && <Table title="Subscriptions (latest 200)" rows={data.subscriptions} columns={[
              ['User / company', r => short(r.personal_user_id || r.organization_id)], ['App / bundle', r => r.is_complete_bundle ? 'All apps' : r.product_slug], ['Status', r => r.status === 'active' && r.current_period_end && Date.parse(r.current_period_end) <= Date.now() ? 'expired' : r.status], ['Renewal', r => r.renewal_mode], ['Period end', r => time(r.current_period_end)]]} />}
            <Table title="Payments" rows={data.payments} columns={[
              ['Order', (r) => r.order_ref], ['User', (r) => short(r.user_id)], ['Plan', (r) => r.plan], ['App', (r) => r.product_slug || 'Bundle / all apps'], ['Amount', (r) => Number.isFinite(r.amount_cents) ? `${r.currency || 'MYR'} ${(r.amount_cents / 100).toFixed(2)}` : '—'],
              ['Status', (r) => r.status], ['Outcome', (r) => r.outcome || '—'], ['Created', (r) => time(r.created_at)], ['Confirmed', (r) => time(r.confirmed_at)]]} />
            <Table title="Founder allocations" rows={data.allocations} columns={[
              ['Slot', (r) => r.slot_number], ['User', (r) => short(r.user_id)], ['Payment', (r) => short(r.payment_id)], ['Allocated', (r) => time(r.allocated_at)]]} />
            <Table title="Lifetime entitlements" rows={data.entitlements} columns={[
              ['User', (r) => short(r.user_id)], ['Scope', (r) => r.scope], ['Source', (r) => r.source], ['Status', (r) => r.status], ['Granted', (r) => time(r.granted_at)]]} />
            <Table title="Webhook events" rows={data.events} columns={[
              ['Order', (r) => r.order_ref], ['Verified outcome', (r) => r.verified_outcome], ['Result', (r) => r.result || '—'],
              ['Duplicates', (r) => r.duplicate_count], ['Last seen', (r) => time(r.last_seen_at)]]} />
          </>
        )}
      </div>
    </section>
  );
}
