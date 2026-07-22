import { useState, useEffect } from 'react'
import { createCard, getContact, findCardByContact, updateCardStep, addCardNote, addContactTags } from './api'
import { STEPS, TAGS, FASE_TAGS } from './config'
import './App.css'

const FASES = [
  { key: 'agendou',             label: 'Agendou' },
  { key: 'reagendou',           label: 'Reagendou' },
  { key: 'faltou',              label: 'Faltou' },
  { key: 'compareceuFechou',    label: 'Compareceu e fechou' },
  { key: 'compareceuNaoFechou', label: 'Compareceu e não fechou' },
]

const FASE_CAMPOS = {
  agendou:             { classificacao: true,  urgencia: true,  dataAvaliacao: true,  valor: false },
  reagendou:           { classificacao: true,  urgencia: true,  dataAvaliacao: true,  valor: false },
  faltou:              { classificacao: false, urgencia: true,  dataAvaliacao: false, valor: false },
  compareceuFechou:    { classificacao: false, urgencia: false, dataAvaliacao: false, valor: true  },
  compareceuNaoFechou: { classificacao: false, urgencia: false, dataAvaliacao: false, valor: false },
}

function App() {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [fase, setFase] = useState('agendou')
  const [dor, setDor] = useState('')
  const [urgencia, setUrgencia] = useState('')
  const [valor, setValor] = useState('')
  const [dataAvaliacao, setDataAvaliacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [contactId, setContactId] = useState(null)
  const [isLoadingContact, setIsLoadingContact] = useState(false)
  const [existingCard, setExistingCard] = useState(null)

  const campos = FASE_CAMPOS[fase]

  const handleFaseChange = (novaFase) => {
    setFase(novaFase)
    setDor('')
    setUrgencia('')
    setValor('')
    setDataAvaliacao('')
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cid = params.get('contactid') || params.get('contactId')

    if (cid) {
      setContactId(cid)
      setIsLoadingContact(true)

      getContact(cid)
        .then(contactData => {
          if (contactData && contactData.name) {
            setNome(contactData.name)
          }
          return findCardByContact(cid)
        })
        .then(cardData => {
          if (cardData) setExistingCard(cardData)
        })
        .catch(err => console.warn('Erro ao carregar dados:', err))
        .finally(() => setIsLoadingContact(false))
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nome.trim()) return

    setLoading(true)
    setMessage(null)

    try {
      const stepId = STEPS[fase]

      let finalDescription = descricao.trim()
      const extraInfo = []
      const selectedTags = [...(FASE_TAGS[fase] || [])]

      if (campos.classificacao && dor) {
        extraInfo.push(`Classificação: ${dor}`)
        if (TAGS[dor]) selectedTags.push(TAGS[dor])
      }
      if (campos.urgencia && urgencia) {
        extraInfo.push(`Urgência: ${urgencia}`)
        if (TAGS[urgencia]) selectedTags.push(TAGS[urgencia])
      }

      if (extraInfo.length > 0) {
        finalDescription = extraInfo.join('\n') + (finalDescription ? `\n\nObservações:\n${finalDescription}` : '')
      }

      const extras = {}
      if (campos.valor && valor) extras.monetaryAmount = valor
      if (campos.dataAvaliacao && dataAvaliacao) extras.customFields = { 'data-do-agendamento-21': dataAvaliacao }

      let card = existingCard
      if (!card && contactId) {
        card = await findCardByContact(contactId).catch(() => null)
      }

      if (card) {
        await updateCardStep(card.id, stepId, extras)
        if (finalDescription) {
          await addCardNote(card.id, finalDescription)
        }
        setMessage({ type: 'success', text: 'Card atualizado e movido com sucesso!' })
      } else {
        await createCard(stepId, nome.trim(), finalDescription, contactId, extras)
        setMessage({ type: 'success', text: 'Novo card criado com sucesso!' })
      }

      if (contactId && selectedTags.length > 0) {
        await addContactTags(contactId, selectedTags)
      }

      setNome('')
      setDescricao('')
      setDor('')
      setUrgencia('')
      setValor('')
      setDataAvaliacao('')
      setFase('agendou')
    } catch (err) {
      console.error('Erro ao salvar card:', err)
      setMessage({ type: 'error', text: err.message || 'Erro desconhecido ao salvar card' })
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(null), 8000)
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <div className="brand-mark">
            <span className="brand-initials">OB</span>
          </div>
          <div className="brand-text">
            <h1 className="brand-name">OBClinic</h1>
            <p className="brand-sub">Gestão de Cards no CRM</p>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="form-container">
          <div className="form-header">
            <div className="header-title-row">
              <h3>{existingCard ? 'Mover Card' : 'Criar Card'}</h3>
              {existingCard && <span className="badge badge-found">Card Localizado</span>}
              {!existingCard && contactId && !isLoadingContact && <span className="badge badge-not-found">Card será criado</span>}
            </div>
            <p>{existingCard ? 'Este paciente já possui um card. Ele será movido para a fase selecionada.' : 'Preencha os dados abaixo para criar o card.'}</p>
          </div>

          <form onSubmit={handleSubmit} className="card-form">
            {message && (
              <div className={`alert alert-${message.type}`}>
                {message.text}
              </div>
            )}

            <div className="form-group">
              <label>Nome do Paciente *</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={isLoadingContact ? 'Buscando nome...' : 'Ex: João da Silva'}
                disabled={isLoadingContact}
                required
              />
            </div>

            <div className="form-group">
              <label>Fase</label>
              <div className="segmented-control segmented-vertical">
                {FASES.map(f => (
                  <label key={f.key} className={`segment ${fase === f.key ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="fase"
                      value={f.key}
                      checked={fase === f.key}
                      onChange={(e) => handleFaseChange(e.target.value)}
                      className="sr-only"
                    />
                    <span className="segment-text">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {campos.classificacao && (
              <div className="form-group">
                <label>Classificação</label>
                <div className="segmented-control">
                  <label className={`segment ${dor === 'Mastigação' ? 'active' : ''}`}>
                    <input type="radio" name="dor" value="Mastigação" checked={dor === 'Mastigação'} onChange={(e) => setDor(e.target.value)} className="sr-only" />
                    <span className="segment-text">🦷 Mastigação</span>
                  </label>
                  <label className={`segment ${dor === 'Estética' ? 'active' : ''}`}>
                    <input type="radio" name="dor" value="Estética" checked={dor === 'Estética'} onChange={(e) => setDor(e.target.value)} className="sr-only" />
                    <span className="segment-text">✨ Estética</span>
                  </label>
                </div>
              </div>
            )}

            {campos.urgencia && (
              <div className="form-group">
                <label>Urgência</label>
                <div className="segmented-control">
                  <label className={`segment ${urgencia === 'Alta' ? 'active urgent' : ''}`}>
                    <input type="radio" name="urgencia" value="Alta" checked={urgencia === 'Alta'} onChange={(e) => setUrgencia(e.target.value)} className="sr-only" />
                    <span className="segment-text">🔴 Alta</span>
                  </label>
                  <label className={`segment ${urgencia === 'Baixa' ? 'active normal' : ''}`}>
                    <input type="radio" name="urgencia" value="Baixa" checked={urgencia === 'Baixa'} onChange={(e) => setUrgencia(e.target.value)} className="sr-only" />
                    <span className="segment-text">🟢 Baixa</span>
                  </label>
                </div>
              </div>
            )}

            {campos.dataAvaliacao && (
              <div className="form-group">
                <label>Data da Avaliação</label>
                <input
                  type="datetime-local"
                  value={dataAvaliacao}
                  onChange={(e) => setDataAvaliacao(e.target.value)}
                />
              </div>
            )}

            {campos.valor && (
              <div className="form-group">
                <label>Valor atribuído (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="Ex: 1500.00"
                />
              </div>
            )}

            <div className="form-group">
              <label>Descrição (Opcional)</label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Informações adicionais do paciente..."
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Card'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default App
