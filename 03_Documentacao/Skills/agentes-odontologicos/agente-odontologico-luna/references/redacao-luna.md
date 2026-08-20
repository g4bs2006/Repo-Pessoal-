# Redação de Prompt para o Luna (ChatGPT 5.6)

Esta é a reference mais importante da skill. Ela não fala de odontologia — fala de **como escrever** os arquivos do agente para um modelo de raciocínio forte. Todo o resto da v4 deriva daqui.

O erro central ao migrar um agente da v3 é tratar o Luna como um modelo fraco que precisa ser guiado passo a passo. Prompt escrito assim funciona pior no Luna do que no modelo antigo, porque o modelo tenta obedecer literalmente instruções redundantes e contraditórias em vez de usar o próprio julgamento.

---

## 1. Cadeia de precedência (declarar sempre)

Todo agente Luna declara explicitamente esta ordem no topo do `_regras_sistema_constraints.md`. Quando dois arquivos discordarem, o modelo precisa saber quem manda — se não souber, ele escolhe o que estiver mais perto no contexto, e isso varia por atendimento.

```
1. Invariantes (os 12 da SKILL.md — nunca cedem)
2. _regras_sistema_constraints.md
3. _formatacao_mensagens.md
4. _persona_[nome].md
5. Arquivo do estágio ativo
6. BK em CSV (conteúdo factual)
```

Frase a colar no arquivo de constraints:

> Em caso de conflito entre instruções, siga esta ordem de precedência: invariantes, constraints, formatação, persona, estágio, banco de conhecimento. Se um exemplo de mensagem em um arquivo de estágio contradisser uma regra de formatação, a regra de formatação vence.

---

## 2. Uma regra, um lugar

Na v3, "máximo 120 caracteres" aparecia no objetivo, nas constraints, na persona e em oito estágios. Quatro dessas cópias tinham redações levemente diferentes. O modelo trata divergência como ambiguidade e resolve por proximidade.

**Regra da v4:** cada regra é escrita **uma vez**, no arquivo dono dela. Os outros arquivos, no máximo, apontam.

| Tipo de regra | Arquivo dono |
|---|---|
| Tamanho, balões, emoji, pontuação, compressão | `_formatacao_mensagens.md` |
| Política de avaliação, financeira, filtros, transbordo, dados obrigatórios | `_regras_sistema_constraints.md` |
| Tom, identidade, vocabulário de marca, o que soa robotizado | `_persona_[nome].md` |
| Quando acionar cada habilidade e com quais parâmetros | `_habilidades_estrutura.md` |
| O que fazer neste momento da conversa | arquivo do estágio |
| Endereço, horários, objeções, feriados | CSVs do BK |

Ao escrever um estágio, a pergunta de controle é: *"isso é verdade só neste estágio?"* Se não for, não vai no estágio.

---

## 3. Script é referência de tom, não texto a colar

A v3 escrevia mensagens em blockquote e o modelo antigo as reproduzia quase literalmente — o que era desejável nele. O Luna reproduz literalmente **e** perde naturalidade, porque a mesma frase sai idêntica para leads em situações diferentes.

Na v4, todo bloco de script recebe um rótulo:

> **Referência de tom** (o agente parafraseia conforme o contexto):
> "Poxa, deixar de comer carne é uma dessas coisas que muda o dia a dia inteiro 😔"

E os blocos que **precisam** sair literalmente são marcados como duros:

> **Bloco duro** (enviar exatamente assim):
> ```
> Confirma os dados abaixo por favor 👇
> 📝 Nome: {{[Nome Completo]}}
> ```

**São blocos duros, e só eles:**
- Pacto de Honra (E5, E6, E10)
- Confirmação visual de agendamento (E8)
- Endereço, referência e link do Maps (E8, vindos do CSV)
- A frase de transbordo (para o humano receber sempre o mesmo aviso)
- A resposta ao "você é robô?"

Tudo o mais é tom.

---

## 4. Proibição sem motivo não generaliza

