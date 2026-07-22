-- ============================================================================
-- Automação Dinâmica de Leads — Schema Supabase (projeto dashboards-odontologicos)
-- Idempotente: pode rodar várias vezes. Cole no SQL Editor e execute.
-- ============================================================================

-- Schema dedicado (não mistura com os dashboards)
create schema if not exists automacao;

-- ----------------------------------------------------------------------------
-- Tabela: clinicas (1 linha por empresa Helena)
-- ----------------------------------------------------------------------------
create table if not exists automacao.clinicas (
  id                uuid primary key default gen_random_uuid(),
  helena_company_id uuid not null unique,
  nome              text not null,
  helena_token      text not null,
  panel_id          uuid not null,
  step_id           uuid not null,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table automacao.clinicas is 'Config por clínica para a automação de leads (Helena/WTS).';
comment on column automacao.clinicas.helena_company_id is 'companyId vindo no webhook da Helena; chave de busca.';
comment on column automacao.clinicas.helena_token is 'Bearer token da API Helena da clínica. Acesso só via service_role.';

-- ----------------------------------------------------------------------------
-- Tabela: origem_etiquetas (clínica x origem)
-- ----------------------------------------------------------------------------
create table if not exists automacao.origem_etiquetas (
  id             uuid primary key default gen_random_uuid(),
  clinica_id     uuid not null references automacao.clinicas(id) on delete cascade,
  origem         text not null check (origem in ('FACEBOOK','INSTAGRAM','ORGANICO')),
  tag_nome       text,
  panel_tag_id   uuid,
  contact_tag_id uuid,
  status         text not null default 'ok' check (status in ('ok','pendente')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (clinica_id, origem)
);

comment on table automacao.origem_etiquetas is 'Mapeamento de etiquetas (card + contato) por origem, por clínica.';
comment on column automacao.origem_etiquetas.panel_tag_id is 'tagId da etiqueta no CRM (card).';
comment on column automacao.origem_etiquetas.contact_tag_id is 'tagId da etiqueta de contato (Core Helena).';
comment on column automacao.origem_etiquetas.status is 'pendente = onboarding não conseguiu resolver, exige revisão manual.';

create index if not exists idx_origem_etiquetas_clinica on automacao.origem_etiquetas(clinica_id);

-- ----------------------------------------------------------------------------
-- Trigger de updated_at
-- ----------------------------------------------------------------------------
create or replace function automacao.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clinicas_updated_at on automacao.clinicas;
create trigger trg_clinicas_updated_at
  before update on automacao.clinicas
  for each row execute function automacao.set_updated_at();

drop trigger if exists trg_origem_etiquetas_updated_at on automacao.origem_etiquetas;
create trigger trg_origem_etiquetas_updated_at
  before update on automacao.origem_etiquetas
  for each row execute function automacao.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS: bloqueia tudo; só service_role acessa (via bypass automático)
-- ----------------------------------------------------------------------------
alter table automacao.clinicas enable row level security;
alter table automacao.origem_etiquetas enable row level security;

-- ============================================================================
-- RPCs internas (lógica em automacao.*)
-- ============================================================================

-- get_config_clinica: usada pelo Workflow 1 (runtime).
-- Retorna NULL se a clínica não existir ou estiver inativa => guarda no n8n.
create or replace function automacao.get_config_clinica(p_company_id uuid)
returns json language sql security definer
set search_path = automacao, public as $$
  select case when c.id is null then null else
    json_build_object(
      'clinica', json_build_object(
        'id', c.id, 'helena_company_id', c.helena_company_id, 'nome', c.nome,
        'helena_token', c.helena_token, 'panel_id', c.panel_id,
        'step_id', c.step_id, 'ativo', c.ativo
      ),
      'origens', coalesce((
        select json_object_agg(o.origem, json_build_object(
          'tag_nome', o.tag_nome, 'panel_tag_id', o.panel_tag_id,
          'contact_tag_id', o.contact_tag_id, 'status', o.status
        ))
        from automacao.origem_etiquetas o
        where o.clinica_id = c.id
      ), '{}'::json)
    )
  end
  from (select * from automacao.clinicas where helena_company_id = p_company_id and ativo = true) c
$$;

comment on function automacao.get_config_clinica(uuid) is 'Config completa da clínica (clinica + origens) ou NULL se inexistente/inativa.';

-- upsert_config_clinica: usada pelo Workflow 2 (onboarding).
create or replace function automacao.upsert_config_clinica(p_payload json)
returns uuid language plpgsql security definer
set search_path = automacao, public as $$
declare
  v_clinica_id uuid;
  v_origem json;
begin
  insert into automacao.clinicas as c
    (helena_company_id, nome, helena_token, panel_id, step_id, ativo)
  values (
    (p_payload->>'helena_company_id')::uuid,
    coalesce(p_payload->>'nome', 'Sem nome'),
    p_payload->>'helena_token',
    (p_payload->>'panel_id')::uuid,
    (p_payload->>'step_id')::uuid,
    coalesce((p_payload->>'ativo')::boolean, true)
  )
  on conflict (helena_company_id) do update set
    nome = excluded.nome, helena_token = excluded.helena_token,
    panel_id = excluded.panel_id, step_id = excluded.step_id, ativo = excluded.ativo
  returning c.id into v_clinica_id;

  if json_typeof(p_payload->'origens') = 'array' then
    for v_origem in select * from json_array_elements(p_payload->'origens')
    loop
      insert into automacao.origem_etiquetas as o
        (clinica_id, origem, tag_nome, panel_tag_id, contact_tag_id, status)
      values (
        v_clinica_id, v_origem->>'origem', v_origem->>'tag_nome',
        nullif(v_origem->>'panel_tag_id','')::uuid,
        nullif(v_origem->>'contact_tag_id','')::uuid,
        coalesce(v_origem->>'status','ok')
      )
      on conflict (clinica_id, origem) do update set
        tag_nome = excluded.tag_nome, panel_tag_id = excluded.panel_tag_id,
        contact_tag_id = excluded.contact_tag_id, status = excluded.status;
    end loop;
  end if;

  return v_clinica_id;
end;
$$;

comment on function automacao.upsert_config_clinica(json) is 'Upsert de clínica + origens. Usado pelo onboarding.';

-- ============================================================================
-- Wrappers em public (necessários p/ o n8n alcançar via PostgREST /rest/v1/rpc)
-- ============================================================================
create or replace function public.get_config_clinica(p_company_id uuid)
returns json language sql security definer
set search_path = public, automacao as $$
  select automacao.get_config_clinica(p_company_id);
$$;

create or replace function public.upsert_config_clinica(p_payload json)
returns uuid language sql security definer
set search_path = public, automacao as $$
  select automacao.upsert_config_clinica(p_payload);
$$;

-- Execução só pelo service_role (a get expõe o token).
-- IMPORTANTE: toda função nasce com EXECUTE para PUBLIC => revogar de PUBLIC,
-- senão a chave anon consegue ler o token. Revogar também explicitamente
-- de anon/authenticated e das funções internas (defesa em profundidade).
revoke execute on function public.get_config_clinica(uuid) from public, anon, authenticated;
revoke execute on function public.upsert_config_clinica(json) from public, anon, authenticated;
revoke execute on function automacao.get_config_clinica(uuid) from public, anon, authenticated;
revoke execute on function automacao.upsert_config_clinica(json) from public, anon, authenticated;
grant execute on function public.get_config_clinica(uuid) to service_role;
grant execute on function public.upsert_config_clinica(json) to service_role;

-- ============================================================================
-- SEED da ATOS (idempotente — já aplicado, deixe para recriar em outro ambiente)
-- ============================================================================
select public.upsert_config_clinica('{
  "helena_company_id": "79a15d58-9d7b-4420-a75e-985267e9c8ed",
  "nome": "Atos Odontologia",
  "helena_token": "pn_7PEG91xSt3kCPnqplUOu52ww9nDjNAlr5lbuUkYdI",
  "panel_id": "3b98f0bf-fea4-47b7-a922-2f3981220722",
  "step_id": "6f418246-8f5a-4c7e-a63b-31e177deed25",
  "ativo": true,
  "origens": [
    {"origem":"FACEBOOK","tag_nome":"Facebook","panel_tag_id":"fb7781a8-9e21-4241-a7d7-ee8e82ffbf6c","contact_tag_id":"0a6eca24-bf61-4dc6-b607-9b35db4e7cfc","status":"ok"},
    {"origem":"INSTAGRAM","tag_nome":"Instagram","panel_tag_id":"9dd2d9ca-41d5-4f67-b445-2dc73efe6b2b","contact_tag_id":"ec81194d-5d4a-4d03-b954-2bb9cab71069","status":"ok"},
    {"origem":"ORGANICO","tag_nome":"Orgânico","panel_tag_id":"5c74d4d0-8222-4f2f-999b-f60a96bed915","contact_tag_id":"28a025a3-3cf1-4b17-b91c-016e21b96477","status":"ok"}
  ]
}'::json);

-- Verificação rápida:
-- select jsonb_pretty(public.get_config_clinica('79a15d58-9d7b-4420-a75e-985267e9c8ed')::jsonb);
