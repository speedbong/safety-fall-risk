-- Field Safety Hub 2.0. Apply only to the selected Supabase project.
begin;

create schema if not exists fsh_private;
revoke all on schema fsh_private from public, anon;
grant usage on schema fsh_private to authenticated;

create table if not exists public.fsh_profiles (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60)
);
create table if not exists public.fsh_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_id text not null check (site_id in ('training','project')),
  request_id uuid,
  sample_key integer,
  worker_name text not null check (char_length(worker_name) between 1 and 60),
  floor text not null check (floor in ('1F','2F','3F','4F','5F','6F')),
  sector text not null,
  hazard text not null check (hazard in ('단차','미끄러짐','정리불량','통로막힘','추락낙하','조도불량','전도넘어짐','기타')),
  detail text not null check (char_length(detail) between 5 and 2000),
  priority text not null default '일반' check (priority in ('일반','긴급')),
  status text not null default '접수' check (status in ('접수','확인','조치중','완료')),
  assignee text not null default '' check (char_length(assignee) <= 60),
  resolution_note text not null default '' check (char_length(resolution_note) <= 2000),
  photos text[] not null default '{}',
  resolution_photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  location_source text not null default 'manual' check (location_source = 'manual'),
  unique (id, owner_id),
  unique (owner_id, site_id, request_id),
  unique (owner_id, site_id, sample_key),
  check (sample_key is null or (site_id = 'training' and sample_key between 1 and 8)),
  check (cardinality(photos) <= 3 and cardinality(resolution_photos) <= 3),
  check (sector = (case floor when '1F' then 'A' when '2F' then 'B' when '3F' then 'C' when '4F' then 'D' when '5F' then 'E' when '6F' then 'G' end) || '-' || split_part(sector,'-',2)
    and split_part(sector,'-',2) ~ '^([1-9]|[12][0-9]|3[0-4])$'),
  check (status not in ('조치중','완료') or char_length(assignee) >= 1),
  check (status <> '완료' or (char_length(resolution_note) >= 5 and resolved_at is not null))
);
create index if not exists fsh_reports_owner_site_created on public.fsh_reports(owner_id,site_id,created_at desc);

create table if not exists public.fsh_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('접수','확인','조치중','완료')),
  note text not null,
  actor text not null,
  created_at timestamptz not null default now(),
  foreign key (report_id,owner_id) references public.fsh_reports(id,owner_id) on delete cascade
);
create index if not exists fsh_history_report_created on public.fsh_history(report_id,created_at);
create index if not exists fsh_history_owner on public.fsh_history(owner_id);

create table if not exists public.fsh_demo_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  site_id text not null check (site_id in ('training','project')),
  kind text not null check (kind in ('입장','퇴장','식권')),
  created_at timestamptz not null default now()
);
create index if not exists fsh_demo_owner_site_created on public.fsh_demo_logs(owner_id,site_id,created_at desc);

alter table public.fsh_profiles enable row level security;
alter table public.fsh_reports enable row level security;
alter table public.fsh_history enable row level security;
alter table public.fsh_demo_logs enable row level security;
drop policy if exists fsh_profiles_owner_read on public.fsh_profiles;
create policy fsh_profiles_owner_read on public.fsh_profiles for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists fsh_reports_owner_read on public.fsh_reports;
create policy fsh_reports_owner_read on public.fsh_reports for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists fsh_history_owner_read on public.fsh_history;
create policy fsh_history_owner_read on public.fsh_history for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists fsh_demo_owner_read on public.fsh_demo_logs;
create policy fsh_demo_owner_read on public.fsh_demo_logs for select to authenticated using (owner_id = (select auth.uid()));

-- Writes use validated transactional RPCs, never direct client table updates.
revoke all on public.fsh_profiles, public.fsh_reports, public.fsh_history, public.fsh_demo_logs from anon, authenticated;
grant select on public.fsh_profiles, public.fsh_reports, public.fsh_history, public.fsh_demo_logs to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('field-safety-photos','field-safety-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists fsh_photo_insert on storage.objects;
create policy fsh_photo_insert on storage.objects for insert to authenticated
with check (bucket_id = 'field-safety-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists fsh_photo_read on storage.objects;
create policy fsh_photo_read on storage.objects for select to authenticated
using (bucket_id = 'field-safety-photos' and (storage.foldername(name))[1] = (select auth.uid()::text));

create or replace function public.fsh_load(p_site text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); result jsonb;
begin
  if uid is null then raise sqlstate 'PT401' using message = '로그인이 필요합니다.'; end if;
  if p_site is null or p_site not in ('training','project') then raise sqlstate 'PT400' using message = '현장을 확인해 주세요.'; end if;
  select jsonb_build_object(
    'profile',coalesce((select name from public.fsh_profiles where owner_id=uid),split_part(coalesce(auth.jwt()->>'email','작업자'),'@',1)),
    'reports',coalesce((select jsonb_agg(jsonb_build_object(
      'id',r.id,'siteId',r.site_id,'workerName',r.worker_name,'floor',r.floor,'sector',r.sector,
      'hazard',r.hazard,'detail',r.detail,'priority',r.priority,'status',r.status,'assignee',r.assignee,
      'createdAt',r.created_at,'updatedAt',r.updated_at,'resolvedAt',r.resolved_at,
      'photos',r.photos,'resolutionPhotos',r.resolution_photos,'resolutionNote',r.resolution_note,
      'sample',case when r.sample_key is null then 0 else 1 end,'locationSource',r.location_source,'x',null,'y',null,
      'history',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'status',h.status,'note',h.note,'actor',h.actor,'createdAt',h.created_at) order by h.created_at,h.id)
                         from public.fsh_history h where h.report_id=r.id and h.owner_id=uid),'[]'::jsonb)
    ) order by r.created_at desc,r.id) from public.fsh_reports r where r.owner_id=uid and r.site_id=p_site),'[]'::jsonb),
    'logs',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from
      (select id,kind,created_at from public.fsh_demo_logs where owner_id=uid and site_id=p_site order by created_at desc limit 30) t),'[]'::jsonb)
  ) into result;
  return result;
