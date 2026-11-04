-- PROPOSAL ONLY. Apply only to the central PRODUCTION project after review.
-- Never run on staging. Existing sandbox orders remain sandbox and cannot settle as live.
begin;
alter table public.myops_payments drop constraint if exists myops_payments_gateway_check;
alter table public.myops_payments add constraint myops_payments_gateway_check
  check (gateway in ('toyyibpay_sandbox', 'toyyibpay_live'));
alter table public.myops_payments alter column gateway set default 'toyyibpay_live';
create or replace function public.myops_create_payment(
  p_user_id uuid, p_plan text, p_product_slug text, p_order_ref text, p_reservation_minutes integer default 30)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_alloc integer; v_res integer; v_existing public.myops_payments; v_plan public.myops_plans;
begin
  perform pg_advisory_xact_lock(730500100);
  select * into v_plan from public.myops_plans where code = p_plan;
  if not found then raise exception 'invalid plan' using errcode = '22023'; end if;
  -- Proposed plans (two-app, all-app, Business) are disabled until the owner approves them.
  if not v_plan.enabled then return jsonb_build_object('status', 'plan_disabled'); end if;
  if not exists (select 1 from auth.users where id = p_user_id and email_confirmed_at is not null) then
    return jsonb_build_object('status', 'unconfirmed_user');
  end if;
  -- Eligibility uses the server-owned profile, never user-editable auth metadata.
  if not exists (select 1 from public.myops_profiles where user_id = p_user_id and account_type = 'personal') then
    return jsonb_build_object('status', 'not_eligible');
  end if;
  if (p_plan = 'single_app_monthly') <> (p_product_slug is not null) then
    raise exception 'invalid product' using errcode = '22023';
  end if;
  if p_product_slug is not null and not exists (
       select 1 from public.myops_products where slug = p_product_slug and launch_status = 'live') then
    return jsonb_build_object('status', 'invalid_product');
  end if;
  if exists (select 1 from public.myops_lifetime_entitlements where user_id = p_user_id and status = 'active')
     or exists (select 1 from public.myops_founder_allocations where user_id = p_user_id) then
    return jsonb_build_object('status', 'already_lifetime');
  end if;
  -- Release stale reservations/checkouts for this customer.
  update public.myops_payments set status = 'expired', updated_at = now()
   where user_id = p_user_id and status = 'pending'
     and ((reserved_until is not null and reserved_until <= now())
          or (reserved_until is null and created_at < now() - interval '24 hours'));
  select * into v_existing from public.myops_payments
   where user_id = p_user_id and plan = p_plan and coalesce(product_slug, '') = coalesce(p_product_slug, '')
     and status = 'pending';
  if found then
    if v_existing.gateway <> 'toyyibpay_live' then return jsonb_build_object('status', 'gateway_mismatch'); end if;
    return jsonb_build_object('status', 'existing', 'order_ref', v_existing.order_ref,
      'bill_code', v_existing.gateway_bill_code, 'amount_cents', v_existing.amount_cents, 'gateway', v_existing.gateway);
  end if;
  select count(*) into v_alloc from public.myops_founder_allocations;
  select count(*) into v_res from public.myops_payments
   where plan = 'founders_lifetime' and status = 'pending' and reserved_until > now();
  if p_plan = 'founders_lifetime' then
    if v_alloc + v_res >= 100 then
      return jsonb_build_object('status', case when v_alloc >= 100 then 'sold_out' else 'reserved_out' end);
    end if;
    insert into public.myops_payments (order_ref, user_id, plan, amount_cents, reserved_until)
    values (p_order_ref, p_user_id, p_plan, v_plan.price_cents,
            now() + make_interval(mins => least(greatest(p_reservation_minutes, 5), 60)));
  else
    -- The RM29/month single-app plan is offered only from customer 101 onward.
    if v_alloc < 100 then return jsonb_build_object('status', 'founders_available'); end if;
    insert into public.myops_payments (order_ref, user_id, plan, product_slug, amount_cents)
    values (p_order_ref, p_user_id, p_plan, p_product_slug, v_plan.price_cents);
  end if;
  return jsonb_build_object('status', 'created', 'order_ref', p_order_ref, 'amount_cents', v_plan.price_cents, 'gateway', 'toyyibpay_live');
end $$;


commit;
