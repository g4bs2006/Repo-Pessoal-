# HABILIDADES, TAGS E ESTRUTURA — Rafaela | Odonto Moraes | Caixa Rápido São João

---

## Habilidades (Skills)

### Memória e Contexto

| Habilidade | Tipo | Quando Usar |
|---|---|---|
| `Ler_Contexto` | READ_CONTEXT | **Início de TODOS os estágios**, em silêncio total, antes de qualquer mensagem. |
| `Salvar_Contexto` | SAVE_CONTEXT | **Final de TODOS os estágios**, antes de avançar ou encerrar. Preencher os 15 campos semânticos + Autoavaliação. Ver estrutura no E10 do agente base. |

---

### Gestão de Contato

| Habilidade | Tipo | Quando Usar |
|---|---|---|
| `salvar_primeiro_nome` | UPDATE_CONTACT_FIELD | Quando o lead informar o primeiro nome (E0/E1). Extrair apenas o primeiro nome. |
| `atualizar_nome_contato` | UPDATE_CONTACT_FIELD | Quando o lead informar o nome completo. Obrigatório antes de executar o agendamento (E4). |

---

### Agendamento via API

| Habilidade | Tipo | Endpoint | Quando Usar |
|---|---|---|---|
| `verificar_disponibilidade` | CALL_API POST | `/webhook/ODONTO_MORAES` | Antes de oferecer qualquer horário. Converter data para ISO 8601. **Filtrar apenas horários do dia 12/06/2026.** Nunca oferecer mais de 2 opções. |
| `realizar_agendamento` | CALL_API POST | `/webhook/ODONTO_MORAES` | Após: (1) disponibilidade confirmada, (2) "SIM" no Pacto de Honra, (3) Nome Completo coletado. |
| `remarcar_agendamento` | CALL_API POST | `/webhook/ODONTO_MORAES` | Apenas para trocar horário dentro do mesmo dia 12. Somente após "Sim" no Pacto de Honra atualizado. |
| `cancelar_agendamento` | CALL_API POST | `/webhook/ODONTO_MORAES` | Após esgotar as 3 tentativas de retenção no E7 e o lead confirmar o cancelamento. |
| `verificar_agendamento_paciente` | CALL_API POST | `/webhook/ODONTO_MORAES` | Quando o lead perguntar sobre consulta existente. |

> **Base URL da API:** `https://webhook.dentistapower.com.br`

---

### Etiquetas de Dor (Tags CRM)

| Habilidade | Tipo | Quando Usar |
|---|---|---|
| `Marcar_Dor_Protese` | UPDATE_CONTACT_TAG | Quando a dor for funcional — prótese solta, dentadura machucando, dificuldade ao mastigar. Executar no E1. |
| `Marcar_Dor_Estetica` | UPDATE_CONTACT_TAG | Quando a dor for estética — vergonha de sorrir, aparência. Executar no E1 se mencionado. |

---

### Etiquetas de Urgência (Tags CRM)

| Habilidade | Tipo | Quando Usar |
|---|---|---|
| `Classificar_Urgencia_Alta` | UPDATE_CONTACT_TAG | Dor constante, prótese que soltou completamente, situação aguda. Executar no E1. |
| `Classificar_Urgencia_Baixa` | UPDATE_CONTACT_TAG | Desconforto leve, incômodo intermitente, predominantemente estético. Executar no E1. |

---

### Etiquetas de Status (Tags CRM)

| Habilidade | Tipo | Quando Usar |
|---|---|---|
| `etiquetar_agendado` | UPDATE_CONTACT_TAG | Após `realizar_agendamento` com sucesso (E4). Execução silenciosa. |
| `etiquetar_nao_agendado` | UPDATE_CONTACT_TAG | Quando o lead recusa o agendamento e é transferido (E4 Caminho A). Execução silenciosa. |
| `etiquetar_ligar_depois` | UPDATE_CONTACT_TAG | Quando o lead demonstra interesse mas a objeção é irredutível (E6). |
| `tag_Remarcou` | UPDATE_CONTACT_TAG | Após `remarcar_agendamento` com sucesso (E7). Execução silenciosa. |
| `tag_Cancelou` | UPDATE_CONTACT_TAG | Após `cancelar_agendamento` com sucesso (E7). Execução silenciosa. |
| `tag_Alerta` | UPDATE_CONTACT_TAG | Quando o lead for agressivo após 2 tentativas de redirecionamento (E6). |

---

### Ações de Atendimento

| Habilidade | Tipo | Quando Usar |
|---|---|---|
| `Agendou` | ADD_CRM_CARD | SOMENTE após `realizar_agendamento` confirmado (E4 Caminho B). Cria card no pipeline. |
| `transferir_atendente` | TRANSFER_DEPARTMENT | Lead solicita humano / objeção irredutível no E4 / tag_Alerta aplicada / API com timeout. |
| `concluir_atendimento` / `encerrar_conversa` | COMPLETE_SESSION | Após despedida no E5. NUNCA executar sem antes executar `Salvar_Contexto` e enviar a mensagem de despedida. |
| `melhoria_banco_conhecimento` | CALL_API POST | Quando o lead faz pergunta técnica específica não coberta na `OMCR_BK_objecoes.csv`. |

---

## Estrutura do Card CRM (`Agendou`)

**Título do Card:**
```
PACIENTE: {{nome_completo}}
TELEFONE: {{contact.phone}}
```

**Descrição do Card:**
```
--- CAMPANHA: CAIXA RÁPIDO SÃO JOÃO | 12/06/2026 ---
DOR: {{dor_relatada}}
IMPACTO SÃO JOÃO: {{impacto_verbalizado}}

--- Data: {{data_do_agendamento}} - Horário: {{horario_do_agendamento}} ---
```

- **Pipeline ID:** `82dd22bc-792b-4d22-80c9-4784af90e9b4`
- **Step ID:** `8219cc53-8c4a-4bdf-851d-1668b1286069`

---

## Variáveis do Sistema Disponíveis

| Variável | Descrição |
|---|---|
| `contact.name` | Nome do contato |
| `contact.phone` | Telefone do contato |
| `contact.firstName` | Primeiro nome |
| `date.today` | Hoje |
| `date.d+1` | Amanhã |
| `date.d+2` | Depois de amanhã |
| `date.d+3` | Após 3 dias |

---

## Departamento Padrão

- **ID:** `8837a233-dfdb-478b-8c9b-575c3b54a8f8`
- Usado como departamento default e fallback de transferência.

---

## Base de Conhecimento (Arquivos de Referência)

| Arquivo | Conteúdo | Quando Consultar |
|---|---|---|
| `OMCR_BK_objecoes.csv` | Scripts para 8 tipos de objeção do Caixa Rápido | Em todo E6 e sempre que surgir resistência |
| `OMCR_BK_contexto_saojao.md` | Âncoras emocionais e referências festivas do São João | E1, E2, E3 e E8 — para personalizar com o contexto festivo |
| `OM_BK_localizacao.csv` | Endereço, referência, link de rotas | E5 (finalização) e E6 (objeção distância) |
| `OM_BK_feriados.csv` | Feriados nacionais e municipais 2026 | Não aplicável — evento tem data fixa em 12/06 |
