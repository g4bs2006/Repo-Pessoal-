-- ============================================================================
-- Automação de Leads — Tabela ACHATADA em public p/ o NODE NATIVO do Supabase
-- (o node nativo não chama RPC nem acessa schema 'automacao' — só public).
-- Idempotente: rode no SQL Editor com "Run".
-- ============================================================================

create table if not exists public.automacao_clinicas (
  id                 uuid primary key default gen_random_uuid(),
  helena_company_id  uuid not null unique,
  nome               text not null,
  helena_token       text not null,
  panel_id           uuid not null,
  step_id            uuid not null,
  ativo              boolean not null default true,
  fb_tag_nome        text,
  fb_panel_tag_id    uuid,
  fb_contact_tag_id  uuid,
  ig_tag_nome        text,
  ig_panel_tag_id    uuid,
  ig_contact_tag_id  uuid,
  org_tag_nome       text,
  org_panel_tag_id   uuid,
  org_contact_tag_id uuid,
  status_obs         text default 'ok',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.automacao_clinicas is
  'Config achatada por clínica (automação de leads Helena). 1 linha por clínica. Acesso só service_role.';

-- updated_at automático
create or replace function public.set_updated_at_automacao()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_automacao_clinicas_updated_at on public.automacao_clinicas;
create trigger trg_automacao_clinicas_updated_at
  before update on public.automacao_clinicas
  for each row execute function public.set_updated_at_automacao();

-- RLS: ligada e SEM policy => anon/authenticated negados (protege o token);
-- a service_role (usada pelo node nativo do n8n) faz bypass automático.
alter table public.automacao_clinicas enable row level security;

-- ----------------------------------------------------------------------------
-- SEED da clínica ATOS (idempotente)
-- ----------------------------------------------------------------------------
insert into public.automacao_clinicas (
  helena_company_id, nome, helena_token, panel_id, step_id, ativo,
  fb_tag_nome, fb_panel_tag_id, fb_contact_tag_id,
  ig_tag_nome, ig_panel_tag_id, ig_contact_tag_id,
  org_tag_nome, org_panel_tag_id, org_contact_tag_id, status_obs
) values (
  '79a15d58-9d7b-4420-a75e-985267e9c8ed', 'Atos Odontologia',
  'pn_7PEG91xSt3kCPnqplUOu52ww9nDjNAlr5lbuUkYdI',
  '3b98f0bf-fea4-47b7-a922-2f3981220722', '6f418246-8f5a-4c7e-a63b-31e177deed25', true,
  'Facebook',  'fb7781a8-9e21-4241-a7d7-ee8e82ffbf6c', '0a6eca24-bf61-4dc6-b607-9b35db4e7cfc',
  'Instagram', '9dd2d9ca-41d5-4f67-b445-2dc73efe6b2b', 'ec81194d-5d4a-4d03-b954-2bb9cab71069',
  'Orgânico',  '5c74d4d0-8222-4f2f-999b-f60a96bed915', '28a025a3-3cf1-4b17-b91c-016e21b96477', 'ok'
)
on conflict (helena_company_id) do nothing;

-- ============================================================================
-- Colunas extras p/ a automação "Mover para Agendados" (Workflow 3)
-- ============================================================================
alter table public.automacao_clinicas
  add column if not exists back_panel_id    uuid,   -- painel onde a IA agenda (gate do PANEL_CARD_NEW)
  add column if not exists agendado_step_id uuid;   -- etapa "Agendados" no painel FULL (= panel_id)

comment on column public.automacao_clinicas.back_panel_id is
  'Painel onde a IA cria o card de agendamento (gate). O painel FULL e o proprio panel_id.';
comment on column public.automacao_clinicas.agendado_step_id is
  'Etapa Agendados do painel FULL (panel_id) para onde o card do contato e movido.';

-- Preenche a clínica Volte a Sorrir (exemplo)
update public.automacao_clinicas set
  back_panel_id    = '38e0b2d0-9365-4a91-a938-b2dfefdfc228',  -- "Agendou - IA"
  agendado_step_id = '7a410a8e-6722-4eb4-ba69-c758ac8f0170'   -- "Agendados" do "Controle de Leads"
where helena_company_id = 'c85e9d09-bfc9-4d3c-91a0-48507d7563a7';

-- Verificação:
-- select * from public.automacao_clinicas;
