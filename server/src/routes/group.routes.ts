import { Router } from 'express';
import {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  addGroupMembers,
  previewBulkMembers,
  getGroupMembers,
  removeGroupMember,
  updateGroupMember,
  getGroupStats,
  getOverallGroupStats,
  getEligibleCandidates,
  getAvailableCandidates,
  getRecipientResolution,
  getGroupActivities,
} from '../controllers/group.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Protect all group management routes
router.use(authMiddleware);

// Core Group routes
router.post('/', createGroup);
router.get('/stats', getOverallGroupStats);
router.get('/', getGroups);
router.get('/:id', getGroupById);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

// Membership routes
router.post('/:id/members/preview', previewBulkMembers);
router.post('/:id/members', addGroupMembers);
router.get('/:id/members', getGroupMembers);
router.put('/:id/members/:candidateId', updateGroupMember);
router.delete('/:id/members/:candidateId', removeGroupMember);

// Intelligence & Activity routes
router.get('/:id/stats', getGroupStats);
router.get('/:id/eligible-candidates', getEligibleCandidates);
router.get('/:id/available-candidates', getAvailableCandidates);
router.get('/:id/recipient-resolution', getRecipientResolution);
router.get('/:id/activities', getGroupActivities);

export default router;
