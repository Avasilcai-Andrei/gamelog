import { Op } from 'sequelize'
import { LoreNode, LoreEdge, LoreMapMeta, LoreProposal, LoreVote } from '../db/index.js'

const toPlain = (instance) => (instance ? instance.get({ plain: true }) : instance)

const getThreshold = () => Number(process.env.LORE_VOTE_THRESHOLD || 3)

export const getLore = async (gameKey) => {
  const [nodes, edges, metaRow] = await Promise.all([
    LoreNode.findAll({ where: { gameKey }, order: [['createdAt', 'ASC']] }),
    LoreEdge.findAll({ where: { gameKey }, order: [['createdAt', 'ASC']] }),
    LoreMapMeta.findByPk(gameKey),
  ])
  return {
    nodes: nodes.map(toPlain),
    edges: edges.map(toPlain),
    meta: metaRow ? toPlain(metaRow) : { gameKey, backgroundUrl: '' },
  }
}

export const createNode = async (gameKey, data) => {
  const created = await LoreNode.create({
    gameKey,
    ...data,
    createdAt: new Date().toISOString(),
  })
  return toPlain(created)
}

export const updateNode = async (gameKey, nodeId, partial) => {
  const node = await LoreNode.findOne({ where: { gameKey, id: nodeId } })
  if (!node) return null
  await node.update(partial)
  return toPlain(node)
}

export const deleteNode = async (gameKey, nodeId) => {
  const removed = await LoreNode.destroy({ where: { gameKey, id: nodeId } })
  if (removed === 0) return false
  // Cascade: drop any edges touching this node.
  await LoreEdge.destroy({
    where: { gameKey, [Op.or]: [{ fromNodeId: nodeId }, { toNodeId: nodeId }] },
  })
  return true
}

export const createEdge = async (gameKey, { fromNodeId, toNodeId }) => {
  if (fromNodeId === toNodeId) return { error: 'Cannot link a node to itself' }

  const nodeCount = await LoreNode.count({ where: { gameKey, id: { [Op.in]: [fromNodeId, toNodeId] } } })
  if (nodeCount < 2) return { error: 'Both nodes must exist in this lore map' }

  const duplicate = await LoreEdge.findOne({
    where: {
      gameKey,
      [Op.or]: [
        { fromNodeId, toNodeId },
        { fromNodeId: toNodeId, toNodeId: fromNodeId },
      ],
    },
  })
  if (duplicate) return { error: 'These nodes are already linked' }

  const created = await LoreEdge.create({
    gameKey,
    fromNodeId,
    toNodeId,
    createdAt: new Date().toISOString(),
  })
  return { edge: toPlain(created) }
}

export const deleteEdge = async (gameKey, edgeId) => {
  const removed = await LoreEdge.destroy({ where: { gameKey, id: edgeId } })
  return removed > 0
}

// --- Map background image ---

export const getMeta = async (gameKey) => {
  const row = await LoreMapMeta.findByPk(gameKey)
  return row ? toPlain(row) : { gameKey, backgroundUrl: '' }
}

export const setMeta = async (gameKey, { backgroundUrl, updatedBy }) => {
  const [row] = await LoreMapMeta.findOrCreate({
    where: { gameKey },
    defaults: { gameKey, backgroundUrl, updatedBy, updatedAt: new Date().toISOString() },
  })
  await row.update({ backgroundUrl, updatedBy, updatedAt: new Date().toISOString() })
  return toPlain(row)
}

// --- Community correction proposals + voting ---

const serializeProposal = (instance, votes) => {
  const plain = toPlain(instance)
  let payload = {}
  try { payload = JSON.parse(plain.payload || '{}') } catch { payload = {} }
  return { ...plain, payload, votes: votes ?? 0, threshold: getThreshold() }
}

const countVotes = (proposalId) => LoreVote.count({ where: { proposalId } })

export const listProposals = async (gameKey, status) => {
  const where = { gameKey }
  if (status) where.status = status
  const proposals = await LoreProposal.findAll({ where, order: [['createdAt', 'DESC']] })
  const withVotes = await Promise.all(
    proposals.map(async (p) => serializeProposal(p, await countVotes(p.id))),
  )
  return withVotes
}

export const createProposal = async (gameKey, { kind, targetNodeId, payload, reason, createdBy }) => {
  const created = await LoreProposal.create({
    gameKey,
    kind,
    targetNodeId: targetNodeId || null,
    payload: JSON.stringify(payload || {}),
    reason,
    createdBy,
    createdAt: new Date().toISOString(),
  })
  return serializeProposal(created, 0)
}

export const voteProposal = async (gameKey, proposalId, userId) => {
  const proposal = await LoreProposal.findOne({ where: { id: proposalId, gameKey } })
  if (!proposal) return { error: 'Proposal not found' }
  if (proposal.status !== 'open' && proposal.status !== 'approved') {
    return { error: 'Proposal is already resolved' }
  }

  // One vote per user — unique index makes the duplicate insert a no-op.
  await LoreVote.findOrCreate({
    where: { proposalId, userId },
    defaults: { proposalId, userId, createdAt: new Date().toISOString() },
  })

  const votes = await countVotes(proposalId)
  if (proposal.status === 'open' && votes >= getThreshold()) {
    await proposal.update({ status: 'approved' })
  }
  return { proposal: serializeProposal(proposal, votes) }
}

export const applyProposal = async (gameKey, proposalId, adminUsername) => {
  const proposal = await LoreProposal.findOne({ where: { id: proposalId, gameKey } })
  if (!proposal) return { error: 'Proposal not found' }
  if (proposal.status === 'applied' || proposal.status === 'rejected') {
    return { error: 'Proposal is already resolved' }
  }

  let payload = {}
  try { payload = JSON.parse(proposal.payload || '{}') } catch { payload = {} }

  if (proposal.kind === 'add') {
    await createNode(gameKey, { ...payload, createdBy: adminUsername })
  } else if (proposal.kind === 'edit') {
    if (!proposal.targetNodeId) return { error: 'Proposal has no target node' }
    const updated = await updateNode(gameKey, proposal.targetNodeId, payload)
    if (!updated) return { error: 'Target node no longer exists' }
  } else if (proposal.kind === 'delete') {
    if (!proposal.targetNodeId) return { error: 'Proposal has no target node' }
    await deleteNode(gameKey, proposal.targetNodeId)
  }

  await proposal.update({ status: 'applied', resolvedBy: adminUsername })
  return { proposal: serializeProposal(proposal, await countVotes(proposalId)) }
}

export const rejectProposal = async (gameKey, proposalId, adminUsername) => {
  const proposal = await LoreProposal.findOne({ where: { id: proposalId, gameKey } })
  if (!proposal) return { error: 'Proposal not found' }
  if (proposal.status === 'applied' || proposal.status === 'rejected') {
    return { error: 'Proposal is already resolved' }
  }
  await proposal.update({ status: 'rejected', resolvedBy: adminUsername })
  return { proposal: serializeProposal(proposal, await countVotes(proposalId)) }
}
