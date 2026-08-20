# Memória de Longo Prazo — Padrão Luna (v4)

Conteúdo-base do arquivo `[PREFIX]_estagio_11_memoria.md`.

## O que mudou e por quê

A v3 tratava memória como um problema de **estado**: o modelo não confiava em si mesmo para lembrar o que aconteceu dois turnos atrás, então lia e gravava a cada passo. Eram até 13 leituras e 10 gravações por atendimento.

O Luna tem a conversa inteira na janela. O problema de memória que sobra é apenas **entre atendimentos** — o paciente que volta três dias depois, e o follow-up disparado por fluxo externo. Isso se resolve com **1 leitura** e **1 a 2 gravações** por atendimento.

| | v3 | v4 |
|---|---|---|
| `Ler_Contexto` | E0 + Passo 0 de quase todo estágio | E0 (sempre), E7 (só se o atendimento começou nele), E12 (sempre) |
| `Salvar_Contexto` | toda transição + eventos | 6 eventos decisivos + antes de todo transbordo |
| `Registrar_Origem` | habilidade dedicada | removida — virou o campo `[ORIGEM]` |
| Nota | campos semânticos + autoavaliação | **texto corrido em 4 parágrafos**, com o motivo do alerta e sem tags |

---

## 1. Arquitetura

```
[1] Paciente envia a 1ª mensagem
        ↓
[2] Agente aciona Ler_Contexto em silêncio (n8n busca o perfil via API)
        ↓
[3] Agente abre pelo Caminho A, B ou C conforme o retorno
        ↓
[4] Conversa inteira acontece SEM nova leitura e SEM gravação
        ↓
[5] Ao chegar a uma definição (agendou / remarcou / cancelou / objeção
    irredutível / finalização) → Salvar_Contexto uma vez
        ↓
[6] Se for transbordar em qualquer ponto → Salvar_Contexto com o motivo, antes
```

> Se um mesmo atendimento agenda **e** finaliza, são 2 gravações: uma no sucesso do agendamento (para não perder o dado se o chat cair) e uma no E8, acumulando a autoavaliação final. Esse é o máximo esperado num atendimento normal.

---

## 2. `Ler_Contexto`

| Campo | Valor |
|---|---|
| **Tipo** | Acionar API |
| **Quando** | E0 (primeiro passo, antes de qualquer saudação); E7 se o atendimento começou nele; E12 |
| **Modo** | Silencioso — o paciente não sabe que foi acionada |
| **Retorno vazio / `[NENHUM HISTÓRICO]`** | → Caminho C (paciente novo) |
| **Retorno com histórico ou objeções** | → Caminho B (retomar de onde parou) |
| **Retorno com status AGENDADO** | → Caminho A (pular SPIN, oferecer apoio) |

### Os 3 caminhos do E0

| Caminho | Condição | Ação |
|---|---|---|
| **A — Agendado** | status AGENDADO | Pular o SPIN. Cumprimentar pelo nome, mencionar a avaliação marcada, oferecer apoio. Remarcar/cancelar → E6; dúvida → E9; só confirmar → E8 |
| **B — Histórico** | histórico ou objeção pendente | Pular a coleta de nome. Cumprimentar pelo nome e retomar com empatia do ponto onde parou, usando a próxima ação da nota anterior como guia → E1 |
| **C — Novo** | vazio | Apresentar-se, coletar o nome → `alterar_campo_contato (Nome)` → E1 |

**Limites do E0:**
- ❌ Enviar qualquer mensagem antes do retorno.
- ❌ Perguntar o nome se ele já veio no retorno.
- ❌ Acionar `Ler_Contexto` de novo mais tarde no mesmo atendimento — a conversa em curso o agente já conhece.

> Na v3, o Caminho C incluía a pergunta "você já é paciente da nossa clínica?" antes de iniciar o SPIN, para pegar o caso de cadastro divergente (número novo, telefone diferente do cadastro). Isso é **opcional na v4** e depende da clínica ter um setor de pacientes separado — se tiver, a pergunta fica, e o "sim" leva direto a `transferir_atendimento_paciente`, sem SPIN.

