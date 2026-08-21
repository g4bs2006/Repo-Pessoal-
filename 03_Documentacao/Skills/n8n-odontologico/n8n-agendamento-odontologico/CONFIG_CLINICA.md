# Config da Clínica — o que coletar

Todo o workflow sai de um único arquivo JSON. Comece de `scripts/config.exemplo.json`.

O gerador **falha e não escreve arquivo** se faltar campo obrigatório. Ele nunca preenche por conta própria: valor ausente é pergunta para a clínica, não default.

---

## `clinica`

| Campo | Obrigatório | Efeito |
|---|---|---|
| `nome_empresa` | sim | aparece nos logs e no campo `clinica` da tabela de métricas |
| `nome_unidade` | não | usado nas respostas ao paciente e nas notas do agendamento. Cai para `nome_empresa` |
| `nome_workflow` | não | nome do workflow no n8n. Default: `AGENDAMENTOS - <nome_empresa>` |
| `prefixo` | sim | **semente dos ids dos nós.** Precisa ser único por clínica. Use o mesmo prefixo dos arquivos do agente (`SCO`, `ATO`, `OB`) |
| `cidade_uf` | não | documentação |

> ⚠️ Trocar o `prefixo` depois de o workflow estar em produção regenera todos os ids e o n8n trata como workflow novo. Defina uma vez.

---

## `webhook`

| Campo | Obrigatório | Efeito |
|---|---|---|
| `path` | sim | o path do webhook, `POST /<path>`. Convenção: `agendamentos-<clinica>`. É o que vai na URL das 5 habilidades do WTS |

---

## `clinicorp`

Tudo aqui vem da clínica ou do suporte Clinicorp. Nada é adivinhável.

| Campo | Obrigatório | O que é |
|---|---|---|
| `subscriber_id` | sim | id da assinatura. Vai como query param em toda chamada |
| `auth_user` | não | usuário do Basic auth. Cai para `subscriber_id` quando são iguais |
| `api_key` | sim | a chave. Entra no `Basic base64(auth_user:api_key)` |
| `business_id` | sim | id da unidade. Vai no `Clinic_BusinessId` do agendamento e no `businessId` da listagem |
| `link_agenda` | sim | o `code_link` da agenda pública. É o que define **quais** horários a IA vê |
| `profissional` | sim | `{ id, nome }` do profissional principal |
| `profissional_fallback` | não | `{ id, nome }` ou `null`. Quando existe, o slot é procurado no principal e, não achando, no fallback |

**Como o profissional é escolhido:** `Logica Inteligente` e `Validar Slot` só aceitam slot cujo `professionalId` seja o principal ou o fallback. Slot de qualquer outro profissional da agenda é ignorado. É assim que "dentista com dia restrito" fica sendo regra interna: o paciente nunca vê o nome antes do agendamento, e o sistema é que decide.

> Se a clínica tem seis dentistas mas a avaliação é sempre com um ou dois, configure só esses. Colocar todos faz a IA oferecer agenda de especialista que não faz avaliação.

---

## `agenda`

| Campo | Default | Efeito |
|---|---|---|
| `duracao_servico` | — obrigatório | minutos da avaliação. Define o `toTime` do agendamento |
| `capacidade_simultanea` | 1 | pacientes por slot. Documental no Code; a capacidade real é da agenda Clinicorp |
| `limite_dias_busca_normal` | 7 | janela de busca, e o limite acima do qual a data pedida é considerada "distante" |
| `threshold_proximidade_min` | 90 | minutos de tolerância para considerar que um slot do mesmo dia serve. Acima disso, a IA oferece outro dia em vez de um horário muito longe do pedido |
| `timezone` | America/Sao_Paulo | usado em todo parse e formatação |
| `janela_manha` | 08:00–12:00 | faixa que conta como "manhã" quando o paciente diz o período |
| `janela_tarde` | 13:00–19:00 | idem para "tarde" |

**As janelas importam mais do que parecem.** Elas são o que traduz "quero de manhã" em um filtro de minutos. Se a clínica abre às 09:00 e a janela ficar em 08:00, nada quebra; mas se a clínica atende até 19:00 e a janela da tarde terminar às 18:00, a IA nunca oferece o último horário do dia — que costuma ser justamente o que o paciente que trabalha pede.

O almoço **não** é configurado aqui: quem não devolve slot no almoço é a própria agenda Clinicorp.

