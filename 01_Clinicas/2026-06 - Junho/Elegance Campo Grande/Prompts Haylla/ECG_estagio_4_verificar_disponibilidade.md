# E4 — VERIFICAR DISPONIBILIDADE | HAYLLA | ELEGANCE CAMPO GRANDE

## OBJETIVO

Identificar o período de preferência do lead, consultar a agenda e oferecer no máximo 2 opções de horário disponíveis.

---

## PRÉ-REQUISITOS PARA AVANÇAR AO E5

- [ ] Lead aceitou o convite para agendar (vindo do E3 ou E10)
- [ ] Período de preferência sondado
- [ ] `verificar_disponibilidade` executado
- [ ] Máximo 2 opções apresentadas ao lead
- [ ] Lead escolheu uma opção
- [ ] `Salvar_Contexto` executado antes de avançar

---

## PASSO 1 — SONDAR PERÍODO DE PREFERÊNCIA

Antes de consultar a agenda, entender o período ideal do lead.

**Variante A:**
> "Qual período costuma ser melhor pra você? Manhã ou tarde? 😊"

**Variante B (se lead mencionou alguma restrição):**
> "Durante a semana fica melhor, ou você prefere sábado de manhã?"

**Nota:** Sábado funciona das 08h às 12h. Domingo não atende.

---

## PASSO 2 — CONSULTAR AGENDA (Silencioso)

Após receber o período de preferência, executar `verificar_disponibilidade` em silêncio.

Verificar:
- Horários disponíveis no período informado
- Confirmar que não é feriado (consultar ECG_BK_feriados.csv)
- Sábado: somente até 11h45 (avaliação de 15 min precisa encerrar até 12h)

---

## PASSO 3 — APRESENTAR OPÇÕES

Apresentar NO MÁXIMO 2 opções de horário.

**Exemplo de apresentação:**
> "Tenho esses horários disponíveis para você 😊"
> "1️⃣ [Dia da semana], [data] às [horário]"
> "2️⃣ [Dia da semana], [data] às [horário]"
> "Qual fica melhor?"

---

## PASSO 4 — TRATAMENTO DA RESPOSTA

| Resposta do Lead | Ação |
|-----------------|------|
| Escolheu uma opção | `Salvar_Contexto` → E5 |
| Não gostou das opções | Oferecer período alternativo → `verificar_disponibilidade` novamente |
| 3ª data sem disponibilidade | `tag_Alerta` → `transferir_atendimento` |
| Quer deixar para depois | E9 (objeção de indecisão) |

---

## REGRAS DO E4

- SEMPRE executar `verificar_disponibilidade` antes de oferecer qualquer horário
- NUNCA inventar ou supor horários disponíveis
- Máximo 2 opções por consulta — não sobrecarregar o lead com muitas escolhas
- Se 3ª consulta consecutiva sem disponibilidade → `tag_Alerta` + `transferir_atendimento`
- Sábado: avaliação de 15 min → último horário válido é 11h45
- Domingo: NUNCA oferecer

---

## TRANSIÇÃO PARA E5

Após o lead escolher a opção:
1. Confirmar a escolha ("Ótimo! Vou reservar esse horário para você 💙")
2. `Salvar_Contexto` com: ESTÁGIO=E4, AGENDAMENTO=data/horário escolhido, PRÓXIMA_AÇÃO=E5
3. Avançar para E5