---

## 3. `Salvar_Contexto`

| Campo | Valor |
|---|---|
| **Tipo** | Alterar campo do contato → **Notas Internas** |
| **Quando** | os 6 eventos decisivos + antes de todo transbordo |
| **Modo** | Silencioso |
| **Campo obrigatório** | `text` — campos semânticos na linha 1 + autoavaliação na linha 2 |

### Os 6 momentos

| # | Momento | Gatilho exato |
|---|---|---|
| 1 | Agendou | sucesso de `realizar_agendamento` (E5/E10) |
| 2 | Remarcou | sucesso de `remarcar_agendamento` (E6) |
| 3 | Cancelou | sucesso de `cancelar_agendamento` (E6) |
| 4 | Objeção irredutível | E9, lead esfriou, sem agendamento |
| 5 | Finalização | E8, após a despedida e **antes** de `concluir_atendimento` |
| 6 | Follow-up | E12, com o texto do follow-up enviado registrado na nota |

**+ sempre antes de `transferir_atendimento`**, com `[ALERTA: motivo]`.

❌ Não salvar em transição de estágio.
❌ Não executar `concluir_atendimento` antes de confirmar o salvamento.

---

## 4. Estrutura do campo `text` — texto corrido, em 4 parágrafos

> 📌 **Como ler as citações de campo no resto desta skill.** Outros arquivos ainda citam nomes como `[DOR]`, `[ALERTA]`, `[PRÓXIMA_AÇÃO]` ou `[ÚLTIMA_MENSAGEM_*]` — em geral ao explicar para onde foi uma habilidade removida na v3. **Leia sempre como "a informação correspondente na nota"**, nunca como um campo literal a escrever. O formato é o texto corrido especificado aqui, e este arquivo é o dono dele.

> ⚠️ **Mudança de padrão (v4, agosto/2026).** Até então a nota era escrita em campos rotulados (`[ESTÁGIO: Ex] [NOME: ...]`). O formato era fácil de validar e ruim de ler: o humano que abre as Notas Internas do CRM lê um despejo de colchetes, não um resumo. A nota passou a ser **texto corrido**. Duas lições da migração, que valem para quem for portar um agente:
>
> 1. **A nota é lida por outros estágios.** O E0 abre pela próxima ação registrada, o E12 confere o último follow-up para não repeti-lo. Ao trocar o formato, esses pontos precisam passar a referenciar o **conteúdo** ("a última mensagem de follow-up registrada na nota"), não o nome do campo. Na Scopel isso ficou pendente por uma rodada e o E12 ficou sem como cumprir o próprio checklist.
> 2. **Prosa é menos extraível por máquina.** Se algum relatório precisar filtrar notas por urgência ou objeção, o campo rotulado facilitava. Confirmar com a clínica antes de assumir que ninguém consome a nota programaticamente.

O texto sai em 4 parágrafos, nesta ordem. A especificação abaixo é a **única** — é o que vai colado no campo `text` da habilidade no WTS, e é o que o modelo lê em produção:

> [Variável 'text'] OBRIGATÓRIO: escreva um resumo em texto corrido, narrativo, como uma pessoa contaria para outra — nunca em campos entre colchetes. Quatro parágrafos, nesta ordem:
> **(1) Identificação** — nome do lead, estágio atual concluído, origem (campanha ou orgânico).
> **(2) Perfil clínico e emocional** — a dor nas palavras do próprio lead, o nível de urgência e o motivo, o estado emocional, as objeções levantadas, e os campos extras que a clínica coletar (bairro, unidade, dados da criança). Sempre cite as frases marcantes dele entre aspas.
> **(3) Dados de sistema** — agendamento (data e hora, ou "nenhum"), dentista (ou "pendente"), o texto exato da última mensagem de follow-up (ou "nenhuma"), e o motivo do alerta se houver transbordo em aberto (ou "nenhum"). Nunca mencione tag ou etiqueta: quem aplica é o n8n, e afirmar isso seria registrar algo que você não sabe.
> **(4) Próxima ação e autoavaliação** — o que fazer no próximo atendimento, específico e acionável, nunca "continuar o fluxo"; depois um parágrafo começando com "Autoavaliação:", dizendo o que foi bom e o que foi ruim.
> Dado ainda não coletado se diz em texto ("telefone ainda não informado"), não se omite. Mantenha o que não mudou e atualize só o que evoluiu — nunca reescreva o histórico do zero.

