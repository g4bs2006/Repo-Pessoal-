# Repositório Pessoal Contact.IA — Gabriel

Base de conhecimento e ativos de trabalho para construção de **agentes de IA de atendimento para clínicas odontológicas** (WhatsApp/WTS), dashboards financeiros e automações de CRM.

---

## 📁 Estrutura do Repositório

| Pasta | Conteúdo |
|---|---|
| `01_Clinicas/` | Entregas por clínica, organizadas em subpastas por **letra inicial** (A, B, C...). Cada clínica tem seus arquivos na raiz da própria pasta (briefing, prompts dos estágios E0–E12, banco de conhecimento em CSV, workflows n8n); quando existe uma versão anterior relevante, ela fica em `<Clinica>/Arquivado/` dentro da própria pasta da clínica. Ex: `01_Clinicas/O/OB Clinic`, `01_Clinicas/V/Vassoler` |
| `02_Projetos/` | Projetos de código ativos: dashboards financeiros (React/Next.js + Clinicorp), sistemas de agendamento, integrações com API Helena/WTS |
| `03_Documentacao/` | Documentação técnica e de referência: **Skills do Claude Code**, organizadas por domínio em `03_Documentacao/Skills/` — ver seção própria abaixo —, `clinicorp-api-docs/` (documentação da API Clinicorp), `HELENA_FRAMEWORK.md` e `Onboarding_Standalone/` |
| `04_Automações/` | Scripts de automação de CRM (transferência de leads por etiqueta: agendou, faltou, compareceu, não agendou) e workflows n8n de referência (`n8n_workflowbase.json`, `n8n_lead_novo_ibs_odontologia.json`, `IBS/`) |
| `_Arquivado/` | Material legado mantido só por referência histórica (hoje: `Versao_Antiga_Aninhada/`, snapshot de clínicas antigas) |

---

## 🤔 Por que usar este repositório

1. **Padrão consolidado e testado em produção** — a skill `agente-odontologico` (v3) captura tudo que foi aprendido em 9+ clínicas reais: estrutura de estágios SPIN, sistema de memória de longo prazo, retenção de cancelamentos, integração de agenda. Cada erro de produção já corrigido está documentado em `references/correcoes.md` para nunca se repetir.
2. **Velocidade de entrega** — montar um agente novo do zero leva dias; com a skill + os exemplos de clínicas anteriores como referência, leva horas. O onboarding de uma clínica vira um checklist de perguntas (ver SKILL.md, Etapa 1).
3. **Consistência entre clínicas** — todos os agentes seguem as mesmas regras globais (120 caracteres, fragmentação, escuta ativa específica, Pacto de Honra), o que facilita manutenção e correção em lote.
4. **Backup e histórico** — todo o trabalho versionado: dá para recuperar qualquer versão de prompt ou workflow e comparar o que mudou entre clínicas.

---

## 🚀 Como usar

### 1. Clonar

```bash
git clone https://github.com/g4bs2006/Reposit-rio-Pessoal-Contact.IA---Gabriel-.git
```

### 2. Usar as Skills no Claude Code (principal ativo do repo)

`03_Documentacao/Skills/` é organizada em **duas famílias por domínio** — a que constrói o **prompt** do agente e a que constrói o **workflow n8n** que o agente aciona. São coisas diferentes, resolvidas por skills diferentes:

```
03_Documentacao/Skills/
├── agentes-odontologicos/              ← constrói o PROMPT (WTS)
│   ├── agente-odontologico/             (v3 — GPT-4.1, em produção hoje)
│   └── agente-odontologico-luna/        (v4 — ChatGPT 5.6 Luna, prompt-native)
├── n8n-odontologico/                   ← constrói o WORKFLOW (n8n)
│   ├── n8n-agendamento-odontologico/    (gera e valida o workflow Clinicorp+Helena)
│   └── antigravity-n8n-skills/          (referência genérica de sintaxe/padrões n8n)
└── clickup-report/                     (gestão de trabalho, fora do domínio odonto)
```

Para carregar uma skill automaticamente no Claude Code:

```powershell
# exemplo: a skill de prompt v4
Copy-Item -Recurse "03_Documentacao\Skills\agentes-odontologicos\agente-odontologico-luna" "$env:USERPROFILE\.claude\skills\"
```

#### 2a. Prompt do agente — `agentes-odontologicos/`

Peça, por exemplo:
- *"Construa um agente para a clínica X usando a skill agente-odontologico-luna"*
- *"Corrija o estágio E6 do agente da clínica Y"*
- *"Duplique o agente da clínica Z com o nome Maria"*

A skill orienta o Claude a fazer as perguntas certas de onboarding e gerar todos os arquivos de persona, constraints, estágios e banco de conhecimento.

**Qual versão usar:** `agente-odontologico` (v3) para agentes em GPT-4.1 e similares — é o que está em produção na maioria das clínicas hoje. `agente-odontologico-luna` (v4) para agentes novos ou migrados no **ChatGPT 5.6 Luna**: mesma metodologia SPIN, mas prompt-native — o agente aciona 9 habilidades em vez de 20, `Ler_Contexto` só no E0, e as etiquetas/cards do CRM passam a ser aplicados pelo n8n em vez do agente.

