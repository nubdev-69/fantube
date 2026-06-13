import express from "express";
import { authenticate,optionalAuth } from "../middleware/auth.js";
import CommentController from "../controllers/commentController.js";
import CommentModel from "../models/Comment.js";

const router=express.Router({ mergeParams: true });

router.post('/',authenticate,CommentController.addComment);

router.get('/',optionalAuth,CommentController.getComment)

router.delete('/:commentId',authenticate,CommentController.deleteComment);

// commentRoutes.js
router.post('/:videoId/:commentId/interaction', authenticate, CommentController.addInteraction);

router.get('/:videoId/interaction',authenticate,CommentController.getInteraction);

export default router;