A dor e a urgência entram sempre nas palavras do lead, nunca só no rótulo clínico — é o detalhe que permite personalizar quando ele voltar:

✅ "relatando que a prótese fica soltando na hora de comer"
❌ "dor de mastigação"

**Removido da v3:** o campo de tags. Não existem mais tags aplicadas pelo agente, e listar tags que o n8n aplicou seria o agente afirmando algo que ele não sabe. O que o CRM registrou está no CRM.

---

## 5. Limites do E11

- ❌ Usar campos entre colchetes — o formato é texto corrido.
- ❌ Omitir algum dos 4 parágrafos, ou deixar a próxima ação vaga ("continuar o fluxo").
- ❌ Escrever a dor só pelo rótulo clínico, sem as palavras do lead.
- ❌ Executar `concluir_atendimento` sem gravar.
- ❌ Gravar no meio do funil.
- ❌ Listar tags — não existem mais tags no agente.

---

## 6. Exemplos

✅ **Agendou (E5) — clínica com campanha:**
```
O atendimento de João (origem: campanha Dia do Sorriso Fixo) concluiu o Estágio E5, com agendamento confirmado.

João relatou um problema de mastigação: "minha prótese fica soltando na hora de comer". A urgência é alta, pela dor constante ao comer, e ele evita comer na frente dos outros. Esteve engajado e confirmou o Pacto sem resistência, sem nenhuma objeção. Frases-chave: "minha prótese fica soltando na hora de comer", "tenho vergonha de comer na frente dos outros".

Agendamento confirmado para 20/05 às 14:30, com {{nome_profissional_sugerido}}. Nenhuma última mensagem de follow-up registrada. Nenhum alerta em aberto.

Próxima ação: aguardar o comparecimento. Se ele voltar antes, confirmar o horário; se pedir mudança, ir para o E6 lembrando que a agenda da campanha é restrita aos dias 14 e 15.
Autoavaliação: o que foi bom: apliquei o Pacto de Honra sem resistência e ele confirmou de primeira. O que foi ruim: demorei a achar horário que encaixasse na rotina dele, ofereci três períodos antes de acertar.
```

✅ **Transbordo por loop de datas (E4):**
```
O atendimento de Ana (origem: orgânico) está no Estágio E4, aguardando encaminhamento humano.

Ana relatou uma dor estética: "não apareço em foto nenhuma há dois anos". A urgência é baixa. Ela se manteve paciente, mas começando a se frustrar, porque só consegue horário de manhã bem cedo — "só consigo de manhã bem cedo". Nenhuma objeção. Telefone ainda não informado.

Nenhum agendamento, dentista pendente, nenhuma última mensagem de follow-up. Alerta em aberto: 3 datas consecutivas sem disponibilidade no período que ela pediu, porque só pode antes das 8h.

Próxima ação: a atendente precisa verificar encaixe antes das 8h, que não aparece na agenda pública — Ana está disposta, o gargalo é só horário.
Autoavaliação: o que foi bom: identifiquei a restrição de horário dela cedo e não insisti em períodos que ela já tinha recusado. O que foi ruim: gastei três consultas de agenda antes de perceber que o horário dela está fora da janela padrão.
```

---

## 7. Replicabilidade

O sistema é idêntico em todos os agentes. Ajustar apenas:
- nome da clínica e do agente nas saudações do E0
- os dados extras que a clínica coleta e que entram no 2º parágrafo: origem, bairro, unidade
- a política de avaliação citada na próxima ação de reativação
