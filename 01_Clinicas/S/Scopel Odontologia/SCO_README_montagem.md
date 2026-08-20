# Clarisse — Scopel Odontologia | Montagem e pendências

Agente construído no **padrão Luna (v4)**, prefixo `SCO_`. Base: `briefing_scopel_odontologia_2026-08-14 (1).md` + estrutura e diferenciais fornecidos em 19/08/2026.

---

## Ordem de montagem do prompt no WTS

```
1.  SCO_persona_clarisse.md
2.  SCO_regras_sistema_constraints.md
3.  SCO_formatacao_mensagens.md
4.  SCO_habilidades_estrutura.md
5.  SCO_estagio_0_recepcao.md
6.  SCO_estagio_1_acolhimento_situacao.md
7.  SCO_estagio_2_problema_implicacao.md
8.  SCO_estagio_3_necessidade_convite.md
9.  SCO_estagio_4_verificar_disponibilidade.md
10. SCO_estagio_5_agendamento_pacto_honra.md
11. SCO_estagio_6_retencao.md
12. SCO_estagio_7_verificacao.md
13. SCO_estagio_8_finalizacao.md
14. SCO_estagio_9_objecoes.md
15. SCO_estagio_10_bypass.md
16. SCO_estagio_12_reengajamento.md
17. SCO_estagio_11_memoria.md        ← sempre por último
```

Os 4 CSVs de `Database/` entram como banco de conhecimento, não como texto do prompt.

---

## Decisões tomadas no onboarding (19/08/2026)

O briefing tinha quatro pontos vazios ou contraditórios. Resolvidos assim:

| Ponto | Conflito no briefing | Decisão |
|---|---|---|
| Política de avaliação | "Cortesia, não tem custo" **e** "campanha de 1kg de alimento" | **Cortesia solidária** com contribuição de 1kg de alimento não perecível. Proibido: grátis, gratuita, sem custo |
| Idade mínima | "todas as especialidades, exceto odontopediatria" **e** "idade mínima 4 anos" | Atende **de 4 anos para cima, em clínico geral**, com fluxo infantil completo. Nunca prometer odontopediatra |
| Almoço | "_não preenchido_ às 13:00" | **12:00 às 13:00** |
| Coração da marca | não informado | **💛** |

Outras interpretações aplicadas:

- **Telefone:** o briefing diz que não é coletado no agendamento porque vem do WhatsApp, mas o lista como campo obrigatório. Resolvido: o telefone é **confirmado no Pacto de Honra**, não perguntado. Só é solicitado de fato ao remarcar, cancelar ou verificar consulta.
- **Parcelamento:** o briefing traz "até 24x". O invariante 8 e a seção 4 das constraints proíbem prometer número de parcelas. As formas de pagamento ficam no `SCO_BK_estrutura.csv` como fato, informadas só se perguntado, e o número de parcelas fica para o dentista na avaliação.
- **Tomografia:** o briefing lista tomografia entre os métodos de avaliação, mas também diz que o único exame feito na clínica é o raio-X periapical. Escrito como exame complementar **solicitado pelo dentista e feito fora**. As constraints proíbem dizer que a clínica tem tomógrafo ou panorâmico.

---

## Pendências antes de ativar

### 1. n8n — agendamento Clinicorp (dados Clinicorp resolvidos em 19/08/2026)

**O workflow foi gerado com dados reais**, confirmados ao vivo contra a API Clinicorp (não é mais placeholder): `n8n/agendamento_scopel.json` (78 nós, validado — 0 erros). A config-fonte está em `n8n/config_scopel.json`.

- [x] `subscriber_id` — usa o próprio usuário (`spl`); confirmado ao vivo que a Clinicorp não valida o valor contra a conta, só exige presença
- [x] usuário do Basic + `api_key` — fornecidos pela clínica
- [x] `business_id` — `4595218576375808`, descoberto via `GET /business/list` (nome bateu: "Clínica Scopel Odontologia")
- [x] `link_agenda` — `871028`, confirmado que é o `code_link` direto (o link `agenda.link/871028` é uma SPA, não um redirect; `871028` já é o código)
- [x] Profissional principal — **Dr Hugo Barretto**, `id 5395363349987328`, descoberto cruzando `professional/list_all_professionals` (10 pessoas cadastradas, incluindo Emily e o Guilherme) com quem de fato tem horário aberto no `code_link` real. Nenhum outro dentista apareceu na agenda de avaliação — sem fallback
- [x] `duracao_servico: 30` — confirmado nos slots reais (100% consistente)
- [x] Horário observado: 09:00–19:00, sem sábado/domingo — bate com o briefing

> ⚠️ **Achado que precisa de confirmação com a clínica:** a agenda real de Dr Hugo Barretto tem 22 horários livres dentro da janela 12:00–13:00 nos 15 dias verificados — ou seja, esse dentista específico **não** tem bloqueio de almoço fixo nessa agenda. As constraints do agente (`SCO_regras_sistema_constraints.md`, seção 6) dizem "almoço 12:00–13:00, nunca oferecer horário nessa janela" — isso é uma regra correta que a Clarisse deve seguir, ou é só o que o briefing presumiu? Se a Scopel confirmar que não há almoço fixo para esse profissional, atualizar a seção 6 das constraints para não recusar horário que a própria Clinicorp está oferecendo de verdade. Enquanto isso não for confirmado, a config do n8n já está ajustada para não ter buraco entre `janela_manha` e `janela_tarde` (as duas se encontram em 13:00), então nenhum horário real é perdido tecnicamente — a Clarisse só vai continuar recusando oferecer o que cai nessa faixa, por instrução de persona, não por limitação do sistema.
>
> **Nome do dentista:** o sistema Clinicorp tem "BARRETTO" (dois T), o briefing tem "Barreto" (um T). Confirmar a grafia certa antes de usar `{{nome_profissional_sugerido}}` publicamente.

