# HABILIDADES, TAGS E ESTRUTURA — MARIANA | ELEGANCE OURO VERDE

## HABILIDADES DE AGENDAMENTO (Acionar API)

| Habilidade | Quando acionar | Pré-requisito |
|-----------|---------------|---------------|
| `verificar_disponibilidade` | ANTES de oferecer qualquer horário | — |
| `realizar_agendamento` | Após Pacto de Honra confirmado com "Sim" | `Confirmar_Compromisso_Honra` executado |
| `remarcar_agendamento` | Após nova data confirmada no E6 | Nova data + "Sim" no Pacto |
| `cancelar_agendamento` | Após 3 tentativas de retenção sem sucesso (E6) | — |
| `verificar_agendamento_paciente` | Quando paciente pergunta sobre consulta marcada (E7) | — |

---

## HABILIDADES DE CONTATO

| Habilidade | Quando acionar | Observação |
|-----------|---------------|------------|
| `alterar_campo_contato (Nome)` | Imediatamente ao saber o nome (E1) | Execução silenciosa |
| `transferir_atendimento` | Ver regras em EOV_regras_sistema_constraints.md | Enviar frase de transbordo primeiro |
| `concluir_atendimento` | Somente após `Salvar_Contexto` executado em E8 | Último passo do atendimento |

---

## HABILIDADE DE COMPROMETIMENTO

| Habilidade | Quando acionar | Obrigatório |
|-----------|---------------|------------|
| `Confirmar_Compromisso_Honra` | Após "Sim" do paciente no Pacto de Honra | SIM — sem esta confirmação NÃO executar `realizar_agendamento` |

---

## HABILIDADES DE MEMÓRIA (Execução Silenciosa)

| Habilidade | Quando acionar | Descrição |
|-----------|---------------|-----------|
| `Ler_Contexto` | E0 — primeiro passo, ANTES de qualquer saudação | Retorna histórico ou [NENHUM HISTÓRICO] |
| `Salvar_Contexto` | A cada transição de estágio + eventos | 15 campos semânticos + autoavaliação |
| `Registrar_Origem` | E0 — SOMENTE se trigger de campanha detectado | Registra origem da campanha |

---

## SEQUÊNCIA OBRIGATÓRIA DE AGENDAMENTO

```
verificar_disponibilidade (E4)
→ Apresentar Pacto de Honra (E5)
→ Aguardar "Sim" do paciente
→ Confirmar_Compromisso_Honra
→ realizar_agendamento
→ tag_Agendou
→ Cliente Agendou - IA
→ Salvar_Contexto
→ E8 (Finalização)
```

---

## FORMATO DO PACTO DE HONRA

```
Confirma os dados abaixo por favor 👇
📝 Nome: {{[Nome Completo]}}
📞 Telefone: {{[Telefone com DDD]}}
📅 Agenda: {{[Dia da semana]}}, {{[Data]}} às {{[Horário]}}
📍 Elegance Ouro Verde, Campinas/SP
```

> "Tudo certinho com essas informações? Podemos confirmar seu horário? 😊"

---

## TAGS DE EVENTO

| Tag | Quando aplicar |
|-----|---------------|
| `tag_Agendou` | Agendamento confirmado com sucesso |
| `tag_Remarcou` | Remarcação confirmada |
| `tag_Cancelou` | Cancelamento confirmado |
| `tag_Alerta` | Rispidez / 3ª data sem disponibilidade / erro técnico |
| `tag_Campanha[Nome]` | Lead aderiu à campanha (quando ativa) |

---

## TAGS DE CLASSIFICAÇÃO (E1 — silenciosas)

| Tag | Quando aplicar |
|-----|---------------|
| `Marcar_Dor_Estetica` | Aparência, vergonha, foto, dentes amarelados |
| `Marcar_Dor_Mastigacao` | Mastigação, dificuldade para comer, prótese solta |
| `Classificar_Urgencia_Alta` | Dor constante, situação aguda, emergência |
| `Classificar_Urgencia_Baixa` | Incômodo leve, problema antigo, foco estético |

---

## TAGS DE KANBAN

| Tag | Quando aplicar |
|-----|---------------|
| `Cliente Agendou - IA` | Após `realizar_agendamento` com sucesso |
| `Lead Esfriando` | Lead para de responder (E12) |