**Mapa da v4** (`agente-odontologico-luna/references/`):
- `redacao-luna.md` — **leia primeiro**: como escrever prompt para um modelo de raciocínio forte
- `arquitetura.md` — estrutura de arquivos, nomenclatura, CSVs
- `estagios.md` — comportamento detalhado E0–E12
- `memoria.md` — `Ler_Contexto` / `Salvar_Contexto` / campos semânticos
- `persona-constraints.md`, `diferenciais.md`, `habilidades.md`
- `integracao-n8n.md` / `integracao-crm-cards.md` — o **contrato** que o workflow n8n precisa cumprir (quem constrói o workflow em si é a outra família de skills, abaixo)
- `correcoes.md`, `migracao.md`

> ⚠️ A v4 **exige** o subsistema de CRM da Helena montado (painel + linha em `automacao_clinicas`). Sem ele, como o agente não aplica mais tag nenhuma, nada é registrado no CRM.

#### 2b. Workflow n8n — `n8n-odontologico/n8n-agendamento-odontologico/`

Enquanto a skill de prompt especifica o *contrato* do workflow (o que cada habilidade espera receber e devolver), esta skill **gera o arquivo executável**: webhook, as 5 cadeias Clinicorp (consultar, agendar, cancelar, remarcar, verificar) e as 3 cadeias de CRM da Helena (etiqueta + card), 78 nós no total.

```bash
cd 03_Documentacao/Skills/n8n-odontologico/n8n-agendamento-odontologico
cp scripts/config.exemplo.json /caminho/config_<clinica>.json
# preencher os dados da clínica (Clinicorp, Helena, Supabase)
node scripts/gerar_workflow.js /caminho/config_<clinica>.json /caminho/agendamento_<clinica>.json
node scripts/validar_workflow.js /caminho/agendamento_<clinica>.json
```

O gerador nunca inventa dado: se a config estiver incompleta, ele lista o que falta e não escreve arquivo. O validador checa especificamente o que quebra silenciosamente na v4 — `id_atendimento` no payload, as três etiquetas de contato, fan-out do CRM nos três nós de confirmação Clinicorp.

**Mapa da skill:** `SKILL.md` (visão geral) → `CONFIG_CLINICA.md` (o que coletar) → `CADEIA_CLINICORP.md` e `CRM_HELENA.md` (nó por nó) → `CODE_NODES.md` (os 12 nós de Code) → `RESPOSTAS_E_LOGS.md` → `VALIDACAO.md` (catálogo de erros de produção).

### 3. Configurar um agente novo no WTS

1. Responda o checklist da Etapa 1 do `SKILL.md` com o briefing da clínica
2. Gere os arquivos com o Claude Code (prefixo da clínica, ex: `OB_`, `VA_`)
3. Cole os prompts dos estágios e descrições de habilidades no WTS (tipos de habilidade: ver tabela no SKILL.md)
4. Se a clínica usa Clinicorp: gere o workflow n8n com a skill `n8n-agendamento-odontologico` (seção 2b acima) em vez de clonar um workflow existente à mão — evita id de nó duplicado e nó de etiqueta esquecido
5. Teste as 5 ações de agendamento antes de ativar

### 4. Rodar os projetos (dashboards/agendamentos)

```bash
cd 02_Projetos/<projeto>
npm install
# criar o arquivo .env local (NÃO versionado — ver seção Segurança)
npm run dev
```

### 5. Rodar as automações Python

```bash
cd 04_Automações
python automacao_transferencia_leads.py
```
Cada script tem no topo as variáveis de configuração (token da API, IDs de painel/etapa). Insira suas credenciais locais antes de rodar.

---

## ⏱️ Quando (e quanto) usar

| Situação | O que usar |
|---|---|
| **Nova clínica entrando** | Skill completa + checklist de onboarding (SKILL.md Etapa 1). Use a clínica v3 mais parecida como referência (OB Clinic = campanha/Clinicorp; Vassoler = cortesia solidária/pediatria) |
| **Bug de comportamento do agente em produção** | `references/correcoes.md` primeiro — provavelmente o problema já tem correção documentada |
| **Dúvida sobre um estágio específico** | `references/estagios.md` (seção do estágio) — não precisa ler a skill toda |
| **Configurar/ajustar agenda Clinicorp** | `references/integracao-n8n.md` + workflow da OB Clinic como base |
| **Fim de cada projeto de clínica** | **Atualize a skill** com o que mudou (novos padrões, correções) e commite — é isso que mantém o repo valioso |
| **Mensalmente** | Atualizar `[PREFIX]_BK_feriados.csv` se virar o ano; revisar campanhas ativas nos prompts |

**Regra de ouro:** a skill é a fonte da verdade; as pastas de clínicas são os exemplos. Quando houver conflito, vale a clínica **mais recente** — e a skill deve ser atualizada para refletir isso (como foi feito na renovação v3 com OB Clinic e Vassoler).

---

## 🔒 Segurança e Credenciais

- Arquivos `.env` **não são versionados** (ver `.gitignore`) — cada projeto precisa do seu `.env` criado localmente
- Tokens e chaves de API nos arquivos versionados foram **mascarados** (`***REMOVIDO***`) — substitua pelos valores reais do seu cofre local ao usar
- Este repositório é **privado** — mantenha assim; os arquivos de clínicas contêm dados de negócio de clientes
- Nunca commitar: chaves Clinicorp, tokens Helena/WTS, credenciais de banco

---

*Mantido por Gabriel Rodrigues — Contact.IA / Escala Odonto*