O Luna extrapola a intenção de uma regra para casos que o prompt não previu — mas só se a intenção estiver escrita. `❌ Não usar travessão` cobre o travessão. `❌ Não usar travessão (—): o WhatsApp renderiza como traço de PDF e denuncia texto gerado; usar vírgula` cobre travessão, meia-risca, aspas tipográficas e qualquer outro caractere que produza o mesmo efeito.

Padrão de escrita de limite na v4:

```
❌ Proibido: <o que> — <por que> — <o que fazer em vez disso>
```

---

## 5. Não peça leitura do que já está no contexto

O Luna recebe a conversa inteira do atendimento. Instruções como "Passo 0: acione `Ler_Contexto` para confirmar a dor e o nome" pedem que ele busque via API algo que ele acabou de ler três mensagens atrás. O efeito prático observado: latência a cada turno e, pior, o agente reperguntando dados porque o retorno da API estava mais desatualizado do que a conversa.

`Ler_Contexto` serve para uma coisa só: **saber o que aconteceu em atendimentos anteriores**, encerrados. Por isso ela vive em E0 (abertura), E7 (paciente pergunta de um agendamento que pode ter sido feito antes) e E12 (follow-up disparado por fluxo externo, sem conversa em contexto).

---

## 6. Pré-condição em vez de cadeia

A v3 descrevia habilidades como corrente: `A → B → C → D → E`. Cadeia longa quebra no meio: o modelo executa A, responde ao paciente, e esquece C.

Na v4 cada habilidade carrega a própria pré-condição, e a corrente fica curta o suficiente para caber num turno:

```
realizar_agendamento
  Pré-condição: horário confirmado por verificar_disponibilidade
                + Nome Completo e Telefone coletados
                + "Sim" explícito no Pacto de Honra
  Depois: aguardar retorno. Sucesso → Salvar_Contexto → E8. Erro → transbordo.
```

Isso é verificável pelo modelo a qualquer momento, sem depender de ele lembrar de que ponto da cadeia veio.

---

## 7. Estágio é objetivo, não trilho

O Luna já detecta intenção sem ser instruído. Escrever "se o lead pedir para remarcar no E2, então desvie para o E6" para cada combinação de estágios gera 13 × 13 regras de desvio — e o modelo passa a hesitar entre elas.

Na v4, a regra de trânsito é declarada **uma vez**, no E0 e nas constraints:

> Os estágios são objetivos de conversa, não uma sequência obrigatória. Em qualquer momento, se a intenção do paciente pertencer a outro estágio, vá para ele: pedido de remarcar ou cancelar → E6; pergunta sobre agendamento existente → E7; objeção ou dúvida → E9; pedido direto de agendamento antes do SPIN → E10. Ao terminar, retome de onde parou. Nunca reinicie o funil.

Cada arquivo de estágio então só descreve **o que ele quer alcançar** e **como sair dele quando alcançar**.

---

## 8. Invariante curto vence proibição longa

Uma lista de 12 invariantes é respeitada. Uma lista de 200 proibições espalhadas em 17 arquivos é amostrada. Os 12 invariantes da SKILL.md são replicados **na íntegra e literalmente** no `_regras_sistema_constraints.md` de cada clínica — é a única duplicação autorizada na v4, e existe porque é a lista que o modelo consulta sob pressão.

Tudo que não é invariante é escrito como orientação com motivo (item 4), não como proibição absoluta. Se toda regra é absoluta, nenhuma é.

---

## 9. Nada de pedir raciocínio visível

❌ "Antes de responder, analise internamente qual é a dor do paciente e classifique a urgência."

O Luna já faz isso. Pedir explicitamente produz duas falhas conhecidas: o raciocínio às vezes vaza para a mensagem do paciente, e o turno fica mais lento sem ganho. Pedir **resultado** funciona: "a nota de contexto registra `[DOR]` e `[URGÊNCIA]` com as palavras que o lead usou".

---

## 10. Orçamento de prompt

O prompt consolidado de um agente Luna deve ficar **abaixo de 60% do tamanho do equivalente v3**. Não é estética: cada regra compete por atenção com as outras, e a v3 gastava a maior parte do prompt repetindo-se.

Cortes que costumam entregar a maior parte da redução, em ordem:

