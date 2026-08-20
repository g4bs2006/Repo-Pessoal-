# Sistema de Memória de Longo Prazo (v3)

Este módulo documenta como implementar e operar a memória de longo prazo em qualquer agente odontológico. Usar sempre que o usuário solicitar configurar memória, contexto entre sessões, habilidades `Ler_Contexto`/`Salvar_Contexto`/`Registrar_Origem`, E0, E11 ou integração com n8n.

**Mudança principal da v3:** o resumo deixou de ser texto corrido em dois parágrafos e passou a usar **campos semânticos rotulados** (`[CAMPO: valor]`) na linha 1 + parágrafo de Autoavaliação na linha 2. E o salvamento passou a acontecer em **toda transição de estágio**, não só nos eventos finais.

---

## 1. Por Que Existe

Sem memória, a IA trata todo contato como paciente novo — repete SPIN, repergunta o nome e ignora agendamentos já feitos. O sistema resolve isso gravando e resgatando um resumo do atendimento no perfil do contato via API (n8n). Os campos rotulados garantem que o `Ler_Contexto` entregue informação **acionável**, não apenas um resumo narrativo.

---

## 2. Arquitetura da Engrenagem

```
[1] Paciente envia 1ª mensagem
        ↓
[2] (Se campanha) Trigger detectado → tag_Campanha → Registrar_Origem (silêncio)
        ↓
[3] IA aciona 'Ler_Contexto' em silêncio (n8n busca perfil via API)
        ↓
[4] IA atua pelo Caminho A, B ou C conforme retorno
        ↓
[5] A cada transição de estágio e evento → 'Salvar_Contexto' com campos semânticos
```

> Nota: na v2 havia uma "mensagem engessada" antes do Ler_Contexto para ganhar tempo. Na v3 (OB/Vassoler) o Ler_Contexto é o primeiro passo, antes de qualquer saudação — a saudação já sai personalizada pelo caminho.

---

## 3. As Habilidades de Memória

### 🔵 `Ler_Contexto`

| Campo | Valor |
|---|---|
| **Tipo** | Acionar API |
| **Quando acionar** | E0 — primeiro passo, antes de qualquer saudação; também no Passo 0 de praticamente todos os estágios e no E12 |
| **Modo** | Silencioso — o paciente não sabe que foi acionada |
| **Retorno: vazio / `[NENHUM HISTÓRICO]`** | → Caminho C (paciente novo) |
| **Retorno: histórico / objeções** | → Caminho B (retomar de onde parou) |
| **Retorno: AGENDADO** | → Caminho A (pular SPIN, só suporte) |

**Descrição da habilidade (colar no campo da WTS):**
> OBRIGATÓRIO: Esta é a habilidade de memória da clínica. Acione-a OBRIGATORIAMENTE no Estágio 0, como primeiro passo, ANTES de enviar qualquer mensagem ao paciente. Aguarde o retorno silenciosamente. O retorno definirá seu próximo passo: se retornar [NENHUM HISTÓRICO ENCONTRADO], trate como paciente novo e pergunte o nome (Caminho C). Se retornar histórico/objeções, retome a conversa com empatia de onde parou (Caminho B). Se retornar que está AGENDADO, pule o funil de vendas e apenas ofereça suporte (Caminho A). Nunca invente dados, baseie-se apenas no retorno desta ferramenta.

### 🟢 `Salvar_Contexto`

| Campo | Valor |
|---|---|
| **Tipo** | Alterar campo do contato → **Notas Internas** |
| **Quando acionar** | Toda transição de estágio + eventos (tabela na seção 6) |
| **Modo** | Silencioso |
| **Campo obrigatório** | `text` — campos semânticos + Autoavaliação |

**Descrição da habilidade (colar no campo da WTS):**
> OBRIGATÓRIO: Esta habilidade grava a memória de longo prazo do paciente. Acione-a sempre que o atendimento avançar de estágio, concluir agendamento, registrar objeção, cancelamento, remarcação ou finalização. Nunca encerre o atendimento sem executá-la. Siga as regras do Estágio 11.

### 🟠 `Registrar_Origem` (somente clínicas com campanha)

| Campo | Valor |
|---|---|
| **Tipo** | Acionar API |
| **Quando acionar** | **Apenas no E0**, quando a 1ª mensagem contém trigger de campanha |
| **Modo** | Silencioso, antes de qualquer saudação |
| **Campo `text`** | `[CAMPANHA]` nome, `[DATAS]` datas de interesse, `[TRIGGER]` trecho exato que ativou, `[CAMPANHA_ATIVA]` flag (ex: "DiaSorriso"), `[TAG_APLICADA]` (ex: "tag_CampanhaSorriso") |

