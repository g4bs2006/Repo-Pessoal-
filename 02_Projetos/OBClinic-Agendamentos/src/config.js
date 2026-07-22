export const TOKEN = '***REMOVIDO***'
export const PANEL_ID = '342061a2-d826-41bd-bf04-5d3c6dd53c35'

export const STEPS = {
  agendou:   '6fbb5fb7-b4c2-40bb-89dc-7e515eb37d17',
  reagendou: '600b75b0-e797-49e0-bbdb-a2e681e63f9c',
}

export const STEP_NAMES = {
  '6fbb5fb7-b4c2-40bb-89dc-7e515eb37d17': 'Agendou',
  '600b75b0-e797-49e0-bbdb-a2e681e63f9c': 'Reagendou',
  '33d47c3c-97e6-459a-81dd-04aa8f03b55d': 'Faltou',
  'da4bf7f6-2b0c-4025-b69a-4f9759d2cb88': 'Compareceu e fechou',
  '1491d055-bd80-4e63-a415-cfd307dced23': 'Compareceu e nÃ£o fechou',
}

export const TAGS = {
  Agendado:   'f263bf67-e8bd-4fab-abb4-42748f22372e',
  MastigaÃ§Ã£o: 'a26c01b3-bf87-4403-bbe3-d4ce750fea72',
  EstÃ©tica:   'cb85ff3a-c287-4a86-9e8d-69fa9f3872e7',
  Alta:       'e4c04f6e-56cb-4c42-a77e-8b6ce3f0c112',
  Baixa:      'fb2a4a1b-c4fc-48df-b84a-d5a5a5f4fe53',
}

export const TAG_LIST = [
  { id: TAGS.Agendado,   label: 'Agendado CRC',  locked: true  },
  { id: TAGS.MastigaÃ§Ã£o, label: 'MastigaÃ§Ã£o',     locked: false },
  { id: TAGS.EstÃ©tica,   label: 'EstÃ©tica',       locked: false },
  { id: TAGS.Alta,       label: 'Alta UrgÃªncia',  locked: false },
  { id: TAGS.Baixa,      label: 'Baixa UrgÃªncia', locked: false },
]

export const CLINICORP_PROFESSIONALS = [
  { id: '6619432407662592', name: 'Dr. Valter Semiano Vavassori' },
  { id: '5707738089127936', name: 'Dra. Eduarda Rodrigues' },
]

export const FASE_TAGS = {
  agendou:             [TAGS.Agendado],
  reagendou:           [TAGS.Agendado],
  faltou:              [],
  compareceuFechou:    [],
  compareceuNaoFechou: [],
}
