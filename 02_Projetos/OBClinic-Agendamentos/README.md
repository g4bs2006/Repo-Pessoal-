# ðŸ¦· OBClinic â€” GestÃ£o de Cards no CRM

> Ferramenta interna de gestÃ£o do ciclo de vida do paciente no CRM WTS.chat, integrada ao funil de atendimento da **OBClinic (Oral Bem Joinville)**.

---

## ðŸ“‹ O que faz

Ao receber um paciente via WhatsApp, o atendente abre esta ferramenta (passando o `?contactid=` na URL) e registra o status do paciente em um clique â€” sem precisar abrir o CRM manualmente.

O sistema:
- **Cria ou move o card** do paciente no painel CRM da WTS.chat
- **Aplica as etiquetas corretas** automaticamente com base na fase selecionada
- **Registra observaÃ§Ãµes** como nota no card
- **Suporta campos dinÃ¢micos** por fase (classificaÃ§Ã£o, urgÃªncia, valor, data de avaliaÃ§Ã£o)

---

## ðŸ”„ Funil de Atendimento

```
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚         Contato no WhatsApp      â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                   â”‚
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚   ðŸ—“ï¸  AGENDOU                    â”‚
                    â”‚   Tags: Agendado CRC             â”‚
                    â”‚   Campos: ClassificaÃ§Ã£o, UrgÃªnciaâ”‚
                    â”‚           Data da AvaliaÃ§Ã£o      â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                   â”‚
               â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
               â”‚                                       â”‚
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”           â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  ðŸ” REAGENDOU          â”‚           â”‚  âŒ FALTOU                 â”‚
  â”‚  Tags: Agendado CRC   â”‚           â”‚  Campos: UrgÃªncia          â”‚
  â”‚  Campos: ClassificaÃ§Ã£oâ”‚           â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
  â”‚          UrgÃªncia     â”‚
  â”‚          Data Aval.   â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
               â”‚
   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
   â”‚                        â”‚
â”Œâ”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ âœ… COMPARECEU        â”‚  â”‚ ðŸ”„ COMPARECEU E NÃƒO FECHOU   â”‚
â”‚    E FECHOU          â”‚  â”‚                              â”‚
â”‚ Campos: Valor (R$)  â”‚  â”‚  (sem campos extras)         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## âš™ï¸ Como usar

### 1. Acesso via link do WhatsApp

A URL deve ser aberta com o `contactid` do paciente:

```
https://seu-dominio.vercel.app/?contactid=CONTACT_ID_DO_WTS
```

O sistema busca automaticamente o nome do contato e verifica se jÃ¡ existe um card no painel.

### 2. Fluxo na tela

| SituaÃ§Ã£o | O que acontece |
|----------|---------------|
| Contato **com card** existente | Card Ã© **movido** para a fase selecionada + nota adicionada |
| Contato **sem card** | Novo card Ã© **criado** na fase selecionada |
| Contato **sem `contactid`** na URL | FormulÃ¡rio manual disponÃ­vel |

---

## ðŸ—ï¸ Arquitetura

```
OBClinic-Agendamentos/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ App.jsx          # Interface principal (formulÃ¡rio dinÃ¢mico por fase)
â”‚   â”œâ”€â”€ api.js           # FunÃ§Ãµes de comunicaÃ§Ã£o com a WTS.chat API
â”‚   â”œâ”€â”€ config.js        # âš™ï¸ IDs da clÃ­nica (painel, fases, tags)
â”‚   â”œâ”€â”€ App.css          # Estilos
â”‚   â””â”€â”€ main.jsx         # Entry point React
â”œâ”€â”€ api/
â”‚   â””â”€â”€ proxy.js         # Vercel Function: proxy CORS para wts.chat
â”œâ”€â”€ vercel.json          # ConfiguraÃ§Ã£o de deploy (Vercel)
â””â”€â”€ vite.config.js       # Proxy local para desenvolvimento
```

### Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite |
| Deploy | Vercel |
| CRM | WTS.chat API |
| Proxy (local) | Vite dev server |
| Proxy (prod) | Vercel Serverless Function |

---

## ðŸ”— IntegraÃ§Ãµes

### WTS.chat CRM
- **Painel:** `342061a2-d826-41bd-bf04-5d3c6dd53c35`
- Endpoints utilizados:
  - `GET /core/v1/contact/:id` â€” busca dados do contato
  - `GET /crm/v1/panel/card` â€” verifica se existe card
  - `POST /crm/v1/panel/card` â€” cria novo card
  - `PUT /crm/v2/panel/card/:id` â€” move card de fase
  - `POST /crm/v1/panel/card/:id/note` â€” adiciona nota
  - `POST /core/v1/contact/:id/tags` â€” aplica etiquetas

---

## ðŸ·ï¸ Fases e Etiquetas Configuradas

### Fases do Funil

| Fase | Step ID |
|------|---------|
| Agendou | `6fbb5fb7-b4c2-40bb-89dc-7e515eb37d17` |
| Reagendou | `600b75b0-e797-49e0-bbdb-a2e681e63f9c` |
| Faltou | `33d47c3c-97e6-459a-81dd-04aa8f03b55d` |
| Compareceu e fechou | `da4bf7f6-2b0c-4025-b69a-4f9759d2cb88` |
| Compareceu e nÃ£o fechou | `1491d055-bd80-4e63-a415-cfd307dced23` |

### Etiquetas DisponÃ­veis

| Etiqueta | AplicaÃ§Ã£o |
|----------|-----------|
| ðŸ”µ Agendado CRC | AutomÃ¡tica em **Agendou** e **Reagendou** |
| ðŸ¦· MastigaÃ§Ã£o | Manual â€” classificaÃ§Ã£o do caso |
| âœ¨ EstÃ©tica | Manual â€” classificaÃ§Ã£o do caso |
| ðŸ”´ Alta UrgÃªncia | Manual â€” nÃ­vel de urgÃªncia |
| ðŸŸ¢ Baixa UrgÃªncia | Manual â€” nÃ­vel de urgÃªncia |

---

## ðŸš€ Desenvolvimento Local

```bash
# Instalar dependÃªncias
npm install

# Iniciar servidor de desenvolvimento (porta 5175)
npm run dev
```

Acesse: [http://localhost:5175](http://localhost:5175)

> O Vite proxy redireciona `/api/*` â†’ `https://api.wts.chat` automaticamente em desenvolvimento.

---

## ðŸ“¦ Deploy (Vercel)

```bash
# Build de produÃ§Ã£o
npm run build

# Deploy via Vercel CLI
vercel --prod
```

Em produÃ§Ã£o, as chamadas Ã  API passam pela Vercel Function em `api/proxy.js`, que encaminha as requisiÃ§Ãµes para `https://api.wts.chat` resolvendo o CORS.

---

## ðŸ”§ ConfiguraÃ§Ã£o para nova clÃ­nica

Para adaptar este sistema a outra clÃ­nica, edite apenas o arquivo `src/config.js`:

```js
export const TOKEN   = '***REMOVIDO***'
export const PANEL_ID = 'UUID_DO_PAINEL'

export const STEPS = {
  agendou:   'UUID_DA_FASE_AGENDOU',
  reagendou: 'UUID_DA_FASE_REAGENDOU',
  // ...
}

export const TAGS = {
  Agendado: 'UUID_DA_TAG',
  // ...
}
```

E em `api/proxy.js`, substitua a URL base caso a clÃ­nica use outro CRM.