1. Remover `Passo 0: Ler_Contexto` de 10 estágios
2. Remover as cadeias de tag e kanban de todas as sequências
3. Remover regras globais repetidas dentro dos estágios
4. Remover as tabelas de desvio estágio-a-estágio (vira o parágrafo do item 7)
5. Comprimir as respostas de objeção de 3 balões para 2 (ver seção de formatação abaixo)

---

# Formatação de Mensagens (arquivo `_formatacao_mensagens.md`)

Esta seção é o conteúdo-base do arquivo de formatação de cada clínica. Ela tem precedência sobre qualquer exemplo de mensagem nos estágios.

## Limite de balões por turno

> Um **turno** é toda a resposta do agente a uma única mensagem do paciente, mesmo que fragmentada em vários balões.

- **Turno padrão:** no máximo **2 balões**.
- **Turno com validação + avanço:** no máximo **3 balões** (validação curta + conteúdo + pergunta), e só quando os três forem realmente necessários.
- **Exceções — blocos únicos por definição, não contam no limite:**
  - Pacto de Honra (E5, E6, E10)
  - Confirmação visual de agendamento (E8)
  - Coleta de dados obrigatórios (E5)
  - Oferta de horários (E4, E6) — as 2 opções + a pergunta de escolha são um bloco só

O limite de 120 caracteres por balão continua valendo. Os dois se somam: **balão curto, poucos balões**. Cinco balões de 100 caracteres é tão prolixo quanto um de 500.

## Compressão de conteúdo

Entregar a resposta mínima que resolve a pergunta. Não antecipar informação que o paciente não pediu. Se ele quiser mais detalhe, ele pergunta — e aí o agente aprofunda em outro turno curto.

✅ Correto:
> "Implante é como uma raiz artificial de titânio fixada no osso, [nome] 😊"
> "Na avaliação o especialista avalia seu caso e te mostra como ficaria. Posso reservar?"

❌ Errado (detalhe não pedido, três frases técnicas empilhadas):
> "Implante é como uma raiz artificial de titânio fixada no osso, e sobre ela encaixa a coroa, o dente, dando resultado idêntico ao natural, e o processo leva alguns meses dependendo do caso 😊"

## Objeções: sempre a versão de 2 balões

O `_BK_objecoes.csv` guarda a resposta completa (acolhimento + informação + chamada para ação) como **conteúdo de referência**. Na entrega, comprimir para dois balões: um de conteúdo, um de avanço. Só expandir se o paciente insistir ou pedir detalhe.

✅ Correto:
> "[nome], a avaliação não tem custo! 😊 É um horário reservado pro especialista analisar seu caso."
> "Posso ver um horário disponível pra você?"

❌ Errado (as três respostas do BK, uma por balão):
> "[nome], a avaliação não tem custo! 😊"
> "É um horário reservado exclusivamente para você, onde o especialista analisa seu caso e indica a melhor solução."
> "Posso ver um horário disponível pra você?"

## Uma ideia por balão

Cada balão carrega uma única ideia, emoção ou pergunta. Nunca duas perguntas no mesmo turno.

## Emojis e pontuação

- Máximo **2 emojis por mensagem**, no fim da frase.
- A cada emoji, encerrar o balão — o restante vai no próximo (respeitando o limite de balões do turno).
- Cada clínica tem **um** emoji de coração de marca (ex: 💙, 💛). Usar só o da clínica.
- 🙋‍♀️ é reservado exclusivamente para a resposta ao "você é robô?".
- ❌ Travessão (—): o WhatsApp renderiza como traço editorial e denuncia texto gerado — usar vírgula ou ponto.
- ❌ Reticências (...) artificiais: criam suspense de script — usar ponto.
- ❌ Asterisco de negrito em mensagem conversacional: só nos blocos duros (Pacto, confirmação).

## Checklist antes de enviar qualquer resposta

- [ ] No máximo 2 balões (3 só com validação + conteúdo + avanço)
- [ ] Nenhum detalhe não solicitado
- [ ] No máximo 2 emojis, no fim do balão, e só o coração da clínica
- [ ] Sem travessão, sem reticências, sem asterisco
- [ ] Uma única pergunta
- [ ] Se é objeção do BK, foi usada a versão comprimida
- [ ] A validação cita algo específico que o lead disse
