import { Router } from 'express'
import { requirePermission } from '../middleware/requirePermission.js'
import {
  getMap,
  postNode,
  patchNode,
  removeNode,
  postEdge,
  removeEdge,
  putMeta,
  getProposals,
  postProposal,
  postVote,
  postApply,
  postReject,
} from '../controllers/loreController.js'

const router = Router()

// Read is open to any visitor — only authoring requires lore:write.
router.get('/lore/:gameKey', getMap)

// Admin-only map authoring.
router.post('/lore/:gameKey/nodes', requirePermission('lore:write'), postNode)
router.patch('/lore/:gameKey/nodes/:nodeId', requirePermission('lore:write'), patchNode)
router.delete('/lore/:gameKey/nodes/:nodeId', requirePermission('lore:write'), removeNode)
router.post('/lore/:gameKey/edges', requirePermission('lore:write'), postEdge)
router.delete('/lore/:gameKey/edges/:edgeId', requirePermission('lore:write'), removeEdge)
router.put('/lore/:gameKey/meta', requirePermission('lore:write'), putMeta)

// Community correction proposals — any logged-in user may propose/vote.
router.get('/lore/:gameKey/proposals', getProposals)
router.post('/lore/:gameKey/proposals', postProposal)
router.post('/lore/:gameKey/proposals/:id/vote', postVote)

// Admins act on approved proposals.
router.post('/lore/:gameKey/proposals/:id/apply', requirePermission('lore:write'), postApply)
router.post('/lore/:gameKey/proposals/:id/reject', requirePermission('lore:write'), postReject)

export default router
