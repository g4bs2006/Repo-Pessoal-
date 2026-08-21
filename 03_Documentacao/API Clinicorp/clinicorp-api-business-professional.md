# API Clinicorp — business, professional e group (descoberta automática de config)

Levantamento feito em 2026-08-19, complementar ao `clinicorp-api.md` (que
documentou a tag `patient` e a técnica de extração do spec). Objetivo aqui:
mapear os endpoints que permitem preencher `business_id`, o id do profissional
e a duração do slot **sem** a clínica precisar informar esses números — só
usuário API, token e o link da agenda, que é o que o Gabriel já recebe no
onboarding.

## Como o spec foi obtido

Mesma técnica do `clinicorp-api.md`: o `swagger.json` estático não existe.
`https://sistema.clinicorp.com/api-docs/swagger-initializer.js` (o
inicializador *padrão* do swagger-ui-dist) está com a URL de exemplo da
lib (`petstore.swagger.io`) e não serve pra nada. O spec real de verdade —
OpenAPI 3.0.1, 49 paths — vem embutido inline em
**`https://sistema.clinicorp.com/api-docs/swagger-ui-init.js`** (nome
parecido, arquivo diferente), dentro de `options.swaggerDoc`. Baixar esse
arquivo e extrair o objeto JSON (a partir do primeiro `{` depois de
`"swaggerDoc":`, balanceando chaves respeitando strings) dá o spec inteiro.