end $$;

-- Privileged mutations are isolated from exposed API schemas and always scope by auth.uid().
create or replace function fsh_private.mutate(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); site text := p->>'siteId'; act text := p->>'action';
  actor_name text; row_new public.fsh_reports%rowtype; row_old public.fsh_reports%rowtype;
  rid uuid; request uuid; pics text[]; after_pics text[]; path text;
  desired text; note text; assigned text; seq text[] := array['접수','확인','조치중','완료'];
  idx integer; n integer := 0; htypes text[] := array['단차','미끄러짐','정리불량','통로막힘','추락낙하','조도불량','전도넘어짐','기타'];
begin
  if uid is null then raise sqlstate 'PT401' using message = '로그인이 필요합니다.'; end if;
  if jsonb_typeof(p) <> 'object' or site is null or site not in ('training','project') then raise sqlstate 'PT400' using message = '현장을 확인해 주세요.'; end if;
  select name into actor_name from public.fsh_profiles where owner_id=uid;
  actor_name := coalesce(actor_name,left(split_part(coalesce(auth.jwt()->>'email','작업자'),'@',1),60));
  if act = 'profile' then
    actor_name := btrim(coalesce(p->>'name',''));
    if char_length(actor_name) not between 1 and 60 then raise sqlstate 'PT400' using message = '이름은 1~60자로 입력해 주세요.'; end if;
    insert into public.fsh_profiles(owner_id,name) values(uid,actor_name) on conflict(owner_id) do update set name=excluded.name;
    return jsonb_build_object('ok',true);
  elsif act = 'create' then
    request := (p->>'requestId')::uuid;
    if request is null then raise sqlstate 'PT400' using message = '신고 요청 ID가 필요합니다.'; end if;
    -- A transaction-scoped lock serializes retries for this account and request ID.
    perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || request::text,0));
    select * into row_old from public.fsh_reports where owner_id=uid and site_id=site and request_id=request;
    if found then
      if row_old.floor is distinct from p->>'floor' or row_old.sector is distinct from p->>'sector'
        or row_old.hazard is distinct from p->>'hazard' or row_old.detail is distinct from btrim(p->>'detail')
        or row_old.priority is distinct from p->>'priority' or to_jsonb(row_old.photos) is distinct from coalesce(p->'photos','[]'::jsonb)
      then raise sqlstate 'PT409' using message = '같은 요청 ID의 신고 내용이 변경되었습니다. 저장 상태를 확인해 주세요.'; end if;
      return jsonb_build_object('id',row_old.id,'duplicate',true);
    end if;
    if jsonb_typeof(coalesce(p->'photos','[]'::jsonb)) <> 'array' then raise sqlstate 'PT400' using message = '사진 목록을 확인해 주세요.'; end if;
    pics := array(select jsonb_array_elements_text(coalesce(p->'photos','[]'::jsonb)));
    if cardinality(pics)>3 then raise sqlstate 'PT400' using message = '사진은 최대 3장입니다.'; end if;
    foreach path in array pics loop
      if path is null or split_part(path,'/',1) <> uid::text or not exists(select 1 from storage.objects where bucket_id='field-safety-photos' and name=path)
      then raise sqlstate 'PT403' using message = '본인이 업로드한 사진만 첨부할 수 있습니다.'; end if;
    end loop;
    insert into public.fsh_reports(owner_id,site_id,request_id,worker_name,floor,sector,hazard,detail,priority,photos)
    values(uid,site,request,actor_name,p->>'floor',p->>'sector',p->>'hazard',btrim(p->>'detail'),p->>'priority',pics) returning * into row_new;
    insert into public.fsh_history(report_id,owner_id,status,note,actor) values(row_new.id,uid,'접수','위험 신고 접수',actor_name);
    return jsonb_build_object('id',row_new.id);
  elsif act = 'update' then
    select * into row_old from public.fsh_reports where id=(p->>'id')::uuid and owner_id=uid and site_id=site for update;
    if not found then raise sqlstate 'PT404' using message = '신고를 찾을 수 없습니다.'; end if;
    if row_old.updated_at is distinct from (p->>'updatedAt')::timestamptz then raise sqlstate 'PT409' using message = '다른 화면에서 변경되었습니다. 다시 불러온 후 저장해 주세요.'; end if;
    if row_old.status='완료' then raise sqlstate 'PT400' using message = '완료된 신고는 수정할 수 없습니다.'; end if;
    desired:=p->>'status'; note:=btrim(coalesce(p->>'note','')); assigned:=btrim(coalesce(p->>'assignee',''));
    if desired is null or not desired=any(seq) or array_position(seq,desired) not between array_position(seq,row_old.status) and array_position(seq,row_old.status)+1
      then raise sqlstate 'PT400' using message = '접수 → 확인 → 조치중 → 완료 순서로 진행해 주세요.'; end if;
    if desired in ('조치중','완료') and assigned='' then raise sqlstate 'PT400' using message = '담당자를 입력해 주세요.'; end if;
    if char_length(assigned)>60 or char_length(note)>2000 or (desired='완료' and char_length(note)<5) then raise sqlstate 'PT400' using message = '완료 시 조치내용을 5자 이상 입력하고 글자 수를 확인해 주세요.'; end if;
    if jsonb_typeof(coalesce(p->'resolutionPhotos','[]'::jsonb)) <> 'array' then raise sqlstate 'PT400' using message = '사진 목록을 확인해 주세요.'; end if;
    after_pics := array(select jsonb_array_elements_text(coalesce(p->'resolutionPhotos','[]'::jsonb)));
    if cardinality(after_pics)>3 then raise sqlstate 'PT400' using message = '사진은 최대 3장입니다.'; end if;
    foreach path in array after_pics loop
      if path is null or split_part(path,'/',1) <> uid::text or not exists(select 1 from storage.objects where bucket_id='field-safety-photos' and name=path)
        then raise sqlstate 'PT403' using message = '본인이 업로드한 사진만 첨부할 수 있습니다.'; end if;
    end loop;
    update public.fsh_reports set status=desired,assignee=assigned,resolution_note=note,resolution_photos=after_pics,
      updated_at=greatest(clock_timestamp(),row_old.updated_at+interval '1 microsecond'),resolved_at=case when desired='완료' then now() else null end
      where id=row_old.id and owner_id=uid;
    insert into public.fsh_history(report_id,owner_id,status,note,actor) values(row_old.id,uid,desired,case when note='' then '조치 상태 변경' else note end,actor_name);
    return jsonb_build_object('id',row_old.id);
  elsif act = 'seed' then
    if site<>'training' then raise sqlstate 'PT400' using message = '샘플은 실습 현장에서만 추가할 수 있습니다.'; end if;
    for idx in 1..8 loop
      rid:=null;
      insert into public.fsh_reports(owner_id,site_id,sample_key,worker_name,floor,sector,hazard,detail,priority)
      values(uid,site,idx,'샘플 작업자','6F','G-'||(case when idx<=3 then 18 when idx<=5 then 23 else idx+20 end),htypes[idx],
        (array['통로 단차로 발이 걸릴 위험이 있습니다.','바닥에 물기가 남아 미끄러질 수 있습니다.','폐자재가 통로 주변에 쌓여 있습니다.','자재가 이동 통로를 가로막고 있습니다.','상부 자재 낙하 위험을 확인해 주세요.','통로 조명이 어두워 바닥 확인이 어렵습니다.','연장선과 자재에 발이 걸릴 수 있습니다.','현장 상태 점검이 필요한 구역입니다.'])[idx],
        case when idx in (4,5) then '긴급' else '일반' end)
      on conflict(owner_id,site_id,sample_key) do nothing returning id into rid;
      if rid is not null then
        n:=n+1;
        insert into public.fsh_history(report_id,owner_id,status,note,actor) values(rid,uid,'접수','실습용 샘플 신고','샘플 작업자');
      end if;
    end loop;
    return jsonb_build_object('ok',true,'added',n);
  elsif act = 'clearSamples' then
    delete from public.fsh_reports where owner_id=uid and site_id=site and sample_key is not null;
    get diagnostics n = row_count;
    return jsonb_build_object('ok',true,'deleted',n);
  elsif act = 'demoLog' then
    if coalesce(p->>'kind','') not in ('입장','퇴장','식권') then raise sqlstate 'PT400' using message = '기록 유형을 확인해 주세요.'; end if;
    insert into public.fsh_demo_logs(owner_id,site_id,kind) values(uid,site,p->>'kind');
    return jsonb_build_object('ok',true);
  end if;
  raise sqlstate 'PT400' using message = '지원하지 않는 요청입니다.';
end $$;

create or replace function public.fsh_mutate(p jsonb)
returns jsonb language sql security invoker set search_path = '' as $$ select fsh_private.mutate(p); $$;

revoke all on function public.fsh_load(text) from public, anon;
revoke all on function public.fsh_mutate(jsonb) from public, anon;
revoke all on function fsh_private.mutate(jsonb) from public, anon;
grant execute on function public.fsh_load(text), public.fsh_mutate(jsonb), fsh_private.mutate(jsonb) to authenticated;

commit;