O campo `[ORIGEM]` do Salvar_Contexto é derivado daqui e mantido em todos os estágios sem modificação.

---

## 4. Estrutura Obrigatória do Campo `text` (E11)

**Linha 1 — campos semânticos** (uma linha única com todos os campos):

```
[ESTÁGIO: Ex] [NOME: primeiro nome] [NOME_COMPLETO: nome e sobrenome — "pendente" antes do E5]
[TELEFONE: número com DDD — "pendente" antes do E5] [DOR: tipo — detalhe com as palavras do lead]
[URGÊNCIA: alta/baixa — motivo resumido] [OBJEÇÕES: tipo ou nenhuma]
[ESTADO_EMOCIONAL: receptivo / hesitante / engajado / frio / impaciente]
[FRASES_CHAVE: "frase exata do lead", "outra frase marcante"]
[AGENDAMENTO: data e horário confirmados, ou nenhum] [DENTISTA: nome retornado ou pendente]
[ÚLTIMA_MENSAGEM_<AGENTE>: texto exato do último follow-up ou nenhuma] [TAGS: tags aplicadas]
[PRÓXIMA_AÇÃO: instrução direta e específica para o próximo estágio]
```

**Linha 2 — Autoavaliação:**
```
Autoavaliação: O que foi bom: [análise]. O que foi ruim: [análise].
```

**Campos extras por clínica:**
- `[ORIGEM: campanha X / orgânico]` — clínicas com campanha (OB Clinic, 15 campos no total)
- `[BAIRRO: ... — "pendente" antes do E5]` — clínicas que coletam bairro (Vassoler, 14 campos no total)

**Regra de atualização acumulativa:** ao salvar, manter os campos anteriores que não mudaram — só substituir o que evoluiu. O histórico completo fica sempre acessível no próximo `Ler_Contexto`.

**Descrição do campo `text` (colar no campo da WTS, ajustar lista de campos à clínica):**
> [Variável 'text'] OBRIGATÓRIO: Preencha todos os campos semânticos na linha 1 — [ESTÁGIO], [NOME], [NOME_COMPLETO], [TELEFONE], [DOR], [URGÊNCIA], [OBJEÇÕES], [ESTADO_EMOCIONAL], [FRASES_CHAVE], [AGENDAMENTO], [DENTISTA], [ÚLTIMA_MENSAGEM_X], [TAGS], [PRÓXIMA_AÇÃO]. Os campos de dados cadastrais devem ser "pendente" antes do E5 e reais a partir do E5. Na linha 2, escreva o parágrafo de Autoavaliação iniciando com "Autoavaliação:" descrevendo o que foi bom e o que foi ruim neste estágio. Mantenha os campos anteriores que não mudaram. Siga as regras do Estágio 11.

---

## 5. Os 3 Caminhos Pós-Leitura (Estágio 0)

| Caminho | Condição | Ação da IA |
|---|---|---|
| **A — Agendado** | Status AGENDADO | Pular SPIN. Cumprimentar pelo nome, lembrar da avaliação marcada, oferecer suporte (remarcar/cancelar → E6, dúvida → E9, confirmar → E8) |
| **B — Histórico/Objeção** | Histórico ou objeções pendentes | Pular coleta de nome. Cumprimentar pelo nome, retomar empaticamente do ponto onde parou → E1 |
| **C — Sem Histórico** | Vazio / `[NENHUM HISTÓRICO]` | Tratar como novo. Apresentar-se, coletar nome → `alterar_campo_contato (Nome)` → E1 |

**Restrições absolutas do E0:**
- ❌ Enviar qualquer mensagem antes do retorno do `Ler_Contexto` (exceto quando a clínica usa saudação engessada — padrão v2 legado)
- ❌ Perguntar o nome se a habilidade já retornou o nome no histórico
- ❌ Fazer perguntas ao paciente enquanto aguarda o retorno

---

## 6. Gatilhos de Salvamento (v3 — toda transição)

| Momento | Evento |
|---|---|
| E1 → E2 | Transição com dor classificada |
| E2 → E3 | Transição com implicação registrada |
| E3 → E4 | Convite aceito |
| E4 → E5 | Horário escolhido |
| **E5 / E10** | Agendamento confirmado — após `realizar_agendamento` + `tag_Agendou` + `Cliente Agendou - IA` |
| **E6** | Remarcação (após `tag_Remarcou`) ou cancelamento (após `tag_Cancelou`) |
| **E8** | Finalização — ANTES de `concluir_atendimento`, logo após a despedida |
| **E9** | Objeção irredutível (lead esfriou) |
| **E12** | Follow-up enviado — atualizar `[ÚLTIMA_MENSAGEM_*]` com o texto exato |

