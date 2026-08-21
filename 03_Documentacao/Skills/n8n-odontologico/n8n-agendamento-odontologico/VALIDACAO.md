# Validação, Importação e Catálogo de Erros

## O validador

```bash
node scripts/validar_workflow.js caminho/do/workflow.json
```

Checa o que quebra **silenciosamente em produção**, não o que o n8n já valida na importação. Sai com código 1 se houver ERRO; AVISO não derruba.

| # | Check | Severidade |
|---|---|---|
| 1 | ids de nó duplicados | erro |
| 2 | conexão apontando para nó inexistente | erro |
| 3 | nó sem entrada e sem ser trigger | aviso |
| 4 | `id_atendimento` presente no workflow | erro |
| 5 | as três colunas de etiqueta de contato presentes | erro |
| 6 | fan-out do CRM nos três nós de confirmação | erro |
| 7 | cada branch do Switch alcança um `respondToWebhook` | erro |
| 8 | `Criar Card (Cancelar)` **não** existe | erro |
| 9 | placeholders `COLE_*` ainda no arquivo | aviso |
| 10 | as 5 ações roteadas no Switch | erro |
| 11 | `nome_profissional_sugerido` devolvido | aviso |

Ele também tolera BOM UTF-8 na leitura, que é o defeito do JSON da OB Clinic e faz `JSON.parse` falhar direto.

### Usando o validador para auditar um workflow antigo

Rode contra qualquer workflow de clínica já em produção. Ele diz exatamente o que falta para chegar ao padrão v4. Rodando contra o workflow da Atos, por exemplo, ele acusa as duas etiquetas ausentes e o `nome_profissional_sugerido` que nunca era devolvido.

---

## Sintaxe dos nós de Code

O validador não executa JavaScript. Para checar os templates:

```bash
for f in templates/*.js; do node --check "$f" && echo "ok $f"; done
```

Para checar o que foi realmente embutido no workflow gerado:

```bash
node -e "
const fs=require('fs'),os=require('os'),p=require('path'),cp=require('child_process');
const wf=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
wf.nodes.filter(n=>n.type==='n8n-nodes-base.code').forEach(n=>{
  const f=p.join(os.tmpdir(),'chk.js');
  fs.writeFileSync(f,n.parameters.jsCode);
  try{cp.execSync('node --check \"'+f+'\"',{stdio:'pipe'});console.log('ok  '+n.name);}
  catch(e){console.log('ERRO '+n.name);}
});
" workflow.json
```

---

## Importação no n8n

1. **Importar o JSON** (Workflows → Import from File).
2. **Religar as duas credenciais Supabase.** Se os ids da config não correspondem aos da instância, os nós entram sem credencial e é preciso selecionar na interface. São duas diferentes — ver `RESPOSTAS_E_LOGS.md`.
3. **Conferir o path do webhook** e copiar a URL de produção.
4. **Colar a URL nas 5 habilidades do WTS**, e conferir que todas enviam `id_atendimento`.
5. **Não ativar ainda.** Testar primeiro com a URL de teste.

> Placeholders `COLE_*` ficam visíveis no `Configuracao Unidades`. Preencha lá ou, melhor, na config e regere — editar o JSON à mão faz a config e o arquivo divergirem, e a próxima geração sobrescreve a correção.

---

## Teste das 5 ações

Com a URL de teste, dispare cada payload e confira o corpo da resposta.

```json
// 1. verificar_disponibilidade
{ "acao_fluxo": "verificar_disponibilidade", "id_atendimento": "TESTE-001",
  "horario_preferido": "manhã", "data_inicio": "2026-08-24" }

// 2. realizar_agendamento
{ "acao_fluxo": "realizar_agendamento", "id_atendimento": "TESTE-001",
  "nome_cliente": "Paciente Teste", "telefone_cliente": "41999990000",
  "bairro_cliente": "Praia de Leste", "data_iso": "2026-08-24",
  "horario_preferido": "09:00",
  "spin": "DOR: mastigacao, prótese solta. URGENCIA: alta. Chegou por indicação." }

// 3. verificar_agendamento_paciente
{ "acao_fluxo": "verificar_agendamento_paciente", "id_atendimento": "TESTE-001",
  "nome_cliente": "Paciente Teste", "telefone_cliente": "41999990000" }

// 4. remarcar_agendamento
{ "acao_fluxo": "remarcar_agendamento", "id_atendimento": "TESTE-001",
  "telefone_cliente": "41999990000", "data_antiga_iso": "2026-08-24",
  "data_iso": "2026-08-26", "horario_preferido": "14:00" }

// 5. cancelar_agendamento
{ "acao_fluxo": "cancelar_agendamento", "id_atendimento": "TESTE-001",
  "telefone_cliente": "41999990000", "data_iso": "2026-08-26",
  "horario_preferido": "14:00" }
```

Rode na ordem: 1 → 2 → 3 → 4 → 5. A ordem importa, porque 3, 4 e 5 dependem do agendamento criado em 2.