```bash
curl -s -o swagger-ui-init.js https://sistema.clinicorp.com/api-docs/swagger-ui-init.js
# depois: extrair o JSON balanceando chaves a partir de `"swaggerDoc": {`
```

## Endpoints por tag (visão geral, 49 paths no total)

| Tag | Endpoints relevantes aqui |
|---|---|
| `business` | `GET /business/list`, `GET /business/list_chairs`, `GET /business/list_available_times` |
| `professional` | `GET /professional/list_all_professionals` |
| `group` | `GET /group/list_subscribers`, `GET /group/list_subscribers_clinics` |

(As outras 15 tags — `appointment`, `patient`, `financial`, `crm`,
`estimates`, `sales`, `payment`, `operational`, `migration`, `procedures`,
`analytics`, `users`, `upload`, `products` — não interessam pra descoberta
de config, mas `appointment` já está mapeada em detalhe na skill
`n8n-agendamento-odontologico/CADEIA_CLINICORP.md`.)

---

## `GET /business/list` — lista as clínicas do assinante

**Query:** `subscriber_id` (obrigatório).

**Resposta 200** — array de objetos com `id`, `CompanyId`, `BusinessName`,
`Name`, `Address`, `Email`.

> ⚠️ **As descrições desses campos no spec estão trocadas** (bug de
> documentação, copiado de outro schema com propriedades deslocadas — ex:
> `id` aparece descrito como "Nome da clínica"). Ignorar as descrições e
> usar o nome do campo. A correspondência real, confirmada por
> cruzamento com `POST /appointment/create_appointment_by_api` (que usa
> `Clinic_BusinessId`, descrito ali corretamente como "ID da clínica"):
>
> | Campo | O que é de verdade |
> |---|---|
> | `id` | **`business_id`** — o valor que vai em `Clinic_BusinessId` |
> | `Name` | nome de exibição da clínica |
> | `BusinessName` | razão social / nome fantasia completo |
> | `Address` | endereço |
> | `Email` | e-mail |
> | `CompanyId` | id da empresa-mãe (grupo/franquia), não confundir com `business_id` |

Se a clínica tiver **uma unidade só** (caso comum), a lista devolve um
item — pega o `id` direto. Se tiver mais de uma, cruzar por `Name`/`Address`
com o que a clínica informou no briefing.

---

## `GET /professional/list_all_professionals` — lista os profissionais

**Query:** `fromOnlineScheduling` (booleano, opcional — "quando for
necessário buscar profissionais do agendamento online").

**Resposta 200** — array de `{ id, name, cpf }`.

> ⚠️ **Sem `subscriber_id` documentado**, diferente de todo outro endpoint
> do spec. Duas hipóteses, **nenhuma confirmada** — precisa testar ao vivo:
> 1. O par usuário/token já resolve pra um único assinante, e por isso o
>    parâmetro é dispensável.
> 2. É omissão de documentação (o spec já tem pelo menos um bug confirmado
>    em `/business/list`) e o parâmetro é aceito/exigido na prática mesmo
>    sem aparecer aqui.
>
> Também não há filtro por `business_id`: para assinante com mais de uma
> clínica, a lista pode vir com profissionais de todas misturados, sem
> indicar a qual unidade cada um pertence. Nesse caso, cruzar com o
> `professionalId` que já vem em cada slot do retorno de
> `get_avaliable_times_calendar` (ver `CADEIA_CLINICORP.md`) é mais confiável
> do que confiar community nessa lista sozinha.

`id` aqui é o que vai em `Dentist_PersonId` — confirmado pelo mesmo
cruzamento com `create_appointment_by_api`.

---

## `GET /group/list_subscribers` e `GET /group/list_subscribers_clinics`

Interessantes porque **nenhum dos dois documenta parâmetro nenhum** — nem
`subscriber_id`. Hipótese: enumeram o que é visível só com usuário + token,
o que os tornaria o ponto de partida ideal pra descobrir o `subscriber_id`
sem a clínica precisar informar (a clínica manda usuário/token/link, a skill
descobre o resto). **Não testado ainda.**

- `list_subscribers` → `{ SubscriberBussinessUID, Namespace }` — o id da
  unidade e o "id completo".
- `list_subscribers_clinics` → array com `Name`, `Email`, `Address`,
  `Active`, `Landline`, `OtherLandline`, `SubscriberBussinessUID`,
  `CompanyId`, `WorkingDaysHours` (objeto com os dias/horários de
  funcionamento!) e **`SlotTime`** (o tempo do slot da agenda — literalmente
  a `duracao_servico` que hoje pedimos na config, documentado como
  "Se o slot for 30 por exemplo este é o tempo de consulta da clinica").

> 🎯 **Achado que vale a pena perseguir:** se `list_subscribers_clinics`
> devolver `WorkingDaysHours` e `SlotTime` de verdade, dois campos que hoje
> são pergunta manual no onboarding (`agenda.duracao_servico`,
> horário/almoço) passam a vir de graça da API. Só falta confirmar ao vivo
> se o shape bate com o spec — mesma ressalva de sempre com essa
> documentação.

---

## Achado colateral importante: `AvaliableTimes` x `AvailableTimes`

O spec documenta o campo de horários disponíveis de `get_avaliable_days`
como **`AvailableTimes`** (grafia correta em inglês). Só que o workflow real
da Atos em produção (`agendamento_ia_atos.json`, e por herança os templates
da skill `n8n-agendamento-odontologico`) lê **`AvaliableTimes`** — com o
typo, faltando o segundo "a" de "Available".

Isso é exatamente o tipo de divergência doc-vs-produção que o
`clinicorp-api.md` já alertava que podia acontecer. **Não mudei os templates
por causa disso** — eles refletem uma resposta real de produção, que pesa
mais que a documentação. Mas é um teste bem barato de fazer na primeira
chamada real: conferir se o payload de retorno tem `AvaliableTimes` (typo,
como a produção usa hoje) ou `AvailableTimes` (como o spec diz). Se a API
tiver corrigido o typo em algum momento e a produção não tiver acompanhado,
`Logica Inteligente` (`templates/logica_inteligente.js`) está lendo um
campo que não existe mais, e sempre trata como "zero horários" — silencioso,
sem erro, exatamente o tipo de falha que essa skill inteira tenta evitar.

---

## Campos confirmados por cruzamento (não por confiar cegamente na descrição)

| Campo em `/business/list` ou `/professional/list_all_professionals` | Confirmado como | Confirmado onde |
|---|---|---|
| `business/list.id` | `business_id` / `Clinic_BusinessId` | `create_appointment_by_api.Clinic_BusinessId`: "ID da clínica" |
| `professional/list_all_professionals.id` | `Dentist_PersonId` | `create_appointment_by_api.Dentist_PersonId`: "ID do profissional" |

## Confirmado ao vivo em 2026-08-19 (credenciais reais da Scopel)

Todos os 5 endpoints foram testados de verdade contra `api.clinicorp.com`
com usuário `spl` e o token fornecido pela clínica. Resultado, item por item
das perguntas que ficaram em aberto na primeira versão deste documento:

1. **Os 5 endpoints funcionam e batem com o spec**, com as ressalvas abaixo.
2. **`https://agenda.link/<code>` NÃO é redirect** — é o shell de uma SPA
   (React) que só decide a rota certa (`/online_scheduling/<code>`) via
   JavaScript no cliente. `curl` não executa esse JS, então não dá pra
   resolver `subscriber_id` por aí. O número no fim do link (`871028`) **é
   literalmente o `code_link`** — confirmado, porque `get_avaliable_days`
   com `code_link=871028` devolveu a agenda real da Scopel de primeira.
3. **`subscriber_id` é obrigatório mas não é validado contra a conta.**
   Testado com 4 valores diferentes (`spl`, `scopel`, `scopelodontologia`,
   `871028`) em `/business/list` — os quatro devolveram exatamente o mesmo
   resultado. Só vazio dá erro (`400 — "É necessário informar o id do
   assinante"`). Ou seja: o Basic Auth (usuário + token) já resolve a conta
   sozinho, e o parâmetro é só uma formalidade de presença. **Usar o
   próprio `auth_user` como `subscriber_id`** é seguro e elimina uma
   pergunta de onboarding.
4. **`AvaliableTimes` (com o typo) é o campo real**, não `AvailableTimes`
   como o spec diz. Confirmado no payload de produção da Scopel. Os
   templates da skill (`templates/logica_inteligente.js` etc.) já
   assumiam isso corretamente, herdado do workflow real da Atos — não
   precisou mudar nada.
5. **`/professional/list_all_professionals` não pede nem aceita
   `subscriber_id`** — funciona só com Basic Auth, devolve todo mundo
   cadastrado como profissional no sistema, **sem filtro por clínica**.
   Na Scopel devolveu 10 pessoas, incluindo `Crc lead - Emily` (a
   atendente humana do transbordo!) e o próprio dono (`GUILHERME SCOPEL`),
   junto com os 6 dentistas do briefing. **Não dá pra confiar nessa lista
   sozinha** para saber quem atende avaliação — é preciso cruzar com quem
   de fato tem horário aberto no `code_link` da agenda pública via
   `get_avaliable_days`. Foi assim que identificamos que só **Dr Hugo
   Barretto** (`id 5395363349987328`) atende a agenda de avaliação da
   Scopel, mesmo a clínica tendo 6 dentistas.

## Achado extra, fora do que se procurava: o "almoço" não é um bloqueio real

A config da Scopel assumia almoço fixo 12:00–13:00 (do briefing). Os dados
reais de `get_avaliable_days` (janela de 15 dias) mostraram **22 slots
livres dentro dessa janela**, distribuídos em vários dias — ou seja, a
agenda de Dr Hugo Barretto não bloqueia 12h–13h de forma consistente.

Isso não é um bug do workflow: a API já devolve só o que está realmente
livre, então o sistema nunca vai *inventar* uma vaga às 12h se ela não
existir. O risco é o inverso — nossa config tinha `janela_manha.fim: 12:00`
e `janela_tarde.inicio: 13:00`, um buraco entre os dois. Um slot real às
12:00–12:30 não caía nem em "prefiro de manhã" nem em "prefiro de tarde", e
o agente nunca ofereceria essa vaga livre pra ninguém — perda silenciosa de
agenda. Corrigido fechando o buraco (`janela_manha.fim` = `janela_tarde.inicio`
= `13:00`), mas a pergunta de negócio (o almoço é regra da clínica toda, ou
só um horário que esse dentista específico costuma ter livre?) continua
para confirmar com a Scopel — ver `SCO_README_montagem.md`.

## Script de descoberta

A skill `n8n-agendamento-odontologico` agora tem
`scripts/descobrir_config.js`, que automatiza os passos 3–5 acima: recebe
usuário API + token + `code_link`, devolve um rascunho de
`config_<clinica>.json` já com `business_id`, o profissional principal (e
um fallback, se mais de um aparecer na amostra) e a duração do slot — tudo
cruzado contra a agenda pública de verdade, não só a lista bruta de
profissionais. Testado de ponta a ponta com os dados reais da Scopel e bate
100% com o que foi feito manualmente aqui neste documento.

## Perguntas que continuam abertas

1. **`list_subscribers` e `list_subscribers_clinics` devolveram vazio**
   para a Scopel (`[]`, HTTP 200) — não deu pra confirmar o formato de
   `WorkingDaysHours`/`SlotTime` na prática. Isso é esperado: os dois são
   para conta de **franquia/grupo** com múltiplas unidades, e a Scopel é
   assinante único. Testar numa clínica que seja rede.
2. **Quando há mais de um profissional na agenda pública**, o script de
   descoberta pega o mais frequente como principal e o segundo como
   fallback sugerido — não testado ainda com uma clínica de dois
   dentistas na mesma agenda (a Scopel só tem um na agenda de avaliação).
3. **`/business/list_chairs` devolveu vazio para a Scopel** (agendamento
   por profissional, não por cadeira) — não testado numa clínica que use
   `ScheduleToType: CHAIR`.
