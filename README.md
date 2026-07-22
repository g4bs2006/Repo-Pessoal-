# Repositório Pessoal Contact.IA — Gabriel

Base de conhecimento e ativos de trabalho para construção de **agentes de IA de atendimento para clínicas odontológicas** (WhatsApp/WTS), dashboards financeiros e automações de CRM.

---

## 📁 Estrutura do Repositório

| Pasta | Conteúdo |
|---|---|
| `01_Clinicas/` | Entregas por clínica, organizadas por mês (briefing, prompts dos estágios E0–E12, banco de conhecimento em CSV, workflows n8n). Ex: OB Clinic (Gi), Vassoler (Karol) |
| `02_Projetos/` | Projetos de código: dashboards financeiros (React/Next.js + Clinicorp), sistemas de agendamento, integrações com API Helena/WTS |
| `03_Documentacao/` | Documentação técnica, **Skills do Claude Code** (`Skills/agente-odontologico` — o guia v3 de construção de agentes), scrapers e plataforma |
| `04_Automações/` | Scripts Python de automação de CRM (transferência de leads por etiqueta: agendou, faltou, compareceu, não agendou) |
| `_Arquivado/` | Material legado mantido por referência |

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

### 2. Usar a Skill no Claude Code (principal ativo do repo)

A skill fica em `03_Documentacao/Skills/agente-odontologico/`. Para o Claude Code carregá-la automaticamente:

```powershell
# copiar para a pasta de skills do seu usuário
Copy-Item -Recurse "03_Documentacao\Skills\agente-odontologico" "$env:USERPROFILE\.claude\skills\"
```

Depois, em qualquer conversa do Claude Code, peça por exemplo:
- *"Construa um agente para a clínica X usando a skill agente-odontologico"*
- *"Corrija o estágio E6 do agente da clínica Y"*
- *"Duplique o agente da clínica Z com o nome Maria"*

A skill orienta o Claude a fazer as perguntas certas de onboarding e gerar todos os arquivos no padrão v3 (estágios, BK em CSV, habilidades, memória).

**Mapa da skill:**
- `SKILL.md` — visão geral, processo de construção, regras globais, sequências obrigatórias
- `references/arquitetura.md` — estrutura de arquivos, nomenclatura, CSVs
- `references/estagios.md` — comportamento detalhado E0–E12
- `references/memoria.md` — Ler_Contexto / Salvar_Contexto / campos semânticos
- `references/diferenciais.md` — variações por clínica (campanhas, infantil, persona)
- `references/integracao-n8n.md` — agenda Clinicorp via n8n
- `references/correcoes.md` — problemas reais de produção e correções

### 3. Configurar um agente novo no WTS

1. Responda o checklist da Etapa 1 do `SKILL.md` com o briefing da clínica
2. Gere os arquivos com o Claude Code (prefixo da clínica, ex: `OB_`, `VA_`)
3. Cole os prompts dos estágios e descrições de habilidades no WTS (tipos de habilidade: ver tabela no SKILL.md)
4. Se a clínica usa Clinicorp: duplique o workflow n8n de referência (`01_Clinicas/2026-04 - Abril/OB Clinic/n8n/`) e ajuste a configuração conforme `references/integracao-n8n.md`
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