```
[ ] 1 devolve sugestoes_horarios e nome_profissional_sugerido
[ ] 2 devolve status sucesso e o agendamento aparece na agenda Clinicorp
[ ] 2 grava a nota com Bairro e SPIN visíveis para o dentista
[ ] 3 devolve a data e hora corretas do agendamento criado
[ ] 4 devolve "Era X, ficou para Y" e a agenda reflete a nova data
[ ] 5 devolve sucesso e o agendamento sai da agenda
[ ] as 3 operações moveram card e etiquetaram contato — ver CRM_HELENA.md
```

Somente depois disso: **ativar**.

---

## Catálogo de erros de produção

### `id_atendimento` faltando

**Sintoma:** tudo funciona, o painel não registra nada.
**Causa:** a habilidade no WTS não envia `id_atendimento`. A cadeia de CRM roda, `Buscar Sessao` busca sessão vazia, o IF fecha em falso, ninguém reclama.
**É o erro mais caro da v4**, porque o agente não aplica mais tag para compensar.
**Diagnóstico:** agendamento na Clinicorp mas card parado = `id_atendimento`. Nada na Clinicorp = cadeia Clinicorp.

### Etiqueta de remarcado ou cancelado ausente

**Sintoma:** card move, contato fica com a etiqueta antiga. Relatório conta como agendado quem cancelou.
**Causa:** portar um workflow v3 sem adicionar os dois nós novos.
**É o erro mais provável de uma migração.** O gerador já os inclui; o validador acusa se faltarem.

### Remarcação nunca acha o agendamento

**Causa:** `Listar Agmts Remarcar` usando a janela de `data_agendada` em vez de `data_antiga`.
**Efeito:** busca em volta da data nova, onde não há nada.

### Paciente fica sem agendamento no meio da remarcação

**Causa:** cancelar o antigo antes de validar o novo slot.
**Correção:** a ordem `Validar Slot Remarcar` → `Novo Horario Valido?` → `Cancelar Antigo` é inviolável.

### Card perdeu título ou descrição

**Causa:** `fields` do PUT com campo a mais, ou PUT em `/crm/v1/` em vez de `/crm/v2/`.
**Efeito:** sobrescreve o que alguém da clínica editou à mão.

### `Clinic_BusinessId` rejeitado

**Causa:** id numérico enviado como string.
**Correção:** no `jsonBody`, os três ids vão sem aspas.

### Horário oferecido não existe

**Causa:** o agente ofereceu algo fora de `sugestoes_horarios`.
**Onde corrigir:** no prompt do agente, não no workflow. É o invariante 2.

### Agente confirma agendamento que não aconteceu

**Causa:** o agente seguiu para o E8 sem processar o retorno.
**Onde corrigir:** no prompt. O workflow já só devolve `status: sucesso` com gravação real — é o invariante 3.

### Data em feriado oferecida

**Causa:** o workflow **não** filtra feriado, por decisão de arquitetura.
**Correção:** é do agente, via `_BK_feriados.csv`, consultado no E4. Não tente resolver aqui.

### Timezone deslocando o dia

**Causa:** `Date.now()` ou `new Date()` em Code node, num servidor em UTC.
**Correção:** sempre `DateTime.now().setZone(config_agenda.timezone)`.

### Último horário do dia nunca é oferecido

**Causa:** `janela_tarde.fim` menor que o fim do funcionamento.
**Efeito:** o paciente que só pode depois do trabalho nunca recebe opção, e o agente cai no limite de 3 datas e transborda.

### JSON não importa

**Causa:** BOM UTF-8 no início do arquivo.
**Correção:** o validador tolera na leitura, mas para importar remova o BOM.

### Habilidade estoura timeout

**Causa:** o branch não alcança nenhum `respondToWebhook`, ou o `acao_fluxo` não casa com nenhuma regra do Switch.
**Diagnóstico:** o histórico de execução do n8n mostra a execução terminando sem nó de resposta. O validador pega o primeiro caso; o segundo é erro de digitação na descrição da habilidade no WTS.

---

## Checklist final antes de ativar

```
Geração
[ ] config preenchida, sem COLE_ restante
[ ] gerador rodou sem erro
[ ] validador: 0 erros
[ ] sintaxe dos 12 nós de Code ok

Importação
[ ] workflow importado
[ ] 2 credenciais Supabase religadas
[ ] URL do webhook colada nas 5 habilidades
[ ] as 5 habilidades enviam id_atendimento

Helena
[ ] linha em automacao_clinicas existe, filtrada pelo helena_company_id certo
[ ] as 3 etiquetas de contato existem no painel
[ ] agendado_step_id e cancelado_step_id conferidos

Testes
[ ] as 5 ações testadas na ordem, com payload real
[ ] teste de ponta a ponta do CRM nas 3 operações
[ ] card não é criado no cancelamento

Só então
[ ] ativar o workflow
[ ] acompanhar as primeiras execuções reais
```
