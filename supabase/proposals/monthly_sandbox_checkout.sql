-- Staging proposal only. No live charges: these functions accept sandbox orders only.
begin;
alter table public.myops_payments add column if not exists selected_products text[];
insert into public.myops_plans(code,audience,price_cents,billing,app_limit,enabled) values
 ('single_monthly','individual',1990,'monthly',1,true),
 ('duo_monthly','individual',2990,'monthly',2,true),
 ('complete_monthly','individual',3990,'monthly',3,true)
on conflict(code) do nothing;
create or replace function public.myops_create_monthly_payment(p_user_id uuid,p_plan text,p_products text[],p_order_ref text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_amount integer; v_count integer; v_products text[]; v_pay public.myops_payments;
begin
 perform pg_advisory_xact_lock(730500100);
 select case p_plan when 'single_monthly' then 1990 when 'duo_monthly' then 2990 when 'complete_monthly' then 3990 end,
 case p_plan when 'single_monthly' then 1 when 'duo_monthly' then 2 when 'complete_monthly' then 3 end into v_amount,v_count;
 if v_amount is null then return jsonb_build_object('status','plan_disabled'); end if;
 if not exists(select 1 from auth.users where id=p_user_id and email_confirmed_at is not null) then return jsonb_build_object('status','unconfirmed_user'); end if;
 if not exists(select 1 from public.myops_profiles where user_id=p_user_id) then return jsonb_build_object('status','not_eligible'); end if;
 if p_products is null or cardinality(p_products)<>v_count or exists(select 1 from unnest(p_products) p where p is null or p not in ('opsfinance','opsflow','opsp')) then return jsonb_build_object('status','invalid_product'); end if;
 select array_agg(distinct p order by p) into v_products from unnest(p_products) p;
 if cardinality(v_products)<>v_count or exists(select 1 from unnest(v_products) p where not exists(select 1 from public.myops_products where slug=p and launch_status='live')) then return jsonb_build_object('status','invalid_product'); end if;
 if exists(select 1 from public.myops_lifetime_entitlements where user_id=p_user_id and status='active') then return jsonb_build_object('status','already_lifetime'); end if;
 update public.myops_payments set status='expired',updated_at=now() where user_id=p_user_id and status='pending' and plan=p_plan and created_at<now()-interval '24 hours';
 select * into v_pay from public.myops_payments where user_id=p_user_id and plan=p_plan and status='pending' for update;
 if found then
  if v_pay.gateway<>'toyyibpay_sandbox' or v_pay.selected_products is distinct from v_products then return jsonb_build_object('status','selection_conflict'); end if;
  return jsonb_build_object('status','existing','order_ref',v_pay.order_ref,'bill_code',v_pay.gateway_bill_code,'amount_cents',v_pay.amount_cents,'gateway',v_pay.gateway);
 end if;
 insert into public.myops_payments(order_ref,user_id,plan,amount_cents,gateway,selected_products) values(p_order_ref,p_user_id,p_plan,v_amount,'toyyibpay_sandbox',v_products);
 return jsonb_build_object('status','created','order_ref',p_order_ref,'amount_cents',v_amount,'gateway','toyyibpay_sandbox');
end $$;
create or replace function public.myops_settle_monthly_payment(p_order_ref text,p_bill_code text,p_txn_ref text,p_amount_cents integer,p_outcome text,p_event_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_pay public.myops_payments; v_product text; v_result text;
begin
 if p_outcome not in ('succeeded','failed','canceled') or p_outcome is null then raise exception 'invalid outcome'; end if;
 perform pg_advisory_xact_lock(730500100);
 select * into v_pay from public.myops_payments where order_ref=p_order_ref for update;
 if not found then return jsonb_build_object('status','unknown_order'); end if;
 if v_pay.gateway<>'toyyibpay_sandbox' or v_pay.plan not in ('single_monthly','duo_monthly','complete_monthly') then return jsonb_build_object('status','gateway_mismatch'); end if;
 if v_pay.gateway_bill_code is distinct from p_bill_code then return jsonb_build_object('status','bill_mismatch'); end if;
 if v_pay.status='succeeded' then return jsonb_build_object('status','already_settled'); end if;
 if v_pay.status<>'pending' then return jsonb_build_object('status','terminal_order'); end if;
 if p_outcome='succeeded' and p_amount_cents is distinct from v_pay.amount_cents then return jsonb_build_object('status','amount_mismatch'); end if;
 insert into public.myops_payment_events(event_key,order_ref,bill_code,verified_outcome) values(p_event_key,p_order_ref,p_bill_code,p_outcome) on conflict(event_key) do nothing;
 if not found then return jsonb_build_object('status','event_conflict'); end if;
 if p_outcome='succeeded' then
  foreach v_product in array v_pay.selected_products loop
   perform public.myops_grant_month(v_pay.user_id,v_product,p_txn_ref);
  end loop;
  update public.myops_payments set status='succeeded',outcome='subscription_granted',gateway_txn_ref=p_txn_ref,confirmed_at=now(),updated_at=now() where id=v_pay.id;
  v_result:='settled';
 else
  update public.myops_payments set status=p_outcome,updated_at=now() where id=v_pay.id;
  v_result:=p_outcome;
 end if;
 update public.myops_payment_events set result=v_result where event_key=p_event_key;
 return jsonb_build_object('status',v_result);
end $$;
revoke all on function public.myops_create_monthly_payment(uuid,text,text[],text),public.myops_settle_monthly_payment(text,text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.myops_create_monthly_payment(uuid,text,text[],text),public.myops_settle_monthly_payment(text,text,text,integer,text,text) to service_role;
commit;