Para reproduzir ou atualizar (ex: se a clínica trocar o profissional principal):

> 🔑 A `api_key` da Clinicorp **não fica neste arquivo nem no git** — ela vive só no `config_scopel.json` local, que está no `.gitignore` junto do workflow gerado. Pegue o valor real ali antes de rodar o comando abaixo.

```bash
cd "01_Clinicas/S/Scopel Odontologia/n8n"
node "../../../../03_Documentacao/Skills/n8n-odontologico/n8n-agendamento-odontologico/scripts/descobrir_config.js" \
  --auth-user spl --api-key "<api_key do config_scopel.json>" --code-link 871028 \
  --nome-empresa "Scopel Odontologia" --prefixo SCO --out config_scopel_rascunho.json
# revisar o rascunho, copiar os campos clinicorp/agenda pro config_scopel.json de verdade
node "../../../../03_Documentacao/Skills/n8n-odontologico/n8n-agendamento-odontologico/scripts/gerar_workflow.js" config_scopel.json agendamento_scopel.json
node "../../../../03_Documentacao/Skills/n8n-odontologico/n8n-agendamento-odontologico/scripts/validar_workflow.js" agendamento_scopel.json
```

Detalhe completo da descoberta (endpoints, achados, o que ficou confirmado e o que não): `03_Documentacao/API Clinicorp/clinicorp-api-business-professional.md`.

### 2. Subsistema de CRM da Helena (bloqueante na v4)

Sem ele **nenhuma etiqueta e nenhum card são aplicados**, porque a Clarisse não aplica mais nada disso. **O workflow gerado já tem as três cadeias completas** (Agendar, Remarcar, Cancelar — cada uma com seu nó de etiqueta de contato), validado sem erro. Falta só o dado, que vai em `config_scopel.json` → `helena.company_id` e depois regerar:

- [ ] `helena_company_id` da Scopel
- [ ] Linha em `automacao_clinicas`, filtrada por esse `helena_company_id`, com `helena_token`, `panel_id`, `agendado_step_id`, `cancelado_step_id`, `ia_card_tag_id`, `agendado_contact_tag_id`, `remarcado_contact_tag_id`, `cancelado_contact_tag_id`
- [ ] As três etiquetas de contato criadas no painel Helena, se ainda não existirem
- [ ] `id_atendimento` no payload das 5 habilidades de agendamento

> Se a Scopel não tiver painel de CRM na Helena, **parar e alinhar**: ou se monta o painel, ou se aceita rodar sem etiqueta e sem card, ou se reintroduz `tag_Alerta` no agente. Não decidir isso sozinho.

### 3. Feriados municipais

O `SCO_BK_feriados.csv` tem os nacionais de 2026, o estadual do Paraná e os primeiros de 2027. Duas linhas estão marcadas como **A CONFIRMAR**:

- [ ] Aniversário de Pontal do Paraná
- [ ] Padroeira do município
- [ ] Confirmar também se a clínica abre em Carnaval segunda, Quarta-feira de Cinzas, 24/12 e 31/12

### 4. Campanha e origem de lead

- [ ] Existe texto padronizado de anúncio chegando na primeira mensagem? Se sim, registrar o trigger na seção 16 das constraints
- [ ] Automação de origem de lead (`SESSION_NEW`) apontando para a Scopel

### 5. Confirmar com a clínica

- [ ] O nome fantasia usado com o paciente: "Scopel Odontologia" ou "Clínica Scopel"
- [ ] Número de atendimento que vai rodar o agente: (41) 93795-2880 é o dos leads, (43) 93511-4568 é o principal
- [ ] Emily e Gisele: qual das duas recebe o transbordo por padrão. Está escrito **Emily** na frase de transbordo (bloco duro)
- [ ] Frase de despedida de marca, se a clínica tiver uma própria

---

## Checklist de conformidade v4 (rodar antes de ativar)

```bash
# 1. Nenhuma habilidade removida sobrou nos arquivos operacionais
grep -rniE 'tag_|Registrar_Origem|Confirmar_Compromisso_Honra|Cliente Agendou|Marcar_Dor|Classificar_Urgencia|Ler_Etiqueta' Configuracao/ Estagios/

# 2. Ler_Contexto só em E0, E7, E11 (definição) e E12
grep -rln 'Ler_Contexto' Estagios/

# 3. Salvar_Contexto só nos 6 eventos + transbordo
grep -rc 'Salvar_Contexto' Estagios/*.md

# 4. Regra global vazando para dentro dos estágios
grep -rniE '120 caracteres|travessão|máximo 2 emojis' Estagios/
```

**Estado em 19/08/2026:** os quatro passam. O único retorno do item 1 é a tabela documental "O que a Clarisse NÃO aciona" em `SCO_habilidades_estrutura.md`, que existe justamente para registrar as remoções.

### Testes de ponta a ponta

- [ ] As 5 ações de agendamento com payload real
- [ ] Um agendamento de teste move o card e etiqueta o contato na Helena
- [ ] Um cancelamento de teste move o card para `cancelado_step_id`
- [ ] Uma remarcação de teste aplica `remarcado_contact_tag_id`
- [ ] `Ler_Contexto` com contato novo devolve vazio e a Clarisse abre pelo Caminho C
- [ ] `Ler_Contexto` com contato agendado faz a Clarisse abrir pelo Caminho A, sem SPIN
