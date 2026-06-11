import {
  loreNodeSchema,
  loreNodeUpdateSchema,
  loreEdgeSchema,
  loreMetaSchema,
  loreProposalSchema,
} from '../validation/schemas.js'
import {
  getLore,
  createNode,
  updateNode,
  deleteNode,
  createEdge,
  deleteEdge,
  setMeta,
  listProposals,
  createProposal,
  voteProposal,
  applyProposal,
  rejectProposal,
} from '../services/loreService.js'

const normalizeKey = (raw) => decodeURIComponent(raw || '').trim().toLowerCase()

const requireUser = (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' })
    return false
  }
  return true
}

export const getMap = async (req, res, next) => {
  try {
    const lore = await getLore(normalizeKey(req.params.gameKey))
    return res.json(lore)
  } catch (err) {
    return next(err)
  }
}

export const postNode = async (req, res, next) => {
  try {
    const parsed = loreNodeSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const node = await createNode(normalizeKey(req.params.gameKey), {
      ...parsed.data,
      createdBy: req.user?.username || 'Unknown',
    })
    return res.status(201).json(node)
  } catch (err) {
    return next(err)
  }
}

export const patchNode = async (req, res, next) => {
  try {
    const parsed = loreNodeUpdateSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const node = await updateNode(normalizeKey(req.params.gameKey), req.params.nodeId, parsed.data)
    if (!node) return res.status(404).json({ error: 'Node not found' })
    return res.json(node)
  } catch (err) {
    return next(err)
  }
}

export const removeNode = async (req, res, next) => {
  try {
    const ok = await deleteNode(normalizeKey(req.params.gameKey), req.params.nodeId)
    if (!ok) return res.status(404).json({ error: 'Node not found' })
    return res.status(204).send()
  } catch (err) {
    return next(err)
  }
}

export const postEdge = async (req, res, next) => {
  try {
    const parsed = loreEdgeSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const result = await createEdge(normalizeKey(req.params.gameKey), parsed.data)
    if (result.error) return res.status(400).json({ error: result.error })
    return res.status(201).json(result.edge)
  } catch (err) {
    return next(err)
  }
}

export const removeEdge = async (req, res, next) => {
  try {
    const ok = await deleteEdge(normalizeKey(req.params.gameKey), req.params.edgeId)
    if (!ok) return res.status(404).json({ error: 'Edge not found' })
    return res.status(204).send()
  } catch (err) {
    return next(err)
  }
}

export const putMeta = async (req, res, next) => {
  try {
    const parsed = loreMetaSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const meta = await setMeta(normalizeKey(req.params.gameKey), {
      backgroundUrl: parsed.data.backgroundUrl,
      updatedBy: req.user?.username || 'Unknown',
    })
    return res.json(meta)
  } catch (err) {
    return next(err)
  }
}

export const getProposals = async (req, res, next) => {
  try {
    if (!requireUser(req, res)) return undefined
    const proposals = await listProposals(normalizeKey(req.params.gameKey), req.query.status)
    return res.json({ items: proposals })
  } catch (err) {
    return next(err)
  }
}

export const postProposal = async (req, res, next) => {
  try {
    if (!requireUser(req, res)) return undefined
    const parsed = loreProposalSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const proposal = await createProposal(normalizeKey(req.params.gameKey), {
      ...parsed.data,
      createdBy: req.user.username,
    })
    return res.status(201).json(proposal)
  } catch (err) {
    return next(err)
  }
}

export const postVote = async (req, res, next) => {
  try {
    if (!requireUser(req, res)) return undefined
    const result = await voteProposal(normalizeKey(req.params.gameKey), req.params.id, req.user.id)
    if (result.error) return res.status(400).json({ error: result.error })
    return res.json(result.proposal)
  } catch (err) {
    return next(err)
  }
}

export const postApply = async (req, res, next) => {
  try {
    const result = await applyProposal(normalizeKey(req.params.gameKey), req.params.id, req.user?.username || 'admin')
    if (result.error) return res.status(400).json({ error: result.error })
    return res.json(result.proposal)
  } catch (err) {
    return next(err)
  }
}

export const postReject = async (req, res, next) => {
  try {
    const result = await rejectProposal(normalizeKey(req.params.gameKey), req.params.id, req.user?.username || 'admin')
    if (result.error) return res.status(400).json({ error: result.error })
    return res.json(result.proposal)
  } catch (err) {
    return next(err)
  }
}