**Restrições absolutas do E11:**
- ❌ Omitir qualquer campo semântico
- ❌ Deixar `[FRASES_CHAVE]` vazio se o lead disse algo marcante — é o que permite personalização real depois
- ❌ Deixar `[PRÓXIMA_AÇÃO]` vago (ex: "continuar o fluxo") — deve ser instrução específica e acionável
- ❌ Avançar de estágio sem atualizar o contexto
- ❌ Executar `concluir_atendimento` antes de confirmar o salvamento

---

## 7. Exemplos de Notas Bem Formatadas

✅ **Transição E1 → E2:**
```
[ESTÁGIO: E1] [NOME: João] [NOME_COMPLETO: pendente] [TELEFONE: pendente] [DOR: mastigação — perdeu um dente e usa prótese frouxa] [URGÊNCIA: alta — relatou dor constante ao comer] [OBJEÇÕES: nenhuma] [ESTADO_EMOCIONAL: receptivo, explicou a dor claramente] [FRASES_CHAVE: "minha prótese fica soltando na hora de comer", "tenho vergonha de comer na frente dos outros"] [AGENDAMENTO: nenhum] [DENTISTA: pendente] [ÚLTIMA_MENSAGEM_GI: nenhuma] [TAGS: Marcar_Dor_Mastigacao, Classificar_Urgencia_Alta] [ORIGEM: orgânico] [PRÓXIMA_AÇÃO: entrar no E2 perguntando a implicação — focar em alimentos que João parou de comer]

Autoavaliação: O que foi bom: O paciente explicou a dor claramente logo de início. O que foi ruim: Pareceu apressado para saber o preço, precisei contornar com cuidado.
```

✅ **Agendou (E5):**
```
[ESTÁGIO: E5] [NOME: João] [NOME_COMPLETO: João Silva] [TELEFONE: 47 99999-0000] [DOR: mastigação — prótese frouxa, evita comer na frente dos outros] [URGÊNCIA: alta] [OBJEÇÕES: nenhuma] [ESTADO_EMOCIONAL: engajado, confirmou o pacto sem resistência] [FRASES_CHAVE: "minha prótese fica soltando na hora de comer"] [AGENDAMENTO: 20/05 às 14:30 — confirmado] [DENTISTA: {{nome_profissional_sugerido}}] [ÚLTIMA_MENSAGEM_GI: nenhuma] [TAGS: Marcar_Dor_Mastigacao, Classificar_Urgencia_Alta, Cliente Agendou - IA] [ORIGEM: orgânico] [PRÓXIMA_AÇÃO: aguardar comparecimento — se retornar antes, oferecer confirmação ou remarcação no E6]

Autoavaliação: O que foi bom: Apliquei o Pacto de Honra sem resistência. O que foi ruim: Demorei a achar horário que encaixasse na rotina dele.
```

✅ **Objeção irredutível (E9):**
```
[ESTÁGIO: E9] [NOME: João] [NOME_COMPLETO: pendente] [TELEFONE: pendente] [DOR: mastigação — prótese frouxa] [URGÊNCIA: alta] [OBJEÇÕES: preço — disse não ter condições financeiras agora] [ESTADO_EMOCIONAL: frio, recuou ao saber que o valor só sai na avaliação presencial] [FRASES_CHAVE: "não tenho dinheiro agora"] [AGENDAMENTO: nenhum] [DENTISTA: pendente] [ÚLTIMA_MENSAGEM_GI: nenhuma] [TAGS: Marcar_Dor_Mastigacao, Classificar_Urgencia_Alta] [ORIGEM: orgânico] [PRÓXIMA_AÇÃO: não forçar agendamento — se retornar, reoferecer a campanha e focar nas condições de pagamento facilitadas]

Autoavaliação: O que foi bom: A escuta ativa no E2 gerou conexão. O que foi ruim: O lead recuou quando entendeu que o valor é presencial.
```

---

## 8. Replicabilidade para Outros Agentes

O sistema é idêntico em todos os agentes. Ajustar apenas:
- Nome da clínica e do agente nas saudações do E0
- Nome do campo `[ÚLTIMA_MENSAGEM_<AGENTE>]` (padronizar com o nome do agente — ver nota de duplicação em `arquitetura.md`)
- Campos extras: `[ORIGEM]` (se campanha), `[BAIRRO]` (se coletado)
- Tags específicas da clínica
- Política de avaliação citada na `[PRÓXIMA_AÇÃO]` de reativação
