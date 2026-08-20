# Variações por Clínica e Regras Especiais — Padrão Luna (v4)

Cada variação abaixo lista **onde ela toca** nos arquivos. Na v4 a maioria das variações que na v3 exigia tag agora exige apenas um campo na nota — o que reduz bastante o custo de configurar uma clínica nova.

---

## Campanha com trigger na primeira mensagem

Quando a clínica roda anúncio que gera mensagem padrão (ex: "Quero participar do Dia do Sorriso Fixo").

| Onde | O que fazer |
|---|---|
| **E0** | Detectar o trigger na 1ª mensagem e guardar internamente `campanha_ativa` + a origem. ❌ Sem chamar habilidade — não existe mais `Registrar_Origem` nem `tag_Campanha` |
| **E0 Caminho C** | A saudação cita a campanha e as datas: "Vou te ajudar a garantir a sua avaliação nos dias 14 ou 15 de maio" |
| **E1** | Variante Campanha: pular a pergunta aberta e ancorar no produto ("Então você está buscando um sorriso fixo, certo? É mais por conforto na hora de comer, ou pela aparência?") |
| **E4** | Se a campanha tem datas fixas, pular a sondagem de período e consultar direto essas datas |
| **E11** | Campo `[ORIGEM: campanha X / orgânico]`, preenchido no primeiro `Salvar_Contexto` e nunca omitido depois |
| **E12** | Reativação modo benefício: a campanha ativa é o gancho |
| **n8n** | A etiqueta de origem de lead (Meta / Instagram / Facebook / Orgânico) é aplicada pela automação de `SESSION_NEW`, que é um fluxo **separado** do agendamento. Se a clínica precisa da etiqueta de campanha no CRM, é ali que ela nasce |

---

## Política de avaliação — modelos

### Voucher de campanha (ex: OB Clinic)
- "A sua avaliação faz parte de uma condição especial da nossa campanha, então não há custo nesse primeiro momento 😊"
- ❌ "grátis", "gratuita", "sem compromisso"

### Cortesia solidária (ex: Vassoler)
- Avaliação em troca de **1kg de alimento não perecível**, doado para asilos e casas de repouso da região
- Sempre "cortesia solidária" — e o agente demonstra **orgulho** do modelo, não desconto
- Se perguntarem "é gratuita?": "A avaliação é uma cortesia solidária 💛 Pedimos apenas a contribuição de 1kg de alimento não perecível para os asilos da região."
- ❌ "totalmente gratuita", "sem custo", "grátis"

### Sem custo (ex: Atos)
- "avaliação sem custo", "É um horário reservado pro especialista analisar seu caso"
- ❌ "grátis", "gratuita"

---

## Múltiplos dentistas com dias restritos

- **Regra interna, nunca revelada ao paciente.** Ex: um profissional não atende terças, outro não atende segundas e sextas.
- O n8n escolhe o profissional disponível; o agente diz "dentista responsável" antes do agendamento e usa `{{nome_profissional_sugerido}}` depois.
- ❌ Citar nome de dentista antes do agendamento confirmado (invariante 7).
- No n8n: profissional principal + `profissional_fallback`, com os IDs do Clinicorp. Ver `integracao-n8n.md`.

---

## Faixa etária e odontopediatria

| Modelo | Exemplo | Regra |
|---|---|---|
| Sem odontopediatria | OB Clinic (13+) | Lead abaixo da idade mínima → `Salvar_Contexto` com `[ALERTA: lead abaixo da idade mínima]` → frase → `transferir_atendimento` |
| Com odontopediatria | Vassoler (1+), Instituto Frazão (2+) | Nunca recusar por idade; segue o fluxo infantil |

### Fluxo infantil

| Onde | O que muda |
|---|---|
| **E1** | Identificar menção a filho, filha, neto, criança. Acolher com entusiasmo. Coletar nome da criança, idade e motivo — **um por mensagem**. Tom voltado ao responsável, linguagem adaptada ("o dentinho dele") |
| **E4/E5** | Respeitar os dias válidos da especialista (regra interna) |
| **E5** | Coletar o nome do responsável. Pacto de Honra com `👤 Responsável` e `👶 Criança` |
| **E8** | Variante pediátrica de despedida |
| **Constraints** | Dias da especialista; sedação apresentada como recurso disponível, nunca como padrão; especialista mencionada pelo nome (aqui o nome é permitido, porque é a especialidade que define o profissional, não a agenda) |
| **Persona** | Seção 4 — contexto pediátrico |

---

## Duas unidades

| Onde | O que muda |
|---|---|
| **E4** | Perguntar a unidade **antes** de `verificar_disponibilidade`: "Temos duas unidades em [Cidade] 😊 Qual fica mais perto: [U1] ou [U2]?" |
| **E5** | Pacto de Honra com `🏥 Unidade` |
| **E8** | Endereço da unidade confirmada, nunca das duas |
| **E11** | Campo `[UNIDADE: nome / nao_definida]` |
| **Constraints** | ❌ Proibido acionar `verificar_disponibilidade` sem unidade definida |
| **n8n** | Config multi-unidade no node `Configuracao Unidades` — cada unidade tem seu `link_agenda` e seus profissionais. Bazacas é a referência de multi-unidade |

---

## Dados extras de agendamento por clínica

| Perfil | Dados obrigatórios | Nunca coletar |
|---|---|---|
| Padrão v4 | Nome Completo + Telefone com DDD | nascimento, e-mail, CPF |
| Com bairro (ex: Vassoler) | + Bairro | idem |
| Legado v2 | Nome + Nascimento + Telefone | — |

Na v4 o padrão é **não** coletar data de nascimento. Cada campo extra é um turno a mais antes do Pacto, e cada turno a mais é uma chance de o lead sair. Confirmar com a clínica antes de incluir qualquer campo.

---

## Filtros de agendamento

### Bloqueio por consulta recente
Ex: 15 dias. Verificar no E5 se já existe consulta na janela; se sim, informar e redirecionar para E7 (verificar) ou E6 (remarcar), nunca criar um segundo agendamento.

### Feriados
`_BK_feriados.csv` consultado no E4, em toda clínica. Nunca oferecer nem confirmar data de feriado. O workflow n8n **não** bloqueia feriado sozinho — a responsabilidade é do agente.

---

## RX panorâmico externo

- Mencionar **só no E8**, depois de confirmar o agendamento. Nunca antes, e nunca como exigência.
- Tem: "Pode trazer ou enviar pelo WhatsApp 😊" · Não tem: "Sem problema, não é obrigatório." · Não sabe: "É uma chapinha dos dentes. Pode vir sem ela."
- Clínicas com radiologia própria: citar como diferencial no BK, não como coisa a providenciar.

> Erro conhecido de produção: citar RX no E3/E5 faz o paciente pensar que o objetivo da visita é o exame, não o diagnóstico. Ver `correcoes.md`, problema 7.

---

## Objeção de acompanhante

Quando o paciente precisa consultar cônjuge ou familiar:
> "Faz todo sentido! Que tal trazer essa pessoa na avaliação? Assim vocês saem com todas as informações."

Aceitou → agendar normalmente. Declinou → tentar agendar com o argumento de levar as informações depois.

---

## O que o agente resolve sozinho

Remarcação (E6), cancelamento (E6) e consulta de agendamento (E7) são **operação do agente**. Transbordo só em erro técnico intransponível.

Transbordo é reservado para: rispidez, pedido explícito de humano, dúvida factual fora do BK, caso clínico urgente, erro técnico, lead abaixo da idade mínima e paciente antigo — este último por `transferir_atendimento_paciente`, que é rota de qualificação e não escalonamento.