---

## `textos`

| Campo | Efeito |
|---|---|
| `categoria_cor` | cor do compromisso na agenda da clínica. Útil para a recepção distinguir o que veio da IA |
| `categoria_descricao` | descrição da categoria, normalmente `Avaliação` |
| `nota_agendamento` | prefixo da nota do agendamento |
| `nota_reagendamento` | prefixo da nota da remarcação |
| `nota_novo_paciente` | nota do cadastro de paciente novo |

A nota final do agendamento é montada assim:

```
<nota_agendamento> (<nome_unidade>) | Bairro: <bairro> | SPIN: <resumo>
```

Bairro e SPIN entram só se o agente os enviar. O `spin` é onde o dentista lê a dor, a frase marcante e a urgência antes de abrir a boca do paciente — vale exigir no prompt do agente que ele preencha bem.

---

## `helena`

| Campo | Obrigatório | O que é |
|---|---|---|
| `company_id` | sim | UUID da conta Helena/WTS. É a chave que busca a linha em `automacao_clinicas` |

> Nunca reaproveite o `company_id` de outra clínica, nem em rede que compartilha conta. Se houver payload de exemplo salvo em `pinData`, valide contra o `h.tenantId` do `correlation-context` antes de perguntar.

---

## `supabase`

| Campo | Default | O que é |
|---|---|---|
| `tabela_automacao` | automacao_clinicas | tabela de config do CRM |
| `tabela_metricas` | metricas_ia | tabela de log |
| `credencial_automacao` | — | `{ id, name }` da credencial n8n que lê `automacao_clinicas` |
| `credencial_metricas` | — | `{ id, name }` da credencial n8n que escreve `metricas_ia` |

**São duas credenciais diferentes.** Nos workflows existentes, `automacao_clinicas` usa a credencial "Supa Gabriel" e `metricas_ia` usa "ANDRE ( DASH CONTACT )". Apontar as duas para a mesma credencial é o erro que faz o CRM funcionar e o log falhar, ou o contrário.

Os ids de credencial só existem na instância n8n. Se não os tiver em mãos, deixe `COLE_*`: o workflow importa, e você religa as credenciais na interface. É mais rápido do que caçar id.

---

## A linha em `automacao_clinicas`

O gerador não cria essa linha, e sem ela o subsistema de CRM **falha fechada e fica inerte** — o agendamento acontece e o painel não registra nada.

| Coluna | Uso |
|---|---|
| `helena_company_id` | chave de busca |
| `helena_token` | Bearer da API WTS |
| `panel_id` | painel Kanban |
| `agendado_step_id` | etapa destino ao agendar **e ao remarcar** |
| `cancelado_step_id` | etapa destino ao cancelar |
| `ia_card_tag_id` | etiqueta aplicada no **card** |
| `agendado_contact_tag_id` | etiqueta no **contato**, cadeia Agendar |
| `remarcado_contact_tag_id` | etiqueta no contato, cadeia Remarcar — **novo na v4** |
| `cancelado_contact_tag_id` | etiqueta no contato, cadeia Cancelar — **novo na v4** |
| `agendado_em_field_key` | opcional, customField DATETIME "agendado em" |
| `agendado_para_field_key` | opcional, customField DATETIME "agendado para" |

Se as etiquetas de remarcado e cancelado ainda não existem na Helena, **crie-as antes**. Sem elas, o painel mostra como "agendado" quem cancelou.

---

## Checklist de coleta

```
Clinicorp
[ ] subscriber_id
[ ] usuário do Basic + api_key
[ ] business_id
[ ] link_agenda (code_link da agenda pública)
[ ] id e nome do profissional principal
[ ] id e nome do fallback, se houver
[ ] duração da avaliação em minutos
[ ] pacientes por horário
[ ] horário de funcionamento e almoço (para conferir as janelas)

Helena
[ ] helena_company_id
[ ] linha em automacao_clinicas com as 8 colunas obrigatórias
[ ] as 3 etiquetas de contato criadas no painel
[ ] agendado_step_id e cancelado_step_id conferidos no Kanban

n8n
[ ] credencial Supabase de automacao_clinicas
[ ] credencial Supabase de metricas_ia
[ ] path do webhook definido

Agente (do outro lado)
[ ] as 5 habilidades apontando para o path certo
[ ] id_atendimento no payload das 5
```
